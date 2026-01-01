import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Loader2, ChevronLeft, ChevronRight, Dumbbell, UtensilsCrossed, 
  Target, CheckCircle2, Info, Play, Clock, Sparkles
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, ClientPlan, WeeklyScheduleItem } from "@shared/schema";
import { CLIENT_UI_TRANSLATIONS, type SupportedLanguage } from "@shared/schema";
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay, isToday, eachDayOfInterval, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface MyPlanData {
  weekStartDay: string;
  weeklyExists: boolean;
  program: {
    id: string;
    name: string;
    description: string | null;
    content: any;
    progressPercent: number;
    createdAt: string;
  } | null;
  scheduleItems: WeeklyScheduleItem[];
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  note?: string;
  completed?: boolean;
}

interface TrainingDay {
  id: string;
  day: string;
  date?: string;
  title: string;
  duration?: number;
  exercises: Exercise[];
}

interface Meal {
  id: string;
  type: string;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  completed?: boolean;
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
  completed?: boolean;
}

interface ProgramPhase {
  id: string;
  name: string;
  weeks: string;
  status: "completed" | "current" | "upcoming";
  description?: string;
}

interface WeeklyProgramContent {
  type: string;
  week?: number;
  totalWeeks?: number;
  programName?: string;
  programDescription?: string;
  weekStartDate?: string;
  weekEndDate?: string;
  training?: TrainingDay[];
  nutrition?: NutritionDay[];
  habits?: Habit[];
  phases?: ProgramPhase[];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatInlineMarkdown(text: string): JSX.Element[] {
  const parts: JSX.Element[] = [];
  let remaining = text;
  let keyIndex = 0;
  
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/);
    
    let firstMatch: { index: number; length: number; content: string; type: 'bold' | 'italic' } | null = null;
    
    if (boldMatch && boldMatch.index !== undefined) {
      firstMatch = { 
        index: boldMatch.index, 
        length: boldMatch[0].length, 
        content: boldMatch[1], 
        type: 'bold' 
      };
    }
    
    if (italicMatch && italicMatch.index !== undefined) {
      if (!firstMatch || italicMatch.index < firstMatch.index) {
        firstMatch = { 
          index: italicMatch.index, 
          length: italicMatch[0].length, 
          content: italicMatch[1], 
          type: 'italic' 
        };
      }
    }
    
    if (firstMatch) {
      if (firstMatch.index > 0) {
        parts.push(<span key={`text-${keyIndex++}`}>{remaining.substring(0, firstMatch.index)}</span>);
      }
      
      if (firstMatch.type === 'bold') {
        parts.push(<strong key={`bold-${keyIndex++}`} className="font-semibold">{firstMatch.content}</strong>);
      } else {
        parts.push(<em key={`italic-${keyIndex++}`}>{firstMatch.content}</em>);
      }
      
      remaining = remaining.substring(firstMatch.index + firstMatch.length);
    } else {
      parts.push(<span key={`text-${keyIndex++}`}>{remaining}</span>);
      break;
    }
  }
  
  return parts;
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    if (!line.trim()) {
      elements.push(<div key={`empty-${i}`} className="h-3" />);
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-lg font-bold text-foreground mt-5 mb-2">
          {formatInlineMarkdown(line.substring(4))}
        </h3>
      );
      i++;
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-xl font-bold text-foreground mt-6 mb-3">
          {formatInlineMarkdown(line.substring(3))}
        </h2>
      );
      i++;
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-2xl font-bold text-foreground mt-6 mb-3">
          {formatInlineMarkdown(line.substring(2))}
        </h1>
      );
      i++;
    } else if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
      elements.push(
        <div key={`hr-${i}`} className="border-t border-border my-5" />
      );
      i++;
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')) {
      elements.push(
        <div key={`li-${i}`} className="flex gap-3 text-sm leading-relaxed text-foreground ml-4 py-0.5">
          <span className="text-primary mt-0.5">•</span>
          <span>{formatInlineMarkdown(line.trim().substring(2))}</span>
        </div>
      );
      i++;
    } else if (/^\d+\. /.test(line.trim())) {
      const match = line.trim().match(/^(\d+)\. (.*)$/);
      if (match) {
        elements.push(
          <h3 key={`ol-${i}`} className="text-lg font-bold text-foreground mt-5 mb-2">
            {match[1]}. {formatInlineMarkdown(match[2])}
          </h3>
        );
      }
      i++;
    } else {
      elements.push(
        <p key={`text-${i}`} className="text-sm leading-relaxed text-muted-foreground">
          {formatInlineMarkdown(line)}
        </p>
      );
      i++;
    }
  }

  return <div className="space-y-1">{elements}</div>;
}

