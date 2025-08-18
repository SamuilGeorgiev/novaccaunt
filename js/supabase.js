// Supabase integration scaffold (no real calls yet)
(function(){
  const state = {
    url: null,
    anonKey: null,
    client: null,
    salesIdIsUuid: null,
  };

  function configure({ url, anonKey }) {
    state.url = url || null;
    state.anonKey = anonKey || null;
    try {
      if (state.url && state.anonKey && typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
        state.client = window.supabase.createClient(state.url, state.anonKey);
      }
    } catch (e) {
      console.error('Supabase client init failed:', e);
      state.client = null;
    }
  }

  function isConfigured() {
    return Boolean(state.url && state.anonKey);
  }

  // Example API wrappers (stubbed for now)
  async function loadSales() {
    if (!state.client) return [];
    // Try ordering by 'date', then 'created_at', then no ordering
    try {
      const { data, error } = await state.client
        .from('sales')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);
      if (!error) {
        const arr = Array.isArray(data) ? data : [];
        inferSalesIdShape(arr);
        return arr;
      }
      // If column missing (Postgres code 42703) or similar, fall through to try created_at
      if (error && (error.code === '42703' || /column\s+\"?date\"?\s+does not exist/i.test(error.message || ''))) {
        // try created_at
      } else {
        console.error('Supabase loadSales error:', error);
        return [];
      }
    } catch (e) {
      console.warn('loadSales date order failed, retrying with created_at', e);
    }

    try {
      const { data, error } = await state.client
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error) return Array.isArray(data) ? data : [];
      if (error && (error.code === '42703' || /column\s+\"?created_at\"?\s+does not exist/i.test(error.message || ''))) {
        // final fallback below
      } else {
        console.error('Supabase loadSales error (created_at):', error);
        return [];
      }
    } catch (e) {
      console.warn('loadSales created_at order failed, fallback to no order', e);
    }

    // Final fallback: no ordering
    try {
      const { data, error } = await state.client
        .from('sales')
        .select('*')
        .limit(100);
      if (error) {
        console.error('Supabase loadSales error (no order):', error);
        return [];
      }
      const arr = Array.isArray(data) ? data : [];
      inferSalesIdShape(arr);
      return arr;
    } catch (e) {
      console.error('Supabase loadSales unexpected error:', e);
      return [];
    }
  }

  async function loadInvoices() {
    if (!state.client) return [];
    // Try ordering by 'date', then 'created_at', then no ordering
    try {
      const { data, error } = await state.client
        .from('invoices')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);
      if (!error) return Array.isArray(data) ? data : [];
      if (!(error.code === '42703' || /column\s+"?date"?\s+does not exist/i.test(error.message || ''))) {
        console.error('Supabase loadInvoices error:', error);
        return [];
      }
    } catch (e) {
      console.warn('loadInvoices date order failed, retry with created_at', e);
    }

    try {
      const { data, error } = await state.client
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error) return Array.isArray(data) ? data : [];
      if (!(error.code === '42703' || /column\s+"?created_at"?\s+does not exist/i.test(error.message || ''))) {
        console.error('Supabase loadInvoices error (created_at):', error);
        return [];
      }
    } catch (e) {
      console.warn('loadInvoices created_at order failed, fallback to no order', e);
    }

    try {
      const { data, error } = await state.client
        .from('invoices')
        .select('*')
        .limit(100);
      if (error) {
        console.error('Supabase loadInvoices error (no order):', error);
        return [];
      }
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('Supabase loadInvoices unexpected error:', e);
      return [];
    }
  }

  async function createSale({ date, client, amount }) {
    if (!state.client) throw new Error('Supabase not initialized');
    const payload = { date, client, amount };
    let { data, error } = await state.client
      .from('sales')
      .insert(payload)
      .select('id,date,client,amount')
      .single();
    // If DB requires an id (no default), fall back to client-generated id
    if (error) {
      const needsId = error.code === '23502' || /null value in column\s+"?id"?/i.test(error.message || '') || /does not have a default/i.test(error.message || '');
      if (needsId) {
        const clientId = generateClientId();
        const retryPayload = { id: clientId, date, client, amount };
        const retry = await state.client
          .from('sales')
          .insert(retryPayload)
          .select('id,date,client,amount')
          .single();
        if (retry.error) throw retry.error;
        data = retry.data;
        error = null;
      } else {
        throw error;
      }
    }
    return data;
  }

  async function updateSale(id, { date, client, amount }) {
    if (!state.client) throw new Error('Supabase not initialized');
    if (!id) throw new Error('Missing id');
    const payload = {};
    if (date !== undefined) payload.date = date;
    if (client !== undefined) payload.client = client;
    if (amount !== undefined) payload.amount = amount;
    const { data, error } = await state.client
      .from('sales')
      .update(payload)
      .eq('id', id)
      .select('id,date,client,amount')
      .single();
    if (error) throw error;
    return data;
  }

  async function deleteSale(id) {
    if (!state.client) throw new Error('Supabase not initialized');
    if (!id) throw new Error('Missing id');
    // Try deleting by id first
    let resp = await state.client
      .from('sales')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    let data = resp.data;
    let error = resp.error;
    if (error) {
      const idColumnMissing = error.code === '42703' || /column\s+"?id"?\s+does not exist/i.test(error.message || '');
      const zeroRows = error.code === 'PGRST116' || /Results contain 0 rows/i.test(error.message || '') || resp.status === 406;
      if (idColumnMissing) {
        const retry = await state.client
          .from('sales')
          .delete()
          .eq('sale_no', id)
          .select('sale_no: id')
          .maybeSingle();
        if (retry.error && !(retry.error.code === 'PGRST116' || /Results contain 0 rows/i.test(retry.error.message || '') || retry.status === 406)) {
          throw retry.error;
        }
        data = retry.data || { id };
      } else if (zeroRows) {
        // Consider as success: nothing to delete remotely
        data = { id };
      } else {
        throw error;
      }
    }
    return data || { id };
  }

  async function createInvoice({ date, client, amount, number }) {
    if (!state.client) throw new Error('Supabase not initialized');
    const base = { date, client, amount };
    const insertPayload = number ? { ...base, number } : base;
    let { data, error } = await state.client
      .from('invoices')
      .insert(insertPayload)
      .select('*')
      .single();
    if (error) {
      const needsId = error.code === '23502' || /null value in column\s+"?id"?/i.test(error.message || '') || /does not have a default/i.test(error.message || '');
      const idColumnMissing = error.code === '42703' || /column\s+"?id"?\s+does not exist/i.test(error.message || '');
      if (needsId) {
        const clientId = generateClientId();
        const retry = await state.client
          .from('invoices')
          .insert({ id: clientId, ...base, ...(number ? { number } : {}) })
          .select('*')
          .single();
        if (retry.error) throw retry.error;
        data = retry.data;
      } else if (idColumnMissing) {
        const key = number || generateClientId();
        const retry = await state.client
          .from('invoices')
          .insert({ invoice_no: key, ...base, ...(number ? { number } : {}) })
          .select('*')
          .single();
        if (retry.error) throw retry.error;
        data = retry.data;
      } else {
        throw error;
      }
    }
    return data;
  }

  async function updateInvoice(id, { date, client, amount, number }) {
    if (!state.client) throw new Error('Supabase not initialized');
    if (!id) throw new Error('Missing id');
    const payload = {};
    if (date !== undefined) payload.date = date;
    if (client !== undefined) payload.client = client;
    if (amount !== undefined) payload.amount = amount;
    if (number !== undefined) payload.number = number;
    let { data, error } = await state.client
      .from('invoices')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      const idColumnMissing = error.code === '42703' || /column\s+"?id"?\s+does not exist/i.test(error.message || '');
      if (idColumnMissing) {
        const retry = await state.client
          .from('invoices')
          .update(payload)
          .eq('invoice_no', id)
          .select('*')
          .single();
        if (retry.error) throw retry.error;
        data = retry.data;
      } else {
        throw error;
      }
    }
    return data;
  }

  async function deleteInvoice(id) {
    if (!state.client) throw new Error('Supabase not initialized');
    if (!id) throw new Error('Missing id');
    let resp = await state.client
      .from('invoices')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    let data = resp.data;
    let error = resp.error;
    if (error) {
      const idColumnMissing = error.code === '42703' || /column\s+"?id"?\s+does not exist/i.test(error.message || '');
      const zeroRows = error.code === 'PGRST116' || /Results contain 0 rows/i.test(error.message || '') || resp.status === 406;
      if (idColumnMissing) {
        const retry = await state.client
          .from('invoices')
          .delete()
          .eq('invoice_no', id)
          .select('invoice_no')
          .maybeSingle();
        if (retry.error && !(retry.error.code === 'PGRST116' || /Results contain 0 rows/i.test(retry.error.message || '') || retry.status === 406)) {
          throw retry.error;
        }
        data = retry.data || { id };
      } else if (zeroRows) {
        data = { id };
      } else {
        throw error;
      }
    }
    return data || { id };
  }

  function inferSalesIdShape(rows) {
    if (!Array.isArray(rows) || !rows.length) return;
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const sample = rows.slice(0, 5).map(r => r && r.id).filter(Boolean);
    if (!sample.length) return;
    const allUuid = sample.every(v => typeof v === 'string' && re.test(v));
    state.salesIdIsUuid = allUuid;
  }

  function generateClientId() {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
    } catch (_) {}
    return 'TEMP-' + Date.now();
  }

  window.supabaseApi = {
    configure,
    isConfigured,
    get client() { return state.client; },
    get salesIdIsUuid() { return state.salesIdIsUuid; },
    loadSales,
    loadInvoices,
    createSale,
    updateSale,
    deleteSale,
    createInvoice,
    updateInvoice,
    deleteInvoice,
  };
})();
