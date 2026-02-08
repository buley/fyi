import INDEX_HTML from './index.html';

export default {
  async fetch(request, env, ctx) {
    return new Response(INDEX_HTML, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
        "Cache-Control": "public, max-age=3600", // Cache at edge for 1 hour
      },
    });
  },
};