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
      '  <h1>Табло</h1>',
      '  <p>Стартова страница. Ще добавяме навигация и модули стъпка по стъпка.</p>'
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
