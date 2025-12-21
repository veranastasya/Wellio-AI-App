import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  TrendingDown, 
  Dumbbell, 
  Flame, 
  Target, 
  Camera, 
  Upload, 
  Lock, 
  Unlock,
  Loader2,
  Trash2,
  TrendingUp,
  Minus,
  ArrowUp,
  ArrowDown
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
  Bar,
  Area,
  AreaChart
} from "recharts";
import type { Client, ProgressPhoto, SupportedLanguage } from "@shared/schema";
import { CLIENT_UI_TRANSLATIONS } from "@shared/schema";
import { format, parseISO } from "date-fns";

interface ProgressSummary {
  weightLost: number;
  weightLostPercent: number;
  currentWeight: number;
  weightTrend: { date: string; weight: number; week: number }[];
  workoutsThisWeek: number;
  workoutChange: number;
  weeklyActivity: { day: string; duration: number }[];
  avgDailyCalories: number;
  nutritionOverview: { day: string; calories: number }[];
  habitCompletion: number;
  habitChange: number;
}

export default function ClientMyProgress() {
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");
  const [isSharedWithCoach, setIsSharedWithCoach] = useState(true);
  const { toast } = useToast();
  
  // Get language for translations
  const lang = (clientData?.preferredLanguage || "en") as SupportedLanguage;
  const t = CLIENT_UI_TRANSLATIONS;

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
    } catch {
      localStorage.removeItem("clientId");
      localStorage.removeItem("clientEmail");
      setLocation("/client/login");
    } finally {
      setIsVerifying(false);
    }
  };

  const { data: progressSummary, isLoading: summaryLoading } = useQuery<ProgressSummary>({
    queryKey: ["/api/client/progress-summary"],
    enabled: !!clientData,
  });

  const { data: progressPhotos, isLoading: photosLoading } = useQuery<ProgressPhoto[]>({
    queryKey: ["/api/client/progress-photos"],
    enabled: !!clientData,
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ file, caption, isShared, photoDate }: { file: File; caption: string; isShared: boolean; photoDate: string }) => {
      // Server-side upload with HEIC conversion support
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('caption', caption);
      formData.append('photoDate', photoDate);
      formData.append('isSharedWithCoach', String(isShared));
      
      const response = await fetch('/api/client/progress-photos/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/progress-photos"] });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setPhotoCaption("");
      const currentLang = (clientData?.preferredLanguage || "en") as SupportedLanguage;
      toast({ 
        title: CLIENT_UI_TRANSLATIONS.progressPhotos.photoUploaded[currentLang], 
        description: CLIENT_UI_TRANSLATIONS.progressPhotos.photoUploadedDescription[currentLang]
      });
    },
    onError: () => {
      const currentLang = (clientData?.preferredLanguage || "en") as SupportedLanguage;
      toast({ 
        title: CLIENT_UI_TRANSLATIONS.progressPhotos.uploadFailed[currentLang], 
        description: CLIENT_UI_TRANSLATIONS.progressPhotos.tryAgain[currentLang], 
        variant: "destructive" 
      });
    },
  });

  const togglePrivacyMutation = useMutation({
    mutationFn: async ({ photoId, isShared }: { photoId: string; isShared: boolean }) => {
      return apiRequest("PATCH", `/api/client/progress-photos/${photoId}`, {
        isSharedWithCoach: isShared,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/progress-photos"] });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      return apiRequest("DELETE", `/api/client/progress-photos/${photoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/progress-photos"] });
      const currentLang = (clientData?.preferredLanguage || "en") as SupportedLanguage;
      toast({ title: CLIENT_UI_TRANSLATIONS.progressPhotos.photoDeleted[currentLang] });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        const currentLang = (clientData?.preferredLanguage || "en") as SupportedLanguage;
        toast({ 
          title: CLIENT_UI_TRANSLATIONS.progressPhotos.fileTooLarge[currentLang], 
          description: CLIENT_UI_TRANSLATIONS.progressPhotos.maxSize[currentLang], 
          variant: "destructive" 
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    uploadPhotoMutation.mutate({
      file: selectedFile,
      caption: photoCaption,
      isShared: isSharedWithCoach,
      photoDate: new Date().toISOString().split('T')[0],
    });
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientData) return null;

  const targetWeight = clientData.targetWeight || 0;
  const weightToGo = progressSummary?.currentWeight ? 
    Math.abs(progressSummary.currentWeight - targetWeight).toFixed(1) : "--";

  // Prepare weight chart data for 8 weeks
  const weightChartData = (() => {
    if (!progressSummary?.weightTrend || progressSummary.weightTrend.length === 0) {
      return Array.from({ length: 8 }, (_, i) => ({
        week: `Week ${i + 1}`,
        weight: null,
      }));
    }
    
    // Group by week and get average
    const weeklyWeights: Record<number, number[]> = {};
    progressSummary.weightTrend.forEach(entry => {
      if (!weeklyWeights[entry.week]) weeklyWeights[entry.week] = [];
      weeklyWeights[entry.week].push(entry.weight);
    });
    
    return Array.from({ length: 8 }, (_, i) => ({
      week: `Week ${i + 1}`,
      weight: weeklyWeights[i + 1] 
        ? Math.round(weeklyWeights[i + 1].reduce((a, b) => a + b, 0) / weeklyWeights[i + 1].length * 10) / 10
        : null,
    }));
  })();

  const getTrendIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="w-3 h-3" />;
    if (change < 0) return <ArrowDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = (change: number, reverse = false) => {
    const isPositive = reverse ? change < 0 : change > 0;
    if (isPositive) return "text-emerald-500";
    if (change !== 0) return "text-rose-500";
    return "text-muted-foreground";
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="heading-my-progress">
              {t.myProgress.title[lang]}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t.myProgress.subtitle[lang]}
            </p>
          </div>
        </div>

        {summaryLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Weight Lost */}
              <Card className="hover-elevate">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <TrendingDown className="w-4 h-4 text-teal-500" />
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground">{t.myProgress.weightLost[lang]}</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-weight-lost">
                      {progressSummary?.weightLost || 0} {t.profile.kg[lang]}
                    </p>
                    <p className={`text-xs ${getTrendColor(progressSummary?.weightLost || 0, true)}`}>
                      {progressSummary?.weightLostPercent 
                        ? `${progressSummary.weightLostPercent > 0 ? '-' : '+'}${Math.abs(progressSummary.weightLostPercent).toFixed(1)}%`
                        : '--'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Workouts This Week */}
              <Card className="hover-elevate">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground">{t.myProgress.workoutsThisWeek[lang]}</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-workouts">
                      {progressSummary?.workoutsThisWeek || 0}
                    </p>
                    <p className={`text-xs flex items-center gap-1 ${getTrendColor(progressSummary?.workoutChange || 0)}`}>
                      {getTrendIcon(progressSummary?.workoutChange || 0)}
                      {progressSummary?.workoutChange !== 0 
                        ? `${progressSummary?.workoutChange! > 0 ? '+' : ''}${progressSummary?.workoutChange} ${t.myProgress.fromLastWeek[lang]}`
                        : t.myProgress.steadyProgress[lang]}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Avg Daily Calories */}
              <Card className="hover-elevate">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground">{t.myProgress.avgDailyCalories[lang]}</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-calories">
                      {progressSummary?.avgDailyCalories?.toLocaleString() || '--'}
                    </p>
                    <p className="text-xs text-emerald-500">{t.myProgress.onTrack[lang]}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Habit Completion */}
              <Card className="hover-elevate">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground">{t.myProgress.habitCompletion[lang]}</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-habits">
                      {progressSummary?.habitCompletion || 0}%
                    </p>
                    <p className={`text-xs flex items-center gap-1 ${getTrendColor(progressSummary?.habitChange || 0)}`}>
                      {progressSummary?.habitChange !== 0 
                        ? `${progressSummary?.habitChange! > 0 ? '+' : ''}${progressSummary?.habitChange}%`
                        : t.myProgress.steadyProgress[lang]}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weight Progress Chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{t.myProgress.weightProgress[lang]}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{t.myProgress.trackedViaAI[lang]}</p>
                  </div>
                  <Badge variant="outline" className="bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    {progressSummary?.weightLost ? `-${progressSummary.weightLost} ${t.myProgress.kgTotal[lang]}` : t.common.noData[lang]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weightChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#28A0AE" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#28A0AE" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="week" className="text-xs" tick={{ fill: 'currentColor' }} />
                      <YAxis 
                        domain={['dataMin - 5', 'dataMax + 5']} 
                        className="text-xs" 
                        tick={{ fill: 'currentColor' }}
                        tickFormatter={(v) => `${v}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value} kg`, 'Weight']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#28A0AE" 
                        strokeWidth={2}
                        fill="url(#weightGradient)"
                        connectNulls
                      />
                      {targetWeight > 0 && (
                        <Line 
                          type="monotone" 
                          dataKey={() => targetWeight} 
                          stroke="#E2F9AD" 
                          strokeWidth={2} 
                          strokeDasharray="5 5"
                          dot={false}
                          name="Target"
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Progress Photos Section */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                      <Camera className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t.progressPhotos.title[lang]}</CardTitle>
                      <p className="text-xs text-muted-foreground">{t.progressPhotos.subtitle[lang]}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800">
                    <Lock className="w-3 h-3 mr-1" />
                    {progressPhotos?.filter(p => p.isSharedWithCoach).length || 0} {t.progressPhotos.sharedWithCoach[lang]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {/* Upload Button */}
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full mb-4"
                      variant="outline"
                      data-testid="button-upload-photo"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {t.progressPhotos.uploadNewPhoto[lang]}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t.progressPhotos.uploadProgressPhoto[lang]}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>{t.progressPhotos.photo[lang]}</Label>
                        <Input 
                          type="file" 
                          accept="image/*,.heic,.heif" 
                          onChange={handleFileSelect}
                          data-testid="input-photo-file"
                        />
                        {selectedFile && (
                          <p className="text-sm text-muted-foreground mt-1">{selectedFile.name}</p>
                        )}
                      </div>
                      <div>
                        <Label>{t.progressPhotos.caption[lang]}</Label>
                        <Input 
                          value={photoCaption}
                          onChange={(e) => setPhotoCaption(e.target.value)}
                          placeholder={t.progressPhotos.captionPlaceholder[lang]}
                          data-testid="input-photo-caption"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          {isSharedWithCoach ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          {t.progressPhotos.shareWithCoach[lang]}
                        </Label>
                        <Switch 
                          checked={isSharedWithCoach}
                          onCheckedChange={setIsSharedWithCoach}
                          data-testid="switch-share-with-coach"
                        />
                      </div>
                      <Button 
                        onClick={handleUpload}
                        disabled={!selectedFile || uploadPhotoMutation.isPending}
                        className="w-full"
                        data-testid="button-confirm-upload"
                      >
                        {uploadPhotoMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        {uploadPhotoMutation.isPending ? t.progressPhotos.uploading[lang] : t.progressPhotos.uploadPhoto[lang]}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Photo Gallery */}
                {photosLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : progressPhotos && progressPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-white hover:bg-white/20"
                            onClick={() => togglePrivacyMutation.mutate({
                              photoId: photo.id,
                              isShared: !photo.isSharedWithCoach
                            })}
                            data-testid={`button-toggle-privacy-${photo.id}`}
                          >
                            {photo.isSharedWithCoach ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-white hover:bg-white/20"
                            onClick={() => deletePhotoMutation.mutate(photo.id)}
                            data-testid={`button-delete-photo-${photo.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="absolute bottom-1 left-1">
                          {photo.isSharedWithCoach ? (
                            <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 text-[10px] px-1.5 py-0">
                              <Unlock className="w-2.5 h-2.5 mr-0.5" />
                              {t.progressPhotos.sharedWithCoach[lang]}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              <Lock className="w-2.5 h-2.5 mr-0.5" />
                              {t.progressPhotos.private[lang]}
                            </Badge>
                          )}
                        </div>
                        {photo.caption && (
                          <div className="absolute bottom-1 right-1 text-[10px] text-white bg-black/50 px-1 rounded">
                            {format(parseISO(photo.photoDate), "MMM d")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t.progressPhotos.noPhotos[lang]}</p>
                    <p className="text-xs mt-1">{t.progressPhotos.noPhotosDescription[lang]}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Weekly Activity */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{t.myProgress.weeklyActivity[lang]}</CardTitle>
                  <p className="text-xs text-muted-foreground">{t.myProgress.workoutDurationByDay[lang]}</p>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={progressSummary?.weeklyActivity || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="day" className="text-xs" tick={{ fill: 'currentColor' }} />
                        <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [`${value} ${t.myProgress.min[lang]}`, t.myProgress.duration[lang]]}
                        />
                        <Bar dataKey="duration" fill="#28A0AE" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Nutrition Overview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{t.myProgress.nutritionOverview[lang]}</CardTitle>
                  <p className="text-xs text-muted-foreground">{t.myProgress.dailyCalorieIntake[lang]}</p>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={progressSummary?.nutritionOverview || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="day" className="text-xs" tick={{ fill: 'currentColor' }} />
                        <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [`${value} ${t.myProgress.cal[lang]}`, t.myProgress.calories[lang]]}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="calories" 
                          stroke="#28A0AE" 
                          strokeWidth={2}
                          dot={{ fill: '#28A0AE', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
