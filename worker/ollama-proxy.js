/* PaperCritic Mobile v3.4 - Ollama Cloud CORS proxy
 * The worker never stores an Ollama API key. The browser sends its own
 * Authorization: Bearer sk-... header and the worker forwards it upstream.
 */

const ALLOWED_ORIGIN = 'https://bilmem2.github.io';
const OLLAMA_ORIGIN = 'https://ollama.com';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type,Accept',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(),
    },
  });
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin');

    // A normal browser request from GitHub Pages carries this Origin.
    // Origin-less requests are also allowed so the endpoint can be health-tested
    // directly and can be reached through the controlled service-worker route.
    if (origin && origin !== ALLOWED_ORIGIN) {
      return jsonError(403, 'Origin not allowed.');
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const upstreamPath = url.pathname.replace(/^\/ollama-proxy/, '') || '/api';

    if (!upstreamPath.startsWith('/api/')) {
      return jsonError(404, 'Only Ollama /api/* endpoints are proxied.');
    }

    const auth = request.headers.get('Authorization');
    if (!auth || !/^Bearer\s+sk-/i.test(auth)) {
      return jsonError(401, 'Missing or invalid Ollama API key.');
    }

    const upstream = new URL(upstreamPath + url.search, OLLAMA_ORIGIN);
    const headers = new Headers();
    headers.set('Authorization', auth);
    const contentType = request.headers.get('Content-Type');
    if (contentType) headers.set('Content-Type', contentType);
    const accept = request.headers.get('Accept');
    if (accept) headers.set('Accept', accept);

    try {
      const upstreamResponse = await fetch(upstream, {
        method: request.method,
        headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      });

      const responseHeaders = new Headers(upstreamResponse.headers);
      for (const [key, value] of Object.entries(corsHeaders())) {
        responseHeaders.set(key, value);
      }

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      return jsonError(502, `Ollama upstream request failed: ${String(error)}`);
    }
  },
};
