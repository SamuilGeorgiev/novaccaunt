// Documents module: upload, client-side OCR (Tesseract.js), parse, and review
(function(){
  class DocumentsManager {
    constructor() {
      this.state = {
        uploading: false,
        ocrRunning: false,
        file: null,
        imageUrl: null,
        ocrText: '',
        extraction: null,
        error: null,
      };
    }

    render(container) {
      container.innerHTML = [
        '<section class="py-6">',
        '  <h1 class="text-2xl font-semibold mb-4">Документи</h1>',
        '  <div class="grid md:grid-cols-2 gap-6">',
        '    <div class="space-y-4">',
        '      <label class="block">',
        '        <span class="text-sm text-gray-300">Качи документ (PDF/JPG/PNG)</span>',
        '        <input id="doc-file-input" type="file" accept="image/*,application/pdf" class="mt-1 block w-full text-sm" />',
        '      </label>',
        '      <div class="flex gap-2">',
        '        <button id="doc-ocr-btn" class="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50">OCR / Разпознаване</button>',
        '        <button id="doc-upload-btn" class="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50">Запази в облака</button>',
        '      </div>',
        '      <div id="doc-error" class="text-red-400 text-sm"></div>',
        '      <div class="border border-slate-700 rounded p-3 min-h-[220px] bg-slate-900">',
        '        <div class="text-xs text-slate-400 mb-2">Преглед</div>',
        '        <div id="doc-preview" class="flex items-start gap-3">',
        '          <div class="w-40 min-h-40 bg-slate-800 rounded flex items-center justify-center text-slate-500">Няма изображение</div>',
        '        </div>',
        '      </div>',
        '    </div>',
        '    <div class="space-y-4">',
        '      <div class="border border-slate-700 rounded p-3 bg-slate-900">',
        '        <div class="text-xs text-slate-400 mb-2">Разпознат текст (OCR)</div>',
        '        <pre id="doc-ocr-text" class="whitespace-pre-wrap text-xs text-slate-200 max-h-64 overflow-auto"></pre>',
        '      </div>',
        '      <div class="border border-slate-700 rounded p-3 bg-slate-900">',
        '        <div class="text-xs text-slate-400 mb-2">Извлечени полета</div>',
        '        <div id="doc-fields" class="text-sm text-slate-200">Няма данни</div>',
        '      </div>',
        '    </div>',
        '  </div>',
        '</section>'
      ].join('\n');

      this.bind(container);
      this.updateButtons(container);
    }

    bind(container) {
      const fileInput = container.querySelector('#doc-file-input');
      fileInput.addEventListener('change', (e) => this.onFileSelected(e));

      const ocrBtn = container.querySelector('#doc-ocr-btn');
      ocrBtn.addEventListener('click', () => this.runOcr(container));

      const uploadBtn = container.querySelector('#doc-upload-btn');
      uploadBtn.addEventListener('click', () => this.saveToCloud(container));
    }

    updateButtons(container) {
      const { file, ocrRunning, uploading } = this.state;
      const ocrBtn = container.querySelector('#doc-ocr-btn');
      const uploadBtn = container.querySelector('#doc-upload-btn');
      if (ocrBtn) ocrBtn.disabled = !file || ocrRunning;
      if (uploadBtn) uploadBtn.disabled = !file || uploading;
    }

    setError(container, msg) {
      const el = container.querySelector('#doc-error');
      if (el) el.textContent = msg || '';
    }

    onFileSelected(e) {
      const file = e.target.files && e.target.files[0];
      this.state.file = file || null;
      this.state.ocrText = '';
      this.state.extraction = null;
      this.state.error = null;

      const preview = document.getElementById('doc-preview');
      if (preview) {
        if (file && file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          this.state.imageUrl = url;
          preview.innerHTML = '<img src="' + url + '" class="max-w-full max-h-60 rounded border border-slate-700" />';
        } else {
          this.state.imageUrl = null;
          preview.innerHTML = '<div class="w-40 min-h-40 bg-slate-800 rounded flex items-center justify-center text-slate-500">' + (file ? 'Файл избран' : 'Няма изображение') + '</div>';
        }
      }
      const ocrTextEl = document.getElementById('doc-ocr-text');
      if (ocrTextEl) ocrTextEl.textContent = '';
      const fieldsEl = document.getElementById('doc-fields');
      if (fieldsEl) fieldsEl.innerHTML = 'Няма данни';

      const container = document.getElementById('route-container');
      this.updateButtons(container);
    }

    async runOcr(container) {
      this.setError(container, '');
      const { file } = this.state;
      if (!file) {
        this.setError(container, 'Моля, изберете файл.');
        return;
      }
      if (!window.Tesseract) {
        this.setError(container, 'Tesseract.js липсва.');
        return;
      }
      try {
        this.state.ocrRunning = true;
        this.updateButtons(container);
        const worker = await window.Tesseract.createWorker();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        const { data } = await worker.recognize(file);
        await worker.terminate();
        const text = (data && data.text) || '';
        this.state.ocrText = text;
        const ocrTextEl = container.querySelector('#doc-ocr-text');
        if (ocrTextEl) ocrTextEl.textContent = text.trim();
        // Parse to structured fields
        const extraction = this.parseFields(text);
        this.state.extraction = extraction;
        this.renderFields(container, extraction);
      } catch (e) {
        console.error(e);
        this.setError(container, 'OCR грешка: ' + (e.message || e));
      } finally {
        this.state.ocrRunning = false;
        this.updateButtons(container);
      }
    }

    parseFields(text) {
      // Very simple heuristics; replace with provider-normalized JSON when using managed OCR
      const lines = (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const full = lines.join(' ');

      const currencyMatch = full.match(/\b(BGN|EUR|USD|лв\.?|€|\$)\b/i);
      const currency = currencyMatch ? currencyMatch[1].toUpperCase().replace('ЛВ', 'BGN').replace('€','EUR').replace('$','USD') : null;

      const dateMatch = full.match(/(\d{2}[\.\/-]\d{2}[\.\/-]\d{2,4}|\d{4}[\.\/-]\d{2}[\.\/-]\d{2})/);
      const date = dateMatch ? dateMatch[1] : null;

      const totalMatch = full.match(/\b(TOTAL|ИТОГ|ОБЩО)\s*[:\-]?\s*([0-9]+[\.,][0-9]{2})/i) || full.match(/\b([0-9]+[\.,][0-9]{2})\s*(BGN|EUR|USD|лв\.?|€|\$)\b/i);
      const total = totalMatch ? (totalMatch[2] || totalMatch[1]) : null;

      const taxMatch = full.match(/\b(VAT|ДДС|TAX)\s*[:\-]?\s*([0-9]+[\.,][0-9]{2})/i);
      const tax = taxMatch ? taxMatch[2] : null;

      // Vendor heuristic: first non-empty line that seems like a name (uppercase words)
      let vendor = null;
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const s = lines[i];
        if (/^[A-ZА-Я0-9][A-ZА-Я0-9\-\s\.&,'"]{3,}$/.test(s) && !/invoice|receipt|фактура|касова|номер/i.test(s)) {
          vendor = s;
          break;
        }
      }

      // Extremely basic line item detection: lines like "desc qty x price = amount"
      const items = [];
      lines.forEach((ln) => {
        const m = ln.match(/^(.+?)\s+(\d+[\.,]?\d*)\s*[x×]\s*(\d+[\.,]?\d*)\s*[=]\s*(\d+[\.,]?\d*)/i);
        if (m) {
          items.push({
            description: m[1].trim(),
            quantity: parseFloat(m[2].replace(',', '.')),
            unit_price: parseFloat(m[3].replace(',', '.')),
            amount: parseFloat(m[4].replace(',', '.')),
          });
        }
      });

      return {
        vendor,
        date,
        total: total ? parseFloat(String(total).replace(',', '.')) : null,
        tax: tax ? parseFloat(String(tax).replace(',', '.')) : null,
        currency: currency || null,
        items,
        raw_text: text,
      };
    }

    renderFields(container, data) {
      const el = container.querySelector('#doc-fields');
      if (!el) return;
      if (!data) { el.textContent = 'Няма данни'; return; }
      const itemsHtml = (data.items || []).map((it, i) => (
        '<div class="flex justify-between text-xs border-b border-slate-800 py-1">' +
        '<div>' + (i+1) + '. ' + this.escape(it.description) + '</div>' +
        '<div class="text-slate-400">' + it.quantity + ' x ' + it.unit_price + ' = ' + it.amount + '</div>' +
        '</div>'
      )).join('');
      el.innerHTML = [
        '<div class="grid grid-cols-2 gap-3 text-sm">',
        '  <div><span class="text-slate-400">Доставчик:</span> ' + this.escape(data.vendor || '-') + '</div>',
        '  <div><span class="text-slate-400">Дата:</span> ' + this.escape(data.date || '-') + '</div>',
        '  <div><span class="text-slate-400">Валута:</span> ' + this.escape(data.currency || '-') + '</div>',
        '  <div><span class="text-slate-400">Общо:</span> ' + (data.total ?? '-') + '</div>',
        '  <div><span class="text-slate-400">ДДС:</span> ' + (data.tax ?? '-') + '</div>',
        '</div>',
        '<div class="mt-3">',
        '  <div class="text-xs text-slate-400 mb-1">Редове</div>',
        itemsHtml || '<div class="text-xs text-slate-500">—</div>',
        '</div>'
      ].join('\n');
    }

    escape(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
    }

    async saveToCloud(container) {
      this.setError(container, '');
      const { file, extraction } = this.state;
      if (!file) { this.setError(container, 'Няма избран файл.'); return; }
      if (!window.supabaseApi || !window.supabaseApi.client) {
        this.setError(container, 'Supabase не е конфигуриран.');
        return;
      }
      try {
        this.state.uploading = true;
        this.updateButtons(container);
        const uploaded = await window.supabaseApi.uploadDocument(file, { folder: 'inbox' });
        const doc = await window.supabaseApi.createDocumentRecord({ type: 'invoice', storage_path: uploaded.path, ocr_provider: 'tesseract', status: 'uploaded' });
        if (extraction) {
          await window.supabaseApi.saveDocumentExtraction(doc.id, extraction, { confidence: null });
        }
        this.setError(container, '✅ Запазено.');
      } catch (e) {
        console.error(e);
        this.setError(container, 'Грешка при запис: ' + (e.message || e));
      } finally {
        this.state.uploading = false;
        this.updateButtons(container);
      }
    }
  }

  window.DocumentsManager = DocumentsManager;
})();
