import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Dumbbell, UtensilsCrossed, CheckCircle2, ClipboardList, Calendar, ChevronLeft, ChevronRight, Target, Trophy } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Client } from "@shared/schema";
import { cn } from "@/lib/utils";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  note?: string;
  completed?: boolean;
}

interface TrainingDay {
  day: string;
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
  completed?: boolean;
}

interface NutritionDay {
  day: string;
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

const mockTrainingDays: TrainingDay[] = [
  {
    day: "Monday",
    title: "Upper Body Strength",
    exercises: [
      { id: "1", name: "Dumbbell Bench Press", sets: 3, reps: 12, note: "Focus on controlled movement", completed: true },
      { id: "2", name: "Bent-over Rows", sets: 3, reps: 12, note: "Keep back straight", completed: false },
      { id: "3", name: "Shoulder Press", sets: 3, reps: 10, completed: false },
    ],
  },
  {
    day: "Wednesday",
    title: "Lower Body & Core",
    exercises: [
      { id: "4", name: "Squats", sets: 4, reps: 15, completed: false },
      { id: "5", name: "Romanian Deadlifts", sets: 3, reps: 12, completed: false },
      { id: "6", name: "Lunges", sets: 3, reps: 10, completed: false },
    ],
  },
  {
    day: "Friday",
    title: "Full Body Circuit",
    exercises: [
      { id: "7", name: "Kettlebell Swings", sets: 4, reps: 15, completed: false },
      { id: "8", name: "Push-ups", sets: 3, reps: 20, completed: false },
    ],
  },
];

const mockNutritionDays: NutritionDay[] = [
  {
    day: "Monday",
    title: "High protein day",
    meals: [
      { id: "m1", type: "Breakfast", name: "Oats and berries", calories: 420, protein: 30, carbs: 45, fat: 12, completed: true },
      { id: "m2", type: "Lunch", name: "Grilled chicken salad", calories: 550, protein: 45, carbs: 25, fat: 28, completed: true },
      { id: "m3", type: "Dinner", name: "Salmon with vegetables", calories: 620, protein: 42, carbs: 30, fat: 35, completed: false },
    ],
  },
  {
    day: "Tuesday",
    title: "Recovery nutrition",
    meals: [
      { id: "m4", type: "Breakfast", name: "Eggs and avocado toast", calories: 480, protein: 25, carbs: 35, fat: 28, completed: false },
      { id: "m5", type: "Lunch", name: "Turkey wrap", calories: 520, protein: 38, carbs: 42, fat: 22, completed: false },
    ],
  },
];

const mockHabits: Habit[] = [
  { id: "h1", name: "Drink 2 liters of water", frequency: "Daily", completed: true },
  { id: "h2", name: "10 minutes stretching", frequency: "Daily", completed: true },
  { id: "h3", name: "Take vitamins", frequency: "Daily", completed: false },
  { id: "h4", name: "30 minute walk", frequency: "3x per week", completed: false },
];

const mockTasks: Task[] = [
  { id: "t1", name: "Submit food log", dueDay: "Mon", completed: true },
  { id: "t2", name: "Weigh in", dueDay: "Wed", completed: false },
  { id: "t3", name: "Send progress photos", dueDay: "Fri", completed: false },
];

function getDayOfWeek(): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date().getDay()];
}

