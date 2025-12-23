import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Send, 
  Loader2, 
  Scale, 
  Apple, 
  Dumbbell, 
  Moon, 
  Droplets,
  Smile,
  Bot,
  User,
  Sparkles,
  ImageIcon,
  X,
  Pencil,
  Paperclip
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { SmartLog, AIClassification, AIParsedData, ParsedNutrition, ParsedWorkout, ParsedWeight, ParsedSleep, ParsedMood, SupportedLanguage } from "@shared/schema";
import { AI_TRACKER_TRANSLATIONS, getQuickActionPrompt } from "@shared/schema";
import { format, parseISO } from "date-fns";

const quickActionIcons = {
  workout: Dumbbell,
  meal: Apple,
  weight: Scale,
  sleep: Moon,
  water: Droplets,
  mood: Smile,
} as const;

type QuickActionId = keyof typeof quickActionIcons;

function getQuickActions(lang: SupportedLanguage, sex?: string | null) {
  const actionIds: QuickActionId[] = ["workout", "meal", "weight", "sleep", "water", "mood"];
  return actionIds.map(id => ({
    id,
    label: AI_TRACKER_TRANSLATIONS.quickActionLabels[id][lang],
    icon: quickActionIcons[id],
    prompt: getQuickActionPrompt(id, lang, sex),
  }));
}

function getEventIcon(eventType: string) {
  switch (eventType) {
    case "weight": return Scale;
    case "nutrition": return Apple;
    case "workout": return Dumbbell;
    case "sleep": return Moon;
    case "checkin_mood": return Smile;
    default: return Sparkles;
  }
}

function getEventColor(eventType: string): string {
  switch (eventType) {
    case "weight": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "nutrition": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "workout": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "sleep": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "checkin_mood": return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400";
    default: return "bg-muted text-muted-foreground";
  }
}

function getEventLabel(eventType: string, lang: SupportedLanguage = "en"): string {
  const labels = AI_TRACKER_TRANSLATIONS.eventLabels;
  switch (eventType) {
    case "weight": return labels.weight[lang];
    case "nutrition": return labels.nutrition[lang];
    case "workout": return labels.workout[lang];
    case "sleep": return labels.sleep[lang];
    case "checkin_mood": return labels.checkin_mood[lang];
    default: return labels.default[lang];
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ParsedDataDisplay({ parsedData, lang = "en" }: { parsedData: AIParsedData | null; lang?: SupportedLanguage }) {
  if (!parsedData) return null;

  const { nutrition, workout, weight, sleep, mood } = parsedData;
  const nutLabels = AI_TRACKER_TRANSLATIONS.nutritionLabels;

  return (
    <div className="mt-3 space-y-2">
      {nutrition && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm">
          {nutrition.food_description && (
            <p className="font-medium text-green-800 dark:text-green-300 mb-2">
              {nutrition.food_description}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(nutrition.calories ?? nutrition.calories_est) && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">{nutLabels.calories[lang]}:</span>
                <span className="font-medium text-foreground">
                  ~{Math.round(nutrition.calories ?? nutrition.calories_est ?? 0)} kcal
                </span>
              </div>
            )}
            {(nutrition.protein_g ?? nutrition.protein_est_g) && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">{nutLabels.protein[lang]}:</span>
                <span className="font-medium text-foreground">
                  ~{Math.round(nutrition.protein_g ?? nutrition.protein_est_g ?? 0)}g
                </span>
              </div>
            )}
            {(nutrition.carbs_g ?? nutrition.carbs_est_g) && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">{nutLabels.carbs[lang]}:</span>
                <span className="font-medium text-foreground">
                  ~{Math.round(nutrition.carbs_g ?? nutrition.carbs_est_g ?? 0)}g
                </span>
              </div>
            )}
            {(nutrition.fat_g ?? nutrition.fat_est_g) && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">{nutLabels.fat[lang]}:</span>
                <span className="font-medium text-foreground">
                  ~{Math.round(nutrition.fat_g ?? nutrition.fat_est_g ?? 0)}g
                </span>
              </div>
            )}
          </div>
          {nutrition.estimated && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              {nutLabels.estimated[lang]}
            </p>
          )}
        </div>
      )}

      {workout && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-sm">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="font-medium text-orange-800 dark:text-orange-300 capitalize">
              {workout.type}
            </span>
            {workout.duration_min && (
              <span className="text-muted-foreground">
                {workout.duration_min} {AI_TRACKER_TRANSLATIONS.min[lang]}
              </span>
            )}
            {workout.intensity !== "unknown" && (
              <span className="text-muted-foreground capitalize">
                {AI_TRACKER_TRANSLATIONS.workoutLabels.intensity[lang]}: {workout.intensity}
              </span>
            )}
          </div>
          {workout.body_focus && workout.body_focus.length > 0 && workout.body_focus[0] !== "unspecified" && (
            <p className="text-xs text-muted-foreground mt-1">
              {workout.body_focus.join(", ")}
            </p>
          )}
          {workout.notes && (
            <p className="text-xs text-foreground mt-1">{workout.notes}</p>
          )}
        </div>
      )}

      {weight && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-300">
            {AI_TRACKER_TRANSLATIONS.weightLabels.weight[lang]}: {weight.value} {weight.unit}
          </p>
        </div>
      )}

      {sleep && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-sm">
          <p className="font-medium text-indigo-800 dark:text-indigo-300">
            {AI_TRACKER_TRANSLATIONS.sleepLabels.quality[lang]}: {sleep.hours} {AI_TRACKER_TRANSLATIONS.sleepLabels.hours[lang]}
            {sleep.quality && ` (${sleep.quality})`}
          </p>
        </div>
      )}

      {mood && (
        <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3 text-sm">
          <p className="font-medium text-pink-800 dark:text-pink-300">
            {AI_TRACKER_TRANSLATIONS.moodLabels.rating[lang]}: {mood.rating}/10
            {mood.notes && ` - ${mood.notes}`}
          </p>
        </div>
      )}
    </div>
  );
}

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
}

