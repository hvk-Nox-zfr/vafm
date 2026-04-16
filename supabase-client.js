// --- Initialisation du client Supabase global ---

const SUPABASE_URL = "https://blronpowdhaumjudtgvn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI";

// Vérification que la librairie Supabase est bien chargée
if (!window.supabase) {
    console.error("❌ Supabase JS n'est pas chargé !");
} else {
    window.__supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("✅ Client Supabase initialisé");
}
