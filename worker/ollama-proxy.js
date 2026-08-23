/* PaperCritic Mobile v3.4 - Ollama Cloud CORS proxy
 * Deploy this file as a Cloudflare Worker.
 * The worker never stores an Ollama API key. The browser sends its own
 * Authorization: Bearer sk-... header and the worker forwards it upstream.
 */

const ALLOWED_ORIGINS = new Set([
  'https://bilmem2.github.io',
]);

const OLLAMA_ORIGIN = 'https://ollama.com';

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://bilmem2.github.io';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type,Accept',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function jsonError(status, message, origin) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin),
    },
  });
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (!ALLOWED_ORIGINS.has(origin)) {
      return jsonError(403, 'Origin not allowed.', origin);
    }

    const url = new URL(request.url);
    const upstreamPath = url.pathname.replace(/^\/ollama-proxy/, '') || '/api';

    if (!upstreamPath.startsWith('/api/')) {
      return jsonError(404, 'Only Ollama /api/* endpoints are proxied.', origin);
    }

    const auth = request.headers.get('Authorization');
    if (!auth || !/^Bearer\s+sk-/i.test(auth)) {
      return jsonError(401, 'Missing or invalid Ollama API key.', origin);
    }

    const upstream = new URL(upstreamPath + url.search, OLLAMA_ORIGIN);
    const headers = new Headers(request.headers);
    headers.set('Authorization', auth);
    headers.delete('Origin');
    headers.delete('Referer');
    headers.delete('Host');

    const upstreamResponse = await fetch(upstream, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    for (const [key, value] of Object.entries(corsHeaders(origin))) {
      responseHeaders.set(key, value);
    }

    // Keep streaming chat responses intact.
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
};
