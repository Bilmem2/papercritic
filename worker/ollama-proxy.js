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
    'Access-Control-Expose-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
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

    // GitHub Pages is the only browser origin allowed to use the proxy.
    // Origin-less requests are allowed for diagnostics/health checks.
    if (origin && origin !== ALLOWED_ORIGIN) {
      return jsonResponse(403, { error: 'Origin not allowed.' });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    // Health endpoint. No API key required.
    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse(200, {
        ok: true,
        service: 'papercritic-ollama-proxy',
        version: '3.4',
      });
    }

    // The Worker receives /api/... directly on its workers.dev hostname.
    // Normalize the optional legacy prefix as well.
    let upstreamPath = url.pathname;
    if (upstreamPath.startsWith('/ollama-proxy/')) {
      upstreamPath = upstreamPath.slice('/ollama-proxy'.length);
    }

    if (!upstreamPath.startsWith('/api/')) {
      return jsonResponse(404, {
        error: 'Only Ollama /api/* endpoints are proxied.',
        path_received: url.pathname,
      });
    }

    const auth = request.headers.get('Authorization');
    if (!auth || !/^Bearer\s+sk-/i.test(auth)) {
      return jsonResponse(401, {
        error: 'Missing or invalid Ollama API key.',
      });
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

      // Preserve Ollama streaming responses for /api/chat.
      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      return jsonResponse(502, {
        error: 'Ollama upstream request failed.',
        details: String(error),
      });
    }
  },
};
