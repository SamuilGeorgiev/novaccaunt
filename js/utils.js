// Basic utility helpers (BG locale)
(function () {
  function formatCurrency(value, currency = 'BGN') {
    try {
      const num = Number(value);
      if (!isFinite(num)) return '';
      return new Intl.NumberFormat('bg-BG', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(num);
    } catch (_) {
      return '';
    }
  }

  function formatDate(input) {
    try {
      const d = input instanceof Date ? input : new Date(input);
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat('bg-BG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
    } catch (_) {
      return '';
    }
  }

  function formatPercentage(value, opts = { maximumFractionDigits: 2 }) {
    try {
      const num = Number(value);
      if (!isFinite(num)) return '';
      // Accept 0.15 -> 15%
      const normalized = Math.abs(num) <= 1 ? num : num / 100;
      return new Intl.NumberFormat('bg-BG', {
        style: 'percent',
        ...opts,
      }).format(normalized);
    } catch (_) {
      return '';
    }
  }

  // Toasts
  function ensureToastRoot() {
    let root = document.getElementById('toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'toast-root';
      root.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
      document.body.appendChild(root);
    }
    return root;
  }

  function showToast(message, type = 'info', timeout = 3000) {
    try {
      const root = ensureToastRoot();
      const el = document.createElement('div');
      const base = 'px-4 py-2 rounded shadow text-sm backdrop-blur border';
      const color = type === 'success' ? 'bg-emerald-600/80 border-emerald-400/30 text-white' :
                    type === 'error' ? 'bg-red-600/80 border-red-400/30 text-white' :
                    'bg-slate-700/80 border-white/10 text-white';
      el.className = base + ' ' + color;
      el.textContent = String(message || '');
      root.appendChild(el);
      const timer = setTimeout(() => {
        el.remove();
      }, Math.max(1500, timeout | 0));
      // Allow manual dismiss on click
      el.addEventListener('click', () => {
        clearTimeout(timer);
        el.remove();
      });
      return el;
    } catch (_) {
      // no-op
    }
  }

  // expose
  window.utils = { formatCurrency, formatDate, formatPercentage, showToast };
})();
