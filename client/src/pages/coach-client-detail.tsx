import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, Calendar, Target, User, Scale, Ruler, Activity as ActivityIcon, FileText, Pin, Download, ChevronDown, Loader2, BarChart3, Send, AlertCircle, Bell, Settings } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, Response } from "@shared/schema";
import { getGoalTypeLabel, getActivityLevelLabel } from "@shared/schema";
import { type UnitsPreference, formatWeight, formatHeight } from "@shared/units";
import { PlanBuilderTab } from "@/components/plan-builder-tab";
import { CoachProgressAnalytics } from "@/components/coach-progress-analytics";
import { AIInsightsCard } from "@/components/AIInsightsCard";

export default function CoachClientDetail() {
  const [, params] = useRoute("/coach/clients/:clientId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const clientId = params?.clientId;
  
  // Read tab from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "overview");
  
  // Update active tab when URL changes
  useEffect(() => {
    const newParams = new URLSearchParams(window.location.search);
    const newTab = newParams.get("tab");
    if (newTab && newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [window.location.search]);

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
        title: "Success",
        description: "Response pin status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update pin status",
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
        title: "Success",
        description: "PDF downloaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    },
  });

  const sendSetupInviteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/clients/${clientId}/send-setup-invite`, {});
    },
    onSuccess: () => {
      toast({
        title: "Invite Sent",
        description: "Account setup email has been sent to the client",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invite",
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
              <p className="text-lg font-medium text-foreground">Client not found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setLocation("/clients")}
                data-testid="button-back-to-clients"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Clients
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
                Clients
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
            Back to Clients
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
                      {client.status}
                    </Badge>
                    {needsAccountSetup && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        No portal access
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {needsAccountSetup && (
                <Button
                  onClick={() => sendSetupInviteMutation.mutate()}
                  disabled={sendSetupInviteMutation.isPending}
                  data-testid="button-send-setup-invite"
                  className="gap-2"
                >
                  {sendSetupInviteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send Portal Invite
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="inline-flex h-auto items-center gap-1 rounded-lg bg-muted p-1">
            <TabsTrigger value="overview" className="py-2 px-4 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md" data-testid="tab-overview">
              Overview
            </TabsTrigger>
            <TabsTrigger value="progress" className="py-2 px-4 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md" data-testid="tab-progress">
              <BarChart3 className="w-4 h-4 mr-1.5 hidden sm:inline" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="intake" className="py-2 px-4 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md" data-testid="tab-intake">
              Intake
            </TabsTrigger>
            <TabsTrigger 
              value="plan" 
              data-testid="tab-plan"
              className="py-2 px-4 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md"
            >
              Plan Builder
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              data-testid="tab-settings"
              className="py-2 px-4 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md"
            >
              <Settings className="w-4 h-4 mr-1.5 hidden sm:inline" />
              Settings
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
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <div className="text-base" data-testid="text-client-email">{client.email}</div>
                    </div>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Phone</div>
                        <div className="text-base" data-testid="text-client-phone">{client.phone}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Joined</div>
                      <div className="text-base" data-testid="text-client-joined">
                        {new Date(client.joinedDate).toLocaleDateString('en-US', {
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
                        <div className="text-sm text-muted-foreground">Program End Date</div>
                        <div className={`text-base ${new Date(client.endDate) < new Date() ? 'text-red-500 font-medium' : ''}`} data-testid="text-client-end-date">
                          {new Date(client.endDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          {new Date(client.endDate) < new Date() && ' (Ended)'}
                        </div>
                      </div>
                    </div>
                  )}
                  {client.lastSession && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Last Session</div>
                        <div className="text-base" data-testid="text-client-last-session">
                          {new Date(client.lastSession).toLocaleDateString('en-US', {
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
                  <CardTitle>Goal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {client.goalType ? (
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Primary Goal</div>
                        <div className="text-base font-medium" data-testid="text-client-goal">
                          {getGoalTypeLabel(client.goalType, client.goalDescription)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No goal set</div>
                  )}
                  {client.targetWeight && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Target Weight: </span>
                      <span className="font-medium">{formatWeight(client.targetWeight, unitsPreference)}</span>
                    </div>
                  )}
                  {client.targetBodyFat && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Target Body Fat: </span>
                      <span className="font-medium">{client.targetBodyFat}%</span>
                    </div>
                  )}
                  {client.goalWeight && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Goal Weight: </span>
                      <span className="font-medium">{formatWeight(client.goalWeight, unitsPreference)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Health Metrics */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Health Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {client.sex && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          Sex
                        </div>
                        <div className="text-lg font-semibold capitalize" data-testid="text-client-sex">
                          {client.sex.replace('_', ' ')}
                        </div>
                      </div>
                    )}
                    {client.age && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          Age
                        </div>
                        <div className="text-lg font-semibold" data-testid="text-client-age">
                          {client.age} years
                        </div>
                      </div>
                    )}
                    {client.weight && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Scale className="w-4 h-4" />
                          Weight
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
                          Height
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
                          Activity Level
                        </div>
                        <div className="text-base font-semibold" data-testid="text-client-activity">
                          {getActivityLevelLabel(client.activityLevel)}
                        </div>
                      </div>
                    )}
                    {client.bodyFatPercentage && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Target className="w-4 h-4" />
                          Body Fat
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
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base text-foreground whitespace-pre-wrap" data-testid="text-client-notes">
                      {client.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <CoachProgressAnalytics 
              clientId={clientId} 
              unitsPreference={unitsPreference}
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
                  <p className="text-lg font-medium text-foreground">No questionnaire submissions yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    This client hasn't submitted any questionnaires
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
                              {response.questionnaireName || "Questionnaire"}
                            </CardTitle>
                            {response.pinnedForAI && (
                              <Badge variant="default" className="gap-1" data-testid={`badge-pinned-${response.id}`}>
                                <Pin className="w-3 h-3" />
                                Pinned for AI
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1" data-testid={`text-submitted-date-${response.id}`}>
                            Submitted {new Date(response.submittedAt).toLocaleDateString('en-US', {
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
                            {response.pinnedForAI ? "Unpin" : "Pin for AI"}
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
                              View Questions & Answers
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
                                  formattedAnswer = value ? 'Yes' : 'No';
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
            <PlanBuilderTab clientId={clientId || ""} clientName={client?.name || "Client"} />
          </TabsContent>

          {/* Settings Tab - Reminder Configuration */}
          <TabsContent value="settings" className="space-y-6">
            <ReminderSettingsSection clientId={clientId || ""} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Reminder Settings Section Component
interface ReminderSettingsForm {
  remindersEnabled: boolean;
  goalRemindersEnabled: boolean;
  planRemindersEnabled: boolean;
  inactivityRemindersEnabled: boolean;
  inactivityThresholdDays: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
  maxRemindersPerDay: number;
}

function ReminderSettingsSection({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ReminderSettingsForm>({
    remindersEnabled: true,
    goalRemindersEnabled: true,
    planRemindersEnabled: true,
    inactivityRemindersEnabled: true,
    inactivityThresholdDays: 2,
    quietHoursStart: "21:00",
    quietHoursEnd: "08:00",
    timezone: "America/New_York",
    maxRemindersPerDay: 3,
  });

  const { data: fetchedSettings, isLoading } = useQuery<ReminderSettingsForm>({
    queryKey: ["/api/clients", clientId, "reminder-settings"],
    enabled: !!clientId,
  });

  // Update local state when fetched settings change
  useEffect(() => {
    if (fetchedSettings) {
      setSettings(fetchedSettings);
    }
  }, [fetchedSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<ReminderSettingsForm>) => {
      return await apiRequest("PATCH", `/api/clients/${clientId}/reminder-settings`, newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "reminder-settings"] });
      toast({
        title: "Settings Saved",
        description: "Reminder settings have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save reminder settings.",
        variant: "destructive",
      });
    },
  });

  const triggerRemindersMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/clients/${clientId}/trigger-reminders`);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Reminders Processed",
        description: `${data.sentCount} reminder(s) sent.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to trigger reminders.",
        variant: "destructive",
      });
    },
  });

  const handleSettingChange = <K extends keyof ReminderSettingsForm>(
    key: K,
    value: ReminderSettingsForm[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateSettingsMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Smart Reminders Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#28A0AE]" />
            <CardTitle>Smart Reminders</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="reminders-enabled" className="text-sm text-muted-foreground">
              {settings.remindersEnabled ? "Enabled" : "Disabled"}
            </Label>
            <Switch
              id="reminders-enabled"
              checked={settings.remindersEnabled}
              onCheckedChange={(checked) => handleSettingChange("remindersEnabled", checked)}
              data-testid="switch-reminders-enabled"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Automated reminders help keep your client engaged with their goals and plans. Configure what types of reminders to send and when.
          </p>

          {/* Reminder Types */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Reminder Types</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Goal Reminders */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#E2F9AD]" />
                  <span className="text-sm">Goal Reminders</span>
                </div>
                <Switch
                  checked={settings.goalRemindersEnabled}
                  onCheckedChange={(checked) => handleSettingChange("goalRemindersEnabled", checked)}
                  disabled={!settings.remindersEnabled}
                  data-testid="switch-goal-reminders"
                />
              </div>

              {/* Plan Reminders */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#28A0AE]" />
                  <span className="text-sm">Plan Reminders</span>
                </div>
                <Switch
                  checked={settings.planRemindersEnabled}
                  onCheckedChange={(checked) => handleSettingChange("planRemindersEnabled", checked)}
                  disabled={!settings.remindersEnabled}
                  data-testid="switch-plan-reminders"
                />
              </div>

              {/* Inactivity Reminders */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <ActivityIcon className="w-4 h-4 text-amber-500" />
                  <span className="text-sm">Inactivity Alerts</span>
                </div>
                <Switch
                  checked={settings.inactivityRemindersEnabled}
                  onCheckedChange={(checked) => handleSettingChange("inactivityRemindersEnabled", checked)}
                  disabled={!settings.remindersEnabled}
                  data-testid="switch-inactivity-reminders"
                />
              </div>
            </div>
          </div>

          {/* Configuration Options */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-sm">Configuration</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Inactivity Threshold */}
              <div className="space-y-2">
                <Label htmlFor="inactivity-threshold" className="text-sm">
                  Inactivity Threshold (days)
                </Label>
                <Select
                  value={String(settings.inactivityThresholdDays)}
                  onValueChange={(value) => handleSettingChange("inactivityThresholdDays", parseInt(value))}
                  disabled={!settings.remindersEnabled || !settings.inactivityRemindersEnabled}
                >
                  <SelectTrigger id="inactivity-threshold" data-testid="select-inactivity-threshold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="2">2 days</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="5">5 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Max Reminders Per Day */}
              <div className="space-y-2">
                <Label htmlFor="max-reminders" className="text-sm">
                  Max Reminders Per Day
                </Label>
                <Select
                  value={String(settings.maxRemindersPerDay)}
                  onValueChange={(value) => handleSettingChange("maxRemindersPerDay", parseInt(value))}
                  disabled={!settings.remindersEnabled}
                >
                  <SelectTrigger id="max-reminders" data-testid="select-max-reminders">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 reminder</SelectItem>
                    <SelectItem value="2">2 reminders</SelectItem>
                    <SelectItem value="3">3 reminders</SelectItem>
                    <SelectItem value="5">5 reminders</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quiet Hours Start */}
              <div className="space-y-2">
                <Label htmlFor="quiet-start" className="text-sm">
                  Quiet Hours Start
                </Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) => handleSettingChange("quietHoursStart", e.target.value)}
                  disabled={!settings.remindersEnabled}
                  data-testid="input-quiet-start"
                />
              </div>

              {/* Quiet Hours End */}
              <div className="space-y-2">
                <Label htmlFor="quiet-end" className="text-sm">
                  Quiet Hours End
                </Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) => handleSettingChange("quietHoursEnd", e.target.value)}
                  disabled={!settings.remindersEnabled}
                  data-testid="input-quiet-end"
                />
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-sm">
                Client Timezone
              </Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => handleSettingChange("timezone", value)}
                disabled={!settings.remindersEnabled}
              >
                <SelectTrigger id="timezone" data-testid="select-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                  <SelectItem value="Pacific/Honolulu">Hawaii Time (HT)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                  <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                  <SelectItem value="Australia/Sydney">Sydney (AEST/AEDT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Test Button */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Test Reminders</p>
                <p className="text-xs text-muted-foreground">
                  Manually trigger reminder check for this client
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerRemindersMutation.mutate()}
                disabled={!settings.remindersEnabled || triggerRemindersMutation.isPending}
                data-testid="button-trigger-reminders"
              >
                {triggerRemindersMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                Send Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium">How Smart Reminders Work</p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li><strong>Goal Reminders:</strong> Sent based on active goals (weight tracking, workout, nutrition)</li>
                <li><strong>Plan Reminders:</strong> Daily nudges for scheduled activities in assigned plans</li>
                <li><strong>Inactivity Alerts:</strong> Triggered when no logs are recorded for the threshold period</li>
                <li><strong>Quiet Hours:</strong> No notifications sent during these hours in the client's timezone</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