function getContentFromPlanData(content: any): string {
  if (!content) return '';
  
  if (typeof content === 'string') {
    return content;
  }
  
  if (typeof content === 'object') {
    const textContent = (content as any).content;
    if (textContent && typeof textContent === 'string') {
      return textContent;
    }
    
    const sections = (content as any).sections;
    if (sections && Array.isArray(sections)) {
      return sections.map((section: any) => {
        let text = '';
        if (section.heading) {
          text += `## ${section.heading}\n\n`;
        }
        if (section.content) {
          text += `${section.content}\n\n`;
        }
        return text;
      }).join('\n');
    }
  }
  
  return '';
}

function getWeekDates(baseDate: Date, weekStartDay: string = "Mon"): Date[] {
  const startOffset = DAY_NAMES.indexOf(weekStartDay);
  const start = startOfWeek(baseDate, { weekStartsOn: startOffset === -1 ? 1 : (startOffset as 0 | 1 | 2 | 3 | 4 | 5 | 6) });
  return eachDayOfInterval({ start, end: addDays(start, 6) });
}

function DayChips({ 
  weekDates, 
  selectedDate, 
  onSelectDate 
}: { 
  weekDates: Date[]; 
  selectedDate: Date; 
  onSelectDate: (date: Date) => void;
}) {
  return (
    <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
      {weekDates.map((date) => {
        const isSelected = isSameDay(date, selectedDate);
        const isTodayDate = isToday(date);
        
        return (
          <button
            key={date.toISOString()}
            onClick={() => onSelectDate(date)}
            className={cn(
              "flex flex-col items-center flex-shrink-0 min-w-[44px] sm:min-w-[56px] py-2 px-1.5 sm:p-3 rounded-lg border transition-all touch-manipulation",
              isSelected 
                ? "border-primary bg-primary/5 text-primary" 
                : "border-border hover-elevate"
            )}
            data-testid={`day-chip-${format(date, 'yyyy-MM-dd')}`}
          >
            <span className={cn(
              "text-[10px] sm:text-xs font-medium uppercase",
              isSelected ? "text-primary" : "text-muted-foreground"
            )}>
              {format(date, 'EEE')}
            </span>
            <span className={cn(
              "text-xs sm:text-sm font-semibold",
              isSelected ? "text-primary" : "text-foreground"
            )}>
              {format(date, 'd')}
            </span>
            {isTodayDate && (
              <div className={cn(
                "w-1.5 h-1.5 rounded-full mt-1",
                isSelected ? "bg-primary" : "bg-primary/60"
              )} />
            )}
          </button>
        );
      })}
    </div>
  );
}

function ExerciseItem({ 
  exercise, 
  onToggle 
}: { 
  exercise: Exercise; 
  onToggle: (id: string, completed: boolean) => void;
}) {
  const isCompleted = exercise.completed ?? false;
  
  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 sm:p-4 rounded-lg border transition-all",
        isCompleted ? "bg-primary/5 border-primary/30" : "bg-card border-border"
      )}
      data-testid={`exercise-item-${exercise.id}`}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) => onToggle(exercise.id, checked as boolean)}
        className="mt-0.5 h-5 w-5"
        data-testid={`checkbox-exercise-${exercise.id}`}
      />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-sm sm:text-base",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {exercise.name}
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {exercise.sets} sets • {exercise.reps} reps
        </p>
        {exercise.note && (
          <p className="text-xs text-primary/70 mt-1 flex items-center gap-1">
            <span className="text-amber-500">💡</span> {exercise.note}
          </p>
        )}
      </div>
    </div>
  );
}

