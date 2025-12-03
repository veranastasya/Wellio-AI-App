import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2, Send, Download, FileText, Target, Apple, Dumbbell, Activity, User, ArrowLeft, ChevronRight, ChevronLeft, Maximize2, Minimize2, CheckCircle, Share2, Monitor, UserPlus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, Goal, PlanSession, PlanMessage } from "@shared/schema";
import { getGoalTypeLabel, PLAN_SESSION_STATUSES } from "@shared/schema";

interface Message {
  id?: string;
  role: "system" | "user" | "assistant";
  content: string;
}

interface ClientContext {
  client: {
    name: string;
    email?: string;
    goal: string | null;
    goalDescription: string | null;
    current_weight: number | null;
    notes: string | null;
    sex?: string | null;
    age?: number | null;
    weight?: number | null;
    height?: number | null;
    activityLevel?: string | null;
    bodyFatPercentage?: number | null;
    targetWeight?: number | null;
    targetBodyFat?: number | null;
    goalWeight?: number | null;
  };
  goals?: Goal[];
  recent_nutrition?: Array<{
    date: string;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fats: number | null;
  }>;
  recent_workouts?: Array<{
    date: string;
    type: string;
    duration: number | null;
    intensity: string | null;
  }>;
  questionnaire_data?: Array<{
    questionnaire_name: string;
    submitted_at: string;
    data: Record<string, any>;
  }>;
}

function generateInitialPrompt(context: ClientContext): string {
  const { client, goals, recent_nutrition, recent_workouts } = context;
  
  let prompt = `Create a comprehensive wellness plan for ${client.name}.

**Client Profile:**`;

  // Demographics
  if (client.sex || client.age) {
    prompt += `\n- Demographics: `;
    const demo = [];
    if (client.sex) demo.push(client.sex);
    if (client.age) demo.push(`${client.age} years old`);
    prompt += demo.join(', ');
  }

  // Physical metrics
  const metrics = [];
  if (client.weight) metrics.push(`Weight: ${client.weight} lbs`);
  if (client.height) {
    const feet = Math.floor(client.height / 12);
    const inches = client.height % 12;
    metrics.push(`Height: ${feet}'${inches}"`);
  }
  if (client.bodyFatPercentage) metrics.push(`Body Fat: ${client.bodyFatPercentage}%`);
  if (client.activityLevel) metrics.push(`Activity Level: ${client.activityLevel}`);
  
  if (metrics.length > 0) {
    prompt += `\n- Physical Metrics: ${metrics.join(' | ')}`;
  }

  // Primary goal
  if (client.goal) {
    prompt += `\n- Primary Goal: ${getGoalTypeLabel(client.goal)}`;
    if (client.goalDescription) {
      prompt += ` - ${client.goalDescription}`;
    }
    
    // Add target values based on goal type
    if (client.goal === 'lose_weight' && client.targetWeight) {
      prompt += `\n  - Target Weight: ${client.targetWeight} lbs`;
    }
    if (client.goal === 'improve_body_composition' && client.targetBodyFat) {
      prompt += `\n  - Target Body Fat: ${client.targetBodyFat}%`;
    }
    if (client.goal === 'maintain_weight' && client.goalWeight) {
      prompt += `\n  - Goal Weight: ${client.goalWeight} lbs`;
    }
  }

  // Specific goals
  if (goals && goals.length > 0) {
    const activeGoals = goals.filter(g => g.status === 'active');
    if (activeGoals.length > 0) {
      prompt += `\n\n**Active Goals:**`;
      activeGoals.forEach(g => {
        prompt += `\n- ${getGoalTypeLabel(g.goalType)}: `;
        if (g.currentValue && g.targetValue) {
          prompt += `Current ${g.currentValue} → Target ${g.targetValue}`;
        } else if (g.targetValue) {
          prompt += `Target ${g.targetValue}`;
        }
        if (g.deadline) {
          prompt += ` (Deadline: ${g.deadline})`;
        }
      });
    }
  }

  // Recent nutrition data
  if (recent_nutrition && recent_nutrition.length > 0) {
    const validNutrition = recent_nutrition.filter(n => n.calories || n.protein || n.carbs || n.fats);
    if (validNutrition.length > 0) {
      prompt += `\n\n**Recent Nutrition (Last ${validNutrition.length} days):**`;
      const avgCalories = validNutrition.reduce((sum, n) => sum + (n.calories || 0), 0) / validNutrition.length;
      const avgProtein = validNutrition.reduce((sum, n) => sum + (n.protein || 0), 0) / validNutrition.length;
      const avgCarbs = validNutrition.reduce((sum, n) => sum + (n.carbs || 0), 0) / validNutrition.length;
      const avgFats = validNutrition.reduce((sum, n) => sum + (n.fats || 0), 0) / validNutrition.length;
      
      prompt += `\n- Average Daily: ${Math.round(avgCalories)} cal | ${Math.round(avgProtein)}g protein | ${Math.round(avgCarbs)}g carbs | ${Math.round(avgFats)}g fats`;
    }
  }

  // Recent workout data
  if (recent_workouts && recent_workouts.length > 0) {
    const validWorkouts = recent_workouts.filter(w => w.type);
    if (validWorkouts.length > 0) {
      prompt += `\n\n**Recent Workouts (Last ${validWorkouts.length} days):**`;
      const workoutTypes = Array.from(new Set(validWorkouts.map(w => w.type)));
      prompt += `\n- Activity Types: ${workoutTypes.join(', ')}`;
      const avgDuration = validWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0) / validWorkouts.length;
      if (avgDuration > 0) {
        prompt += `\n- Average Duration: ${Math.round(avgDuration)} minutes`;
      }
    }
  }

  // Coach notes
  if (client.notes) {
    prompt += `\n\n**Coach Notes:**\n${client.notes}`;
  }

  prompt += `\n\n---\n\nBased on this comprehensive profile, please create a personalized wellness plan that addresses their goals, current fitness level, and activity patterns. Include specific recommendations for nutrition, exercise, and lifestyle adjustments.`;

  return prompt;
}

