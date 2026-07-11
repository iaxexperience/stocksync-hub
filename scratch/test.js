import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://hianqcduecxkwmfbnncf.supabase.co", "sb_publishable_A9EZwRwGAEhlVNXXY90cmQ_2E8TKmM0");

async function run() {
  const { data, error } = await supabase.from('customers').select('*').limit(1);
  console.log("Customers result:", { data, error });
  const { data: profiles, error: errProf } = await supabase.from('profiles').select('*').limit(1);
  console.log("Profiles result:", { profiles, errProf });
}
run();