function MealItem({ 
  meal, 
  onToggle 
}: { 
  meal: Meal; 
  onToggle: (id: string, completed: boolean) => void;
}) {
  const isCompleted = meal.completed ?? false;
  
  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 sm:p-4 rounded-lg border transition-all",
        isCompleted ? "bg-primary/5 border-primary/30" : "bg-card border-border"
      )}
      data-testid={`meal-item-${meal.id}`}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) => onToggle(meal.id, checked as boolean)}
        className="mt-0.5 h-5 w-5"
        data-testid={`checkbox-meal-${meal.id}`}
      />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] uppercase text-muted-foreground font-medium">{meal.type}</span>
        <p className={cn(
          "font-medium text-sm sm:text-base",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {meal.name}
        </p>
        {(meal.calories || meal.protein) && (
          <div className="flex gap-2 text-xs text-muted-foreground mt-1">
            {meal.calories && <span>{meal.calories} cal</span>}
            {meal.protein && <span className="text-blue-500">P:{meal.protein}g</span>}
            {meal.carbs && <span className="text-amber-500">C:{meal.carbs}g</span>}
            {meal.fat && <span className="text-rose-500">F:{meal.fat}g</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function HabitItem({ 
  habit, 
  onToggle 
}: { 
  habit: Habit; 
  onToggle: (id: string, completed: boolean) => void;
}) {
  const isCompleted = habit.completed ?? false;
  
  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 sm:p-4 rounded-lg border transition-all",
        isCompleted ? "bg-primary/5 border-primary/30" : "bg-card border-border"
      )}
      data-testid={`habit-item-${habit.id}`}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) => onToggle(habit.id, checked as boolean)}
        className="h-5 w-5"
        data-testid={`checkbox-habit-${habit.id}`}
      />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-sm sm:text-base",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {habit.name}
        </p>
        <p className="text-xs text-muted-foreground">{habit.frequency}</p>
      </div>
    </div>
  );
}

