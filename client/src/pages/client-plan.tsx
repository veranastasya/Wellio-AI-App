import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, FileText, Download, Calendar, Target, CheckCircle2, Sparkles, CalendarDays, ClipboardList, Dumbbell, UtensilsCrossed, ListChecks, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, ClientPlan } from "@shared/schema";
import { CLIENT_UI_TRANSLATIONS, type SupportedLanguage } from "@shared/schema";
import { format, parseISO, isWithinInterval } from "date-fns";

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    if (!line.trim()) {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-lg font-bold text-foreground mt-4 mb-2">
          {line.substring(4)}
        </h3>
      );
      i++;
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-xl font-bold text-foreground mt-5 mb-3">
          {line.substring(3)}
        </h2>
      );
      i++;
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-2xl font-bold text-foreground mt-6 mb-3">
          {line.substring(2)}
        </h1>
      );
      i++;
    } else if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
      elements.push(
        <div key={`hr-${i}`} className="border-t border-border my-4" />
      );
      i++;
    } else if ((line.trim().startsWith('- ') || line.trim().startsWith('* ')) && line.trim().endsWith(':')) {
      const headerText = line.trim().substring(2);
      elements.push(
        <h4 key={`subheader-${i}`} className="text-base font-semibold text-primary mt-4 mb-2">
          {renderInlineFormatting(headerText)}
        </h4>
      );
      i++;
    } else if (line.includes('**')) {
      elements.push(
        <p key={`p-${i}`} className="text-sm leading-relaxed text-foreground">
          {renderInlineFormatting(line)}
        </p>
      );
      i++;
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')) {
      elements.push(
        <div key={`li-${i}`} className="flex gap-3 text-sm leading-relaxed text-foreground ml-2">
          <span className="text-primary mt-0.5">•</span>
          <span>{renderInlineFormatting(line.trim().substring(2))}</span>
        </div>
      );
      i++;
    } else if (/^\d+\. /.test(line.trim())) {
      const match = line.trim().match(/^(\d+)\. (.*)$/);
      if (match) {
        elements.push(
          <div key={`ol-${i}`} className="flex gap-3 text-sm leading-relaxed text-foreground ml-2">
            <span className="text-primary font-semibold min-w-fit">{match[1]}.</span>
            <span>{renderInlineFormatting(match[2])}</span>
          </div>
        );
      }
      i++;
    } else {
      elements.push(
        <p key={`text-${i}`} className="text-sm leading-relaxed text-foreground">
          {renderInlineFormatting(line)}
        </p>
      );
      i++;
    }
  }

  return <div className="space-y-2">{elements}</div>;
}

