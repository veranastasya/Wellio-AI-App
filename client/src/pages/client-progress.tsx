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
import type { SupportedLanguage } from "@shared/schema";
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

const pt = {
  trackProgress: { en: "Track Progress", ru: "Отслеживание прогресса", es: "Seguimiento del progreso" },
  logNutritionWorkouts: { en: "Log your nutrition, workouts, and body metrics", ru: "Записывайте питание, тренировки и показатели тела", es: "Registra tu nutrición, entrenamientos y métricas corporales" },
  nutrition: { en: "Nutrition", ru: "Питание", es: "Nutrición" },
  food: { en: "Food", ru: "Еда", es: "Comida" },
  workout: { en: "Workout", ru: "Тренировка", es: "Entrenamiento" },
  train: { en: "Train", ru: "Трен.", es: "Entrenar" },
  checkin: { en: "Check-in", ru: "Замер", es: "Control" },
  body: { en: "Body", ru: "Тело", es: "Cuerpo" },
  logNutrition: { en: "Log Nutrition", ru: "Записать питание", es: "Registrar nutrición" },
  trackDailyFood: { en: "Track your daily food intake", ru: "Отслеживайте ежедневное питание", es: "Registra tu ingesta diaria" },
  date: { en: "Date", ru: "Дата", es: "Fecha" },
  calories: { en: "Calories", ru: "Калории", es: "Calorías" },
  proteinG: { en: "Protein (g)", ru: "Белки (г)", es: "Proteína (g)" },
  carbsG: { en: "Carbs (g)", ru: "Углеводы (г)", es: "Carbohidratos (g)" },
  fatsG: { en: "Fats (g)", ru: "Жиры (г)", es: "Grasas (g)" },
  notesOptional: { en: "Notes (Optional)", ru: "Заметки (необязательно)", es: "Notas (opcional)" },
  howWasEating: { en: "How was your eating today?", ru: "Как вы питались сегодня?", es: "¿Cómo fue tu alimentación hoy?" },
  saving: { en: "Saving...", ru: "Сохранение...", es: "Guardando..." },
  nutritionHistory: { en: "Nutrition History", ru: "История питания", es: "Historial de nutrición" },
  logWorkout: { en: "Log Workout", ru: "Записать тренировку", es: "Registrar entrenamiento" },
  trackTraining: { en: "Track your training sessions", ru: "Отслеживайте тренировки", es: "Registra tus sesiones" },
  type: { en: "Type", ru: "Тип", es: "Tipo" },
  strength: { en: "Strength", ru: "Силовая", es: "Fuerza" },
  cardio: { en: "Cardio", ru: "Кардио", es: "Cardio" },
  hiit: { en: "HIIT", ru: "ВИИТ", es: "HIIT" },
  flexibility: { en: "Flexibility", ru: "Растяжка", es: "Flexibilidad" },
  sports: { en: "Sports", ru: "Спорт", es: "Deportes" },
  durationMin: { en: "Duration (min)", ru: "Длительность (мин)", es: "Duración (min)" },
  intensity: { en: "Intensity", ru: "Интенсивность", es: "Intensidad" },
  low: { en: "Low", ru: "Низкая", es: "Baja" },
  moderate: { en: "Moderate", ru: "Средняя", es: "Moderada" },
  high: { en: "High", ru: "Высокая", es: "Alta" },
  whatExercises: { en: "What exercises did you do?", ru: "Какие упражнения вы делали?", es: "¿Qué ejercicios hiciste?" },
  workoutHistory: { en: "Workout History", ru: "История тренировок", es: "Historial de entrenamientos" },
  bodyCheckin: { en: "Body Check-in", ru: "Замер тела", es: "Control corporal" },
  trackBodyMetrics: { en: "Track your body metrics", ru: "Отслеживайте показатели тела", es: "Registra tus métricas corporales" },
  weightLbs: { en: "Weight (lbs)", ru: "Вес (кг)", es: "Peso (lbs)" },
  bodyFatPct: { en: "Body Fat (%)", ru: "Жир (%)", es: "Grasa corporal (%)" },
  howFeeling: { en: "How are you feeling today?", ru: "Как вы себя чувствуете сегодня?", es: "¿Cómo te sientes hoy?" },
  logCheckin: { en: "Log Check-in", ru: "Записать замер", es: "Registrar control" },
  checkinHistory: { en: "Check-in History", ru: "История замеров", es: "Historial de controles" },
  logged: { en: "Logged!", ru: "Записано!", es: "¡Registrado!" },
  entrySaved: { en: "entry saved", ru: "запись сохранена", es: "entrada guardada" },
  error: { en: "Error", ru: "Ошибка", es: "Error" },
  failedSave: { en: "Failed to save entry", ru: "Не удалось сохранить запись", es: "Error al guardar" },
  deleted: { en: "Deleted", ru: "Удалено", es: "Eliminado" },
  entryRemoved: { en: "Entry removed", ru: "Запись удалена", es: "Entrada eliminada" },
  failedDelete: { en: "Failed to delete entry", ru: "Не удалось удалить запись", es: "Error al eliminar" },
  you: { en: "You", ru: "Вы", es: "Tú" },
  coach: { en: "Coach", ru: "Тренер", es: "Entrenador" },
  noEntries: { en: "entries yet", ru: "записей", es: "entradas aún" },
  startTracking: { en: "Start tracking to see your progress!", ru: "Начните отслеживание, чтобы видеть прогресс!", es: "¡Empieza a registrar para ver tu progreso!" },
  noDataRecorded: { en: "No data recorded", ru: "Нет данных", es: "Sin datos registrados" },
  cal: { en: "cal", ru: "ккал", es: "cal" },
  protein: { en: "protein", ru: "белки", es: "proteína" },
  carbs: { en: "carbs", ru: "углеводы", es: "carbohidratos" },
  fats: { en: "fats", ru: "жиры", es: "grasas" },
  min: { en: "min", ru: "мин", es: "min" },
  lbs: { en: "lbs", ru: "кг", es: "lbs" },
  bodyFat: { en: "body fat", ru: "жир тела", es: "grasa corporal" },
} as const;

