import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fyvatfnpdoqowjckhtkb.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dmF0Zm5wZG9xb3dqY2todGtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzgwOTU4NSwiZXhwIjoyMDk5Mzg1NTg1fQ.GRRl_kR2OrFVNkynTZR1YfEbil6dzb1Hr5qjYbba5QU";

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    // Let's call RPC. But wait, we want to know if extensions.gen_salt works.
    // If we can't alter the function directly from JS, we can try to see if we can run a SQL function
    // or if we can run it. Let's see if we get the same error.
    const { data, error } = await supabase.rpc('create_new_user_by_admin', {
      p_email: 'test' + Math.floor(Math.random() * 100000) + '@example.com',
      p_password: 'testpassword123',
      p_full_name: 'Test Admin User',
      p_role: 'estoquista',
      p_org_id: 'd9b736b7-4c4c-4a37-bcf6-e05e55ff678e'
    });
    
    console.log("RPC result:", { data, error });
  } catch (err) {
    console.error("Error running RPC:", err);
  }
}

test();
