const CACHE = 'papercritic-cloud-api-v4.1';
const INDEX_PATH = new URL('./index.html', self.location).pathname;
const ROOT_PATH = new URL('./', self.location).pathname;
const MANIFEST_PATH = new URL('./manifest.webmanifest', self.location).pathname;

const OLLAMA_MODELS = `const OLLAMA_DEFAULT_MODELS = [
      { id: 'gemma4:31b', label: 'Gemma 4 31B — Ollama Cloud' },
      { id: 'minimax-m3', label: 'MiniMax M3 — Ollama Cloud' },
      { id: 'gpt-oss:120b', label: 'GPT-OSS 120B — Ollama Cloud' }
    ];`;
const OLLAMA_CLOUD_MODELS = `const OLLAMA_CLOUD_MODELS = [
      { id: 'gemma4:31b', label: 'Gemma 4 31B — Ollama Cloud' },
      { id: 'minimax-m3', label: 'MiniMax M3 — Ollama Cloud' },
      { id: 'gpt-oss:120b', label: 'GPT-OSS 120B — Ollama Cloud' }
    ];`;
const GEMINI_MODELS = `const GEMINI_MODEL_FALLBACKS = [
      { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash — en güçlü Flash' },
      { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash — dengeli Flash' },
      { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash — hızlı Flash' },
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite — yüksek hacim' },
      { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite — ekonomik' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash — uzun bağlam' },
      { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite — ekonomik' }
    ];`;
const OPENROUTER_MODELS = `const OPENROUTER_MODEL_FALLBACKS = [
      { id: 'openrouter/auto', label: 'Auto Router — görev için model seçer' },
      { id: 'openrouter/free', label: 'Free Models Router — ücretsiz' },
      { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B — ücretsiz' },
      { id: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B — ücretsiz' },
      { id: 'qwen/qwen3-next-80b-a3b-instruct:free', label: 'Qwen3 Next 80B — ücretsiz' }
    ];`;
const PROVIDER_OPTIONS = `<option value="gemini">Google Gemini API</option><option value="ollama">Ollama Cloud API</option><option value="openrouter">OpenRouter API</option>`;

const FALLBACK_FUNCTION = `function refreshFallbackOptions(selectedId = '') {
      const select = $('#fallbackProviderSelect');
      if (!select) return;
      const currentProvider = $('#providerSelect').value;
      const currentModel = $('#modelSelect')?.value || '';
      const groups = [];
      const add = (provider, models, label) => models.filter(model => model.id !== currentModel).forEach(model => groups.push([
        provider + ':' + model.id,
        label + ' · ' + model.id
      ]));
      if (currentProvider !== 'ollama') add('ollama-cloud', OLLAMA_CLOUD_MODELS, 'Ollama Cloud');
      if (currentProvider !== 'gemini') add('gemini', GEMINI_MODEL_FALLBACKS, 'Gemini');
      if (currentProvider !== 'openrouter') add('openrouter', OPENROUTER_MODEL_FALLBACKS, 'OpenRouter');
      select.replaceChildren();
      groups.forEach(([value, label]) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        select.append(opt);
      });
      if (selectedId && groups.some(([value]) => value === selectedId)) select.value = selectedId;
    }`;

const PROVIDER_LABEL = `function providerLabel(provider) {
      return provider === 'gemini' ? 'Gemini' : provider === 'openrouter' ? 'OpenRouter' : 'Ollama Cloud';
    }`;
const GET_FALLBACK_MODELS = `function getFallbackModels(provider) {
      if (provider === 'gemini') return GEMINI_MODEL_FALLBACKS;
      if (provider === 'openrouter') return OPENROUTER_MODEL_FALLBACKS;
      return OLLAMA_DEFAULT_MODELS;
    }`;
const REASONING_UI = `function updateReasoningUI() {
      $('#reasoningGroup').classList.add('hidden');
      $('#reasoningSelect').value = 'none';
    }`;
