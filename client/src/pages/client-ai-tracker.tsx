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
  X
} from "lucide-react";
import type { SmartLog, AIClassification } from "@shared/schema";
import { format, parseISO } from "date-fns";

const quickActions = [
  { id: "workout", label: "Workout", icon: Dumbbell, prompt: "I did a workout: " },
  { id: "meal", label: "Meal", icon: Apple, prompt: "I had a meal: " },
  { id: "weight", label: "Weight", icon: Scale, prompt: "My weight today is " },
  { id: "sleep", label: "Sleep", icon: Moon, prompt: "I slept " },
  { id: "water", label: "Water", icon: Droplets, prompt: "I drank " },
  { id: "mood", label: "Mood", icon: Smile, prompt: "Feeling " },
];

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

function getEventLabel(eventType: string): string {
  switch (eventType) {
    case "weight": return "Weight";
    case "nutrition": return "Nutrition";
    case "workout": return "Workout";
    case "sleep": return "Sleep";
    case "checkin_mood": return "Mood";
    default: return "Log";
  }
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
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedClientId = localStorage.getItem("clientId");
    if (storedClientId) {
      setClientId(storedClientId);
    }
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
        title: "Logged!",
        description: "Your entry is being processed by AI",
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
              AI Progress Tracker
            </h1>
            <p className="text-sm text-muted-foreground">Track your achievements</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
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
                  Hi! I'm your AI assistant for tracking progress. I'll help you log workouts, nutrition, weight, sleep, and other metrics.
                </p>
                <p className="text-sm text-foreground mt-2">
                  You can type a description or attach photos of your meals, workouts, or progress!
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
                    Hi! I'm your AI assistant for tracking progress. I'll help you log workouts, nutrition, weight, sleep, and other metrics.
                  </p>
                  <p className="text-sm text-foreground mt-2">
                    You can type a description or attach photos of your meals, workouts, or progress!
                  </p>
                </div>
              </div>
            </div>

            {sortedLogs.map((log, index) => {
              const classification = log.aiClassificationJson as AIClassification | null;
              const detectedEvents = classification?.detected_event_types || [];
              const mediaUrls = log.mediaUrls as string[] | null;
              
              return (
                <div key={log.id} className="space-y-3">
                  <div className="flex flex-col items-end max-w-md ml-auto" data-testid={`log-entry-${index}`}>
                    <div className="flex gap-3">
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
                              <p className="text-sm text-muted-foreground">Analyzing...</p>
                            </div>
                          ) : detectedEvents.length > 0 ? (
                            <>
                              <p className="text-sm text-foreground mb-2">
                                Got it! I detected:
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
                                      {getEventLabel(eventType)}
                                    </Badge>
                                  );
                                })}
                              </div>
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

      <div className="flex-shrink-0 p-4 border-t bg-background">
        {pendingImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 max-w-3xl mx-auto">
            {pendingImages.map((image) => (
              <ImagePreview
                key={image.id}
                image={image}
                onRemove={() => removeImage(image.id)}
              />
            ))}
          </div>
        )}
        
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={handleImageSelect}
            data-testid="input-image-upload"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full w-12 h-12 flex-shrink-0"
            onClick={() => imageInputRef.current?.click()}
            disabled={isSubmitting}
            data-testid="button-attach-image"
          >
            <ImageIcon className="w-5 h-5" />
          </Button>
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your progress..."
            className="flex-1 px-4 py-3 rounded-full border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-150"
            disabled={isSubmitting}
            data-testid="input-smart-log"
          />
          <Button
            onClick={handleSubmit}
            disabled={(!inputText.trim() && pendingImages.length === 0) || isSubmitting}
            size="icon"
            className="rounded-full w-12 h-12"
            data-testid="button-submit-smart-log"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
