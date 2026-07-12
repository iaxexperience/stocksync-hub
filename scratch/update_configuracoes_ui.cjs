const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/routes/_authenticated/configuracoes.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update settingsForm initial state
const settingsFormInitOld = `  const [settingsForm, setSettingsForm] = useState({
    lgpd_consent_text: "",
    lgpd_cookies_enabled: true,
    lgpd_data_deletion_instructions: "",
    primary_color: "#4f46e5",
    secondary_color: "#0f172a",
    company_logo_url: "",
    inactivity_timeout_minutes: 15,
    inactivity_action: "logout",
    email_integration_enabled: false,
    smtp_host: "",
    smtp_port: 587,
    smtp_user: "",
    smtp_password: "",
    smtp_encryption: "tls",
    email_template: "",
    whatsapp_integration_enabled: false,
    whatsapp_template: "",
  });`;

const settingsFormInitNew = `  const [settingsForm, setSettingsForm] = useState({
    lgpd_consent_text: "",
    lgpd_cookies_enabled: true,
    lgpd_data_deletion_instructions: "",
    primary_color: "#4f46e5",
    secondary_color: "#0f172a",
    company_logo_url: "",
    inactivity_timeout_minutes: 15,
    inactivity_action: "logout",
    email_integration_enabled: false,
    smtp_host: "",
    smtp_port: 587,
    smtp_user: "",
    smtp_password: "",
    smtp_encryption: "tls",
    email_template: "",
    whatsapp_integration_enabled: false,
    whatsapp_template: "",
    whatsapp_api_token: "",
    whatsapp_phone_number_id: "",
    whatsapp_business_account_id: "",
    whatsapp_phone_number: "",
    whatsapp_template_name: "hello_world",
    whatsapp_integration_type: "link",
  });`;

if (content.includes(settingsFormInitOld)) {
  content = content.replace(settingsFormInitOld, settingsFormInitNew);
  console.log('Updated settingsForm init.');
} else {
  console.error('Could not find settingsFormInitOld!');
}

// 2. Update useEffect for settings
const useEffectOld = `  useEffect(() => {
    if (settings) {
      setSettingsForm({
        lgpd_consent_text: settings.lgpd_consent_text || "",
        lgpd_cookies_enabled: settings.lgpd_cookies_enabled ?? true,
        lgpd_data_deletion_instructions: settings.lgpd_data_deletion_instructions || "",
        primary_color: settings.primary_color || "#4f46e5",
        secondary_color: settings.secondary_color || "#0f172a",
        company_logo_url: settings.company_logo_url || "",
        inactivity_timeout_minutes: settings.inactivity_timeout_minutes ?? 15,
        inactivity_action: settings.inactivity_action || "logout",
        email_integration_enabled: settings.email_integration_enabled ?? false,
        smtp_host: settings.smtp_host || "",
        smtp_port: settings.smtp_port ?? 587,
        smtp_user: settings.smtp_user || "",
        smtp_password: settings.smtp_password || "",
        smtp_encryption: settings.smtp_encryption || "tls",
        email_template: settings.email_template || "",
        whatsapp_integration_enabled: settings.whatsapp_integration_enabled ?? false,
        whatsapp_template: settings.whatsapp_template || "",
      });
    }
  }, [settings]);`;

const useEffectNew = `  useEffect(() => {
    if (settings) {
      setSettingsForm({
        lgpd_consent_text: settings.lgpd_consent_text || "",
        lgpd_cookies_enabled: settings.lgpd_cookies_enabled ?? true,
        lgpd_data_deletion_instructions: settings.lgpd_data_deletion_instructions || "",
        primary_color: settings.primary_color || "#4f46e5",
        secondary_color: settings.secondary_color || "#0f172a",
        company_logo_url: settings.company_logo_url || "",
        inactivity_timeout_minutes: settings.inactivity_timeout_minutes ?? 15,
        inactivity_action: settings.inactivity_action || "logout",
        email_integration_enabled: settings.email_integration_enabled ?? false,
        smtp_host: settings.smtp_host || "",
        smtp_port: settings.smtp_port ?? 587,
        smtp_user: settings.smtp_user || "",
        smtp_password: settings.smtp_password || "",
        smtp_encryption: settings.smtp_encryption || "tls",
        email_template: settings.email_template || "",
        whatsapp_integration_enabled: settings.whatsapp_integration_enabled ?? false,
        whatsapp_template: settings.whatsapp_template || "",
        whatsapp_api_token: (settings as any).whatsapp_api_token || "",
        whatsapp_phone_number_id: (settings as any).whatsapp_phone_number_id || "",
        whatsapp_business_account_id: (settings as any).whatsapp_business_account_id || "",
        whatsapp_phone_number: (settings as any).whatsapp_phone_number || "",
        whatsapp_template_name: (settings as any).whatsapp_template_name || "hello_world",
        whatsapp_integration_type: (settings as any).whatsapp_integration_type || "link",
      });
    }
  }, [settings]);`;

