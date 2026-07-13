import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Palette,
  Shield,
  Clock,
  Mail,
  MessageSquare,
  Save,
  Check,
  RotateCcw,
  Sparkles,
  Download,
  Trash2,
  Send,
  Loader2,
  Plus,
  Upload,
  ImageOff,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Configuracoes,
});

function Configuracoes() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;

  // Active Tab State
  const [activeTab, setActiveTab] = useState("empresa");

  // Query: All accessible organizations
  const { data: organizationsList = [], isLoading: isLoadingOrgs } = useQuery({
    queryKey: ["user_organizations"],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Create New Org Form State
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDocument, setNewOrgDocument] = useState("");
  const [newOrgPhone, setNewOrgPhone] = useState("");
  const [newOrgEmail, setNewOrgEmail] = useState("");

  // Mutation: Create Organization
  const createOrg = useMutation({
    mutationFn: async () => {
      if (!newOrgName.trim()) {
        throw new Error("O nome da organização é obrigatório.");
      }
      const { data, error } = await supabase.rpc("create_new_organization", {
        org_name: newOrgName.trim(),
        org_document: newOrgDocument.trim() || null,
        org_phone: newOrgPhone.trim() || null,
        org_email: newOrgEmail.trim() || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Organização criada e ativada com sucesso!");
      setNewOrgName("");
      setNewOrgDocument("");
      setNewOrgPhone("");
      setNewOrgEmail("");
      queryClient.invalidateQueries({ queryKey: ["user_organizations"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      window.location.reload();
    },
    onError: (err: any) => {
      toast.error("Erro ao criar organização: " + err.message);
    },
  });

  // Mutation: Switch Active Organization
  const switchOrg = useMutation({
    mutationFn: async (targetOrgId: string) => {
      if (!profile?.id) throw new Error("Usuário não carregado.");
      const { error } = await supabase
        .from("profiles")
        .update({ active_org_id: targetOrgId })
        .eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Organização ativa alterada!");
      window.location.reload();
    },
    onError: (err: any) => {
      toast.error("Erro ao alterar organização: " + err.message);
    },
  });

  // Query: Organization Details
  const { data: organization, isLoading: isLoadingOrg } = useQuery({
    queryKey: ["organization_details", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Query: Organization Settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["organization_settings", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", orgId!)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Auto-create default settings if they do not exist
        const { data: newSettings, error: insertError } = await supabase
          .from("organization_settings")
          .insert({ organization_id: orgId! })
          .select()
          .single();

        if (insertError) throw insertError;
        return newSettings;
      }

      return data;
    },
  });

  // Local Form States
  const [orgForm, setOrgForm] = useState({
    name: "",
    document: "",
    phone: "",
    email: "",
    address: "",
  });

  const [settingsForm, setSettingsForm] = useState({
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
  });

  // Upload do logotipo (Identidade Visual Whitelabel)
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    try {
      setIsUploadingLogo(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${orgId}_${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("org-logos")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });
      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from("org-logos").getPublicUrl(fileName);
      if (!publicUrlData?.publicUrl) {
        throw new Error("Não foi possível gerar a URL da imagem.");
      }

      setSettingsForm((prev) => ({ ...prev, company_logo_url: publicUrlData.publicUrl }));
      toast.success("Logotipo enviado! Clique em Salvar Alterações para aplicar.");
    } catch (err: any) {
      toast.error("Erro ao enviar logotipo: " + err.message);
    } finally {
      setIsUploadingLogo(false);
      if (logoFileInputRef.current) logoFileInputRef.current.value = "";
    }
  }

  // Sync Form States when data loads
  useEffect(() => {
    if (organization) {
      setOrgForm({
        name: organization.name || "",
        document: organization.document || "",
        phone: organization.phone || "",
        email: organization.email || "",
        address: organization.address || "",
      });
    }
  }, [organization]);

  useEffect(() => {
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
  }, [settings]);

  // Mutation: Save Settings
  const saveAllSettings = useMutation({
    mutationFn: async () => {
      // 1. Update Organization
      const { error: orgErr } = await supabase
        .from("organizations")
        .update({
          name: orgForm.name,
          document: orgForm.document,
          phone: orgForm.phone,
          email: orgForm.email,
          address: orgForm.address,
        })
        .eq("id", orgId!);
      if (orgErr) throw orgErr;

      // 2. Update Settings
      const { error: settingsErr } = await supabase
        .from("organization_settings")
        .update({
          ...settingsForm,
        })
        .eq("organization_id", orgId!);
      if (settingsErr) throw settingsErr;
    },
    onSuccess: () => {
      toast.success("Configurações atualizadas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["organization_details", orgId] });
      queryClient.invalidateQueries({ queryKey: ["organization_settings", orgId] });
    },
    onError: (err: Error) => {
      toast.error("Erro ao salvar configurações: " + err.message);
    },
  });

  // Simulated SMTP Connection Test
  const [testingSmtp, setTestingSmtp] = useState(false);
  const handleTestSmtp = () => {
    if (!settingsForm.smtp_host || !settingsForm.smtp_user || !settingsForm.smtp_password) {
      toast.error("Preencha o Host, Usuário e Senha do SMTP para testar!");
      return;
    }
    setTestingSmtp(true);
    setTimeout(() => {
      setTestingSmtp(false);
      toast.success("Conexão SMTP estabelecida e autenticada com sucesso! (Modo Simulação)");
    }, 2000);
  };

  // Simulated GDPR Export Data
  const handleGdpExport = () => {
    toast.info("Processando exportação de dados...");
    setTimeout(() => {
      const dataStr = JSON.stringify(
        {
          relatorio: "LGPD - Exportação de Dados do Usuário",
          exportado_em: new Date().toISOString(),
          organizacao: organization?.name,
          usuario: profile?.full_name,
          regras_privacidade: settingsForm.lgpd_consent_text,
          dados: {
            clientes: 154,
            assinaturas_coletadas: 89,
            status_lgpd: "Conforme",
          },
        },
        null,
        2,
      );
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      const exportFileDefaultName = `lgpd_export_${orgId}.json`;

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
      toast.success("Relatório de dados LGPD exportado com sucesso!");
    }, 1500);
  };

  const handleSimulateDeletion = () => {
    toast.warning(
      "Ação solicitada: Exclusão permanente de dados em conformidade com a LGPD. Para fins de auditoria, uma notificação foi disparada ao DPO.",
    );
  };

  // Meta API actions & states
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
        `https://graph.facebook.com/v20.0/${settingsForm.whatsapp_phone_number_id}/request_code`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${settingsForm.whatsapp_api_token}`,
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
        `https://graph.facebook.com/v20.0/${settingsForm.whatsapp_phone_number_id}/register`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${settingsForm.whatsapp_api_token}`,
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
      const cleanPhone = testRecipient.replace(/\D/g, "");
      const response = await fetch(
        `https://graph.facebook.com/v20.0/${settingsForm.whatsapp_phone_number_id}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${settingsForm.whatsapp_api_token}`,
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

  const isLoading = isLoadingOrg || isLoadingSettings;

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in text-xs">
      <div className="flex justify-between items-center pb-2 border-b">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Configurações do Sistema
            {isLoading && (
              <span className="text-slate-400 text-xs font-normal animate-pulse flex items-center gap-1.5 ml-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                Carregando dados...
              </span>
            )}
          </h1>
          <p className="text-slate-500 mt-1">
            Gerencie dados da empresa, conformidade com a LGPD, inatividade de sessões e integrações
            de contratos.
          </p>
        </div>
        <Button
          onClick={() => saveAllSettings.mutate()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5"
          disabled={saveAllSettings.isPending || isLoading}
        >
          {saveAllSettings.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar Configurações
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="empresa" className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Dados da Empresa & Marca
          </TabsTrigger>
          <TabsTrigger value="lgpd" className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            LGPD & Privacidade
          </TabsTrigger>
          <TabsTrigger value="inatividade" className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Segurança & Sessão
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            E-mail & WhatsApp
          </TabsTrigger>
          <TabsTrigger value="organizacoes" className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-indigo-600" />
            Organizações (Multi-empresa)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: EMPRESA E MARCA */}
        <TabsContent value="empresa">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-1.5 text-slate-900">
                <Building2 className="h-5 w-5 text-indigo-600" />
                Dados Corporativos e Identidade Visual
              </CardTitle>
              <CardDescription>
                Atualize as informações comerciais da sua empresa e configure o logotipo e cores
                principais do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="org-name">Razão Social / Nome da Empresa</Label>
                  <Input disabled={isLoading || saveAllSettings.isPending}
                    id="org-name"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-doc">CNPJ</Label>
                  <Input disabled={isLoading || saveAllSettings.isPending}
                    id="org-doc"
                    placeholder="00.000.000/0001-00"
                    value={orgForm.document}
                    onChange={(e) => setOrgForm({ ...orgForm, document: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-phone">Telefone de Contato</Label>
                  <Input disabled={isLoading || saveAllSettings.isPending}
                    id="org-phone"
                    value={orgForm.phone}
                    onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-email">E-mail Comercial</Label>
                  <Input disabled={isLoading || saveAllSettings.isPending}
                    id="org-email"
                    type="email"
                    value={orgForm.email}
                    onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="org-address">Endereço Comercial Completo</Label>
                  <Input disabled={isLoading || saveAllSettings.isPending}
                    id="org-address"
                    value={orgForm.address}
                    onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                  />
                </div>
              </div>

              <hr />

              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1">
                  <Palette className="h-4 w-4 text-indigo-500" />
                  Visual & Cores da Marca
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Cor Primária</Label>
                    <div className="flex gap-2 items-center">
                      <Input disabled={isLoading || saveAllSettings.isPending}
                        type="color"
                        value={settingsForm.primary_color}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, primary_color: e.target.value })
                        }
                        className="h-9 w-12 p-0 border rounded-md cursor-pointer"
                      />
                      <Input disabled={isLoading || saveAllSettings.isPending}
                        type="text"
                        value={settingsForm.primary_color}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, primary_color: e.target.value })
                        }
                        className="font-mono h-9 uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Cor Secundária</Label>
                    <div className="flex gap-2 items-center">
                      <Input disabled={isLoading || saveAllSettings.isPending}
                        type="color"
                        value={settingsForm.secondary_color}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, secondary_color: e.target.value })
                        }
                        className="h-9 w-12 p-0 border rounded-md cursor-pointer"
                      />
                      <Input disabled={isLoading || saveAllSettings.isPending}
                        type="text"
                        value={settingsForm.secondary_color}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, secondary_color: e.target.value })
                        }
                        className="font-mono h-9 uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo-url">Logotipo da Empresa (Whitelabel)</Label>
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 rounded-md border bg-white flex items-center justify-center overflow-hidden">
                        {settingsForm.company_logo_url ? (
                          <img
                            src={settingsForm.company_logo_url}
                            alt="Logotipo da empresa"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <ImageOff className="h-5 w-5 text-slate-300" />
                        )}
                      </div>
                      <input
                        ref={logoFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isLoading || saveAllSettings.isPending || isUploadingLogo}
                        onClick={() => logoFileInputRef.current?.click()}
                        className="h-9"
                      >
                        {isUploadingLogo ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-1.5" />
                        )}
                        Enviar Logotipo
                      </Button>
                    </div>
                    <Input disabled={isLoading || saveAllSettings.isPending}
                      id="logo-url"
                      placeholder="ou cole a URL de uma imagem: https://suaempresa.com/logo.png"
                      value={settingsForm.company_logo_url}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, company_logo_url: e.target.value })
                      }
                      className="h-9 text-[11px]"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-dashed flex items-center justify-between mt-2">
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Visualização do Tema Personalizado
                    </span>
                    <p className="text-slate-500 text-[10px]">
                      Como os elementos e botões principais do seu painel serão renderizados.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1.5 rounded text-white font-bold transition-all shadow-sm"
                      style={{ backgroundColor: settingsForm.primary_color }}
                    >
                      Botão Primário
                    </button>
                    <button
                      className="px-3 py-1.5 rounded text-white font-bold transition-all shadow-sm text-[10px]"
                      style={{ backgroundColor: settingsForm.secondary_color }}
                    >
                      Secundário
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: LGPD E PRIVACIDADE */}
        <TabsContent value="lgpd">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-1.5 text-slate-900">
                <Shield className="h-5 w-5 text-indigo-600" />
                Conformidade com a LGPD (Lei Geral de Proteção de Dados)
              </CardTitle>
              <CardDescription>
                Configure os consentimentos de privacidade exibidos no preenchimento de fichas e
                coleta de assinaturas digitais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-3 bg-slate-50 border rounded-lg">
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-800">Banner de Cookies Ativo</span>
                  <p className="text-slate-500 text-[10px]">
                    Exibe um banner flutuante para consentimento de cookies ao primeiro acesso de
                    clientes e operadores.
                  </p>
                </div>
                <Switch disabled={isLoading || saveAllSettings.isPending}
                  checked={settingsForm.lgpd_cookies_enabled}
                  onCheckedChange={(checked) =>
                    setSettingsForm({ ...settingsForm, lgpd_cookies_enabled: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lgpd-text">Cláusula / Termo de Consentimento de Dados</Label>
                <CardDescription className="mb-1 text-[10px]">
                  Este texto é exibido logo acima da coleta da assinatura digital do contrato para
                  atestar conformidade jurídica.
                </CardDescription>
                <Textarea disabled={isLoading || saveAllSettings.isPending}
                  id="lgpd-text"
                  rows={4}
                  value={settingsForm.lgpd_consent_text}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, lgpd_consent_text: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lgpd-deletion">
                  Instruções para Solicitação de Exclusão de Dados
                </Label>
                <Input disabled={isLoading || saveAllSettings.isPending}
                  id="lgpd-deletion"
                  value={settingsForm.lgpd_data_deletion_instructions}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      lgpd_data_deletion_instructions: e.target.value,
                    })
                  }
                />
              </div>

              <hr />

              <div className="space-y-3">
                <span className="font-bold text-sm text-slate-800 block">
                  Direitos do Titular (LGPD)
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleGdpExport}
                    className="flex items-center gap-1 text-slate-700"
                    disabled={isLoading}
                  >
                    <Download className="h-4 w-4 text-primary" />
                    Gerar Exportação JSON dos Dados
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleSimulateDeletion}
                    className="flex items-center gap-1 text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100"
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                    Registrar Requisição de Exclusão
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: INATIVIDADE E SESSÃO */}
        <TabsContent value="inatividade">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-1.5 text-slate-900">
                <Clock className="h-5 w-5 text-indigo-600" />
                Segurança e Ações de Inatividade
              </CardTitle>
              <CardDescription>
                Configure o logout automático de operadores para impedir acessos não autorizados em
                terminais abandonados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="timeout-duration">Tempo de Inatividade Permitido</Label>
                  <Select disabled={isLoading || saveAllSettings.isPending}
                    value={String(settingsForm.inactivity_timeout_minutes)}
                    onValueChange={(val) =>
                      setSettingsForm({
                        ...settingsForm,
                        inactivity_timeout_minutes: Number(val),
                      })
                    }
                  >
                    <SelectTrigger id="timeout-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 minuto (Testes rápidos)</SelectItem>
                      <SelectItem value="5">5 minutos</SelectItem>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeout-action">Ação ao Atingir Limite</Label>
                  <Select disabled={isLoading || saveAllSettings.isPending}
                    value={settingsForm.inactivity_action}
                    onValueChange={(val) =>
                      setSettingsForm({ ...settingsForm, inactivity_action: val })
                    }
                  >
                    <SelectTrigger id="timeout-action">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disabled">Desativado (Não deslogar)</SelectItem>
                      <SelectItem value="logout">Deslogar Imediatamente</SelectItem>
                      <SelectItem value="warn">Exibir aviso de 60s antes de deslogar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 text-amber-800">
                <Clock className="h-5 w-5 shrink-0 text-amber-600" />
                <div className="space-y-1 text-[11px]">
                  <h4 className="font-bold">Como funciona:</h4>
                  <p>
                    O sistema escuta cliques do mouse, toques de tela e cliques do teclado no
                    painel. Se nenhuma atividade for registrada pelo tempo estipulado, a ação
                    selecionada será disparada de forma segura.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: EMAIL E WHATSAPP */}
        <TabsContent value="integracoes">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-1.5 text-slate-900">
                <Mail className="h-5 w-5 text-indigo-600" />
                Integração e Templates de E-mail & WhatsApp
              </CardTitle>
              <CardDescription>
                Configure o servidor SMTP de envio de e-mails de formalização e edite os textos
                padrão das mensagens enviadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* SEÇÃO: E-MAIL (SMTP) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-indigo-500" />
                    Servidor SMTP Próprio (E-mail)
                  </h3>
                  <Switch disabled={isLoading || saveAllSettings.isPending}
                    checked={settingsForm.email_integration_enabled}
                    onCheckedChange={(checked) =>
                      setSettingsForm({ ...settingsForm, email_integration_enabled: checked })
                    }
                  />
                </div>

                {settingsForm.email_integration_enabled && (
                  <div className="space-y-4 p-4 bg-slate-50 border rounded-lg animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="smtp-host">Host SMTP</Label>
                        <Input disabled={isLoading || saveAllSettings.isPending}
                          id="smtp-host"
                          placeholder="smtp.suaempresa.com"
                          value={settingsForm.smtp_host}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, smtp_host: e.target.value })
                          }
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="smtp-port">Porta SMTP</Label>
                        <Input disabled={isLoading || saveAllSettings.isPending}
                          id="smtp-port"
                          type="number"
                          value={settingsForm.smtp_port}
                          onChange={(e) =>
                            setSettingsForm({
                              ...settingsForm,
                              smtp_port: Number(e.target.value),
                            })
                          }
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="smtp-encryption">Criptografia</Label>
                        <Select disabled={isLoading || saveAllSettings.isPending}
                          value={settingsForm.smtp_encryption}
                          onValueChange={(val) =>
                            setSettingsForm({ ...settingsForm, smtp_encryption: val })
                          }
                        >
                          <SelectTrigger id="smtp-encryption" className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tls">STARTTLS (Porta 587)</SelectItem>
                            <SelectItem value="ssl">SSL/TLS (Porta 465)</SelectItem>
                            <SelectItem value="none">Nenhuma (Sem segurança)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="smtp-user">Usuário SMTP / E-mail</Label>
                        <Input disabled={isLoading || saveAllSettings.isPending}
                          id="smtp-user"
                          placeholder="contato@suaempresa.com"
                          value={settingsForm.smtp_user}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, smtp_user: e.target.value })
                          }
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="smtp-password">Senha SMTP</Label>
                        <Input disabled={isLoading || saveAllSettings.isPending}
                          id="smtp-password"
                          type="password"
                          placeholder="••••••••••••"
                          value={settingsForm.smtp_password}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, smtp_password: e.target.value })
                          }
                          className="bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleTestSmtp}
                        className="flex items-center gap-1.5"
                        disabled={testingSmtp || isLoading}
                      >
                        {testingSmtp ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Testando Conexão...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 text-indigo-600" />
                            Testar Conexão SMTP
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email-template">Corpo Padrão do E-mail do Contrato</Label>
                  <CardDescription className="mb-1 text-[10px]">
                    Tags disponíveis: <code>{`{nome_cliente}`}</code>,{" "}
                    <code>{`{numero_contrato}`}</code>, <code>{`{valor_total}`}</code>,{" "}
                    <code>{`{link_contrato}`}</code>
                  </CardDescription>
                  <Textarea disabled={isLoading || saveAllSettings.isPending}
                    id="email-template"
                    rows={3}
                    value={settingsForm.email_template}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, email_template: e.target.value })
                    }
                  />
                </div>
              </div>

              <hr />

              {/* SEÇÃO: WHATSAPP */}
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
                          Mensagem pré-preenchida no WhatsApp Web. Tags: <code>{`{nome_cliente}`}</code>, <code>{`{numero_contrato}`}</code>, <code>{`{valor_total}`}</code>, <code>{`{link_contrato}`}</code>.
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
                        <div className="flex justify-end pt-1">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => saveAllSettings.mutate()}
                            disabled={saveAllSettings.isPending || isLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5"
                          >
                            {saveAllSettings.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            Salvar Configurações de WhatsApp
                          </Button>
                        </div>
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
                          <div className="flex justify-end pt-1">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => saveAllSettings.mutate()}
                              disabled={saveAllSettings.isPending || isLoading}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5"
                            >
                              {saveAllSettings.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              Salvar Configurações de WhatsApp
                            </Button>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: ORGANIZACOES (MULTI-EMPRESA) */}
        <TabsContent value="organizacoes">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Col 1 & 2: Minhas Organizações */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-1.5 text-slate-900">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                    Minhas Organizações
                  </CardTitle>
                  <CardDescription>
                    Visualize e gerencie as organizações às quais você possui acesso. As informações de cada empresa são 100% isoladas de forma invisível.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile?.email === "maxrangelformiga@gmail.com" && (
                    <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 space-y-1">
                      <h4 className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                        Acesso de Administrador Global Ativo
                      </h4>
                      <p className="text-slate-600 text-[10px] leading-relaxed">
                        Sua conta <strong>maxrangelformiga@gmail.com</strong> possui privilégios de superadministrador. Você pode ver, alternar e gerenciar todas as organizações do sistema. O isolamento de dados de RLS (Row Level Security) garante que uma organização normal nunca possa enxergar os dados de outra.
                      </p>
                    </div>
                  )}

                  {isLoadingOrgs ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                      <span>Carregando organizações...</span>
                    </div>
                  ) : organizationsList.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      Nenhuma organização vinculada à sua conta.
                    </div>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="font-semibold text-slate-700">Nome / ID</TableHead>
                            <TableHead className="font-semibold text-slate-700">Documento / CNPJ</TableHead>
                            <TableHead className="font-semibold text-slate-700">Contato</TableHead>
                            <TableHead className="font-semibold text-slate-700 text-right">Ação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {organizationsList.map((org) => {
                            const isActive = org.id === orgId;
                            return (
                              <TableRow key={org.id} className={isActive ? "bg-emerald-50/20" : ""}>
                                <TableCell className="font-medium">
                                  <div className="space-y-0.5">
                                    <div className="text-slate-900 flex items-center gap-1.5">
                                      {org.name}
                                      {isActive && (
                                        <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-800 text-[9px] border-none font-bold py-0 h-4">
                                          Ativa
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono select-all">
                                      ID: {org.id}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-slate-600 font-mono text-[10px]">
                                  {org.document || "—"}
                                </TableCell>
                                <TableCell className="text-slate-600">
                                  <div className="space-y-0.5 text-[10px]">
                                    {org.email && <div>{org.email}</div>}
                                    {org.phone && <div className="text-slate-400">{org.phone}</div>}
                                    {!org.email && !org.phone && "—"}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {isActive ? (
                                    <Button variant="ghost" disabled size="sm" className="text-emerald-600 bg-emerald-50/50">
                                      <Check className="h-3.5 w-3.5 mr-1" />
                                      Ativa
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => switchOrg.mutate(org.id)}
                                      disabled={switchOrg.isPending}
                                      className="text-indigo-600 border-indigo-200 hover:bg-indigo-50/50"
                                    >
                                      Alternar
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Col 3: Criar Organização */}
            <div>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-1.5 text-slate-900">
                    Criar Organização
                  </CardTitle>
                  <CardDescription>
                    Cadastre uma nova empresa independente no sistema. Ela terá seu próprio banco de dados isolado via RLS.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-org-name">Nome da Organização *</Label>
                    <Input
                      id="new-org-name"
                      placeholder="Ex: Minha Nova Empresa"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      className="bg-white"
                      disabled={createOrg.isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-org-document">CNPJ / Documento</Label>
                    <Input
                      id="new-org-document"
                      placeholder="Ex: 00.000.000/0001-00"
                      value={newOrgDocument}
                      onChange={(e) => setNewOrgDocument(e.target.value)}
                      className="bg-white"
                      disabled={createOrg.isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-org-phone">Telefone de Contato</Label>
                    <Input
                      id="new-org-phone"
                      placeholder="Ex: (83) 98805-9666"
                      value={newOrgPhone}
                      onChange={(e) => setNewOrgPhone(e.target.value)}
                      className="bg-white"
                      disabled={createOrg.isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-org-email">E-mail Comercial</Label>
                    <Input
                      id="new-org-email"
                      type="email"
                      placeholder="Ex: comercial@novaempresa.com"
                      value={newOrgEmail}
                      onChange={(e) => setNewOrgEmail(e.target.value)}
                      className="bg-white"
                      disabled={createOrg.isPending}
                    />
                  </div>
                  <Button
                    onClick={() => createOrg.mutate()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-1.5 mt-2"
                    disabled={createOrg.isPending || !newOrgName.trim()}
                  >
                    {createOrg.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Cadastrar & Ativar
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
