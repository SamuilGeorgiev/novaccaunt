// Minimal bootstrap for the SPA scaffold
(function () {
  // Helper to get route container
  function getRouteContainer() {
    return document.getElementById('route-container') || document.getElementById('app');
  }

  // --- Views ---
  function renderDashboard() {
    const el = getRouteContainer();
    if (!el) return;
    el.innerHTML = [
      '  <section class="space-y-4">',
      '    <h1 class="text-2xl font-semibold">Табло</h1>',
      '    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">',
      '      <div class="card"><div class="card-body flex items-center justify-between"><div><div class="text-slate-400 text-xs">Приходи (месец)</div><div class="text-xl font-semibold">—</div></div><i data-lucide="trending-up" class="w-5 h-5 text-emerald-400"></i></div></div>',
      '      <div class="card"><div class="card-body flex items-center justify-between"><div><div class="text-slate-400 text-xs">Фактури (месец)</div><div class="text-xl font-semibold">—</div></div><i data-lucide="file-text" class="w-5 h-5 text-blue-400"></i></div></div>',
      '      <div class="card"><div class="card-body flex items-center justify-between"><div><div class="text-slate-400 text-xs">Разходи (месец)</div><div class="text-xl font-semibold">—</div></div><i data-lucide="wallet" class="w-5 h-5 text-amber-400"></i></div></div>',
      '      <div class="card"><div class="card-body flex items-center justify-between"><div><div class="text-slate-400 text-xs">Нетно</div><div class="text-xl font-semibold">—</div></div><i data-lucide="equals" class="w-5 h-5 text-sky-300"></i></div></div>',
      '    </div>',
      '    <div class="card">',
      '      <div class="card-header">Скорошна активност</div>',
      '      <div class="card-body">',
      '        <table class="table table-striped text-sm">',
      '          <thead><tr><th>Дата</th><th>Тип</th><th>Описание</th><th>Сума</th></tr></thead>',
      '          <tbody id="recent-activity">',
      '            <tr><td colspan="4" class="text-slate-400">Няма данни</td></tr>',
      '          </tbody>',
      '        </table>',
      '      </div>',
      '    </div>',
      '  </section>'
    ].join('\n');
  }

  function renderSales() {
    const el = getRouteContainer();
    if (!el) return;
    if (!window.SalesManager) {
      // If script not loaded, fallback text
      el.innerHTML = '<h1>Продажби</h1><p>Модулът не е зареден.</p>';
      return;
    }
    if (!window.salesManager) window.salesManager = new window.SalesManager();
    window.salesManager.render(el);
  }

  function renderInvoices() {
    const el = getRouteContainer();
    if (!el) return;
    if (!window.InvoicesManager) {
      el.innerHTML = '<h1>Фактури</h1><p>Модулът не е зареден.</p>';
      return;
    }
    if (!window.invoicesManager) window.invoicesManager = new window.InvoicesManager();
    window.invoicesManager.render(el);
  }

  function renderDocuments() {
    const el = getRouteContainer();
    if (!el) return;
    if (!window.DocumentsManager) {
      el.innerHTML = '<h1>Документи</h1><p>Модулът не е зареден.</p>';
      return;
    }
    if (!window.documentsManager) window.documentsManager = new window.DocumentsManager();
    window.documentsManager.render(el);
  }

  function renderReports() {
    const el = getRouteContainer();
    if (!el) return;
    if (!window.ReportsManager) {
      el.innerHTML = '<h1>Отчети</h1><p>Модулът не е зареден.</p>';
      return;
    }
    if (!window.reportsManager) window.reportsManager = new window.ReportsManager();
    window.reportsManager.render(el);
  }

  function renderNotFound() {
    const el = getRouteContainer();
    if (!el) return;
    el.innerHTML = [
      '  <h1>404</h1>',
      '  <p>Страницата не е намерена.</p>'
    ].join('\n');
  }

  // --- Router ---
  const routes = {
    '': renderDashboard,
    'dashboard': renderDashboard,
    'sales': renderSales,
    'invoices': renderInvoices,
    'documents': renderDocuments,
    'reports': renderReports,
  };

  function navigate() {
    const hash = window.location.hash || '#/dashboard';
    // Accept forms like #/sales or #sales
    const match = hash.match(/^#\/?([^?]*)/);
    const key = (match && match[1] ? match[1] : 'dashboard').toLowerCase();
    const handler = routes.hasOwnProperty(key) ? routes[key] : renderNotFound;
    handler();
    updateActiveNav(key);
    // Refresh Lucide icons after DOM updates
    try {
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    } catch (_) {}
  }

  function updateActiveNav(key) {
    // Normalize empty route to dashboard
    const routeKey = key || 'dashboard';
    const links = document.querySelectorAll('nav.nav a[data-route]');
    if (!links || !links.length) return;
    links.forEach(a => {
      const aKey = (a.getAttribute('data-route') || '').toLowerCase();
      if (aKey === routeKey) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      } else {
        a.classList.remove('active');
        a.removeAttribute('aria-current');
      }
    });
  }

  // Initial boot + hash changes
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', navigate);
  } else {
    navigate();
  }
  window.addEventListener('hashchange', navigate);
})();
