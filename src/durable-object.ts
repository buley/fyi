/**
 * Aeon Flux Durable Objects for buley.fyi
 *
 * Provides:
 * - Real-time WebSocket connections for presence
 * - Cursor tracking across connected clients
 * - Session state management
 */

interface Env {
  DB?: D1Database;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<void>;
  first<T>(): Promise<T | null>;
}

interface PresenceUser {
  userId: string;
  role: 'user' | 'admin' | 'assistant';
  status: 'online' | 'away' | 'offline';
  lastActivity: string;
  cursor?: { x: number; y: number };
  editing?: string;
}

interface PageSession {
  route: string;
  data: Record<string, unknown>;
  schema: { version: string };
  version?: number;
  updatedAt?: string;
  updatedBy?: string;
  presence?: PresenceUser[];
}

interface WebSocketMessage {
  type: 'cursor' | 'presence' | 'ping' | 'sync';
  payload: unknown;
}

interface CursorPayload {
  x: number;
  y: number;
}

interface PresencePayload {
  status: 'online' | 'away' | 'offline';
  editing?: string;
}

/**
 * Aeon Page Session Durable Object
 *
 * Handles real-time presence and cursor tracking
 */
export class AeonPageSession {
  private state: DurableObjectState;
  private env: Env;
  private sessions: Map<WebSocket, PresenceUser> = new Map();
  private session: PageSession | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // Handle REST API
    switch (url.pathname) {
      case '/':
      case '/session':
        return this.handleSessionRequest(request);
      case '/presence':
        return this.handlePresenceRequest();
      case '/init':
        return this.handleInitRequest(request);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Get user info from query params or headers
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || crypto.randomUUID();
    const role = (url.searchParams.get('role') || 'user') as PresenceUser['role'];

    // Accept the WebSocket
    (server as WebSocket & { accept: () => void }).accept();

    // Create presence entry
    const presence: PresenceUser = {
      userId,
      role,
      status: 'online',
      lastActivity: new Date().toISOString(),
    };

    this.sessions.set(server, presence);

    // Send initial state
    const session = await this.getSession();
    server.send(JSON.stringify({
      type: 'init',
      payload: {
        session: session || { route: '/', data: {}, schema: { version: '1.0.0' } },
        presence: Array.from(this.sessions.values()),
      },
    }));

    // Broadcast join to others
    this.broadcast({
      type: 'presence',
      payload: {
        action: 'join',
        user: presence,
      },
    }, server);

    // Handle messages
    server.addEventListener('message', async (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string) as WebSocketMessage;
        await this.handleMessage(server, message);
      } catch (err) {
        console.error('Failed to handle message:', err);
      }
    });

    // Handle disconnect
    server.addEventListener('close', () => {
      const user = this.sessions.get(server);
      this.sessions.delete(server);

      if (user) {
        this.broadcast({
          type: 'presence',
          payload: {
            action: 'leave',
            userId: user.userId,
          },
        });
      }
    });

    // @ts-expect-error - Cloudflare Workers WebSocket Response
    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    const user = this.sessions.get(ws);
    if (!user) return;

    // Update last activity
    user.lastActivity = new Date().toISOString();

    switch (message.type) {
      case 'cursor': {
        const payload = message.payload as CursorPayload;
        user.cursor = { x: payload.x, y: payload.y };
        this.broadcast({
          type: 'cursor',
          payload: {
            userId: user.userId,
            cursor: user.cursor,
          },
        }, ws);
        break;
      }

      case 'presence': {
        const payload = message.payload as PresencePayload;
        user.status = payload.status;
        user.editing = payload.editing;
        this.broadcast({
          type: 'presence',
          payload: {
            action: 'update',
            user,
          },
        }, ws);
        break;
      }

      case 'ping': {
        ws.send(JSON.stringify({ type: 'pong', payload: { timestamp: Date.now() } }));
        break;
      }
    }
  }

  private broadcast(message: object, exclude?: WebSocket): void {
    const data = JSON.stringify(message);
    for (const [ws] of this.sessions) {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  private async handleSessionRequest(request: Request): Promise<Response> {
    switch (request.method) {
      case 'GET': {
        const session = await this.getSession();
        if (!session) {
          return Response.json({ route: '/', data: {}, schema: { version: '1.0.0' } });
        }
        return Response.json(session);
      }

      case 'PUT': {
        const session = await request.json() as PageSession;
        await this.saveSession(session);
        return new Response('OK', { status: 200 });
      }

      default:
        return new Response('Method not allowed', { status: 405 });
    }
  }

  private async handlePresenceRequest(): Promise<Response> {
    return Response.json(Array.from(this.sessions.values()));
  }

  private async handleInitRequest(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json() as PageSession;

      // Check if session already exists
      const existing = await this.getSession();
      if (existing) {
        return Response.json({ status: 'exists', session: existing });
      }

      // Create new session
      const session: PageSession = {
        route: body.route || '/',
        data: body.data || {},
        schema: body.schema || { version: '1.0.0' },
        version: 1,
        updatedAt: new Date().toISOString(),
        presence: [],
      };

      await this.saveSession(session);

      return Response.json({ status: 'created', session });
    } catch (err) {
      console.error('Failed to initialize session:', err);
      return new Response(
        JSON.stringify({ error: 'Failed to initialize session' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  private async getSession(): Promise<PageSession | null> {
    if (this.session) return this.session;

    const stored = await this.state.storage.get<PageSession>('session');
    if (stored) {
      this.session = stored;
    }
    return this.session;
  }

  private async saveSession(session: PageSession): Promise<void> {
    session.version = (session.version || 0) + 1;
    session.updatedAt = new Date().toISOString();

    this.session = session;
    await this.state.storage.put('session', session);

    // Async propagate to D1 if available
    if (this.env.DB) {
      this.state.waitUntil(this.propagateToD1(session));
    }
  }

  private async propagateToD1(session: PageSession): Promise<void> {
    if (!this.env.DB) return;

    try {
      await this.env.DB
        .prepare(`
          INSERT OR REPLACE INTO sessions (session_id, route, data, schema_version, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `)
        .bind(
          this.state.id.toString(),
          session.route,
          JSON.stringify(session.data),
          session.schema.version
        )
        .run();
    } catch (err) {
      console.error('Failed to propagate to D1:', err);
    }
  }
}

/**
 * Aeon Routes Registry Durable Object
 *
 * Singleton that manages the route registry
 */
export class AeonRoutesRegistry {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/route':
        return this.handleRouteRequest(request);
      case '/routes':
        return this.handleRoutesRequest(request);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async handleRouteRequest(request: Request): Promise<Response> {
    switch (request.method) {
      case 'POST': {
        const { path } = await request.json() as { path: string };
        const route = await this.state.storage.get(`route:${path}`);
        if (!route) {
          return new Response('Not found', { status: 404 });
        }
        return Response.json(route);
      }

      case 'PUT': {
        const route = await request.json() as { pattern: string };
        await this.state.storage.put(`route:${route.pattern}`, route);
        return new Response('OK', { status: 200 });
      }

      case 'DELETE': {
        const { path } = await request.json() as { path: string };
        await this.state.storage.delete(`route:${path}`);
        return new Response('OK', { status: 200 });
      }

      default:
        return new Response('Method not allowed', { status: 405 });
    }
  }

  private async handleRoutesRequest(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    const routes = await this.state.storage.list({ prefix: 'route:' });
    return Response.json(Array.from(routes.values()));
  }
}

// Type augmentations for Cloudflare Workers runtime
interface DurableObjectState {
  storage: DurableObjectStorage;
  id: DurableObjectId;
  waitUntil(promise: Promise<unknown>): void;
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
}

interface DurableObjectStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
  list<T = unknown>(options?: { prefix?: string }): Promise<Map<string, T>>;
}

interface DurableObjectId {
  toString(): string;
}

declare class WebSocketPair {
  0: WebSocket;
  1: WebSocket;
}
