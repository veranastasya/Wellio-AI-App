import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ClientContext {
  client: any;
  goals: any[];
  recent_nutrition: any[];
  recent_workouts: any[];
  questionnaire_data: any[];
}

interface PlanBuilderState {
  messages: Message[];
  input: string;
  planName: string;
  planContent: string;
  isSaving: boolean;
  isAssigning: boolean;
  hasInitialized: boolean;
  isCanvasExpanded: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  canvasTextareaRef: React.RefObject<HTMLTextAreaElement>;
  clientContext: ClientContext | undefined;
  isLoadingContext: boolean;
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
  const [isSaving, setIsSaving] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false);
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

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      if (!clientContext || !clientContext.client) {
        throw new Error("Client context not loaded");
      }

      const userMsg = { role: "user" as const, content: userMessage };
      const currentClientId = clientId;
      
      setMessages(prev => [...prev, userMsg]);
      setInput("");

      let newMessages: Message[] = [];
      setMessages(prev => {
        newMessages = [...prev];
        return prev;
      });
      
      const response = await apiRequest("POST", "/api/plans/chat", {
        messages: newMessages,
        clientContext,
      });
      const data = await response.json();
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
      const response = await apiRequest("POST", `/api/client-plans/${planId}/assign`, {
        message: "Your coach has assigned you a new wellness plan. Review it and let them know if you have any questions!",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-plans"] });
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
    const { client, goals, recent_nutrition, recent_workouts, questionnaire_data } = context;
    
    let prompt = `I need your help creating a personalized wellness plan for my client:\n\n`;
    prompt += `**Client:** ${client.name}\n`;
    prompt += `**Primary Goal:** ${client.goal || 'Not specified'}\n`;
    
    if (client.weight) {
      prompt += `**Current Weight:** ${client.weight} lbs\n`;
    }
    if (client.targetWeight) {
      prompt += `**Target Weight:** ${client.targetWeight} lbs\n`;
    }
    if (client.height) {
      prompt += `**Height:** ${client.height} inches\n`;
    }
    if (client.activityLevel) {
      prompt += `**Activity Level:** ${client.activityLevel}\n`;
    }

    if (goals && goals.length > 0) {
      prompt += `\n**Active Goals:**\n`;
      goals.forEach(g => {
        prompt += `• ${g.description} - ${g.type} (${g.status})\n`;
      });
    }

    if (questionnaire_data && questionnaire_data.length > 0) {
      prompt += `\n**Key Intake Information:**\n`;
      questionnaire_data.forEach(q => {
        const answers = q.response?.answers || [];
        const relevantAnswers = answers.slice(0, 3);
        relevantAnswers.forEach((a: any) => {
          if (a.answer) {
            prompt += `• ${a.question}: ${typeof a.answer === 'object' ? JSON.stringify(a.answer) : a.answer}\n`;
          }
        });
      });
    }

    if (recent_nutrition && recent_nutrition.length > 0) {
      prompt += `\n**Recent Nutrition (last 7 days):**\n`;
      const avgCalories = recent_nutrition.reduce((sum, n) => sum + (n.calories || 0), 0) / recent_nutrition.length;
      const avgProtein = recent_nutrition.reduce((sum, n) => sum + (n.protein || 0), 0) / recent_nutrition.length;
      prompt += `Average daily: ${Math.round(avgCalories)} calories, ${Math.round(avgProtein)}g protein\n`;
    }

    if (recent_workouts && recent_workouts.length > 0) {
      prompt += `\n**Recent Workouts:**\n`;
      recent_workouts.slice(0, 5).forEach(w => {
        prompt += `• ${w.type}: ${w.duration} min${w.notes ? ` - ${w.notes}` : ''}\n`;
      });
    }

    if (client.notes) {
      prompt += `\n\n**Coach Notes:**\n${client.notes}`;
    }

    prompt += `\n\n---\n\nBased on this comprehensive profile, please create a personalized wellness plan that addresses their goals, current fitness level, and activity patterns. Include specific recommendations for nutrition, exercise, and lifestyle adjustments.`;

    return prompt;
  };

  useEffect(() => {
    if (clientContext && clientContext.client && !hasInitialized && messages.length === 0 && !chatMutation.isPending) {
      const initialPrompt = generateInitialPrompt(clientContext);
      setHasInitialized(true);
      chatMutation.mutate(initialPrompt);
    }
  }, [clientContext, hasInitialized, messages.length]);

  useEffect(() => {
    setHasInitialized(false);
    setMessages([]);
    setPlanName("");
    setPlanContent("");
  }, [clientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return {
    messages,
    input,
    planName,
    planContent,
    isSaving,
    isAssigning,
    hasInitialized,
    isCanvasExpanded,
    messagesEndRef,
    canvasTextareaRef,
    clientContext,
    isLoadingContext,
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
