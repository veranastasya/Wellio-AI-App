import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ClipboardList, Apple, Dumbbell, Scale, History, Trash2, Loader2, Plus } from "lucide-react";
import { z } from "zod";
import type { Client, ClientDataLog } from "@shared/schema";
import { format, parseISO } from "date-fns";

const nutritionFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  calories: z.number().nullable().optional(),
  protein: z.number().nullable().optional(),
  carbs: z.number().nullable().optional(),
  fats: z.number().nullable().optional(),
  notes: z.string().optional(),
});

const workoutFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  workoutType: z.string().min(1, "Workout type is required"),
  duration: z.number().nullable().optional(),
  intensity: z.string().nullable().optional(),
  notes: z.string().optional(),
});

const checkinFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  weight: z.number().nullable().optional(),
  bodyFat: z.number().nullable().optional(),
  notes: z.string().optional(),
});

type NutritionFormData = z.infer<typeof nutritionFormSchema>;
type WorkoutFormData = z.infer<typeof workoutFormSchema>;
type CheckInFormData = z.infer<typeof checkinFormSchema>;

export default function ClientProgress() {
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [activeTab, setActiveTab] = useState("nutrition");
  const { toast } = useToast();

  useEffect(() => {
    const clientId = localStorage.getItem("clientId");
    if (!clientId) {
      setLocation("/client/login");
      return;
    }

    loadClient();
  }, []);

  const loadClient = async () => {
    try {
      const response = await apiRequest("GET", "/api/client-auth/me");
      const data = await response.json();
      
      if (!data.client) {
        localStorage.removeItem("clientId");
        localStorage.removeItem("clientEmail");
        setLocation("/client/login");
        return;
      }

      setClientData(data.client);
    } catch (error) {
      localStorage.removeItem("clientId");
      localStorage.removeItem("clientEmail");
      setLocation("/client/login");
    } finally {
      setIsVerifying(false);
    }
  };

  const { data: clientLogs, isLoading: logsLoading } = useQuery<ClientDataLog[]>({
    queryKey: ["/api/client-data-logs", clientData?.id],
    enabled: !!clientData?.id,
  });

  const nutritionForm = useForm<NutritionFormData>({
    resolver: zodResolver(nutritionFormSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      calories: null,
      protein: null,
      carbs: null,
      fats: null,
      notes: "",
    },
  });

  const workoutForm = useForm<WorkoutFormData>({
    resolver: zodResolver(workoutFormSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      workoutType: "strength",
      duration: null,
      intensity: "moderate",
      notes: "",
    },
  });

  const checkInForm = useForm<CheckInFormData>({
    resolver: zodResolver(checkinFormSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      weight: null,
      bodyFat: null,
      notes: "",
    },
  });

  const createLogMutation = useMutation({
    mutationFn: (data: { type: string; date: string; payload: Record<string, unknown> }) => 
      apiRequest("POST", "/api/client-data-logs", {
        clientId: clientData?.id,
        type: data.type,
        date: data.date,
        payload: data.payload,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-data-logs", clientData?.id] });
      toast({
        title: "Logged!",
        description: `${variables.type.charAt(0).toUpperCase() + variables.type.slice(1)} entry saved`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save entry",
        variant: "destructive",
      });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: (logId: string) => 
      apiRequest("DELETE", `/api/client-data-logs/${logId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-data-logs", clientData?.id] });
      toast({
        title: "Deleted",
        description: "Entry removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    },
  });

  const onNutritionSubmit = (data: NutritionFormData) => {
    createLogMutation.mutate({
      type: "nutrition",
      date: data.date,
      payload: {
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fats: data.fats,
        notes: data.notes,
      },
    });
    nutritionForm.reset({
      date: new Date().toISOString().split('T')[0],
      calories: null,
      protein: null,
      carbs: null,
      fats: null,
      notes: "",
    });
  };

  const onWorkoutSubmit = (data: WorkoutFormData) => {
    createLogMutation.mutate({
      type: "workout",
      date: data.date,
      payload: {
        workoutType: data.workoutType,
        duration: data.duration,
        intensity: data.intensity,
        notes: data.notes,
      },
    });
    workoutForm.reset({
      date: new Date().toISOString().split('T')[0],
      workoutType: "strength",
      duration: null,
      intensity: "moderate",
      notes: "",
    });
  };

  const onCheckInSubmit = (data: CheckInFormData) => {
    createLogMutation.mutate({
      type: "checkin",
      date: data.date,
      payload: {
        weight: data.weight,
        bodyFat: data.bodyFat,
        notes: data.notes,
      },
    });
    checkInForm.reset({
      date: new Date().toISOString().split('T')[0],
      weight: null,
      bodyFat: null,
      notes: "",
    });
  };

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case "nutrition": return <Apple className="w-4 h-4" />;
      case "workout": return <Dumbbell className="w-4 h-4" />;
      case "checkin": return <Scale className="w-4 h-4" />;
      default: return <ClipboardList className="w-4 h-4" />;
    }
  };

  const getLogTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "nutrition": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "workout": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "checkin": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default: return "";
    }
  };

  const formatPayload = (type: string, payload: Record<string, unknown>) => {
    const parts: string[] = [];
    if (type === "nutrition") {
      if (payload.calories) parts.push(`${payload.calories} cal`);
      if (payload.protein) parts.push(`${payload.protein}g protein`);
      if (payload.carbs) parts.push(`${payload.carbs}g carbs`);
      if (payload.fats) parts.push(`${payload.fats}g fats`);
    } else if (type === "workout") {
      if (payload.workoutType) parts.push(String(payload.workoutType).charAt(0).toUpperCase() + String(payload.workoutType).slice(1));
      if (payload.duration) parts.push(`${payload.duration} min`);
      if (payload.intensity) parts.push(String(payload.intensity).charAt(0).toUpperCase() + String(payload.intensity).slice(1));
    } else if (type === "checkin") {
      if (payload.weight) parts.push(`${payload.weight} lbs`);
      if (payload.bodyFat) parts.push(`${payload.bodyFat}% body fat`);
    }
    return parts.length > 0 ? parts.join(" • ") : "No data recorded";
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientData) {
    return null;
  }

  const filteredLogs = clientLogs || [];
  const nutritionLogs = filteredLogs.filter(log => log.type === "nutrition");
  const workoutLogs = filteredLogs.filter(log => log.type === "workout");
  const checkinLogs = filteredLogs.filter(log => log.type === "checkin");

  const renderLogHistory = (logs: ClientDataLog[], type: string) => {
    if (logs.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No {type} entries yet</p>
          <p className="text-xs mt-1">Start tracking to see your progress!</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {logs.slice(0, 15).map((log) => (
          <div 
            key={log.id} 
            className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover-elevate transition-all duration-150"
            data-testid={`log-item-${log.id}`}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 mt-0.5">
                {getLogTypeIcon(log.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-medium text-foreground">
                    {format(parseISO(log.date), "MMM d, yyyy")}
                  </span>
                  <Badge variant="outline" className={`text-xs ${getLogTypeBadgeVariant(log.type)}`}>
                    {log.source === "client" ? "You" : "Coach"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatPayload(log.type, log.payload as Record<string, unknown>)}
                </p>
                {(() => {
                  const notes = (log.payload as Record<string, unknown>).notes;
                  return notes ? (
                    <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
                      "{String(notes)}"
                    </p>
                  ) : null;
                })()}
              </div>
            </div>
            {log.source === "client" && (
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 opacity-50 hover:opacity-100"
                onClick={() => deleteLogMutation.mutate(log.id)}
                disabled={deleteLogMutation.isPending}
                data-testid={`button-delete-log-${log.id}`}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="heading-client-progress">
              Track Progress
            </h1>
            <p className="text-sm text-muted-foreground">
              Log your nutrition, workouts, and body metrics
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-1">
            <TabsTrigger value="nutrition" data-testid="tab-nutrition" className="text-xs sm:text-sm">
              <Apple className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nutrition</span>
              <span className="sm:hidden">Food</span>
            </TabsTrigger>
            <TabsTrigger value="workout" data-testid="tab-workout" className="text-xs sm:text-sm">
              <Dumbbell className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Workout</span>
              <span className="sm:hidden">Train</span>
            </TabsTrigger>
            <TabsTrigger value="checkin" data-testid="tab-checkin" className="text-xs sm:text-sm">
              <Scale className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Check-in</span>
              <span className="sm:hidden">Body</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nutrition" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Log Nutrition
                </CardTitle>
                <CardDescription>
                  Track your daily food intake
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...nutritionForm}>
                  <form onSubmit={nutritionForm.handleSubmit(onNutritionSubmit)} className="space-y-4">
                    <FormField
                      control={nutritionForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-nutrition-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-3 grid-cols-2">
                      <FormField
                        control={nutritionForm.control}
                        name="calories"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Calories</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="2000"
                                {...field} 
                                value={field.value ?? ""}
                                onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                data-testid="input-calories" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={nutritionForm.control}
                        name="protein"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Protein (g)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="150"
                                {...field} 
                                value={field.value ?? ""}
                                onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                data-testid="input-protein" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={nutritionForm.control}
                        name="carbs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Carbs (g)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="200"
                                {...field} 
                                value={field.value ?? ""}
                                onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                data-testid="input-carbs" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={nutritionForm.control}
                        name="fats"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fats (g)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="65"
                                {...field} 
                                value={field.value ?? ""}
                                onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                data-testid="input-fats" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={nutritionForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              value={field.value || ""}
                              placeholder="How was your eating today?"
                              data-testid="input-nutrition-notes" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createLogMutation.isPending}
                      data-testid="button-save-nutrition"
                    >
                      {createLogMutation.isPending ? "Saving..." : "Log Nutrition"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Nutrition History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : (
                  renderLogHistory(nutritionLogs, "nutrition")
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workout" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Log Workout
                </CardTitle>
                <CardDescription>
                  Track your training sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...workoutForm}>
                  <form onSubmit={workoutForm.handleSubmit(onWorkoutSubmit)} className="space-y-4">
                    <FormField
                      control={workoutForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-workout-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-3 grid-cols-2">
                      <FormField
                        control={workoutForm.control}
                        name="workoutType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-workout-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="strength">Strength</SelectItem>
                                <SelectItem value="cardio">Cardio</SelectItem>
                                <SelectItem value="hiit">HIIT</SelectItem>
                                <SelectItem value="flexibility">Flexibility</SelectItem>
                                <SelectItem value="sports">Sports</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={workoutForm.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (min)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="45"
                                {...field} 
                                value={field.value ?? ""}
                                onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                data-testid="input-duration" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={workoutForm.control}
                      name="intensity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Intensity</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value ?? undefined}
                            value={field.value ?? undefined}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-intensity">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="moderate">Moderate</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={workoutForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              value={field.value || ""}
                              placeholder="What exercises did you do?"
                              data-testid="input-workout-notes" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createLogMutation.isPending}
                      data-testid="button-save-workout"
                    >
                      {createLogMutation.isPending ? "Saving..." : "Log Workout"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Workout History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : (
                  renderLogHistory(workoutLogs, "workout")
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkin" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Body Check-in
                </CardTitle>
                <CardDescription>
                  Track your body metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...checkInForm}>
                  <form onSubmit={checkInForm.handleSubmit(onCheckInSubmit)} className="space-y-4">
                    <FormField
                      control={checkInForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-checkin-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-3 grid-cols-2">
                      <FormField
                        control={checkInForm.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight (lbs)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                placeholder="165.0"
                                {...field} 
                                value={field.value ?? ""}
                                onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                data-testid="input-weight" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={checkInForm.control}
                        name="bodyFat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Body Fat (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                placeholder="18.0"
                                {...field} 
                                value={field.value ?? ""}
                                onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                data-testid="input-bodyfat" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={checkInForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              value={field.value || ""}
                              placeholder="How are you feeling today?"
                              data-testid="input-checkin-notes" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createLogMutation.isPending}
                      data-testid="button-save-checkin"
                    >
                      {createLogMutation.isPending ? "Saving..." : "Log Check-in"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Check-in History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : (
                  renderLogHistory(checkinLogs, "check-in")
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
