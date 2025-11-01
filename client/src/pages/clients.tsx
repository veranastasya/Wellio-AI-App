import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Mail, Phone, TrendingUp, Calendar, MoreVertical, Pencil, Trash2, Send, Copy, Check, UserPlus } from "lucide-react";
import type { Questionnaire } from "@shared/schema";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<"manual" | "questionnaire">("manual");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const { toast } = useToast();

  const { data: clients = [], isLoading, isError } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: questionnaires = [] } = useQuery<Questionnaire[]>({
    queryKey: ["/api/questionnaires"],
  });

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    return index % 2 === 0 ? "bg-primary text-white" : "bg-accent text-accent-foreground";
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
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Client Management</h1>
            <p className="text-muted-foreground mt-1">Loading clients...</p>
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
        <div className="max-w-7xl mx-auto p-6">
          <Card className="border-destructive">
            <CardContent className="py-16 text-center">
              <Users className="w-16 h-16 mx-auto text-destructive mb-4" />
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
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-clients-title">Client Management</h1>
            <p className="text-muted-foreground mt-1">Manage your coaching clients and track their progress</p>
          </div>
          <div className="flex gap-2">
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
                  Send Invite
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
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

            <Dialog open={isNewClientOpen} onOpenChange={(open) => {
              setIsNewClientOpen(open);
              if (!open) {
                setCreationMode("manual");
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-new-client">
                  <Plus className="w-4 h-4" />
                  New Client
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Client</DialogTitle>
                  <DialogDescription>
                    Choose how you want to onboard this client
                  </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 mb-4">
                  <Button
                    variant={creationMode === "manual" ? "default" : "outline"}
                    onClick={() => setCreationMode("manual")}
                    className="flex-1"
                    data-testid="button-mode-manual"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Manually
                  </Button>
                  <Button
                    variant={creationMode === "questionnaire" ? "default" : "outline"}
                    onClick={() => setCreationMode("questionnaire")}
                    className="flex-1"
                    data-testid="button-mode-questionnaire"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Questionnaire
                  </Button>
                </div>

                {creationMode === "manual" ? (
                  <ClientForm
                    onSubmit={(data) => createClientMutation.mutate(data)}
                    isLoading={createClientMutation.isPending}
                  />
                ) : (
                  <QuestionnaireForm
                    questionnaires={questionnaires.filter(q => q.status === "published")}
                    onSubmit={(data) => createClientMutation.mutate(data)}
                    isLoading={createClientMutation.isPending}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients by name or email..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-clients"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client, index) => (
            <Card key={client.id} className="hover-elevate" data-testid={`card-client-${index}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full ${getAvatarColor(index)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-lg font-semibold">{getInitials(client.name)}</span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <Badge variant={client.status === "active" ? "default" : "secondary"} className="mt-1">
                        {client.status}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-client-menu-${index}`}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedClient(client);
                          setIsEditOpen(true);
                        }}
                        data-testid={`button-edit-client-${index}`}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteClientMutation.mutate(client.id)}
                        className="text-destructive"
                        data-testid={`button-delete-client-${index}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.goalType && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    <span>{client.goalType}</span>
                  </div>
                )}
                {client.lastSession && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(client.lastSession).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-foreground">No clients found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? "Try adjusting your search" : "Add your first client to get started"}
              </p>
            </CardContent>
          </Card>
        )}

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl">
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

function ClientForm({
  client,
  onSubmit,
  isLoading,
}: {
  client?: Client;
  onSubmit: (data: InsertClient) => void;
  isLoading: boolean;
}) {
  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      name: client?.name || "",
      email: client?.email || "",
      phone: client?.phone || "",
      status: client?.status || "active",
      goalType: client?.goalType || "",
      progressScore: client?.progressScore || 0,
      joinedDate: client?.joinedDate || new Date().toISOString().split("T")[0],
      lastSession: client?.lastSession || "",
      notes: client?.notes || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="goalType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Goal Type (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Weight Loss, Muscle Gain, etc."
                    {...field}
                    value={field.value || ""}
                    data-testid="input-client-goal"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="joinedDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Joined Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-client-joined" />
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
              <FormLabel>Notes (Optional)</FormLabel>
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
}: {
  questionnaires: Questionnaire[];
  onSubmit: (data: { email: string; name: string; questionnaireId: string; message?: string; coachName: string }) => void;
  isLoading: boolean;
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
      coachName: "Your Coach",
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
