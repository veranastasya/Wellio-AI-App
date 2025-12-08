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
import type { Questionnaire } from "@shared/schema";

export default function Questionnaires() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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

  // Filter questionnaires based on tab and status
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
        title: "Success",
        description: "Questionnaire published successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to publish questionnaire",
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
        title: "Success",
        description: "Questionnaire archived successfully",
      });
      setArchiveDialogOpen(false);
      setSelectedQuestionnaire(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive questionnaire",
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
        title: "Success",
        description: "Questionnaire restored successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore questionnaire",
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
          title: "Questionnaire Archived",
          description: "This questionnaire was sent to clients and has been archived instead of deleted.",
        });
      } else {
        toast({
          title: "Success",
          description: "Questionnaire deleted successfully",
        });
      }
      setDeleteDialogOpen(false);
      setSelectedQuestionnaire(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete questionnaire",
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
        title: "Success",
        description: "Questionnaire duplicated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate questionnaire",
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
                {questionnaire.status.charAt(0).toUpperCase() + questionnaire.status.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span data-testid={`text-usage-count-${questionnaire.id}`}>
                Sent to: {questionnaire.usageCount || 0}
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
                        Publish
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
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/questionnaires/${questionnaire.id}/preview`);
                      }}
                      data-testid={`action-preview-${questionnaire.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateMutation.mutate(questionnaire);
                      }}
                      data-testid={`action-duplicate-${questionnaire.id}`}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(questionnaire);
                      }}
                      data-testid={`action-archive-${questionnaire.id}`}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
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
                      Delete
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
                      Restore
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateMutation.mutate(questionnaire);
                      }}
                      data-testid={`action-duplicate-${questionnaire.id}`}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
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
                        Delete Permanently
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
          {questionnaire.status.charAt(0).toUpperCase() + questionnaire.status.slice(1)}
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
                    Publish
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
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/questionnaires/${questionnaire.id}/preview`);
                  }}
                  data-testid={`action-preview-${questionnaire.id}`}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateMutation.mutate(questionnaire);
                  }}
                  data-testid={`action-duplicate-${questionnaire.id}`}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchive(questionnaire);
                  }}
                  data-testid={`action-archive-${questionnaire.id}`}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
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
                  Delete
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
                  Restore
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateMutation.mutate(questionnaire);
                  }}
                  data-testid={`action-duplicate-${questionnaire.id}`}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
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
                    Delete Permanently
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
            <h1 className="text-2xl sm:text-3xl font-bold">Questionnaires</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Create and manage client intake forms
            </p>
          </div>
          <Button
            onClick={() => setLocation("/questionnaires/new")}
            data-testid="button-new-questionnaire"
            className="w-full sm:w-auto min-h-10"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Questionnaire
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        ) : allQuestionnaires.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">No questionnaires yet</h3>
                <p className="text-muted-foreground">
                  Create your first intake form to onboard clients faster.
                </p>
                <Button
                  onClick={() => setLocation("/questionnaires/new")}
                  data-testid="button-create-first-questionnaire"
                  className="min-h-10"
                >
                  Create Questionnaire
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "archived")}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <TabsList data-testid="tabs-list" className="h-auto p-1 bg-muted rounded-lg">
                <TabsTrigger value="active" data-testid="tab-active" className="min-h-10 py-2 px-4 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md">
                  Active ({activeQuestionnaires.length})
                </TabsTrigger>
                <TabsTrigger value="archived" data-testid="tab-archived" className="min-h-10 py-2 px-4 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md">
                  Archived ({archivedQuestionnaires.length})
                </TabsTrigger>
              </TabsList>

              {activeTab === "active" && (
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-full sm:w-[180px] min-h-10" data-testid="select-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <TabsContent value="active" className="m-0">
              {filteredQuestionnaires.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="text-muted-foreground">
                      {statusFilter !== "all" 
                        ? `No ${statusFilter} questionnaires found`
                        : "No active questionnaires found"
                      }
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {isMobile ? (
                    /* Mobile Card Layout */
                    <div className="space-y-3">
                      {filteredQuestionnaires.map(renderQuestionnaireCard)}
                    </div>
                  ) : (
                    /* Desktop Table Layout */
                    <Card>
                      <CardHeader>
                        <CardTitle>Active Questionnaires</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Sent To</TableHead>
                              <TableHead>Last Updated</TableHead>
                              <TableHead className="w-[80px]">Actions</TableHead>
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
                      No archived questionnaires
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {isMobile ? (
                    /* Mobile Card Layout */
                    <div className="space-y-3">
                      {archivedQuestionnaires.map(renderQuestionnaireCard)}
                    </div>
                  ) : (
                    /* Desktop Table Layout */
                    <Card>
                      <CardHeader>
                        <CardTitle>Archived Questionnaires</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Sent To</TableHead>
                              <TableHead>Archived At</TableHead>
                              <TableHead className="w-[80px]">Actions</TableHead>
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
            <AlertDialogTitle>Delete Questionnaire</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedQuestionnaire && selectedQuestionnaire.usageCount && selectedQuestionnaire.usageCount > 0 ? (
                <>
                  This questionnaire has been sent to {selectedQuestionnaire.usageCount} client(s). 
                  It will be archived instead of deleted to preserve client responses.
                </>
              ) : (
                <>
                  Are you sure you want to delete "{selectedQuestionnaire?.name}"? This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              data-testid="button-confirm-delete"
              className="bg-destructive hover:bg-destructive/90"
            >
              {selectedQuestionnaire && selectedQuestionnaire.usageCount && selectedQuestionnaire.usageCount > 0 
                ? "Archive" 
                : "Delete"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Questionnaire</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{selectedQuestionnaire?.name}"? 
              It will be hidden from the active list but can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-archive">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmArchive}
              data-testid="button-confirm-archive"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
