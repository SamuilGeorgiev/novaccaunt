// Supabase integration scaffold (no real calls yet)
(function(){
  const state = {
    url: null,
    anonKey: null,
    client: null,
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
    const { data, error } = await state.client
      .from('sales')
      .select('id,date,client,amount')
      .order('date', { ascending: false })
      .limit(100);
    if (error) {
      console.error('Supabase loadSales error:', error);
      return [];
    }
    return Array.isArray(data) ? data : [];
  }

  async function loadInvoices() {
    if (!state.client) return [];
    return [];
  }

  async function createSale({ id, date, client, amount }) {
    if (!state.client) throw new Error('Supabase not initialized');
    const payload = { id, date, client, amount };
    const { data, error } = await state.client
      .from('sales')
      .insert(payload)
      .select('id,date,client,amount')
      .single();
    if (error) throw error;
    return data;
  }

  window.supabaseApi = {
    configure,
    isConfigured,
    get client() { return state.client; },
    loadSales,
    loadInvoices,
    createSale,
  };
})();
