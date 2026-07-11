import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fyvatfnpdoqowjckhtkb.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dmF0Zm5wZG9xb3dqY2todGtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzgwOTU4NSwiZXhwIjoyMDk5Mzg1NTg1fQ.GRRl_kR2OrFVNkynTZR1YfEbil6dzb1Hr5qjYbba5QU";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  console.log("Criando e confirmando o usuário...");
  const { data, error } = await supabase.auth.admin.createUser({
    email: "maxrangelformiga@gmail.com",
    password: "admin123@",
    email_confirm: true,
    user_metadata: {
      role: "admin"
    }
  });

  if (error) {
    console.error("Erro ao criar usuário:", error.message);
    process.exit(1);
  }

  console.log("Usuário criado e confirmado com sucesso!", data.user.id);
  process.exit(0);
}

run();