export default function ClientWeeklyPlan() {
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [weekIndex, setWeekIndex] = useState(1);
  const [trainingDays, setTrainingDays] = useState(mockTrainingDays);
  const [nutritionDays, setNutritionDays] = useState(mockNutritionDays);
  const [habits, setHabits] = useState(mockHabits);
  const [tasks, setTasks] = useState(mockTasks);

  useEffect(() => {
    const storedClientId = localStorage.getItem("clientId");
    if (!storedClientId) {
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

  const today = getDayOfWeek();

  const toggleExercise = (dayIndex: number, exerciseId: string) => {
    setTrainingDays(prev => prev.map((day, i) => {
      if (i !== dayIndex) return day;
      return {
        ...day,
        exercises: day.exercises.map(ex => 
          ex.id === exerciseId ? { ...ex, completed: !ex.completed } : ex
        )
      };
    }));
  };

  const toggleMeal = (dayIndex: number, mealId: string) => {
    setNutritionDays(prev => prev.map((day, i) => {
      if (i !== dayIndex) return day;
      return {
        ...day,
        meals: day.meals.map(meal => 
          meal.id === mealId ? { ...meal, completed: !meal.completed } : meal
        )
      };
    }));
  };

  const toggleHabit = (habitId: string) => {
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, completed: !h.completed } : h));
  };

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const totalExercises = trainingDays.reduce((acc, day) => acc + day.exercises.length, 0);
  const completedExercises = trainingDays.reduce((acc, day) => acc + day.exercises.filter(e => e.completed).length, 0);
  const totalMeals = nutritionDays.reduce((acc, day) => acc + day.meals.length, 0);
  const completedMeals = nutritionDays.reduce((acc, day) => acc + day.meals.filter(m => m.completed).length, 0);
  const completedHabits = habits.filter(h => h.completed).length;
  const completedTasks = tasks.filter(t => t.completed).length;

  const overallProgress = Math.round(
    ((completedExercises + completedMeals + completedHabits + completedTasks) / 
    (totalExercises + totalMeals + habits.length + tasks.length)) * 100
  );

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#28A0AE]" data-testid="loader-weekly-plan" />
      </div>
    );
  }

  if (!clientData) {
    return null;
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" data-testid="text-weekly-plan-title">
              <Calendar className="w-7 h-7 text-[#28A0AE]" />
              My Weekly Program
            </h1>
            <p className="text-muted-foreground mt-1">Week {weekIndex} • Today is {today}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekIndex(prev => Math.max(1, prev - 1))}
              disabled={weekIndex === 1}
              data-testid="button-prev-week"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Badge className="px-3 bg-[#E2F9AD] text-[#1a1a1a] hover:bg-[#E2F9AD]">Week {weekIndex}</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekIndex(prev => prev + 1)}
              data-testid="button-next-week"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Card className="border-2 border-[#28A0AE]/20 overflow-hidden">
          <div className="bg-gradient-to-r from-[#28A0AE] to-[#28A0AE]/80 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-white text-xl font-bold">Weekly Progress</h2>
                  <p className="text-white/80 text-sm">Keep going, you're doing great!</p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-4xl sm:text-5xl font-bold text-white">{overallProgress}%</div>
                <p className="text-white/80 text-sm">Complete</p>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={overallProgress} className="h-3 bg-white/20" />
            </div>
          </div>
          <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Dumbbell className="w-5 h-5 mx-auto text-[#28A0AE] mb-1" />
              <div className="text-lg font-bold">{completedExercises}/{totalExercises}</div>
              <div className="text-xs text-muted-foreground">Exercises</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <UtensilsCrossed className="w-5 h-5 mx-auto text-[#28A0AE] mb-1" />
              <div className="text-lg font-bold">{completedMeals}/{totalMeals}</div>
              <div className="text-xs text-muted-foreground">Meals</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="w-5 h-5 mx-auto text-[#28A0AE] mb-1" />
              <div className="text-lg font-bold">{completedHabits}/{habits.length}</div>
              <div className="text-xs text-muted-foreground">Habits</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <ClipboardList className="w-5 h-5 mx-auto text-[#28A0AE] mb-1" />
              <div className="text-lg font-bold">{completedTasks}/{tasks.length}</div>
              <div className="text-xs text-muted-foreground">Tasks</div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="training" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="training" className="gap-1 py-2 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white" data-testid="tab-training">
              <Dumbbell className="w-4 h-4" />
              <span className="hidden sm:inline">Training</span>
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="gap-1 py-2 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white" data-testid="tab-nutrition">
              <UtensilsCrossed className="w-4 h-4" />
              <span className="hidden sm:inline">Nutrition</span>
            </TabsTrigger>
            <TabsTrigger value="habits" className="gap-1 py-2 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white" data-testid="tab-habits">
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">Habits</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1 py-2 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white" data-testid="tab-tasks">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="training" className="space-y-4">
            {trainingDays.map((day, dayIndex) => (
              <Card key={day.day} className={cn(
                "overflow-hidden transition-all",
                day.day === today && "ring-2 ring-[#28A0AE] ring-offset-2"
              )} data-testid={`card-training-${day.day.toLowerCase()}`}>
                <div className="bg-[#28A0AE] px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-white text-[#28A0AE] font-semibold border-0">
                      {day.day}
                    </Badge>
                    <span className="text-white font-medium">{day.title}</span>
                  </div>
                  {day.day === today && (
                    <Badge className="bg-[#E2F9AD] text-[#1a1a1a]">Today</Badge>
                  )}
                </div>
                <CardContent className="p-4 space-y-2">
                  {day.exercises.map((exercise) => (
                    <div 
                      key={exercise.id} 
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                        exercise.completed ? "bg-[#E2F9AD]/20 border-[#E2F9AD]" : "bg-card"
                      )}
                      data-testid={`exercise-${exercise.id}`}
                    >
                      <Checkbox 
                        checked={exercise.completed}
                        onCheckedChange={() => toggleExercise(dayIndex, exercise.id)}
                        className="mt-0.5 data-[state=checked]:bg-[#28A0AE] data-[state=checked]:border-[#28A0AE]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium text-sm", exercise.completed && "line-through opacity-70")}>{exercise.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {exercise.sets} sets × {exercise.reps} reps
                        </p>
                        {exercise.note && (
                          <p className="text-xs text-[#28A0AE] mt-1">{exercise.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="nutrition" className="space-y-4">
            {nutritionDays.map((day, dayIndex) => (
              <Card key={day.day} className={cn(
                "overflow-hidden transition-all",
                day.day === today && "ring-2 ring-[#28A0AE] ring-offset-2"
              )} data-testid={`card-nutrition-${day.day.toLowerCase()}`}>
                <div className="bg-[#28A0AE] px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-white text-[#28A0AE] font-semibold border-0">
                      {day.day}
                    </Badge>
                    <span className="text-white font-medium">{day.title}</span>
                  </div>
                  {day.day === today && (
                    <Badge className="bg-[#E2F9AD] text-[#1a1a1a]">Today</Badge>
                  )}
                </div>
                <CardContent className="p-4 space-y-2">
                  {day.meals.map((meal) => (
                    <div 
                      key={meal.id} 
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                        meal.completed ? "bg-[#E2F9AD]/20 border-[#E2F9AD]" : "bg-card"
                      )}
                      data-testid={`meal-${meal.id}`}
                    >
                      <Checkbox 
                        checked={meal.completed}
                        onCheckedChange={() => toggleMeal(dayIndex, meal.id)}
                        className="mt-0.5 data-[state=checked]:bg-[#28A0AE] data-[state=checked]:border-[#28A0AE]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-medium text-sm", meal.completed && "line-through opacity-70")}>{meal.type}</span>
                          <span className={cn("text-sm text-muted-foreground", meal.completed && "line-through opacity-70")}>- {meal.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {meal.calories} kcal • {meal.protein}g P • {meal.carbs}g C • {meal.fat}g F
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="habits" className="space-y-4">
            <Card data-testid="card-habits">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#28A0AE]" />
                  Daily Habits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {habits.map((habit) => (
                  <div 
                    key={habit.id} 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      habit.completed ? "bg-[#E2F9AD]/20 border-[#E2F9AD]" : "bg-card"
                    )}
                    data-testid={`habit-${habit.id}`}
                  >
                    <Checkbox 
                      checked={habit.completed}
                      onCheckedChange={() => toggleHabit(habit.id)}
                      className="data-[state=checked]:bg-[#28A0AE] data-[state=checked]:border-[#28A0AE]"
                    />
                    <label 
                      className={cn("flex-1 text-sm cursor-pointer", habit.completed && "line-through opacity-70")}
                      onClick={() => toggleHabit(habit.id)}
                    >
                      {habit.name}
                    </label>
                    <Badge variant="outline" className="text-xs">{habit.frequency}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card data-testid="card-tasks">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[#28A0AE]" />
                  Weekly Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      task.completed ? "bg-[#E2F9AD]/20 border-[#E2F9AD]" : "bg-card"
                    )}
                    data-testid={`task-${task.id}`}
                  >
                    <Checkbox 
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="data-[state=checked]:bg-[#28A0AE] data-[state=checked]:border-[#28A0AE]"
                    />
                    <label 
                      className={cn("flex-1 text-sm cursor-pointer", task.completed && "line-through opacity-70")}
                      onClick={() => toggleTask(task.id)}
                    >
                      {task.name}
                    </label>
                    <Badge variant="outline" className="text-xs">Due: {task.dueDay}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
