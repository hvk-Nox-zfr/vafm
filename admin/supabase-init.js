// supabase-init.js (UMD, safe)
const SUPABASE_URL = "https://blronpowdhaumjudtgvn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI";

(function initSupabaseUMD(timeout = 5000) {
  const start = Date.now();

  function tryInit() {
    if (typeof window.supabase === 'undefined') return false;
    try {
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      window.__supabaseClient = client;
      window.getDb = () => client;
      window.__supabaseReady = Promise.resolve(client);
      console.log("✅ supabase-init.js : client UMD initialisé");
      return true;
    } catch (err) {
      console.error("❌ supabase-init.js : erreur lors de createClient", err);
      return false;
    }
  }

  (function poll() {
    if (tryInit()) return;
    if (Date.now() - start > timeout) {
      console.error("❌ supabase-init.js : timeout initialisation Supabase");
      window.__supabaseReady = Promise.reject(new Error('Supabase init timeout'));
      return;
    }
    requestAnimationFrame(poll);
  })();
})();
