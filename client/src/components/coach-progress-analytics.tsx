import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { 
  Scale, 
  Apple, 
  Dumbbell, 
  Footprints, 
  Moon, 
  Heart,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Camera,
  ImageOff
} from "lucide-react";
import { 
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import type { SmartLog, ProgressEvent, AIClassification, PlanTargetsRecord, AIParsedData, ProgressPhoto, SupportedLanguage } from "@shared/schema";
import { COACH_UI_TRANSLATIONS } from "@shared/schema";
import { format, parseISO, subDays, eachDayOfInterval } from "date-fns";
import { formatWeight, type UnitsPreference } from "@shared/units";

interface CoachProgressAnalyticsProps {
  clientId: string;
  unitsPreference?: UnitsPreference;
  lang?: SupportedLanguage;
}

function convertWeight(valueKg: number, units: UnitsPreference): number {
  if (units === "metric") {
    return valueKg;
  }
  return valueKg * 2.20462;
}

function getWeightUnit(units: UnitsPreference): string {
  return units === "metric" ? "kg" : "lbs";
}

function getEventIcon(eventType: string) {
  switch (eventType) {
    case "weight":
      return Scale;
    case "nutrition":
      return Apple;
    case "workout":
      return Dumbbell;
    case "steps":
      return Footprints;
    case "sleep":
      return Moon;
    case "checkin_mood":
      return Heart;
    default:
      return FileText;
  }
}

function getEventColor(eventType: string): string {
  switch (eventType) {
    case "weight":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "nutrition":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "workout":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "steps":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "sleep":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "checkin_mood":
      return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function ParsedDataDisplay({ parsedData, lang = "en" }: { parsedData: AIParsedData | null; lang?: SupportedLanguage }) {
  if (!parsedData) return null;

  const { nutrition, workout, weight, sleep, mood } = parsedData;
  const hasData = nutrition || workout || weight || sleep || mood;
  if (!hasData) return null;

  const t = COACH_UI_TRANSLATIONS.analytics;

  return (
    <div className="mt-2 space-y-2">
      {nutrition && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-sm">
          {nutrition.food_description && (
            <p className="font-medium text-green-800 dark:text-green-300 mb-1 text-xs">
              {nutrition.food_description}
            </p>
          )}
          <div className="grid grid-cols-2 gap-1 text-xs">
            {(nutrition.calories ?? nutrition.calories_est) && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Cal:</span>
                <span className="font-medium text-foreground">
                  ~{Math.round(nutrition.calories ?? nutrition.calories_est ?? 0)}
                </span>
              </div>
            )}
            {(nutrition.protein_g ?? nutrition.protein_est_g) && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">P:</span>
                <span className="font-medium text-foreground">
                  ~{Math.round(nutrition.protein_g ?? nutrition.protein_est_g ?? 0)}g
                </span>
              </div>
            )}
            {(nutrition.carbs_g ?? nutrition.carbs_est_g) && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">C:</span>
                <span className="font-medium text-foreground">
                  ~{Math.round(nutrition.carbs_g ?? nutrition.carbs_est_g ?? 0)}g
                </span>
              </div>
            )}
            {(nutrition.fat_g ?? nutrition.fat_est_g) && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">F:</span>
                <span className="font-medium text-foreground">
                  ~{Math.round(nutrition.fat_g ?? nutrition.fat_est_g ?? 0)}g
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {workout && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 text-xs">
          <span className="font-medium text-orange-800 dark:text-orange-300 capitalize">
            {workout.type}
          </span>
          {workout.duration_min && (
            <span className="text-muted-foreground ml-2">{workout.duration_min} min</span>
          )}
          {workout.intensity !== "unknown" && (
            <span className="text-muted-foreground ml-2 capitalize">{workout.intensity}</span>
          )}
        </div>
      )}

      {weight && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-xs">
          <span className="font-medium text-blue-800 dark:text-blue-300">
            {t.weight[lang]}: {weight.value} {weight.unit}
          </span>
        </div>
      )}

      {sleep && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2 text-xs">
          <span className="font-medium text-indigo-800 dark:text-indigo-300">
            {t.sleep[lang]}: {sleep.hours}h {sleep.quality && `(${sleep.quality})`}
          </span>
        </div>
      )}

      {mood && (
        <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-2 text-xs">
          <span className="font-medium text-pink-800 dark:text-pink-300">
            {t.mood[lang]}: {mood.rating}/10
          </span>
        </div>
      )}
    </div>
  );
}

