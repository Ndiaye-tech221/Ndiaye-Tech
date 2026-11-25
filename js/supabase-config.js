
// ========================================
// PASSERELLE TECH KÉDOUGOU - SUPABASE
// Configuration de la connexion
// ========================================

const SUPABASE_URL = "https://mhsvkyqdsefphoslwjwq.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_U5YdCT2bKi_dn1jQPnX7CA_O_kqtXSG";

// Initialisation du client Supabase
window.ptkSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

console.log("Connexion Supabase PTK initialisée.");
