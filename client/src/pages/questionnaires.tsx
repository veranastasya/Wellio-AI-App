import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, Edit, Eye, Copy, Archive, Trash2, RotateCcw, Send } from "lucide-react";
import { useLocation } from "wouter";
import type { Questionnaire, Coach, SupportedLanguage } from "@shared/schema";
import { COACH_UI_TRANSLATIONS } from "@shared/schema";

export default function Questionnaires() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const { data: coachProfile } = useQuery<Omit<Coach, "passwordHash">>({
    queryKey: ["/api/coach/profile"],
  });

  const lang = (coachProfile?.preferredLanguage || "en") as SupportedLanguage;
  const t = COACH_UI_TRANSLATIONS.questionnaires;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: allQuestionnaires = [], isLoading } = useQuery<Questionnaire[]>({
    queryKey: ["/api/questionnaires"],
  });

  const activeQuestionnaires = allQuestionnaires.filter(
    (q) => q.status !== "archived"
  );
  
  const archivedQuestionnaires = allQuestionnaires.filter(
    (q) => q.status === "archived"
  );

  const filteredQuestionnaires = activeTab === "active" 
    ? activeQuestionnaires.filter((q) => statusFilter === "all" || q.status === statusFilter)
    : archivedQuestionnaires;

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/questionnaires/${id}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaires"] });
      toast({
        title: t.success[lang],
        description: t.publishedSuccessfully[lang],
      });
    },
    onError: () => {
      toast({
        title: t.error[lang],
        description: t.failedToPublish[lang],
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/questionnaires/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaires"] });
      toast({
        title: t.success[lang],
        description: t.archivedSuccessfully[lang],
      });
      setArchiveDialogOpen(false);
      setSelectedQuestionnaire(null);
    },
    onError: () => {
      toast({
        title: t.error[lang],
        description: t.failedToArchive[lang],
        variant: "destructive",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/questionnaires/${id}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaires"] });
      toast({
        title: t.success[lang],
        description: t.restoredSuccessfully[lang],
      });
    },
    onError: () => {
      toast({
        title: t.error[lang],
        description: t.failedToRestore[lang],
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/questionnaires/${id}`);
      if (response.status === 204) {
        return { archived: false };
      }
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaires"] });
      
      if (data?.archived) {
        toast({
          title: t.questionnaireArchived[lang],
          description: t.archivedInsteadOfDeleted[lang],
        });
      } else {
        toast({
          title: t.success[lang],
          description: t.deletedSuccessfully[lang],
        });
      }
      setDeleteDialogOpen(false);
      setSelectedQuestionnaire(null);
    },
    onError: () => {
      toast({
        title: t.error[lang],
        description: t.failedToDelete[lang],
        variant: "destructive",
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (questionnaire: Questionnaire) => {
      const now = new Date().toISOString();
      return await apiRequest("POST", "/api/questionnaires", {
        name: `${questionnaire.name} (Copy)`,
        status: "draft",
        questions: questionnaire.questions,
        welcomeText: questionnaire.welcomeText,
        consentText: questionnaire.consentText,
        consentRequired: questionnaire.consentRequired,
        confirmationMessage: questionnaire.confirmationMessage,
        standardFields: questionnaire.standardFields,
        defaultUnitsPreference: questionnaire.defaultUnitsPreference,
        createdAt: now,
        updatedAt: now,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaires"] });
      toast({
        title: t.success[lang],
        description: t.duplicatedSuccessfully[lang],
      });
    },
    onError: () => {
      toast({
        title: t.error[lang],
        description: t.failedToDuplicate[lang],
        variant: "destructive",
      });
    },
  });

  const handleDelete = (questionnaire: Questionnaire) => {
    setSelectedQuestionnaire(questionnaire);
    setDeleteDialogOpen(true);
  };

  const handleArchive = (questionnaire: Questionnaire) => {
    setSelectedQuestionnaire(questionnaire);
    setArchiveDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedQuestionnaire) {
      deleteMutation.mutate(selectedQuestionnaire.id);
    }
  };

  const confirmArchive = () => {
    if (selectedQuestionnaire) {
      archiveMutation.mutate(selectedQuestionnaire.id);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "published":
        return "default";
      case "archived":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "published":
        return t.published[lang];
      case "archived":
        return t.archived[lang];
      case "draft":
        return t.draft[lang];
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const renderQuestionnaireCard = (questionnaire: Questionnaire) => (
    <Card
      key={questionnaire.id}
      data-testid={`card-questionnaire-${questionnaire.id}`}
      className="hover-elevate cursor-pointer"
      onClick={() => activeTab === "active" && setLocation(`/questionnaires/${questionnaire.id}/edit`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-base truncate">{questionnaire.name}</h3>
              <Badge
                variant={getStatusBadgeVariant(questionnaire.status)}
                data-testid={`badge-status-${questionnaire.id}`}
              >
                {getStatusLabel(questionnaire.status)}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span data-testid={`text-usage-count-${questionnaire.id}`}>
                {t.sentTo[lang]}: {questionnaire.usageCount || 0}
              </span>
              <span data-testid={`text-updated-${questionnaire.id}`}>
                {new Date(questionnaire.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid={`button-actions-${questionnaire.id}`}
                  className="min-h-10 min-w-10"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {activeTab === "active" ? (
                  <>
                    {questionnaire.status === "draft" && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          publishMutation.mutate(questionnaire.id);
                        }}
                        data-testid={`action-publish-${questionnaire.id}`}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {t.publish[lang]}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/questionnaires/${questionnaire.id}/edit`);
                      }}
                      data-testid={`action-edit-${questionnaire.id}`}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {t.edit[lang]}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/questionnaires/${questionnaire.id}/preview`);
                      }}
                      data-testid={`action-preview-${questionnaire.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t.preview[lang]}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateMutation.mutate(questionnaire);
                      }}
                      data-testid={`action-duplicate-${questionnaire.id}`}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {t.duplicateQuestionnaire[lang]}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(questionnaire);
                      }}
                      data-testid={`action-archive-${questionnaire.id}`}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      {t.archive[lang]}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(questionnaire);
                      }}
                      data-testid={`action-delete-${questionnaire.id}`}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t.deleteQuestionnaire[lang]}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        restoreMutation.mutate(questionnaire.id);
                      }}
                      data-testid={`action-restore-${questionnaire.id}`}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {t.restore[lang]}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateMutation.mutate(questionnaire);
                      }}
                      data-testid={`action-duplicate-${questionnaire.id}`}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {t.duplicateQuestionnaire[lang]}
                    </DropdownMenuItem>
                    {(!questionnaire.usageCount || questionnaire.usageCount === 0) && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(questionnaire);
                        }}
                        data-testid={`action-hard-delete-${questionnaire.id}`}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t.deletePermanently[lang]}
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderQuestionnaireRow = (questionnaire: Questionnaire) => (
    <TableRow 
      key={questionnaire.id} 
      data-testid={`row-questionnaire-${questionnaire.id}`}
      className="cursor-pointer hover-elevate"
      onClick={() => activeTab === "active" && setLocation(`/questionnaires/${questionnaire.id}/edit`)}
    >
      <TableCell className="font-medium">
        {questionnaire.name}
      </TableCell>
      <TableCell>
        <Badge
          variant={getStatusBadgeVariant(questionnaire.status)}
          data-testid={`badge-status-${questionnaire.id}`}
        >
          {getStatusLabel(questionnaire.status)}
        </Badge>
      </TableCell>
      <TableCell data-testid={`text-usage-count-${questionnaire.id}`}>
        {questionnaire.usageCount || 0}
      </TableCell>
      <TableCell data-testid={`text-updated-${questionnaire.id}`}>
        {new Date(questionnaire.updatedAt).toLocaleDateString()}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid={`button-actions-${questionnaire.id}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {activeTab === "active" ? (
              <>
                {questionnaire.status === "draft" && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      publishMutation.mutate(questionnaire.id);
                    }}
                    data-testid={`action-publish-${questionnaire.id}`}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {t.publish[lang]}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/questionnaires/${questionnaire.id}/edit`);
                  }}
                  data-testid={`action-edit-${questionnaire.id}`}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t.edit[lang]}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/questionnaires/${questionnaire.id}/preview`);
                  }}
                  data-testid={`action-preview-${questionnaire.id}`}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {t.preview[lang]}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateMutation.mutate(questionnaire);
                  }}
                  data-testid={`action-duplicate-${questionnaire.id}`}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {t.duplicateQuestionnaire[lang]}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchive(questionnaire);
                  }}
                  data-testid={`action-archive-${questionnaire.id}`}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {t.archive[lang]}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(questionnaire);
                  }}
                  data-testid={`action-delete-${questionnaire.id}`}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t.deleteQuestionnaire[lang]}
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    restoreMutation.mutate(questionnaire.id);
                  }}
                  data-testid={`action-restore-${questionnaire.id}`}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t.restore[lang]}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateMutation.mutate(questionnaire);
                  }}
                  data-testid={`action-duplicate-${questionnaire.id}`}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {t.duplicateQuestionnaire[lang]}
                </DropdownMenuItem>
                {(!questionnaire.usageCount || questionnaire.usageCount === 0) && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(questionnaire);
                    }}
                    data-testid={`action-hard-delete-${questionnaire.id}`}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t.deletePermanently[lang]}
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t.title[lang]}</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {t.subtitle[lang]}
            </p>
          </div>
          <Button
            onClick={() => setLocation("/questionnaires/new")}
            data-testid="button-new-questionnaire"
            className="w-full sm:w-auto min-h-10"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t.newQuestionnaire[lang]}
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">{t.loading[lang]}</div>
            </CardContent>
          </Card>
        ) : allQuestionnaires.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{t.noQuestionnaires[lang]}</h3>
                <p className="text-muted-foreground">
                  {t.createFirstQuestionnaire[lang]}
                </p>
                <Button
                  onClick={() => setLocation("/questionnaires/new")}
                  data-testid="button-create-first-questionnaire"
                  className="min-h-10"
                >
                  {t.createQuestionnaire[lang]}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "archived")}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <TabsList data-testid="tabs-list" className="h-auto p-1 bg-muted rounded-lg">
                <TabsTrigger value="active" data-testid="tab-active" className="min-h-10 py-2 px-4 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md">
                  {t.active[lang]} ({activeQuestionnaires.length})
                </TabsTrigger>
                <TabsTrigger value="archived" data-testid="tab-archived" className="min-h-10 py-2 px-4 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md">
                  {t.archived[lang]} ({archivedQuestionnaires.length})
                </TabsTrigger>
              </TabsList>

              {activeTab === "active" && (
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-full sm:w-[180px] min-h-10" data-testid="select-status-filter">
                    <SelectValue placeholder={t.filterByStatus[lang]} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all[lang]}</SelectItem>
                    <SelectItem value="draft">{t.draft[lang]}</SelectItem>
                    <SelectItem value="published">{t.published[lang]}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <TabsContent value="active" className="m-0">
              {filteredQuestionnaires.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="text-muted-foreground">
                      {statusFilter === "draft" 
                        ? t.noDraftQuestionnaires[lang]
                        : statusFilter === "published"
                        ? t.noPublishedQuestionnaires[lang]
                        : t.noActiveQuestionnaires[lang]
                      }
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {isMobile ? (
                    <div className="space-y-3">
                      {filteredQuestionnaires.map(renderQuestionnaireCard)}
                    </div>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>{t.activeQuestionnaires[lang]}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t.name[lang]}</TableHead>
                              <TableHead>{t.status[lang]}</TableHead>
                              <TableHead>{t.sentTo[lang]}</TableHead>
                              <TableHead>{t.lastUpdated[lang]}</TableHead>
                              <TableHead className="w-[80px]">{t.actions[lang]}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredQuestionnaires.map(renderQuestionnaireRow)}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="archived" className="m-0">
              {archivedQuestionnaires.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="text-muted-foreground">
                      {t.noArchivedQuestionnaires[lang]}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {isMobile ? (
                    <div className="space-y-3">
                      {archivedQuestionnaires.map(renderQuestionnaireCard)}
                    </div>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>{t.archivedQuestionnaires[lang]}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t.name[lang]}</TableHead>
                              <TableHead>{t.status[lang]}</TableHead>
                              <TableHead>{t.sentTo[lang]}</TableHead>
                              <TableHead>{t.archivedAt[lang]}</TableHead>
                              <TableHead className="w-[80px]">{t.actions[lang]}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {archivedQuestionnaires.map(renderQuestionnaireRow)}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteConfirmTitle[lang]}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedQuestionnaire && selectedQuestionnaire.usageCount && selectedQuestionnaire.usageCount > 0 ? (
                t.deleteConfirmUsed[lang].replace("{count}", String(selectedQuestionnaire.usageCount))
              ) : (
                t.deleteConfirmUnused[lang].replace("{name}", selectedQuestionnaire?.name || "")
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t.cancel[lang]}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              data-testid="button-confirm-delete"
              className="bg-destructive hover:bg-destructive/90"
            >
              {selectedQuestionnaire && selectedQuestionnaire.usageCount && selectedQuestionnaire.usageCount > 0 
                ? t.archive[lang]
                : t.deleteQuestionnaire[lang]
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.archiveConfirmTitle[lang]}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.archiveConfirmDescription[lang].replace("{name}", selectedQuestionnaire?.name || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-archive">{t.cancel[lang]}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmArchive}
              data-testid="button-confirm-archive"
            >
              {t.archive[lang]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