export function CoachProgressAnalytics({ clientId, unitsPreference = "metric", lang = "en" }: CoachProgressAnalyticsProps) {
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const weightUnit = getWeightUnit(unitsPreference);
  const t = COACH_UI_TRANSLATIONS.analytics;
  
  const { data: progressEvents, isLoading: eventsLoading } = useQuery<ProgressEvent[]>({
    queryKey: ["/api/progress-events", clientId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/progress-events/${clientId}?startDate=${thirtyDaysAgo}`);
      return response.json();
    },
  });

  const { data: smartLogs, isLoading: logsLoading } = useQuery<SmartLog[]>({
    queryKey: ["/api/smart-logs", clientId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/smart-logs/${clientId}?limit=20`);
      return response.json();
    },
  });

  const { data: planTarget } = useQuery<PlanTargetsRecord | null>({
    queryKey: ["/api/plan-targets", clientId, "active"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/plan-targets/${clientId}/active`);
      return response.json();
    },
  });

  const { data: progressPhotos, isLoading: photosLoading } = useQuery<ProgressPhoto[]>({
    queryKey: ["/api/clients", clientId, "progress-photos"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/clients/${clientId}/progress-photos`);
      return response.json();
    },
  });

  const isLoading = eventsLoading || logsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="progress-analytics-loading">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const weightEvents = progressEvents?.filter(e => e.eventType === "weight") || [];
  const nutritionEvents = progressEvents?.filter(e => e.eventType === "nutrition") || [];
  const workoutEvents = progressEvents?.filter(e => e.eventType === "workout") || [];

  const weightData = weightEvents
    .map(e => {
      const rawKg = (e.dataJson as any).value_kg || (e.dataJson as any).value;
      return {
        date: e.dateForMetric,
        displayDate: format(parseISO(e.dateForMetric), "MMM d"),
        weight: convertWeight(rawKg, unitsPreference),
        rawKg,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const dateRange = eachDayOfInterval({
    start: subDays(new Date(), 13),
    end: new Date()
  });

  const caloriesByDay = dateRange.map(date => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayEvents = nutritionEvents.filter(e => e.dateForMetric === dateStr);
    const totalCalories = dayEvents.reduce((sum, e) => sum + ((e.dataJson as any).calories || 0), 0);
    return {
      date: dateStr,
      displayDate: format(date, "MMM d"),
      calories: totalCalories || null,
      target: planTarget?.configJson?.calories_target_per_day,
    };
  });

  const workoutsThisWeek = workoutEvents.filter(e => {
    const eventDate = parseISO(e.dateForMetric);
    return eventDate >= subDays(new Date(), 7);
  }).length;

  const daysWithData = new Set(progressEvents?.map(e => e.dateForMetric)).size;

  const firstWeight = weightData[0]?.rawKg;
  const lastWeight = weightData[weightData.length - 1]?.rawKg;
  const weightChangeKg = firstWeight && lastWeight ? lastWeight - firstWeight : null;
  const weightChangeDisplay = weightChangeKg !== null 
    ? convertWeight(Math.abs(weightChangeKg), unitsPreference).toFixed(1)
    : null;

  const avgCalories = caloriesByDay
    .filter(d => d.calories && d.calories > 0)
    .reduce((acc, d, _, arr) => acc + (d.calories || 0) / arr.length, 0);

  return (
    <div className="space-y-6" data-testid="progress-analytics-container">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card data-testid="card-days-logged">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t.daysLogged[lang]}</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-days-logged-value">{daysWithData}</div>
            <div className="text-xs text-muted-foreground">{t.last30Days[lang]}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-weight-change">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t.weightChange[lang]}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold" data-testid="text-weight-change-value">
                {weightChangeKg !== null && weightChangeDisplay
                  ? `${weightChangeKg > 0 ? '+' : '-'}${weightChangeDisplay} ${weightUnit}`
                  : '-'
                }
              </span>
              {weightChangeKg !== null && (
                weightChangeKg > 0 
                  ? <TrendingUp className="w-4 h-4 text-red-500" data-testid="icon-weight-up" />
                  : weightChangeKg < 0 
                    ? <TrendingDown className="w-4 h-4 text-green-500" data-testid="icon-weight-down" />
                    : <Minus className="w-4 h-4 text-muted-foreground" data-testid="icon-weight-stable" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-workouts">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t.workouts[lang]}</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-workouts-value">{workoutsThisWeek}</div>
            <div className="text-xs text-muted-foreground">
              {t.thisWeek[lang]} {planTarget?.configJson?.workouts_per_week_target 
                ? `/ ${planTarget.configJson.workouts_per_week_target} ${t.target[lang]}`
                : ''
              }
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-calories">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Apple className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t.avgCalories[lang]}</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-avg-calories-value">
              {avgCalories > 0 ? Math.round(avgCalories) : '-'}
            </div>
            <div className="text-xs text-muted-foreground">
              {planTarget?.configJson?.calories_target_per_day
                ? `${t.target[lang]}: ${planTarget.configJson.calories_target_per_day}`
                : t.noTargetSet[lang]
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {weightData.length > 0 && (
          <Card data-testid="card-weight-trend">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="w-5 h-5" />
                {t.weightTrend[lang]} ({weightUnit})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]" data-testid="chart-weight-trend">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="displayDate" 
                      tick={{ fontSize: 12 }} 
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      domain={['dataMin - 2', 'dataMax + 2']}
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)} ${weightUnit}`, t.weight[lang]]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-calories-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Apple className="w-5 h-5" />
              {t.calories14Days[lang]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]" data-testid="chart-calories">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={caloriesByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fontSize: 10 }} 
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [value ? `${value} cal` : t.noData[lang], t.caloriesLabel[lang]]}
                  />
                  <Bar 
                    dataKey="calories" 
                    fill="hsl(var(--accent))" 
                    radius={[4, 4, 0, 0]}
                  />
                  {planTarget?.configJson?.calories_target_per_day && (
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-recent-logs">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t.recentSmartLogs[lang]}</CardTitle>
        </CardHeader>
        <CardContent>
          {smartLogs && smartLogs.length > 0 ? (
            <div className="space-y-3" data-testid="list-recent-logs">
              {smartLogs.slice(0, 5).map((log, index) => {
                const classification = log.aiClassificationJson as AIClassification | null;
                const detectedEvents = classification?.detected_event_types || [];
                const parsedData = log.aiParsedJson as AIParsedData | null;
                
                return (
                  <div 
                    key={log.id}
                    className="p-3 rounded-lg border bg-card/50 hover-elevate transition-all duration-150"
                    data-testid={`log-entry-${index}`}
                  >
                    <p className="text-sm text-foreground mb-2" data-testid={`log-text-${index}`}>{log.rawText}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground" data-testid={`log-date-${index}`}>
                        {format(parseISO(log.localDateForClient), "MMM d, yyyy")}
                      </span>
                      {detectedEvents.map((eventType) => {
                        const Icon = getEventIcon(eventType);
                        return (
                          <Badge 
                            key={eventType}
                            variant="secondary"
                            className={`text-xs py-0.5 px-2 ${getEventColor(eventType)}`}
                            data-testid={`log-badge-${eventType}-${index}`}
                          >
                            <Icon className="w-3 h-3 mr-1" />
                            {eventType}
                          </Badge>
                        );
                      })}
                    </div>
                    <ParsedDataDisplay parsedData={parsedData} lang={lang} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-logs-message">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t.noSmartLogsYet[lang]}</p>
              <p className="text-sm">{t.clientNoLogs[lang]}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-progress-photos">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <Camera className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <CardTitle className="text-lg">{t.progressPhotos[lang]}</CardTitle>
              <p className="text-xs text-muted-foreground">{t.photosSharedByClient[lang]}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {photosLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : progressPhotos && progressPhotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="grid-progress-photos">
              {progressPhotos.map((photo) => (
                <div 
                  key={photo.id}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted group border"
                  data-testid={`photo-${photo.id}`}
                >
                  <img 
                    src={photo.photoUrl} 
                    alt={photo.caption || "Progress photo"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.error-placeholder')) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'error-placeholder absolute inset-0 flex items-center justify-center bg-muted';
                        placeholder.innerHTML = '<svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs text-white truncate">
                      {photo.caption || format(parseISO(photo.photoDate), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-photos-message">
              <ImageOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t.noPhotosYet[lang]}</p>
              <p className="text-sm">{t.clientNoPhotos[lang]}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