function ImagePreview({ image, onRemove }: { image: PendingImage; onRemove: () => void }) {
  return (
    <div className="relative inline-block">
      <img
        src={image.previewUrl}
        alt="Preview"
        className="w-16 h-16 rounded-lg object-cover border"
      />
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full shadow-md"
        onClick={onRemove}
        data-testid={`button-remove-image-${image.id}`}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

function LogImage({ url }: { url: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/attachments/download-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectPath: url }),
        });

        if (!response.ok) {
          throw new Error("Failed to load image");
        }

        const data = await response.json();
        setSignedUrl(data.signedUrl);
      } catch (err) {
        setError("Failed to load");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [url]);

  if (isLoading) {
    return (
      <div className="w-40 h-40 rounded-lg bg-white/10 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-white/70" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="w-40 h-40 rounded-lg bg-white/10 flex items-center justify-center">
        <ImageIcon className="w-5 h-5 text-white/50" />
      </div>
    );
  }

  return (
    <a href={signedUrl} target="_blank" rel="noopener noreferrer">
      <img
        src={signedUrl}
        alt="Log image"
        className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
        loading="lazy"
      />
    </a>
  );
}

export default function ClientAITracker() {
  const [inputText, setInputText] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState<SupportedLanguage>("en");
  const [clientSex, setClientSex] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingLog, setEditingLog] = useState<SmartLog | null>(null);
  const [editText, setEditText] = useState("");
  const [editPendingImages, setEditPendingImages] = useState<PendingImage[]>([]);
  const [editExistingImages, setEditExistingImages] = useState<string[]>([]);
  const [isEditUploading, setIsEditUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedClientId = localStorage.getItem("clientId");
    if (storedClientId) {
      setClientId(storedClientId);
    }
    
    const fetchClientData = async () => {
      try {
        const response = await apiRequest("GET", "/api/client-auth/me");
        const data = await response.json();
        if (data.client?.preferredLanguage) {
          setPreferredLanguage(data.client.preferredLanguage as SupportedLanguage);
        }
        if (data.client?.sex) {
          setClientSex(data.client.sex);
        }
      } catch (error) {
        console.error("Failed to fetch client data:", error);
      }
    };
    fetchClientData();
  }, []);

  const { data: logs, isLoading } = useQuery<SmartLog[]>({
    queryKey: ["/api/smart-logs", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const response = await apiRequest("GET", `/api/smart-logs/${clientId}?limit=50`);
      return response.json();
    },
    enabled: !!clientId,
    refetchInterval: 5000,
  });

  const createLogMutation = useMutation({
    mutationFn: async (data: { clientId: string; rawText?: string; mediaUrls?: string[]; localDateForClient: string }) => {
      const response = await apiRequest("POST", "/api/smart-logs", data);
      return response.json();
    },
    onSuccess: () => {
      setInputText("");
      setPendingImages([]);
      queryClient.invalidateQueries({ queryKey: ["/api/smart-logs", clientId] });
      toast({
        title: AI_TRACKER_TRANSLATIONS.logged[preferredLanguage],
        description: AI_TRACKER_TRANSLATIONS.loggedDescription[preferredLanguage],
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your log. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateLogMutation = useMutation({
    mutationFn: async (data: { id: string; rawText?: string; mediaUrls?: string[] }) => {
      const response = await apiRequest("PATCH", `/api/smart-logs/${data.id}`, {
        rawText: data.rawText,
        mediaUrls: data.mediaUrls,
      });
      return response.json();
    },
    onSuccess: () => {
      setEditingLog(null);
      setEditText("");
      setEditPendingImages([]);
      setEditExistingImages([]);
      queryClient.invalidateQueries({ queryKey: ["/api/smart-logs", clientId] });
      toast({
        title: "Updated!",
        description: "Your entry is being re-analyzed by AI",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update your log. Please try again.",
        variant: "destructive",
      });
    },
  });

  const openEditModal = (log: SmartLog) => {
    setEditingLog(log);
    setEditText(log.rawText || "");
    setEditExistingImages((log.mediaUrls as string[]) || []);
    setEditPendingImages([]);
  };

  const closeEditModal = () => {
    editPendingImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setEditingLog(null);
    setEditText("");
    setEditPendingImages([]);
    setEditExistingImages([]);
  };

  const handleEditImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxFiles = 3;
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    const totalImages = editExistingImages.length + editPendingImages.length + files.length;
    if (totalImages > maxFiles) {
      toast({
        title: "Too many images",
        description: `Maximum ${maxFiles} images allowed`,
        variant: "destructive",
      });
      return;
    }

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported image format`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      const newImage: PendingImage = {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        file,
        previewUrl,
      };
      setEditPendingImages((prev) => [...prev, newImage]);
    }

    if (editImageInputRef.current) {
      editImageInputRef.current.value = "";
    }
  };

  const removeEditPendingImage = (imageId: string) => {
    setEditPendingImages((prev) => {
      const image = prev.find((img) => img.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return prev.filter((img) => img.id !== imageId);
    });
  };

  const removeEditExistingImage = (url: string) => {
    setEditExistingImages((prev) => prev.filter((u) => u !== url));
  };

  const uploadEditImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const image of editPendingImages) {
      try {
        const uploadUrlResponse = await fetch("/api/attachments/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        if (!uploadUrlResponse.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { uploadURL } = await uploadUrlResponse.json();

        const uploadResponse = await fetch(uploadURL, {
          method: "PUT",
          body: image.file,
          headers: {
            "Content-Type": image.file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image");
        }

        const objectURL = uploadURL.split("?")[0];

        const saveResponse = await fetch("/api/attachments/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objectURL,
            fileName: image.file.name,
            fileType: image.file.type,
            fileSize: image.file.size,
            clientId,
          }),
        });

        if (!saveResponse.ok) {
          throw new Error("Failed to save image metadata");
        }

        uploadedUrls.push(objectURL);
      } catch (error) {
        console.error("Image upload error:", error);
        toast({
          title: "Upload failed",
          description: `Failed to upload ${image.file.name}`,
          variant: "destructive",
        });
      }
    }

    return uploadedUrls;
  };

  const handleEditSubmit = async () => {
    if (!editingLog) return;
    
    const hasText = editText.trim().length > 0;
    const hasExistingImages = editExistingImages.length > 0;
    const hasPendingImages = editPendingImages.length > 0;
    
    if (!hasText && !hasExistingImages && !hasPendingImages) {
      toast({
        title: "Empty entry",
        description: "Please add text or images",
        variant: "destructive",
      });
      return;
    }

    setIsEditUploading(true);

    try {
      let newMediaUrls: string[] = [];
      
      if (hasPendingImages) {
        newMediaUrls = await uploadEditImages();
      }

      const allMediaUrls = [...editExistingImages, ...newMediaUrls];

      updateLogMutation.mutate({
        id: editingLog.id,
        rawText: hasText ? editText.trim() : undefined,
        mediaUrls: allMediaUrls.length > 0 ? allMediaUrls : undefined,
      });
    } catch (error) {
      console.error("Edit submit error:", error);
      toast({
        title: "Error",
        description: "Failed to update. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEditUploading(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxFiles = 3;
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (pendingImages.length + files.length > maxFiles) {
      toast({
        title: "Too many images",
        description: `Maximum ${maxFiles} images allowed`,
        variant: "destructive",
      });
      return;
    }

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported image format`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      const newImage: PendingImage = {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        file,
        previewUrl,
      };
      setPendingImages((prev) => [...prev, newImage]);
    }

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const removeImage = (imageId: string) => {
    setPendingImages((prev) => {
      const image = prev.find((img) => img.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return prev.filter((img) => img.id !== imageId);
    });
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const image of pendingImages) {
      try {
        // Step 1: Get upload URL from backend
        const uploadUrlResponse = await fetch("/api/attachments/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        if (!uploadUrlResponse.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { uploadURL } = await uploadUrlResponse.json();

        // Step 2: Upload file directly to cloud storage
        const uploadResponse = await fetch(uploadURL, {
          method: "PUT",
          body: image.file,
          headers: {
            "Content-Type": image.file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image");
        }

        // Get the object URL (remove query params from signed URL)
        const objectURL = uploadURL.split("?")[0];

        // Step 3: Save attachment metadata
        const saveResponse = await fetch("/api/attachments/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objectURL,
            fileName: image.file.name,
            fileType: image.file.type,
            fileSize: image.file.size,
            clientId,
          }),
        });

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to save image metadata");
        }

        uploadedUrls.push(objectURL);
      } catch (error) {
        console.error("Image upload error:", error);
        toast({
          title: "Upload failed",
          description: `Failed to upload ${image.file.name}`,
          variant: "destructive",
        });
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if ((!inputText.trim() && pendingImages.length === 0) || !clientId) return;

    setIsUploading(true);
    
    try {
      let mediaUrls: string[] = [];
      
      if (pendingImages.length > 0) {
        mediaUrls = await uploadImages();
        
        // If we had images to upload but none succeeded, abort submission
        if (mediaUrls.length === 0) {
          toast({
            title: "Upload failed",
            description: "Could not upload any images. Please try again.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }
      }

      // Ensure we have either text or images before submitting
      if (!inputText.trim() && mediaUrls.length === 0) {
        setIsUploading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      
      createLogMutation.mutate({
        clientId,
        rawText: inputText.trim() || undefined,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        localDateForClient: today,
      });
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description: "Failed to submit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInputText(prompt);
    inputRef.current?.focus();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    return () => {
      pendingImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, []);

  const sortedLogs = [...(logs || [])].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const isSubmitting = createLogMutation.isPending || isUploading;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-primary/5 to-background">
      <div className="flex-shrink-0 p-4 sm:p-6 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground" data-testid="text-ai-tracker-title">
              {AI_TRACKER_TRANSLATIONS.pageTitle[preferredLanguage]}
            </h1>
            <p className="text-sm text-muted-foreground">{AI_TRACKER_TRANSLATIONS.pageSubtitle[preferredLanguage]}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">{AI_TRACKER_TRANSLATIONS.quickActions[preferredLanguage]}</p>
          <div className="flex flex-wrap gap-2">
            {getQuickActions(preferredLanguage, clientSex).map((action) => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                className="rounded-full gap-1.5 hover-elevate"
                onClick={() => handleQuickAction(action.prompt)}
                data-testid={`button-quick-${action.id}`}
              >
                <action.icon className="w-3.5 h-3.5" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {!clientId ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-3/4" />
            ))}
          </div>
        ) : sortedLogs.length === 0 ? (
          <div className="flex flex-col items-start max-w-md">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-card border rounded-2xl rounded-tl-sm p-4 shadow-sm">
                <p className="text-sm text-foreground">
                  {AI_TRACKER_TRANSLATIONS.greeting[preferredLanguage]}
                </p>
                <p className="text-sm text-foreground mt-2">
                  {AI_TRACKER_TRANSLATIONS.greetingSecondary[preferredLanguage]}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(), "HH:mm")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-start max-w-md mb-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card border rounded-2xl rounded-tl-sm p-4 shadow-sm">
                  <p className="text-sm text-foreground">
                    {AI_TRACKER_TRANSLATIONS.greeting[preferredLanguage]}
                  </p>
                  <p className="text-sm text-foreground mt-2">
                    {AI_TRACKER_TRANSLATIONS.greetingSecondary[preferredLanguage]}
                  </p>
                </div>
              </div>
            </div>

            {sortedLogs.map((log, index) => {
              const classification = log.aiClassificationJson as AIClassification | null;
              const detectedEvents = classification?.detected_event_types || [];
              const mediaUrls = log.mediaUrls as string[] | null;
              const parsedData = log.aiParsedJson as AIParsedData | null;
              
              return (
                <div key={log.id} className="space-y-3">
                  <div className="flex flex-col items-end max-w-md ml-auto group" data-testid={`log-entry-${index}`}>
                    <div className="flex gap-3 items-start">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity self-center"
                        onClick={() => openEditModal(log)}
                        data-testid={`button-edit-log-${index}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm p-4 shadow-sm">
                        {log.rawText && (
                          <p className="text-sm">{log.rawText}</p>
                        )}
                        {mediaUrls && mediaUrls.length > 0 && (
                          <div className={`flex flex-wrap gap-2 ${log.rawText ? "mt-2" : ""}`}>
                            {mediaUrls.map((url, imgIndex) => (
                              <LogImage key={imgIndex} url={url} />
                            ))}
                          </div>
                        )}
                        <p className="text-xs opacity-70 mt-2">
                          {format(parseISO(log.createdAt), "HH:mm")}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  {(detectedEvents.length > 0 || log.processingStatus === "pending" || log.processingStatus === "processing") && (
                    <div className="flex flex-col items-start max-w-md">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                        <div className="bg-card border rounded-2xl rounded-tl-sm p-4 shadow-sm">
                          {(log.processingStatus === "pending" || log.processingStatus === "processing") ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">{AI_TRACKER_TRANSLATIONS.analyzing[preferredLanguage]}</p>
                            </div>
                          ) : detectedEvents.length > 0 ? (
                            <>
                              <p className="text-sm text-foreground mb-2">
                                {AI_TRACKER_TRANSLATIONS.gotIt[preferredLanguage]}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {detectedEvents.map((eventType) => {
                                  const Icon = getEventIcon(eventType);
                                  return (
                                    <Badge 
                                      key={eventType}
                                      variant="secondary"
                                      className={`text-xs py-0.5 px-2 ${getEventColor(eventType)}`}
                                    >
                                      <Icon className="w-3 h-3 mr-1" />
                                      {getEventLabel(eventType, preferredLanguage)}
                                    </Badge>
                                  );
                                })}
                              </div>
                              <ParsedDataDisplay parsedData={parsedData} lang={preferredLanguage} />
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Telegram-style composer */}
      <div className="flex-shrink-0 border-t bg-background">
        {/* Pending images - compact chips */}
        {pendingImages.length > 0 && (
          <div className="px-4 pt-3 flex flex-wrap gap-2 max-w-3xl mx-auto">
            {pendingImages.map((image) => (
              <div
                key={image.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm"
                data-testid={`pending-image-${image.id}`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="truncate max-w-[120px]">{image.file.name}</span>
                <span className="text-xs text-muted-foreground">({formatBytes(image.file.size)})</span>
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`button-remove-image-${image.id}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={handleImageSelect}
          data-testid="input-image-upload"
        />
        
        {/* Composer row */}
        <div className="flex items-center gap-2 px-4 py-3 max-w-3xl mx-auto">
          {/* Paperclip - circular button for images */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="flex-shrink-0 rounded-full w-10 h-10 text-muted-foreground hover:text-foreground"
            onClick={() => imageInputRef.current?.click()}
            disabled={isSubmitting}
            data-testid="button-attach-image"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          
          {/* Pill input */}
          <div className="flex-1 flex items-center bg-muted/60 dark:bg-muted/40 rounded-full border border-border/50 px-4 py-2 min-h-[44px]">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={AI_TRACKER_TRANSLATIONS.placeholder[preferredLanguage]}
              disabled={isSubmitting}
              className="flex-1 bg-transparent border-0 focus:outline-none text-sm placeholder:text-muted-foreground"
              data-testid="input-smart-log"
            />
          </div>
          
          {/* Send button - circular */}
          <Button
            onClick={handleSubmit}
            disabled={(!inputText.trim() && pendingImages.length === 0) || isSubmitting}
            size="icon"
            className="flex-shrink-0 rounded-full w-10 h-10 bg-primary hover:bg-primary/90"
            data-testid="button-submit-smart-log"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <Dialog open={!!editingLog} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder={AI_TRACKER_TRANSLATIONS.placeholder[preferredLanguage]}
              className="min-h-[100px]"
              data-testid="input-edit-text"
            />
            
            {(editExistingImages.length > 0 || editPendingImages.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {editExistingImages.map((url, idx) => (
                  <div key={`existing-${idx}`} className="relative inline-block">
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full shadow-md"
                      onClick={() => removeEditExistingImage(url)}
                      data-testid={`button-remove-existing-image-${idx}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {editPendingImages.map((image) => (
                  <ImagePreview
                    key={image.id}
                    image={image}
                    onRemove={() => removeEditPendingImage(image.id)}
                  />
                ))}
              </div>
            )}
            
            <input
              ref={editImageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              className="hidden"
              onChange={handleEditImageSelect}
              data-testid="input-edit-image-upload"
            />
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => editImageInputRef.current?.click()}
              disabled={isEditUploading || updateLogMutation.isPending}
              data-testid="button-edit-add-image"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Add Image
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={isEditUploading || updateLogMutation.isPending}
              data-testid="button-edit-save"
            >
              {(isEditUploading || updateLogMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save & Re-analyze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