function TrainingSection({ 
  training, 
  selectedDate,
  onToggleExercise 
}: { 
  training: TrainingDay[]; 
  selectedDate: Date;
  onToggleExercise: (exerciseId: string, completed: boolean) => void;
}) {
  const dayName = format(selectedDate, 'EEEE');
  const todayTraining = training.find(t => 
    t.day.toLowerCase() === dayName.toLowerCase() || 
    (t.date && isSameDay(parseISO(t.date), selectedDate))
  );
  
  if (!todayTraining || todayTraining.exercises.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Dumbbell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No training scheduled for {dayName}</p>
        </CardContent>
      </Card>
    );
  }
  
  const completedCount = todayTraining.exercises.filter(e => e.completed).length;
  const totalCount = todayTraining.exercises.length;
  
  return (
    <Accordion type="single" defaultValue="training" collapsible>
      <AccordionItem value="training" className="border rounded-lg">
        <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-training">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-primary/10">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{todayTraining.title}</p>
              <p className="text-sm text-muted-foreground">
                {completedCount} of {totalCount} exercises
                {todayTraining.duration && ` • ${todayTraining.duration} min`}
              </p>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-2">
            {todayTraining.exercises.map((exercise) => (
              <ExerciseItem 
                key={exercise.id} 
                exercise={exercise} 
                onToggle={onToggleExercise}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function NutritionSection({ 
  nutrition, 
  selectedDate,
  onToggleMeal 
}: { 
  nutrition: NutritionDay[]; 
  selectedDate: Date;
  onToggleMeal: (mealId: string, completed: boolean) => void;
}) {
  const dayName = format(selectedDate, 'EEEE');
  const todayNutrition = nutrition.find(n => 
    n.day.toLowerCase() === dayName.toLowerCase() ||
    (n.date && isSameDay(parseISO(n.date), selectedDate))
  );
  
  if (!todayNutrition || todayNutrition.meals.length === 0) {
    return null;
  }
  
  const completedCount = todayNutrition.meals.filter(m => m.completed).length;
  const totalCount = todayNutrition.meals.length;
  
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="nutrition" className="border rounded-lg">
        <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-nutrition">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <UtensilsCrossed className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Nutrition Plan</p>
              <p className="text-sm text-muted-foreground">
                {completedCount} of {totalCount} meals
              </p>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-2">
            {todayNutrition.meals.map((meal) => (
              <MealItem 
                key={meal.id} 
                meal={meal} 
                onToggle={onToggleMeal}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function HabitsSection({ 
  habits,
  onToggleHabit 
}: { 
  habits: Habit[];
  onToggleHabit: (habitId: string, completed: boolean) => void;
}) {
  if (!habits || habits.length === 0) return null;
  
  const completedCount = habits.filter(h => h.completed).length;
  const totalCount = habits.length;
  
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="habits" className="border rounded-lg">
        <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-habits">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Target className="w-5 h-5 text-violet-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Daily Habits</p>
              <p className="text-sm text-muted-foreground">
                {completedCount} of {totalCount} habits
              </p>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-2">
            {habits.map((habit) => (
              <HabitItem 
                key={habit.id} 
                habit={habit} 
                onToggle={onToggleHabit}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function ThisWeekTab({ 
  planData, 
  onViewProgram,
  clientId
}: { 
  planData: MyPlanData;
  onViewProgram: () => void;
  clientId: string;
}) {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [localCompletions, setLocalCompletions] = useState<Record<string, Record<string, boolean>>>({});
  
  const weekDates = useMemo(() => {
    const baseDate = currentWeekOffset === 0 
      ? new Date() 
      : addWeeks(new Date(), currentWeekOffset);
    return getWeekDates(baseDate, planData.weekStartDay);
  }, [currentWeekOffset, planData.weekStartDay]);
  
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  
  const { data: currentWeekPlan, isLoading: isLoadingWeekPlan } = useQuery<any>({
    queryKey: [`/api/client-plans/my-current-week?weekStartDate=${weekStartStr}&weekEndDate=${weekEndStr}`],
    enabled: !!clientId,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });
  
  const weeklyContent = currentWeekPlan?.planContent as WeeklyProgramContent | null;
  const planId = currentWeekPlan?.id || null;
  
  const { data: serverCompletions, isLoading: isLoadingCompletions } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/client/plan-completions", planId, dateKey],
    enabled: !!planId,
  });
  
  const completionMutation = useMutation({
    mutationFn: async (data: { itemId: string; itemType: string; completed: boolean }) => {
      const response = await apiRequest("POST", "/api/client/plan-completions", {
        planId,
        itemId: data.itemId,
        itemType: data.itemType,
        date: dateKey,
        completed: data.completed,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/plan-completions", planId, dateKey] });
      setLocalCompletions(prev => {
        const { [dateKey]: _, ...rest } = prev;
        return rest;
      });
    },
    onError: () => {
      setLocalCompletions(prev => {
        const { [dateKey]: _, ...rest } = prev;
        return rest;
      });
    },
  });
  
  const dateLocalCompletions = localCompletions[dateKey] || {};
  const completions: Record<string, boolean> = useMemo(() => {
    const base = serverCompletions ?? {};
    return { ...base, ...dateLocalCompletions };
  }, [serverCompletions, dateLocalCompletions]);
  
  const handleToggle = (itemId: string, itemType: string, completed: boolean) => {
    setLocalCompletions(prev => ({
      ...prev,
      [dateKey]: { ...(prev[dateKey] || {}), [itemId]: completed },
    }));
    if (planId) {
      completionMutation.mutate({ itemId, itemType, completed });
    }
  };
  
  const handleToggleExercise = (exerciseId: string, completed: boolean) => {
    handleToggle(exerciseId, 'exercise', completed);
  };
  
  const handleToggleMeal = (mealId: string, completed: boolean) => {
    handleToggle(mealId, 'meal', completed);
  };
  
  const handleToggleHabit = (habitId: string, completed: boolean) => {
    handleToggle(habitId, 'habit', completed);
  };
  
  const training = useMemo(() => {
    const rawTraining = weeklyContent?.training || [];
    return rawTraining.map(day => ({
      ...day,
      exercises: day.exercises.map(ex => ({
        ...ex,
        completed: completions[ex.id] ?? ex.completed ?? false,
      })),
    }));
  }, [weeklyContent?.training, completions]);
  
  const nutrition = useMemo(() => {
    const rawNutrition = weeklyContent?.nutrition || [];
    return rawNutrition.map(day => ({
      ...day,
      meals: day.meals.map(meal => ({
        ...meal,
        completed: completions[meal.id] ?? meal.completed ?? false,
      })),
    }));
  }, [weeklyContent?.nutrition, completions]);
  
  const habits = useMemo(() => {
    const rawHabits = weeklyContent?.habits || [];
    return rawHabits.map(habit => ({
      ...habit,
      completed: completions[habit.id] ?? habit.completed ?? false,
    }));
  }, [weeklyContent?.habits, completions]);
  
  const dayName = format(selectedDate, 'EEEE');
  const todayTraining = training.find(t => t.day.toLowerCase() === dayName.toLowerCase());
  const todayNutrition = nutrition.find(n => n.day.toLowerCase() === dayName.toLowerCase());
  
  const totalItems = (todayTraining?.exercises.length || 0) + 
                     (todayNutrition?.meals.length || 0) + 
                     (habits.length || 0);
  const completedItems = (todayTraining?.exercises.filter(e => e.completed).length || 0) +
                         (todayNutrition?.meals.filter(m => m.completed).length || 0) +
                         (habits.filter(h => h.completed).length || 0);
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  
  return (
    <div className="space-y-3 sm:space-y-4">
      {planData.program && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm sm:text-base text-foreground truncate">{planData.program.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Week {weeklyContent?.week || 1} of {weeklyContent?.totalWeeks || 12}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onViewProgram}
              className="text-primary flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3"
              data-testid="button-view-program"
            >
              <span className="hidden sm:inline">View Full Program</span>
              <span className="sm:hidden">View</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentWeekOffset(prev => prev - 1)}
              className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
              data-testid="button-prev-week"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>
            
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center">
              {currentWeekOffset === 0 && (
                <Badge variant="outline" className="text-primary border-primary text-[10px] sm:text-xs px-1.5 sm:px-2">
                  <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                  Current
                </Badge>
              )}
              <span className="text-xs sm:text-sm text-muted-foreground">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentWeekOffset(prev => prev + 1)}
              className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
              data-testid="button-next-week"
            >
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <DayChips
            weekDates={weekDates}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm sm:text-base text-foreground">{dayName}'s Progress</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {completedItems} of {totalItems} completed
              </p>
            </div>
            <span className="text-lg sm:text-xl font-bold text-primary flex-shrink-0">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>
      
      <div className="space-y-2 sm:space-y-3">
        <TrainingSection 
          training={training}
          selectedDate={selectedDate}
          onToggleExercise={handleToggleExercise}
        />
        <NutritionSection 
          nutrition={nutrition}
          selectedDate={selectedDate}
          onToggleMeal={handleToggleMeal}
        />
        <HabitsSection 
          habits={habits}
          onToggleHabit={handleToggleHabit}
        />
      </div>
    </div>
  );
}

function MyProgramTab({ planData }: { planData: MyPlanData }) {
  const program = planData.program;
  const planContent = program?.content ? getContentFromPlanData(program.content) : '';
  
  if (!program) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Target className="w-16 h-16 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Program Yet</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Your coach hasn't assigned a program to you yet. Check back soon!
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2" data-testid="text-program-name">
          {program.name}
        </CardTitle>
        {program.description && (
          <p className="text-sm text-muted-foreground">{program.description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {planContent ? (
          <MarkdownRenderer content={planContent} />
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed text-center py-8">
            Plan content is not available. Please contact your coach.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClientPlan() {
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("this-week");
  
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

  const { data: planData, isLoading: isLoadingPlan } = useQuery<MyPlanData>({
    queryKey: ["/api/client/my-plan"],
    enabled: !!clientId,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  const isLoading = isVerifying || isLoadingPlan;

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

  const effectivePlanData: MyPlanData = planData || {
    weekStartDay: "Mon",
    weeklyExists: false,
    program: null,
    scheduleItems: [],
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-plan-title">
            My Plan
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Your personalized program and weekly schedule
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-xs" data-testid="tabs-plan-type">
            <TabsTrigger value="this-week" data-testid="tab-this-week">
              This Week
            </TabsTrigger>
            <TabsTrigger value="my-program" data-testid="tab-my-program">
              My Program
            </TabsTrigger>
          </TabsList>

          <TabsContent value="this-week" className="mt-4">
            <ThisWeekTab 
              planData={effectivePlanData}
              onViewProgram={() => setActiveTab("my-program")}
              clientId={clientId!}
            />
          </TabsContent>

          <TabsContent value="my-program" className="mt-4">
            <MyProgramTab planData={effectivePlanData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
