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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Save, Share2, FileText, Target, Apple, Dumbbell, Activity, User, ArrowLeft, Plus, Trash2, GripVertical, Edit3, PlusCircle, ChevronDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, Goal } from "@shared/schema";
import { getGoalTypeLabel } from "@shared/schema";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PlanSection {
  id: string;
  heading: string;
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
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [planName, setPlanName] = useState("");
  const [planSections, setPlanSections] = useState<PlanSection[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isClientContextOpen, setIsClientContextOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      if (!clientContext || !clientContext.client) {
        throw new Error("Client context not loaded");
      }

      const userMsg = { role: "user" as const, content: userMessage };
      const currentClientId = clientId;
      
      // Optimistic update: Add user message immediately to UI
      setMessages(prev => [...prev, userMsg]);
      setInput("");

      const newMessages = [...messages, userMsg];
      const response = await apiRequest("POST", "/api/plans/chat", {
        messages: newMessages,
        clientContext,
      });
      const data = await response.json();
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
      
      if (planSections.length === 0) {
        throw new Error("Please add content to your plan");
      }
      
      const response = await apiRequest("POST", "/api/client-plans", {
        clientId,
        coachId: "default-coach",
        planName: planName.trim(),
        planContent: { sections: planSections },
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
    const newSection: PlanSection = {
      id: Date.now().toString(),
      heading: "AI Response",
      content: content.trim(),
    };
    setPlanSections(prev => [...prev, newSection]);
    toast({
      title: "Added to canvas",
      description: "Content added. You can now edit it.",
    });
  };

  const handleAddSection = (template: typeof SECTION_TEMPLATES[0]) => {
    const newSection: PlanSection = {
      id: Date.now().toString(),
      heading: template.heading,
      content: template.content,
    };
    setPlanSections(prev => [...prev, newSection]);
  };

  const handleUpdateSection = (id: string, field: 'heading' | 'content', value: string) => {
    setPlanSections(prev => prev.map(section =>
      section.id === id ? { ...section, [field]: value } : section
    ));
  };

  const handleDeleteSection = (id: string) => {
    setPlanSections(prev => prev.filter(section => section.id !== id));
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

  // Auto-generate and send initial prompt when context loads
  useEffect(() => {
    if (clientContext && clientContext.client && !hasInitialized && messages.length === 0 && !chatMutation.isPending) {
      const initialPrompt = generateInitialPrompt(clientContext);
      setHasInitialized(true);
      chatMutation.mutate(initialPrompt);
    }
  }, [clientContext, hasInitialized, messages.length, chatMutation.isPending]);

  // Reset initialization when client changes
  useEffect(() => {
    setHasInitialized(false);
    setMessages([]);
    setPlanName("");
    setPlanSections([]);
  }, [clientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoadingContext || !clientContext) {
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
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="text"
            placeholder="Plan name (e.g., '12-Week Transformation Plan')"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            className="text-sm min-h-10 w-full sm:w-64"
            data-testid="input-plan-name"
          />
          <Button
            variant="outline"
            onClick={handleSavePlan}
            disabled={isSaving || planSections.length === 0}
            className="min-h-10"
            data-testid="button-save-plan"
          >
            <Save className="w-4 h-4 mr-2" />
            Save & Generate PDF
          </Button>
          <Button
            onClick={handleSaveAndShare}
            disabled={isSaving || planSections.length === 0}
            className="min-h-10"
            data-testid="button-save-share"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Save & Share
          </Button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row flex-1 gap-3 sm:gap-4 min-h-0">
        <div className="w-full xl:w-80 flex-shrink-0">
          <Collapsible open={isClientContextOpen} onOpenChange={setIsClientContextOpen}>
            <Card className="h-auto xl:h-full max-h-96 xl:max-h-none">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="w-4 h-4" />
                    Client Context
                  </CardTitle>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-toggle-client-context">
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isClientContextOpen ? "" : "-rotate-90"}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <ScrollArea className="h-[280px] xl:h-[calc(100vh-280px)]">
                    <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm mb-2">{clientContext.client.name}</h3>
                  <p className="text-xs text-muted-foreground">{clientContext.client.email}</p>
                </div>

                <Separator />

                {clientContext.goals && clientContext.goals.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4" />
                      <h4 className="font-semibold text-sm">Active Goals</h4>
                    </div>
                    <div className="space-y-2">
                      {clientContext.goals.map((goal) => (
                        <div key={goal.id} className="text-xs">
                          <Badge variant="outline" className="mb-1">
                            {getGoalTypeLabel(goal.goalType)}
                          </Badge>
                          {goal.description && (
                            <p className="text-muted-foreground">{goal.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {clientContext.recent_nutrition && clientContext.recent_nutrition.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Apple className="w-4 h-4" />
                        <h4 className="font-semibold text-sm">Recent Nutrition</h4>
                      </div>
                      <div className="space-y-2">
                        {clientContext.recent_nutrition.slice(0, 3).map((log, idx) => (
                          <div key={idx} className="text-xs">
                            <div className="font-medium">{log.date}</div>
                            <div className="text-muted-foreground">
                              {log.calories}cal • P: {log.protein}g • C: {log.carbs}g • F: {log.fats}g
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {clientContext.recent_workouts && clientContext.recent_workouts.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Dumbbell className="w-4 h-4" />
                        <h4 className="font-semibold text-sm">Recent Workouts</h4>
                      </div>
                      <div className="space-y-2">
                        {clientContext.recent_workouts.slice(0, 3).map((workout, idx) => (
                          <div key={idx} className="text-xs">
                            <div className="font-medium">{workout.date}</div>
                            <div className="text-muted-foreground">
                              {workout.type} • {workout.duration}min • {workout.intensity}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {clientContext.questionnaire_data && clientContext.questionnaire_data.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4" />
                        <h4 className="font-semibold text-sm">Questionnaire Data</h4>
                      </div>
                      <div className="space-y-2">
                        {clientContext.questionnaire_data.map((response, idx) => (
                          <div key={idx} className="text-xs">
                            <div className="font-medium">{response.questionnaire_name}</div>
                            <div className="text-muted-foreground">
                              {new Date(response.submitted_at).toLocaleDateString()}
                            </div>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              Pinned for AI
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-3 sm:gap-4 min-h-0">
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4" />
              AI Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col h-[calc(100%-60px)]">
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
                          <Plus className="w-3 h-3 mr-1" />
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

        <Card className="flex-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Edit3 className="w-4 h-4" />
                Editable Plan Canvas
              </CardTitle>
              <Select onValueChange={(value) => {
                const template = SECTION_TEMPLATES.find(t => t.heading === value);
                if (template) handleAddSection(template);
              }}>
                <SelectTrigger className="w-48 min-h-8 text-sm">
                  <SelectValue placeholder="Add section..." />
                </SelectTrigger>
                <SelectContent>
                  {SECTION_TEMPLATES.map((template) => (
                    <SelectItem key={template.heading} value={template.heading}>
                      <div className="flex items-center gap-2">
                        <PlusCircle className="w-3 h-3" />
                        {template.heading}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-320px)]">
              {planSections.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Your plan canvas is empty</p>
                  <p className="text-sm mt-2">Chat with AI and click "Add to Canvas" to start building</p>
                  <p className="text-sm mt-1">Or use the dropdown above to add pre-structured sections</p>
                </div>
              ) : (
                <div className="space-y-3 pr-4">
                  {planSections.map((section) => (
                    <Card key={section.id} className="group">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                            <Input
                              value={section.heading}
                              onChange={(e) => handleUpdateSection(section.id, 'heading', e.target.value)}
                              className="font-semibold text-sm min-h-8 border-0 focus-visible:ring-1 px-2"
                              placeholder="Section heading..."
                              data-testid={`input-section-heading-${section.id}`}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSection(section.id)}
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-delete-section-${section.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Textarea
                          value={section.content}
                          onChange={(e) => handleUpdateSection(section.id, 'content', e.target.value)}
                          className="min-h-32 text-sm resize-none border-0 focus-visible:ring-1"
                          placeholder="Add content here..."
                          data-testid={`textarea-section-content-${section.id}`}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}