export default function ClientProgress() {
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [activeTab, setActiveTab] = useState("nutrition");
  const { toast } = useToast();
  const lang = (clientData?.preferredLanguage || "en") as SupportedLanguage;

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
        title: pt.logged[lang],
        description: `${(pt as any)[variables.type]?.[lang] || variables.type} — ${pt.entrySaved[lang]}`,
      });
    },
    onError: () => {
      toast({
        title: pt.error[lang],
        description: pt.failedSave[lang],
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
        title: pt.deleted[lang],
        description: pt.entryRemoved[lang],
      });
    },
    onError: () => {
      toast({
        title: pt.error[lang],
        description: pt.failedDelete[lang],
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

  const formatPayload = (type: string, payload: Record<string, unknown>, l: SupportedLanguage) => {
    const parts: string[] = [];
    if (type === "nutrition") {
      if (payload.calories) parts.push(`${payload.calories} ${pt.cal[l]}`);
      if (payload.protein) parts.push(`${payload.protein}g ${pt.protein[l]}`);
      if (payload.carbs) parts.push(`${payload.carbs}g ${pt.carbs[l]}`);
      if (payload.fats) parts.push(`${payload.fats}g ${pt.fats[l]}`);
    } else if (type === "workout") {
      if (payload.workoutType) parts.push(String(payload.workoutType).charAt(0).toUpperCase() + String(payload.workoutType).slice(1));
      if (payload.duration) parts.push(`${payload.duration} ${pt.min[l]}`);
      if (payload.intensity) parts.push(String(payload.intensity).charAt(0).toUpperCase() + String(payload.intensity).slice(1));
    } else if (type === "checkin") {
      if (payload.weight) parts.push(`${payload.weight} ${pt.lbs[l]}`);
      if (payload.bodyFat) parts.push(`${payload.bodyFat}% ${pt.bodyFat[l]}`);
    }
    return parts.length > 0 ? parts.join(" • ") : pt.noDataRecorded[l];
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
          <p className="text-sm">{`No ${type} ${pt.noEntries[lang]}`}</p>
          <p className="text-xs mt-1">{pt.startTracking[lang]}</p>
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
                    {log.source === "client" ? pt.you[lang] : pt.coach[lang]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatPayload(log.type, log.payload as Record<string, unknown>, lang)}
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
              {pt.trackProgress[lang]}
            </h1>
            <p className="text-sm text-muted-foreground">
              {pt.logNutritionWorkouts[lang]}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-1 h-auto p-1 bg-muted rounded-lg">
            <TabsTrigger value="nutrition" data-testid="tab-nutrition" className="text-xs sm:text-sm py-2 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md">
              <Apple className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{pt.nutrition[lang]}</span>
              <span className="sm:hidden">{pt.food[lang]}</span>
            </TabsTrigger>
            <TabsTrigger value="workout" data-testid="tab-workout" className="text-xs sm:text-sm py-2 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md">
              <Dumbbell className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{pt.workout[lang]}</span>
              <span className="sm:hidden">{pt.train[lang]}</span>
            </TabsTrigger>
            <TabsTrigger value="checkin" data-testid="tab-checkin" className="text-xs sm:text-sm py-2 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md">
              <Scale className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{pt.checkin[lang]}</span>
              <span className="sm:hidden">{pt.body[lang]}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nutrition" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  {pt.logNutrition[lang]}
                </CardTitle>
                <CardDescription>
                  {pt.trackDailyFood[lang]}
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
                          <FormLabel>{pt.date[lang]}</FormLabel>
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
                            <FormLabel>{pt.calories[lang]}</FormLabel>
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
                            <FormLabel>{pt.proteinG[lang]}</FormLabel>
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
                            <FormLabel>{pt.carbsG[lang]}</FormLabel>
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
                            <FormLabel>{pt.fatsG[lang]}</FormLabel>
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
                          <FormLabel>{pt.notesOptional[lang]}</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              value={field.value || ""}
                              placeholder={pt.howWasEating[lang]}
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
                      {createLogMutation.isPending ? pt.saving[lang] : pt.logNutrition[lang]}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  {pt.nutritionHistory[lang]}
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
                  {pt.logWorkout[lang]}
                </CardTitle>
                <CardDescription>
                  {pt.trackTraining[lang]}
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
                          <FormLabel>{pt.date[lang]}</FormLabel>
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
                            <FormLabel>{pt.type[lang]}</FormLabel>
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
                                <SelectItem value="strength">{pt.strength[lang]}</SelectItem>
                                <SelectItem value="cardio">{pt.cardio[lang]}</SelectItem>
                                <SelectItem value="hiit">{pt.hiit[lang]}</SelectItem>
                                <SelectItem value="flexibility">{pt.flexibility[lang]}</SelectItem>
                                <SelectItem value="sports">{pt.sports[lang]}</SelectItem>
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
                            <FormLabel>{pt.durationMin[lang]}</FormLabel>
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
                          <FormLabel>{pt.intensity[lang]}</FormLabel>
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
                              <SelectItem value="low">{pt.low[lang]}</SelectItem>
                              <SelectItem value="moderate">{pt.moderate[lang]}</SelectItem>
                              <SelectItem value="high">{pt.high[lang]}</SelectItem>
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
                          <FormLabel>{pt.notesOptional[lang]}</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              value={field.value || ""}
                              placeholder={pt.whatExercises[lang]}
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
                      {createLogMutation.isPending ? pt.saving[lang] : pt.logWorkout[lang]}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  {pt.workoutHistory[lang]}
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
                  {pt.bodyCheckin[lang]}
                </CardTitle>
                <CardDescription>
                  {pt.trackBodyMetrics[lang]}
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
                          <FormLabel>{pt.date[lang]}</FormLabel>
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
                            <FormLabel>{pt.weightLbs[lang]}</FormLabel>
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
                            <FormLabel>{pt.bodyFatPct[lang]}</FormLabel>
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
                          <FormLabel>{pt.notesOptional[lang]}</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              value={field.value || ""}
                              placeholder={pt.howFeeling[lang]}
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
                      {createLogMutation.isPending ? pt.saving[lang] : pt.logCheckin[lang]}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  {pt.checkinHistory[lang]}
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