if (content.includes(useEffectOld)) {
  content = content.replace(useEffectOld, useEffectNew);
  console.log('Updated useEffect for settings.');
} else {
  console.error('Could not find useEffectOld!');
}

// 3. Insert Meta API states and functions before isLoading
const isLoadingOld = `  const isLoading = isLoadingOrg || isLoadingSettings;`;
const functionsAndStates = `  // Meta API actions & states
  const [requestingCode, setRequestingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [sendingTestWa, setSendingTestWa] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<"SMS" | "VOICE">("SMS");
  const [verificationCode, setVerificationCode] = useState("");
  const [testRecipient, setTestRecipient] = useState("");

  const handleRequestMetaCode = async () => {
    if (!settingsForm.whatsapp_api_token || !settingsForm.whatsapp_phone_number_id) {
      toast.error("Preencha o Token de Acesso e o ID do Número de Telefone!");
      return;
    }
    setRequestingCode(true);
    try {
      const response = await fetch(
        \`https://graph.facebook.com/v20.0/\${settingsForm.whatsapp_phone_number_id}/request_code\`,
        {
          method: "POST",
          headers: {
            "Authorization": \`Bearer \${settingsForm.whatsapp_api_token}\`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code_method: verificationMethod,
            locale: "pt_BR",
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Erro desconhecido ao solicitar código.");
      }
      toast.success("Código de verificação solicitado com sucesso! Aguarde o SMS ou chamada.");
    } catch (err: any) {
      toast.error("Erro ao solicitar código: " + err.message);
    } finally {
      setRequestingCode(false);
    }
  };

  const handleVerifyMetaCode = async () => {
    if (!settingsForm.whatsapp_api_token || !settingsForm.whatsapp_phone_number_id || !verificationCode) {
      toast.error("Preencha o Token de Acesso, ID do Número e o Código de Verificação!");
      return;
    }
    setVerifyingCode(true);
    try {
      const response = await fetch(
        \`https://graph.facebook.com/v20.0/\${settingsForm.whatsapp_phone_number_id}/register\`,
        {
          method: "POST",
          headers: {
            "Authorization": \`Bearer \${settingsForm.whatsapp_api_token}\`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            pin: verificationCode,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Erro desconhecido ao cadastrar número.");
      }
      toast.success("Número verificado e cadastrado com sucesso na plataforma da Meta!");
    } catch (err: any) {
      toast.error("Erro ao cadastrar número: " + err.message);
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSendTestMetaMessage = async () => {
    if (!settingsForm.whatsapp_api_token || !settingsForm.whatsapp_phone_number_id || !testRecipient) {
      toast.error("Preencha o Token, ID do Número e o Telefone de Destino!");
      return;
    }
    setSendingTestWa(true);
    try {
      const cleanPhone = testRecipient.replace(/\\D/g, "");
      const response = await fetch(
        \`https://graph.facebook.com/v20.0/\${settingsForm.whatsapp_phone_number_id}/messages\`,
        {
          method: "POST",
          headers: {
            "Authorization": \`Bearer \${settingsForm.whatsapp_api_token}\`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: cleanPhone,
            type: "template",
            template: {
              name: settingsForm.whatsapp_template_name || "hello_world",
              language: {
                code: "pt_BR",
              },
            },
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Erro desconhecido ao enviar mensagem.");
      }
      toast.success("Mensagem de teste (template) enviada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao enviar mensagem de teste: " + err.message);
    } finally {
      setSendingTestWa(false);
    }
  };

  const isLoading = isLoadingOrg || isLoadingSettings;`;

if (content.includes(isLoadingOld)) {
  content = content.replace(isLoadingOld, functionsAndStates);
  console.log('Inserted Meta states and helper functions.');
} else {
  console.error('Could not find isLoadingOld!');
}

// 4. Update the WhatsApp Settings UI Section
const whatsappSectionRegex = /\{\/\* SEÇÃO: WHATSAPP \*\/\}[\s\S]*?<\/div>([\s\S]*?<\/CardContent>)/;