const SECTION_TEMPLATES = [
  { heading: "Summary", content: "Brief overview of the wellness plan..." },
  { heading: "Key Goals", content: "• Goal 1\n• Goal 2\n• Goal 3" },
  { heading: "Weekly Structure", content: "Monday:\nTuesday:\nWednesday:\nThursday:\nFriday:\nSaturday:\nSunday:" },
  { heading: "Movement & Activity Habits", content: "Describe recommended physical activities, frequency, duration, and intensity..." },
  { heading: "Nutrition Habits", content: "List simple, sustainable nutrition guidelines..." },
  { heading: "Sleep & Recovery", content: "Sleep duration target and recovery practices..." },
  { heading: "Stress Management & Mindset", content: "Mindfulness practices and stress reduction techniques..." },
  { heading: "Environment & Routines", content: "Daily routines and environmental optimizations..." },
  { heading: "Weekly Checkpoints & Metrics", content: "Metrics to track:\n• Metric 1\n• Metric 2\n• Metric 3" },
];

export default function PlanBuilder() {
  const [, params] = useRoute("/coach/plan-builder/:clientId");
  const clientId = params?.clientId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [planName, setPlanName] = useState("");
  const [planContent, setPlanContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<string>("IN_PROGRESS");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const canvasTextareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: allClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: clientContext, isLoading: isLoadingContext } = useQuery<ClientContext>({
    queryKey: ["/api/clients", clientId, "context"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/clients/${clientId}/context`);
      return response.json();
    },
    enabled: !!clientId,
  });

  // Fetch or create plan session for this client
  const { data: planSession, isLoading: isLoadingSession, refetch: refetchSession } = useQuery<PlanSession | null>({
    queryKey: ["/api/plan-sessions/client", clientId, "active"],
    queryFn: async () => {
      // First try to get active session
      const activeResponse = await apiRequest("GET", `/api/plan-sessions/client/${clientId}/active`);
      const activeSession = await activeResponse.json();
      
      if (activeSession) {
        return activeSession;
      }
      
      // No active session - create one
      const createResponse = await apiRequest("POST", "/api/plan-sessions", {
        clientId,
        coachId: "default-coach",
        status: "IN_PROGRESS",
      });
      return createResponse.json();
    },
    enabled: !!clientId,
  });

  // Load messages for the session
  const { data: sessionMessages, isLoading: isLoadingMessages } = useQuery<PlanMessage[]>({
    queryKey: ["/api/plan-sessions", sessionId, "messages"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/plan-sessions/${sessionId}/messages`);
      return response.json();
    },
    enabled: !!sessionId,
  });

  // Update local state when session is loaded
  useEffect(() => {
    if (planSession) {
      setSessionId(planSession.id);
      setPlanStatus(planSession.status);
      if (planSession.canvasContent) {
        setPlanContent(planSession.canvasContent);
      }
      if (planSession.planName) {
        setPlanName(planSession.planName);
      }
    }
  }, [planSession]);

  // Load messages from database when sessionMessages changes
  useEffect(() => {
    if (sessionMessages && sessionMessages.length > 0) {
      const loadedMessages: Message[] = sessionMessages.map(m => ({
        id: m.id,
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      }));
      setMessages(loadedMessages);
      setHasInitialized(true); // Don't auto-generate if we have history
    }
  }, [sessionMessages]);

  // Mutation to save a message to the database
  const saveMessageMutation = useMutation({
    mutationFn: async (message: { role: string; content: string }) => {
      if (!sessionId) throw new Error("No session");
      const response = await apiRequest("POST", `/api/plan-sessions/${sessionId}/messages`, {
        sessionId,
        role: message.role,
        content: message.content,
      });
      return response.json();
    },
  });

  // Mutation to update session (canvas content, status, etc.)
  const updateSessionMutation = useMutation({
    mutationFn: async (data: Partial<PlanSession>) => {
      if (!sessionId) throw new Error("No session");
      const response = await apiRequest("PATCH", `/api/plan-sessions/${sessionId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plan-sessions/client", clientId] });
    },
  });

  // Mutation to assign plan to client
  const assignPlanMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error("No session");
      
      // First save current canvas content
      await apiRequest("PATCH", `/api/plan-sessions/${sessionId}`, {
        canvasContent: planContent,
        planName: planName,
        status: "ASSIGNED",
        assignedAt: new Date().toISOString(),
      });
      
      // Create the client plan record
      const planResponse = await apiRequest("POST", "/api/client-plans", {
        clientId,
        coachId: "default-coach",
        planName: planName || "Wellness Plan",
        planContent: { content: planContent },
        sessionId: sessionId,
        status: "active",
        shared: true,
      });
      
      return planResponse.json();
    },
    onSuccess: () => {
      setPlanStatus("ASSIGNED");
      queryClient.invalidateQueries({ queryKey: ["/api/plan-sessions/client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/plan-sessions"] }); // Invalidate all-sessions for Client Management
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "plan-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-plans"] });
      toast({
        title: "Plan Assigned",
        description: "The plan has been assigned to the client and is now visible in their portal.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign plan",
        variant: "destructive",
      });
    },
  });

  // Auto-save canvas content when it changes (debounced)
  useEffect(() => {
    if (!sessionId || !planContent) return;
    
    const timer = setTimeout(() => {
      updateSessionMutation.mutate({ canvasContent: planContent });
    }, 2000); // Debounce 2 seconds
    
    return () => clearTimeout(timer);
  }, [planContent, sessionId]);

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      if (!clientContext || !clientContext.client) {
        throw new Error("Client context not loaded");
      }

      const userMsg = { role: "user" as const, content: userMessage };
      const currentClientId = clientId;
      const currentSessionId = sessionId;
      
      // Optimistic update: Add user message immediately to UI
      setMessages(prev => [...prev, userMsg]);
      setInput("");

      // Save user message to database
      if (currentSessionId) {
        await apiRequest("POST", `/api/plan-sessions/${currentSessionId}/messages`, {
          sessionId: currentSessionId,
          role: "user",
          content: userMessage,
        });
      }

      const newMessages = [...messages, userMsg];
      const response = await apiRequest("POST", "/api/plans/chat", {
        messages: newMessages,
        clientContext,
      });
      const data = await response.json();
      
      // Save AI response to database
      if (currentSessionId && data.message) {
        await apiRequest("POST", `/api/plan-sessions/${currentSessionId}/messages`, {
          sessionId: currentSessionId,
          role: data.message.role,
          content: data.message.content,
        });
      }
      
      return { userMsg, aiMessage: data.message, requestClientId: currentClientId };
    },
    onMutate: (userMessage) => {
      // Store context for error rollback
      return { requestClientId: clientId, userMessage };
    },
    onSuccess: (data) => {
      // Guard against cross-client state pollution
      if (data.requestClientId !== clientId) {
        return;
      }

      // Ensure user message is present before adding AI response
      setMessages(prev => {
        const hasUserMessage = prev.some(m => m.role === "user" && m.content === data.userMsg.content);
        const withUser = hasUserMessage ? prev : [...prev, data.userMsg];
        return data.aiMessage ? [...withUser, data.aiMessage] : withUser;
      });
    },
    onError: (error: Error, _variables, context) => {
      // Guard against cross-client state pollution during error rollback
      if (context?.requestClientId !== clientId) {
        return;
      }

      // Remove the specific optimistically added user message
      if (context?.userMessage) {
        setMessages(prev => prev.filter((m, idx, arr) => {
          // Remove the last user message that matches the failed request
          const isLastMatch = m.role === "user" && m.content === context.userMessage && idx === arr.length - 1;
          return !isLastMatch;
        }));
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
      // Reset initialization flag if auto-prompt fails so it can retry
      setHasInitialized(false);
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async () => {
      if (!planName.trim()) {
        throw new Error("Please enter a plan name");
      }
      
      if (!planContent.trim()) {
        throw new Error("Please add content to your plan");
      }
      
      const response = await apiRequest("POST", "/api/client-plans", {
        clientId,
        coachId: "default-coach",
        planName: planName.trim(),
        planContent: { content: planContent },
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-plans"] });
      toast({
        title: "Success",
        description: "Plan saved successfully!",
      });
      return plan;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save plan",
        variant: "destructive",
      });
    },
  });

  const generatePDFMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest("POST", `/api/plans/${planId}/generate-pdf`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "PDF generated successfully!",
      });
      window.open(data.pdfUrl, "_blank");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    },
  });

  const sharePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest("POST", `/api/client-plans/${planId}/share`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-plans"] });
      toast({
        title: "Success",
        description: "Plan shared with client!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to share plan",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!input.trim() || chatMutation.isPending) return;
    chatMutation.mutate(input);
  };

  const handleAddToCanvas = (content: string) => {
    const formattedContent = content.trim();
    setPlanContent(prev => {
      if (!prev.trim()) {
        return formattedContent;
      }
      return prev + "\n\n" + formattedContent;
    });
    toast({
      title: "Added to canvas",
      description: "Content added. You can now edit it.",
    });
    
    // Scroll to bottom of canvas
    setTimeout(() => {
      if (canvasTextareaRef.current) {
        canvasTextareaRef.current.scrollTop = canvasTextareaRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleAddSection = (template: typeof SECTION_TEMPLATES[0]) => {
    const sectionText = `### ${template.heading}\n\n${template.content}`;
    setPlanContent(prev => {
      if (!prev.trim()) {
        return sectionText;
      }
      return prev + "\n\n" + sectionText;
    });
    
    // Scroll to bottom of canvas
    setTimeout(() => {
      if (canvasTextareaRef.current) {
        canvasTextareaRef.current.scrollTop = canvasTextareaRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleSavePlan = async () => {
    setIsSaving(true);
    try {
      const plan = await savePlanMutation.mutateAsync();
      if (plan?.id) {
        await generatePDFMutation.mutateAsync(plan.id);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndShare = async () => {
    setIsSaving(true);
    try {
      const plan = await savePlanMutation.mutateAsync();
      if (plan?.id) {
        await generatePDFMutation.mutateAsync(plan.id);
        await sharePlanMutation.mutateAsync(plan.id);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-generate and send initial prompt when context loads (only if no existing messages)
  useEffect(() => {
    if (
      clientContext && 
      clientContext.client && 
      !hasInitialized && 
      messages.length === 0 && 
      !chatMutation.isPending &&
      sessionId && 
      !isLoadingMessages &&
      (!sessionMessages || sessionMessages.length === 0)
    ) {
      const initialPrompt = generateInitialPrompt(clientContext);
      setHasInitialized(true);
      chatMutation.mutate(initialPrompt);
    }
  }, [clientContext, hasInitialized, messages.length, chatMutation.isPending, sessionId, isLoadingMessages, sessionMessages]);

  // Reset initialization when client changes
  useEffect(() => {
    setHasInitialized(false);
    setMessages([]);
    setPlanName("");
    setPlanContent("");
    setSessionId(null);
    setPlanStatus("IN_PROGRESS");
  }, [clientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoadingContext || !clientContext || isLoadingSession) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loader-context" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 gap-3 sm:gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/clients">
            <Button variant="ghost" size="icon" data-testid="button-back-to-clients">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold">AI Plan Builder</h2>
            <Separator orientation="vertical" className="hidden sm:block h-6" />
            <Select value={clientId} onValueChange={(value) => setLocation(`/coach/plan-builder/${value}`)}>
              <SelectTrigger className="w-full sm:w-64 min-h-10" data-testid="select-client">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {allClients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {planStatus === "ASSIGNED" ? (
            <Badge variant="default" className="bg-green-600 hover:bg-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Plan Assigned
            </Badge>
          ) : (
            <Badge variant="secondary">
              In Progress
            </Badge>
          )}
          <Input
            type="text"
            placeholder="Plan name (e.g., '12-Week Transformation Plan')"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            className="text-sm min-h-10 w-full sm:w-64"
            data-testid="input-plan-name"
          />
          {planStatus !== "ASSIGNED" && (
            <Button
              onClick={() => assignPlanMutation.mutate()}
              disabled={assignPlanMutation.isPending || !planContent.trim() || !planName.trim()}
              className="bg-primary hover:bg-primary/90 min-h-10"
              data-testid="button-assign-plan"
            >
              {assignPlanMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4 mr-2" />
              )}
              Assign to Client
            </Button>
          )}
        </div>
      </div>

      {isMobile ? (
        <div className="flex flex-col flex-1 gap-3 min-h-0">
          <Card className="flex flex-col flex-1 min-h-0">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4" />
                AI Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 min-h-0 pb-4">
              <ScrollArea className="flex-1 mb-4">
                <div className="space-y-3 pr-4">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="font-medium text-sm">Chat with AI to generate plan content</p>
                      <p className="text-xs mt-2">Ask questions, request sections, or get suggestions</p>
                    </div>
                  )}
                  {messages.map((message, idx) => (
                    <div key={idx} className="space-y-2">
                      <div
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[90%] rounded-lg p-3 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                          data-testid={`message-${message.role}-${idx}`}
                        >
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {chatMutation.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="flex gap-2 flex-shrink-0">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask AI to create plan sections..."
                  className="flex-1 min-h-10 text-base"
                  rows={2}
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={chatMutation.isPending || !input.trim()}
                  size="icon"
                  className="h-auto min-h-10 self-end"
                  data-testid="button-send"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-shrink-0">
            <CardContent className="py-4 px-4">
              <div className="flex items-center gap-3 text-muted-foreground mb-3">
                <Monitor className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm" data-testid="text-mobile-canvas-notice">
                  Canvas view is not supported on mobile yet. Please use a desktop to build or edit plans.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSavePlan}
                    disabled={isSaving || !planContent.trim() || !planName.trim()}
                    className="flex-1 min-h-9"
                    data-testid="button-download-pdf-mobile"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isSaving ? "Generating..." : "Download PDF"}
                  </Button>
                  {planStatus === "ASSIGNED" ? (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-600 min-h-9 px-3 flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Assigned
                    </Badge>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => assignPlanMutation.mutate()}
                      disabled={assignPlanMutation.isPending || !planContent.trim() || !planName.trim()}
                      className="flex-1 min-h-9"
                      data-testid="button-assign-to-client-mobile"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      {assignPlanMutation.isPending ? "Assigning..." : "Assign"}
                    </Button>
                  )}
                </div>
                {!planContent.trim() && (
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Chat with AI to generate plan content first
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row flex-1 gap-3 sm:gap-4 min-h-0 overflow-hidden">
          <Card className="flex-1 lg:flex-[0.8] flex flex-col min-h-[300px] lg:min-h-0">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4" />
                AI Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 min-h-0">
              <ScrollArea className="flex-1 mb-4">
                <div className="space-y-3 pr-4">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">Chat with AI to generate plan content</p>
                      <p className="text-sm mt-2">Ask questions, request sections, or get suggestions</p>
                    </div>
                  )}
                  {messages.map((message, idx) => (
                    <div key={idx} className="space-y-2">
                      <div
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg p-3 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                          data-testid={`message-${message.role}-${idx}`}
                        >
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                        </div>
                      </div>
                      {message.role === "assistant" && (
                        <div className="flex justify-start">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddToCanvas(message.content)}
                            className="ml-2 min-h-8"
                            data-testid={`button-add-to-canvas-${idx}`}
                          >
                            <ArrowLeft className="w-3 h-3 mr-1 rotate-180" />
                            Add to Canvas
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {chatMutation.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask AI to create plan sections..."
                  className="flex-1 min-h-10"
                  rows={2}
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={chatMutation.isPending || !input.trim()}
                  size="icon"
                  className="h-full min-h-10"
                  data-testid="button-send"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className={`flex-1 lg:flex-[1.2] flex flex-col ${isCanvasExpanded ? 'fixed inset-2 sm:inset-4 z-50' : ''}`}>
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="w-4 h-4" />
                    Plan Canvas
                  </CardTitle>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsCanvasExpanded(!isCanvasExpanded)}
                      className="h-8 w-8"
                      data-testid="button-toggle-canvas-expand"
                    >
                      {isCanvasExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSavePlan}
                      disabled={isSaving || !planContent.trim() || !planName.trim()}
                      className="min-h-8"
                      data-testid="button-download-pdf"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isSaving ? "Generating..." : "Download PDF"}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="text"
                    placeholder="Plan filename"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="text-sm min-h-10 w-full sm:w-48"
                    data-testid="input-canvas-filename"
                  />
                  <Select onValueChange={(value) => {
                    const template = SECTION_TEMPLATES.find(t => t.heading === value);
                    if (template) handleAddSection(template);
                  }}>
                    <SelectTrigger className="w-full sm:w-40 min-h-10 text-sm">
                      <SelectValue placeholder="Add section..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTION_TEMPLATES.map((template) => (
                        <SelectItem key={template.heading} value={template.heading}>
                          {template.heading}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col">
              {!planContent.trim() ? (
                <div className="text-center text-muted-foreground py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Your plan canvas is empty</p>
                  <p className="text-sm mt-2">Chat with AI and click "Add to Canvas" to start building</p>
                  <p className="text-sm mt-1">Or use the dropdown above to add pre-structured sections</p>
                </div>
              ) : (
                <Textarea
                  ref={canvasTextareaRef}
                  value={planContent}
                  onChange={(e) => setPlanContent(e.target.value)}
                  className={`flex-1 text-sm resize-none border focus-visible:ring-1 font-mono leading-relaxed ${
                    isCanvasExpanded ? 'min-h-[calc(100vh-200px)]' : 'min-h-[200px] sm:min-h-[400px]'
                  }`}
                  placeholder="Your plan content will appear here..."
                  data-testid="textarea-plan-canvas"
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
