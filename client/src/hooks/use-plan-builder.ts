import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PlanSession, PlanMessage } from "@shared/schema";
import { getGoalTypeLabel } from "@shared/schema";

interface Message {
  id?: string;
  role: "user" | "assistant";
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
  goals?: any[];
  recent_nutrition?: any[];
  recent_workouts?: any[];
  questionnaire_data?: any[];
}

interface PlanBuilderState {
  messages: Message[];
  input: string;
  planName: string;
  planContent: string;
  planStatus: string;
  isSaving: boolean;
  isAssigning: boolean;
  hasInitialized: boolean;
  isCanvasExpanded: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  canvasTextareaRef: React.RefObject<HTMLTextAreaElement>;
  clientContext: ClientContext | undefined;
  isLoadingContext: boolean;
  isLoadingSession: boolean;
  sessionId: string | null;
  chatMutation: any;
  savePlanMutation: any;
  generatePDFMutation: any;
  sharePlanMutation: any;
  assignPlanMutation: any;
  setInput: (value: string) => void;
  setPlanName: (value: string) => void;
  setPlanContent: (value: string) => void;
  setIsCanvasExpanded: (value: boolean) => void;
  handleSendMessage: () => void;
  handleAddToCanvas: (content: string) => void;
  handleAddSection: (template: { heading: string; content: string }) => void;
  handleSavePlan: () => Promise<void>;
  handleSaveAndShare: () => Promise<void>;
  handleAssignToClient: () => Promise<void>;
}

