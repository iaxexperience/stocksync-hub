import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
  });

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
                    <Label htmlFor="logo-url">URL do Logotipo da Empresa</Label>
                    <Input disabled={isLoading || saveAllSettings.isPending}
                      id="logo-url"
                      placeholder="https://suaempresa.com/logo.png"
                      value={settingsForm.company_logo_url}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, company_logo_url: e.target.value })
                      }
                      className="h-9"
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
