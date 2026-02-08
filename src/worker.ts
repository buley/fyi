/**
 * Aeon Flux Worker for buley.fyi
 *
 * Interactive Rubik's cube portfolio with real-time presence
 */

import { AeonPageSession, AeonRoutesRegistry } from './durable-object';

// Re-export Durable Objects
export { AeonPageSession, AeonRoutesRegistry };

interface Env {
  PAGE_SESSIONS: DurableObjectNamespace;
  ROUTES_REGISTRY: DurableObjectNamespace;
  DB?: D1Database;
  ENVIRONMENT?: string;
}

interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

interface DurableObjectId {
  toString(): string;
}

interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<void>;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Get the HTML content
const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Taylor Buley | Cognitive Architect & Engineering Leader</title>

    <!-- SEO Meta Tags -->
    <meta name="description" content="Taylor Buley is a cognitive architect and engineering leader specializing in AI systems, distributed computing, and human-computer interaction. Builder of intelligent systems that augment human capability.">
    <meta name="keywords" content="Taylor Buley, cognitive architect, engineering leader, AI systems, distributed computing, software architecture, machine learning, human-computer interaction, San Francisco, tech leadership">
    <meta name="author" content="Taylor William Buley">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://buley.fyi/">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://buley.fyi/">
    <meta property="og:title" content="Taylor Buley | Cognitive Architect & Engineering Leader">
    <meta property="og:description" content="Building intelligent systems that augment human capability. Engineering leader specializing in AI, distributed systems, and cognitive computing.">
    <meta property="og:image" content="https://buley.fyi/og-image.png">
    <meta property="og:site_name" content="Taylor Buley">
    <meta property="og:locale" content="en_US">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="https://buley.fyi/">
    <meta name="twitter:title" content="Taylor Buley | Cognitive Architect">
    <meta name="twitter:description" content="Building intelligent systems that augment human capability. Engineering leader specializing in AI and distributed systems.">
    <meta name="twitter:image" content="https://buley.fyi/og-image.png">
    <meta name="twitter:creator" content="@taylorbuley">

    <!-- Additional Meta -->
    <meta name="theme-color" content="#00ff88">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Taylor Buley">

    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "Taylor William Buley",
      "jobTitle": "Cognitive Architect",
      "description": "Engineering leader specializing in AI systems, distributed computing, and human-computer interaction",
      "url": "https://buley.fyi",
      "sameAs": [
        "https://github.com/buley",
        "https://buley.xyz",
        "https://buley.info",
        "https://www.linkedin.com/in/taylorbuley"
      ],
      "knowsAbout": [
        "Artificial Intelligence",
        "Machine Learning",
        "Distributed Systems",
        "Software Architecture",
        "Human-Computer Interaction",
        "Cognitive Computing"
      ]
    }
    </script>

    <style>
        html, body { height: 100%; }
        body { margin: 0; overflow: hidden; background-color: #050505; font-family: 'Courier New', Courier, monospace; }
        #canvas-container { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; display: block; z-index: 0; }

        /* HUD Interface */
        #ui {
            position: absolute;
            top: 30px;
            left: 30px;
            color: #00ff88;
            pointer-events: none;
            user-select: none;
            text-shadow: 0 0 5px #00ff88;
            z-index: 10;
        }
        #ui h1, #ui p, #ui .sub {
            user-select: none;
        }
        h1 { margin: 0; font-weight: 700; font-size: 2rem; letter-spacing: 2px; text-transform: uppercase; }
        p { margin: 10px 0 0 0; font-size: 0.9rem; color: rgba(0, 255, 136, 0.7); }
        .sub {
            position: fixed;
            bottom: 60px;
            left: 30px;
            font-size: 0.6rem;
            color: #00ffff;
            opacity: 0.4;
            text-shadow: 0 0 3px #00ffff;
        }

        /* Progress Bar / Stability Meter */
        .bar-container {
            position: absolute;
            bottom: 30px;
            left: 30px;
            width: 300px;
            height: 20px;
            border: 1px solid #333;
            background: rgba(0,0,0,0.8);
            transform: skewX(-20deg);
        }
        #progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #ff0055, #ffcc00, #00ff88);
            width: 0%;
            transition: width 0.05s linear;
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
        }

        /* Navigation Overlay */
        #nav-overlay {
            position: relative;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            pointer-events: none;
            opacity: 0;
            transition: opacity 1s ease-in;
            background: radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 100%);
            z-index: 20;
            overflow-y: auto;
            padding: 10px 0;
            box-sizing: border-box;
        }

        .nav-item {
            font-size: 2rem;
            color: #fff;
            text-decoration: none;
            margin: 10px;
            padding: 8px 30px;
            border: 2px solid rgba(255,255,255,0.1);
            background: rgba(0,0,0,0.5);
            text-transform: uppercase;
            letter-spacing: 5px;
            transform: scale(0.8);
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            cursor: pointer;
            position: relative;
            overflow: hidden;
            clip-path: polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%);
            flex-shrink: 0;
            user-select: none;
            pointer-events: all;
        }

        .nav-item:hover {
            transform: scale(1.1);
            background: rgba(255, 255, 255, 0.1);
            border-color: #00ff88;
            box-shadow: 0 0 20px #00ff88, inset 0 0 20px #00ff88;
            color: #00ff88;
        }

        .nav-item::before {
            content: '';
            position: absolute;
            top: 0; left: -100%;
            width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: 0.5s;
        }
        .nav-item:hover::before {
            left: 100%;
        }

        .nav-desc {
            display: block;
            font-size: 0.8rem;
            letter-spacing: 2px;
            opacity: 0.7;
            margin-top: -5px;
            color: #aaa;
        }

        @media (max-width: 600px), (max-height: 700px) {
            .nav-item {
                font-size: 1.5rem;
                padding: 10px 25px;
                margin: 10px;
            }
            .nav-desc {
                font-size: 0.6rem;
            }
            h1 { font-size: 1.2rem; }
            .bar-container { width: 200px; }
        }

        /* Scanline effect */
        .scanlines {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
            background-size: 100% 2px, 3px 100%;
            pointer-events: none;
            z-index: 99;
            opacity: 0.3;
        }
        .ui-button {
            background: rgba(0, 255, 136, 0.1);
            border: 1px solid #00ff88;
            color: #00ff88;
            padding: 8px 15px;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.2s ease-in-out;
            box-shadow: 0 0 5px rgba(0, 255, 136, 0.5);
            pointer-events: all;
            position: absolute;
            top: 30px;
            right: 30px;
            z-index: 10;
            user-select: none;
        }
        .ui-button:hover {
            background: rgba(0, 255, 136, 0.2);
            box-shadow: 0 0 10px #00ff88;
        }

        .nav-reset-button {
            position: absolute;
            top: 30px;
            right: 30px;
            z-index: 25;
            margin-top: 0;
        }

        /* Presence Bar */
        #presence-bar {
            position: fixed;
            top: 30px;
            right: 120px;
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid #00ff88;
            border-radius: 20px;
            padding: 6px 12px;
            z-index: 100;
            font-size: 0.75rem;
            color: #00ff88;
        }
        .presence-dot {
            width: 8px;
            height: 8px;
            background: #00ff88;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .presence-avatars {
            display: flex;
            margin-left: 8px;
        }
        .presence-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #336699;
            border: 2px solid #00ff88;
            margin-left: -8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: white;
            font-weight: bold;
        }
        .presence-avatar:first-child {
            margin-left: 0;
        }

        /* Remote Cursors */
        .remote-cursor {
            position: fixed;
            pointer-events: none;
            z-index: 9999;
            transition: left 0.1s ease-out, top 0.1s ease-out;
        }
        .cursor-label {
            margin-left: 16px;
            margin-top: -4px;
            padding: 2px 8px;
            color: white;
            font-size: 12px;
            font-weight: 500;
            border-radius: 4px;
            white-space: nowrap;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
    </style>
    <script type="importmap">
        {
            "imports": {
                "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
                "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
            }
        }
    </script>
</head>
<body>
    <div class="scanlines"></div>

    <div id="presence-bar">
        <div class="presence-dot"></div>
        <span id="presence-count">1 online</span>
        <div class="presence-avatars" id="presence-avatars"></div>
    </div>

    <div id="ui">
        <h1>Loading...</h1>
        <p></p>
        <p class="sub"></p>
    </div>
    <button id="reset-button" class="ui-button">RESET</button>

    <div class="bar-container">
        <div id="progress-bar"></div>
    </div>

    <div id="nav-overlay"></div>

    <div id="canvas-container"></div>

    <div id="remote-cursors"></div>

    <script type="module">
        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

        // ==========================================
        //         USER CONFIGURATION
        // ==========================================
        const CONFIG = {
            title: "Taylor William Buley",
            subtitle: "Cognitive Architect",
            helperText: "Ghost schematic indicates t-minus \${remaining} moves",

            successTitle: "Taylor William Buley",
            successSubtitle: "Cognitive Architect",

            menu: [
                { title: "CV",          subtitle: "buley.info",    link: "https://buley.info" },
                { title: "Photos",      subtitle: "buley.shop",    link: "https://buley.shop" },
                { title: "Code",        subtitle: "github.com/buley", link: "http://github.com/buley" },
                { title: "Socials",     subtitle: "buley.xyz",     link: "https://buley.xyz/" },
                { title: "Mind",        subtitle: "buley.net",     link: "https://buley.net" },
                { title: "About",       subtitle: "buley.us",      link: "https://buley.us" },
                { title: "Practice",    subtitle: "neutrals.io",   link: "https://neutrals.io/" },
                { title: "Art",         subtitle: "opensea.io",    link: "https://opensea.io/profile/0x957f308011bd0fa95ac95fd92a73f06cb7ec6774?collectionSlugs=nft-art-collection-number-1,nft-art-collection-number-2" },
                { title: "Music",       subtitle: "soundcloud.com", link: "https://soundcloud.com/taylor-buley" },
                { title: "Words",       subtitle: "taylorbuley.substack.com", link: "https://taylorbuley.substack.com/s/words" }
            ],

            colors: {
                base: 0x1a1a1a,
                U: 0xFFFFFF,
                D: 0xFFD700,
                R: 0xFF0055,
                L: 0xFF5500,
                F: 0x00FF88,
                B: 0x0051BA
            },

            scrambleMoves: 25,
            mouseSensitivity: 0.005,
            lookahead: 4
        };
        // ==========================================
        //      END CONFIGURATION
        // ==========================================

        // --- Presence System ---
        class PresenceManager {
            constructor() {
                this.userId = crypto.randomUUID();
                this.ws = null;
                this.users = new Map();
                this.reconnectAttempts = 0;
                this.maxReconnectAttempts = 5;
                this.cursorsContainer = document.getElementById('remote-cursors');

                this.connect();
                this.setupCursorTracking();
            }

            connect() {
                const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = \`\${protocol}//\${location.host}/session/fyi-main?userId=\${this.userId}&role=user\`;

                try {
                    this.ws = new WebSocket(wsUrl);

                    this.ws.onopen = () => {
                        console.log('[Presence] Connected');
                        this.reconnectAttempts = 0;
                    };

                    this.ws.onmessage = (event) => {
                        try {
                            const message = JSON.parse(event.data);
                            this.handleMessage(message);
                        } catch (err) {
                            console.error('[Presence] Failed to parse message:', err);
                        }
                    };

                    this.ws.onclose = () => {
                        console.log('[Presence] Disconnected');
                        this.scheduleReconnect();
                    };

                    this.ws.onerror = (err) => {
                        console.error('[Presence] WebSocket error:', err);
                    };
                } catch (err) {
                    console.error('[Presence] Failed to connect:', err);
                    this.scheduleReconnect();
                }
            }

            scheduleReconnect() {
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                    console.log(\`[Presence] Reconnecting in \${delay}ms...\`);
                    setTimeout(() => this.connect(), delay);
                }
            }

            handleMessage(message) {
                switch (message.type) {
                    case 'init':
                        if (message.payload.presence) {
                            message.payload.presence.forEach(user => {
                                if (user.userId !== this.userId) {
                                    this.users.set(user.userId, user);
                                }
                            });
                        }
                        this.updatePresenceUI();
                        break;

                    case 'presence':
                        if (message.payload.action === 'join' && message.payload.user.userId !== this.userId) {
                            this.users.set(message.payload.user.userId, message.payload.user);
                        } else if (message.payload.action === 'leave') {
                            this.users.delete(message.payload.userId);
                            this.removeCursor(message.payload.userId);
                        } else if (message.payload.action === 'update' && message.payload.user.userId !== this.userId) {
                            this.users.set(message.payload.user.userId, message.payload.user);
                        }
                        this.updatePresenceUI();
                        break;

                    case 'cursor':
                        if (message.payload.userId !== this.userId) {
                            this.updateCursor(message.payload.userId, message.payload.cursor);
                        }
                        break;

                    case 'pong':
                        break;
                }
            }

            setupCursorTracking() {
                let lastSend = 0;
                const throttleMs = 50;

                document.addEventListener('mousemove', (e) => {
                    const now = Date.now();
                    if (now - lastSend >= throttleMs && this.ws?.readyState === WebSocket.OPEN) {
                        this.ws.send(JSON.stringify({
                            type: 'cursor',
                            payload: { x: e.clientX, y: e.clientY }
                        }));
                        lastSend = now;
                    }
                });

                // Ping to keep alive
                setInterval(() => {
                    if (this.ws?.readyState === WebSocket.OPEN) {
                        this.ws.send(JSON.stringify({ type: 'ping', payload: {} }));
                    }
                }, 30000);
            }

            updatePresenceUI() {
                const count = this.users.size + 1;
                document.getElementById('presence-count').textContent = \`\${count} online\`;

                const avatarsContainer = document.getElementById('presence-avatars');
                avatarsContainer.innerHTML = '';

                // Add self
                const selfAvatar = document.createElement('div');
                selfAvatar.className = 'presence-avatar';
                selfAvatar.textContent = 'ME';
                selfAvatar.style.background = '#00ff88';
                avatarsContainer.appendChild(selfAvatar);

                // Add others
                Array.from(this.users.values()).slice(0, 4).forEach(user => {
                    const avatar = document.createElement('div');
                    avatar.className = 'presence-avatar';
                    avatar.textContent = user.userId.slice(0, 2).toUpperCase();
                    avatar.style.background = this.getUserColor(user.userId);
                    avatarsContainer.appendChild(avatar);
                });

                if (this.users.size > 4) {
                    const more = document.createElement('div');
                    more.className = 'presence-avatar';
                    more.textContent = \`+\${this.users.size - 4}\`;
                    more.style.background = '#666';
                    avatarsContainer.appendChild(more);
                }
            }

            updateCursor(userId, cursor) {
                let cursorEl = document.getElementById(\`cursor-\${userId}\`);

                if (!cursorEl) {
                    cursorEl = document.createElement('div');
                    cursorEl.id = \`cursor-\${userId}\`;
                    cursorEl.className = 'remote-cursor';
                    cursorEl.innerHTML = \`
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3))">
                            <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L5.92 2.53a.5.5 0 0 0-.42.68z" fill="\${this.getUserColor(userId)}" stroke="white" stroke-width="1.5"/>
                        </svg>
                        <div class="cursor-label" style="background: \${this.getUserColor(userId)}">\${userId.slice(0, 8)}</div>
                    \`;
                    this.cursorsContainer.appendChild(cursorEl);
                }

                cursorEl.style.left = \`\${cursor.x}px\`;
                cursorEl.style.top = \`\${cursor.y}px\`;
            }

            removeCursor(userId) {
                const cursorEl = document.getElementById(\`cursor-\${userId}\`);
                if (cursorEl) {
                    cursorEl.remove();
                }
            }

            getUserColor(userId) {
                const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#336699', '#ec4899'];
                let hash = 0;
                for (let i = 0; i < userId.length; i++) {
                    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
                    hash = hash & hash;
                }
                return colors[Math.abs(hash) % colors.length];
            }
        }

        // --- Configuration Constants ---
        const CUBE_SIZE = 1;
        const SPACING = 0.08;
        const TOTAL_SIZE = CUBE_SIZE + SPACING;

        // --- Global State ---
        let scene, camera, renderer, controls;
        let allCubies = [];
        let ghostCubies = [];
        let particles;
        let pivot;

        let scrambleSequence = [];
        let solveSequence = [];
        let currentMoveIndex = 0;
        let currentMoveProgress = 0;
        let isSolved = false;
        let mouseAccumulator = 0;

        let shakeIntensity = 0;
        let scrambledIndices = [];
        let scrambledSubtitleIndices = [];
        const cameraOriginalPos = new THREE.Vector3(6, 6, 8);

        // Initialize presence
        const presence = new PresenceManager();

        init();
        animate();

        function init() {
            setupUI();

            const container = document.getElementById('canvas-container');
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x050505);
            scene.fog = new THREE.FogExp2(0x050505, 0.03);

            camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
            camera.position.copy(cameraOriginalPos);

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            renderer.toneMapping = THREE.ReinhardToneMapping;
            container.appendChild(renderer.domElement);

            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.enablePan = false;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.5;

            const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
            scene.add(ambientLight);

            const spotLight = new THREE.SpotLight(0xffffff, 50);
            spotLight.position.set(10, 20, 10);
            spotLight.angle = 0.3;
            spotLight.penumbra = 1;
            spotLight.castShadow = true;
            scene.add(spotLight);

            const rimLight = new THREE.PointLight(0x00ffff, 20, 20);
            rimLight.position.set(-5, 5, -5);
            scene.add(rimLight);

            const rimLight2 = new THREE.PointLight(0xff0055, 20, 20);
            rimLight2.position.set(5, -5, 5);
            scene.add(rimLight2);

            createRubiksCube();
            createParticles();

            pivot = new THREE.Object3D();
            scene.add(pivot);

            performScramble();
            updateTitle();
            updateSubtitle();

            triggerSolvedState();

            window.addEventListener('resize', onWindowResize);
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    resetCube();
                }
            });
        }

        function setupUI() {
            initScrambledTitle();
            initScrambledSubtitle();
            updateHelperText();

            const nav = document.getElementById('nav-overlay');
            nav.innerHTML = '';

            CONFIG.menu.forEach(item => {
                const link = document.createElement('a');
                link.href = item.link;
                link.className = 'nav-item';
                link.innerHTML = \`
                    \${item.title}
                    <span class="nav-desc">\${item.subtitle}</span>
                \`;
                nav.appendChild(link);
            });
            document.getElementById('reset-button').addEventListener('click', resetCube);
        }

        function updateHelperText() {
            const remaining = solveSequence.length - currentMoveIndex;
            document.querySelector('.sub').textContent = CONFIG.helperText.replace('\${remaining}', remaining);
        }

        function initScrambledTitle() {
            const title = CONFIG.title;
            const indices = [];
            for (let i = 0; i < title.length; i++) {
                if (title[i] !== ' ') indices.push(i);
            }
            scrambledIndices = [...indices];
            for (let i = scrambledIndices.length - 1; i > 0; i--) {
                const j = Math.floor((i * 7919) % (i + 1));
                [scrambledIndices[i], scrambledIndices[j]] = [scrambledIndices[j], scrambledIndices[i]];
            }
        }

        function getScrambledTitle(progress) {
            const title = CONFIG.title;
            if (progress >= 1) return title;

            const chars = title.split('');
            const numSolved = Math.floor(progress * scrambledIndices.length);
            const unsolvedPositions = scrambledIndices.slice(numSolved);
            const unsolvedChars = unsolvedPositions.map(i => title[i]);

            for (let i = unsolvedChars.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [unsolvedChars[i], unsolvedChars[j]] = [unsolvedChars[j], unsolvedChars[i]];
            }

            unsolvedPositions.forEach((pos, idx) => {
                chars[pos] = unsolvedChars[idx];
            });

            return chars.join('');
        }

        function updateTitle() {
            if (isSolved) return;
            const progress = currentMoveIndex / solveSequence.length;
            document.querySelector('#ui h1').textContent = getScrambledTitle(progress);
        }

        function initScrambledSubtitle() {
            const subtitle = CONFIG.subtitle;
            const indices = [];
            for (let i = 0; i < subtitle.length; i++) {
                if (subtitle[i] !== ' ') indices.push(i);
            }
            scrambledSubtitleIndices = [...indices];
            for (let i = scrambledSubtitleIndices.length - 1; i > 0; i--) {
                const j = Math.floor((i * 7919) % (i + 1));
                [scrambledSubtitleIndices[i], scrambledSubtitleIndices[j]] = [scrambledSubtitleIndices[j], scrambledSubtitleIndices[i]];
            }
        }

        function getScrambledSubtitle(progress) {
            const subtitle = CONFIG.subtitle;
            if (progress >= 1) return subtitle;

            const chars = subtitle.split('');
            const numSolved = Math.floor(progress * scrambledSubtitleIndices.length);
            const unsolvedPositions = scrambledSubtitleIndices.slice(numSolved);
            const unsolvedChars = unsolvedPositions.map(i => subtitle[i]);

            for (let i = unsolvedChars.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [unsolvedChars[i], unsolvedChars[j]] = [unsolvedChars[j], unsolvedChars[i]];
            }

            unsolvedPositions.forEach((pos, idx) => {
                chars[pos] = unsolvedChars[idx];
            });

            return chars.join('');
        }

        function updateSubtitle() {
            if (isSolved) return;
            const progress = currentMoveIndex / solveSequence.length;
            document.querySelector('#ui p').textContent = getScrambledSubtitle(progress);
        }

        function createParticles() {
            const geometry = new THREE.BufferGeometry();
            const count = 1000;
            const positions = new Float32Array(count * 3);

            for(let i=0; i<count; i++) {
                positions[i*3] = (Math.random() - 0.5) * 20;
                positions[i*3+1] = (Math.random() - 0.5) * 20;
                positions[i*3+2] = (Math.random() - 0.5) * 20;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const material = new THREE.PointsMaterial({
                color: CONFIG.colors.F,
                size: 0.05,
                transparent: true,
                opacity: 0.4,
                blending: THREE.AdditiveBlending
            });

            particles = new THREE.Points(geometry, material);
            scene.add(particles);
        }

        function createRubiksCube() {
            const geometry = new RoundedBoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE, 2, 0.05);

            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    for (let z = -1; z <= 1; z++) {
                        const materialArray = getMaterialsArray(x, y, z, false);
                        const mesh = new THREE.Mesh(geometry, materialArray);

                        mesh.position.set(x * TOTAL_SIZE, y * TOTAL_SIZE, z * TOTAL_SIZE);
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;

                        const id = allCubies.length;
                        mesh.userData = {
                            originalPos: new THREE.Vector3(x, y, z),
                            currentPos: new THREE.Vector3(x, y, z),
                            id: id
                        };

                        scene.add(mesh);
                        allCubies.push(mesh);

                        const edges = new THREE.EdgesGeometry(geometry);
                        const ghostMat = new THREE.LineBasicMaterial({
                            color: 0x00ffff,
                            transparent: true,
                            opacity: 0.1,
                            blending: THREE.AdditiveBlending,
                            depthWrite: false
                        });
                        const ghostMesh = new THREE.LineSegments(edges, ghostMat);

                        ghostMesh.position.copy(mesh.position);

                        ghostMesh.userData = {
                            currentPos: new THREE.Vector3(x, y, z),
                            id: id
                        };

                        scene.add(ghostMesh);
                        ghostCubies.push(ghostMesh);
                    }
                }
            }
        }

        function getMaterialsArray(x, y, z, isGhost) {
            if (isGhost) return [];

            const baseMat = getMaterial(CONFIG.colors.base);

            const mats = [
                baseMat, baseMat, baseMat, baseMat, baseMat, baseMat
            ];

            if (x === 1) mats[0] = getMaterial(CONFIG.colors.R);
            if (x === -1) mats[1] = getMaterial(CONFIG.colors.L);
            if (y === 1) mats[2] = getMaterial(CONFIG.colors.U);
            if (y === -1) mats[3] = getMaterial(CONFIG.colors.D);
            if (z === 1) mats[4] = getMaterial(CONFIG.colors.F);
            if (z === -1) mats[5] = getMaterial(CONFIG.colors.B);
            return mats;
        }

        function getMaterial(color) {
            if (color === CONFIG.colors.base) {
                return new THREE.MeshStandardMaterial({
                    color: 0x111111,
                    roughness: 0.7,
                    metalness: 0.8,
                });
            }
            return new THREE.MeshStandardMaterial({
                color: 0x000000,
                emissive: color,
                emissiveIntensity: 0.8,
                roughness: 0.2,
                metalness: 0.8
            });
        }

        function performScramble() {
            const possibleAxes = ['x', 'y', 'z'];
            const possibleSlices = [-1, 0, 1];
            const possibleDirs = [Math.PI / 2, -Math.PI / 2];

            for (let i = 0; i < CONFIG.scrambleMoves; i++) {
                const axis = possibleAxes[Math.floor(Math.random() * possibleAxes.length)];
                const sliceVal = possibleSlices[Math.floor(Math.random() * possibleSlices.length)];
                const angle = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];

                scrambleSequence.push({ axis, sliceVal, angle });
                applyMoveInstant(allCubies, axis, sliceVal, angle);
            }

            solveSequence = scrambleSequence.slice().reverse().map(move => {
                return { axis: move.axis, sliceVal: move.sliceVal, angle: -move.angle };
            });
        }

        function applyMoveInstant(cubesArray, axis, sliceVal, angle) {
            const axisVec = getAxisVector(axis);
            const active = cubesArray.filter(c => Math.abs(c.userData.currentPos[axis] - sliceVal) < 0.1);

            active.forEach(cube => {
                const pos = cube.position.clone();
                pos.applyAxisAngle(axisVec, angle);
                cube.position.copy(pos);

                const rotWorldMatrix = new THREE.Matrix4();
                rotWorldMatrix.makeRotationAxis(axisVec, angle);
                rotWorldMatrix.multiply(cube.matrix);
                cube.matrix = rotWorldMatrix;
                cube.rotation.setFromRotationMatrix(cube.matrix);

                cube.position.x = Math.round(cube.position.x / TOTAL_SIZE) * TOTAL_SIZE;
                cube.position.y = Math.round(cube.position.y / TOTAL_SIZE) * TOTAL_SIZE;
                cube.position.z = Math.round(cube.position.z / TOTAL_SIZE) * TOTAL_SIZE;

                const euler = new THREE.Euler().setFromQuaternion(cube.quaternion);
                cube.rotation.x = Math.round(euler.x / (Math.PI/2)) * (Math.PI/2);
                cube.rotation.y = Math.round(euler.y / (Math.PI/2)) * (Math.PI/2);
                cube.rotation.z = Math.round(euler.z / (Math.PI/2)) * (Math.PI/2);
                cube.updateMatrix();

                cube.userData.currentPos.set(
                    Math.round(cube.position.x / TOTAL_SIZE),
                    Math.round(cube.position.y / TOTAL_SIZE),
                    Math.round(cube.position.z / TOTAL_SIZE)
                );
            });
        }

        function updateGhosts() {
            if(isSolved) {
                ghostCubies.forEach(g => g.visible = false);
                return;
            }

            for(let i=0; i<allCubies.length; i++) {
                const real = allCubies[i];
                const ghost = ghostCubies[i];

                real.updateMatrixWorld();
                const worldPos = new THREE.Vector3();
                const worldQuat = new THREE.Quaternion();
                real.getWorldPosition(worldPos);
                real.getWorldQuaternion(worldQuat);

                ghost.position.copy(worldPos);
                ghost.quaternion.copy(worldQuat);
                ghost.scale.setScalar(0.92);
                ghost.updateMatrix();

                ghost.userData.currentPos.copy(real.userData.currentPos);
                ghost.visible = true;
            }

            const limit = Math.min(currentMoveIndex + CONFIG.lookahead, solveSequence.length);
            for(let m = currentMoveIndex; m < limit; m++) {
                const move = solveSequence[m];
                applyMoveInstant(ghostCubies, move.axis, move.sliceVal, move.angle);
            }
        }

        function getAxisVector(axisName) {
            return axisName === 'x' ? new THREE.Vector3(1, 0, 0) :
                   axisName === 'y' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
        }

        function onMouseMove(event) {
            if (isSolved) {
                const mx = (event.clientX / window.innerWidth) - 0.5;
                const my = (event.clientY / window.innerHeight) - 0.5;
                camera.position.x += (mx * 8 - camera.position.x) * 0.05;
                camera.position.y += (-my * 8 - camera.position.y) * 0.05;
                camera.lookAt(0,0,0);
                return;
            }

            const dist = Math.sqrt(event.movementX ** 2 + event.movementY ** 2);
            mouseAccumulator += dist * CONFIG.mouseSensitivity;

            shakeIntensity = Math.min(shakeIntensity + dist * 0.01, 1.0);
        }

        function onTouchMove(event) {
            event.preventDefault();
            if (isSolved) return;
            mouseAccumulator += 0.05;
            shakeIntensity = Math.min(shakeIntensity + 0.05, 1.0);
        }

        function updateSolver() {
            if (isSolved) return;

            if (currentMoveIndex >= solveSequence.length) {
                triggerSolvedState();
                return;
            }

            const totalProgressPct = ((currentMoveIndex + currentMoveProgress) / solveSequence.length) * 100;
            document.getElementById('progress-bar').style.width = \`\${totalProgressPct}%\`;

            const MAX_STEP = 0.2;
            let step = mouseAccumulator;
            if (step > MAX_STEP) step = MAX_STEP;

            if (step > 0.001) {
                controls.autoRotate = false;

                currentMoveProgress += step;
                mouseAccumulator -= step;

                const move = solveSequence[currentMoveIndex];
                const activeCubies = allCubies.filter(c =>
                    Math.abs(c.userData.currentPos[move.axis] - move.sliceVal) < 0.1
                );

                if (pivot.children.length === 0) {
                    pivot.rotation.set(0, 0, 0);
                    pivot.position.set(0, 0, 0);
                    pivot.updateMatrixWorld();
                    activeCubies.forEach(cube => pivot.attach(cube));
                }

                const targetRotation = move.angle * Math.min(currentMoveProgress, 1.0);
                if (move.axis === 'x') pivot.rotation.x = targetRotation;
                if (move.axis === 'y') pivot.rotation.y = targetRotation;
                if (move.axis === 'z') pivot.rotation.z = targetRotation;
                pivot.updateMatrixWorld();

                if (currentMoveProgress >= 1.0) {
                    const children = [...pivot.children];
                    children.forEach(c => {
                        scene.attach(c);
                        roundTransform(c);
                        c.userData.currentPos.set(
                            Math.round(c.position.x / TOTAL_SIZE),
                            Math.round(c.position.y / TOTAL_SIZE),
                            Math.round(c.position.z / TOTAL_SIZE)
                        );
                    });

                    currentMoveIndex++;
                    currentMoveProgress = 0;
                    updateGhosts();
                    updateHelperText();
                    updateTitle();
                    updateSubtitle();

                    shakeIntensity += 0.2;
                }
            } else {
                if(mouseAccumulator < 0.001) controls.autoRotate = true;
            }
        }

        function roundTransform(c) {
            c.position.x = Math.round(c.position.x / TOTAL_SIZE) * TOTAL_SIZE;
            c.position.y = Math.round(c.position.y / TOTAL_SIZE) * TOTAL_SIZE;
            c.position.z = Math.round(c.position.z / TOTAL_SIZE) * TOTAL_SIZE;

            const euler = new THREE.Euler().setFromQuaternion(c.quaternion);
            c.rotation.x = Math.round(euler.x / (Math.PI/2)) * (Math.PI/2);
            c.rotation.y = Math.round(euler.y / (Math.PI/2)) * (Math.PI/2);
            c.rotation.z = Math.round(euler.z / (Math.PI/2)) * (Math.PI/2);
            c.updateMatrix();
        }

        function triggerSolvedState() {
            isSolved = true;
            document.querySelector('#ui h1').textContent = CONFIG.successTitle;
            document.querySelector('#ui p').textContent = CONFIG.subtitle;
            document.querySelector('#ui .sub').style.display = 'none';
            document.getElementById('progress-bar').style.width = '100%';
            document.getElementById('progress-bar').style.backgroundColor = '#00ff88';
            document.getElementById('progress-bar').style.boxShadow = '0 0 20px #00ff88';

            ghostCubies.forEach(g => scene.remove(g));

            expandCube();

            const nav = document.getElementById('nav-overlay');
            nav.style.opacity = '1';
        }

        function resetCube() {
            isSolved = false;
            currentMoveIndex = 0;
            currentMoveProgress = 0;
            mouseAccumulator = 0;

            document.querySelector('#ui p').textContent = CONFIG.subtitle;
            document.querySelector('#ui .sub').style.display = 'block';
            document.getElementById('progress-bar').style.background = 'linear-gradient(90deg, #ff0055, #ffcc00, #00ff88)';
            document.getElementById('progress-bar').style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.2)';
            document.getElementById('progress-bar').style.width = '0%';

            const nav = document.getElementById('nav-overlay');
            nav.style.pointerEvents = 'none';
            nav.style.opacity = '0';

            allCubies.forEach(cube => {
                cube.userData.startTime = null;
                cube.position.set(
                    cube.userData.originalPos.x * TOTAL_SIZE,
                    cube.userData.originalPos.y * TOTAL_SIZE,
                    cube.userData.originalPos.z * TOTAL_SIZE
                );
                cube.rotation.set(0, 0, 0);
                cube.updateMatrix();
                cube.userData.currentPos.copy(cube.userData.originalPos);
                scene.add(cube);
            });

            ghostCubies.forEach(g => {
                scene.add(g);
                g.visible = true;
            });

            scrambleSequence = [];
            solveSequence = [];
            performScramble();
            updateGhosts();
            updateHelperText();
            updateTitle();
            updateSubtitle();

            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.5;
        }

        function expandCube() {
            const startTime = Date.now();
            allCubies.forEach(cube => {
                cube.position.set(
                    cube.userData.originalPos.x * TOTAL_SIZE,
                    cube.userData.originalPos.y * TOTAL_SIZE,
                    cube.userData.originalPos.z * TOTAL_SIZE
                );
                cube.rotation.set(0, 0, 0);
                cube.updateMatrix();
                cube.userData.currentPos.copy(cube.userData.originalPos);

                const dir = cube.userData.originalPos.clone().normalize();
                if(dir.length() === 0) dir.set(0,1,0);

                cube.userData.startPos = cube.position.clone();
                cube.userData.targetPos = cube.position.clone().add(dir.multiplyScalar(2));
                cube.userData.startTime = startTime;
            });

            controls.autoRotateSpeed = 2.0;
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function animate() {
            requestAnimationFrame(animate);

            if (isSolved) {
                const now = Date.now();
                allCubies.forEach(cube => {
                    if (cube.userData.startTime) {
                        const progress = Math.min((now - cube.userData.startTime) / 2000, 1);
                        const ease = 1 - Math.pow(1 - progress, 3);
                        if (cube.userData.startPos && cube.userData.targetPos) {
                           cube.position.lerpVectors(cube.userData.startPos, cube.userData.targetPos, ease);
                        }
                        cube.rotation.x += 0.005 * ease;
                        cube.rotation.y += 0.005 * ease;
                    }
                });
            } else {
                updateSolver();
            }

            controls.update();

            if(particles) {
                particles.rotation.y += 0.001;
                particles.rotation.x += 0.0005;
            }

            if (shakeIntensity > 0) {
                const rx = (Math.random() - 0.5) * shakeIntensity * 0.5;
                const ry = (Math.random() - 0.5) * shakeIntensity * 0.5;
                const rz = (Math.random() - 0.5) * shakeIntensity * 0.5;
                camera.position.add(new THREE.Vector3(rx, ry, rz));
                shakeIntensity *= 0.9;

                scene.position.set(rx, ry, rz);
            } else {
                scene.position.set(0,0,0);
            }

            renderer.render(scene, camera);
        }

    </script>
</body>
</html>`;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // Session routes - /session/*
      if (url.pathname.startsWith('/session/')) {
        return handleSessionRequest(request, env, corsHeaders);
      }

      // Routes registry - /routes
      if (url.pathname.startsWith('/routes')) {
        return handleRoutesRequest(request, env, corsHeaders);
      }

      // Health check
      if (url.pathname === '/health') {
        return new Response(
          JSON.stringify({ status: 'ok', env: env.ENVIRONMENT || 'production' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Serve the HTML page for all other routes
      return new Response(INDEX_HTML, {
        headers: {
          ...corsHeaders,
          'content-type': 'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },
};

/**
 * Handle session requests - route to PageSession Durable Object
 */
async function handleSessionRequest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);

  // Extract session ID from path: /session/:sessionId/...
  const pathParts = url.pathname.split('/').filter(Boolean);
  const sessionId = pathParts[1];

  if (!sessionId) {
    return new Response('Session ID required', { status: 400, headers: corsHeaders });
  }

  // Get or create the Durable Object instance
  const id = env.PAGE_SESSIONS.idFromName(sessionId);
  const stub = env.PAGE_SESSIONS.get(id);

  // Forward the request to the DO
  const doUrl = new URL(request.url);
  doUrl.pathname = '/' + pathParts.slice(2).join('/') || '/session';

  const doRequest = new Request(doUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  const response = await stub.fetch(doRequest);

  // Add CORS headers to response
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Handle routes registry requests - route to singleton RoutesRegistry DO
 */
async function handleRoutesRequest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Use a singleton DO for routes registry
  const id = env.ROUTES_REGISTRY.idFromName('__routes__');
  const stub = env.ROUTES_REGISTRY.get(id);

  const url = new URL(request.url);
  const doUrl = new URL(request.url);
  doUrl.pathname = url.pathname.replace('/routes', '') || '/routes';

  const doRequest = new Request(doUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  const response = await stub.fetch(doRequest);

  // Add CORS headers
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
