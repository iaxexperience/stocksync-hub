import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fyvatfnpdoqowjckhtkb.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dmF0Zm5wZG9xb3dqY2todGtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzgwOTU4NSwiZXhwIjoyMDk5Mzg1NTg1fQ.GRRl_kR2OrFVNkynTZR1YfEbil6dzb1Hr5qjYbba5QU";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: orgs, error } = await supabase.from("organizations").select("*");
  if (error) {
    console.error("Error:", error);
    process.exit(1);
  }
  console.log("Organizations in DB:", orgs);
  process.exit(0);
}

run();
