// supabase-init.js — version UMD propre

const SUPABASE_URL = "https://blronpowdhaumjudtgvn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI";

// Création du client Supabase global (UMD)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exposer proprement
window.supabase = supabase;
window.__supabaseReady = Promise.resolve(supabase);

console.log("supabase-init.js : client UMD initialisé");
export { supabase };
