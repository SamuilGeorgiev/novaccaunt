// This file holds the configuration for your Supabase project.

// Replace these placeholder values with your actual Supabase project URL and anon key.
const SUPABASE_URL = 'https://hgsieuhccjeoewirntye.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhnc2lldWhjY2plb2V3aXJudHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NjIzMDUsImV4cCI6MjA2OTUzODMwNX0.p__CmlL62tkDaTVUkEJ0dgYpQWGUXRcaxwS6FIdIv2M';

// Ensure the `supabaseApi` object is available before trying to configure it.
if (window.supabaseApi) {
  window.supabaseApi.configure({
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  });
} else {
  console.error('The supabaseApi module was not found. Please check your script loading order.');
}