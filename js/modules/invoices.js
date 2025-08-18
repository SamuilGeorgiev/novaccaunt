// Invoices module — basic UI (no Supabase wiring yet)
(function(){
  class InvoicesManager {
    constructor() {
      this._initialized = false;
      this.items = [];
      this.filteredItems = [];
      this._editingId = null;
    }
    init() {
      if (this._initialized) return;
      // Mock data for UI
      this.items = [
        { id: 'INV-0001', date: '2025-08-01', client: 'Клиент А', amount: 199.50 },
        { id: 'INV-0002', date: '2025-08-04', client: 'Клиент Б', amount: 1240.00 },
        { id: 'INV-0003', date: '2025-08-10', client: 'Клиент В', amount: 75.20 },
      ];
      this.filteredItems = this.items.slice();
      this._initialized = true;
    }
    render(targetEl) {
      this.init();
      const el = targetEl || document.getElementById('route-container');
      if (!el) return;
      el.innerHTML = [
        '<div class="flex items-center justify-between mb-4">',
        '  <h1 class="text-xl font-semibold">Фактури</h1>',
        '  <div class="text-xs opacity-80">Статус: <strong>локални данни</strong></div>',
        '</div>',
        '<div class="flex items-center gap-2 mb-4">',
        '  <input id="inv-search" type="text" placeholder="Търсене..." class="px-3 py-2 rounded bg-white/10 text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-blue-500" />',
        '  <button id="new-inv-btn" class="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500">Нова фактура</button>',
        '</div>',
        '<div id="inv-status" class="text-sm text-white/70 mb-2 hidden"></div>',
        '<div class="overflow-x-auto rounded border border-white/10">',
        '  <table class="min-w-full text-sm">',
        '    <thead class="bg-white/5">',
        '      <tr>',
        '        <th class="text-left py-2 px-3 font-medium text-white/70">№</th>',
        '        <th class="text-left py-2 px-3 font-medium text-white/70">Дата</th>',
        '        <th class="text-left py-2 px-3 font-medium text-white/70">Клиент</th>',
        '        <th class="text-right py-2 px-3 font-medium text-white/70">Сума</th>',
        '        <th class="text-right py-2 px-3 font-medium text-white/70">Действия</th>',
        '      </tr>',
        '    </thead>',
        '    <tbody id="inv-tbody"></tbody>',
        '  </table>',
        '</div>',
        // Modal
        '<div id="inv-modal" class="fixed inset-0 hidden items-center justify-center">',
        '  <div id="inv-modal-backdrop" class="absolute inset-0 bg-black/60"></div>',
        '  <div class="relative z-10 w-full max-w-md rounded-lg bg-[#1c2541] border border-white/10 p-4">',
        '    <div class="flex items-center justify-between mb-3">',
        '      <h2 class="text-lg font-semibold">Нова фактура</h2>',
        '      <button id="inv-modal-close" class="text-white/70 hover:text-white">×</button>',
        '    </div>',
        '    <form id="inv-form" class="space-y-3">',
        '      <div>',
        '        <label class="block text-sm mb-1">Клиент</label>',
        '        <input id="inv-client" type="text" required class="w-full px-3 py-2 rounded bg-white/10 text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Клиент" />',
        '      </div>',
        '      <div>',
        '        <label class="block text-sm mb-1">Дата</label>',
        '        <input id="inv-date" type="date" required class="w-full px-3 py-2 rounded bg-white/10 text-white outline-none focus:ring-2 focus:ring-blue-500" />',
        '      </div>',
        '      <div>',
        '        <label class="block text-sm mb-1">Сума</label>',
        '        <input id="inv-amount" type="number" step="0.01" min="0" required class="w-full px-3 py-2 rounded bg-white/10 text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />',
        '      </div>',
        '      <div class="flex items-center justify-end gap-2 pt-2">',
        '        <button type="button" id="inv-cancel" class="px-3 py-2 rounded bg-white/10 text-white hover:bg-white/15">Отказ</button>',
        '        <button type="submit" class="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500">Запази</button>',
        '      </div>',
        '    </form>',
        '  </div>',
        '</div>'
      ].join('\n');
      this.renderTable(el);
      this.bindEvents(el);
    }

    bindEvents(scopeEl) {
      const search = scopeEl.querySelector('#inv-search');
      const btn = scopeEl.querySelector('#new-inv-btn');
      const modal = scopeEl.querySelector('#inv-modal');
      const backdrop = scopeEl.querySelector('#inv-modal-backdrop');
      const closeBtn = scopeEl.querySelector('#inv-modal-close');
      const cancelBtn = scopeEl.querySelector('#inv-cancel');
      const form = scopeEl.querySelector('#inv-form');

      if (search) {
        search.addEventListener('input', (e) => {
          const q = String(e.target.value || '').toLowerCase().trim();
          if (!q) this.filteredItems = this.items.slice();
          else this.filteredItems = this.items.filter(it => it.id.toLowerCase().includes(q) || it.client.toLowerCase().includes(q));
          this.renderTable(scopeEl);
        });
      }
      if (btn) {
        btn.addEventListener('click', () => {
          this._editingId = null;
          this.setModalMode(scopeEl, { mode: 'create' });
          this.openModal(modal);
        });
      }
      [backdrop, closeBtn, cancelBtn].forEach(el => el && el.addEventListener('click', () => this.closeModal(modal)));
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          await this.handleCreate(scopeEl);
          this.closeModal(modal);
        });
      }

      const tbody = scopeEl.querySelector('#inv-tbody');
      if (tbody) {
        tbody.addEventListener('click', (e) => {
          let target = e.target;
          if (!(target instanceof Element)) target = target && (target.parentElement || target.parentNode);
          if (!target) return;
          const actionEl = target.closest('[data-action]');
          if (!actionEl) return;
          const id = actionEl.getAttribute('data-id');
          const action = actionEl.getAttribute('data-action');
          if (action === 'edit') {
            this.startEdit(scopeEl, id);
          } else if (action === 'delete') {
            this.handleDelete(scopeEl, id);
          }
        });
      }
    }

    renderTable(scopeEl) {
      const tbody = scopeEl.querySelector('#inv-tbody');
      if (!tbody) return;
      const nf = new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'BGN' });
      const rows = this.filteredItems.map(it => (
        `<tr class="border-b border-white/10">\
           <td class="py-2 px-3 text-white/90">${it.id}</td>\
           <td class="py-2 px-3 text-white/80">${it.date}</td>\
           <td class="py-2 px-3 text-white/80">${it.client}</td>\
           <td class="py-2 px-3 text-right text-white">${nf.format(it.amount)}</td>\
           <td class="py-2 px-3 text-right">\
             <button data-action="edit" data-id="${it.id}" class="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/15 mr-2">Редакция</button>\
             <button data-action="delete" data-id="${it.id}" class="px-2 py-1 text-xs rounded bg-red-600/80 hover:bg-red-500">Изтриване</button>\
           </td>\
         </tr>`
      )).join('');
      tbody.innerHTML = rows || '<tr><td class="py-3 px-3 text-white/70" colspan="5">Няма резултати</td></tr>';
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
      const form = modal.querySelector('#inv-form');
      if (form) form.reset();
      this._editingId = null;
      const scopeEl = modal.closest('body') || document;
      this.setModalMode(scopeEl, { mode: 'create' });
    }

    async handleCreate(scopeEl) {
      try {
        const clientEl = scopeEl.querySelector('#inv-client');
        const dateEl = scopeEl.querySelector('#inv-date');
        const amountEl = scopeEl.querySelector('#inv-amount');
        const submitBtn = scopeEl.querySelector('#inv-form button[type="submit"]');
        const client = (clientEl?.value || '').trim();
        const date = dateEl?.value || '';
        const amount = Number(amountEl?.value || 0);
        if (!client || !date || !(amount >= 0)) {
          alert('Моля, попълнете всички полета коректно.');
          return;
        }
        const prevText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Запазване...';
          submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
        }
        const record = { id: 'INV-' + Date.now(), date, client, amount };
        this.items = [record, ...this.items];
        this.filteredItems = this.items.slice();
        this.renderTable(scopeEl);
      } catch (e) {
        console.error('Create invoice error:', e);
        alert('Възникна грешка при запис.');
      } finally {
        const submitBtn = scopeEl.querySelector('#inv-form button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Запази';
          submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
        }
      }
    }

    startEdit(scopeEl, id) {
      const modal = scopeEl.querySelector('#inv-modal');
      const it = this.items.find(x => x.id === id);
      if (!it || !modal) return;
      this._editingId = id;
      const clientEl = scopeEl.querySelector('#inv-client');
      const dateEl = scopeEl.querySelector('#inv-date');
      const amountEl = scopeEl.querySelector('#inv-amount');
      if (clientEl) clientEl.value = it.client || '';
      if (dateEl) dateEl.value = (it.date || '').slice(0, 10);
      if (amountEl) amountEl.value = it.amount != null ? it.amount : '';
      this.setModalMode(scopeEl, { mode: 'edit' });
      this.openModal(modal);
    }

    handleDelete(scopeEl, id) {
      if (!id) return;
      if (!confirm('Сигурни ли сте, че искате да изтриете тази фактура?')) return;
      this.items = this.items.filter(x => x.id !== id);
      this.filteredItems = this.items.slice();
      this.renderTable(scopeEl);
    }

    setModalMode(scopeEl, { mode }) {
      const title = scopeEl.querySelector('#inv-modal h2');
      const submitBtn = scopeEl.querySelector('#inv-form button[type="submit"]');
      if (mode === 'edit') {
        if (title) title.textContent = 'Редакция';
        if (submitBtn) submitBtn.textContent = 'Запази промените';
      } else {
        if (title) title.textContent = 'Нова фактура';
        if (submitBtn) submitBtn.textContent = 'Запази';
      }
    }
  }
  window.InvoicesManager = InvoicesManager;
})();
