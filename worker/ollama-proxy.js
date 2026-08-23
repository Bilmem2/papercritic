/* PaperCritic Mobile v3.5.0 - Ollama Cloud CORS proxy */

const ALLOWED_ORIGIN = 'https://bilmem2.github.io';
const OLLAMA_ORIGIN = 'https://ollama.com';

const MODEL_ALIASES = {
  'deepseek-v4-flash': 'deepseek-v4-flash:0731',
  'deepseek-v4-pro': 'deepseek-v4-pro:0813',
  'qwen3.5': 'qwen3.5:397b',
  'gemma4': 'gemma4:31b',
};

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

async function buildUpstreamRequest(request) {
  const headers = new Headers();
  headers.set('Authorization', request.headers.get('Authorization'));

  const contentType = request.headers.get('Content-Type');
  if (contentType) headers.set('Content-Type', contentType);

  const accept = request.headers.get('Accept');
  if (accept) headers.set('Accept', accept);

  if (request.method === 'GET' || request.method === 'HEAD') {
    return { headers, body: undefined };
  }

  const contentTypeLower = (contentType || '').toLowerCase();
  if (contentTypeLower.includes('application/json')) {
    const text = await request.text();
    try {
      const payload = JSON.parse(text);
      if (typeof payload.model === 'string' && MODEL_ALIASES[payload.model]) {
        payload.model = MODEL_ALIASES[payload.model];
      }
      return { headers, body: JSON.stringify(payload) };
    } catch {
      return { headers, body: text };
    }
  }

  return { headers, body: request.body };
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin');

    if (origin && origin !== ALLOWED_ORIGIN) {
      return jsonResponse(403, { error: 'Origin not allowed.' });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse(200, {
        ok: true,
        service: 'papercritic-ollama-proxy',
        version: '3.5.0',
      });
    }

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
    if (!auth || !/^Bearer\s+\S+/i.test(auth)) {
      return jsonResponse(401, {
        error: 'Missing or invalid Ollama API key.',
      });
    }

    const upstream = new URL(upstreamPath + url.search, OLLAMA_ORIGIN);

    try {
      const { headers, body } = await buildUpstreamRequest(request);
      const upstreamResponse = await fetch(upstream, {
        method: request.method,
        headers,
        body,
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
      return jsonResponse(502, {
        error: 'Ollama upstream request failed.',
        details: String(error),
      });
    }
  },
};
