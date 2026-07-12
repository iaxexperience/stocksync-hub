const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/routes/_authenticated/clientes.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add query for organization settings
const orgQueryOld = `  // Fetch active organization details for the contract
  const { data: organization } = useQuery({
    queryKey: ["active_organization", customer?.organization_id],
    enabled: !!customer?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", customer.organization_id)
        .single();
      if (error) throw error;
      return data;
    },
  });`;

const orgQueryNew = `  // Fetch active organization details for the contract
  const { data: organization } = useQuery({
    queryKey: ["active_organization", customer?.organization_id],
    enabled: !!customer?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", customer.organization_id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch active organization settings for WhatsApp templates/integration
  const { data: settings } = useQuery({
    queryKey: ["active_organization_settings", customer?.organization_id],
    enabled: !!customer?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", customer.organization_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });`;

if (content.includes(orgQueryOld)) {
  content = content.replace(orgQueryOld, orgQueryNew);
  console.log('Added settings query in clientes.tsx.');
} else {
  console.error('Could not find orgQueryOld!');
}

// 2. Update handleSendWhatsApp
const handleSendWhatsAppOld = `  // Links de simulação
  function handleSendWhatsApp() {
    const text = encodeURIComponent(
      \`Olá \${customer.name}, seu contrato digital #\${order.order_number} do StockFlow foi assinado com sucesso! Visualize o PDF no link: https://stockflow.com/v/contrato-\${order.order_number}\`,
    );
    const phoneNum = customer.whatsapp ? customer.whatsapp.replace(/\\D/g, "") : "";
    window.open(\`https://api.whatsapp.com/send?phone=\${phoneNum}&text=\${text}\`, "_blank");
  }`;

const handleSendWhatsAppNew = `  // Links de simulação
  function handleSendWhatsApp() {
    const phoneNum = customer.whatsapp ? customer.whatsapp.replace(/\\D/g, "") : "";
    if (!phoneNum) {
      toast.error("Cliente não possui número de WhatsApp cadastrado!");
      return;
    }

    const isMetaActive = 
      settings?.whatsapp_integration_enabled && 
      (settings as any).whatsapp_integration_type === "meta" && 
      (settings as any).whatsapp_api_token && 
      (settings as any).whatsapp_phone_number_id;

    if (isMetaActive) {
      const token = (settings as any).whatsapp_api_token;
      const phoneId = (settings as any).whatsapp_phone_number_id;
      const templateName = (settings as any).whatsapp_template_name || "hello_world";
      
      toast.info("Enviando contrato via WhatsApp (API Oficial Meta)...");
      
      fetch(\`https://graph.facebook.com/v20.0/\${phoneId}/messages\`, {
        method: "POST",
        headers: {
          "Authorization": \`Bearer \${token}\`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phoneNum,
          type: "template",
          template: {
            name: templateName,
            language: {
              code: "pt_BR",
            },
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: customer.name,
                  },
                  {
                    type: "text",
                    text: order.order_number,
                  },
                  {
                    type: "text",
                    text: \`https://stockflow.com/v/contrato-\${order.order_number}\`,
                  }
                ],
              },
            ],
          },
        }),
      })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || "Erro desconhecido");
        }
        toast.success("Mensagem enviada com sucesso pelo WhatsApp!");
      })
      .catch((err) => {
        console.error("Erro Meta API:", err);
        toast.error(\`Erro na API Oficial: \${err.message}. Abrindo link alternativo...\`);
        fallbackLinkSend(phoneNum);
      });
    } else {
      fallbackLinkSend(phoneNum);
    }
  }

  function fallbackLinkSend(phoneNum: string) {
    const templateText = settings?.whatsapp_template || 
      "Olá {nome_cliente}, seu contrato digital #{numero_contrato} do StockFlow foi assinado com sucesso! Visualize o PDF no link: {link_contrato}";
    
    const resolvedText = templateText
      .replace(/{nome_cliente}/g, customer.name)
      .replace(/{numero_contrato}/g, order.order_number)
      .replace(/{valor_total}/g, String(order.total_amount || ""))
      .replace(/{link_contrato}/g, \`https://stockflow.com/v/contrato-\${order.order_number}\`);

    const text = encodeURIComponent(resolvedText);
    window.open(\`https://api.whatsapp.com/send?phone=\${phoneNum}&text=\${text}\`, "_blank");
  }`;

if (content.includes(handleSendWhatsAppOld)) {
  content = content.replace(handleSendWhatsAppOld, handleSendWhatsAppNew);
  console.log('Updated handleSendWhatsApp in clientes.tsx.');
} else {
  console.error('Could not find handleSendWhatsAppOld!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('File updated successfully.');