function renderInlineFormatting(text: string): JSX.Element | string {
  const parts: (JSX.Element | string)[] = [];
  let lastIndex = 0;
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__(?!_)|_(.+?)_(?!_)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const boldText = match[1];
    const italicText = match[2];
    const boldText2 = match[3];
    const italicText2 = match[4];

    if (boldText) {
      parts.push(
        <strong key={`bold-${match.index}`} className="font-bold">
          {boldText}
        </strong>
      );
    } else if (italicText) {
      parts.push(
        <em key={`italic-${match.index}`} className="italic">
          {italicText}
        </em>
      );
    } else if (boldText2) {
      parts.push(
        <strong key={`bold2-${match.index}`} className="font-bold">
          {boldText2}
        </strong>
      );
    } else if (italicText2) {
      parts.push(
        <em key={`italic2-${match.index}`} className="italic">
          {italicText2}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length === 0 ? text : <>{parts}</>;
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  note?: string;
}

interface TrainingDay {
  id: string;
  day: string;
  date?: string;
  title: string;
  exercises: Exercise[];
}

interface Meal {
  id: string;
  type: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionDay {
  id: string;
  day: string;
  date?: string;
  title: string;
  meals: Meal[];
}

interface Habit {
  id: string;
  name: string;
  frequency: string;
  completed: boolean;
}

interface Task {
  id: string;
  name: string;
  dueDay: string;
  completed: boolean;
}

interface WeeklyProgramContent {
  type: string;
  week: number;
  weekStartDate?: string;
  weekEndDate?: string;
  training: TrainingDay[];
  nutrition: NutritionDay[];
  habits: Habit[];
  tasks: Task[];
}

function WeeklyProgramRenderer({ content }: { content: WeeklyProgramContent }) {
  const { training, nutrition, habits, tasks } = content;
  
  return (
    <div className="space-y-6">
      {training && training.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Dumbbell className="w-5 h-5" />
            <h3>Training Schedule</h3>
          </div>
          <div className="space-y-4">
            {training.map((day) => (
              <div key={day.id} className="border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-semibold text-foreground">{day.title}</span>
                    <span className="text-muted-foreground text-sm ml-2">({day.day})</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {day.exercises.map((exercise) => (
                    <div key={exercise.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-sm text-foreground">{exercise.name}</span>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{String(exercise.sets)} sets</span>
                        <span>{String(exercise.reps)} reps</span>
                        {exercise.note && (
                          <span className="text-xs italic text-primary/70">{exercise.note}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {nutrition && nutrition.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <UtensilsCrossed className="w-5 h-5" />
            <h3>Nutrition Plan</h3>
          </div>
          <div className="space-y-4">
            {nutrition.map((day) => (
              <div key={day.id} className="border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-semibold text-foreground">{day.title}</span>
                    <span className="text-muted-foreground text-sm ml-2">({day.day})</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {day.meals.map((meal) => (
                    <div key={meal.id} className="py-2 border-b border-border last:border-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-muted-foreground uppercase">{meal.type}</span>
                          <p className="text-sm font-medium text-foreground">{meal.name}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{String(meal.calories)} cal</span>
                          <span className="text-blue-500">P:{String(meal.protein)}g</span>
                          <span className="text-amber-500">C:{String(meal.carbs)}g</span>
                          <span className="text-rose-500">F:{String(meal.fat)}g</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {habits && habits.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <ListChecks className="w-5 h-5" />
            <h3>Daily Habits</h3>
          </div>
          <div className="border rounded-lg p-4 bg-card space-y-2">
            {habits.map((habit) => (
              <div key={habit.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-foreground">{habit.name}</span>
                <Badge variant="secondary" className="text-xs">{habit.frequency}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks && tasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Clock className="w-5 h-5" />
            <h3>Weekly Tasks</h3>
          </div>
          <div className="border rounded-lg p-4 bg-card space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-foreground">{task.name}</span>
                <Badge variant="outline" className="text-xs">{task.dueDay}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, isCurrentWeek = false }: { plan: ClientPlan; isCurrentWeek?: boolean }) {
  const planContentObj = plan.planContent as any;
  
  const isWeeklyProgram = planContentObj?.type === "weekly_program" && 
    (planContentObj?.training || planContentObj?.nutrition || planContentObj?.habits || planContentObj?.tasks);
  
  let contentText = '';
  if (!isWeeklyProgram) {
    if (planContentObj?.content && typeof planContentObj.content === 'string') {
      contentText = planContentObj.content;
    } else if (planContentObj?.messages && Array.isArray(planContentObj.messages)) {
      const assistantMessages = planContentObj.messages.filter((msg: any) => msg.role === "assistant");
      contentText = assistantMessages.map((msg: any) => msg.content).join('\n\n');
    }
  }

  const formatWeekRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return null;
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    } catch {
      return null;
    }
  };

  const weekRange = formatWeekRange(plan.weekStartDate, plan.weekEndDate);

  return (
    <Card data-testid={`plan-${plan.id}`} className={isCurrentWeek ? "border-primary/50 bg-primary/5" : ""}>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg sm:text-xl">{plan.planName}</CardTitle>
              {isCurrentWeek && (
                <Badge variant="default" className="text-xs">Current Week</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
              {weekRange && (
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4" />
                  {weekRange}
                </div>
              )}
              {!weekRange && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  Created {new Date(plan.createdAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          {plan.pdfUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(plan.pdfUrl!, "_blank")}
              data-testid="button-download-pdf"
              className="w-full sm:w-auto min-h-10"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <ScrollArea className="h-[300px] sm:h-[400px] pr-2 sm:pr-4">
          <div className="space-y-4">
            {isWeeklyProgram ? (
              <WeeklyProgramRenderer content={planContentObj as WeeklyProgramContent} />
            ) : contentText ? (
              <MarkdownRenderer content={contentText} />
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No plan content available
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function WeeklyPlanAccordionItem({ plan, isCurrentWeek = false }: { plan: ClientPlan; isCurrentWeek?: boolean }) {
  const planContentObj = plan.planContent as any;
  
  const isWeeklyProgram = planContentObj?.type === "weekly_program" && 
    (planContentObj?.training || planContentObj?.nutrition || planContentObj?.habits || planContentObj?.tasks);
  
  let contentText = '';
  if (!isWeeklyProgram) {
    if (planContentObj?.content && typeof planContentObj.content === 'string') {
      contentText = planContentObj.content;
    } else if (planContentObj?.messages && Array.isArray(planContentObj.messages)) {
      const assistantMessages = planContentObj.messages.filter((msg: any) => msg.role === "assistant");
      contentText = assistantMessages.map((msg: any) => msg.content).join('\n\n');
    }
  }

  const formatWeekRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return "Week Plan";
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    } catch {
      return "Week Plan";
    }
  };

  const weekRange = formatWeekRange(plan.weekStartDate, plan.weekEndDate);

  return (
    <AccordionItem value={plan.id} className={isCurrentWeek ? "border-primary/50 bg-primary/5 rounded-lg" : ""}>
      <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid={`accordion-trigger-${plan.id}`}>
        <div className="flex items-center gap-3 text-left">
          <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{plan.planName}</span>
              {isCurrentWeek && (
                <Badge variant="default" className="text-xs">Current</Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground">{weekRange}</span>
          </div>
          {plan.pdfUrl && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                window.open(plan.pdfUrl!, "_blank");
              }}
              data-testid={`button-download-pdf-${plan.id}`}
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="pt-2">
          {isWeeklyProgram ? (
            <WeeklyProgramRenderer content={planContentObj as WeeklyProgramContent} />
          ) : contentText ? (
            <MarkdownRenderer content={contentText} />
          ) : (
            <p className="text-muted-foreground text-sm italic">
              No plan content available
            </p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function ClientPlan() {
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const hasMarkedViewed = useRef(false);
  
  // Translation helper
  const lang = (clientData?.preferredLanguage || "en") as SupportedLanguage;
  const t = CLIENT_UI_TRANSLATIONS;

  useEffect(() => {
    const storedClientId = localStorage.getItem("clientId");
    if (!storedClientId) {
      setLocation("/client/login");
      return;
    }
    setClientId(storedClientId);
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

  const { data: longTermPlan, isLoading: isLoadingLongTerm } = useQuery<ClientPlan | null>({
    queryKey: ["/api/client-plans/my-long-term"],
    enabled: !!clientId,
  });

  const { data: weeklyPlans, isLoading: isLoadingWeekly } = useQuery<ClientPlan[]>({
    queryKey: ["/api/client-plans/my-weekly"],
    enabled: !!clientId,
  });

  const { data: currentWeekPlan } = useQuery<ClientPlan | null>({
    queryKey: ["/api/client-plans/my-current-week"],
    enabled: !!clientId,
  });

  // Mark plans as viewed once when the page loads and data is ready
  useEffect(() => {
    const hasPlans = longTermPlan || (weeklyPlans && weeklyPlans.length > 0);
    
    if (clientId && !isLoadingWeekly && !isLoadingLongTerm && hasPlans && !hasMarkedViewed.current) {
      hasMarkedViewed.current = true;
      apiRequest("POST", "/api/client-plans/mark-viewed")
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/client-plans/unread-count"] });
        })
        .catch((error) => {
          console.error("Error marking plans as viewed:", error);
          hasMarkedViewed.current = false; // Reset on error to allow retry
        });
    }
  }, [clientId, isLoadingWeekly, isLoadingLongTerm, longTermPlan, weeklyPlans]);

  const isLoading = isVerifying || isLoadingLongTerm || isLoadingWeekly;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" data-testid="loader-plans" />
      </div>
    );
  }

  if (!clientData) {
    return null;
  }

  const hasLongTermPlan = !!longTermPlan;
  const hasWeeklyPlans = weeklyPlans && weeklyPlans.length > 0;
  const hasAnyPlans = hasLongTermPlan || hasWeeklyPlans;

  const pastWeeklyPlans = weeklyPlans?.filter(p => p.id !== currentWeekPlan?.id) || [];

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2" data-testid="text-plan-title">
              <Sparkles className="w-7 h-7 sm:w-8 sm:h-8" />
              My Wellness Plans
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">View your personalized plans from your coach</p>
          </div>
        </div>

        {!hasAnyPlans ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="w-16 h-16 text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t.myPlan.noPlan[lang]}</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {t.myPlan.noPlanDescription[lang]}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={currentWeekPlan ? "weekly" : (hasLongTermPlan ? "long-term" : "weekly")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4" data-testid="tabs-plan-type">
              <TabsTrigger value="long-term" className="flex items-center gap-2" data-testid="tab-long-term">
                <Target className="w-4 h-4" />
                {t.myPlan.currentPlan[lang]}
              </TabsTrigger>
              <TabsTrigger value="weekly" className="flex items-center gap-2" data-testid="tab-weekly">
                <CalendarDays className="w-4 h-4" />
                {t.myPlan.weeklyPlan[lang]}
                {weeklyPlans && weeklyPlans.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">{weeklyPlans.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="long-term" className="space-y-4">
              {longTermPlan ? (
                <PlanCard plan={longTermPlan} />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Target className="w-12 h-12 text-muted-foreground opacity-50 mb-3" />
                    <h3 className="text-lg font-semibold mb-1">{t.myPlan.noPlan[lang]}</h3>
                    <p className="text-muted-foreground text-center text-sm max-w-md">
                      {t.myPlan.noPlanDescription[lang]}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="weekly" className="space-y-4">
              {currentWeekPlan && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    {t.myPlan.thisWeeksPlan[lang]}
                  </h3>
                  <PlanCard plan={currentWeekPlan} isCurrentWeek />
                </div>
              )}

              {pastWeeklyPlans.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    {t.myPlan.pastWeeks[lang]}
                  </h3>
                  <Accordion type="single" collapsible className="space-y-2">
                    {pastWeeklyPlans.map((plan) => (
                      <WeeklyPlanAccordionItem key={plan.id} plan={plan} />
                    ))}
                  </Accordion>
                </div>
              )}

              {!hasWeeklyPlans && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CalendarDays className="w-12 h-12 text-muted-foreground opacity-50 mb-3" />
                    <h3 className="text-lg font-semibold mb-1">{t.myPlan.noPlan[lang]}</h3>
                    <p className="text-muted-foreground text-center text-sm max-w-md">
                      {t.myPlan.noPlanDescription[lang]}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">{t.myPlan.yourProgress[lang]}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">{t.myPlan.overallProgress[lang]}</h3>
                </div>
                <div className="text-3xl font-bold">{clientData.progressScore}%</div>
                <p className="text-sm text-muted-foreground">
                  {t.myPlan.keepUpGreatWork[lang]}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">{t.myPlan.status[lang]}</h3>
                </div>
                <Badge variant={clientData.status === "active" ? "default" : "secondary"} className="text-base">
                  {clientData.status}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {t.profile.memberSince[lang]} {new Date(clientData.joinedDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
