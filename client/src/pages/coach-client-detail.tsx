import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, Calendar, Target, User, Scale, Ruler, Activity as ActivityIcon, FileText, Pin, Download, ChevronDown, Loader2, BarChart3, Send, AlertCircle, Bell, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, Response, Coach, SupportedLanguage } from "@shared/schema";
import { getGoalTypeLabelTranslated, getActivityLevelLabelTranslated, COACH_UI_TRANSLATIONS } from "@shared/schema";
import { type UnitsPreference, formatWeight, formatHeight } from "@shared/units";
import { PlanBuilderTab } from "@/components/plan-builder-tab";
import { CoachProgressAnalytics } from "@/components/coach-progress-analytics";
import { AIInsightsCard } from "@/components/AIInsightsCard";
import { ReminderSettings } from "@/components/engagement/ReminderSettings";

export default function CoachClientDetail() {
  const [, params] = useRoute("/coach/clients/:clientId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const clientId = params?.clientId;
  
  // Read tab from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "overview");
  
  // State for invite language dialog
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteLanguage, setInviteLanguage] = useState<SupportedLanguage>("en");
  
  // Update active tab when URL changes
  useEffect(() => {
    const newParams = new URLSearchParams(window.location.search);
    const newTab = newParams.get("tab");
    if (newTab && newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [window.location.search]);

  // Scroll to top on mobile when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [clientId]);

  // Fetch coach profile to get preferred language
  const { data: coachProfile } = useQuery<Coach>({
    queryKey: ["/api/coach/profile"],
  });

  // Set up translation variables
  const lang = (coachProfile?.preferredLanguage || "en") as SupportedLanguage;
  const t = COACH_UI_TRANSLATIONS;
  
  // Sync invite language with coach's preferred language when dialog opens
  useEffect(() => {
    if (isInviteDialogOpen && coachProfile?.preferredLanguage) {
      setInviteLanguage(coachProfile.preferredLanguage as SupportedLanguage);
    }
  }, [isInviteDialogOpen, coachProfile?.preferredLanguage]);

  const { data: client, isLoading: isLoadingClient } = useQuery<Client>({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId,
  });

  const { data: responses = [], isLoading: isLoadingResponses } = useQuery<Response[]>({
    queryKey: ["/api/clients", clientId, "responses"],
    enabled: !!clientId,
  });

  const pinResponseMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      return await apiRequest("POST", `/api/responses/${id}/pin`, { pinned });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "responses"] });
      toast({
        title: t.clientDetail.success[lang],
        description: t.clientDetail.responsePinUpdated[lang],
      });
    },
    onError: () => {
      toast({
        title: t.clientDetail.error[lang],
        description: t.clientDetail.failedPinUpdate[lang],
        variant: "destructive",
      });
    },
  });

  const generatePdfMutation = useMutation({
    mutationFn: async (responseId: string) => {
      const response = await fetch(`/api/responses/${responseId}/generate-pdf`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      // Extract filename from Content-Disposition header BEFORE consuming body
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'questionnaire-response.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Use response.blob() directly - it correctly handles MIME type
      const blob = await response.blob();
      
      // Create blob URL and trigger download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: t.clientDetail.success[lang],
        description: t.clientDetail.pdfDownloadSuccess[lang],
      });
    },
    onError: () => {
      toast({
        title: t.clientDetail.error[lang],
        description: t.clientDetail.failedGeneratePdf[lang],
        variant: "destructive",
      });
    },
  });

  const sendSetupInviteMutation = useMutation({
    mutationFn: async (selectedLanguage: SupportedLanguage) => {
      return await apiRequest("POST", `/api/clients/${clientId}/send-setup-invite`, {
        language: selectedLanguage,
      });
    },
    onSuccess: () => {
      setIsInviteDialogOpen(false);
      toast({
        title: t.clientDetail.inviteSent[lang],
        description: t.clientDetail.accountSetupEmailSent[lang],
      });
    },
    onError: (error: any) => {
      toast({
        title: t.clientDetail.error[lang],
        description: error.message || t.clientDetail.failedSendInvite[lang],
        variant: "destructive",
      });
    },
  });

  // Check if client needs account setup (no password set)
  const needsAccountSetup = client && !client.passwordHash;

  if (!clientId) {
    return null;
  }

  if (isLoadingClient) {
    return (
      <div className="bg-background">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="bg-background">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-lg font-medium text-foreground">{t.clientDetail.clientNotFound[lang]}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setLocation("/clients")}
                data-testid="button-back-to-clients"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t.clientDetail.backToClients[lang]}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const unitsPreference = (client.unitsPreference as UnitsPreference) || "us";

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/clients"
                className="cursor-pointer"
                data-testid="link-breadcrumb-clients"
              >
                {t.clientDetail.clients[lang]}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage data-testid="text-breadcrumb-client-name">
                {client.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Back Button */}
        <div>
          <Button
            variant="ghost"
            onClick={() => setLocation("/clients")}
            className="gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.clientDetail.backToClients[lang]}
          </Button>
        </div>

        {/* Client Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-semibold">
                    {client.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-client-name">
                    {client.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={client.status === "active" ? "default" : "secondary"} data-testid="badge-client-status">
                      {t.status[client.status as keyof typeof t.status]?.[lang] || client.status}
                    </Badge>
                    {needsAccountSetup && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {t.clientDetail.noPortalAccess[lang]}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {needsAccountSetup && (
                <Button
                  onClick={() => setIsInviteDialogOpen(true)}
                  disabled={sendSetupInviteMutation.isPending}
                  data-testid="button-send-setup-invite"
                  className="gap-2"
                >
                  {sendSetupInviteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {t.clientDetail.sendPortalInvite[lang]}
                </Button>
              )}
              
              {/* Language Selection Dialog for Portal Invite */}
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-primary" />
                      {t.clientDetail.sendPortalInvite[lang]}
                    </DialogTitle>
                    <DialogDescription>
                      {t.clients.selectLanguageDescription?.[lang] || "Select the language for the invitation email and client portal."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{t.clients.language?.[lang] || "Language"}</Label>
                      <Select
                        value={inviteLanguage}
                        onValueChange={(value) => setInviteLanguage(value as SupportedLanguage)}
                      >
                        <SelectTrigger data-testid="select-invite-language">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ru">Русский</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsInviteDialogOpen(false)}
                      data-testid="button-cancel-invite"
                    >
                      {t.common.cancel[lang]}
                    </Button>
                    <Button
                      onClick={() => sendSetupInviteMutation.mutate(inviteLanguage)}
                      disabled={sendSetupInviteMutation.isPending}
                      data-testid="button-confirm-send-invite"
                      className="gap-2"
                    >
                      {sendSetupInviteMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {t.clients.sendInvite?.[lang] || "Send Invite"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
        </Card>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="inline-flex h-auto items-center gap-1 rounded-lg bg-muted p-1">
            <TabsTrigger value="overview" className="py-2 px-4 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md" data-testid="tab-overview">
              {t.clientDetail.overview[lang]}
            </TabsTrigger>
            <TabsTrigger value="progress" className="py-2 px-4 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md" data-testid="tab-progress">
              <BarChart3 className="w-4 h-4 mr-1.5 hidden sm:inline" />
              {t.clientDetail.progress[lang]}
            </TabsTrigger>
            <TabsTrigger value="intake" className="py-2 px-4 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md" data-testid="tab-intake">
              {t.clientDetail.intake[lang]}
            </TabsTrigger>
            <TabsTrigger 
              value="plan" 
              data-testid="tab-plan"
              className="py-2 px-4 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md"
            >
              {t.clientDetail.planBuilder[lang]}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* AI Insights - shows when relevant triggers exist */}
            <AIInsightsCard 
              clientId={clientId}
              clientName={client.name}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>{t.clientDetail.contactInfo[lang]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">{t.clientDetail.email[lang]}</div>
                      <div className="text-base" data-testid="text-client-email">{client.email}</div>
                    </div>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">{t.clientDetail.phone[lang]}</div>
                        <div className="text-base" data-testid="text-client-phone">{client.phone}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">{t.clientDetail.joined[lang]}</div>
                      <div className="text-base" data-testid="text-client-joined">
                        {new Date(client.joinedDate).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'es' ? 'es-ES' : 'en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                  {client.endDate && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">{t.clientDetail.programEndDate[lang]}</div>
                        <div className={`text-base ${new Date(client.endDate) < new Date() ? 'text-red-500 font-medium' : ''}`} data-testid="text-client-end-date">
                          {new Date(client.endDate).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'es' ? 'es-ES' : 'en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          {new Date(client.endDate) < new Date() && ` ${t.clientDetail.ended[lang]}`}
                        </div>
                      </div>
                    </div>
                  )}
                  {client.lastSession && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">{t.clientDetail.lastSession[lang]}</div>
                        <div className="text-base" data-testid="text-client-last-session">
                          {new Date(client.lastSession).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'es' ? 'es-ES' : 'en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Goal Information */}
              <Card>
                <CardHeader>
                  <CardTitle>{t.clientDetail.goalInfo[lang]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {client.goalType ? (
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">{t.clientDetail.primaryGoal[lang]}</div>
                        <div className="text-base font-medium" data-testid="text-client-goal">
                          {getGoalTypeLabelTranslated(client.goalType, lang, client.goalDescription)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">{t.clientDetail.noGoalSet[lang]}</div>
                  )}
                  {client.targetWeight && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">{t.clientDetail.targetWeight[lang]}: </span>
                      <span className="font-medium">{formatWeight(client.targetWeight, unitsPreference)}</span>
                    </div>
                  )}
                  {client.targetBodyFat && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">{t.clientDetail.targetBodyFat[lang]}: </span>
                      <span className="font-medium">{client.targetBodyFat}%</span>
                    </div>
                  )}
                  {client.goalWeight && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">{t.clientDetail.goalWeight[lang]}: </span>
                      <span className="font-medium">{formatWeight(client.goalWeight, unitsPreference)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Health Metrics */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>{t.clientDetail.healthMetrics[lang]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {client.sex && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          {t.clientDetail.sex[lang]}
                        </div>
                        <div className="text-lg font-semibold capitalize" data-testid="text-client-sex">
                          {t.gender[client.sex as keyof typeof t.gender]?.[lang] || client.sex.replace('_', ' ')}
                        </div>
                      </div>
                    )}
                    {client.age && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {t.clientDetail.age[lang]}
                        </div>
                        <div className="text-lg font-semibold" data-testid="text-client-age">
                          {client.age} {t.clientDetail.years[lang]}
                        </div>
                      </div>
                    )}
                    {client.weight && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Scale className="w-4 h-4" />
                          {t.clientDetail.weight[lang]}
                        </div>
                        <div className="text-lg font-semibold" data-testid="text-client-weight">
                          {formatWeight(client.weight, unitsPreference)}
                        </div>
                      </div>
                    )}
                    {client.height && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Ruler className="w-4 h-4" />
                          {t.clientDetail.height[lang]}
                        </div>
                        <div className="text-lg font-semibold" data-testid="text-client-height">
                          {formatHeight(client.height, unitsPreference)}
                        </div>
                      </div>
                    )}
                    {client.activityLevel && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ActivityIcon className="w-4 h-4" />
                          {t.clientDetail.activityLevel[lang]}
                        </div>
                        <div className="text-base font-semibold" data-testid="text-client-activity">
                          {getActivityLevelLabelTranslated(client.activityLevel, lang)}
                        </div>
                      </div>
                    )}
                    {client.bodyFatPercentage && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Target className="w-4 h-4" />
                          {t.clientDetail.bodyFat[lang]}
                        </div>
                        <div className="text-lg font-semibold" data-testid="text-client-body-fat">
                          {client.bodyFatPercentage}%
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {client.notes && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>{t.clientDetail.notes[lang]}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base text-foreground whitespace-pre-wrap" data-testid="text-client-notes">
                      {client.notes}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Notification Settings */}
              <div className="md:col-span-2">
                <ReminderSettings clientId={clientId} clientName={client.name} />
              </div>
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <CoachProgressAnalytics 
              clientId={clientId} 
              unitsPreference={unitsPreference}
              lang={lang}
            />
          </TabsContent>

          {/* Intake Tab */}
          <TabsContent value="intake" className="space-y-6">
            {isLoadingResponses ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : responses.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-medium text-foreground">{t.clientDetail.noQuestionnaireSubmissions[lang]}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t.clientDetail.clientNotSubmittedQuestionnaires[lang]}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {responses.map((response) => (
                  <Card key={response.id} data-testid={`card-response-${response.id}`}>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-lg" data-testid={`text-questionnaire-name-${response.id}`}>
                              {response.questionnaireName || t.clientDetail.questionnaire[lang]}
                            </CardTitle>
                            {response.pinnedForAI && (
                              <Badge variant="default" className="gap-1" data-testid={`badge-pinned-${response.id}`}>
                                <Pin className="w-3 h-3" />
                                {t.clientDetail.pinnedForAI[lang]}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1" data-testid={`text-submitted-date-${response.id}`}>
                            {t.clientDetail.submitted[lang]} {new Date(response.submittedAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'es' ? 'es-ES' : 'en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            variant={response.pinnedForAI ? "default" : "outline"}
                            size="sm"
                            onClick={() => pinResponseMutation.mutate({ 
                              id: response.id, 
                              pinned: !response.pinnedForAI 
                            })}
                            disabled={pinResponseMutation.isPending}
                            className="gap-2"
                            data-testid={`button-pin-${response.id}`}
                          >
                            <Pin className="w-4 h-4" />
                            {response.pinnedForAI ? t.clientDetail.unpin[lang] : t.clientDetail.pinForAI[lang]}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generatePdfMutation.mutate(response.id)}
                            disabled={generatePdfMutation.isPending}
                            className="gap-2"
                            data-testid={`button-download-pdf-${response.id}`}
                          >
                            {generatePdfMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            PDF
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="answers" className="border-none">
                          <AccordionTrigger className="hover:no-underline py-3" data-testid={`button-expand-${response.id}`}>
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <FileText className="w-4 h-4" />
                              {t.clientDetail.viewQuestionsAnswers[lang]}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              {Object.entries(response.answers as Record<string, any>).map(([key, value]) => {
                                // Skip internal fields
                                if (key === 'consent' || key === 'consentGiven' || value === null || value === undefined || value === '') {
                                  return null;
                                }

                                // Find the actual question text from the questionnaire definition
                                const questionnaireQuestions = (response as any).questionnaireQuestions || [];
                                const questionObj = questionnaireQuestions.find((q: any) => q.id === key);
                                
                                // Use actual question label if found, otherwise format the key
                                const questionText = questionObj?.label || questionObj?.text || key
                                  .replace(/([A-Z])/g, ' $1')
                                  .replace(/^./, (str) => str.toUpperCase())
                                  .replace(/_/g, ' ');

                                // Format the answer based on type
                                let formattedAnswer = value;
                                if (typeof value === 'boolean') {
                                  formattedAnswer = value ? t.clientDetail.yes[lang] : t.clientDetail.no[lang];
                                } else if (Array.isArray(value)) {
                                  formattedAnswer = value.join(', ');
                                } else if (typeof value === 'object') {
                                  formattedAnswer = JSON.stringify(value, null, 2);
                                }

                                return (
                                  <div 
                                    key={key} 
                                    className="border-l-2 border-primary pl-4 py-2"
                                    data-testid={`answer-${response.id}-${key}`}
                                  >
                                    <div className="text-sm font-medium text-foreground mb-1">
                                      {questionText}
                                    </div>
                                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                      {formattedAnswer}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Plan Builder Tab */}
          <TabsContent value="plan" className="space-y-6">
            <PlanBuilderTab 
              clientId={clientId || ""} 
              clientName={client?.name || "Client"} 
              programStartDate={client?.programStartDate}
              joinedDate={client?.joinedDate}
            />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}