// Let's print out what is there to make sure we match it correctly.
// We'll replace the block from `{/* SEÇÃO: WHATSAPP */}` until the end of that section.
const oldWhatsappSection = `              {/* SEÇÃO: WHATSAPP */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    Integração com WhatsApp Link API
                  </h3>
                  <Switch disabled={isLoading || saveAllSettings.isPending}
                    checked={settingsForm.whatsapp_integration_enabled}
                    onCheckedChange={(checked) =>
                      setSettingsForm({ ...settingsForm, whatsapp_integration_enabled: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp-template">Texto do Link de Envio do WhatsApp</Label>
                  <CardDescription className="mb-1 text-[10px]">
                    Mensagem que será preenchida automaticamente no celular ao clicar para disparar
                    link no WhatsApp.
                  </CardDescription>
                  <Textarea disabled={isLoading || saveAllSettings.isPending}
                    id="whatsapp-template"
                    rows={3}
                    value={settingsForm.whatsapp_template}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, whatsapp_template: e.target.value })
                    }
                  />
                </div>
              </div>`;

const newWhatsappSection = `              {/* SEÇÃO: WHATSAPP */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    Configuração de Integração do WhatsApp
                  </h3>
                  <Switch disabled={isLoading || saveAllSettings.isPending}
                    checked={settingsForm.whatsapp_integration_enabled}
                    onCheckedChange={(checked) =>
                      setSettingsForm({ ...settingsForm, whatsapp_integration_enabled: checked })
                    }
                  />
                </div>

                {settingsForm.whatsapp_integration_enabled && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Escolha do tipo de Integração */}
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp-type">Tipo de Integração</Label>
                      <Select
                        disabled={isLoading || saveAllSettings.isPending}
                        value={settingsForm.whatsapp_integration_type}
                        onValueChange={(val) =>
                          setSettingsForm({ ...settingsForm, whatsapp_integration_type: val })
                        }
                      >
                        <SelectTrigger id="whatsapp-type" className="bg-white">
                          <SelectValue placeholder="Selecione o tipo de integração" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="link">Link de Redirecionamento (WhatsApp Web / Link API)</SelectItem>
                          <SelectItem value="meta">API Oficial da Meta (WhatsApp Cloud API)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* OPÇÃO 1: LINK DE REDIRECIONAMENTO */}
                    {settingsForm.whatsapp_integration_type === "link" && (
                      <div className="space-y-2 p-4 bg-slate-50 border rounded-lg">
                        <Label htmlFor="whatsapp-template">Texto do Link de Envio do WhatsApp</Label>
                        <CardDescription className="mb-1 text-[10px]">
                          Mensagem pré-preenchida no WhatsApp Web. Tags: <code>{\`{nome_cliente}\`}</code>, <code>{\`{numero_contrato}\`}</code>, <code>{\`{valor_total}\`}</code>, <code>{\`{link_contrato}\`}</code>.
                        </CardDescription>
                        <Textarea disabled={isLoading || saveAllSettings.isPending}
                          id="whatsapp-template"
                          rows={3}
                          value={settingsForm.whatsapp_template}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, whatsapp_template: e.target.value })
                          }
                          className="bg-white"
                        />
                      </div>
                    )}

                    {/* OPÇÃO 2: API OFICIAL DA META */}
                    {settingsForm.whatsapp_integration_type === "meta" && (
                      <div className="space-y-6">
                        {/* Credenciais Meta */}
                        <div className="space-y-4 p-4 bg-slate-50 border rounded-lg">
                          <h4 className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                            Credenciais da Plataforma Cloud da Meta
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5 md:col-span-2">
                              <Label htmlFor="meta-token">Token de Acesso Temporário ou Permanente</Label>
                              <Input disabled={isLoading || saveAllSettings.isPending}
                                id="meta-token"
                                type="password"
                                placeholder="EAAB..."
                                value={settingsForm.whatsapp_api_token}
                                onChange={(e) =>
                                  setSettingsForm({ ...settingsForm, whatsapp_api_token: e.target.value })
                                }
                                className="bg-white"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="meta-phone-id">ID do Número de Telefone (Phone Number ID)</Label>
                              <Input disabled={isLoading || saveAllSettings.isPending}
                                id="meta-phone-id"
                                placeholder="ex: 106941234567890"
                                value={settingsForm.whatsapp_phone_number_id}
                                onChange={(e) =>
                                  setSettingsForm({ ...settingsForm, whatsapp_phone_number_id: e.target.value })
                                }
                                className="bg-white"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="meta-account-id">ID da Conta Comercial (Business Account ID)</Label>
                              <Input disabled={isLoading || saveAllSettings.isPending}
                                id="meta-account-id"
                                placeholder="ex: 102934567890123"
                                value={settingsForm.whatsapp_business_account_id}
                                onChange={(e) =>
                                  setSettingsForm({ ...settingsForm, whatsapp_business_account_id: e.target.value })
                                }
                                className="bg-white"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="meta-phone">Número Cadastrado (com DDD)</Label>
                              <Input disabled={isLoading || saveAllSettings.isPending}
                                id="meta-phone"
                                placeholder="+5583988059666"
                                value={settingsForm.whatsapp_phone_number}
                                onChange={(e) =>
                                  setSettingsForm({ ...settingsForm, whatsapp_phone_number: e.target.value })
                                }
                                className="bg-white"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="meta-template-name">Nome do Template de Mensagem (na Meta)</Label>
                              <Input disabled={isLoading || saveAllSettings.isPending}
                                id="meta-template-name"
                                placeholder="ex: hello_world"
                                value={settingsForm.whatsapp_template_name}
                                onChange={(e) =>
                                  setSettingsForm({ ...settingsForm, whatsapp_template_name: e.target.value })
                                }
                                className="bg-white"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Registro e Verificação do Número */}
                        <div className="space-y-4 p-4 border border-emerald-100 bg-emerald-50/30 rounded-lg">
                          <h4 className="font-semibold text-emerald-800 text-xs flex items-center gap-1">
                            Cadastro e Verificação do Número de Telefone
                          </h4>
                          <p className="text-slate-500 text-[10px] leading-relaxed">
                            Antes de enviar mensagens, seu número precisa estar cadastrado. Se acabou de configurá-lo na Meta, solicite um código de 6 dígitos via SMS ou Ligação de Voz e confirme abaixo.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <div className="space-y-1.5">
                              <Label htmlFor="method-select">Método</Label>
                              <Select
                                disabled={isLoading || requestingCode || verifyingCode}
                                value={verificationMethod}
                                onValueChange={(val: "SMS" | "VOICE") => setVerificationMethod(val)}
                              >
                                <SelectTrigger id="method-select" className="bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="SMS">SMS</SelectItem>
                                  <SelectItem value="VOICE">Ligação de Voz</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="md:col-span-2 flex items-end">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleRequestMetaCode}
                                className="w-full flex items-center justify-center gap-1 text-slate-700 bg-white"
                                disabled={isLoading || requestingCode || verifyingCode}
                              >
                                {requestingCode ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Solicitando...
                                  </>
                                ) : (
                                  "1. Solicitar Código via SMS/Voz"
                                )}
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                            <div className="space-y-1.5">
                              <Label htmlFor="pin-code">Código de Verificação (PIN)</Label>
                              <Input
                                id="pin-code"
                                placeholder="000000"
                                maxLength={6}
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                className="bg-white"
                                disabled={isLoading || requestingCode || verifyingCode}
                              />
                            </div>
                            <div className="md:col-span-2 flex items-end">
                              <Button
                                type="button"
                                onClick={handleVerifyMetaCode}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1"
                                disabled={isLoading || requestingCode || verifyingCode || !verificationCode}
                              >
                                {verifyingCode ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Registrando...
                                  </>
                                ) : (
                                  "2. Confirmar Código e Cadastrar"
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Teste de Envio */}
                        <div className="space-y-4 p-4 border border-indigo-100 bg-indigo-50/20 rounded-lg">
                          <h4 className="font-semibold text-indigo-900 text-xs flex items-center gap-1">
                            Enviar Mensagem de Teste (Template)
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5 md:col-span-2">
                              <Label htmlFor="test-recipient">Número de Destino (DDI + DDD + Número)</Label>
                              <Input
                                id="test-recipient"
                                placeholder="Ex: 5583988059666"
                                value={testRecipient}
                                onChange={(e) => setTestRecipient(e.target.value)}
                                className="bg-white"
                                disabled={isLoading || sendingTestWa}
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={handleSendTestMetaMessage}
                                className="w-full flex items-center justify-center gap-1.5"
                                disabled={isLoading || sendingTestWa || !testRecipient}
                              >
                                {sendingTestWa ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Enviando...
                                  </>
                                ) : (
                                  "Enviar WhatsApp Teste"
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>`;

if (content.includes(oldWhatsappSection)) {
  content = content.replace(oldWhatsappSection, newWhatsappSection);
  console.log('Replaced old WhatsApp section UI.');
} else {
  console.error('Could not find oldWhatsappSection pattern!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('File updated successfully.');
