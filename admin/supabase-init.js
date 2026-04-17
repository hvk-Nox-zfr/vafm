// supabase-init.js (UMD robuste)
const SUPABASE_URL = "https://blronpowdhaumjudtgvn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI";

(function initSupabaseUMD(options = {}) {
  const timeout = options.timeout ?? 10000; // 10s par défaut
  const pollInterval = options.pollInterval ?? 50;
  const start = Date.now();

  // Promise contrôlée exposée immédiatement pour que les autres scripts puissent await
  let resolveReady, rejectReady;
  if (!window.__supabaseReady || !(window.__supabaseReady instanceof Promise)) {
    window.__supabaseReady = new Promise((res, rej) => {
      resolveReady = res;
      rejectReady = rej;
    });
  } else {
    // si déjà défini, on ne réécrase pas les handlers
    resolveReady = null;
    rejectReady = null;
  }

  function tryInit() {
    if (typeof window.supabase === 'undefined') return false;
    try {
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      window.__supabaseClient = client;
      window.getDb = () => client;
      if (resolveReady) resolveReady(client);
      console.log("✅ supabase-init.js : client UMD initialisé");
      return true;
    } catch (err) {
      console.error("❌ supabase-init.js : erreur lors de createClient", err);
      if (rejectReady) rejectReady(err);
      return false;
    }
  }

  // Si la lib est déjà présente, init tout de suite
  if (tryInit()) return;

  // Polling léger jusqu'au timeout
  const id = setInterval(() => {
    if (tryInit()) {
      clearInterval(id);
      return;
    }
    if (Date.now() - start > timeout) {
      clearInterval(id);
      const err = new Error('Supabase init timeout');
      console.error("❌ supabase-init.js : timeout initialisation Supabase");
      if (rejectReady) rejectReady(err);
      // garantir que window.__supabaseReady est une Promise rejetée
      window.__supabaseReady = Promise.reject(err);
    }
  }, pollInterval);
})();
