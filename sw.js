const CACHE = 'papercritic-mobile-v3.8';
const INDEX_PATH = new URL('./index.html', self.location).pathname;
const ROOT_PATH = new URL('./', self.location).pathname;
const MANIFEST_PATH = new URL('./manifest.webmanifest', self.location).pathname;

const OLLAMA_DEFAULT_MODELS = `const OLLAMA_DEFAULT_MODELS = [
      { id: 'gemma4:31b', label: 'Gemma 4 31B — Ollama Cloud · verified' },
      { id: 'minimax-m3', label: 'MiniMax M3 — Ollama Cloud · verified' },
      { id: 'gpt-oss:120b', label: 'GPT-OSS 120B — Ollama Cloud · verified' }
    ];`;

const OLLAMA_CLOUD_MODELS = `const OLLAMA_CLOUD_MODELS = [
      { id: 'gemma4:31b', label: 'Gemma 4 31B — Ollama Cloud · verified' },
      { id: 'minimax-m3', label: 'MiniMax M3 — Ollama Cloud · verified' },
      { id: 'gpt-oss:120b', label: 'GPT-OSS 120B — Ollama Cloud · verified' }
    ];`;

const FALLBACK_FUNCTION = `function refreshFallbackOptions(selectedId = '') {
      const select = $('#fallbackProviderSelect');
      if (!select) return;
      const currentProvider = $('#providerSelect').value;
      const currentModel = $('#modelSelect')?.value || '';
      const models = currentProvider === 'ollama' ? OLLAMA_CLOUD_MODELS : GEMINI_MODEL_FALLBACKS;
      const prefix = currentProvider === 'ollama' ? 'ollama-cloud:' : 'gemini:';
      const labelPrefix = currentProvider === 'ollama' ? 'Ollama Cloud · ' : 'Gemini · ';
      const options = models
        .filter(model => model.id !== currentModel)
        .map(model => [prefix + model.id, labelPrefix + model.id]);
      select.replaceChildren();
      if (!options.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Yedek model yok';
        select.append(opt);
        return;
      }
      options.forEach(([value, label]) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        select.append(opt);
      });
      if (selectedId && options.some(([value]) => value === selectedId)) {
        select.value = selectedId;
      }
    }

    function getFallbackConfig`;

const PROVIDER_HANDLER = `$('#providerSelect').addEventListener('change', () => {
      const provider = $('#providerSelect').value;
      const saved = loadStoredConfig(provider);
      $('#apiKey').value = saved?.apiKey || '';
      updateProviderUI(saved?.model);
      refreshFallbackOptions(saved?.fallbackTarget || '');
      const target = saved?.fallbackTarget || '';
      const valid = [...$('#fallbackProviderSelect').options].some(option => option.value === target);
      $('#fallbackToggle').checked = !!saved?.fallbackEnabled && valid;
      updateCrossCheckUI();
    });`;

function patchIndex(html) {
  let text = html;
  text = text.replace(/const OLLAMA_DEFAULT_MODELS = \[[\s\S]*?\n    \];/, OLLAMA_DEFAULT_MODELS);
  text = text.replace(/const OLLAMA_CLOUD_MODELS = \[[\s\S]*?\n    \];/, OLLAMA_CLOUD_MODELS);
  text = text.replace(/function refreshFallbackOptions\(selectedId = ''\) \{[\s\S]*?\n    \}\n\n    function getFallbackConfig/, FALLBACK_FUNCTION);
  text = text.replace(/\$\('#providerSelect'\)\.addEventListener\('change', \(\) => \{[\s\S]*?\n    \}\);/, PROVIDER_HANDLER);
  text = text.replace(/<div id="reasoningGroup"/g, '<div id="reasoningGroup" style="display:none"');
  return text;
}

async function networkIndexResponse(request) {
  const response = await fetch(request, { cache: 'no-store' });
  if (!response.ok) return response;
  const html = await response.text();
  const patched = patchIndex(html);
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  return new Response(patched, { status: response.status, statusText: response.statusText, headers });
}

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin || event.request.method !== 'GET') return;

  if (requestUrl.pathname === INDEX_PATH || requestUrl.pathname === ROOT_PATH) {
    event.respondWith(
      networkIndexResponse(event.request)
        .catch(async () => {
          const cached = await caches.match(new Request(new URL('./index.html', self.location)));
          if (!cached) throw new Error('No cached index available');
          const html = await cached.text();
          return new Response(patchIndex(html), { headers: cached.headers, status: cached.status, statusText: cached.statusText });
        })
        .then(async response => {
          const copy = response.clone();
          const cache = await caches.open(CACHE);
          await cache.put(new Request(new URL('./index.html', self.location)), copy);
          return response;
        })
    );
    return;
  }

  if (requestUrl.pathname === MANIFEST_PATH) {
    event.respondWith(fetch(event.request));
  }
});
