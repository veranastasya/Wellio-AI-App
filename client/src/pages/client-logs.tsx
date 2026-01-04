import { useState, useEffect } from "react";
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
import { ClipboardList, Apple, Dumbbell, Scale, Target, History, Trash2, Calendar } from "lucide-react";
import { z } from "zod";
import { DeviceConnection } from "@/components/device-connection";
import { ClientGoals } from "@/components/goals/client-goals";
import type { ClientDataLog, SupportedLanguage, Coach } from "@shared/schema";
import { COACH_UI_TRANSLATIONS } from "@shared/schema";
import { format, parseISO } from "date-fns";

interface Client {
  id: string;
  name: string;
  email: string;
  status: string;
}

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

export default function ClientLogs() {
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [lang, setLang] = useState<SupportedLanguage>("en");
  
  const t = COACH_UI_TRANSLATIONS.dataLogs;

  const { data: coachProfile } = useQuery<Coach>({
    queryKey: ["/api/coach/profile"],
  });

  useEffect(() => {
    if (coachProfile?.preferredLanguage) {
      setLang(coachProfile.preferredLanguage as SupportedLanguage);
    }
  }, [coachProfile]);

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const activeClients = clients?.filter(c => c.status === "active") || [];
  const selectedClient = activeClients.find(c => c.id === selectedClientId);

  const { data: clientLogs, isLoading: logsLoading } = useQuery<ClientDataLog[]>({
    queryKey: ["/api/client-data-logs", selectedClientId],
    enabled: !!selectedClientId,
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
        clientId: selectedClientId,
        type: data.type,
        date: data.date,
        payload: data.payload,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-data-logs", selectedClientId] });
      toast({
        title: "Success",
        description: `${variables.type.charAt(0).toUpperCase() + variables.type.slice(1)} log added successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add log",
        variant: "destructive",
      });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: (logId: string) => 
      apiRequest("DELETE", `/api/client-data-logs/${logId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-data-logs", selectedClientId] });
      toast({
        title: "Deleted",
        description: "Log entry removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete log",
        variant: "destructive",
      });
    },
  });

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
  };

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

  const filteredLogs = clientLogs || [];
  const nutritionLogs = filteredLogs.filter(log => log.type === "nutrition");
  const workoutLogs = filteredLogs.filter(log => log.type === "workout");
  const checkinLogs = filteredLogs.filter(log => log.type === "checkin");

  const renderLogHistory = (logs: ClientDataLog[], type: string) => {
    if (logs.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No {type} logs recorded yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {logs.slice(0, 10).map((log) => (
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
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">
                    {format(parseISO(log.date), "MMM d, yyyy")}
                  </span>
                  <Badge variant="outline" className={`text-xs ${getLogTypeBadgeVariant(log.type)}`}>
                    {log.source === "client" ? "Client" : "Coach"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {formatPayload(log.type, log.payload as Record<string, unknown>)}
                </p>
                {(() => {
                  const notes = (log.payload as Record<string, unknown>).notes;
                  return notes ? (
                    <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                      "{String(notes)}"
                    </p>
                  ) : null;
                })()}
              </div>
            </div>
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
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 sm:p-6 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="heading-client-logs">
              {t.title[lang]}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t.subtitle[lang]}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card data-testid="card-client-selector">
            <CardHeader>
              <CardTitle className="text-lg">{t.selectClient[lang]}</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedClientId} onValueChange={handleClientChange}>
                <SelectTrigger data-testid="select-client">
                  <SelectValue placeholder={t.selectClient[lang]} />
                </SelectTrigger>
                <SelectContent>
                  {activeClients.map((client) => (
                    <SelectItem key={client.id} value={client.id} data-testid={`client-option-${client.id}`}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedClientId && selectedClient && (
            <>
              <DeviceConnection 
                clientId={selectedClientId} 
                clientName={selectedClient.name}
                clientEmail={selectedClient.email}
              />
              
              <Tabs defaultValue="nutrition" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto p-1 bg-muted rounded-lg">
                <TabsTrigger value="nutrition" data-testid="tab-nutrition" className="text-xs sm:text-sm py-2 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md">
                  <Apple className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t.nutrition[lang]}</span>
                  <span className="sm:hidden">{t.nutrition[lang].slice(0, 4)}</span>
                </TabsTrigger>
                <TabsTrigger value="workout" data-testid="tab-workout" className="text-xs sm:text-sm py-2 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md">
                  <Dumbbell className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t.workout[lang]}</span>
                  <span className="sm:hidden">{t.workout[lang].slice(0, 4)}</span>
                </TabsTrigger>
                <TabsTrigger value="checkin" data-testid="tab-checkin" className="text-xs sm:text-sm py-2 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md">
                  <Scale className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t.checkIn[lang]}</span>
                  <span className="sm:hidden">Check</span>
                </TabsTrigger>
                <TabsTrigger value="goals" data-testid="tab-goals" className="text-xs sm:text-sm py-2 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md">
                  <Target className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t.goals[lang]}</span>
                  <span className="sm:hidden">{t.goals[lang].slice(0, 4)}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="nutrition">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t.logNutrition[lang]}</CardTitle>
                      <CardDescription>
                        {t.trackMeals[lang]} {selectedClient?.name}
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
                                <FormLabel>{t.date[lang]}</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} data-testid="input-nutrition-date" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid gap-4 grid-cols-2">
                            <FormField
                              control={nutritionForm.control}
                              name="calories"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t.calories[lang]}</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
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
                                  <FormLabel>{t.protein[lang]}</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
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
                                  <FormLabel>{t.carbs[lang]}</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
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
                                  <FormLabel>{t.fats[lang]}</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
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
                                <FormLabel>{t.notes[lang]}</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    value={field.value || ""}
                                    placeholder={t.notesPlaceholder[lang]}
                                    data-testid="input-nutrition-notes" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button 
                            type="submit" 
                            disabled={createLogMutation.isPending}
                            data-testid="button-save-nutrition"
                          >
                            {createLogMutation.isPending ? t.saving[lang] : t.saveNutrition[lang]}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        {t.recentLogs[lang]}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {logsLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                      ) : (
                        renderLogHistory(nutritionLogs, "nutrition")
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="workout">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t.logWorkout[lang]}</CardTitle>
                      <CardDescription>
                        {t.trackTraining[lang]} {selectedClient?.name}
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
                                <FormLabel>{t.date[lang]}</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} data-testid="input-workout-date" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid gap-4 grid-cols-2">
                            <FormField
                              control={workoutForm.control}
                              name="workoutType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t.workoutType[lang]}</FormLabel>
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
                                      <SelectItem value="strength">{t.strength[lang]}</SelectItem>
                                      <SelectItem value="cardio">{t.cardio[lang]}</SelectItem>
                                      <SelectItem value="hiit">{t.hiit[lang]}</SelectItem>
                                      <SelectItem value="flexibility">{t.flexibility[lang]}</SelectItem>
                                      <SelectItem value="sports">{t.sports[lang]}</SelectItem>
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
                                  <FormLabel>{t.duration[lang]}</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
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
                                <FormLabel>{t.intensity[lang]}</FormLabel>
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
                                    <SelectItem value="low">{t.low[lang]}</SelectItem>
                                    <SelectItem value="moderate">{t.moderate[lang]}</SelectItem>
                                    <SelectItem value="high">{t.high[lang]}</SelectItem>
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
                                <FormLabel>{t.workoutNotes[lang]}</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    value={field.value || ""}
                                    placeholder={t.workoutNotesPlaceholder[lang]}
                                    data-testid="input-workout-notes" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button 
                            type="submit" 
                            disabled={createLogMutation.isPending}
                            data-testid="button-save-workout"
                          >
                            {createLogMutation.isPending ? t.saving[lang] : t.saveWorkout[lang]}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        {t.recentLogs[lang]}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {logsLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                      ) : (
                        renderLogHistory(workoutLogs, "workout")
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="checkin">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t.logCheckIn[lang]}</CardTitle>
                      <CardDescription>
                        {t.trackProgress[lang]} {selectedClient?.name}
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
                                <FormLabel>{t.date[lang]}</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} data-testid="input-checkin-date" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid gap-4 grid-cols-2">
                            <FormField
                              control={checkInForm.control}
                              name="weight"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t.weight[lang]}</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.1"
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
                                  <FormLabel>{t.bodyFat[lang]}</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.1"
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
                                <FormLabel>{t.checkInNotes[lang]}</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    value={field.value || ""}
                                    placeholder={t.checkInNotesPlaceholder[lang]}
                                    data-testid="input-checkin-notes" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button 
                            type="submit" 
                            disabled={createLogMutation.isPending}
                            data-testid="button-save-checkin"
                          >
                            {createLogMutation.isPending ? t.saving[lang] : t.saveCheckIn[lang]}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        {t.recentLogs[lang]}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {logsLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                      ) : (
                        renderLogHistory(checkinLogs, "check-in")
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="goals">
                <ClientGoals clientId={selectedClientId} clientName={selectedClient.name} />
              </TabsContent>
            </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