export function usePlanBuilder(clientId: string | undefined): PlanBuilderState {
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [planName, setPlanName] = useState("");
  const [planContent, setPlanContent] = useState("");
  const [planStatus, setPlanStatus] = useState<string>("IN_PROGRESS");
  const [isSaving, setIsSaving] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const canvasTextareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: clientContext, isLoading: isLoadingContext } = useQuery<ClientContext>({
    queryKey: ["/api/clients", clientId, "context"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/clients/${clientId}/context`);
      return response.json();
    },
    enabled: !!clientId,
  });

  // Fetch or create plan session for this client
  const { data: planSession, isLoading: isLoadingSession } = useQuery<PlanSession | null>({
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
    staleTime: 0, // Always refetch
    refetchOnMount: true,
  });

  // Use planSession.id directly instead of waiting for useEffect
  const activeSessionId = planSession?.id || null;

  // Load messages for the session
  const { data: sessionMessages, isLoading: isLoadingMessages } = useQuery<PlanMessage[]>({
    queryKey: ["/api/plan-sessions", activeSessionId, "messages"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/plan-sessions/${activeSessionId}/messages`);
      return response.json();
    },
    enabled: !!activeSessionId,
    staleTime: 0, // Always refetch
    refetchOnMount: true,
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

  // Use activeSessionId for all operations
  const effectiveSessionId = activeSessionId;

  // Load messages from database when sessionMessages changes
  useEffect(() => {
    if (sessionMessages && sessionMessages.length > 0) {
      const loadedMessages: Message[] = sessionMessages.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      setMessages(loadedMessages);
      setHasInitialized(true); // Don't auto-generate if we have history
    }
  }, [sessionMessages]);

  // Mutation to update session (canvas content, status, etc.)
  const updateSessionMutation = useMutation({
    mutationFn: async (data: Partial<PlanSession>) => {
      if (!effectiveSessionId) throw new Error("No session");
      const response = await apiRequest("PATCH", `/api/plan-sessions/${effectiveSessionId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plan-sessions/client", clientId] });
    },
  });

  // Auto-save canvas content when it changes (debounced)
  useEffect(() => {
    if (!effectiveSessionId || !planContent) return;
    
    const timer = setTimeout(() => {
      updateSessionMutation.mutate({ canvasContent: planContent });
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [planContent, effectiveSessionId]);

  // Save plan name when it changes
  useEffect(() => {
    if (!effectiveSessionId || !planName) return;
    
    const timer = setTimeout(() => {
      updateSessionMutation.mutate({ planName });
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [planName, effectiveSessionId]);

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      if (!clientContext || !clientContext.client) {
        throw new Error("Client context not loaded");
      }

      if (!effectiveSessionId) {
        throw new Error("Session not ready. Please wait...");
      }

      const userMsg = { role: "user" as const, content: userMessage };
      const currentClientId = clientId;
      const currentSessionId = effectiveSessionId;
      
      // Optimistic update: Add user message immediately to UI
      setMessages(prev => [...prev, userMsg]);
      setInput("");

      // Save user message to database
      await apiRequest("POST", `/api/plan-sessions/${currentSessionId}/messages`, {
        sessionId: currentSessionId,
        role: "user",
        content: userMessage,
      });

      const newMessages = [...messages, userMsg];
      const response = await apiRequest("POST", "/api/plans/chat", {
        messages: newMessages,
        clientContext,
      });
      const data = await response.json();
      
      // Save AI response to database
      if (data.message) {
        await apiRequest("POST", `/api/plan-sessions/${currentSessionId}/messages`, {
          sessionId: currentSessionId,
          role: data.message.role,
          content: data.message.content,
        });
      }
      
      return { userMsg, aiMessage: data.message, requestClientId: currentClientId };
    },
    onMutate: (userMessage) => {
      return { requestClientId: clientId, userMessage };
    },
    onSuccess: (data) => {
      if (data.requestClientId !== clientId) {
        return;
      }

      setMessages(prev => {
        const hasUserMessage = prev.some(m => m.role === "user" && m.content === data.userMsg.content);
        const withUser = hasUserMessage ? prev : [...prev, data.userMsg];
        return data.aiMessage ? [...withUser, data.aiMessage] : withUser;
      });
    },
    onError: (error: Error, _variables, context) => {
      if (context?.requestClientId !== clientId) {
        return;
      }

      if (context?.userMessage) {
        setMessages(prev => prev.filter((m, idx, arr) => {
          const isLastMatch = m.role === "user" && m.content === context.userMessage && idx === arr.length - 1;
          return !isLastMatch;
        }));
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
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
        sessionId: effectiveSessionId,
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
      const response = await fetch(`/api/client-plans/${planId}/generate-pdf`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "PDF generated successfully!",
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

  const sharePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      await apiRequest("POST", `/api/client-plans/${planId}/share`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Plan shared with client successfully!",
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

  const assignPlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      // First update the plan session status to ASSIGNED
      if (effectiveSessionId) {
        await apiRequest("PATCH", `/api/plan-sessions/${effectiveSessionId}`, {
          status: "ASSIGNED",
          assignedAt: new Date().toISOString(),
        });
      }

      const response = await apiRequest("POST", `/api/client-plans/${planId}/assign`, {
        message: "Your coach has assigned you a new wellness plan. Review it and let them know if you have any questions!",
      });
      return response.json();
    },
    onSuccess: () => {
      setPlanStatus("ASSIGNED");
      queryClient.invalidateQueries({ queryKey: ["/api/client-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plan-sessions/client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/plan-sessions"] });
      toast({
        title: "Success",
        description: "Plan assigned to client successfully! Email notification sent.",
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

  const handleSendMessage = () => {
    if (!input.trim() || chatMutation.isPending) return;
    if (!effectiveSessionId) {
      toast({
        title: "Please wait",
        description: "Session is loading...",
      });
      return;
    }
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
    
    const timeoutId = setTimeout(() => {
      if (canvasTextareaRef.current) {
        canvasTextareaRef.current.scrollTop = canvasTextareaRef.current.scrollHeight;
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  };

  const handleAddSection = (template: { heading: string; content: string }) => {
    const sectionText = `### ${template.heading}\n\n${template.content}`;
    setPlanContent(prev => {
      if (!prev.trim()) {
        return sectionText;
      }
      return prev + "\n\n" + sectionText;
    });
    
    const timeoutId = setTimeout(() => {
      if (canvasTextareaRef.current) {
        canvasTextareaRef.current.scrollTop = canvasTextareaRef.current.scrollHeight;
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
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

  const handleAssignToClient = async () => {
    setIsAssigning(true);
    try {
      if (!planName.trim()) {
        throw new Error("Please enter a plan name");
      }
      
      if (!planContent.trim()) {
        throw new Error("Please add content to your plan");
      }

      const plan = await savePlanMutation.mutateAsync();
      if (plan?.id) {
        await assignPlanMutation.mutateAsync(plan.id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign plan",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const generateInitialPrompt = (context: ClientContext): string => {
    const { client, goals, recent_nutrition, recent_workouts } = context;
    
    let prompt = `Create a comprehensive wellness plan for ${client.name}.

**Client Profile:**`;

    if (client.sex || client.age) {
      prompt += `\n- Demographics: `;
      const demo = [];
      if (client.sex) demo.push(client.sex);
      if (client.age) demo.push(`${client.age} years old`);
      prompt += demo.join(', ');
    }

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

    if (client.goal) {
      prompt += `\n- Primary Goal: ${getGoalTypeLabel(client.goal)}`;
      if (client.goalDescription) {
        prompt += ` - ${client.goalDescription}`;
      }
      
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

    if (goals && goals.length > 0) {
      const activeGoals = goals.filter((g: any) => g.status === 'active');
      if (activeGoals.length > 0) {
        prompt += `\n\n**Active Goals:**`;
        activeGoals.forEach((g: any) => {
          prompt += `\n- ${getGoalTypeLabel(g.goalType)}: `;
          if (g.currentValue && g.targetValue) {
            prompt += `Current ${g.currentValue} → Target ${g.targetValue}`;
          } else if (g.targetValue) {
            prompt += `Target ${g.targetValue}`;
          }
          if (g.deadline) {
            prompt += ` (by ${new Date(g.deadline).toLocaleDateString()})`;
          }
        });
      }
    }

    if (recent_nutrition && recent_nutrition.length > 0) {
      prompt += `\n\n**Recent Nutrition (avg):**`;
      const avgCalories = recent_nutrition.reduce((sum: number, n: any) => sum + (n.calories || 0), 0) / recent_nutrition.length;
      const avgProtein = recent_nutrition.reduce((sum: number, n: any) => sum + (n.protein || 0), 0) / recent_nutrition.length;
      prompt += `\n${Math.round(avgCalories)} cal/day, ${Math.round(avgProtein)}g protein`;
    }

    if (recent_workouts && recent_workouts.length > 0) {
      prompt += `\n\n**Recent Workouts:**`;
      recent_workouts.slice(0, 3).forEach((w: any) => {
        prompt += `\n- ${w.type || 'Workout'}: ${w.duration || 30} min`;
      });
    }

    prompt += `\n\n---

Please create a personalized wellness plan with:
1. Short Summary
2. Key Goals (specific, measurable)
3. Weekly Structure
4. Movement & Activity Habits
5. Nutrition Habits
6. Sleep & Recovery
7. Stress Management
8. Weekly Checkpoints`;

    return prompt;
  };

  // Auto-generate and send initial prompt when context loads (only if no existing messages)
  useEffect(() => {
    if (
      clientContext && 
      clientContext.client && 
      !hasInitialized && 
      messages.length === 0 && 
      !chatMutation.isPending &&
      effectiveSessionId && 
      !isLoadingMessages &&
      (!sessionMessages || sessionMessages.length === 0)
    ) {
      const initialPrompt = generateInitialPrompt(clientContext);
      setHasInitialized(true);
      chatMutation.mutate(initialPrompt);
    }
  }, [clientContext, hasInitialized, messages.length, chatMutation.isPending, effectiveSessionId, isLoadingMessages, sessionMessages]);

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

  return {
    messages,
    input,
    planName,
    planContent,
    planStatus,
    isSaving,
    isAssigning,
    hasInitialized,
    isCanvasExpanded,
    messagesEndRef,
    canvasTextareaRef,
    clientContext,
    isLoadingContext,
    isLoadingSession,
    sessionId,
    chatMutation,
    savePlanMutation,
    generatePDFMutation,
    sharePlanMutation,
    assignPlanMutation,
    setInput,
    setPlanName,
    setPlanContent,
    setIsCanvasExpanded,
    handleSendMessage,
    handleAddToCanvas,
    handleAddSection,
    handleSavePlan,
    handleSaveAndShare,
    handleAssignToClient,
  };
}
