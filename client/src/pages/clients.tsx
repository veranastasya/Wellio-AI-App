import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Search, Target, Calendar, MoreVertical, Pencil, Trash2, Copy, Check, UserPlus, Sparkles, ChevronDown, ChevronUp, Users as UsersIcon, Eye, AlertTriangle, CalendarDays, TrendingUp } from "lucide-react";
import type { Questionnaire, GoalType } from "@shared/schema";
import { GOAL_TYPES, GOAL_TYPE_LABELS, getGoalTypeLabel, ACTIVITY_LEVELS, ACTIVITY_LEVEL_LABELS, getActivityLevelLabel } from "@shared/schema";
import { type UnitsPreference, UNITS_LABELS, formatWeight, formatHeight, lbsToKg, kgToLbs, inchesToCm, cmToInches, inchesToFeetAndInches, feetAndInchesToInches } from "@shared/units";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type Client, type InsertClient } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Clients() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "ended">("all");
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: clients = [], isLoading, isError } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: questionnaires = [] } = useQuery<Questionnaire[]>({
    queryKey: ["/api/questionnaires"],
  });

  // Fetch coach profile for invite emails
  const { data: coachProfile } = useQuery<{ id: string; name: string; email: string; phone: string | null }>({
    queryKey: ["/api/coach/profile"],
  });

  // Get status label and color based on progress score
  const getProgressStatus = (progressScore: number | null | undefined) => {
    const score = progressScore || 0;
    if (score >= 80) {
      return { label: "Excellent", className: "bg-emerald-500 text-white hover:bg-emerald-500" };
    } else if (score >= 50) {
      return { label: "On Track", className: "bg-primary text-white hover:bg-primary" };
    } else if (score > 0) {
      return { label: "Needs Attention", className: "bg-amber-500 text-white hover:bg-amber-500" };
    } else {
      return { label: "New", className: "bg-muted text-muted-foreground hover:bg-muted" };
    }
  };

  // Format end date for display
  const formatEndDate = (endDate: string | null | undefined) => {
    if (!endDate) return null;
    try {
      const date = new Date(endDate);
      return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    } catch {
      return null;
    }
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Check if client's end date has passed
    const isEnded = client.endDate ? new Date(client.endDate) < new Date() : false;
    
    let matchesStatus = true;
    if (statusFilter === "active") {
      // Active = not ended and status is active
      matchesStatus = !isEnded && client.status === "active";
    } else if (statusFilter === "ended") {
      // Ended = end date passed OR status is inactive
      matchesStatus = isEnded || client.status === "inactive";
    }
    // "all" shows everything
    
    return matchesSearch && matchesStatus;
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      return await apiRequest("POST", "/api/clients", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsNewClientOpen(false);
      toast({
        title: "Success",
        description: "Client added successfully",
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertClient> }) => {
      return await apiRequest("PATCH", `/api/clients/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsEditOpen(false);
      setSelectedClient(null);
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: async (data: { email: string; name: string; questionnaireId: string; message?: string; coachName: string }) => {
      const response = await apiRequest("POST", "/api/client-invites", data);
      return response as unknown as { invite: any; inviteLink: string };
    },
    onSuccess: (response) => {
      setInviteLink(response.inviteLink);
      toast({
        title: "Success",
        description: "Invite created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invite",
        variant: "destructive",
      });
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      "bg-primary text-white",
      "bg-amber-500 text-white",
      "bg-rose-500 text-white",
      "bg-violet-500 text-white",
      "bg-emerald-500 text-white",
      "bg-cyan-500 text-white",
      "bg-orange-500 text-white",
      "bg-indigo-500 text-white",
    ];
    return colors[index % colors.length];
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      });
      setTimeout(() => setInviteCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Client Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Loading clients...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-12 bg-muted rounded-full w-12 mb-2 animate-pulse" />
                  <div className="h-5 bg-muted rounded animate-pulse w-32" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-full" />
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-background">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <Card className="border-destructive">
            <CardContent className="py-12 sm:py-16 text-center">
              <UsersIcon className="w-16 h-16 mx-auto text-destructive mb-4" />
              <p className="text-lg font-medium text-foreground">Failed to load clients</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please try refreshing the page
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-clients-title">Client Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your coaching clients and track their progress</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Dialog open={isInviteOpen} onOpenChange={(open) => {
              setIsInviteOpen(open);
              if (!open) {
                setInviteLink(null);
                setInviteCopied(false);
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-send-invite">
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Send Invite</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Send Client Invite</DialogTitle>
                  <DialogDescription>
                    Create a personalized invite link for your client to complete their onboarding
                  </DialogDescription>
                </DialogHeader>

                {!inviteLink ? (
                  <InviteForm
                    questionnaires={questionnaires.filter(q => q.status === "published")}
                    onSubmit={(data) => createInviteMutation.mutate(data)}
                    isLoading={createInviteMutation.isPending}
                    coachName={coachProfile?.name || "Your Coach"}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                      <p className="text-sm font-medium text-foreground">Invite Link Created!</p>
                      <div className="flex items-center gap-2">
                        <Input
                          value={inviteLink}
                          readOnly
                          className="font-mono text-sm"
                          data-testid="input-invite-link"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={copyInviteLink}
                          data-testid="button-copy-invite"
                        >
                          {inviteCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Share this link with your client. They'll use it to complete their onboarding questionnaire and create their account.
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => setIsInviteOpen(false)} data-testid="button-close-invite">
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-primary hover:bg-primary/90" data-testid="button-new-client">
                  <Plus className="w-4 h-4" />
                  New Client
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Client</DialogTitle>
                  <DialogDescription>
                    Enter client details to add them to your roster
                  </DialogDescription>
                </DialogHeader>

                <ClientForm
                  onSubmit={(data) => createClientMutation.mutate(data)}
                  isLoading={createClientMutation.isPending}
                />

                <div className="pt-2 border-t text-center">
                  <button
                    onClick={() => {
                      setIsNewClientOpen(false);
                      setIsInviteOpen(true);
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="link-send-questionnaire-instead"
                  >
                    Or send questionnaire invite instead →
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clients by name or email..."
              className="pl-10 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-clients"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 min-w-[120px]" data-testid="button-status-filter">
                {statusFilter === "all" ? "All Status" : statusFilter === "active" ? "Active" : "Ended"}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter("all")} data-testid="filter-all">
                All Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("active")} data-testid="filter-active">
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("ended")} data-testid="filter-ended">
                Ended
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Client Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredClients.map((client, index) => {
            const progressStatus = getProgressStatus(client.progressScore);
            const endDateFormatted = formatEndDate(client.endDate);
            const progressScore = client.progressScore || 0;
            const isExpanded = expandedCard === client.id;
            
            // Check if end date has passed
            const isEnded = client.endDate ? new Date(client.endDate) < new Date() : false;
            
            return (
              <div 
                key={client.id} 
                className={`group bg-card rounded-2xl shadow-sm hover:shadow-lg border overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 cursor-pointer flex flex-col ${
                  isEnded 
                    ? "border-red-200 dark:border-red-800 opacity-80" 
                    : "border-border hover:border-border/80"
                }`}
                data-testid={`card-client-${index}`}
                onClick={() => setLocation(`/coach/clients/${client.id}`)}
              >
                <div className="p-5 flex flex-col flex-1 space-y-4">
                  {/* Header: Avatar with status dot, Name, Badge, Expand Toggle */}
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className={`w-14 h-14 rounded-2xl ${isEnded ? "bg-muted" : getAvatarColor(index)} flex items-center justify-center shadow-sm`}>
                          <span className={`text-lg font-semibold ${isEnded ? "text-muted-foreground" : ""}`}>{getInitials(client.name)}</span>
                        </div>
                        {/* Status indicator dot on avatar - reflects active/inactive or ended status */}
                        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-card shadow-sm ${
                          isEnded 
                            ? "bg-red-500" 
                            : client.status === "active" 
                            ? "bg-emerald-500" 
                            : "bg-muted-foreground"
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className={`font-semibold truncate mb-1.5 ${isEnded ? "text-muted-foreground" : "text-foreground"}`}>{client.name}</h3>
                        {isEnded ? (
                          <Badge 
                            variant="outline"
                            className="text-xs border bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
                          >
                            Ended
                          </Badge>
                        ) : (
                          <Badge 
                            variant="outline"
                            className={`text-xs border ${
                              progressScore >= 80 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800" 
                                : progressScore >= 50 
                                ? "bg-primary/10 text-primary border-primary/30" 
                                : progressScore > 0
                                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {progressStatus.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {/* 3-dot Menu for Edit/Delete */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
                          data-testid={`button-menu-${index}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClient(client);
                            setIsEditOpen(true);
                          }}
                          data-testid={`menu-edit-${index}`}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit Client
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete ${client.name}?`)) {
                              deleteClientMutation.mutate(client.id);
                            }
                          }}
                          data-testid={`menu-delete-${index}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Client
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {/* Expand/Collapse Toggle */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
                      data-testid={`button-expand-${index}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedCard(isExpanded ? null : client.id);
                      }}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Primary Goal - Box Style with TrendingUp icon */}
                  <div className="p-3 bg-muted/50 rounded-xl border border-border/50 min-h-[72px] flex flex-col justify-center">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Primary Goal
                    </p>
                    <p className="text-sm text-foreground line-clamp-2">
                      {client.goalType ? getGoalTypeLabel(client.goalType, client.goalDescription) : "Not set"}
                    </p>
                  </div>

                  {/* Progress Bar with Gradient */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Progress</span>
                      <span className="text-sm font-medium text-foreground">{progressScore}%</span>
                    </div>
                    <div className="relative w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ease-out ${
                          progressScore >= 80 
                            ? "bg-gradient-to-r from-emerald-500 to-emerald-600" 
                            : progressScore >= 50 
                            ? "bg-gradient-to-r from-primary to-primary/80"
                            : progressScore > 0
                            ? "bg-gradient-to-r from-amber-500 to-amber-600"
                            : "bg-muted-foreground"
                        }`}
                        style={{ width: `${progressScore}%` }}
                      />
                    </div>
                  </div>

                  {/* End Date */}
                  {endDateFormatted && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="w-4 h-4 flex-shrink-0" />
                      <span>Ends {endDateFormatted}</span>
                    </div>
                  )}

                  {/* AI Insights Banners - Fixed height container for alignment */}
                  <div className="min-h-[56px]">
                    <ClientInsightBanners clientId={client.id} />
                  </div>

                  {/* Expanded Section: Client Metrics + Progress Breakdown */}
                  {isExpanded && (
                    <div className="space-y-3 pt-2 border-t border-border/50">
                      {/* Progress Breakdown */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Progress Breakdown</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-muted/30 rounded-lg">
                            <p className="text-lg font-semibold text-foreground">{client.goalProgress || 0}%</p>
                            <p className="text-xs text-muted-foreground">Goals</p>
                          </div>
                          <div className="text-center p-2 bg-muted/30 rounded-lg">
                            <p className="text-lg font-semibold text-foreground">{client.weeklyProgress || 0}%</p>
                            <p className="text-xs text-muted-foreground">Weekly</p>
                          </div>
                          <div className="text-center p-2 bg-muted/30 rounded-lg">
                            <p className="text-lg font-semibold text-foreground">{client.activityProgress || 0}%</p>
                            <p className="text-xs text-muted-foreground">Activity</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          50% Goals + 30% Weekly + 20% Activity
                        </p>
                      </div>
                      {/* Client Metrics */}
                      <div className="flex flex-wrap gap-2">
                        {client.sex && (
                          <Badge variant="outline" className="text-xs font-normal">
                            {client.sex === "male" ? "Male" : client.sex === "female" ? "Female" : client.sex}
                          </Badge>
                        )}
                        {client.weight && (
                          <Badge variant="outline" className="text-xs font-normal">
                            Weight {client.weight} kg
                          </Badge>
                        )}
                        {client.height && (
                          <Badge variant="outline" className="text-xs font-normal">
                            Height {client.height} cm
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons: View and Plan */}
                  <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      className="flex-1 bg-primary text-white hover:bg-primary/90"
                      onClick={() => setLocation(`/coach/clients/${client.id}`)}
                      data-testid={`button-view-${index}`}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Link href={`/coach/plan-builder/${client.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        className="w-full"
                        data-testid={`button-plan-${index}`}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Plan
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredClients.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <UsersIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-foreground">No clients found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? "Try adjusting your search" : "Add your first client to get started"}
              </p>
            </CardContent>
          </Card>
        )}

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Client</DialogTitle>
              <DialogDescription>Update client information</DialogDescription>
            </DialogHeader>
            {selectedClient && (
              <ClientForm
                client={selectedClient}
                onSubmit={(data) =>
                  updateClientMutation.mutate({ id: selectedClient.id, data })
                }
                isLoading={updateClientMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Component to display AI insights as small banners on client cards
function ClientInsightBanners({ clientId }: { clientId: string }) {
  const [triggers, setTriggers] = useState<Array<{ id: string; type: string; reason: string; severity: string; isResolved?: boolean }>>([]);

  useEffect(() => {
    if (!clientId) return;

    const fetchTriggers = async () => {
      try {
        const response = await fetch(`/api/engagement/triggers/${clientId}`);
        if (response.ok) {
          const data = await response.json();
          // Filter to only unresolved triggers, limit to 2 for card display
          const unresolved = data.filter((t: { isResolved?: boolean }) => !t.isResolved).slice(0, 2);
          setTriggers(unresolved);
        }
      } catch (error) {
        console.error("[ClientInsightBanners] Failed to fetch triggers:", error);
      }
    };

    fetchTriggers();
  }, [clientId]);

  if (triggers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {triggers.map((trigger) => (
        <div
          key={trigger.id}
          className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${
            trigger.severity === "High"
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : trigger.severity === "Medium"
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-primary/10 text-primary"
          }`}
          data-testid={`insight-banner-${trigger.id}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">{trigger.reason}</span>
        </div>
      ))}
    </div>
  );
}

function ClientForm({
  client,
  onSubmit,
  isLoading,
}: {
  client?: Client;
  onSubmit: (data: InsertClient) => void;
  isLoading: boolean;
}) {
  const [unitsPreference, setUnitsPreference] = useState<UnitsPreference>(
    (client?.unitsPreference as UnitsPreference) || "us"
  );
  const [heightFeet, setHeightFeet] = useState<string>("");
  const [heightInches, setHeightInches] = useState<string>("");
  
  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      name: client?.name || "",
      email: client?.email || "",
      phone: client?.phone || "",
      status: client?.status || "active",
      goalType: (client?.goalType as GoalType) || undefined,
      goalDescription: client?.goalDescription || "",
      progressScore: client?.progressScore || 0,
      joinedDate: client?.joinedDate || new Date().toISOString().split("T")[0],
      endDate: client?.endDate || undefined,
      lastSession: client?.lastSession || "",
      notes: client?.notes || "",
      sex: client?.sex || undefined,
      weight: client?.weight || undefined,
      age: client?.age || undefined,
      height: client?.height || undefined,
      unitsPreference: (client?.unitsPreference as UnitsPreference) || "us",
      targetWeight: client?.targetWeight || undefined,
      targetBodyFat: client?.targetBodyFat || undefined,
      goalWeight: client?.goalWeight || undefined,
      occupation: client?.occupation || undefined,
      medicalNotes: client?.medicalNotes || undefined,
      trainingExperience: client?.trainingExperience || undefined,
      equipmentAccess: client?.equipmentAccess || undefined,
      timeframe: client?.timeframe || undefined,
      currentHabits: client?.currentHabits || undefined,
      preferences: client?.preferences || undefined,
    },
  });

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        email: client.email,
        phone: client.phone || "",
        status: client.status,
        goalType: (client.goalType as GoalType) || undefined,
        goalDescription: client.goalDescription || "",
        progressScore: client.progressScore || 0,
        joinedDate: client.joinedDate,
        endDate: client.endDate || undefined,
        lastSession: client.lastSession || "",
        notes: client.notes || "",
        sex: client.sex || undefined,
        weight: client.weight || undefined,
        age: client.age || undefined,
        height: client.height || undefined,
        unitsPreference: (client.unitsPreference as UnitsPreference) || "us",
        targetWeight: client.targetWeight || undefined,
        targetBodyFat: client.targetBodyFat || undefined,
        goalWeight: client.goalWeight || undefined,
        occupation: client.occupation || undefined,
        medicalNotes: client.medicalNotes || undefined,
        trainingExperience: client.trainingExperience || undefined,
        equipmentAccess: client.equipmentAccess || undefined,
        timeframe: client.timeframe || undefined,
        currentHabits: client.currentHabits || undefined,
        preferences: client.preferences || undefined,
      });
      setUnitsPreference((client.unitsPreference as UnitsPreference) || "us");
      
      if (client.height && isFinite(client.height)) {
        const { feet, inches } = inchesToFeetAndInches(client.height);
        setHeightFeet(feet.toString());
        setHeightInches(inches.toString());
      }
    }
  }, [client, form]);

  const selectedGoalType = form.watch("goalType");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} data-testid="input-client-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john@example.com" {...field} data-testid="input-client-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="+1 (555) 123-4567"
                    {...field}
                    value={field.value || ""}
                    data-testid="input-client-phone"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-client-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-semibold text-foreground">Health Metrics (Optional)</h3>
          
          <FormField
            control={form.control}
            name="unitsPreference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Units</FormLabel>
                <Select
                  onValueChange={(value: UnitsPreference) => {
                    field.onChange(value);
                    setUnitsPreference(value);
                  }}
                  value={unitsPreference}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-units">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="us">{UNITS_LABELS.us}</SelectItem>
                    <SelectItem value="metric">{UNITS_LABELS.metric}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sex</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-client-sex">
                        <SelectValue placeholder="Select sex" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="120"
                      placeholder="25"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      data-testid="input-client-age"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight ({unitsPreference === "us" ? "lbs" : "kg"})</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    max="1000"
                    placeholder={unitsPreference === "us" ? "155.5" : "70.5"}
                    value={
                      unitsPreference === "metric" && field.value != null && isFinite(field.value)
                        ? lbsToKg(field.value)
                        : field.value ?? ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) {
                        field.onChange(undefined);
                        return;
                      }
                      const numValue = parseFloat(value);
                      const canonicalValue = unitsPreference === "metric" && isFinite(numValue)
                        ? kgToLbs(numValue)
                        : numValue;
                      field.onChange(isFinite(canonicalValue) ? canonicalValue : undefined);
                    }}
                    data-testid="input-client-weight"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {unitsPreference === "us" && (
            <FormField
              control={form.control}
              name="height"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Height</FormLabel>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="8"
                        placeholder="5 ft"
                        value={heightFeet}
                        onChange={(e) => {
                          const feet = parseFloat(e.target.value) || 0;
                          const inches = parseFloat(heightInches) || 0;
                          const totalInches = feetAndInchesToInches(feet, inches);
                          setHeightFeet(e.target.value);
                          field.onChange(isFinite(totalInches) ? totalInches : undefined);
                        }}
                        data-testid="input-client-height-feet"
                      />
                    </FormControl>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        max="11.99"
                        placeholder="8 in"
                        value={heightInches}
                        onChange={(e) => {
                          const feet = parseFloat(heightFeet) || 0;
                          const inches = parseFloat(e.target.value) || 0;
                          const totalInches = feetAndInchesToInches(feet, inches);
                          setHeightInches(e.target.value);
                          field.onChange(isFinite(totalInches) ? totalInches : undefined);
                        }}
                        data-testid="input-client-height-inches"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          {unitsPreference === "metric" && (
            <FormField
              control={form.control}
              name="height"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Height (cm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="300"
                      placeholder="173"
                      value={
                        field.value != null && isFinite(field.value)
                          ? inchesToCm(field.value)
                          : ""
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        if (!value) {
                          field.onChange(undefined);
                          return;
                        }
                        const numValue = parseFloat(value);
                        const canonicalValue = isFinite(numValue) ? cmToInches(numValue) : undefined;
                        field.onChange(canonicalValue);
                      }}
                      data-testid="input-client-height-cm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="activityLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-client-activity-level">
                        <SelectValue placeholder="Select activity level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACTIVITY_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {ACTIVITY_LEVEL_LABELS[level]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bodyFatPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body Fat %</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      placeholder="18.5"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      data-testid="input-client-body-fat"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="goalType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Goal (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger data-testid="select-client-goal">
                      <SelectValue placeholder="Select your goal" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GOAL_TYPES.map((goalType) => (
                      <SelectItem key={goalType} value={goalType}>
                        {GOAL_TYPE_LABELS[goalType]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field} 
                    value={field.value || ""} 
                    onChange={(e) => field.onChange(e.target.value || undefined)}
                    data-testid="input-client-end-date" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {selectedGoalType === "other" && (
          <FormField
            control={form.control}
            name="goalDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Describe your goal</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Tell us about your specific goal..."
                    {...field}
                    value={field.value || ""}
                    data-testid="input-client-goal-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        {selectedGoalType === "lose_weight" && (
          <FormField
            control={form.control}
            name="targetWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Weight ({unitsPreference === "us" ? "lbs" : "kg"})</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1000"
                    placeholder={unitsPreference === "us" ? "180" : "82"}
                    value={
                      unitsPreference === "metric" && field.value != null && isFinite(field.value)
                        ? lbsToKg(field.value)
                        : field.value ?? ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) {
                        field.onChange(undefined);
                        return;
                      }
                      const numValue = parseFloat(value);
                      if (unitsPreference === "metric") {
                        const canonicalValue = isFinite(numValue) ? kgToLbs(numValue) : undefined;
                        field.onChange(canonicalValue);
                      } else {
                        field.onChange(isFinite(numValue) ? numValue : undefined);
                      }
                    }}
                    data-testid="input-client-target-weight"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        {selectedGoalType === "improve_body_composition" && (
          <FormField
            control={form.control}
            name="targetBodyFat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Body Fat %</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="18"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    data-testid="input-client-target-body-fat"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        {selectedGoalType === "maintain_weight" && (
          <FormField
            control={form.control}
            name="goalWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Goal Weight ({unitsPreference === "us" ? "lbs" : "kg"})</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1000"
                    placeholder={unitsPreference === "us" ? "165" : "75"}
                    value={
                      unitsPreference === "metric" && field.value != null && isFinite(field.value)
                        ? lbsToKg(field.value)
                        : field.value ?? ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) {
                        field.onChange(undefined);
                        return;
                      }
                      const numValue = parseFloat(value);
                      if (unitsPreference === "metric") {
                        const canonicalValue = isFinite(numValue) ? kgToLbs(numValue) : undefined;
                        field.onChange(canonicalValue);
                      } else {
                        field.onChange(isFinite(numValue) ? numValue : undefined);
                      }
                    }}
                    data-testid="input-client-goal-weight"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-semibold text-foreground">Wellness Plan Details (Optional)</h3>
          <p className="text-xs text-muted-foreground">This information helps create personalized AI-powered wellness plans</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Occupation</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., desk job, works from home"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-client-occupation"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timeframe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Timeframe</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 12 weeks, 3 months"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-client-timeframe"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="trainingExperience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Training Experience</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-client-training-experience">
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="returning_after_break">Returning after break</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="equipmentAccess"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipment Access</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., home gym, dumbbells, resistance bands"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-client-equipment"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="medicalNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Medical Notes / Limitations</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Injuries, conditions, limitations, medications, etc."
                    className="min-h-20"
                    {...field}
                    value={field.value || ""}
                    data-testid="input-client-medical-notes"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Coach Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional notes about the client..."
                  className="min-h-24"
                  {...field}
                  value={field.value || ""}
                  data-testid="input-client-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="submit" disabled={isLoading} data-testid="button-submit-client">
            {isLoading ? "Saving..." : client ? "Update Client" : "Add Client"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function InviteForm({
  questionnaires,
  onSubmit,
  isLoading,
  coachName,
}: {
  questionnaires: Questionnaire[];
  onSubmit: (data: { email: string; name: string; questionnaireId: string; message?: string; coachName: string }) => void;
  isLoading: boolean;
  coachName: string;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [questionnaireId, setQuestionnaireId] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter client email",
        variant: "destructive",
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter client name",
        variant: "destructive",
      });
      return;
    }

    if (!questionnaireId) {
      toast({
        title: "Error",
        description: "Please select a questionnaire",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      email,
      name,
      questionnaireId,
      message: message || undefined,
      coachName: coachName,
    });
  };

  if (questionnaires.length === 0) {
    return (
      <div className="py-8 text-center space-y-4">
        <p className="text-muted-foreground">
          No published questionnaires available.
        </p>
        <p className="text-sm text-muted-foreground">
          Create and publish a questionnaire first to use this feature.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invite-email">Client Email</Label>
        <Input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="client@example.com"
          data-testid="input-invite-email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-name">Client Name</Label>
        <Input
          id="invite-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter client name"
          data-testid="input-invite-name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-questionnaire">Onboarding Questionnaire</Label>
        <Select value={questionnaireId} onValueChange={setQuestionnaireId}>
          <SelectTrigger data-testid="select-invite-questionnaire">
            <SelectValue placeholder="Choose a questionnaire" />
          </SelectTrigger>
          <SelectContent>
            {questionnaires.map((q) => (
              <SelectItem key={q.id} value={q.id}>
                {q.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-message">Custom Message (Optional)</Label>
        <Textarea
          id="invite-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a personal message to your client..."
          className="min-h-20"
          data-testid="input-invite-message"
        />
      </div>

      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <p className="text-sm font-medium">What happens next?</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Client receives a secure invite link</li>
          <li>• They complete the questionnaire using the link</li>
          <li>• Their account is automatically created upon completion</li>
          <li>• You can track their progress in the dashboard</li>
        </ul>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="submit"
          disabled={isLoading}
          data-testid="button-create-invite"
        >
          {isLoading ? "Creating..." : "Create Invite Link"}
        </Button>
      </div>
    </form>
  );
}

function QuestionnaireForm({
  questionnaires,
  onSubmit,
  isLoading,
}: {
  questionnaires: Questionnaire[];
  onSubmit: (data: InsertClient) => void;
  isLoading: boolean;
}) {
  const [clientName, setClientName] = useState("");
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a client name",
        variant: "destructive",
      });
      return;
    }

    if (!selectedQuestionnaire) {
      toast({
        title: "Error",
        description: "Please select a questionnaire",
        variant: "destructive",
      });
      return;
    }

    const sanitizedName = clientName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');

    const emailPrefix = sanitizedName || 'pending.client';

    const clientData: InsertClient = {
      name: clientName,
      email: `${emailPrefix}@pending.com`,
      status: "pending",
      progressScore: 0,
      joinedDate: new Date().toISOString().split("T")[0],
      intakeSource: "questionnaire",
      questionnaireId: selectedQuestionnaire,
    };

    onSubmit(clientData);
  };

  if (questionnaires.length === 0) {
    return (
      <div className="py-8 text-center space-y-4">
        <p className="text-muted-foreground">
          No published questionnaires available.
        </p>
        <p className="text-sm text-muted-foreground">
          Create and publish a questionnaire first to use this feature.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="client-name">Client Name</Label>
        <Input
          id="client-name"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Enter client name"
          data-testid="input-questionnaire-client-name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="questionnaire">Select Questionnaire</Label>
        <Select value={selectedQuestionnaire} onValueChange={setSelectedQuestionnaire}>
          <SelectTrigger data-testid="select-questionnaire">
            <SelectValue placeholder="Choose a questionnaire" />
          </SelectTrigger>
          <SelectContent>
            {questionnaires.map((q) => (
              <SelectItem key={q.id} value={q.id}>
                {q.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <p className="text-sm font-medium">What happens next?</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Client will appear with "Pending" status</li>
          <li>• You can simulate questionnaire response for MVP</li>
          <li>• Profile auto-populates when response is submitted</li>
        </ul>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="submit"
          disabled={isLoading}
          data-testid="button-send-questionnaire"
        >
          {isLoading ? "Sending..." : "Send Questionnaire"}
        </Button>
      </div>
    </form>
  );
}

function Users(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
