import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://blronpowdhaumjudtgvn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscm9ucG93ZGhhdW1qdWR0Z3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODU4MDAsImV4cCI6MjA4NDU2MTgwMH0.ThzU_Eqgwy0Qx2vTO381R0HHvV1jfhsAZFxY-Aw4hXI";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// expose le client pour editeur.js
window.supabase = supabase;
window.__supabaseReady = Promise.resolve(supabase);

console.log('supabase-init: client exposé sur window.__supabaseReady');
export { supabase };
