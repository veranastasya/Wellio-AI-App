import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, MoreVertical, Edit, Eye, Copy, Archive, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import type { Questionnaire } from "@shared/schema";

export default function Questionnaires() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<string | null>(null);

  const { data: questionnaires = [], isLoading } = useQuery<Questionnaire[]>({
    queryKey: ["/api/questionnaires"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/questionnaires/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaires"] });
      toast({
        title: "Success",
        description: "Questionnaire deleted successfully",
      });
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
      await apiRequest("/api/questionnaires", "POST", {
        name: `${questionnaire.name} (Copy)`,
        status: "draft",
        questions: questionnaire.questions,
        welcomeText: questionnaire.welcomeText,
        consentText: questionnaire.consentText,
        consentRequired: questionnaire.consentRequired,
        confirmationMessage: questionnaire.confirmationMessage,
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

  const handleDelete = (id: string) => {
    setSelectedQuestionnaire(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedQuestionnaire) {
      deleteMutation.mutate(selectedQuestionnaire);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Questionnaires</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage client intake forms
            </p>
          </div>
          <Button
            onClick={() => setLocation("/questionnaires/new")}
            data-testid="button-new-questionnaire"
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
        ) : questionnaires.length === 0 ? (
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
                >
                  Create Questionnaire
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Questionnaires</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Responses</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questionnaires.map((questionnaire) => (
                    <TableRow key={questionnaire.id} data-testid={`row-questionnaire-${questionnaire.id}`}>
                      <TableCell className="font-medium">
                        {questionnaire.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={questionnaire.status === "published" ? "default" : "secondary"}
                          data-testid={`badge-status-${questionnaire.id}`}
                        >
                          {questionnaire.status === "published" ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-responses-${questionnaire.id}`}>
                        0
                      </TableCell>
                      <TableCell data-testid={`text-updated-${questionnaire.id}`}>
                        {new Date(questionnaire.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
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
                            <DropdownMenuItem
                              onClick={() => setLocation(`/questionnaires/${questionnaire.id}/edit`)}
                              data-testid={`action-edit-${questionnaire.id}`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setLocation(`/questionnaires/${questionnaire.id}/preview`)}
                              data-testid={`action-preview-${questionnaire.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => duplicateMutation.mutate(questionnaire)}
                              data-testid={`action-duplicate-${questionnaire.id}`}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(questionnaire.id)}
                              className="text-destructive"
                              data-testid={`action-delete-${questionnaire.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Questionnaire</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this questionnaire? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
