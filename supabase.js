// Supabase Connection

import { createClient } from 
"https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";


const supabaseUrl = "https://qbqqwnozlmcwastcysap.supabase.co";

const supabaseKey = "sb_publishable_TLwNBS7mTcqb084AVRLF4w_dJLnPwbe";


export const supabase = createClient(
    supabaseUrl,
    supabaseKey
);

window.supabaseClient = supabase;