const PROVIDER_UI = `function updateProviderUI(selectedId) {
      const provider = $('#providerSelect').value;
      const isGemini = provider === 'gemini';
      const isOllama = provider === 'ollama';
      const isOpenRouter = provider === 'openrouter';
      $('#ollamaConnectionGroup').classList.toggle('hidden', !isOllama);
      $('#apiKeyLabel').textContent = isGemini ? 'Gemini API anahtarı' : isOllama ? 'Ollama Cloud API anahtarı' : 'OpenRouter API anahtarı';
      $('#apiKeyHint').textContent = isGemini ? 'Gemini API anahtarı bu cihazın yerel tarayıcı depolamasında saklanır.' : isOllama ? 'Ollama Cloud API anahtarı bu cihazın yerel tarayıcı depolamasında saklanır.' : 'OpenRouter API anahtarı bu cihazın yerel tarayıcı depolamasında saklanır.';
      $('#apiKey').placeholder = isGemini ? 'AIza…' : isOllama ? 'Ollama API key (sk-…)' : 'sk-or-v1-…';
      $('#apiKey').required = true;
      $('#modelCatalogHint').textContent = isGemini ? 'Yalnızca Gemini Flash ailesi gösterilir.' : isOllama ? 'Doğrulanmış Ollama Cloud modelleri.' : 'OpenRouter API üzerinden seçilebilir sohbet modelleri.';
      const models = isOllama ? OLLAMA_CLOUD_MODELS : isOpenRouter ? OPENROUTER_MODEL_FALLBACKS : GEMINI_MODEL_FALLBACKS;
      populateModelSelect(models, selectedId || models[0]?.id);
      updateReasoningUI();
    }`;
const CROSS_CHECK_UI = `function updateCrossCheckUI() {
      const provider = $('#providerSelect')?.value || state.config?.provider || 'gemini';
      const others = ['gemini', 'ollama', 'openrouter'].filter(p => p !== provider);
      const available = others.filter(p => loadStoredConfig(p));
      const status = $('#crossCheckStatus');
      if (!status) return;
      status.textContent = available.length ? 'Hazır: ' + available.map(providerLabel).join(' + ') + ' yapılandırılmış. Cross-check ek çağrı ve token kullanımı yaratır.' : 'İsteğe bağlı cross-check için ikinci bir API sağlayıcısı yapılandırın.';
      $('#crossCheckToggle').disabled = available.length === 0;
      if (!available.length) $('#crossCheckToggle').checked = false;
    }`;
const PROVIDER_HANDLER = `$('#providerSelect').addEventListener('change', () => {
      const provider = $('#providerSelect').value;
      const saved = loadStoredConfig(provider);
      $('#apiKey').value = saved?.apiKey || '';
      updateProviderUI(saved?.model);
      $('#fallbackToggle').checked = !!saved?.fallbackEnabled;
      refreshFallbackOptions(saved?.fallbackTarget || '');
      updateCrossCheckUI();
    });`;

const REFRESH_CATALOG = `async function refreshModelCatalog(apiKey, selectedId = $('#modelSelect').value) {
      const provider = $('#providerSelect').value;
      if (!apiKey) { toast('Kataloğu yenilemek için önce API anahtarını girin.', 'warning'); return; }
      const button = $('#refreshModelsBtn');
      const hint = $('#modelCatalogHint');
      button.disabled = true;
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Yükleniyor';
      try {
        let normalized = [];
        if (provider === 'ollama') {
          const response = await fetch(OLLAMA_CLOUD_API_BASE + '/tags', { headers: { 'Authorization': 'Bearer ' + apiKey } });
          if (!response.ok) throw await readError(response);
          const payload = await response.json();
          const allowed = new Set(OLLAMA_CLOUD_MODELS.map(model => model.id));
          normalized = (Array.isArray(payload?.models) ? payload.models : []).map(model => ({ id: String(model?.name || '').replace(/:cloud$/, ''), label: model?.name || '' })).filter(model => allowed.has(model.id));
          if (!normalized.length) normalized = OLLAMA_CLOUD_MODELS;
          populateModelSelect(normalized, selectedId);
          hint.textContent = normalized.length + ' doğrulanmış Ollama Cloud modeli.';
        } else if (provider === 'gemini') {
          const response = await fetch(GEMINI_API_BASE + '/models?pageSize=1000', { headers: { 'x-goog-api-key': apiKey } });
          if (!response.ok) throw await readError(response);
          const payload = await response.json();
          normalized = (Array.isArray(payload?.models) ? payload.models : []).filter(model => (model.supportedGenerationMethods || []).includes('generateContent')).map(model => ({ id: String(model.name || '').replace(/^models\\//, ''), label: model.displayName || '' })).filter(model => /^gemini-.*flash/i.test(model.id));
          if (!normalized.length) normalized = GEMINI_MODEL_FALLBACKS;
          populateModelSelect(normalized, selectedId);
          hint.textContent = normalized.length + ' erişilebilir Gemini Flash modeli.';
        } else {
          const response = await fetch('https://openrouter.ai/api/v1/models', { headers: { 'Authorization': 'Bearer ' + apiKey } });
          if (!response.ok) throw await readError(response);
          const payload = await response.json();
          normalized = (Array.isArray(payload?.data) ? payload.data : []).filter(model => {
            const input = model?.architecture?.input_modalities || [];
            const output = model?.architecture?.output_modalities || [];
            return (!output.length || output.includes('text')) && (!input.length || input.includes('text'));
          }).map(model => ({ id: String(model.id || ''), label: model.name || model.description || '' })).filter(model => model.id);
          normalized.sort((a, b) => a.id.localeCompare(b.id));
          if (!normalized.length) normalized = OPENROUTER_MODEL_FALLBACKS;
          populateModelSelect(normalized, selectedId);
          hint.textContent = normalized.length + ' OpenRouter sohbet modeli.';
        }
      } catch (error) {
        console.warn(provider + ' model catalogue could not be loaded:', error);
        const fallback = provider === 'ollama' ? OLLAMA_CLOUD_MODELS : provider === 'gemini' ? GEMINI_MODEL_FALLBACKS : OPENROUTER_MODEL_FALLBACKS;
        populateModelSelect(fallback, selectedId);
        hint.textContent = 'Canlı katalog yüklenemedi; doğrulanmış model listesi gösteriliyor.';
      } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fa-solid fa-rotate-right mr-1"></i>Kataloğu yenile';
        updateReasoningUI();
      }
    }`;

