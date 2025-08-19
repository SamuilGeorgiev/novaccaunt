// Reports module — basic KPI cards
(function(){
  class ReportsManager {
    constructor() {
      this._initialized = false;
      this.sales = [];
      this._loadedFromSupabase = false;
      this._rangeDays = 30; // default
      this._hoverIdx = -1;
      this._chart = null; // geometry/state for chart hover
      this._customFrom = '';
      this._customTo = '';
    }
    init() {
      if (this._initialized) return;
      this._initialized = true;
    }
    render(targetEl) {
      this.init();
      const el = targetEl || document.getElementById('route-container');
      if (!el) return;
      const isSb = !!(window.supabaseApi && typeof window.supabaseApi.isConfigured === 'function' && window.supabaseApi.isConfigured());
      el.innerHTML = [
        '<div class="flex items-center justify-between mb-4">',
        '  <h1 class="text-xl font-semibold">Отчети</h1>',
        '  <div class="text-xs opacity-80">Supabase: <strong>' + (isSb ? 'configured' : 'not configured') + '</strong>' + (this._loadedFromSupabase ? ' <span class="ml-2 px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-200">live</span>' : '') + '</div>',
        '</div>',
        '<div class="flex flex-col md:flex-row md:items-end gap-3 mb-4">',
        '  <div class="flex items-center gap-2">',
        '    <span class="text-sm text-white/70 mr-2">Период:</span>',
        '    <button data-range="7" class="rep-range px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 text-sm">7 дни</button>',
        '    <button data-range="30" class="rep-range px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 text-sm">30 дни</button>',
        '    <button data-range="90" class="rep-range px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 text-sm">90 дни</button>',
        '  </div>',
        '  <div class="flex items-center gap-2">',
        '    <label class="text-sm text-white/70">От</label>',
        '    <input id="rep-from" type="date" class="px-2 py-1.5 rounded bg-white/10 text-white outline-none" />',
        '    <label class="text-sm text-white/70">До</label>',
        '    <input id="rep-to" type="date" class="px-2 py-1.5 rounded bg-white/10 text-white outline-none" />',
        '    <button id="rep-apply" class="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 text-sm">Приложи</button>',
        '  </div>',
        '</div>',
        '<div id="rep-status" class="text-sm text-white/70 mb-3"></div>',
        '<div id="rep-cards" class="grid grid-cols-1 md:grid-cols-4 gap-4">',
        this.card('Общи приходи', '—', 'BGN', 'sum', true),
        this.card('Брой продажби', '—', '', 'count', true),
        this.card('Последни 30 дни', '—', 'BGN', 'last30', true),
        this.card('Средна стойност', '—', 'BGN', 'avg', true),
        '</div>',
        '<div class="mt-6">',
        '  <div class="text-sm text-white/70 mb-2">Приходи (последни 90 дни)</div>',
        '  <div class="rounded-lg border border-white/10 bg-white/5 p-2">',
        '    <canvas id="rep-line" height="180" class="w-full cursor-crosshair"></canvas>',
        '  </div>',
        '</div>'
      ].join('\n');

      this.setStatus(el, 'Зареждане на данни...', 'loading');
      this.fetchSales().then(() => {
        this.updateRangeButtons(el);
        this.updateCards(el);
        this.drawRevenueChart(el);
        this.bindChartHover(el);
        this.bindDrilldowns(el);
        this.setStatus(el, '', 'hide');
      }).catch((err) => {
        console.warn('Reports: failed to load sales', err);
        this.setStatus(el, 'Неуспешно зареждане на продажбите. Показват се локални/нулеви стойности.', 'error');
        this.updateRangeButtons(el);
        this.updateCards(el);
        this.drawRevenueChart(el);
        this.bindChartHover(el);
        this.bindDrilldowns(el);
      });

      this.bindEvents(el);
    }

    card(title, value, unit, key, clickable) {
      return [
        '<div class="rounded-lg border border-white/10 bg-white/5 p-4', (clickable ? ' hover:bg-white/10 cursor-pointer' : ''), '" data-card-key="', key, '">',
         '  <div class="text-sm text-white/70">' + title + '</div>',
         '  <div id="rep-' + key + '" class="mt-2 text-2xl font-semibold">' + value + (unit ? ' <span class="text-white/70 text-lg">' + unit + '</span>' : '') + '</div>',
         '</div>'
       ].join('');
     }

     bindEvents(scopeEl) {
       const buttons = Array.from(scopeEl.querySelectorAll('.rep-range'));
       buttons.forEach(btn => btn.addEventListener('click', () => {
         const days = Number(btn.getAttribute('data-range')) || 30;
         this._rangeDays = days;
         this.updateRangeButtons(scopeEl);
         this.updateCards(scopeEl);
       }));
       // Redraw chart on resize
       window.addEventListener('resize', () => this.drawRevenueChart(scopeEl), { passive: true });

       // Custom range apply
       const apply = scopeEl.querySelector('#rep-apply');
       const fromEl = scopeEl.querySelector('#rep-from');
       const toEl = scopeEl.querySelector('#rep-to');
       if (apply && fromEl && toEl) {
         apply.addEventListener('click', () => {
           this._customFrom = fromEl.value || '';
           this._customTo = toEl.value || '';
           if (!this._customFrom && !this._customTo) return;
           // When custom applied, compute KPIs over that exact range
           this.updateCards(scopeEl);
         });
       }
     }

     updateRangeButtons(scopeEl) {
       const buttons = Array.from(scopeEl.querySelectorAll('.rep-range'));
       buttons.forEach(btn => {
         const d = Number(btn.getAttribute('data-range')) || 30;
         btn.classList.toggle('bg-blue-600', d === this._rangeDays);
         btn.classList.toggle('hover:bg-blue-500', d === this._rangeDays);
         btn.classList.toggle('text-white', d === this._rangeDays);
       });
     }

     setStatus(scopeEl, text, type) {
       const box = scopeEl.querySelector('#rep-status');
       if (!box) return;
       if (!text) {
         box.textContent = '';
         box.classList.add('hidden');
         return;
       }
       box.classList.remove('hidden');
       box.textContent = text;
       box.classList.remove('text-red-300', 'text-emerald-300', 'text-white/70');
       if (type === 'error') box.classList.add('text-red-300');
       else if (type === 'ok') box.classList.add('text-emerald-300');
       else box.classList.add('text-white/70');
     }

     async fetchSales() {
       try {
         this.sales = [];
         this._loadedFromSupabase = false;
         if (window.supabaseApi && window.supabaseApi.client) {
           const rows = await window.supabaseApi.loadSales();
           if (Array.isArray(rows)) {
             this.sales = rows.map(r => ({
               id: r.id || r.sale_no || '',
               date: r.date || r.created_at || '',
               amount: typeof r.amount === 'number' ? r.amount : Number(r.amount || 0)
             }));
             this._loadedFromSupabase = true;
             return;
           }
         }
         // Fallback: try to read from SalesManager instance (if rendered previously)
         if (window.SalesManager && window.__salesInstance && Array.isArray(window.__salesInstance.items)) {
           this.sales = window.__salesInstance.items.slice();
         }
       } catch (e) {
         // Leave as empty; caller handles status
       }
     }

     kpis() {
       const nf = new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'BGN' });
       const now = new Date();
       const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
       let total = 0;
       let count = 0;
       let last30 = 0;
       for (const s of this.sales) {
         const amt = typeof s.amount === 'number' ? s.amount : Number(s.amount || 0);
         total += amt;
         count += 1;
         const d = s.date ? new Date(s.date) : null;
         if (d && d >= cutoff) last30 += amt;
       }
       // Apply current range for sum/count/avg
       let rTotal = 0, rCount = 0;
       const useCustom = (this._customFrom || this._customTo);
       const rangeCutoff = useCustom ? null : new Date(new Date().getTime() - this._rangeDays * 24 * 60 * 60 * 1000);
       const fromD = this._customFrom ? new Date(this._customFrom) : null;
       const toD = this._customTo ? new Date(this._customTo) : null;
       for (const s of this.sales) {
         const d = s.date ? new Date(s.date) : null;
         if (!d) continue;
         if (useCustom) {
           if (fromD && d < fromD) continue;
           if (toD) {
             const end = new Date(toD.getFullYear(), toD.getMonth(), toD.getDate(), 23, 59, 59, 999);
             if (d > end) continue;
           }
           rTotal += (typeof s.amount === 'number' ? s.amount : Number(s.amount || 0));
           rCount += 1;
         } else {
           if (d >= rangeCutoff) {
             rTotal += (typeof s.amount === 'number' ? s.amount : Number(s.amount || 0));
             rCount += 1;
           }
         }
       }
       const avg = rCount ? (rTotal / rCount) : 0;
       return {
         sumText: nf.format(rTotal),
         countText: String(rCount),
         last30Text: nf.format(last30),
         avgText: nf.format(avg)
       };
     }

     updateCards(scopeEl) {
       const { sumText, countText, last30Text, avgText } = this.kpis();
       const sumEl = scopeEl.querySelector('#rep-sum');
       const cntEl = scopeEl.querySelector('#rep-count');
       const lastEl = scopeEl.querySelector('#rep-last30');
       const avgEl = scopeEl.querySelector('#rep-avg');
       if (sumEl) sumEl.innerHTML = sumText + ' <span class="text-white/70 text-lg">BGN</span>';
       if (cntEl) cntEl.textContent = countText;
       if (lastEl) lastEl.innerHTML = last30Text + ' <span class="text-white/70 text-lg">BGN</span>';
       if (avgEl) avgEl.innerHTML = avgText + ' <span class="text-white/70 text-lg">BGN</span>';
     }

     drawRevenueChart(scopeEl) {
       const canvas = scopeEl.querySelector('#rep-line');
       if (!canvas) return;
       const ctx = canvas.getContext('2d');
       // Resize to container width for crisp drawing
       const parentWidth = canvas.parentElement.clientWidth || 600;
       const dpr = Math.max(window.devicePixelRatio || 1, 1);
       const height = canvas.getAttribute('height') ? Number(canvas.getAttribute('height')) : 180;
       canvas.width = Math.floor(parentWidth * dpr);
       canvas.height = Math.floor(height * dpr);
       canvas.style.width = parentWidth + 'px';
       canvas.style.height = height + 'px';
       ctx.scale(dpr, dpr);

       // Build last 90 days series (daily sum)
       const series = this.buildDailySeries(90);
       const w = parentWidth; const h = height;
       ctx.clearRect(0, 0, w, h);

       // Padding and axes
       const pad = { l: 36, r: 10, t: 10, b: 22 };
       const plotW = w - pad.l - pad.r;
       const plotH = h - pad.t - pad.b;
       ctx.fillStyle = 'rgba(255,255,255,0.08)';
       ctx.fillRect(pad.l, pad.t, plotW, plotH);

       const maxVal = Math.max(1, ...series.map(p => p.v));
       // Y ticks (4 lines)
       ctx.strokeStyle = 'rgba(255,255,255,0.08)';
       ctx.lineWidth = 1;
       ctx.beginPath();
       for (let i = 0; i <= 4; i++) {
         const y = pad.t + (plotH * i) / 4;
         ctx.moveTo(pad.l, y);
         ctx.lineTo(pad.l + plotW, y);
       }
       ctx.stroke();

       // Y labels
       ctx.fillStyle = 'rgba(255,255,255,0.7)';
       ctx.font = '12px sans-serif';
       for (let i = 0; i <= 4; i++) {
         const val = (maxVal * (1 - i / 4));
         const y = pad.t + (plotH * i) / 4;
         ctx.fillText(this.formatBgn(val), 2, y + 4);
       }

       // Line path
       ctx.strokeStyle = 'rgba(59,130,246,0.9)'; // blue-500
       ctx.lineWidth = 2;
       ctx.beginPath();
       series.forEach((p, idx) => {
         const x = pad.l + (plotW * idx) / Math.max(1, series.length - 1);
         const y = pad.t + plotH - (p.v / maxVal) * plotH;
         if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
       });
       ctx.stroke();

       // X labels (start, middle, end dates)
       if (series.length) {
         ctx.fillStyle = 'rgba(255,255,255,0.7)';
         ctx.font = '12px sans-serif';
         const first = series[0].d;
         const mid = series[Math.floor(series.length / 2)].d;
         const last = series[series.length - 1].d;
         const fmt = (d) => `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
         ctx.fillText(fmt(first), pad.l, h - 4);
         ctx.fillText(fmt(mid), pad.l + plotW / 2 - 16, h - 4);
         ctx.fillText(fmt(last), pad.l + plotW - 34, h - 4);
       }

       // Save chart geometry for hover interaction
       this._chart = { series, pad, plotW, plotH, w, h, maxVal };

       // Draw hover if any
       if (this._hoverIdx >= 0) {
         this.drawHover(scopeEl);
       }
     }

     buildDailySeries(daysBack) {
       const now = new Date();
       const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
       const buckets = new Map(); // key: yyyy-mm-dd
       for (let i = daysBack - 1; i >= 0; i--) {
         const d = new Date(start.getTime() - i * 24 * 60 * 60 * 1000);
         const key = d.toISOString().slice(0,10);
         buckets.set(key, { d, v: 0 });
       }
       for (const s of this.sales) {
         const d = s.date ? new Date(s.date) : null;
         if (!d) continue;
         const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10);
         if (buckets.has(key)) {
           const cur = buckets.get(key);
           cur.v += (typeof s.amount === 'number' ? s.amount : Number(s.amount || 0));
         }
       }
       return Array.from(buckets.values());
     }

     formatBgn(val) {
       try {
         return new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'BGN', maximumFractionDigits: 0 }).format(val);
       } catch (_) {
         return (Math.round(val)).toString();
       }
     }

     bindChartHover(scopeEl) {
       const canvas = scopeEl.querySelector('#rep-line');
       if (!canvas) return;
       const onMove = (e) => {
         if (!this._chart) return;
         const rect = canvas.getBoundingClientRect();
         const x = e.clientX - rect.left;
         const { pad, plotW, series } = this._chart;
         if (!series || !series.length) return;
         const rel = Math.max(0, Math.min(1, (x - pad.l) / Math.max(1, plotW)));
         const idx = Math.round(rel * (series.length - 1));
         if (idx !== this._hoverIdx) {
           this._hoverIdx = idx;
           this.drawRevenueChart(scopeEl); // redraw with hover
         }
       };
       const onLeave = () => {
         if (this._hoverIdx !== -1) {
           this._hoverIdx = -1;
           this.drawRevenueChart(scopeEl);
         }
       };
       canvas.addEventListener('mousemove', onMove);
       canvas.addEventListener('mouseleave', onLeave);
     }

     drawHover(scopeEl) {
       if (!this._chart) return;
       const { series, pad, plotW, plotH, h, maxVal } = this._chart;
       const canvas = scopeEl.querySelector('#rep-line');
       if (!canvas || !series || this._hoverIdx < 0 || this._hoverIdx >= series.length) return;
       const ctx = canvas.getContext('2d');
       const idx = this._hoverIdx;
       const p = series[idx];
       const x = pad.l + (plotW * idx) / Math.max(1, series.length - 1);
       const y = pad.t + plotH - (p.v / maxVal) * plotH;

       // Vertical guide line
       ctx.strokeStyle = 'rgba(255,255,255,0.25)';
       ctx.lineWidth = 1;
       ctx.beginPath();
       ctx.moveTo(x, pad.t);
       ctx.lineTo(x, pad.t + plotH);
       ctx.stroke();

       // Point marker
       ctx.fillStyle = 'rgba(59,130,246,1)';
       ctx.beginPath();
       ctx.arc(x, y, 4, 0, Math.PI * 2);
       ctx.fill();
       ctx.strokeStyle = '#fff';
       ctx.lineWidth = 1;
       ctx.stroke();

       // Tooltip box
       const dateStr = `${String(p.d.getDate()).padStart(2,'0')}.${String(p.d.getMonth()+1).padStart(2,'0')}.${String(p.d.getFullYear())}`;
       const valStr = this.formatBgn(p.v);
       const text1 = dateStr;
       const text2 = valStr;
       ctx.font = '12px sans-serif';
       const w1 = ctx.measureText(text1).width;
       const w2 = ctx.measureText(text2).width;
       const boxW = Math.max(w1, w2) + 12;
       const boxH = 34;
       let bx = x + 10;
       let by = y - boxH - 10;
       if (bx + boxW > pad.l + plotW) bx = x - boxW - 10;
       if (by < 0) by = y + 10;
       ctx.fillStyle = 'rgba(17,24,39,0.9)'; // dark bg
       ctx.strokeStyle = 'rgba(255,255,255,0.2)';
       ctx.lineWidth = 1;
       ctx.beginPath();
       ctx.roundRect ? ctx.roundRect(bx, by, boxW, boxH, 6) : ctx.rect(bx, by, boxW, boxH);
       ctx.fill();
       ctx.stroke();
       ctx.fillStyle = '#fff';
       ctx.fillText(text1, bx + 6, by + 14);
       ctx.fillText(text2, bx + 6, by + 28);
     }

     bindDrilldowns(scopeEl) {
       // Card clicks navigate to Sales with range: use custom range if set, else current preset range
       const cardEls = Array.from(scopeEl.querySelectorAll('[data-card-key]'));
       cardEls.forEach(el => {
         const key = el.getAttribute('data-card-key');
         if (!key) return;
         el.addEventListener('click', () => {
           // Special-case: "Последни 30 дни" always drills into last 30 days
           if (key === 'last30') {
             const to = new Date();
             const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
             const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
             const qs = `from=${fmt(from)}&to=${fmt(to)}`;
             window.location.hash = `#/sales?${qs}`;
             return;
           }
           const useCustom = (this._customFrom || this._customTo);
           if (useCustom) {
             const qs = `from=${encodeURIComponent(this._customFrom || '')}&to=${encodeURIComponent(this._customTo || '')}`;
             window.location.hash = `#/sales?${qs}`;
           } else {
             const to = new Date();
             const from = new Date(to.getTime() - this._rangeDays * 24 * 60 * 60 * 1000);
             const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
             const qs = `from=${fmt(from)}&to=${fmt(to)}`;
             window.location.hash = `#/sales?${qs}`;
           }
         });
       });

       // Chart click -> navigate to the clicked day as from=to=that day
       const canvas = scopeEl.querySelector('#rep-line');
       if (canvas) {
         canvas.addEventListener('click', (e) => {
           if (!this._chart) return;
           const rect = canvas.getBoundingClientRect();
           const x = e.clientX - rect.left;
           const { pad, plotW, series } = this._chart;
           if (!series || !series.length) return;
           const rel = Math.max(0, Math.min(1, (x - pad.l) / Math.max(1, plotW)));
           const idx = Math.round(rel * (series.length - 1));
           const p = series[idx];
           const d = p.d;
           const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
           const day = fmt(d);
           window.location.hash = `#/sales?from=${day}&to=${day}`;
         });
       }
     }
  }
  window.ReportsManager = ReportsManager;
})();
