import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fyvatfnpdoqowjckhtkb.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dmF0Zm5wZG9xb3dqY2todGtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzgwOTU4NSwiZXhwIjoyMDk5Mzg1NTg1fQ.GRRl_kR2OrFVNkynTZR1YfEbil6dzb1Hr5qjYbba5QU";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("Atualizando dados da organização para Josi & Jó...");
  
  const { data: orgs, error: fetchError } = await supabase.from("organizations").select("id");
  if (fetchError) {
    console.error("Erro ao buscar:", fetchError);
    process.exit(1);
  }

  for (const org of orgs) {
    const { error } = await supabase
      .from("organizations")
      .update({
        name: "Josi & Jó Eletrodomésticos",
        document: "55.839.880/0001-66",
        phone: "(83) 98805-9666",
        email: "contato@josijoeletro.com.br",
        address: "João Pessoa, PB"
      })
      .eq("id", org.id);

    if (error) {
      console.error(`Erro ao atualizar org ${org.id}:`, error.message);
    } else {
      console.log(`Organização ${org.id} atualizada com sucesso!`);
    }
  }

  process.exit(0);
}

run();