const OPENROUTER_BRANCH = `        if (config.provider === 'openrouter') {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST', signal,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + config.apiKey,
              'HTTP-Referer': location.href,
              'X-Title': 'PaperCritic AI'
            },
            body: JSON.stringify({
              model: config.model,
              messages: [{ role: 'system', content: system }, ...messages.map(m => ({ role: m.role, content: m.content }))],
              temperature: 0.2,
              stream: false,
              max_tokens: 32768
            })
          });
          if (!response.ok) throw await readError(response);
          const payload = await response.json();
          const text = payload?.choices?.[0]?.message?.content || '';
          if (!text) {
            const error = new Error('OpenRouter geçerli bir metin yanıtı döndürmedi.');
            error.retryable = false;
            throw error;
          }
          return text;
        }

`;

function patchIndex(html) {
  let text = html;
  text = text.replace(/<select id="providerSelect"[^>]*>[\s\S]*?<\/select>/, '<select id="providerSelect" class="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400">' + PROVIDER_OPTIONS + '</select>');
  text = text.replace(/const OLLAMA_DEFAULT_MODELS = \[[\s\S]*?\n    \];/, OLLAMA_MODELS);
  text = text.replace(/const OLLAMA_CLOUD_MODELS = \[[\s\S]*?\n    \];/, OLLAMA_CLOUD_MODELS);
  text = text.replace(/const GEMINI_MODEL_FALLBACKS = \[[\s\S]*?\n    \];/, GEMINI_MODELS);
  text = text.replace(/const NVIDIA_CHAT_MODEL_FALLBACKS = \[[\s\S]*?\n    \];/, 'const NVIDIA_CHAT_MODEL_FALLBACKS = [];\n    ' + OPENROUTER_MODELS);
  text = text.replace(/function providerLabel\(provider\) \{[\s\S]*?\n    \}/, PROVIDER_LABEL);
  text = text.replace(/function getFallbackModels\(provider\) \{[\s\S]*?\n    \}/, GET_FALLBACK_MODELS);
  text = text.replace(/function updateReasoningUI\(\) \{[\s\S]*?\n    \}/, REASONING_UI);
  text = text.replace(/function updateProviderUI\(selectedId\) \{[\s\S]*?\n    \}/, PROVIDER_UI);
  text = text.replace(/async function refreshModelCatalog\(apiKey, selectedId = \$\('#modelSelect'\)\.value\) \{[\s\S]*?\n    \}/, REFRESH_CATALOG);
  text = text.replace(/function refreshFallbackOptions\(selectedId = ''\) \{[\s\S]*?\n    \}/, FALLBACK_FUNCTION);
  text = text.replace(/function updateCrossCheckUI\(\) \{[\s\S]*?\n    \}/, CROSS_CHECK_UI);
  text = text.replace(/\$\('#providerSelect'\)\.addEventListener\('change', \(\) => \{[\s\S]*?\n    \}\);/, PROVIDER_HANDLER);
  text = text.replace(/if \(config\.provider === 'ollama'\) \{/, OPENROUTER_BRANCH + "        if (config.provider === 'ollama') {");
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
  headers.set('X-PaperCritic-Cloud-API', 'v4.1');
  return new Response(patched, { status: response.status, statusText: response.statusText, headers });
}

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));

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
  if (requestUrl.pathname === MANIFEST_PATH) event.respondWith(fetch(event.request));
});
