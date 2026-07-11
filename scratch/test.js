import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://hianqcduecxkwmfbnncf.supabase.co", "sb_publishable_A9EZwRwGAEhlVNXXY90cmQ_2E8TKmM0");

async function run() {
  const { data, error } = await supabase.from('schema_migrations').select('*');
  console.log("Migrations:", { data, error });
}
run();
