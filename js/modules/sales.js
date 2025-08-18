// Sales module scaffold
(function(){
  class SalesManager {
    constructor() {
      this._initialized = false;
      this.items = [];
      this.filteredItems = [];
      this._loadedFromSupabase = false;
      this._editingId = null;
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
        '<div id="sales-status" class="text-sm text-white/70 mb-2 hidden"></div>',
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

      // Try to load from Supabase with status UI
      this.setStatus(el, 'Зареждане на данни...', 'loading');
      const ok = await this.fetchDataFromSupabase();
      this.renderTable(el);
      if (ok) {
        this.setStatus(el, '', 'hide');
      } else {
        // Keep a subtle hint only if configured but empty/error
        this.setStatus(el, 'Неуспешно зареждане или няма данни (показани са локални).', 'error');
      }
      // Inform if DB does not use UUID ids (one-time notice)
      try {
        if (!this._uuidWarned && window.supabaseApi && window.supabaseApi.client) {
          if (window.supabaseApi.salesIdIsUuid === false && window.utils && window.utils.showToast) {
            window.utils.showToast('Забележка: sales.id няма UUID по подразбиране. Използва се резервен клиентски id.', 'info', 5000);
            this._uuidWarned = true;
          }
        }
      } catch (_) {}
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
          this._editingId = null;
          this.setModalMode(scopeEl, { mode: 'create' });
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

      // Delegated actions for Edit/Delete
      const tbody = scopeEl.querySelector('#sales-tbody');
      if (tbody) {
        tbody.addEventListener('click', (e) => {
          const editBtn = e.target.closest && e.target.closest('[data-action="edit"]');
          const delBtn = e.target.closest && e.target.closest('[data-action="delete"]');
          if (editBtn) {
            const id = editBtn.getAttribute('data-id');
            this.startEdit(scopeEl, id);
          } else if (delBtn) {
            const id = delBtn.getAttribute('data-id');
            this.handleDelete(scopeEl, id);
          }
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
           <td class=\"py-2 px-3 text-right\">\
             <button data-action=\"edit\" data-id=\"${it.id}\" class=\"px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/15 mr-2\">Редакция</button>\
             <button data-action=\"delete\" data-id=\"${it.id}\" class=\"px-2 py-1 text-xs rounded bg-red-600/80 hover:bg-red-500\">Изтриване</button>\
           </td>\
         </tr>`
      )).join('');
      tbody.innerHTML = rows || '<tr><td class=\"py-3 px-3 text-white/70\" colspan=\"5\">Няма резултати</td></tr>';
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
      // reset edit mode after close
      this._editingId = null;
      const scopeEl = modal.closest('body') || document;
      this.setModalMode(scopeEl, { mode: 'create' });
    }
    

    async handleCreate(scopeEl) {
      try {
        const clientEl = scopeEl.querySelector('#sale-client');
        const dateEl = scopeEl.querySelector('#sale-date');
        const amountEl = scopeEl.querySelector('#sale-amount');
        const submitBtn = scopeEl.querySelector('#sale-form button[type="submit"]');
        const client = (clientEl?.value || '').trim();
        const date = dateEl?.value || '';
        const amount = Number(amountEl?.value || 0);
        if (!client || !date || !(amount >= 0)) {
          alert('Моля, попълнете всички полета коректно.');
          return;
        }
        // Create or update depending on _editingId
        let created = null;
        let updated = null;
        // disable submit while saving
        const prevText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = this._editingId ? 'Запазване...' : 'Запазване...';
          submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
        }
        if (this._editingId) {
          // UPDATE
          if (window.supabaseApi && window.supabaseApi.client) {
            try {
              updated = await window.supabaseApi.updateSale(this._editingId, { date, client, amount });
            } catch (err) {
              console.warn('Supabase updateSale failed, falling back to local.', err);
            }
          }
          const idx = this.items.findIndex(x => x.id === this._editingId);
          const record = updated || { id: this._editingId, date, client, amount };
          if (idx >= 0) this.items.splice(idx, 1, record);
          this._editingId = null;
        } else {
          // CREATE
          if (window.supabaseApi && window.supabaseApi.client) {
            try {
              created = await window.supabaseApi.createSale({ date, client, amount });
            } catch (err) {
              console.warn('Supabase createSale failed, falling back to local.', err);
            }
          }
          const record = created || { id: 'TEMP-' + Date.now(), date, client, amount };
          this.items = [record, ...this.items];
        }
        this.filteredItems = this.items.slice();
        this.renderTable(scopeEl);
        if (window.utils && typeof window.utils.showToast === 'function') {
          if (updated) window.utils.showToast('Промените са запазени (Supabase).', 'success');
          else if (this._editingId === null && created) window.utils.showToast('Успешно създадена продажба (Supabase).', 'success');
          else window.utils.showToast('Операция изпълнена локално.', 'info');
        }
      } catch (e) {
        console.error('Create sale error:', e);
        if (window.utils && typeof window.utils.showToast === 'function') {
          window.utils.showToast('Грешка при запис.', 'error');
        } else {
          alert('Възникна грешка при запис.');
        }
      } finally {
        const submitBtn = scopeEl.querySelector('#sale-form button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Запази';
          submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
        }
      }
    }

    startEdit(scopeEl, id) {
      const modal = scopeEl.querySelector('#sale-modal');
      const it = this.items.find(x => x.id === id);
      if (!it || !modal) return;
      this._editingId = id;
      const clientEl = scopeEl.querySelector('#sale-client');
      const dateEl = scopeEl.querySelector('#sale-date');
      const amountEl = scopeEl.querySelector('#sale-amount');
      if (clientEl) clientEl.value = it.client || '';
      if (dateEl) dateEl.value = (it.date || '').slice(0, 10);
      if (amountEl) amountEl.value = it.amount != null ? it.amount : '';
      this.setModalMode(scopeEl, { mode: 'edit' });
      this.openModal(modal);
    }

    async handleDelete(scopeEl, id) {
      try {
        if (!id) return;
        if (!confirm('Сигурни ли сте, че искате да изтриете тази продажба?')) return;
        const hasSb = Boolean(window.supabaseApi && window.supabaseApi.client);
        let ok = false;
        if (hasSb) {
          try {
            await window.supabaseApi.deleteSale(id);
            ok = true;
          } catch (err) {
            console.warn('Supabase deleteSale failed.', err);
            const msg = (err && (err.message || err.error_description || err.hint)) ? String(err.message || err.error_description || err.hint) : 'Неизвестна грешка';
            // Show detailed error
            if (window.utils && window.utils.showToast) {
              window.utils.showToast('Грешка при изтриване в Supabase: ' + msg, 'error', 6000);
            } else {
              alert('Грешка при изтриване в Supabase: ' + msg);
            }
            // Offer local fallback
            const fallback = confirm('Изтриването в Supabase неуспешно. Да изтрия ли записа само локално?');
            if (!fallback) return;
          }
        }
        // Proceed with local removal (either no Supabase, or fallback confirmed)
        this.items = this.items.filter(x => x.id !== id);
        this.filteredItems = this.items.slice();
        this.renderTable(scopeEl);
        if (window.utils && window.utils.showToast) {
          window.utils.showToast(ok ? 'Записът е изтрит (Supabase).' : 'Записът е изтрит локално.', ok ? 'success' : 'info');
        }
      } catch (e) {
        console.error('Delete sale error:', e);
        if (window.utils && window.utils.showToast) window.utils.showToast('Грешка при изтриване.', 'error');
      }
    }

    setModalMode(scopeEl, { mode }) {
      const title = scopeEl.querySelector('#sale-modal h2');
      const submitBtn = scopeEl.querySelector('#sale-form button[type="submit"]');
      if (mode === 'edit') {
        if (title) title.textContent = 'Редакция';
        if (submitBtn) submitBtn.textContent = 'Запази промените';
      } else {
        if (title) title.textContent = 'Нова продажба';
        if (submitBtn) submitBtn.textContent = 'Запази';
      }
    }

    async fetchDataFromSupabase() {
      try {
        if (!(window.supabaseApi && window.supabaseApi.client)) return false;
        const remote = await window.supabaseApi.loadSales();
        if (Array.isArray(remote) && remote.length) {
          // Normalize records to our shape
          this.items = remote.map(r => ({
            id: r.id || r.sale_no || '',
            date: r.date || r.created_at || '',
            client: r.client || r.client_name || '—',
            amount: typeof r.amount === 'number' ? r.amount : Number(r.amount || 0)
          }));
          this.filteredItems = this.items.slice();
          this._loadedFromSupabase = true;
          return true;
        }
        return false;
      } catch (e) {
        console.warn('Sales: failed to fetch from Supabase, using dummy data.', e);
        return false;
      }
    }

    setStatus(scopeEl, text, type) {
      const box = scopeEl.querySelector('#sales-status');
      if (!box) return;
      if (type === 'hide') {
        box.classList.add('hidden');
        box.textContent = '';
        return;
      }
      box.classList.remove('hidden');
      box.textContent = text;
      // color by type
      box.classList.remove('text-red-300', 'text-emerald-300', 'text-white/70');
      if (type === 'error') box.classList.add('text-red-300');
      else if (type === 'ok') box.classList.add('text-emerald-300');
      else box.classList.add('text-white/70');
    }
  }
  window.SalesManager = SalesManager;
})();
