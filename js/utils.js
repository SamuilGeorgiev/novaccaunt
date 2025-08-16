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

  // expose
  window.utils = { formatCurrency, formatDate, formatPercentage };
})();
