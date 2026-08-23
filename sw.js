const CACHE = 'papercritic-mobile-v3.7';
const INDEX_PATH = new URL('./index.html', self.location).pathname;
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
      const options = models
        .filter(model => model.id !== currentModel)
        .map(model => [
          currentProvider === 'ollama' ? \\`ollama-cloud:\\${model.id}\\` : \\`gemini:\\${model.id}\\`,
          currentProvider === 'ollama' ? \\`Ollama Cloud · \\${model.id}\\` : \\`Gemini · \\${model.id}\\`
        ]);
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

  // Only mutate the small configuration fragments. The rest of the known-good
  // frontend, including PDF upload, chat, review flow, and design, is untouched.
  text = text.replace(/const OLLAMA_DEFAULT_MODELS = \[[\s\S]*?\n    \];/, OLLAMA_DEFAULT_MODELS);
  text = text.replace(/const OLLAMA_CLOUD_MODELS = \[[\s\S]*?\n    \];/, OLLAMA_CLOUD_MODELS);
  text = text.replace(/function refreshFallbackOptions\(selectedId = ''\) \{[\s\S]*?\n    \}\n\n    function getFallbackConfig/, FALLBACK_FUNCTION);
  text = text.replace(/\$\('#providerSelect'\)\.addEventListener\('change', \(\) => \{[\s\S]*?\n    \}\);/, PROVIDER_HANDLER);

  // The Nemotron control is obsolete for mobile Ollama and stays hidden even if
  // the historical markup exists in a cached/older HTML shell.
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
  if (requestUrl.origin !== self.location.origin) return;

  if (requestUrl.pathname === INDEX_PATH && event.request.method === 'GET') {
    event.respondWith(
      networkIndexResponse(event.request)
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (!cached) throw new Error('No cached index available');
          const html = await cached.text();
          return new Response(patchIndex(html), { headers: cached.headers, status: cached.status, statusText: cached.statusText });
        })
        .then(async response => {
          const copy = response.clone();
          const cache = await caches.open(CACHE);
          await cache.put(event.request, copy);
          return response;
        })
    );
    return;
  }

  if (requestUrl.pathname === MANIFEST_PATH && event.request.method === 'GET') {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
  }
});
