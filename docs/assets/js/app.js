const CONFIG = {
      IVA_RATE: 0.16,
      LS_KEY: 'esquina_agricola_v9_single_image',
      BACKUPS_KEY: 'esquina_agricola_local_backups_v1',
      CLOUD_BASE_KEY: 'esquina_cloud_sync_base_v2',
      CLOUD_PENDING_KEY: 'esquina_cloud_sync_pending_v2',
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
        { label: "PRECIO 2", qty: 500, discount: 5 },
        { label: "PRECIO 3", qty: 700, discount: 8 },
        { label: "PRECIO 4", qty: 1000, discount: 12 }
      ],
      categoryMetadata: {},
      currentPVP: 0,
      currentTotalCost: 0
    };

    let videoList = [];

    const DEFAULT_VOLUME_CONFIG = [
      { label: "PRECIO 1", qty: 1, discount: 0 },
      { label: "PRECIO 2", qty: 500, discount: 5 },
      { label: "PRECIO 3", qty: 700, discount: 8 },
      { label: "PRECIO 4", qty: 1000, discount: 12 }
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
        categoryIds: state.categoryIds && typeof state.categoryIds === 'object' ? { ...state.categoryIds } : {},
        volumeConfig: Array.isArray(state.volumeConfig) && state.volumeConfig.length > 0 ? state.volumeConfig : DEFAULT_VOLUME_CONFIG.map(tier => ({ ...tier })),
        categoryMetadata: state.categoryMetadata && typeof state.categoryMetadata === 'object' ? state.categoryMetadata : {},
        currentPVP: Number(state.currentPVP) || 0,
        currentTotalCost: Number(state.currentTotalCost) || 0
      };

      normalized.categories.forEach(cat => {
        if (!normalized.categoryIds[cat]) normalized.categoryIds[cat] = categoryCloudId(cat);
        if (!Array.isArray(normalized.margins[cat]) || normalized.margins[cat].length === 0) {
          normalized.margins[cat] = [{ max: Infinity, m: 20 }];
        }
      });

      Object.keys(normalized.margins).forEach(cat => {
        normalized.margins[cat] = normalized.margins[cat].map(rule => ({
          max: rule.max === null || rule.max === undefined || rule.max === '' ? Infinity : Number(rule.max),
          m: Math.min(99, Math.max(0, Number(rule.m) || 0))
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
        qty: index === 3 && [1010, 1020].includes(Number(tier.qty)) ? 1000 : Number(tier.qty) || 0,
        discount: Number(tier.discount) || 0,
        ...(tier.smallPresentationBackup && Number.isFinite(Number(tier.smallPresentationBackup.qty)) && Number.isFinite(Number(tier.smallPresentationBackup.discount))
          ? { smallPresentationBackup: { qty: Number(tier.smallPresentationBackup.qty), discount: Number(tier.smallPresentationBackup.discount) } }
          : {})
      }));

      const uniqueCategories = [];
      const categoryByKey = new Map();
      normalized.categories.forEach(category => {
        const key = categoryNameKey(category);
        if (!key) return;
        const existing = categoryByKey.get(key);
        if (!existing) {
          categoryByKey.set(key, category);
          uniqueCategories.push(category);
          return;
        }

        const primaryRules = normalized.margins[existing] || [];
        const duplicateRules = normalized.margins[category] || [];
        duplicateRules.forEach(rule => {
          if (!primaryRules.some(item => item.max === rule.max)) primaryRules.push(rule);
        });
        normalized.margins[existing] = primaryRules;

        if (normalized.categoryMetadata[category]) {
          normalized.categoryMetadata[existing] = {
            ...normalized.categoryMetadata[category],
            ...(normalized.categoryMetadata[existing] || {})
          };
        }
        delete normalized.margins[category];
        delete normalized.categoryMetadata[category];
        delete normalized.categoryIds[category];
      });
      normalized.categories = uniqueCategories.length ? uniqueCategories : [...CONFIG.DEFAULT_CATS];

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
        syncBulkQuantities();
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
        syncBulkQuantities();
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

    function syncBulkQuantities() {
      const fullQty = parseFloat(document.getElementById('asstFullQty')?.value) || 0;
      if (fullQty <= 0) return;
      const smallQty = parseFloat(document.getElementById('asstSmallPresentationQty')?.value) || 0;
      const smallPrice = parseFloat(document.getElementById('asstSmallPresentationPrice')?.value) || 0;
      document.getElementById('asstQty2').value = smallQty > 0 && smallPrice > 0 ? smallQty : Math.round(fullQty * 0.5);
      const q2 = parseFloat(document.getElementById('asstQty2').value) || 0;
      document.getElementById('asstQty3').value = smallQty > 0 && smallPrice > 0
        ? Math.max(Math.round(fullQty * 0.7), Math.round((q2 + fullQty) / 2))
        : Math.round(fullQty * 0.7);
      document.getElementById('asstQty4').value = fullQty;
    }

    function calculateTier1SmallPresentationTotal() {
      const referencePrice = parseFloat(document.getElementById('asstSmallPresentationPrice')?.value) || 0;
      const smallQty = parseFloat(document.getElementById('asstSmallPresentationQty')?.value) || 0;
      if (smallQty <= 0 || referencePrice <= 3) return null;
      return Number((referencePrice - 3).toFixed(2));
    }

    function restoreTier1AfterSmallPresentation() {
      const tier = appState.volumeConfig[0];
      if (!tier?.smallPresentationBackup) return false;
      tier.qty = tier.smallPresentationBackup.qty;
      tier.discount = tier.smallPresentationBackup.discount;
      delete tier.smallPresentationBackup;
      saveLocal();
      updateScales(appState.currentTotalCost, appState.currentPVP);
      renderVolumeConfig();
      return true;
    }

    let automaticBulkCurveTimer = null;
    let automaticBulkCurveApplying = false;

    function setPresentationCurveStatus(message, state = 'info') {
      const status = document.getElementById('presentationCurveStatus');
      if (!status) return;
      const colors = {
        info: 'text-gray-500 bg-gray-50',
        success: 'text-green-700 bg-green-50',
        error: 'text-red-700 bg-red-50'
      };
      status.className = `mt-3 rounded-xl px-3 py-2 text-xs font-bold ${colors[state] || colors.info}`;
      status.textContent = message;
    }

    function handlePresentationPricingInput() {
      syncBulkQuantities();
      scheduleAutomaticBulkCurve();
    }

    function scheduleAutomaticBulkCurve() {
      if (automaticBulkCurveApplying) return;
      clearTimeout(automaticBulkCurveTimer);
      automaticBulkCurveTimer = setTimeout(applyAutomaticBulkCurve, 500);
    }

    function applyAutomaticBulkCurve() {
      const unitPrice = Number(appState.currentPVP) || 0;
      const fullQty = parseFloat(document.getElementById('asstFullQty')?.value) || 0;
      const fullPrice = parseFloat(document.getElementById('asstFullPrice')?.value) || 0;
      const smallQtyInput = document.getElementById('asstSmallPresentationQty')?.value;
      const smallPriceInput = document.getElementById('asstSmallPresentationPrice')?.value;
      const hasSmallQty = String(smallQtyInput || '').trim() !== '';
      const hasSmallPrice = String(smallPriceInput || '').trim() !== '';
      const smallQty = hasSmallQty ? Number(smallQtyInput) : 0;
      const smallPrice = hasSmallPrice ? Number(smallPriceInput) : 0;
      const hasValidSmallPackage = fullQty > 0 && fullPrice > 0 && hasSmallQty && hasSmallPrice &&
        smallQty > 0 && smallQty < fullQty && smallPrice > 3;
      if (!hasValidSmallPackage) restoreTier1AfterSmallPresentation();

      if (unitPrice <= 0) {
        setPresentationCurveStatus('Ingresa el costo base para obtener el precio unitario y calcular las escalas.');
        return;
      }
      if (fullQty <= 0 || fullPrice <= 0) {
        setPresentationCurveStatus('Completa la cantidad y el precio de venta del envase completo.');
        return;
      }
      if (hasSmallQty !== hasSmallPrice) {
        setPresentationCurveStatus('Completa cantidad y precio del envase pequeño para calcular Precio 1 y ajustar la escala pequeña.', 'info');
        return;
      }

      if (hasSmallQty && (smallQty <= 0 || smallPrice <= 3 || smallQty >= fullQty)) {
        setPresentationCurveStatus('La presentación pequeña debe tener cantidad menor al envase completo y un precio mayor a $3.', 'error');
        return;
      }

      const q2 = smallQty || Math.round(fullQty * 0.5);
      const q3 = smallQty > 0
        ? Math.max(Math.round(fullQty * 0.7), Math.round((smallQty + fullQty) / 2))
        : Math.round(fullQty * 0.7);
      document.getElementById('asstBasePrice').value = unitPrice.toFixed(2);
      document.getElementById('asstQty2').value = q2;
      document.getElementById('asstQty3').value = q3;
      document.getElementById('asstQty4').value = fullQty;

      if (!suggestBulkPrices()) return;
      automaticBulkCurveApplying = true;
      try {
        if (!applyBulkStrategy(true)) return;
      } finally {
        automaticBulkCurveApplying = false;
      }
      setPresentationCurveStatus('Curva calculada y aplicada automáticamente a las escalas.', 'success');
    }

    function suggestBulkPrices() {
      const pUnit = parseFloat(document.getElementById('asstBasePrice').value) || 0;
      const pFull = parseFloat(document.getElementById('asstFullPrice').value) || 0;
      const qFull = parseFloat(document.getElementById('asstFullQty').value) || 0;
      if(pUnit <= 0 || pFull <= 0 || qFull <= 0) {
        setBulkAssistantStatus('Completa precio unitario, envase completo y precio completo.', 'error');
        return false;
      }
      const unitFull = pFull / qFull;
      [2, 3, 4].forEach(i => {
        const q = parseFloat(document.getElementById(`asstQty${i}`).value) || 0;
        if(q > 0) {
          let totalQ = 0;
          if (i === 4) { totalQ = pFull - 10; }
          else if (q >= qFull) { totalQ = pFull + (q - qFull) * unitFull; }
          else {
            let unitQ = pUnit - (pUnit - unitFull) * (q / qFull);
            totalQ = q * unitQ;
            if(totalQ >= pFull) totalQ = pFull - 15;
          }
          document.getElementById(`asstTotal${i}`).value = Math.round(totalQ);
        }
      });
      const smallQty = parseFloat(document.getElementById('asstSmallPresentationQty')?.value) || 0;
      const smallPrice = parseFloat(document.getElementById('asstSmallPresentationPrice')?.value) || 0;
      if (smallQty > 0 && smallPrice > 0) {
        if (smallQty >= qFull || smallPrice <= 3) {
          setBulkAssistantStatus('La presentación pequeña debe tener cantidad menor al envase completo y precio mayor a $3.', 'error');
          return false;
        }
        document.getElementById('asstQty2').value = smallQty;
        if (smallPrice > 5) document.getElementById('asstTotal2').value = (smallPrice - 5).toFixed(2);
      }
      setBulkAssistantStatus('Sugerencias calculadas. Revisa los montos en verde.', 'success');
      return true;
    }

    function applyBulkStrategy(automatic = false) {
      const smallQty = parseFloat(document.getElementById('asstSmallPresentationQty')?.value) || 0;
      const smallPrice = parseFloat(document.getElementById('asstSmallPresentationPrice')?.value) || 0;
      const hasSmallQty = String(document.getElementById('asstSmallPresentationQty')?.value || '').trim() !== '';
      const hasSmallPrice = String(document.getElementById('asstSmallPresentationPrice')?.value || '').trim() !== '';
      if (hasSmallQty !== hasSmallPrice) {
        setBulkAssistantStatus('Completa la cantidad y el precio de la presentación pequeña, o deja ambos campos vacíos.', 'error');
        return false;
      }
      const fullQty = parseFloat(document.getElementById('asstFullQty')?.value) || 0;
      const fullPrice = parseFloat(document.getElementById('asstFullPrice')?.value) || 0;
      if (smallQty > 0 && smallPrice > 0) {
        if (fullQty <= 0 || fullPrice <= 0 || smallQty >= fullQty) {
          setBulkAssistantStatus('Completa un envase completo válido y una presentación pequeña menor antes de aplicar Precio 1.', 'error');
          return false;
        }
        const smallPackageTotal = calculateTier1SmallPresentationTotal();
        if (smallPackageTotal === null || smallPackageTotal <= 0) {
          setBulkAssistantStatus('Completa una cantidad y un precio válidos para la presentación más pequeña; Precio 1 queda $3 por debajo de esa presentación.', 'error');
          return false;
        }
      }
      const basePrice = parseFloat(document.getElementById('asstBasePrice').value) || 1;
      const q2 = parseFloat(document.getElementById('asstQty2').value) || 500;
      const t2 = parseFloat(document.getElementById('asstTotal2').value) || 0;
      let d2 = 0;
      if(basePrice * q2 > 0 && t2 > 0) d2 = (1 - (t2 / (basePrice * q2))) * 100;

      const q3 = parseFloat(document.getElementById('asstQty3').value) || 700;
      const t3 = parseFloat(document.getElementById('asstTotal3').value) || 0;
      let d3 = 0;
      if(basePrice * q3 > 0 && t3 > 0) d3 = (1 - (t3 / (basePrice * q3))) * 100;

      const q4 = parseFloat(document.getElementById('asstQty4').value) || 1000;
      const t4 = parseFloat(document.getElementById('asstTotal4').value) || 0;
      let d4 = 0;
      if(basePrice * q4 > 0 && t4 > 0) d4 = (1 - (t4 / (basePrice * q4))) * 100;

      if(t2 === 0 || t3 === 0 || t4 === 0) {
        setBulkAssistantStatus('Primero calcula sugerencias o llena los tres montos.', 'error');
        return false;
      }

      if (smallQty > 0 && smallPrice > 0 && appState.volumeConfig[0]) {
        const tier = appState.volumeConfig[0];
        const smallPackageTotal = calculateTier1SmallPresentationTotal();
        if (!tier.smallPresentationBackup) {
          tier.smallPresentationBackup = { qty: tier.qty, discount: tier.discount };
        }
        tier.qty = smallQty;
        const tier1UnitPrice = smallPackageTotal / smallQty;
        tier.discount = Number(((1 - (tier1UnitPrice / basePrice)) * 100).toFixed(8));
      } else {
        restoreTier1AfterSmallPresentation();
      }

      if(appState.volumeConfig[1]) { appState.volumeConfig[1].qty = q2; appState.volumeConfig[1].discount = smallQty > 0 && smallPrice > 0 ? parseFloat(d2.toFixed(8)) : Math.max(0, parseFloat(d2.toFixed(2))); }
      if(appState.volumeConfig[2]) { appState.volumeConfig[2].qty = q3; appState.volumeConfig[2].discount = Math.max(0, parseFloat(d3.toFixed(2))); }
      if(appState.volumeConfig[3]) { appState.volumeConfig[3].qty = q4; appState.volumeConfig[3].discount = Math.max(0, parseFloat(d4.toFixed(2))); }

      saveLocal();
      const wasApplyingAutomaticCurve = automaticBulkCurveApplying;
      automaticBulkCurveApplying = true;
      try { runCalculations(); }
      finally { automaticBulkCurveApplying = wasApplyingAutomaticCurve; }
      if (!automatic) {
        closeBulkAssistant();
        showToast('Curva aplicada a escalas');
      }
      return true;
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
        const manualMargin = Number(document.getElementById('calcManualMargin').value);
        m = Number.isFinite(manualMargin) ? Math.min(99, Math.max(0, manualMargin)) : 0;
      } else {
        const rules = appState.margins[cat] || [{max: Infinity, m: 20}];
        m = (rules.find(r => totalCost <= r.max) || rules[rules.length-1]).m;
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
      scheduleAutomaticBulkCurve();
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

    function categoryNameKey(value) {
      return normalizeText(String(value || ''))
        .replace(/\s*\(?\s*pro\s*\d+(?:[.,]\d+)?\s*%?\s*\)?\s*$/i, '')
        .replace(/(\d)\s*(?:ml|lt|kg|g|l)\b/gi, '$1')
        .replace(/\b(?:ml|lt|kg|g|l|o|y)\b/gi, ' ')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function hasDuplicateCategoryNames(categories = []) {
      if (!Array.isArray(categories)) return false;
      const keys = new Set();
      return categories.some(category => {
        const key = categoryNameKey(category);
        if (!key || keys.has(key)) return true;
        keys.add(key);
        return false;
      });
    }

    function readCategoryAuditRecords() {
      try {
        const stored = JSON.parse(localStorage.getItem(cloudStorageKey('esquina_category_audit_v1')) || '[]');
        if (Array.isArray(stored) && stored.length) return stored;
      } catch (_) {}
      return appState.categories.map((name, order) => ({
        id: getCategoryId(appState, name), name, order, modifiedAt: null, deleted: false
      }));
    }

    function storeCategoryAuditRecords(records = {}) {
      const audit = Object.entries(records).map(([id, record]) => ({
        id,
        name: String(record?.name || ''),
        order: Number(record?.order) || 0,
        modifiedAt: Number(record?.modifiedAt) || 0,
        deleted: Boolean(record?.deleted)
      })).filter(record => record.name);
      localStorage.setItem(cloudStorageKey('esquina_category_audit_v1'), JSON.stringify(audit));
    }

    function toggleCategoryAudit() {
      const panel = document.getElementById('categoryAuditPanel');
      if (!panel) return;
      const opening = panel.classList.contains('hidden');
      panel.classList.toggle('hidden', !opening);
      if (opening) renderCategoryAudit();
    }

    function renderCategoryAudit() {
      const panel = document.getElementById('categoryAuditPanel');
      if (!panel) return;
      const records = readCategoryAuditRecords();
      const activeByKey = new Map();
      records.filter(record => !record.deleted).forEach(record => {
        const key = categoryNameKey(record.name);
        if (!activeByKey.has(key)) activeByKey.set(key, []);
        activeByKey.get(key).push(record);
      });
      const duplicateKeys = new Set([...activeByKey.entries()]
        .filter(([, group]) => group.length > 1)
        .map(([key]) => key));
      const sortedRecords = [...records].sort((a, b) =>
        categoryNameKey(a.name).localeCompare(categoryNameKey(b.name), 'es') ||
        (Number(b.modifiedAt) || 0) - (Number(a.modifiedAt) || 0)
      );
      const duplicateCount = duplicateKeys.size;
      panel.innerHTML = `
        <div class="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="text-xs font-black uppercase tracking-wide text-gray-800">Registro de categorías</h3>
              <p class="mt-1 text-[11px] text-gray-500">${records.length} registros · ${duplicateCount} grupos duplicados activos · ${auth.currentUser ? 'Datos de la nube' : 'Datos locales; inicia sesión para ver el registro completo de la nube'}</p>
            </div>
            <button type="button" onclick="refreshCategoryAuditFromCloud()" class="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[10px] font-black uppercase text-emerald-800">Actualizar registro</button>
          </div>
          <div class="max-h-80 overflow-auto rounded-xl border border-gray-100 bg-white">
            <table class="w-full min-w-[620px] text-left text-[10px]">
              <thead class="sticky top-0 bg-gray-50 text-gray-400"><tr><th class="p-2">Categoría</th><th class="p-2">Modificada</th><th class="p-2">Estado</th><th class="p-2">ID</th></tr></thead>
              <tbody>${sortedRecords.map(record => {
                const key = categoryNameKey(record.name);
                const activeGroup = (activeByKey.get(key) || []).sort((a, b) =>
                  (Number(b.modifiedAt) || 0) - (Number(a.modifiedAt) || 0) ||
                  (Number(a.order) || 0) - (Number(b.order) || 0)
                );
                const newest = activeGroup[0] === record;
                const isDuplicate = duplicateKeys.has(key);
                const status = record.deleted ? 'Retirada' : isDuplicate ? (newest ? 'Duplicada · más reciente' : 'Duplicada · anterior') : 'Activa';
                const time = Number(record.modifiedAt) > 0 ? new Date(Number(record.modifiedAt)).toLocaleString('es-MX') : 'Sin fecha registrada';
                return `<tr class="border-t border-gray-100"><td class="p-2 font-bold text-gray-700">${escapeHtml(record.name)}</td><td class="p-2 text-gray-500">${escapeHtml(time)}</td><td class="p-2 ${record.deleted ? 'text-gray-400' : isDuplicate ? 'font-black text-amber-700' : 'text-emerald-700'}">${status}</td><td class="max-w-[180px] truncate p-2 font-mono text-gray-400" title="${escapeHtmlAttr(record.id)}">${escapeHtml(record.id)}</td></tr>`;
              }).join('')}</tbody>
            </table>
          </div>
        </div>`;
    }

    function refreshCategoryAuditFromCloud() {
      if (!auth.currentUser) {
        renderCategoryAudit();
        return;
      }
      getUserConfigDoc()?.get({ source: 'server' }).then(snapshot => {
        if (snapshot.exists) storeCategoryAuditRecords(snapshot.data().categoryRecords || {});
        renderCategoryAudit();
      }).catch(error => {
        console.error('No se pudo actualizar el registro de categorías:', error);
        renderCategoryAudit();
      });
    }

    function getFilteredCategories(searchTerm = '') {
      const normalizedTerm = normalizeText(searchTerm);
      if (!normalizedTerm) return [...appState.categories];
      return appState.categories
        .filter(cat => normalizeText(cat).includes(normalizedTerm))
        .sort((a, b) => {
          const aText = normalizeText(a);
          const bText = normalizeText(b);
          const aStarts = aText.startsWith(normalizedTerm) ? 0 : 1;
          const bStarts = bText.startsWith(normalizedTerm) ? 0 : 1;
          return aStarts - bStarts || aText.localeCompare(bText, 'es', { sensitivity: 'base', numeric: true });
        });
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

      if (!cleanName) return;
      if (appState.categories.some(category => categoryNameKey(category) === categoryNameKey(cleanName))) {
        alert('Ya existe una categoría con ese nombre (sin distinguir mayúsculas, acentos o espacios).');
        return;
      }
      appState.categories.push(cleanName);
      appState.categoryIds[cleanName] = createCategoryId();
      appState.margins[cleanName] = [{max: Infinity, m: 20}];
      sortCategoriesAlphabetically();
    }

    function renameCategory(index, newName) {
      const old = appState.categories[index];
      const cleanName = newName ? newName.trim() : '';
      if (!cleanName) {
        renderCategoryManager();
        return;
      }

      const conflicts = appState.categories.some((category, categoryIndex) =>
        categoryIndex !== index && categoryNameKey(category) === categoryNameKey(cleanName)
      );
      if (conflicts) {
        alert('Ya existe otra categoría con ese nombre (sin distinguir mayúsculas, acentos o espacios).');
        renderCategoryManager();
        return;
      }

      if (cleanName && old !== cleanName) {
        appState.categoryIds[cleanName] = getCategoryId(appState, old);
        delete appState.categoryIds[old];
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
        if (appState.categories.length <= 1) {
          alert('Debe conservar al menos una categoría.');
          return;
        }
        const name = appState.categories[index];
        appState.categories.splice(index, 1);
        delete appState.categoryIds[name];
        delete appState.margins[name];
        if (appState.categoryMetadata) delete appState.categoryMetadata[name];
        renderCategoryManager();
        renderConfigTables();
        saveLocal();
        handleCategoryChange();
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
          <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_1.25rem] gap-2 mb-2 px-1 text-[9px] font-black uppercase tracking-widest text-gray-400">
            <span>Rango de precio</span>
            <span>Porcentaje de margen</span>
            <span></span>
          </div>
          <div class="mb-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3">
            <label for="margin-paste-${slugifyDomId(cat)}" class="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Pegar tabla desde Excel o Google Sheets</label>
            <textarea id="margin-paste-${slugifyDomId(cat)}" rows="3" placeholder="50&#9;50&#10;100&#9;45&#10;150&#9;41" class="w-full resize-y rounded-lg border border-gray-200 bg-white p-2 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-gray-200"></textarea>
            <div class="mt-2 flex items-center justify-between gap-3">
              <span class="text-[9px] font-medium text-gray-400">Dos columnas: rango y porcentaje.</span>
              <button type="button" onclick="replaceMarginTable(${safeCatAction})" class="shrink-0 rounded-lg bg-gray-800 px-3 py-2 text-[9px] font-black uppercase text-white hover:bg-gray-900 transition">Reemplazar rangos</button>
            </div>
          </div>
          <div class="space-y-3 mb-4">`;

        (appState.margins[cat] || []).forEach((rule, idx) => {
          html += `<div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_1.25rem] items-center gap-2">
            <input type="number" min="0" step="any" value="${rule.max === Infinity ? '' : Number(rule.max) || 0}" placeholder="Infinito" oninput="updateMarginRule(${safeCatAction}, ${idx}, 'max', this.value)" onkeydown="handleMarginRuleKeydown(event, ${safeCatAction})" class="w-full p-2 border rounded-lg font-bold text-xs bg-gray-50 shadow-inner">
            <input type="number" min="0" max="99" step="any" value="${Number(rule.m) || 0}" oninput="updateMarginRule(${safeCatAction}, ${idx}, 'm', this.value)" onkeydown="handleMarginRuleKeydown(event, ${safeCatAction})" class="w-full p-2 border rounded-lg font-bold text-xs text-gray-700 bg-gray-50 shadow-inner">
            <button onclick="removeMarginRow(${safeCatAction}, ${idx})" class="text-red-200 hover:text-red-500"><i data-lucide="x-circle" class="w-4 h-4"></i></button>
          </div>`;
        });

        html += `</div>
          <div class="flex gap-2">
            <button onclick="addMarginRow(${safeCatAction})" class="flex-1 border-2 border-dashed border-gray-100 py-2 rounded-xl text-[9px] font-black text-gray-400 uppercase hover:text-gray-700">+ Añadir Rango</button>
            <button type="button" onclick="confirmMarginRules(${safeCatAction})" class="w-11 border border-emerald-200 bg-emerald-50 text-emerald-600 rounded-xl inline-flex items-center justify-center hover:bg-emerald-100 transition" title="Confirmar y ordenar rangos" aria-label="Confirmar y ordenar rangos">
              <i data-lucide="check" class="w-4 h-4"></i>
            </button>
          </div>
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

    function sortMarginRules(cat) {
      const rules = appState.margins[cat] || [];
      rules.sort((a, b) => {
        const maxA = Number.isFinite(a.max) ? a.max : Infinity;
        const maxB = Number.isFinite(b.max) ? b.max : Infinity;
        return maxA - maxB;
      });
    }

    function confirmMarginRules(cat) {
      sortMarginRules(cat);
      saveLocal();
      runCalculations();
      renderConfigTables();
      showToast('Rangos confirmados y ordenados');
    }

    function handleMarginRuleKeydown(event, cat) {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      confirmMarginRules(cat);
    }

    function parseMarginTable(raw) {
      const lines = String(raw || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      const rules = [];

      const parseLocaleNumber = value => {
        let text = String(value).replace(/[$%\s]/g, '');
        const comma = text.lastIndexOf(',');
        const dot = text.lastIndexOf('.');
        if (comma >= 0 && dot >= 0) {
          text = comma > dot
            ? text.replace(/\./g, '').replace(',', '.')
            : text.replace(/,/g, '');
        } else if (comma >= 0) {
          text = text.replace(',', '.');
        }
        return Number(text);
      };

      for (let index = 0; index < lines.length; index += 1) {
        const columns = lines[index].split(/\s+/).map(value => value.trim()).filter(Boolean);
        if (columns.length !== 2) {
          return { error: `La fila ${index + 1} debe tener rango y porcentaje.` };
        }

        const maxText = columns[0].toLowerCase();
        const max = ['infinito', 'infinity', '∞'].includes(maxText)
          ? Infinity
          : parseLocaleNumber(columns[0]);
        const margin = parseLocaleNumber(columns[1]);

        if ((!Number.isFinite(max) && max !== Infinity) || max < 0 || !Number.isFinite(margin) || margin < 0 || margin > 99) {
          return { error: `La fila ${index + 1} contiene valores inválidos.` };
        }

        rules.push({ max, m: margin });
      }

      if (rules.length === 0) return { error: 'Pega al menos una fila de rangos.' };
      return { rules };
    }

    function replaceMarginTable(cat) {
      const textarea = document.getElementById(`margin-paste-${slugifyDomId(cat)}`);
      const result = parseMarginTable(textarea?.value);
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }

      appState.margins[cat] = result.rules;
      sortMarginRules(cat);
      saveLocal();
      runCalculations();
      renderConfigTables();
      showToast('Rangos reemplazados y ordenados');
    }

    function addMarginRow(cat) { appState.margins[cat].push({max: 2000, m: 15}); saveLocal(); renderConfigTables(); }
    function removeMarginRow(cat, idx) { appState.margins[cat].splice(idx, 1); saveLocal(); renderConfigTables(); }
    function updateMarginRule(cat, idx, field, val) {
      const rule = appState.margins[cat]?.[idx];
      if (!rule) return;
      if (field === 'max' && String(val).trim() === '') {
        rule.max = Infinity;
      } else {
        const parsed = Number(val);
        if (!Number.isFinite(parsed)) return;
        if (field === 'm') rule.m = Math.min(99, Math.max(0, parsed));
        else if (field === 'max') rule.max = Math.max(0, parsed);
        else return;
      }
      saveLocal();
      runCalculations();
    }

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

    let cloudUnsubscribe = null;
    let cloudReady = false;
    let cloudDirty = false;
    let cloudWriteTimer = null;
    let cloudRevision = null;
    let applyingCloudState = false;
    let cloudConflict = false;
    let cloudMergeInProgress = false;
    let cloudSnapshotQueued = false;

    function cloudStorageKey(key) {
      const uid = auth.currentUser?.uid || 'anonymous';
      return `${key}_${uid}`;
    }

    function categoryCloudId(category) {
      const encoded = Array.from(String(category)).map(char => char.codePointAt(0).toString(16)).join('-');
      return `cat_${encoded || 'empty'}`;
    }

    function createCategoryId() {
      if (window.crypto?.randomUUID) return `cat_${window.crypto.randomUUID()}`;
      return `cat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    }

    function getCategoryId(state, category) {
      if (!state.categoryIds || typeof state.categoryIds !== 'object') state.categoryIds = {};
      if (!state.categoryIds[category]) state.categoryIds[category] = categoryCloudId(category);
      return state.categoryIds[category];
    }

    function findDuplicateCloudCategoryRecords(records = {}) {
      const activeRecords = Object.entries(records)
        .filter(([, record]) => record && !record.deleted && typeof record.name === 'string')
        .sort((a, b) =>
          (Number(b[1].modifiedAt) || 0) - (Number(a[1].modifiedAt) || 0) ||
          (Number(a[1].order) || 0) - (Number(b[1].order) || 0)
        );
      const seen = new Set();
      return activeRecords.filter(([, record]) => {
        const key = categoryNameKey(record.name);
        if (!key || !seen.has(key)) {
          seen.add(key);
          return false;
        }
        return true;
      });
    }

    function cloudCategoryRecord(state, category, modifiedAt = Date.now()) {
      const order = state.categories?.indexOf(category) ?? -1;
      return {
        name: category,
        order: order < 0 ? (state.categories?.length || 0) : order,
        margins: (state.margins?.[category] || [{ max: null, m: 20 }]).map(rule => ({
          max: rule.max === Infinity ? null : Number(rule.max),
          m: Number(rule.m) || 0
        })),
        metadata: state.categoryMetadata?.[category] || null,
        deleted: false,
        modifiedAt
      };
    }

    function cloudCategoryRecordsFromState(state, modifiedAt = Date.now()) {
      return Object.fromEntries([...new Set(state.categories || [])].map(category => [
        getCategoryId(state, category), cloudCategoryRecord(state, category, modifiedAt)
      ]));
    }

    function categoryRecordSignature(record) {
      if (!record) return '';
      return encodeStateForStorage({
        name: record.name,
        order: Number(record.order) || 0,
        margins: record.margins || [],
        metadata: record.metadata || null,
        deleted: Boolean(record.deleted)
      });
    }

    function shouldApplyPendingCategoryChange(change, cloudRecord, baselineRecord) {
      const localDeleted = Boolean(change?.record?.deleted);
      const cloudDeleted = Boolean(cloudRecord?.deleted);
      if (cloudDeleted) return localDeleted;
      if (localDeleted) return true;
      const remoteChanged = categoryRecordSignature(cloudRecord) !== categoryRecordSignature(baselineRecord);
      return !cloudRecord || !remoteChanged || Number(change?.modifiedAt) >= Number(cloudRecord.modifiedAt || 0);
    }

    function categoryChangeRecordForCloud(change, cloudRecord) {
      const localDeleted = Boolean(change?.record?.deleted);
      const proposedAt = Number(change?.modifiedAt) || Date.now();
      const modifiedAt = localDeleted && cloudRecord
        ? Math.max(proposedAt, (Number(cloudRecord.modifiedAt) || 0) + 1)
        : proposedAt;
      return { ...change.record, modifiedAt };
    }

    function mergeConcurrentCategoryRecord(change, cloudRecord, baselineRecord) {
      if (!cloudRecord || !baselineRecord || cloudRecord.deleted) return null;
      const merged = { ...cloudRecord };
      let localFieldApplied = false;
      const localIsNewer = Number(change?.modifiedAt) >= Number(cloudRecord.modifiedAt || 0);
      ['name', 'order', 'margins', 'metadata'].forEach(field => {
        const valueSignature = (record) => Object.prototype.hasOwnProperty.call(record || {}, field)
          ? encodeStateForStorage(record[field]) : '__MISSING__';
        const baselineValue = valueSignature(baselineRecord);
        const localValue = valueSignature(change.record);
        const remoteValue = valueSignature(cloudRecord);
        const localChanged = localValue !== baselineValue;
        const remoteChanged = remoteValue !== baselineValue;
        if (localChanged && (!remoteChanged || localIsNewer)) {
          merged[field] = change.record[field];
          localFieldApplied = true;
        }
      });
      if (!localFieldApplied) return null;
      merged.deleted = false;
      merged.modifiedAt = Math.max(Number(change.modifiedAt) || Date.now(), (Number(cloudRecord.modifiedAt) || 0) + 1);
      return merged;
    }

    function volumeConfigSignature(volumeConfig) {
      return encodeStateForStorage(Array.isArray(volumeConfig) ? volumeConfig : []);
    }

    function localCloudStateSignature(state) {
      return encodeStateForStorage({
        categoryRecords: cloudCategoryRecordsFromState(state, 0),
        volumeConfig: state.volumeConfig || []
      });
    }

    function readCloudPending() {
      const key = cloudStorageKey(CONFIG.CLOUD_PENDING_KEY);
      try {
        const pending = JSON.parse(localStorage.getItem(key) || '{}');
        if (auth.currentUser) {
          const anonymousKey = `${CONFIG.CLOUD_PENDING_KEY}_anonymous`;
          const anonymousPending = JSON.parse(localStorage.getItem(anonymousKey) || '{}');
          Object.entries(anonymousPending).forEach(([id, change]) => {
            if (!pending[id] || Number(change?.modifiedAt) > Number(pending[id]?.modifiedAt)) pending[id] = change;
          });
          if (Object.keys(anonymousPending).length) {
            localStorage.setItem(key, JSON.stringify(pending));
            localStorage.removeItem(anonymousKey);
          }
        }
        return pending;
      }
      catch (_) { return {}; }
    }

    function writeCloudPending(pending) {
      localStorage.setItem(cloudStorageKey(CONFIG.CLOUD_PENDING_KEY), JSON.stringify(pending));
    }

    function readCloudSyncBase() {
      try { return JSON.parse(localStorage.getItem(cloudStorageKey(CONFIG.CLOUD_BASE_KEY)) || 'null'); }
      catch (_) { return null; }
    }

    function markLocalCloudChanges(previousState, nextState) {
      if (applyingCloudState) return;
      const pending = readCloudPending();
      const base = readCloudSyncBase();
      const previousRecords = previousState ? cloudCategoryRecordsFromState(previousState, 0) : {};
      const nextRecords = cloudCategoryRecordsFromState(nextState, 0);
      const baselineRecords = base?.categoryRecords || {};
      const allIds = new Set([...Object.keys(previousRecords), ...Object.keys(nextRecords), ...Object.keys(baselineRecords)]);

      for (const id of allIds) {
        const before = previousRecords[id];
        const after = nextRecords[id];
        const baseline = baselineRecords[id];
        const changedInThisSave = categoryRecordSignature(before) !== categoryRecordSignature(after);
        const afterForComparison = after || (baseline?.deleted ? baseline : null);
        const differsFromCloudBase = base
          ? categoryRecordSignature(afterForComparison) !== categoryRecordSignature(baseline)
          : changedInThisSave || Boolean(pending[id]);
        if (!differsFromCloudBase) {
          delete pending[id];
          continue;
        }
        if (changedInThisSave || !pending[id]) {
          const priorModifiedAt = Number(pending[id]?.modifiedAt) || 0;
          const modifiedAt = Math.max(Date.now(), priorModifiedAt + 1);
          const record = after || { ...(before || baseline), deleted: true };
          pending[id] = { modifiedAt, record: { ...record, modifiedAt } };
        }
      }

      const previousVolume = previousState?.volumeConfig || [];
      const nextVolume = nextState.volumeConfig || [];
      const baseVolume = base?.settings?.volumeConfig || [];
      const changedVolumeThisSave = volumeConfigSignature(previousVolume) !== volumeConfigSignature(nextVolume);
      const differsFromVolumeBase = base
        ? volumeConfigSignature(nextVolume) !== volumeConfigSignature(baseVolume)
        : changedVolumeThisSave || Boolean(pending.__settings);
      if (!differsFromVolumeBase) {
        delete pending.__settings;
      } else if (changedVolumeThisSave || !pending.__settings) {
        const priorModifiedAt = Number(pending.__settings?.modifiedAt) || 0;
        pending.__settings = {
          modifiedAt: Math.max(Date.now(), priorModifiedAt + 1),
          volumeConfig: nextVolume
        };
      }

      writeCloudPending(pending);
    }

    function cloudV2ToAppState(remote, fallbackState = appState) {
      const records = remote?.categoryRecords || {};
      const duplicateIds = new Set(findDuplicateCloudCategoryRecords(records).map(([id]) => id));
      const activeRecords = Object.entries(records)
        .filter(([, record]) => record && !record.deleted && typeof record.name === 'string')
        .filter(([id]) => !duplicateIds.has(id))
        .map(([id, record]) => ({ id, ...record }))
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || a.name.localeCompare(b.name, 'es'));
      const categories = activeRecords.map(record => record.name);
      const margins = {};
      const categoryMetadata = {};
      const categoryIds = {};
      activeRecords.forEach(record => {
        margins[record.name] = Array.isArray(record.margins) ? record.margins : [{ max: null, m: 20 }];
        if (!categoryIds[record.name]) categoryIds[record.name] = record.id;
        if (record.metadata && typeof record.metadata === 'object') categoryMetadata[record.name] = record.metadata;
      });
      return normalizeAppState({
        ...fallbackState,
        categories,
        margins,
        categoryIds,
        categoryMetadata,
        volumeConfig: remote?.settings?.volumeConfig || fallbackState.volumeConfig
      });
    }

    function storeCloudSyncBase(remote) {
      localStorage.setItem(cloudStorageKey(CONFIG.CLOUD_BASE_KEY), JSON.stringify({
        categoryRecords: remote?.categoryRecords || {},
        settings: { volumeConfig: remote?.settings?.volumeConfig || [] }
      }));
    }

    function hasPendingCloudChanges() {
      return Object.keys(readCloudPending()).length > 0;
    }

    const AUTO_BACKUP_INTERVAL_MS = 5 * 60 * 1000;
    let lastAutomaticBackupAt = 0;

    function saveLocalBackup(raw, reason = 'Respaldo automático') {
      if (!raw) return;
      const isAutomatic = reason === 'Respaldo automático';
      const now = Date.now();
      if (isAutomatic && now - lastAutomaticBackupAt < AUTO_BACKUP_INTERVAL_MS) return;
      try {
        const backups = JSON.parse(localStorage.getItem(CONFIG.BACKUPS_KEY) || '[]')
          .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
        if (isAutomatic && backups[0]?.data === raw) {
          lastAutomaticBackupAt = now;
          return;
        }
        if (backups[0]?.data === raw) return;
        backups.unshift({ createdAt: new Date().toISOString(), reason, categories: normalizeAppState(decodeStateFromStorage(raw)).categories.length, data: raw });
        backups.splice(1);
        localStorage.setItem(CONFIG.BACKUPS_KEY, JSON.stringify(backups));
        if (isAutomatic) lastAutomaticBackupAt = now;
        renderLocalBackups();
      } catch (error) {
        console.warn('No se pudo guardar el respaldo local:', error);
      }
    }

    function renderLocalBackups() {
      const select = document.getElementById('localBackupSelect');
      if (!select) return;
      let backups = [];
      try { backups = JSON.parse(localStorage.getItem(CONFIG.BACKUPS_KEY) || '[]'); } catch (_) {}
      backups.sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
      if (backups.length > 1) {
        backups = backups.slice(0, 1);
        try { localStorage.setItem(CONFIG.BACKUPS_KEY, JSON.stringify(backups)); } catch (_) {}
      }
      const latestAutomaticBackupAt = backups
        .filter(backup => backup.reason === 'Respaldo automático')
        .reduce((latest, backup) => Math.max(latest, Date.parse(backup.createdAt) || 0), 0);
      lastAutomaticBackupAt = Math.max(lastAutomaticBackupAt, latestAutomaticBackupAt);
      const status = document.getElementById('localBackupStatus');
      if (status) {
        const latest = backups[0];
        status.textContent = latest
          ? `Último respaldo: ${new Date(latest.createdAt).toLocaleString('es-MX')} · ${latest.categories} categorías · ${latest.reason}`
          : 'Aún no hay respaldos guardados en este navegador.';
      }
      select.innerHTML = '<option value="">Selecciona un respaldo guardado en este navegador...</option>' + backups.map((backup, index) => {
        const date = new Date(backup.createdAt).toLocaleString('es-MX');
        return `<option value="${index}">${escapeHtml(date)} · ${backup.categories} categorías · ${escapeHtml(backup.reason)}</option>`;
      }).join('');
    }

    function restoreLocalBackup() {
      const select = document.getElementById('localBackupSelect');
      const index = Number(select?.value);
      let backups = [];
      try { backups = JSON.parse(localStorage.getItem(CONFIG.BACKUPS_KEY) || '[]'); } catch (_) {}
      const backup = backups[index];
      if (!backup || !confirm(`¿Restaurar el respaldo con ${backup.categories} categorías? Se guardará la configuración actual antes de reemplazarla. No se subirá a la nube automáticamente.`)) return;
      const previousRaw = localStorage.getItem(CONFIG.LS_KEY);
      saveLocalBackup(previousRaw, 'Antes de restaurar');
      const previousState = previousRaw ? normalizeAppState(decodeStateFromStorage(previousRaw)) : null;
      const restoredState = normalizeAppState(decodeStateFromStorage(backup.data));
      markLocalCloudChanges(previousState, restoredState);
      applyingCloudState = true;
      try {
        appState = restoredState;
        localStorage.setItem(CONFIG.LS_KEY, encodeStateForStorage(appState));
      } finally { applyingCloudState = false; }
      cloudDirty = true;
      cloudConflict = false;
      renderCategoryManager();
      renderConfigTables();
      updateCategoryDropdowns();
      handleCategoryChange();
      alert('Respaldo restaurado en este navegador. Revisa las categorías antes de elegir “Guardar en Nube”.');
    }

    function createLocalBackup() {
      saveLocalBackup(localStorage.getItem(CONFIG.LS_KEY) || encodeStateForStorage(appState), 'Respaldo manual');
      renderLocalBackups();
      alert('Respaldo guardado en este navegador.');
    }

    function createAutomaticLocalBackup() {
      const current = localStorage.getItem(CONFIG.LS_KEY) || encodeStateForStorage(appState);
      saveLocalBackup(current, 'Respaldo automático');
    }

    function exportMarginConfig() {
      const margins = Object.fromEntries(appState.categories.map(category => [
        category,
        (appState.margins[category] || []).map(rule => ({ max: rule.max === Infinity ? null : Number(rule.max), m: Number(rule.m) }))
      ]));
      const exportData = {
        format: 'calculator-margin-config/v1',
        source: 'La Esquina del Agricultor',
        exportedAt: new Date().toISOString(),
        categoryCount: appState.categories.length,
        margins
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `calculator-margins-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }

    async function importMarginConfigFile(input) {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const imported = JSON.parse(await file.text());
        const isMarginExport = imported.format === 'calculator-margin-config/v1';
        const isAppState = Array.isArray(imported.categories);
        if ((!isMarginExport && !isAppState) || !imported.margins || typeof imported.margins !== 'object' || Array.isArray(imported.margins)) {
          throw new Error('El archivo debe ser calculator-margin-config/v1 o un estado exportado de la calculadora.');
        }
        if (imported.categoryMetadata && (typeof imported.categoryMetadata !== 'object' || Array.isArray(imported.categoryMetadata))) {
          throw new Error('Los metadatos de categorías del archivo no son válidos.');
        }
        const categories = isAppState ? imported.categories : Object.keys(imported.margins);
        if (!categories.length || new Set(categories).size !== categories.length || hasDuplicateCategoryNames(categories) ||
          (isMarginExport && categories.length !== Number(imported.categoryCount)) ||
          categories.some(category => typeof category !== 'string' || !category.trim() || !Object.hasOwn(imported.margins, category))) {
          throw new Error('Las categorías del archivo están vacías, duplicadas o no coinciden con sus márgenes.');
        }
        for (const category of categories) {
          const rules = imported.margins[category];
          if (!category.trim() || !Array.isArray(rules) || !rules.length || rules.some(rule => {
            const max = rule.max === null || rule.max === '' ? Infinity : Number(rule.max);
            const margin = Number(rule.m);
            return (max !== Infinity && (!Number.isFinite(max) || max < 0)) || !Number.isFinite(margin) || margin < 0 || margin > 99;
          })) throw new Error(`Hay reglas inválidas en la categoría “${category}”.`);
        }
        if (!confirm(`El archivo contiene ${categories.length} categorías. Se reemplazarán las categorías y márgenes actuales; las imágenes y los ajustes de volumen se conservarán cuando sea posible. Se guardará un respaldo local antes de importar. ¿Continuar?`)) return;

        const previousRaw = localStorage.getItem(CONFIG.LS_KEY);
        saveLocalBackup(previousRaw, 'Antes de importar archivo');
        const previousState = previousRaw ? normalizeAppState(decodeStateFromStorage(previousRaw)) : null;
        const categoryMetadata = Object.fromEntries(categories
          .filter(category => appState.categoryMetadata?.[category])
          .map(category => [category, appState.categoryMetadata[category]]));
        const importedState = normalizeAppState({
          ...appState,
          categories,
          margins: imported.margins,
          volumeConfig: Array.isArray(imported.volumeConfig) ? imported.volumeConfig : appState.volumeConfig,
          categoryMetadata: { ...categoryMetadata, ...(imported.categoryMetadata || {}) }
        });
        markLocalCloudChanges(previousState, importedState);
        appState = importedState;
        applyingCloudState = true;
        try { localStorage.setItem(CONFIG.LS_KEY, encodeStateForStorage(appState)); }
        finally { applyingCloudState = false; }
        cloudDirty = true;
        cloudConflict = false;
        renderCategoryManager();
        renderConfigTables();
        updateCategoryDropdowns();
        handleCategoryChange();
        renderLocalBackups();
        alert(`Importación lista: ${categories.length} categorías. Se guardó solo en este navegador; usa “Guardar en Nube” si quieres subirla a Firebase.`);
      } catch (error) {
        alert(`No se pudo importar el archivo: ${error.message}`);
      } finally {
        input.value = '';
      }
    }

    function saveLocal() {
      const previous = localStorage.getItem(CONFIG.LS_KEY);
      const next = encodeStateForStorage(appState);
      if (previous && previous !== next) saveLocalBackup(previous);
      if (!applyingCloudState && previous !== next) {
        const previousState = previous ? normalizeAppState(decodeStateFromStorage(previous)) : null;
        markLocalCloudChanges(previousState, appState);
      }
      localStorage.setItem(CONFIG.LS_KEY, next);
      if (!applyingCloudState && auth.currentUser && cloudReady) {
        cloudDirty = true;
        clearTimeout(cloudWriteTimer);
        cloudWriteTimer = setTimeout(() => syncToCloud(true), 1500);
      }
    }

    function saveAllConfig() {
      for(let cat in appState.margins) sortMarginRules(cat);
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
      const gap = 8;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const opensUpward = spaceBelow < 240 && spaceAbove > spaceBelow;
      suggestions.style.left = `${rect.left}px`;
      suggestions.style.width = `${rect.width}px`;
      suggestions.style.right = 'auto';
      suggestions.style.marginTop = '0';
      suggestions.style.maxHeight = `${Math.max(180, Math.min(window.innerHeight * 0.6, opensUpward ? spaceAbove : spaceBelow))}px`;
      if (opensUpward) {
        suggestions.style.top = 'auto';
        suggestions.style.bottom = `${window.innerHeight - rect.top + gap}px`;
      } else {
        suggestions.style.bottom = 'auto';
        suggestions.style.top = `${rect.bottom + gap}px`;
      }
    }

    function renderCategorySuggestions(categories = [], highlightedIndex = -1) {
      const suggestions = ensureCategorySuggestionsPortal();
      if (!suggestions) return;

      const limitedCategories = categories.slice(0, 50);
      const selectedCategory = document.getElementById('calcCategory')?.value || '';
      const searchTerm = normalizeText(document.getElementById('calcCategorySearch')?.value || '');
      const resultLabel = categories.length > limitedCategories.length
        ? `Mostrando ${limitedCategories.length} de ${categories.length}`
        : `${categories.length} ${categories.length === 1 ? 'resultado' : 'resultados'}`;

      if (limitedCategories.length === 0) {
        suggestions.innerHTML = `
          <div class="category-suggestions-header">
            <span>Sin coincidencias</span>
            <span class="category-suggestions-count">Prueba otra palabra</span>
          </div>
        `;
        positionCategorySuggestions();
        suggestions.classList.remove('hidden');
        categorySuggestionIndex = -1;
        return;
      }

      suggestions.innerHTML = `
        <div class="category-suggestions-header">
          <span>${searchTerm ? 'Selecciona una categoría' : 'Categorías disponibles'}</span>
          <span class="category-suggestions-count">${resultLabel}</span>
        </div>
        ${limitedCategories.map((cat, index) => {
        const isActive = index === highlightedIndex;
        const isSelected = normalizeText(cat) === normalizeText(selectedCategory);
        const safeLabel = escapeHtml(String(cat || '').toUpperCase());
        const safeValue = encodeURIComponent(cat);
        return `
          <button
            type="button"
            onmousedown="event.preventDefault(); selectCategorySuggestion(decodeURIComponent('${safeValue}'))"
            aria-selected="${isSelected}"
            class="category-suggestion-option ${isActive ? 'is-highlighted' : ''} ${isSelected ? 'is-selected' : ''}"
          >
            <span class="category-suggestion-label">${safeLabel}</span>
            ${isSelected ? '<span class="category-suggestion-check" aria-label="Seleccionada">&#10003;</span>' : ''}
          </button>
        `;
      }).join('')}
      `;

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
      selectCategorySearchText();
      renderCategorySuggestions(getFilteredCategories(''), -1);
    }

    function selectCategorySearchText() {
      const input = document.getElementById('calcCategorySearch');
      if (!input) return;
      setTimeout(() => input.select(), 0);
    }

    function handleCategoryInputBlur() {
      const input = document.getElementById('calcCategorySearch');
      const select = document.getElementById('calcCategory');

      if (!input) return;

      setTimeout(() => {
        const typedCategory = appState.categories.find(category =>
          normalizeText(category) === normalizeText(input.value)
        );
        const activeCategory = select?.value;

        if (typedCategory) {
          setCurrentCategory(typedCategory, typedCategory !== activeCategory);
          return;
        }

        const fallbackValue = activeCategory || input.dataset.previousValue || appState.categories[0] || '';
        if (fallbackValue) setCurrentCategory(fallbackValue, false);
        else hideCategorySuggestions();
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

      if (normalizeText(term) === '') {
        hideCategorySuggestions();
        return;
      }

      renderCategorySuggestions(filteredCategories, -1);
    }

    function handleCategorySearchKeydown(event) {
      const input = document.getElementById('calcCategorySearch');
      if (!input) return;

      const filteredCategories = getFilteredCategories(input.value).slice(0, 50);

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
        const fallbackValue = document.getElementById('calcCategory')?.value || input.dataset.previousValue || '';
        if (fallbackValue) setCurrentCategory(fallbackValue, false);
        else hideCategorySuggestions();
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
        startCloudSync();
      } else {
        if (cloudUnsubscribe) cloudUnsubscribe();
        cloudUnsubscribe = null;
        cloudReady = false;
        cloudDirty = false;
        cloudConflict = false;
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

    function renderCloudState(message, error = false) {
      const status = document.getElementById('auth-status-text');
      if (status) status.textContent = message;
      const dot = document.getElementById('auth-status-dot');
      if (dot) dot.className = `w-2.5 h-2.5 rounded-full ${error ? 'bg-amber-500' : 'bg-green-500'} shadow-md`;
    }

    function applyCloudData(remote) {
      const incomingState = cloudV2ToAppState(remote, appState);
      const currentRaw = localStorage.getItem(CONFIG.LS_KEY);
      if (currentRaw) saveLocalBackup(currentRaw, 'Antes de combinar cambios de nube');
      applyingCloudState = true;
      try {
        appState = incomingState;
        saveLocal();
        storeCloudSyncBase(remote);
        writeCloudPending({});
      } finally {
        applyingCloudState = false;
      }
      cloudDirty = false;
      cloudConflict = false;
      renderCategoryManager();
      renderConfigTables();
      updateCategoryDropdowns();
      handleCategoryChange();
    }

    async function migrateLegacyCloudDocument(docRef) {
      return db.runTransaction(async transaction => {
        const snapshot = await transaction.get(docRef);
        if (!snapshot.exists) return null;
        const remote = snapshot.data();
        if (Number(remote.syncVersion) === 2) return remote;

        const oldState = remote.data
          ? normalizeAppState(decodeStateFromStorage(remote.data))
          : normalizeAppState({});
        const revision = remote.updatedAt?.toMillis?.() || Date.now();
        const categoryRecords = cloudCategoryRecordsFromState(oldState, revision);
        const localRaw = localStorage.getItem(CONFIG.LS_KEY);
        if (localRaw) {
          saveLocalBackup(localRaw, 'Antes de migrar la nube a sincronización por cambios');
          const localState = normalizeAppState(decodeStateFromStorage(localRaw));
          const cloudNames = new Set(oldState.categories);
          localState.categories.forEach((category, index) => {
            if (!cloudNames.has(category)) {
              categoryRecords[getCategoryId(localState, category)] = {
                ...cloudCategoryRecord(localState, category, Date.now()),
                order: oldState.categories.length + index
              };
            }
          });
        }

        const settings = {
          volumeConfig: oldState.volumeConfig,
          modifiedAt: revision
        };
        transaction.set(docRef, {
          syncVersion: 2,
          categoryRecords,
          settings,
          legacyData: typeof remote.data === 'string' ? remote.data : null,
          data: firebase.firestore.FieldValue.delete(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return { syncVersion: 2, categoryRecords, settings };
      });
    }

    function startCloudSync() {
      if (cloudUnsubscribe) cloudUnsubscribe();
      cloudReady = false;
      cloudConflict = false;
      const docRef = getUserConfigDoc();
      if (!docRef) return;

      const processSnapshot = async snapshot => {
        if (cloudMergeInProgress) return;
        if (!snapshot.exists) {
          cloudReady = true;
          cloudRevision = null;
          await syncToCloud(true);
          return;
        }

        const remote = snapshot.data();
        if (Number(remote.syncVersion) !== 2) {
          cloudReady = false;
          cloudMergeInProgress = true;
          try {
            await migrateLegacyCloudDocument(docRef);
          } finally {
            cloudMergeInProgress = false;
            cloudSnapshotQueued = false;
          }
          const migrated = await docRef.get({ source: 'server' });
          if (migrated.exists) await processSnapshot(migrated);
          return;
        }

        storeCategoryAuditRecords(remote.categoryRecords || {});

        const duplicateCategoryRecords = findDuplicateCloudCategoryRecords(remote.categoryRecords || {});
        if (duplicateCategoryRecords.length) {
          storeCloudSyncBase(remote);
          const deduplicatedState = cloudV2ToAppState(remote, appState);
          const pending = readCloudPending();
          const modifiedAt = Date.now();
          const duplicateKeys = new Set(duplicateCategoryRecords.map(([, record]) => categoryNameKey(record.name)));
          deduplicatedState.categories.forEach(category => {
            if (!duplicateKeys.has(categoryNameKey(category))) return;
            const id = getCategoryId(deduplicatedState, category);
            if (pending[id]) return;
            const record = cloudCategoryRecord(deduplicatedState, category, modifiedAt);
            pending[id] = { modifiedAt, record };
          });
          duplicateCategoryRecords.forEach(([id, record]) => {
            const tombstoneAt = Math.max(modifiedAt, Number(record.modifiedAt || 0) + 1);
            pending[id] = {
              modifiedAt: tombstoneAt,
              record: { ...record, deleted: true, modifiedAt: tombstoneAt }
            };
          });
          writeCloudPending(pending);
          cloudReady = true;
          await syncToCloud(true);
          return;
        }

        cloudReady = true;
        cloudRevision = remote.updatedAt?.toMillis?.() ?? Date.now();
        if (!readCloudSyncBase() && !hasPendingCloudChanges()) {
          const localRaw = localStorage.getItem(CONFIG.LS_KEY);
          if (localRaw) {
            const localState = normalizeAppState(decodeStateFromStorage(localRaw));
            const cloudNames = new Set(Object.values(remote.categoryRecords || {})
              .filter(record => record && !record.deleted)
              .map(record => record.name));
            const localOnlyCategories = localState.categories.filter(category => !cloudNames.has(category));
            if (localOnlyCategories.length) {
              saveLocalBackup(localRaw, 'Antes de combinar categorías locales nuevas');
              const pending = readCloudPending();
              localOnlyCategories.forEach(category => {
                const modifiedAt = Date.now();
                const record = cloudCategoryRecord(localState, category, modifiedAt);
                pending[getCategoryId(localState, category)] = { modifiedAt, record };
              });
              writeCloudPending(pending);
              await syncToCloud(true);
              return;
            }
          }
        }
        if (hasPendingCloudChanges()) {
          await syncToCloud(true);
        } else {
          const localRaw = localStorage.getItem(CONFIG.LS_KEY);
          const localState = localRaw ? normalizeAppState(decodeStateFromStorage(localRaw)) : null;
          const incomingState = cloudV2ToAppState(remote, appState);
          const localSig = localState ? localCloudStateSignature(localState) : '';
          const incomingSig = localCloudStateSignature(incomingState);
          const hasBase = Boolean(readCloudSyncBase());
          if (!hasBase && localState && localSig !== incomingSig) {
            saveLocalBackup(localRaw, 'Copia local previa a la sincronización por cambios');
          }
          if (localSig !== incomingSig || !hasBase) applyCloudData(remote);
          else storeCloudSyncBase(remote);
          cloudDirty = false;
          renderCloudState('Sincronizado');
        }
      };

      cloudUnsubscribe = docRef.onSnapshot(snapshot => {
        if (cloudMergeInProgress) {
          cloudSnapshotQueued = true;
          return;
        }
        processSnapshot(snapshot).catch(error => {
          cloudReady = false;
          renderCloudState('Error de sincronización', true);
          console.error('Error procesando configuración de nube:', error);
        });
      }, error => {
        cloudReady = false;
        renderCloudState('Error de sincronización', true);
        console.error('Error escuchando configuración de nube:', error);
      });
    }

    async function syncToCloud(silent = false) {
      if (cloudMergeInProgress) return;
      try {
        if (!cloudReady) {
          if (!silent) alert('La sincronización con la nube todavía está iniciando. Intenta de nuevo en unos segundos.');
          return;
        }
        const docRef = getUserConfigDoc();
        if (!docRef) return;
        cloudMergeInProgress = true;

        const pendingAtStart = readCloudPending();
        const baseAtStart = readCloudSyncBase();
        const localSignatureAtStart = localCloudStateSignature(appState);
        const currentLocalRecords = cloudCategoryRecordsFromState(appState);
        const transactionResult = await db.runTransaction(async transaction => {
          const snapshot = await transaction.get(docRef);
          const remote = snapshot.exists ? snapshot.data() : null;
          if (remote && Number(remote.syncVersion) !== 2) throw new Error('La nube todavía está migrando a sincronización por cambios. Intenta de nuevo en unos segundos.');

          const remoteRecords = { ...(remote?.categoryRecords || {}) };
          const categoryUpdates = {};
          const pending = pendingAtStart;
          const baseRecords = baseAtStart?.categoryRecords || {};

          if (!snapshot.exists) {
            Object.assign(categoryUpdates, currentLocalRecords);
          } else {
            Object.entries(pending).forEach(([id, change]) => {
              if (id === '__settings' || !change?.record) return;
              const cloudRecord = remoteRecords[id];
              const baselineRecord = baseRecords[id];
              // A tombstone is final for this ID: stale clients must not resurrect it.
              // Explicit local deletions also win over concurrent edits to the active record.
              if (cloudRecord?.deleted && !change.record.deleted) return;
              const remoteChanged = categoryRecordSignature(cloudRecord) !== categoryRecordSignature(baselineRecord);
              if (change.record.deleted || !cloudRecord || !remoteChanged) {
                const record = categoryChangeRecordForCloud(change, cloudRecord);
                categoryUpdates[id] = record;
                remoteRecords[id] = record;
              } else if (baselineRecord) {
                const merged = mergeConcurrentCategoryRecord(change, cloudRecord, baselineRecord);
                if (merged) {
                  categoryUpdates[id] = merged;
                  remoteRecords[id] = merged;
                }
              } else if (shouldApplyPendingCategoryChange(change, cloudRecord, baselineRecord)) {
                const record = categoryChangeRecordForCloud(change, cloudRecord);
                categoryUpdates[id] = record;
                remoteRecords[id] = record;
              }
            });
          }

          const cloudSettings = remote?.settings || null;
          const baseSettings = baseAtStart?.settings || null;
          const settingChange = pending.__settings;
          let settingsUpdate = null;
          if (!snapshot.exists || !cloudSettings) {
            settingsUpdate = {
              volumeConfig: appState.volumeConfig,
              modifiedAt: Date.now()
            };
          } else if (settingChange) {
            const remoteSettingsChanged = volumeConfigSignature(cloudSettings.volumeConfig) !== volumeConfigSignature(baseSettings?.volumeConfig);
            const localSettingsWin = !remoteSettingsChanged || Number(settingChange.modifiedAt) >= Number(cloudSettings.modifiedAt || 0);
            if (localSettingsWin) {
              settingsUpdate = {
                volumeConfig: settingChange.volumeConfig,
                modifiedAt: Number(settingChange.modifiedAt) || Date.now()
              };
            }
          }

          const hasWrites = Object.keys(categoryUpdates).length > 0 || Boolean(settingsUpdate) || !snapshot.exists;
          if (hasWrites) {
            const patch = {
              syncVersion: 2,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (Object.keys(categoryUpdates).length) patch.categoryRecords = categoryUpdates;
            if (settingsUpdate) patch.settings = settingsUpdate;
            transaction.set(docRef, patch, { merge: true });
          }
          return { wrote: hasWrites };
        });

        const fresh = await docRef.get({ source: 'server' });
        if (!fresh.exists || Number(fresh.data().syncVersion) !== 2) throw new Error('No se pudo confirmar la sincronización en la nube.');
        const remote = fresh.data();
        cloudRevision = remote.updatedAt?.toMillis?.() ?? Date.now();

        const localChangedDuringSync = localCloudStateSignature(appState) !== localSignatureAtStart;
        if (localChangedDuringSync) {
          storeCloudSyncBase(remote);
          writeCloudPending({});
          markLocalCloudChanges(cloudV2ToAppState(remote, appState), appState);
          const currentPending = readCloudPending();
          cloudDirty = Object.keys(currentPending).length > 0;
          if (cloudDirty) {
            clearTimeout(cloudWriteTimer);
            cloudWriteTimer = setTimeout(() => syncToCloud(true), 500);
          }
        } else {
          applyCloudData(remote);
          cloudDirty = false;
        }

        cloudConflict = false;
        renderCloudState(transactionResult.wrote ? 'Cambios sincronizados' : 'Sincronizado');
        if (!silent) alert(transactionResult.wrote ? 'Cambios sincronizados; solo se enviaron las categorías o ajustes modificados.' : 'Sin cambios pendientes; se combinaron los datos de la nube.');
      } catch (error) {
        cloudDirty = true;
        renderCloudState('Error al sincronizar cambios', true);
        if (!silent) alert(error.message);
        else console.error('Error sincronizando cambios:', error);
      } finally {
        cloudMergeInProgress = false;
        if (cloudSnapshotQueued && cloudReady) {
          cloudSnapshotQueued = false;
          clearTimeout(cloudWriteTimer);
          cloudWriteTimer = setTimeout(() => syncToCloud(true), 0);
        }
      }
    }

    async function pullFromCloud() {
      if (!cloudReady) {
        alert('La sincronización con la nube todavía está iniciando. Intenta de nuevo en unos segundos.');
        return;
      }
      clearTimeout(cloudWriteTimer);
      await syncToCloud(false);
    }

    window.onload = () => {
      const savedTheme = localStorage.getItem('esquina_visual_theme') || 'harvest';
      applyVisualTheme(savedTheme);
      showWelcomeQuote();

      const local = localStorage.getItem(CONFIG.LS_KEY);
      let originalLocalState = null;
      let consolidatedLocalCategories = false;

      if (local) {
        try {
          originalLocalState = decodeStateFromStorage(local);
          consolidatedLocalCategories = hasDuplicateCategoryNames(originalLocalState.categories || []);
          if (consolidatedLocalCategories) saveLocalBackup(local, 'Antes de unificar categorías duplicadas');
          appState = normalizeAppState(originalLocalState);
        } catch (e) {
          console.error(e);
        }
      }

      loadVideosLocal();
      renderLocalBackups();
      createAutomaticLocalBackup();
      window.setInterval(createAutomaticLocalBackup, 5 * 60 * 1000);
      window.addEventListener('pagehide', createAutomaticLocalBackup);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') createAutomaticLocalBackup();
      });

      const baseCostInput = document.getElementById('calcBaseCost');
      if (baseCostInput) baseCostInput.dataset.lastValue = baseCostInput.value || '';

      document.getElementById('calcIeps').innerHTML = getIepsOptions()
        .map(option => `<option value="${option.value}">${option.label}</option>`)
        .join('');

      updateIepsSelectTheme();
      updateCategoryDropdowns();
      renderVolumeConfig();
      handleCategoryChange();
      if (consolidatedLocalCategories && originalLocalState) {
        markLocalCloudChanges(originalLocalState, appState);
        localStorage.setItem(CONFIG.LS_KEY, encodeStateForStorage(appState));
        showToast('Categorías duplicadas unificadas; quedó un respaldo de la configuración anterior.');
        if (auth.currentUser && cloudReady) {
          clearTimeout(cloudWriteTimer);
          cloudWriteTimer = setTimeout(() => syncToCloud(true), 100);
        }
      }
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
