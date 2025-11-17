import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, Calendar, Target, User, Scale, Ruler, Activity as ActivityIcon, FileText, Pin, Download, ChevronDown, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, Response } from "@shared/schema";
import { getGoalTypeLabel, getActivityLevelLabel } from "@shared/schema";
import { type UnitsPreference, formatWeight, formatHeight } from "@shared/units";

export default function CoachClientDetail() {
  const [, params] = useRoute("/coach/clients/:clientId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const clientId = params?.clientId;

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
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
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
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview" data-testid="tab-overview">
              Overview
            </TabsTrigger>
            <TabsTrigger value="intake" data-testid="tab-intake">
              Intake
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
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
        </Tabs>
      </div>
    </div>
  );
}
