const CONFIG = {
      IVA_RATE: 0.16,
      LS_KEY: 'esquina_agricola_v9_single_image',
      IEPS: { none: 0, azul: 0.06, amarilla: 0.07, roja: 0.09 },
      DEFAULT_CATS: ["Agroquimicos", "Granel", "KG-LT", "FERTILIZANTES", "INOCUIDAD", "MAQUINARIA"]
    };

    const CATEGORY_INFO = {
      "Agroquimicos": { icon: " ", desc: "Productos para proteger y fortalecer tus cultivos.", imgs: ["https://elciudadanovoces.com/wp-content/uploads/2024/06/6-720x406.jpg"] },
      "Granel": { icon: " ", desc: "Insumos vendidos por Mililitro o Gramo.", imgs: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTHW2oljMgSWqHmnrNObMtJb6sh8nWUovf_Zg&s"] },
      "KG-LT": { icon: "⚖️", desc: "Presentaciones de venta minorista.", imgs: ["https://media.istockphoto.com/id/1283025593/es/foto/se-est%C3%A1-pesando-az%C3%BAcar-de-la-elaboraci%C3%B3n.jpg?s=170667a&w=0&k=20&c=bJiO4FyI8I-fF3dX7aoJEZaInIjNRThws_6ikzPQSuM="] },
      "FERTILIZANTES": { icon: " ", desc: "Nutrición para suelo y planta.", imgs: ["https://eos.com/wp-content/uploads/2023/11/components-of-different-types-of-fertilizers.jpg.webp"] },
      "INOCUIDAD": { icon: " ", desc: "Seguridad alimentaria.", imgs: ["https://www.senasa.gob.pe/senasacontigo/wp-content/uploads/2019/11/inocuidad2.jpg"] },
      "MAQUINARIA": { icon: " ", desc: "Equipos y herramientas.", imgs: ["https://www.defrentealcampo.com.ar/wp-content/uploads/2018/09/drone-pulverizador.jpg"] }
    };

    let appState = {
      categories: [...CONFIG.DEFAULT_CATS],
      margins: {
        Agroquimicos: [{max: 400, m: 27}, {max: Infinity, m: 17}],
        Granel: [{max: Infinity, m: 40}],
        "KG-LT": [{max: Infinity, m: 20}],
        FERTILIZANTES: [{max: Infinity, m: 15}],
        INOCUIDAD: [{max: Infinity, m: 20}],
        MAQUINARIA: [{max: Infinity, m: 10}]
      },
      volumeConfig: [
        { label: "PRECIO 1", qty: 1, discount: 0 },
        { label: "PRECIO 2", qty: 600, discount: 5 },
        { label: "PRECIO 3", qty: 700, discount: 8 },
        { label: "PRECIO 4", qty: 800, discount: 12 }
      ],
      categoryMetadata: {},
      currentPVP: 0,
      currentTotalCost: 0
    };

    let videoList = [];

    const DEFAULT_VOLUME_CONFIG = [
      { label: "PRECIO 1", qty: 1, discount: 0 },
      { label: "PRECIO 2", qty: 600, discount: 5 },
      { label: "PRECIO 3", qty: 700, discount: 8 },
      { label: "PRECIO 4", qty: 800, discount: 12 }
    ];

    function encodeStateForStorage(state) {
      return JSON.stringify(state, (_key, value) => value === Infinity ? '__INFINITY__' : value);
    }

    function decodeStateFromStorage(raw) {
      return JSON.parse(raw, (_key, value) => value === '__INFINITY__' ? Infinity : value);
    }

    function normalizeAppState(state = {}) {
      const normalized = {
        ...state,
        categories: Array.isArray(state.categories) && state.categories.length > 0 ? state.categories : [...CONFIG.DEFAULT_CATS],
        margins: state.margins && typeof state.margins === 'object' ? state.margins : {},
        volumeConfig: Array.isArray(state.volumeConfig) && state.volumeConfig.length > 0 ? state.volumeConfig : DEFAULT_VOLUME_CONFIG.map(tier => ({ ...tier })),
        categoryMetadata: state.categoryMetadata && typeof state.categoryMetadata === 'object' ? state.categoryMetadata : {},
        currentPVP: Number(state.currentPVP) || 0,
        currentTotalCost: Number(state.currentTotalCost) || 0
      };

      normalized.categories.forEach(cat => {
        if (!Array.isArray(normalized.margins[cat]) || normalized.margins[cat].length === 0) {
          normalized.margins[cat] = [{ max: Infinity, m: 20 }];
        }
      });

      Object.keys(normalized.margins).forEach(cat => {
        normalized.margins[cat] = normalized.margins[cat].map(rule => ({
          max: rule.max === null || rule.max === undefined || rule.max === '' ? Infinity : Number(rule.max),
          m: Number(rule.m) || 0
        }));
      });

      Object.keys(normalized.categoryMetadata).forEach(cat => {
        if (!Array.isArray(normalized.categoryMetadata[cat].imgs)) {
          normalized.categoryMetadata[cat].imgs = [''];
        } else {
          normalized.categoryMetadata[cat].imgs = [normalized.categoryMetadata[cat].imgs[0] || ''];
        }
        const pos = normalized.categoryMetadata[cat].imgPosition || {};
        normalized.categoryMetadata[cat].imgPosition = {
          x: Number.isFinite(Number(pos.x)) ? Number(pos.x) : 50,
          y: Number.isFinite(Number(pos.y)) ? Number(pos.y) : 50
        };
      });

      normalized.volumeConfig = normalized.volumeConfig.map((tier, index) => ({
        label: String(tier.label || DEFAULT_VOLUME_CONFIG[index]?.label || `PRECIO ${index + 1}`),
        qty: Number(tier.qty) || 0,
        discount: Number(tier.discount) || 0
      }));

      return normalized;
    }

    function getUserConfigDoc() {
      const user = auth.currentUser;
      if (!user) {
        alert('Inicia sesión antes de usar la nube.');
        return null;
      }
      return db.collection('configs').doc(user.uid);
    }

    function applyVisualTheme(theme) {
      const isXp = theme === 'xp';
      const isBrand = theme === 'brand';
      const isHarvest = theme === 'harvest';
      document.body.classList.toggle('theme-xp', isXp);
      document.body.classList.toggle('theme-brand', isBrand);
      document.body.classList.toggle('theme-harvest', isHarvest);

      const btn = document.getElementById('themeToggleBtn');
      if (btn) {
        btn.innerHTML = isXp
          ? '<i data-lucide="sparkles" class="w-4 h-4"></i>'
          : '<i data-lucide="monitor" class="w-4 h-4"></i>';
        btn.title = isXp ? 'Volver al modo actual' : 'Cambiar a modo XP';
      }

      const brandBtn = document.getElementById('brandThemeBtn');
      if (brandBtn) {
        brandBtn.className = isBrand
          ? 'bg-[#F4A261] text-white border border-[#F4A261] w-9 h-9 rounded-full text-[10px] font-black uppercase hover:bg-[#F4A261] transition inline-flex items-center justify-center shadow-sm'
          : 'bg-orange-50 text-orange-700 border border-orange-100 w-9 h-9 rounded-full text-[10px] font-black uppercase hover:bg-orange-100 transition inline-flex items-center justify-center shadow-sm';
        brandBtn.title = isBrand ? 'Volver al estilo anterior' : 'Activar identidad de color';
      }

      const harvestBtn = document.getElementById('harvestThemeBtn');
      if (harvestBtn) {
        harvestBtn.className = isHarvest
          ? 'bg-[#1A3B2A] text-white border border-[#1A3B2A] w-9 h-9 rounded-full text-[10px] font-black uppercase hover:bg-[#3F6B54] transition inline-flex items-center justify-center shadow-sm'
          : 'bg-[#F8FAF8] text-[#1A3B2A] border border-[#E5E7EB] w-9 h-9 rounded-full text-[10px] font-black uppercase hover:bg-[#84A98C]/20 transition inline-flex items-center justify-center shadow-sm';
        harvestBtn.title = isHarvest ? 'Volver al estilo anterior' : 'Activar paleta agro premium';
      }

      if (window.lucide) lucide.createIcons();
    }

    function toggleVisualTheme() {
      const nextTheme = document.body.classList.contains('theme-xp') ? 'modern' : 'xp';
      localStorage.setItem('esquina_visual_theme', nextTheme);
      applyVisualTheme(nextTheme);
      showToast(nextTheme === 'xp' ? 'Tema Windows XP activo' : 'Tema actual activo');
    }

    function toggleBrandTheme() {
      const nextTheme = document.body.classList.contains('theme-brand') ? 'modern' : 'brand';
      localStorage.setItem('esquina_visual_theme', nextTheme);
      applyVisualTheme(nextTheme);
      showToast(nextTheme === 'brand' ? 'Identidad de color activa' : 'Tema actual activo');
    }

    function toggleHarvestTheme() {
      const nextTheme = document.body.classList.contains('theme-harvest') ? 'modern' : 'harvest';
      localStorage.setItem('esquina_visual_theme', nextTheme);
      applyVisualTheme(nextTheme);
      showToast(nextTheme === 'harvest' ? 'Paleta agro premium activa' : 'Tema actual activo');
    }

    function showWelcomeQuote() {
      const overlay = document.getElementById('welcomeOverlay');
      const quoteEl = document.getElementById('welcomeQuote');
      if (!overlay || !quoteEl) return;

      const quotes = [
        'La utilidad no se improvisa, se calcula.',
        'Precio claro, margen sano, negocio fuerte.',
        'Cada peso bien calculado protege tu crecimiento.',
        'Vender bien empieza por conocer tus números.',
        'El margen es la salud silenciosa de tu negocio.',
        'No vendas barato: vende inteligente.',
        'Un buen precio cuida al cliente y también al negocio.',
        'La rentabilidad se construye decisión por decisión.'
      ];

      quoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];

      setTimeout(() => {
        overlay.classList.add('welcome-hidden');
        setTimeout(() => overlay.remove(), 650);
      }, 2200);
    }

    function extractYouTubeId(url) {
      if (!url) return null;
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/
      ];
      for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
      }
      return null;
    }

    function addVideo() {
      const urlInput = document.getElementById('videoUrlInput');
      const titleInput = document.getElementById('videoTitleInput');
      const url = (urlInput.value || '').trim();
      const title = (titleInput.value || '').trim();

      const id = extractYouTubeId(url);
      if (!id) {
        alert('URL de YouTube no válida.\n\nEjemplos válidos:\n• https://www.youtube.com/watch?v=XXXXXXXXXXX\n• https://youtu.be/XXXXXXXXXXX\n• https://youtube.com/shorts/XXXXXXXXXXX');
        return;
      }

      if (videoList.find(v => v.id === id)) {
        alert('Este video ya está agregado.');
        return;
      }

      videoList.push({ id, title: title || 'Video sin título', url });
      urlInput.value = '';
      titleInput.value = '';
      saveVideosLocal();
      renderVideos();
    }

    function removeVideo(index) {
      if (confirm('¿Eliminar este video de la lista?')) {
        videoList.splice(index, 1);
        saveVideosLocal();
        renderVideos();
      }
    }

    function renderVideos() {
      const grid = document.getElementById('videoGrid');
      const empty = document.getElementById('videosEmpty');

      if (!grid || !empty) {
        console.error('No se encontraron #videoGrid o #videosEmpty');
        return;
      }

      grid.innerHTML = '';

      if (!Array.isArray(videoList)) {
        videoList = [];
      }

      if (videoList.length === 0) {
        empty.style.display = 'flex';
        if (window.lucide) lucide.createIcons();
        return;
      }

      empty.style.display = 'none';

      let html = '';

      videoList.forEach((v, i) => {
        const safeTitle = String(v.title || 'Video sin título')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

        const watchUrl = `https://www.youtube.com/watch?v=${v.id}`;
        const thumbUrl = `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`;

        html += `
          <div class="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <a
              href="${watchUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="block relative group"
              title="Abrir video en YouTube"
            >
              <img
                src="${thumbUrl}"
                alt="${safeTitle}"
                class="w-full aspect-video object-cover bg-gray-200"
                loading="lazy"
              >
              <div class="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <div class="bg-white/95 text-red-600 rounded-full p-3 shadow-lg">
                  <i data-lucide="play" class="w-6 h-6 fill-current"></i>
                </div>
              </div>
            </a>

            <div class="p-3 bg-white space-y-2">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <i data-lucide="youtube" class="w-4 h-4 text-red-500 shrink-0"></i>
                  <span class="text-xs font-black text-gray-700 truncate">${safeTitle}</span>
                </div>
                <button
                  type="button"
                  onclick="removeVideo(${i})"
                  class="text-red-200 hover:text-red-500 transition-colors shrink-0"
                  title="Eliminar video"
                >
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>

              <a
                href="${watchUrl}"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-red-600 hover:text-red-700"
              >
                <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                Abrir en YouTube
              </a>
            </div>
          </div>`;
      });

      grid.innerHTML = html;

      if (window.lucide) lucide.createIcons();
    }

    function toggleVideoManager() {
      const content = document.getElementById('video-manager-content');
      const btn = document.getElementById('video-toggle-btn');
      if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        btn.innerHTML = '<i data-lucide="chevron-up" class="w-5 h-5"></i>';
        renderVideos();
      } else {
        content.classList.add('hidden');
        btn.innerHTML = '<i data-lucide="chevron-down" class="w-5 h-5"></i>';
      }
      lucide.createIcons();
    }

    function saveVideosLocal() {
      try {
        localStorage.setItem('esquina_videos_v1', JSON.stringify(videoList));
      } catch (e) {
        console.error('Error guardando videos en localStorage:', e);
      }
    }

    function loadVideosLocal() {
      try {
        const saved = localStorage.getItem('esquina_videos_v1');
        if (!saved) {
          videoList = [];
          return;
        }
        const parsed = JSON.parse(saved);
        videoList = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Error cargando videos de localStorage:', e);
        videoList = [];
      }
    }

    function setBulkAssistantStatus(message, type = 'success') {
      const el = document.getElementById('bulkAssistantStatus');
      if (!el) return;

      const styles = {
        success: 'bg-gray-100 text-gray-700 border border-gray-200',
        error: 'bg-red-50 text-red-600 border border-red-100',
        info: 'bg-orange-50 text-orange-700 border border-orange-100'
      };

      el.className = `rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest ${styles[type] || styles.info}`;
      el.textContent = message;
      el.classList.remove('hidden');
    }

    function showToast(message, type = 'success') {
      const existing = document.getElementById('appToast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.id = 'appToast';
      toast.className = `fixed left-1/2 top-5 z-[200] -translate-x-1/2 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest shadow-xl border ${type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-100 text-gray-700 border-gray-200'}`;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2200);
    }

    async function copyTextToClipboard(text, successMessage) {
      try {
        await navigator.clipboard.writeText(text);
        showToast(successMessage);
      } catch (e) {
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        temp.remove();
        showToast(successMessage);
      }
    }

    function copyFinalPrice() {
      const price = document.getElementById('resFinalPrice')?.textContent?.trim() || '0.00';
      copyTextToClipboard(`$${price} MXN`, 'Precio copiado');
    }

    function copyScales() {
      const lines = appState.volumeConfig.map(tier => {
        const unit = appState.currentPVP * (1 - tier.discount / 100);
        const total = unit * tier.qty;
        return `${tier.label}: desde ${tier.qty} pz | unitario ${fmt$(unit)} | total ${fmt$(total)}`;
      });

      copyTextToClipboard(lines.join('\n'), 'Escalas copiadas');
    }

    function resetCurrentCalculation() {
      const baseCost = document.getElementById('calcBaseCost');
      if (baseCost) {
        baseCost.value = '0.00';
        baseCost.dataset.lastValue = '0.00';
      }

      resetBaseCostAddons();
      runCalculations();
      showToast('Cálculo reiniciado');
    }

    function setCollapsible(contentId, buttonId, isOpen) {
      const content = document.getElementById(contentId);
      const btn = document.getElementById(buttonId);
      if (!content || !btn) return;

      content.classList.toggle('hidden', !isOpen);
      btn.innerHTML = `<i data-lucide="chevron-${isOpen ? 'up' : 'down'}" class="w-5 h-5"></i>`;
    }

    let modulesOpen = false;

    function toggleAllModules() {
      modulesOpen = !modulesOpen;
      setCollapsible('scale-section-content', 'scale-toggle-btn', modulesOpen);
      setCollapsible('bulk-assistant-content', 'bulk-toggle-btn', modulesOpen);
      setCollapsible('volume-manager-content', 'vol-toggle-btn', modulesOpen);

      if (modulesOpen) {
        const basePriceInput = document.getElementById('asstBasePrice');
        if (basePriceInput && appState.currentPVP > 0) basePriceInput.value = appState.currentPVP.toFixed(2);
      }

      lucide.createIcons();
    }

    function toggleBulkAssistant(event) {
      if (event) event.stopPropagation();

      const content = document.getElementById('bulk-assistant-content');
      const btn = document.getElementById('bulk-toggle-btn');
      if (!content || !btn) return;

      if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        btn.innerHTML = '<i data-lucide="chevron-up" class="w-5 h-5"></i>';
        const priceText = document.getElementById('resFinalPrice')?.textContent || '';
        if(priceText && priceText !== "0.00") {
          const cleanPrice = parseFloat(priceText.replace(/,/g, ''));
          const basePriceInput = document.getElementById('asstBasePrice');
          if (basePriceInput && Number.isFinite(cleanPrice)) basePriceInput.value = cleanPrice.toFixed(2);
        }
      } else {
        content.classList.add('hidden');
        btn.innerHTML = '<i data-lucide="chevron-down" class="w-5 h-5"></i>';
      }
      lucide.createIcons();
    }

    function suggestBulkPrices() {
      const pUnit = parseFloat(document.getElementById('asstBasePrice').value) || 0;
      const pFull = parseFloat(document.getElementById('asstFullPrice').value) || 0;
      const qFull = parseFloat(document.getElementById('asstFullQty').value) || 0;
      if(pUnit <= 0 || pFull <= 0 || qFull <= 0) {
        setBulkAssistantStatus('Completa precio unitario, envase completo y precio completo.', 'error');
        return;
      }
      const unitFull = pFull / qFull;
      [2, 3, 4].forEach(i => {
        const q = parseFloat(document.getElementById(`asstQty${i}`).value) || 0;
        if(q > 0) {
          let totalQ = 0;
          if (q >= qFull) { totalQ = pFull; } 
          else {
            let unitQ = pUnit - (pUnit - unitFull) * (q / qFull);
            totalQ = q * unitQ;
            if(totalQ >= pFull) totalQ = pFull - 15;
          }
          document.getElementById(`asstTotal${i}`).value = Math.round(totalQ);
        }
      });
      setBulkAssistantStatus('Sugerencias calculadas. Revisa los montos en verde.', 'success');
    }

    function applyBulkStrategy() {
      const basePrice = parseFloat(document.getElementById('asstBasePrice').value) || 1;
      const q2 = parseFloat(document.getElementById('asstQty2').value) || 600;
      const t2 = parseFloat(document.getElementById('asstTotal2').value) || 0;
      let d2 = 0;
      if(basePrice * q2 > 0 && t2 > 0) d2 = (1 - (t2 / (basePrice * q2))) * 100;

      const q3 = parseFloat(document.getElementById('asstQty3').value) || 700;
      const t3 = parseFloat(document.getElementById('asstTotal3').value) || 0;
      let d3 = 0;
      if(basePrice * q3 > 0 && t3 > 0) d3 = (1 - (t3 / (basePrice * q3))) * 100;

      const q4 = parseFloat(document.getElementById('asstQty4').value) || 800;
      const t4 = parseFloat(document.getElementById('asstTotal4').value) || 0;
      let d4 = 0;
      if(basePrice * q4 > 0 && t4 > 0) d4 = (1 - (t4 / (basePrice * q4))) * 100;

      if(t2 === 0 || t3 === 0 || t4 === 0) {
        setBulkAssistantStatus('Primero calcula sugerencias o llena los tres montos.', 'error');
        return;
      }

      if(appState.volumeConfig[1]) { appState.volumeConfig[1].qty = q2; appState.volumeConfig[1].discount = Math.max(0, parseFloat(d2.toFixed(2))); }
      if(appState.volumeConfig[2]) { appState.volumeConfig[2].qty = q3; appState.volumeConfig[2].discount = Math.max(0, parseFloat(d3.toFixed(2))); }
      if(appState.volumeConfig[3]) { appState.volumeConfig[3].qty = q4; appState.volumeConfig[3].discount = Math.max(0, parseFloat(d4.toFixed(2))); }

      saveLocal();
      runCalculations();
      closeBulkAssistant();
      showToast('Curva aplicada a escalas');
    }

    function unlockCalculatorControls() {
      ['calcIeps', 'calcBaseCost', 'calcCategorySearch', 'calcManualToggle', 'calcExtraToggle', 'calcIvaToggle'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.disabled = false;
        el.style.pointerEvents = '';
      });
    }

    function closeBulkAssistant() {
      const content = document.getElementById('bulk-assistant-content');
      const btn = document.getElementById('bulk-toggle-btn');

      if (content) content.classList.add('hidden');
      if (btn) btn.innerHTML = '<i data-lucide="chevron-down" class="w-5 h-5"></i>';
      unlockCalculatorControls();
      if (window.lucide) lucide.createIcons();
    }

    function openFreightModal() { document.getElementById('freightModal').classList.remove('hidden'); document.getElementById('modalFreightTotal').focus(); }
    function closeFreightModal() { document.getElementById('freightModal').classList.add('hidden'); document.getElementById('modalFreightTotal').value = ''; document.getElementById('modalFreightPieces').value = ''; }
    
    function applyFreight() {
      const total = parseFloat(document.getElementById('modalFreightTotal').value) || 0;
      const pieces = parseFloat(document.getElementById('modalFreightPieces').value) || 1;
      const costPerPiece = total / pieces;
      document.getElementById('calcExtraCost').value = costPerPiece.toFixed(2);
      document.getElementById('calcExtraToggle').checked = true;
      document.getElementById('extraCostWrap').classList.remove('hidden');
      closeFreightModal();
      runCalculations();
    }

    function toggleManualMargin() { document.getElementById('manualMarginWrap').classList.toggle('hidden'); runCalculations(); }
    function toggleExtraCost() { document.getElementById('extraCostWrap').classList.toggle('hidden'); runCalculations(); }

    function getIepsOptions() {
      return [
        { value: 'none', label: 'Sin IEPS (0%)', dot: 'bg-gray-300', text: 'text-gray-700', bg: '#ffffff', border: '#d1d5db', color: '#374151', shadow: 'none' },
        { value: 'azul', label: 'Etiqueta Azul (6%)', dot: 'bg-blue-500', text: 'text-blue-700', bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8', shadow: '0 0 0 3px rgba(59, 130, 246, 0.10)' },
        { value: 'amarilla', label: 'Etiqueta Amarilla (7%)', dot: 'bg-amber-400', text: 'text-amber-700', bg: '#fffbeb', border: '#fcd34d', color: '#b45309', shadow: '0 0 0 3px rgba(245, 158, 11, 0.10)' },
        { value: 'roja', label: 'Etiqueta Roja (9%)', dot: 'bg-red-500', text: 'text-red-700', bg: '#fef2f2', border: '#fca5a5', color: '#b91c1c', shadow: '0 0 0 3px rgba(239, 68, 68, 0.10)' }
      ];
    }

    function ensureIepsSuggestionsPortal() {
      const suggestions = document.getElementById('calcIepsSuggestions');
      if (!suggestions || suggestions.parentElement === document.body) return suggestions;
      document.body.appendChild(suggestions);
      return suggestions;
    }

    function positionIepsSuggestions() {
      const display = document.getElementById('calcIepsDisplay');
      const suggestions = ensureIepsSuggestionsPortal();
      if (!display || !suggestions) return;

      const rect = display.getBoundingClientRect();
      suggestions.style.left = `${rect.left}px`;
      suggestions.style.top = `${rect.bottom + 8}px`;
      suggestions.style.width = `${rect.width}px`;
      suggestions.style.right = 'auto';
      suggestions.style.marginTop = '0';
    }

    function hideIepsDropdown() {
      const suggestions = document.getElementById('calcIepsSuggestions');
      if (!suggestions) return;
      suggestions.classList.add('hidden');
      suggestions.innerHTML = '';
    }

    function renderIepsSuggestions() {
      const suggestions = ensureIepsSuggestionsPortal();
      const currentValue = document.getElementById('calcIeps')?.value || 'none';
      if (!suggestions) return;

      suggestions.innerHTML = getIepsOptions().map(option => {
        const activeClass = option.value === currentValue ? 'shadow-sm' : 'hover:bg-gray-50';
        return `
          <button
            type="button"
            onmousedown="selectIepsOption('${option.value}')"
            class="w-full text-left px-4 py-3 text-sm font-semibold transition-colors border-b border-gray-50 last:border-b-0 flex items-center justify-between gap-3 ${activeClass}"
            style="background-color: ${option.bg}; border-left: 4px solid ${option.border};"
          >
            <span class="flex items-center gap-2 min-w-0">
              <span class="w-2.5 h-2.5 rounded-full ${option.dot} shrink-0"></span>
              <span class="truncate ${option.text}">${option.label}</span>
            </span>
            ${option.value === currentValue ? '<i data-lucide="check" class="w-4 h-4 text-orange-500"></i>' : ''}
          </button>
        `;
      }).join('');

      positionIepsSuggestions();
      suggestions.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }

    function toggleIepsDropdown(event) {
      if (event) event.stopPropagation();
      const suggestions = ensureIepsSuggestionsPortal();
      if (!suggestions) return;

      if (suggestions.classList.contains('hidden')) {
        renderIepsSuggestions();
      } else {
        hideIepsDropdown();
      }
    }

    function selectIepsOption(value) {
      const ieps = document.getElementById('calcIeps');
      if (!ieps) return;
      ieps.value = value;
      hideIepsDropdown();
      handleIepsChange();
    }

    function updateIepsSelectTheme() {
      const ieps = document.getElementById('calcIeps');
      if (!ieps) return;

      const current = getIepsOptions().find(option => option.value === ieps.value) || getIepsOptions()[0];
      const display = document.getElementById('calcIepsDisplay');
      const label = document.getElementById('calcIepsLabel');
      const dot = document.getElementById('calcIepsDot');

      if (label) label.textContent = current.label;
      if (dot) dot.className = `w-2.5 h-2.5 rounded-full ${current.dot} shrink-0`;
      if (display) {
        display.style.setProperty('background-color', current.bg, 'important');
        display.style.setProperty('border-color', current.border, 'important');
        display.style.setProperty('color', current.color, 'important');
        display.style.setProperty('box-shadow', current.shadow, 'important');
      }
    }

    function handleIepsChange() {
      updateIepsSelectTheme();
      runCalculations();
    }

    function resetBaseCostAddons() {
      const ieps = document.getElementById('calcIeps');
      const manualToggle = document.getElementById('calcManualToggle');
      const manualMargin = document.getElementById('calcManualMargin');
      const manualWrap = document.getElementById('manualMarginWrap');
      const ivaToggle = document.getElementById('calcIvaToggle');
      const extraToggle = document.getElementById('calcExtraToggle');
      const extraCost = document.getElementById('calcExtraCost');
      const extraWrap = document.getElementById('extraCostWrap');

      if (ieps) {
        ieps.value = 'none';
        updateIepsSelectTheme();
      }

      if (manualToggle) manualToggle.checked = false;
      if (manualMargin) manualMargin.value = 20;
      if (manualWrap) manualWrap.classList.add('hidden');

      if (ivaToggle) ivaToggle.checked = false;

      if (extraToggle) extraToggle.checked = false;
      if (extraCost) extraCost.value = '0.00';
      if (extraWrap) extraWrap.classList.add('hidden');
    }

    function handleBaseCostInput() {
      const input = document.getElementById('calcBaseCost');
      if (!input) return;

      const currentValue = input.value;
      const previousValue = input.dataset.lastValue ?? '';

      if (currentValue !== previousValue) {
        resetBaseCostAddons();
        input.dataset.lastValue = currentValue;
      }

      runCalculations();
    }

    function runCalculations() {
      const categorySelect = document.getElementById('calcCategory');
      if (!categorySelect) return;

      let cat = categorySelect.value;
      if (!cat && appState.categories.length > 0) {
        cat = appState.categories[0];
        categorySelect.value = cat;
      }
      if (!cat) return;

      const baseCost = parseFloat(document.getElementById('calcBaseCost').value) || 0;
      const isExtra = document.getElementById('calcExtraToggle').checked;
      const extraCost = isExtra ? (parseFloat(document.getElementById('calcExtraCost').value) || 0) : 0;
      const iepsKey = document.getElementById('calcIeps').value;
      const isManual = document.getElementById('calcManualToggle').checked;
      const includeIva = document.getElementById('calcIvaToggle').checked;

      const iepsAmt = baseCost * (CONFIG.IEPS[iepsKey] || 0);
      const ivaAmt = includeIva ? (baseCost + extraCost + iepsAmt) * CONFIG.IVA_RATE : 0;
      const totalCost = baseCost + extraCost + iepsAmt + ivaAmt;

      let m = 0;
      if(isManual) {
        m = parseFloat(document.getElementById('calcManualMargin').value) || 0;
      } else {
        const rules = appState.margins[cat] || [{max: Infinity, m: 20}];
        m = (rules.find(r => totalCost < r.max) || rules[rules.length-1]).m;
      }

      const ratio = Math.min(m/100, 0.99);
      const finalPrice = totalCost / (1 - ratio);

      appState.currentPVP = finalPrice;
      appState.currentTotalCost = totalCost;

      updateMainUI({ finalPrice, profit: finalPrice - totalCost, marginPct: m, totalCost, baseCost, extraCost, iepsAmt, ivaAmt, includeIva });
      updateScales(totalCost, finalPrice);
      renderVolumeConfig(totalCost, finalPrice);

      const asstBasePriceInput = document.getElementById('asstBasePrice');
      if(asstBasePriceInput && finalPrice > 0) asstBasePriceInput.value = finalPrice.toFixed(2);

      unlockCalculatorControls();
    }

    function updateMainUI(d) {
      const cat = document.getElementById('calcCategory').value;
      let customMeta = null;
      if (appState.categoryMetadata && appState.categoryMetadata[cat]) customMeta = appState.categoryMetadata[cat];

      const info = customMeta || CATEGORY_INFO[cat] || { icon: " ", desc: "Categoría general", imgs: [""] };
      const imgPosition = info.imgPosition || { x: 50, y: 50 };
      const fallbackImg = "https://via.placeholder.com/270x270/f9fafb/9ca3af?text=Sin+Imagen";
      const img1 = (info.imgs && info.imgs[0] && info.imgs[0].trim() !== "") ? info.imgs[0] : fallbackImg;

      document.getElementById('resCatTitle').textContent = cat;
      document.getElementById('resCatIcon').textContent = info.icon || " ";
      document.getElementById('resCatDesc').textContent = info.desc || "Categoría general";
      document.getElementById('resImg1').src = img1;
      document.getElementById('resImg1').style.objectPosition = `${Number(imgPosition.x) || 50}% ${Number(imgPosition.y) || 50}%`;

      const posX = document.getElementById('imagePositionX');
      const posY = document.getElementById('imagePositionY');
      if (posX) posX.value = Number(imgPosition.x) || 50;
      if (posY) posY.value = Number(imgPosition.y) || 50;

      document.getElementById('resFinalPrice').textContent = fmt$(d.finalPrice).replace('$', '');
      document.getElementById('resIvaNote').textContent = d.includeIva ? "(IVA incluido en costo)" : "(Sin IVA en costo)";

      const p = d.finalPrice;
      let charm1 = (Math.floor(p / 10) * 10) - 1; if(charm1 <= 0) charm1 = 9;
      let charm2 = (Math.floor(p / 10) * 10) + 5;
      let charm3 = (Math.ceil(p / 10) * 10) - 1; if(charm3 === charm1) charm3 += 10;

      document.getElementById('resPsychPrices').innerHTML = `
        <div class="bg-white rounded-lg p-2 text-center border border-orange-100 shadow-sm">
          <span class="block text-[8px] text-gray-400 font-black uppercase mb-1">Agresivo</span>
          <span class="font-black text-orange-700 text-sm">${fmt$(charm1).replace('$','')}</span>
        </div>
        <div class="bg-white rounded-lg p-2 text-center border border-orange-100 shadow-sm">
          <span class="block text-[8px] text-gray-400 font-black uppercase mb-1">Comercial</span>
          <span class="font-black text-orange-700 text-sm">${fmt$(charm2).replace('$','')}</span>
        </div>
        <div class="bg-white rounded-lg p-2 text-center border border-orange-100 shadow-sm">
          <span class="block text-[8px] text-gray-400 font-black uppercase mb-1">Margen +</span>
          <span class="font-black text-orange-700 text-sm">${fmt$(charm3).replace('$','')}</span>
        </div>`;

      document.getElementById('resSubtotal').textContent = fmt$(d.baseCost);

      const extraRow = document.getElementById('resExtraRow');
      if(d.extraCost > 0) {
        extraRow.classList.remove('hidden');
        document.getElementById('resExtraCost').textContent = fmt$(d.extraCost);
      } else {
        extraRow.classList.add('hidden');
      }

      document.getElementById('resIvaCost').textContent = fmt$(d.ivaAmt);
      document.getElementById('resDiscount').textContent = '-' + fmt$(0).replace('$', '');
      document.getElementById('resTotalCost').textContent = fmt$(d.totalCost);
      document.getElementById('resProfit').textContent = fmt$(d.profit);
      document.getElementById('resMarginPct').textContent = d.marginPct.toFixed(2) + '%';

      lucide.createIcons();
    }

    function getDiscountRows(cost = appState.currentTotalCost, basePVP = appState.currentPVP) {
      const currentMargin = basePVP > 0 ? ((basePVP - cost) / basePVP) * 100 : 0;

      return [5, 4, 3, 2, 1].map(discount => {
        const targetMargin = Math.max(currentMargin - discount, 0);
        const discountedPrice = targetMargin >= 99 ? basePVP : cost / (1 - (targetMargin / 100));
        const discountAmount = Math.max(basePVP - discountedPrice, 0);
        const profit = discountedPrice - cost;
        const margin = discountedPrice > 0 ? ((profit / discountedPrice) * 100) : 0;

        return { discount, targetMargin, discountAmount, discountedPrice, profit, margin };
      });
    }

    function updateScales(cost, basePVP) {
      const container = document.getElementById('scaleTableBody');
      container.innerHTML = '';
      appState.volumeConfig.forEach(tier => {
        let p = basePVP * (1 - tier.discount / 100);
        let margin = p > 0 ? (((p - cost) / p) * 100).toFixed(1) : 0;
        let totalPrice = p * tier.qty;
        let totalProfit = (p - cost) * tier.qty;
        const safeLabel = escapeHtml(tier.label);

        container.innerHTML += `
          <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors text-center align-middle">
            <td class="py-4 px-2 text-xs text-gray-700 font-black uppercase tracking-wider">${safeLabel}</td>
            <td class="py-4 px-2 text-gray-500 font-bold">≥ ${tier.qty} pz</td>
            <td class="py-4 px-2 font-black text-gray-800 text-base">${fmt$(p)}</td>
            <td class="py-4 px-2 font-black text-orange-600">${fmt$(totalPrice)}</td>
            <td class="py-4 px-2 font-black text-gray-700">${fmt$(totalProfit)}</td>
            <td class="py-4 px-2 text-gray-400 font-bold">${margin}%</td>
          </tr>`;
      });
    }

    function normalizeText(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();
    }

    function getFilteredCategories(searchTerm = '') {
      const normalizedTerm = normalizeText(searchTerm);
      if (!normalizedTerm) return [...appState.categories];
      return appState.categories.filter(cat => normalizeText(cat).includes(normalizedTerm));
    }

    function escapeHtmlAttr(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    const CATEGORY_IMAGE_PLACEHOLDER = 'https://via.placeholder.com/270x270/f9fafb/9ca3af?text=Sin+Imagen';
    let categoryImageDrafts = {};
    let categoryImageValidationTimers = {};
    let categoryImageAutosaveTimers = {};
    let expandedCategoryCard = null;
    let expandedMarginCard = null;

    function slugifyDomId(value) {
      return String(value || 'cat')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'cat';
    }

    function getCategoryImageFieldIds(cat) {
      const slug = slugifyDomId(cat);
      return {
        input: `cat-img-input-${slug}`,
        preview: `cat-img-preview-${slug}`,
        status: `cat-img-status-${slug}`,
        save: `cat-img-save-${slug}`
      };
    }

    function getSavedCategoryImage(cat) {
      return String(
        appState.categoryMetadata?.[cat]?.imgs?.[0] ??
        CATEGORY_INFO?.[cat]?.imgs?.[0] ??
        ''
      ).trim();
    }

    function ensureCategoryImageDraft(cat) {
      const savedUrl = getSavedCategoryImage(cat);

      if (!categoryImageDrafts[cat]) {
        categoryImageDrafts[cat] = {
          url: savedUrl,
          savedUrl,
          lastValidation: null,
          validating: false
        };
      }

      return categoryImageDrafts[cat];
    }

    function getCategoryImageStatusClasses(type) {
      const map = {
        success: 'bg-gray-100 text-gray-700 border border-gray-200',
        error: 'bg-red-50 text-red-700 border border-red-200',
        warning: 'bg-amber-50 text-amber-700 border border-amber-200',
        neutral: 'bg-gray-50 text-gray-600 border border-gray-200',
        loading: 'bg-orange-50 text-orange-700 border border-orange-200'
      };
      return map[type] || map.neutral;
    }

    function setCategoryImageStatus(cat, text, type = 'neutral') {
      const ids = getCategoryImageFieldIds(cat);
      const statusEl = document.getElementById(ids.status);
      if (!statusEl) return;

      statusEl.className = `inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getCategoryImageStatusClasses(type)}`;
      statusEl.textContent = text;
    }

    function setCategoryImagePreview(cat, url) {
      const ids = getCategoryImageFieldIds(cat);
      const previewEl = document.getElementById(ids.preview);
      if (!previewEl) return;

      previewEl.src = (url && String(url).trim() !== '') ? String(url).trim() : CATEGORY_IMAGE_PLACEHOLDER;
    }

    function setCategoryImageSaveState(cat, enabled = true) {
      const ids = getCategoryImageFieldIds(cat);
      const btn = document.getElementById(ids.save);
      if (!btn) return;

      btn.disabled = !enabled;
      btn.className = enabled
        ? 'px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-gray-800 text-white hover:bg-gray-900 transition shadow-sm'
        : 'px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-gray-100 text-gray-400 cursor-not-allowed transition';
    }

    function syncCategoryImageEditorUI(cat) {
      const draft = ensureCategoryImageDraft(cat);
      const currentUrl = String(draft.url || '').trim();
      const savedUrl = String(draft.savedUrl || '').trim();
      const isChanged = currentUrl !== savedUrl;

      setCategoryImagePreview(cat, currentUrl || savedUrl || '');
      setCategoryImageSaveState(cat, true);

      if (draft.validating) {
        setCategoryImageStatus(cat, 'Validando URL...', 'loading');
        return;
      }

      if (!currentUrl) {
        setCategoryImageStatus(cat, isChanged ? 'Lista para limpiar y guardar' : 'Sin imagen', isChanged ? 'warning' : 'neutral');
        return;
      }

      if (isChanged) {
        if (draft.lastValidation === true) {
          setCategoryImageStatus(cat, 'Vista previa cargada. Falta guardar', 'success');
        } else if (draft.lastValidation === false) {
          setCategoryImageStatus(cat, 'URL inestable o bloqueada. Se puede guardar', 'error');
        } else {
          setCategoryImageStatus(cat, 'Vista previa actualizada. Falta guardar', 'warning');
        }
        return;
      }

      if (draft.lastValidation === false) {
        setCategoryImageStatus(cat, 'Guardada, pero la fuente es inestable', 'error');
      } else {
        setCategoryImageStatus(cat, 'Imagen guardada', 'success');
      }
    }

    function validateImageUrl(url) {
      return new Promise(resolve => {
        const cleanUrl = String(url || '').trim();
        if (!cleanUrl) {
          resolve(true);
          return;
        }

        const img = new Image();
        let completed = false;

        const finish = (result) => {
          if (completed) return;
          completed = true;
          clearTimeout(timer);
          resolve(result);
        };

        const timer = setTimeout(() => finish(false), 8000);

        img.referrerPolicy = 'no-referrer';
        img.onload = () => finish(true);
        img.onerror = () => finish(false);
        img.src = cleanUrl;
      });
    }

    async function validateCategoryImageDraft(cat) {
      const draft = ensureCategoryImageDraft(cat);
      const urlAtStart = String(draft.url || '').trim();

      if (!urlAtStart) {
        draft.validating = false;
        draft.lastValidation = true;
        syncCategoryImageEditorUI(cat);
        return;
      }

      draft.validating = true;
      draft.lastValidation = null;
      syncCategoryImageEditorUI(cat);

      const isValid = await validateImageUrl(urlAtStart);

      if (!categoryImageDrafts[cat]) return;
      if (String(categoryImageDrafts[cat].url || '').trim() !== urlAtStart) return;

      categoryImageDrafts[cat].validating = false;
      categoryImageDrafts[cat].lastValidation = isValid;
      syncCategoryImageEditorUI(cat);
    }

    function scheduleCategoryImageValidation(cat) {
      if (categoryImageValidationTimers[cat]) clearTimeout(categoryImageValidationTimers[cat]);
      categoryImageValidationTimers[cat] = setTimeout(() => validateCategoryImageDraft(cat), 350);
    }

    function scheduleCategoryImageAutosave(cat) {
      if (categoryImageAutosaveTimers[cat]) clearTimeout(categoryImageAutosaveTimers[cat]);
      categoryImageAutosaveTimers[cat] = setTimeout(() => saveCategoryImage(cat, true), 900);
    }

    function handleCategoryImageDraftInput(cat, value) {
      const draft = ensureCategoryImageDraft(cat);
      draft.url = String(value || '').trim();
      draft.validating = false;
      draft.lastValidation = draft.url === '' ? true : null;

      syncCategoryImageEditorUI(cat);

      if (draft.url !== '') scheduleCategoryImageValidation(cat);
      scheduleCategoryImageAutosave(cat);
    }

    function saveCategoryImage(cat, silent = false) {
      const draft = ensureCategoryImageDraft(cat);
      const cleanUrl = String(draft.url || '').trim();

      updateMetaImg(cat, 0, cleanUrl);

      draft.savedUrl = cleanUrl;
      draft.url = cleanUrl;
      draft.validating = false;
      if (draft.lastValidation === null) {
        draft.lastValidation = cleanUrl === '' ? true : draft.lastValidation;
      }

      syncCategoryImageEditorUI(cat);

      if (silent) return;

      if (cleanUrl === '') {
        alert('Imagen eliminada correctamente.');
        return;
      }

      if (draft.lastValidation === false) {
        alert('Imagen guardada. La URL puede ser inestable o el servidor puede bloquearla.');
        return;
      }

      alert('Imagen guardada correctamente.');
    }

    function initializeCategoryImageEditors(categories = []) {
      categories.forEach(cat => {
        const draft = ensureCategoryImageDraft(cat);
        const savedUrl = getSavedCategoryImage(cat);

        if (String(draft.savedUrl || '').trim() !== savedUrl && String(draft.url || '').trim() === String(draft.savedUrl || '').trim()) {
          draft.url = savedUrl;
        }

        draft.savedUrl = savedUrl;
        if (String(draft.url || '').trim() === savedUrl) {
          draft.lastValidation = savedUrl === '' ? true : draft.lastValidation;
          draft.validating = false;
        }

        const ids = getCategoryImageFieldIds(cat);
        const input = document.getElementById(ids.input);
        if (input && input.value !== draft.url) input.value = draft.url;

        syncCategoryImageEditorUI(cat);
      });
    }

    function renderCategoryManager() {
      const container = document.getElementById('categoryManager');
      const searchInput = document.getElementById('categoryManagerSearch');
      const searchTerm = searchInput ? searchInput.value : '';

      if (!container) return;

      container.innerHTML = '';

      const filteredCategories = appState.categories
        .map((cat, index) => ({ cat, index }))
        .filter(({ cat }) => normalizeText(cat).includes(normalizeText(searchTerm)));

      if (filteredCategories.length === 0) {
        container.innerHTML = `
          <div class="md:col-span-2 bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center">
            <p class="text-xs font-black uppercase tracking-widest text-gray-400">Sin coincidencias</p>
            <p class="text-xs text-gray-500 mt-2">Prueba con otro nombre o limpia la búsqueda.</p>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
        updateCategoryDropdowns();
        return;
      }

      filteredCategories.forEach(({ cat, index }) => {
        let meta = { icon: " ", desc: "", imgs: [""] };

        if (appState.categoryMetadata && appState.categoryMetadata[cat]) {
          meta = appState.categoryMetadata[cat];
        } else if (CATEGORY_INFO[cat]) {
          meta = { ...CATEGORY_INFO[cat] };
        }

        const draft = ensureCategoryImageDraft(cat);
        const currentImgValue = String(draft.url ?? (meta.imgs && meta.imgs[0]) ?? '').trim();
        const ids = getCategoryImageFieldIds(cat);

        const safeCatAction = `decodeURIComponent('${encodeURIComponent(cat)}')`;
        const safeCatValue = escapeHtmlAttr(cat);
        const safeIcon = escapeHtmlAttr(meta.icon || '');
        const safeDesc = escapeHtmlAttr(meta.desc || '');
        const safeImg1 = escapeHtmlAttr(currentImgValue);
        const isExpanded = expandedCategoryCard === cat;

        container.innerHTML += `
          <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4 relative overflow-hidden ${isExpanded ? 'ring-2 ring-gray-200' : ''}">
            <div class="absolute top-0 left-0 w-1 h-full bg-gray-400"></div>

            <button
              type="button"
              onclick="toggleCategoryCard(${safeCatAction})"
              class="w-full flex items-center justify-between gap-3 pl-2 text-left group"
            >
              <span class="font-black text-sm text-gray-700 group-hover:text-gray-900 uppercase tracking-wide truncate">${escapeHtml(cat)}</span>
              <span class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-gray-700 shrink-0">
                ${isExpanded ? 'Ocultar' : 'Editar'}
                <i data-lucide="chevron-${isExpanded ? 'up' : 'down'}" class="w-4 h-4"></i>
              </span>
            </button>

            <div class="${isExpanded ? 'block' : 'hidden'} space-y-4 animate-fade-in">
            <div class="flex items-center gap-2 pl-2">
              <input
                type="text"
                value="${safeCatValue}"
                onchange="renameCategory(${index}, this.value)"
                class="bg-transparent font-black text-sm w-full outline-none text-gray-700 focus:text-gray-900"
              >
              <button onclick="removeCategory(${index})" class="text-red-300 hover:text-red-500">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>

            <div class="grid grid-cols-2 gap-2 pl-2">
              <input
                type="text"
                placeholder="Icono (ej:  )"
                value="${safeIcon}"
                onchange="updateMeta(${safeCatAction}, 'icon', this.value)"
                class="text-[10px] p-2 border border-gray-200 rounded-lg w-full bg-white outline-none focus:ring-1 focus:ring-gray-300"
              >
              <input
                type="text"
                placeholder="Descripción corta"
                value="${safeDesc}"
                onchange="updateMeta(${safeCatAction}, 'desc', this.value)"
                class="text-[10px] p-2 border border-gray-200 rounded-lg w-full bg-white outline-none focus:ring-1 focus:ring-gray-300"
              >
            </div>

            <div class="pl-2 space-y-3">
              <div>
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Link de Imagen 1:1 (270x270)</label>
                <input
                  type="text"
                  id="${ids.input}"
                  placeholder="https://..."
                  value="${safeImg1}"
                  oninput="handleCategoryImageDraftInput(${safeCatAction}, this.value)"
                  onblur="saveCategoryImage(${safeCatAction}, true)"
                  class="text-[10px] p-2 border border-gray-200 rounded-lg w-full bg-white outline-none focus:ring-1 focus:ring-gray-300"
                >
              </div>

              <div class="flex flex-col lg:flex-row gap-4 items-start">
                <div class="w-full max-w-[160px]">
                  <div class="aspect-square rounded-full overflow-hidden border border-gray-200 bg-white shadow-sm">
                    <img
                      id="${ids.preview}"
                      src="${escapeHtmlAttr(currentImgValue || CATEGORY_IMAGE_PLACEHOLDER)}"
                      alt="Vista previa de imagen"
                      class="w-full h-full object-cover object-center"
                      referrerpolicy="no-referrer"
                      onerror="this.onerror=null;this.src='${CATEGORY_IMAGE_PLACEHOLDER}';"
                    >
                  </div>
                </div>

                <div class="flex-1 w-full space-y-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <span id="${ids.status}" class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-600 border border-gray-200">
                      Pendiente
                    </span>
                    <span class="text-[10px] text-gray-400 font-semibold">La vista previa cambia al instante. Al salir del campo también se guarda sola.</span>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      id="${ids.save}"
                      onclick="saveCategoryImage(${safeCatAction})"
                      class="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-gray-800 text-white hover:bg-gray-900 transition shadow-sm"
                    >
                      Guardar imagen
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        `;
      });

      if (window.lucide) lucide.createIcons();
      updateCategoryDropdowns();
      initializeCategoryImageEditors(filteredCategories.map(item => item.cat));
    }

    function clearCategoryManagerSearch() {
      const input = document.getElementById('categoryManagerSearch');
      if (!input) return;
      input.value = '';
      renderCategoryManager();
    }

    function toggleCategoryCard(cat) {
      expandedCategoryCard = expandedCategoryCard === cat ? null : cat;
      renderCategoryManager();
    }

    function updateMeta(cat, field, val) {
      if(!appState.categoryMetadata) appState.categoryMetadata = {};
      if(!appState.categoryMetadata[cat]) {
        appState.categoryMetadata[cat] = CATEGORY_INFO[cat]
          ? { ...CATEGORY_INFO[cat] }
          : { icon: " ", desc: "", imgs: [""] };
      }
      appState.categoryMetadata[cat][field] = val;
      saveLocal();
      runCalculations();
    }

    function ensureCategoryMeta(cat) {
      if (!appState.categoryMetadata) appState.categoryMetadata = {};
      if (!appState.categoryMetadata[cat]) {
        appState.categoryMetadata[cat] = CATEGORY_INFO[cat]
          ? {
              icon: CATEGORY_INFO[cat].icon || " ",
              desc: CATEGORY_INFO[cat].desc || "",
              imgs: [CATEGORY_INFO[cat].imgs?.[0] || ""]
            }
          : { icon: " ", desc: "", imgs: [""] };
      }
      if (!appState.categoryMetadata[cat].imgPosition) {
        appState.categoryMetadata[cat].imgPosition = { x: 50, y: 50 };
      }
      return appState.categoryMetadata[cat];
    }

    function toggleImagePositionEditor() {
      const panel = document.getElementById('imagePositionEditor');
      if (!panel) return;
      panel.classList.toggle('hidden');
    }

    function updateImagePosition(axis, value) {
      const select = document.getElementById('calcCategory');
      if (!select || !select.value) return;

      const meta = ensureCategoryMeta(select.value);
      const numericValue = Math.max(0, Math.min(100, Number(value) || 50));
      meta.imgPosition[axis === 'y' ? 'y' : 'x'] = numericValue;

      const img = document.getElementById('resImg1');
      if (img) {
        img.style.objectPosition = `${meta.imgPosition.x}% ${meta.imgPosition.y}%`;
      }

      saveLocal();
    }

    function resetImagePosition() {
      const select = document.getElementById('calcCategory');
      if (!select || !select.value) return;

      const meta = ensureCategoryMeta(select.value);
      meta.imgPosition = { x: 50, y: 50 };

      const posX = document.getElementById('imagePositionX');
      const posY = document.getElementById('imagePositionY');
      if (posX) posX.value = 50;
      if (posY) posY.value = 50;

      const img = document.getElementById('resImg1');
      if (img) img.style.objectPosition = '50% 50%';

      saveLocal();
    }

    function updateMetaImg(cat, idx, val) {
      if (!appState.categoryMetadata) appState.categoryMetadata = {};

      if (!appState.categoryMetadata[cat]) {
        appState.categoryMetadata[cat] = CATEGORY_INFO[cat]
          ? {
              icon: CATEGORY_INFO[cat].icon || " ",
              desc: CATEGORY_INFO[cat].desc || "",
              imgs: [CATEGORY_INFO[cat].imgs?.[0] || ""]
            }
          : { icon: " ", desc: "", imgs: [""] };
      }

      if (!Array.isArray(appState.categoryMetadata[cat].imgs)) {
        appState.categoryMetadata[cat].imgs = [""];
      }

      const cleanUrl = String(val || "").trim();
      appState.categoryMetadata[cat].imgs[0] = cleanUrl;
      appState.categoryMetadata[cat].imgs = [cleanUrl];

      if (categoryImageDrafts[cat]) {
        categoryImageDrafts[cat].savedUrl = cleanUrl;
        categoryImageDrafts[cat].url = cleanUrl;
        categoryImageDrafts[cat].validating = false;
      }

      const ids = getCategoryImageFieldIds(cat);
      const input = document.getElementById(ids.input);
      if (input && input.value !== cleanUrl) input.value = cleanUrl;
      setCategoryImagePreview(cat, cleanUrl);
      syncCategoryImageEditorUI(cat);

      saveLocal();

      const currentCategory = document.getElementById('calcCategory')?.value || '';
      if (currentCategory === cat) {
        runCalculations();
      }
    }

    function addNewCategory() {
      const name = prompt("Nombre:");
      const cleanName = name ? name.trim() : '';

      if (cleanName && !appState.categories.includes(cleanName)) {
        appState.categories.push(cleanName);
        appState.margins[cleanName] = [{max: Infinity, m: 20}];
        sortCategoriesAlphabetically();
      }
    }

    function renameCategory(index, newName) {
      const old = appState.categories[index];
      const cleanName = newName ? newName.trim() : '';

      if (cleanName && old !== cleanName) {
        appState.categories[index] = cleanName;
        appState.margins[cleanName] = appState.margins[old];
        delete appState.margins[old];

        if (appState.categoryMetadata && appState.categoryMetadata[old]) {
          appState.categoryMetadata[cleanName] = appState.categoryMetadata[old];
          delete appState.categoryMetadata[old];
        }

        sortCategoriesAlphabetically();
      }
    }

    function removeCategory(index) {
      if (confirm("¿Borrar?")) {
        const name = appState.categories[index];
        appState.categories.splice(index, 1);
        delete appState.margins[name];
        if (appState.categoryMetadata) delete appState.categoryMetadata[name];
        renderCategoryManager();
        renderConfigTables();
        saveLocal();
      }
    }

    function renderConfigTables() {
      const container = document.getElementById('configContainer');
      const searchInput = document.getElementById('marginManagerSearch');
      const searchTerm = searchInput ? searchInput.value : '';
      container.innerHTML = '';

      const filteredCategories = appState.categories.filter(cat =>
        normalizeText(cat).includes(normalizeText(searchTerm))
      );

      if (filteredCategories.length === 0) {
        container.innerHTML = `
          <div class="md:col-span-2 bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center">
            <p class="text-xs font-black uppercase tracking-widest text-gray-400">Sin coincidencias</p>
            <p class="text-xs text-gray-500 mt-2">Prueba con otra categoría o limpia la búsqueda.</p>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
      }

      filteredCategories.forEach(cat => {
        const safeCat = escapeHtml(cat);
        const safeCatAction = `decodeURIComponent('${encodeURIComponent(cat)}')`;
        const isExpanded = expandedMarginCard === cat;
        let html = `<div class="border rounded-2xl p-4 bg-white shadow-sm border-gray-50 ${isExpanded ? 'ring-2 ring-gray-200' : ''}">
          <button
            type="button"
            onclick="toggleMarginCard(${safeCatAction})"
            class="w-full flex items-center justify-between gap-3 text-left group"
          >
            <span class="font-black text-gray-700 uppercase text-[10px] tracking-widest flex items-center gap-2 italic truncate">
              <i data-lucide="tag" class="w-4 h-4"></i> ${safeCat}
            </span>
            <span class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-gray-700 shrink-0">
              ${isExpanded ? 'Ocultar' : 'Editar'}
              <i data-lucide="chevron-${isExpanded ? 'up' : 'down'}" class="w-4 h-4"></i>
            </span>
          </button>
          <div class="${isExpanded ? 'block' : 'hidden'} mt-5 animate-fade-in">
          <div class="space-y-3 mb-4">`;

        (appState.margins[cat] || []).forEach((rule, idx) => {
          html += `<div class="flex items-center gap-2">
            <input type="number" value="${rule.max === Infinity ? '' : Number(rule.max) || 0}" placeholder="Infinito" oninput="updateMarginRule(${safeCatAction}, ${idx}, 'max', this.value)" class="w-full p-2 border rounded-lg font-bold text-xs bg-gray-50 shadow-inner">
            <input type="number" value="${Number(rule.m) || 0}" oninput="updateMarginRule(${safeCatAction}, ${idx}, 'm', this.value)" class="w-full p-2 border rounded-lg font-bold text-xs text-gray-700 bg-gray-50 shadow-inner">
            <button onclick="removeMarginRow(${safeCatAction}, ${idx})" class="text-red-200 hover:text-red-500"><i data-lucide="x-circle" class="w-4 h-4"></i></button>
          </div>`;
        });

        html += `</div>
          <button onclick="addMarginRow(${safeCatAction})" class="w-full border-2 border-dashed border-gray-100 py-2 rounded-xl text-[9px] font-black text-gray-400 uppercase hover:text-gray-700">+ Añadir Rango</button>
          </div>
        </div>`;

        container.innerHTML += html;
      });

      lucide.createIcons();
    }

    function clearMarginManagerSearch() {
      const input = document.getElementById('marginManagerSearch');
      if (!input) return;
      input.value = '';
      renderConfigTables();
    }

    function toggleMarginCard(cat) {
      expandedMarginCard = expandedMarginCard === cat ? null : cat;
      renderConfigTables();
    }

    function addMarginRow(cat) { appState.margins[cat].push({max: 2000, m: 15}); saveLocal(); renderConfigTables(); }
    function removeMarginRow(cat, idx) { appState.margins[cat].splice(idx, 1); saveLocal(); renderConfigTables(); }
    function updateMarginRule(cat, idx, field, val) { appState.margins[cat][idx][field] = val === '' ? Infinity : parseFloat(val); saveLocal(); runCalculations(); }

    function renderVolumeConfig(cost = appState.currentTotalCost, basePVP = appState.currentPVP) {
      const container = document.getElementById('volumeConfigContainer');
      if (!container) return;

      container.innerHTML = '';

      if (!basePVP || basePVP <= 0) {
        container.innerHTML = `
          <div class="md:col-span-5 bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center">
            <p class="text-xs font-black uppercase tracking-widest text-gray-400">Sin precio final</p>
            <p class="text-xs text-gray-500 mt-2">Ingresa un costo base para calcular descuentos.</p>
          </div>
        `;
        return;
      }

      getDiscountRows(cost, basePVP).forEach(row => {
        const profitClass = row.profit >= 0 ? 'text-gray-700' : 'text-red-500';
        const badgeClass = row.profit >= 0 ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-red-50 text-red-600 border-red-100';

        container.innerHTML += `
          <div class="min-w-[210px] flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
            <div class="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
            <div class="ml-2">
              <div class="flex items-center justify-between gap-2 mb-4">
                <h4 class="font-black text-gray-800 text-sm">-${row.discount} pts margen</h4>
                <span class="text-[9px] font-black uppercase px-2 py-1 rounded-full border ${badgeClass}">${row.profit >= 0 ? 'Ganancia' : 'Pérdida'}</span>
              </div>
              <div class="space-y-3 text-xs font-bold">
                <div>
                  <span class="block text-[9px] font-black uppercase tracking-widest text-gray-400">Precio con descuento</span>
                  <span class="block text-lg font-black text-gray-800">${fmt$(row.discountedPrice)}</span>
                </div>
                <div class="flex justify-between gap-3">
                  <span class="text-gray-400">Margen final</span>
                  <span class="text-gray-700">${row.margin.toFixed(1)}%</span>
                </div>
                <div class="flex justify-between gap-3">
                  <span class="text-gray-400">Descuentas</span>
                  <span class="text-orange-500">-${fmt$(row.discountAmount)}</span>
                </div>
                <div class="flex justify-between gap-3">
                  <span class="text-gray-400">Ganas</span>
                  <span class="${profitClass}">${fmt$(row.profit)}</span>
                </div>
              </div>
            </div>
          </div>`;
      });
    }

    function updateVolumeTier(idx, field, value) {
      appState.volumeConfig[idx][field] = parseFloat(value) || 0;
      saveLocal();
      runCalculations();
    }

    function switchTab(view) {
      document.getElementById('viewCalc').classList.toggle('hidden', view !== 'calc');
      document.getElementById('viewConfig').classList.toggle('hidden', view !== 'config');
      document.getElementById('btnTabCalc').classList.toggle('active', view === 'calc');
      document.getElementById('btnTabConfig').classList.toggle('active', view === 'config');
      if(view === 'config') {
        renderCategoryManager();
        renderConfigTables();
      }
    }

    function toggleCategoryManager() {
      const content = document.getElementById('category-manager-content');
      const btn = document.getElementById('cat-toggle-btn');
      if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        btn.innerHTML = '<i data-lucide="chevron-up" class="w-5 h-5"></i>';
      } else {
        content.classList.add('hidden');
        btn.innerHTML = '<i data-lucide="chevron-down" class="w-5 h-5"></i>';
      }
      lucide.createIcons();
    }

    function toggleVolumeManager() {
      const content = document.getElementById('volume-manager-content');
      const btn = document.getElementById('vol-toggle-btn');
      if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        btn.innerHTML = '<i data-lucide="chevron-up" class="w-5 h-5"></i>';
      } else {
        content.classList.add('hidden');
        btn.innerHTML = '<i data-lucide="chevron-down" class="w-5 h-5"></i>';
      }
      lucide.createIcons();
    }

    function toggleScaleSection() {
      const content = document.getElementById('scale-section-content');
      const btn = document.getElementById('scale-toggle-btn');
      if (!content || !btn) return;

      if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        btn.innerHTML = '<i data-lucide="chevron-up" class="w-5 h-5"></i>';
      } else {
        content.classList.add('hidden');
        btn.innerHTML = '<i data-lucide="chevron-down" class="w-5 h-5"></i>';
      }

      lucide.createIcons();
    }

    function toggleMarginManager() {
      const content = document.getElementById('margin-manager-content');
      const btn = document.getElementById('margin-toggle-btn');
      if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        btn.innerHTML = '<i data-lucide="chevron-up" class="w-5 h-5"></i>';
      } else {
        content.classList.add('hidden');
        btn.innerHTML = '<i data-lucide="chevron-down" class="w-5 h-5"></i>';
      }
      lucide.createIcons();
    }

    function toggleCloudPanel() {
      const content = document.getElementById('cloud-panel-content');
      const header = document.getElementById('cloud-header');
      const btn = document.getElementById('cloud-toggle-btn');
      if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        header.classList.add('border-b', 'pb-2');
        btn.innerHTML = '<i data-lucide="chevron-up" class="w-5 h-5"></i>';
      } else {
        content.classList.add('hidden');
        header.classList.remove('border-b', 'pb-2');
        btn.innerHTML = '<i data-lucide="chevron-down" class="w-5 h-5"></i>';
      }
      lucide.createIcons();
    }

    function openCloudConfig() {
      switchTab('config');

      const content = document.getElementById('cloud-panel-content');
      const header = document.getElementById('cloud-header');
      const btn = document.getElementById('cloud-toggle-btn');
      const panel = document.getElementById('cloud-panel');

      if (content) content.classList.remove('hidden');
      if (header) header.classList.add('border-b', 'pb-2');
      if (btn) btn.innerHTML = '<i data-lucide="chevron-up" class="w-5 h-5"></i>';
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      lucide.createIcons();
    }

    const fmt$ = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

    function saveLocal() {
      localStorage.setItem(CONFIG.LS_KEY, encodeStateForStorage(appState));
    }

    function saveAllConfig() {
      for(let cat in appState.margins) appState.margins[cat].sort((a,b) => a.max - b.max);
      saveLocal();
      runCalculations();
      alert("Guardado.");
    }

    function resetToDefaults() {
      if(confirm("¿Restablecer?")) {
        localStorage.removeItem(CONFIG.LS_KEY);
        location.reload();
      }
    }

    let categorySuggestionIndex = -1;

    function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function hideCategorySuggestions() {
      const suggestions = document.getElementById('calcCategorySuggestions');
      if (!suggestions) return;
      suggestions.classList.add('hidden');
      suggestions.innerHTML = '';
      categorySuggestionIndex = -1;
    }

    function ensureCategorySuggestionsPortal() {
      const suggestions = document.getElementById('calcCategorySuggestions');
      if (!suggestions || suggestions.parentElement === document.body) return suggestions;

      document.body.appendChild(suggestions);
      return suggestions;
    }

    function positionCategorySuggestions() {
      const input = document.getElementById('calcCategorySearch');
      const suggestions = ensureCategorySuggestionsPortal();
      if (!input || !suggestions) return;

      const rect = input.getBoundingClientRect();
      suggestions.style.left = `${rect.left}px`;
      suggestions.style.top = `${rect.bottom + 8}px`;
      suggestions.style.width = `${rect.width}px`;
      suggestions.style.right = 'auto';
      suggestions.style.marginTop = '0';
    }

    function renderCategorySuggestions(categories = [], highlightedIndex = -1) {
      const suggestions = ensureCategorySuggestionsPortal();
      if (!suggestions) return;

      const limitedCategories = categories.slice(0, 30);

      if (limitedCategories.length === 0) {
        suggestions.innerHTML = `
          <div class="px-4 py-3 text-xs font-bold uppercase tracking-widest text-gray-400">
            Sin coincidencias
          </div>
        `;
        positionCategorySuggestions();
        suggestions.classList.remove('hidden');
        categorySuggestionIndex = -1;
        return;
      }

      suggestions.innerHTML = limitedCategories.map((cat, index) => {
        const isActive = index === highlightedIndex;
        const safeLabel = escapeHtml(String(cat || '').toUpperCase());
        const safeValue = encodeURIComponent(cat);
        return `
          <button
            type="button"
            onmousedown="selectCategorySuggestion(decodeURIComponent('${safeValue}'))"
            class="w-full text-left px-4 py-3 text-sm font-semibold transition-colors border-b border-gray-50 last:border-b-0 ${isActive ? 'bg-gray-100 text-gray-800' : 'text-gray-700 hover:bg-gray-50'}"
          >
            ${safeLabel}
          </button>
        `;
      }).join('');

      positionCategorySuggestions();
      suggestions.classList.remove('hidden');
      categorySuggestionIndex = highlightedIndex;
    }

    function setCurrentCategory(category, shouldRun = true) {
      const select = document.getElementById('calcCategory');
      const input = document.getElementById('calcCategorySearch');

      if (!select || !input || !category) return;

      select.value = category;
      input.value = String(category || '').toUpperCase();
      input.dataset.previousValue = category;
      hideCategorySuggestions();

      if (shouldRun) runCalculations();
    }

    function selectCategorySuggestion(category) {
      setCurrentCategory(category, true);
    }

    function handleCategoryInputFocus() {
      const input = document.getElementById('calcCategorySearch');
      if (!input) return;

      input.dataset.previousValue = input.value || '';
      hideCategorySuggestions();
    }

    function handleCategoryInputBlur() {
      const input = document.getElementById('calcCategorySearch');
      const select = document.getElementById('calcCategory');

      if (!input) return;

      setTimeout(() => {
        hideCategorySuggestions();

        if ((input.value || '').trim() === '') {
          const fallbackValue = input.dataset.previousValue || (select ? select.value : '') || appState.categories[0] || '';
          input.value = String(fallbackValue || '').toUpperCase();
          input.dataset.previousValue = fallbackValue;
        }
      }, 150);
    }

    function updateCategoryDropdowns() {
      const select = document.getElementById('calcCategory');
      const input = document.getElementById('calcCategorySearch');

      if (!select || !input) return;

      const currentSelection = select.value && appState.categories.includes(select.value)
        ? select.value
        : (appState.categories[0] || '');

      select.innerHTML = '';

      appState.categories.forEach(cat => {
        select.innerHTML += `<option value="${escapeHtmlAttr(cat)}">${escapeHtml(cat)}</option>`;
      });

      if (currentSelection) {
        select.value = currentSelection;
        if (!input.value || !appState.categories.includes(input.value)) {
          input.value = String(currentSelection || '').toUpperCase();
        }
        input.dataset.previousValue = currentSelection;
      } else {
        input.value = '';
        input.dataset.previousValue = '';
      }

      hideCategorySuggestions();
    }

    function syncCategoryFromSearch(term = '') {
      const select = document.getElementById('calcCategory');
      const input = document.getElementById('calcCategorySearch');

      if (!select || !input) return;

      const filteredCategories = getFilteredCategories(term);
      const exactMatch = appState.categories.find(cat =>
        normalizeText(cat) === normalizeText(term)
      );

      if (normalizeText(term) === '') {
        hideCategorySuggestions();
        return;
      }

      if (exactMatch) {
        select.value = exactMatch;
        input.dataset.previousValue = exactMatch;
      }

      renderCategorySuggestions(filteredCategories, -1);
    }

    function handleCategorySearchKeydown(event) {
      const input = document.getElementById('calcCategorySearch');
      if (!input) return;

      const filteredCategories = getFilteredCategories(input.value).slice(0, 30);

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (filteredCategories.length === 0) return;
        categorySuggestionIndex = Math.min(categorySuggestionIndex + 1, filteredCategories.length - 1);
        renderCategorySuggestions(filteredCategories, categorySuggestionIndex);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (filteredCategories.length === 0) return;
        categorySuggestionIndex = Math.max(categorySuggestionIndex - 1, 0);
        renderCategorySuggestions(filteredCategories, categorySuggestionIndex);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (filteredCategories.length === 0) return;

        const selectedCategory =
          filteredCategories[categorySuggestionIndex] ||
          appState.categories.find(cat => normalizeText(cat) === normalizeText(input.value)) ||
          filteredCategories[0];

        if (selectedCategory) {
          setCurrentCategory(selectedCategory, true);
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        const fallbackValue = input.dataset.previousValue || '';
        input.value = fallbackValue;
        hideCategorySuggestions();
      }
    }

    function clearCategorySearch() {
      const select = document.getElementById('calcCategory');
      const input = document.getElementById('calcCategorySearch');

      if (!select || !input) return;

      const currentCategory = select.value || appState.categories[0] || '';
      input.value = currentCategory;
      input.dataset.previousValue = currentCategory;
      renderCategorySuggestions(getFilteredCategories(''));

      if (currentCategory) runCalculations();
    }

    function sortCategoriesAlphabetically() {
      const select = document.getElementById('calcCategory');
      const currentSelection = select ? select.value : '';

      appState.categories = [...new Set(appState.categories)].sort((a, b) =>
        String(a).trim().localeCompare(String(b).trim(), 'es', {
          sensitivity: 'base',
          numeric: true
        })
      );

      saveLocal();
      updateCategoryDropdowns();
      renderCategoryManager();
      renderConfigTables();

      if (select && currentSelection && appState.categories.includes(currentSelection)) {
        select.value = currentSelection;
      }

      if (select && select.value) runCalculations();
    }

    function handleCategoryChange() {
      const select = document.getElementById('calcCategory');
      const input = document.getElementById('calcCategorySearch');
      if (!select || !select.value) return;

      if (input) {
        input.value = String(select.value || '').toUpperCase();
        input.dataset.previousValue = select.value;
      }

      hideCategorySuggestions();
      runCalculations();
    }

    auth.onAuthStateChanged(user => {
      const actions = document.getElementById('cloud-actions');
      const form = document.getElementById('auth-form');
      const dot = document.getElementById('auth-status-dot');
      const quickBtn = document.getElementById('cloudQuickBtn');

      if (user) {
        dot.className = "w-2.5 h-2.5 rounded-full bg-green-500 shadow-md";
        document.getElementById('auth-status-text').textContent = user.email;
        form.classList.add('hidden');
        actions.classList.remove('hidden');
        if (quickBtn) {
          quickBtn.className = "bg-green-600 text-white border border-green-600 w-9 h-9 rounded-full text-[10px] font-black uppercase hover:bg-green-700 transition inline-flex items-center justify-center shadow-sm";
          quickBtn.title = `Conectado: ${user.email}`;
        }
      } else {
        dot.className = "w-2.5 h-2.5 rounded-full bg-gray-300";
        document.getElementById('auth-status-text').textContent = "Offline";
        form.classList.remove('hidden');
        actions.classList.add('hidden');
        if (quickBtn) {
          quickBtn.className = "bg-gray-100 text-gray-500 border border-gray-200 w-9 h-9 rounded-full text-[10px] font-black uppercase hover:bg-gray-200 transition inline-flex items-center justify-center shadow-sm";
          quickBtn.title = "Sin sesión en nube";
        }
      }
    });

    async function handleLogin() {
      try {
        await auth.signInWithEmailAndPassword(
          document.getElementById('fb-email').value,
          document.getElementById('fb-pass').value
        );
      } catch (e) {
        alert(e.message);
      }
    }

    async function syncToCloud() {
      try {
        const docRef = getUserConfigDoc();
        if (!docRef) return;

        await docRef.set({
          data: encodeStateForStorage(appState),
          updatedAt: new Date()
        });
        alert("Nube OK");
      } catch (e) {
        alert(e.message);
      }
    }

    async function pullFromCloud() {
      try {
        const docRef = getUserConfigDoc();
        if (!docRef) return;

        const doc = await docRef.get();
        if(doc.exists) {
          appState = normalizeAppState(decodeStateFromStorage(doc.data().data));

          saveLocal();
          renderCategoryManager();
          handleCategoryChange();
          alert("Bajado.");
        }
      } catch (e) {
        alert(e.message);
      }
    }

    window.onload = () => {
      localStorage.setItem('esquina_visual_theme', 'harvest');
      applyVisualTheme('harvest');
      showWelcomeQuote();

      const local = localStorage.getItem(CONFIG.LS_KEY);

      if (local) {
        try {
          appState = normalizeAppState(decodeStateFromStorage(local));
        } catch (e) {
          console.error(e);
        }
      }

      loadVideosLocal();

      const baseCostInput = document.getElementById('calcBaseCost');
      if (baseCostInput) baseCostInput.dataset.lastValue = baseCostInput.value || '';

      document.getElementById('calcIeps').innerHTML = getIepsOptions()
        .map(option => `<option value="${option.value}">${option.label}</option>`)
        .join('');

      updateIepsSelectTheme();
      updateCategoryDropdowns();
      renderVolumeConfig();
      handleCategoryChange();
      window.addEventListener('resize', positionCategorySuggestions);
      window.addEventListener('scroll', positionCategorySuggestions, true);
      window.addEventListener('resize', positionIepsSuggestions);
      window.addEventListener('scroll', positionIepsSuggestions, true);
      document.addEventListener('click', event => {
        if (!event.target.closest('#calcIepsDisplay') && !event.target.closest('#calcIepsSuggestions')) {
          hideIepsDropdown();
        }
      });
      lucide.createIcons();
    };
