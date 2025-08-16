// Sales module scaffold
(function(){
  class SalesManager {
    constructor() {
      this._initialized = false;
      this.items = [];
      this.filteredItems = [];
      this._loadedFromSupabase = false;
    }
    init() {
      if (this._initialized) return;
      // Dummy data for the initial UI skeleton
      this.items = [
        { id: 'S-0001', date: '2025-08-01', client: 'Клиент А', amount: 240.00 },
        { id: 'S-0002', date: '2025-08-03', client: 'Клиент Б', amount: 1200.50 },
        { id: 'S-0003', date: '2025-08-05', client: 'Клиент В', amount: 89.90 },
        { id: 'S-0004', date: '2025-08-10', client: 'Клиент Г', amount: 430.00 },
      ];
      this.filteredItems = this.items.slice();
      this._initialized = true;
    }
    async render(targetEl) {
      this.init();
      const el = targetEl || document.getElementById('route-container');
      if (!el) return;
      const isSb = !!(window.supabaseApi && typeof window.supabaseApi.isConfigured === 'function' && window.supabaseApi.isConfigured());
      el.innerHTML = [
        '<div class="flex items-center justify-between mb-4">',
        '  <h1 class="text-xl font-semibold">Продажби</h1>',
        '  <div class="text-xs opacity-80">Supabase: <strong>' + (isSb ? 'configured' : 'not configured') + '</strong>' + (this._loadedFromSupabase ? ' <span class="ml-2 px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-200">live</span>' : '') + '</div>',
        '</div>',
        '<div class="flex items-center gap-2 mb-4">',
        '  <input id="sales-search" type="text" placeholder="Търсене..." class="px-3 py-2 rounded bg-white/10 text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-blue-500" />',
        '  <button id="new-sale-btn" class="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500">Нова продажба</button>',
        '</div>',
        '<div class="overflow-x-auto rounded border border-white/10">',
        '  <table class="min-w-full text-sm">',
        '    <thead class="bg-white/5">',
        '      <tr>',
        '        <th class="text-left py-2 px-3 font-medium text-white/70">№</th>',
        '        <th class="text-left py-2 px-3 font-medium text-white/70">Дата</th>',
        '        <th class="text-left py-2 px-3 font-medium text-white/70">Клиент</th>',
        '        <th class="text-right py-2 px-3 font-medium text-white/70">Сума</th>',
        '      </tr>',
        '    </thead>',
        '    <tbody id="sales-tbody">',
               '',
        '    </tbody>',
        '  </table>',
        '</div>',
        // Modal markup (hidden by default)
        '<div id="sale-modal" class="fixed inset-0 hidden items-center justify-center">',
        '  <div id="sale-modal-backdrop" class="absolute inset-0 bg-black/60"></div>',
        '  <div class="relative z-10 w-full max-w-md rounded-lg bg-[#1c2541] border border-white/10 p-4">',
        '    <div class="flex items-center justify-between mb-3">',
        '      <h2 class="text-lg font-semibold">Нова продажба</h2>',
        '      <button id="sale-modal-close" class="text-white/70 hover:text-white">×</button>',
        '    </div>',
        '    <form id="sale-form" class="space-y-3">',
        '      <div>',
        '        <label class="block text-sm mb-1">Клиент</label>',
        '        <input id="sale-client" type="text" required class="w-full px-3 py-2 rounded bg-white/10 text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Клиент" />',
        '      </div>',
        '      <div>',
        '        <label class="block text-sm mb-1">Дата</label>',
        '        <input id="sale-date" type="date" required class="w-full px-3 py-2 rounded bg-white/10 text-white outline-none focus:ring-2 focus:ring-blue-500" />',
        '      </div>',
        '      <div>',
        '        <label class="block text-sm mb-1">Сума</label>',
        '        <input id="sale-amount" type="number" step="0.01" min="0" required class="w-full px-3 py-2 rounded bg-white/10 text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />',
        '      </div>',
        '      <div class="flex items-center justify-end gap-2 pt-2">',
        '        <button type="button" id="sale-cancel" class="px-3 py-2 rounded bg-white/10 text-white hover:bg-white/15">Отказ</button>',
        '        <button type="submit" class="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500">Запази</button>',
        '      </div>',
        '    </form>',
        '  </div>',
        '</div>'
      ].join('\n');
      this.renderTable(el);
      this.bindEvents(el);

      // Try to load from Supabase (non-blocking initial render)
      await this.fetchDataFromSupabase();
      this.renderTable(el);
    }

    bindEvents(scopeEl) {
      const search = scopeEl.querySelector('#sales-search');
      const btn = scopeEl.querySelector('#new-sale-btn');
      const modal = scopeEl.querySelector('#sale-modal');
      const backdrop = scopeEl.querySelector('#sale-modal-backdrop');
      const closeBtn = scopeEl.querySelector('#sale-modal-close');
      const cancelBtn = scopeEl.querySelector('#sale-cancel');
      const form = scopeEl.querySelector('#sale-form');
      if (search) {
        search.addEventListener('input', (e) => {
          const q = String(e.target.value || '').toLowerCase().trim();
          if (!q) {
            this.filteredItems = this.items.slice();
          } else {
            this.filteredItems = this.items.filter(it =>
              it.id.toLowerCase().includes(q) ||
              it.client.toLowerCase().includes(q)
            );
          }
          this.renderTable(scopeEl);
        });
      }
      if (btn) {
        btn.addEventListener('click', () => {
          this.openModal(modal);
        });
      }
      [backdrop, closeBtn, cancelBtn].forEach(el => {
        if (el) el.addEventListener('click', () => this.closeModal(modal));
      });
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          await this.handleCreate(scopeEl);
          this.closeModal(modal);
        });
      }
    }

    renderTable(scopeEl) {
      const tbody = scopeEl.querySelector('#sales-tbody');
      if (!tbody) return;
      const nf = new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'BGN' });
      const rows = this.filteredItems.map(it => (
        `<tr class=\"border-b border-white/10\">\
           <td class=\"py-2 px-3 text-white/90\">${it.id}</td>\
           <td class=\"py-2 px-3 text-white/80\">${it.date}</td>\
           <td class=\"py-2 px-3 text-white/80\">${it.client}</td>\
           <td class=\"py-2 px-3 text-right text-white\">${nf.format(it.amount)}</td>\
         </tr>`
      )).join('');
      tbody.innerHTML = rows || '<tr><td class=\"py-3 px-3 text-white/70\" colspan=\"4\">Няма резултати</td></tr>';
    }

    openModal(modal) {
      if (!modal) return;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    closeModal(modal) {
      if (!modal) return;
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      const form = modal.querySelector('#sale-form');
      if (form) form.reset();
    }

    async handleCreate(scopeEl) {
      try {
        const clientEl = scopeEl.querySelector('#sale-client');
        const dateEl = scopeEl.querySelector('#sale-date');
        const amountEl = scopeEl.querySelector('#sale-amount');
        const client = (clientEl?.value || '').trim();
        const date = dateEl?.value || '';
        const amount = Number(amountEl?.value || 0);
        if (!client || !date || !(amount >= 0)) {
          alert('Моля, попълнете всички полета коректно.');
          return;
        }
        const newId = 'S-' + Date.now();

        // Try Supabase insert if available
        let created = null;
        if (window.supabaseApi && window.supabaseApi.client) {
          try {
            created = await window.supabaseApi.createSale({ id: newId, date, client, amount });
          } catch (err) {
            console.warn('Supabase createSale failed, falling back to local.', err);
          }
        }

        const record = created || { id: newId, date, client, amount };
        this.items = [record, ...this.items];
        this.filteredItems = this.items.slice();
        this.renderTable(scopeEl);
      } catch (e) {
        console.error('Create sale error:', e);
        alert('Възникна грешка при създаване.');
      }
    }
  }
  window.SalesManager = SalesManager;
})();
