import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Copy, Eye, Calendar, Dumbbell, UtensilsCrossed, CheckCircle2, ClipboardList, Send, Trash2, Plus, Check, X, RotateCcw } from "lucide-react";
import type { Client } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface WeeklyProgramViewProps {
  role?: "coach" | "client";
  clientName?: string;
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  note?: string;
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
      { id: "1", name: "Dumbbell Bench Press", sets: 3, reps: 12, note: "Focus on controlled movement" },
      { id: "2", name: "Bent Over Rows", sets: 3, reps: 10 },
      { id: "3", name: "Shoulder Press", sets: 3, reps: 12 },
      { id: "4", name: "Bicep Curls", sets: 3, reps: 15 },
    ],
  },
  {
    day: "Wednesday",
    title: "Lower Body & Core",
    exercises: [
      { id: "5", name: "Barbell Squats", sets: 4, reps: 10, note: "Keep chest up, depth to parallel" },
      { id: "6", name: "Romanian Deadlifts", sets: 3, reps: 12 },
      { id: "7", name: "Lunges", sets: 3, reps: 10 },
      { id: "8", name: "Plank Hold", sets: 3, reps: 60 },
    ],
  },
  {
    day: "Friday",
    title: "Full Body Circuit",
    exercises: [
      { id: "9", name: "Kettlebell Swings", sets: 4, reps: 15 },
      { id: "10", name: "Push-ups", sets: 3, reps: 20 },
      { id: "11", name: "Mountain Climbers", sets: 3, reps: 30 },
    ],
  },
];

const mockNutritionDays: NutritionDay[] = [
  {
    day: "Monday",
    title: "High protein, moderate carbs",
    meals: [
      { id: "m1", type: "Breakfast", name: "Oats and berries", calories: 420, protein: 30, carbs: 45, fat: 12 },
      { id: "m2", type: "Lunch", name: "Grilled chicken salad", calories: 550, protein: 45, carbs: 25, fat: 28 },
      { id: "m3", type: "Dinner", name: "Salmon with vegetables", calories: 620, protein: 42, carbs: 30, fat: 35 },
      { id: "m4", type: "Snacks", name: "Greek yogurt, almonds", calories: 280, protein: 18, carbs: 15, fat: 16 },
    ],
  },
  {
    day: "Tuesday",
    title: "Recovery day nutrition",
    meals: [
      { id: "m5", type: "Breakfast", name: "Eggs and avocado toast", calories: 480, protein: 25, carbs: 35, fat: 28 },
      { id: "m6", type: "Lunch", name: "Turkey wrap", calories: 520, protein: 38, carbs: 42, fat: 22 },
      { id: "m7", type: "Dinner", name: "Lean beef stir-fry", calories: 580, protein: 40, carbs: 35, fat: 30 },
      { id: "m8", type: "Snacks", name: "Protein shake, banana", calories: 320, protein: 28, carbs: 38, fat: 6 },
    ],
  },
];

const mockHabits: Habit[] = [
  { id: "h1", name: "Drink 2 liters of water", frequency: "Daily", completed: false },
  { id: "h2", name: "10 minutes stretching", frequency: "Daily", completed: true },
  { id: "h3", name: "Take vitamins", frequency: "Daily", completed: false },
  { id: "h4", name: "30 minute walk", frequency: "3x per week", completed: false },
  { id: "h5", name: "Meal prep session", frequency: "Weekly", completed: false },
];

const mockTasks: Task[] = [
  { id: "t1", name: "Submit food log", dueDay: "Mon", completed: true },
  { id: "t2", name: "Weigh in", dueDay: "Wed", completed: false },
  { id: "t3", name: "Send progress photos", dueDay: "Fri", completed: false },
  { id: "t4", name: "Complete weekly check-in", dueDay: "Sun", completed: false },
];

function AiProgramBuilderPanel({ clientName }: { clientName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      role: "assistant",
      content: `Hi! I'm ready to help you build this week's program for ${clientName}. I can create:\n\n• Training sessions with exercises, sets and reps\n• Meal plans with macros and recipes\n• Daily habits to track\n• Weekly tasks and goals\n\nWhat would you like to add to this week's program?`,
    },
  ]);
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue,
    };

    const assistantResponse: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: getAiResponse(inputValue),
    };

    setMessages((prev) => [...prev, userMessage, assistantResponse]);
    setInputValue("");
  };

  const getAiResponse = (input: string): string => {
    const lower = input.toLowerCase();
    if (lower.includes("workout") || lower.includes("training") || lower.includes("exercise")) {
      return "I've drafted a new workout for you on the right. You can see it in the Training tab. Would you like me to add more exercises or modify anything?";
    }
    if (lower.includes("meal") || lower.includes("nutrition") || lower.includes("food")) {
      return "I've added a meal plan to the Nutrition tab. It includes balanced macros for your client's goals. Want me to adjust the calories or macros?";
    }
    if (lower.includes("habit")) {
      return "Added a new habit to track! Check the Habits tab to see it. Would you like to set a specific frequency for this habit?";
    }
    if (lower.includes("task")) {
      return "I've created a new task in the Tasks tab. Let me know if you'd like to set a specific due date or add more tasks.";
    }
    return "Got it! I've made the updates in the weekly editor on the right. Is there anything else you'd like to add or modify?";
  };

  return (
    <Card className="h-full flex flex-col" data-testid="card-ai-builder">
      <div className="bg-primary px-4 py-3 rounded-t-lg">
        <h3 className="text-primary-foreground font-semibold">AI Program Builder</h3>
        <p className="text-primary-foreground/80 text-sm">Tell me what to add: training, meals, habits, tasks</p>
      </div>
      <CardContent className="flex-1 flex flex-col p-4 gap-4">
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-lg p-3 text-sm whitespace-pre-line",
                  msg.role === "assistant"
                    ? "bg-muted text-foreground"
                    : "bg-primary text-primary-foreground ml-8"
                )}
                data-testid={`message-${msg.role}-${msg.id}`}
              >
                {msg.content}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Add upper body workout for Monday"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            data-testid="input-ai-message"
          />
          <Button size="icon" onClick={handleSend} data-testid="button-send-message">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TrainingTab({ days }: { days: TrainingDay[] }) {
  return (
    <Accordion type="multiple" defaultValue={["Monday"]} className="space-y-3">
      {days.map((day) => (
        <AccordionItem key={day.day} value={day.day} className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3" data-testid={`accordion-training-${day.day.toLowerCase()}`}>
            <div className="flex items-center gap-3 flex-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{day.day}</span>
              <Badge variant="secondary" className="ml-2">{day.title}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3">
              {day.exercises.map((exercise) => (
                <Card key={exercise.id} className="p-3" data-testid={`card-exercise-${exercise.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{exercise.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sets: {exercise.sets} &nbsp;&nbsp; Reps: {exercise.reps}
                      </p>
                      {exercise.note && (
                        <p className="text-xs text-primary mt-1">Coach note: {exercise.note}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
              <Button variant="ghost" size="sm" className="text-primary" data-testid={`button-add-exercise-${day.day.toLowerCase()}`}>
                <Plus className="w-4 h-4 mr-1" /> Add exercise
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function NutritionTab({ days }: { days: NutritionDay[] }) {
  return (
    <Accordion type="multiple" defaultValue={["Monday"]} className="space-y-3">
      {days.map((day) => (
        <AccordionItem key={day.day} value={day.day} className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3" data-testid={`accordion-nutrition-${day.day.toLowerCase()}`}>
            <div className="flex items-center gap-3 flex-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{day.day}</span>
              <span className="text-sm text-muted-foreground ml-2">{day.title}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3">
              {day.meals.map((meal) => (
                <Card key={meal.id} className="p-3" data-testid={`card-meal-${meal.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{meal.type}</span>
                        <span className="text-sm text-muted-foreground">- {meal.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {meal.calories} kcal • {meal.protein}g protein • {meal.carbs}g carbs • {meal.fat}g fat
                      </p>
                      <button className="text-xs text-primary hover:underline mt-1">View recipe</button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
              <Button variant="ghost" size="sm" className="text-primary" data-testid={`button-add-meal-${day.day.toLowerCase()}`}>
                <Plus className="w-4 h-4 mr-1" /> Add meal
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function HabitsTab({ habits }: { habits: Habit[] }) {
  const [localHabits, setLocalHabits] = useState(habits);

  const toggleHabit = (id: string) => {
    setLocalHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, completed: !h.completed } : h))
    );
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm text-muted-foreground">Weekly Habits</h4>
      <div className="space-y-2">
        {localHabits.map((habit) => (
          <Card key={habit.id} className="p-3" data-testid={`card-habit-${habit.id}`}>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={habit.completed}
                onCheckedChange={() => toggleHabit(habit.id)}
                data-testid={`checkbox-habit-${habit.id}`}
              />
              <span className={cn("flex-1 text-sm", habit.completed && "line-through text-muted-foreground")}>
                {habit.name}
              </span>
              <Badge variant="outline" className="text-xs">{habit.frequency}</Badge>
            </div>
          </Card>
        ))}
      </div>
      <Button variant="ghost" size="sm" className="text-primary" data-testid="button-add-habit">
        <Plus className="w-4 h-4 mr-1" /> Add habit
      </Button>
    </div>
  );
}

function TasksTab({ tasks }: { tasks: Task[] }) {
  const [localTasks, setLocalTasks] = useState(tasks);

  const toggleTask = (id: string) => {
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm text-muted-foreground">Weekly Tasks</h4>
      <div className="space-y-2">
        {localTasks.map((task) => (
          <Card key={task.id} className="p-3" data-testid={`card-task-${task.id}`}>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task.id)}
                data-testid={`checkbox-task-${task.id}`}
              />
              <span className={cn("flex-1 text-sm", task.completed && "line-through text-muted-foreground")}>
                {task.name}
              </span>
              <Badge variant="outline" className="text-xs">{task.dueDay}</Badge>
            </div>
          </Card>
        ))}
      </div>
      <Button variant="ghost" size="sm" className="text-primary" data-testid="button-add-task">
        <Plus className="w-4 h-4 mr-1" /> Add task
      </Button>
    </div>
  );
}

function WeeklyEditor() {
  return (
    <Card className="h-full" data-testid="card-weekly-editor">
      <Tabs defaultValue="training" className="h-full flex flex-col">
        <div className="border-b px-4 pt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="training" className="gap-1.5" data-testid="tab-training">
              <Dumbbell className="w-4 h-4" />
              <span className="hidden sm:inline">Training</span>
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="gap-1.5" data-testid="tab-nutrition">
              <UtensilsCrossed className="w-4 h-4" />
              <span className="hidden sm:inline">Nutrition</span>
            </TabsTrigger>
            <TabsTrigger value="habits" className="gap-1.5" data-testid="tab-habits">
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">Habits</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5" data-testid="tab-tasks">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
          </TabsList>
        </div>
        <CardContent className="flex-1 overflow-auto p-4">
          <TabsContent value="training" className="m-0">
            <TrainingTab days={mockTrainingDays} />
          </TabsContent>
          <TabsContent value="nutrition" className="m-0">
            <NutritionTab days={mockNutritionDays} />
          </TabsContent>
          <TabsContent value="habits" className="m-0">
            <HabitsTab habits={mockHabits} />
          </TabsContent>
          <TabsContent value="tasks" className="m-0">
            <TasksTab tasks={mockTasks} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}

function ProgressRing({ percentage }: { percentage: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-28 h-28">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="56"
          cy="56"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-muted"
        />
        <circle
          cx="56"
          cy="56"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-primary transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold">{percentage}%</span>
      </div>
    </div>
  );
}

function ClientTodayView({ clientName }: { clientName: string }) {
  const [exerciseStatus, setExerciseStatus] = useState<Record<string, boolean>>({});
  const [mealStatus, setMealStatus] = useState<Record<string, "done" | "modified" | "skipped" | null>>({});
  const [habitStatus, setHabitStatus] = useState<Record<string, boolean>>({});
  const [taskStatus, setTaskStatus] = useState<Record<string, boolean>>({});

  const todayWorkout = mockTrainingDays[0];
  const todayMeals = mockNutritionDays[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Your plan for this week</h2>
          <p className="text-muted-foreground">Week 1, Jan 6 - Jan 12, 2025</p>
        </div>
        <ProgressRing percentage={72} />
      </div>

      <Tabs defaultValue="this-week">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="this-week" data-testid="tab-client-this-week">This Week</TabsTrigger>
          <TabsTrigger value="all-weeks" data-testid="tab-client-all-weeks">All Weeks</TabsTrigger>
        </TabsList>

        <TabsContent value="this-week" className="mt-6">
          <Card data-testid="card-today">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Today - {todayWorkout.day}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" /> Workout: {todayWorkout.title}
                </h4>
                <div className="space-y-2">
                  {todayWorkout.exercises.map((ex) => (
                    <div key={ex.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <Checkbox
                        checked={exerciseStatus[ex.id] || false}
                        onCheckedChange={(checked) =>
                          setExerciseStatus((prev) => ({ ...prev, [ex.id]: !!checked }))
                        }
                        data-testid={`checkbox-client-exercise-${ex.id}`}
                      />
                      <span className={cn("text-sm", exerciseStatus[ex.id] && "line-through text-muted-foreground")}>
                        {ex.name} - {ex.sets}x{ex.reps}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4" /> Meals
                </h4>
                <div className="space-y-3">
                  {todayMeals.meals.map((meal) => (
                    <div key={meal.id} className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{meal.type}: {meal.name}</span>
                        <span className="text-xs text-muted-foreground">{meal.calories} kcal</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={mealStatus[meal.id] === "done" ? "default" : "outline"}
                          onClick={() => setMealStatus((prev) => ({ ...prev, [meal.id]: "done" }))}
                          className="h-7 text-xs"
                          data-testid={`button-meal-done-${meal.id}`}
                        >
                          <Check className="w-3 h-3 mr-1" /> Done
                        </Button>
                        <Button
                          size="sm"
                          variant={mealStatus[meal.id] === "modified" ? "default" : "outline"}
                          onClick={() => setMealStatus((prev) => ({ ...prev, [meal.id]: "modified" }))}
                          className="h-7 text-xs"
                          data-testid={`button-meal-modified-${meal.id}`}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" /> Modified
                        </Button>
                        <Button
                          size="sm"
                          variant={mealStatus[meal.id] === "skipped" ? "destructive" : "outline"}
                          onClick={() => setMealStatus((prev) => ({ ...prev, [meal.id]: "skipped" }))}
                          className="h-7 text-xs"
                          data-testid={`button-meal-skipped-${meal.id}`}
                        >
                          <X className="w-3 h-3 mr-1" /> Skipped
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Habits
                </h4>
                <div className="space-y-2">
                  {mockHabits.filter(h => h.frequency === "Daily").map((habit) => (
                    <div key={habit.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <Checkbox
                        checked={habitStatus[habit.id] || false}
                        onCheckedChange={(checked) =>
                          setHabitStatus((prev) => ({ ...prev, [habit.id]: !!checked }))
                        }
                        data-testid={`checkbox-client-habit-${habit.id}`}
                      />
                      <span className={cn("text-sm", habitStatus[habit.id] && "line-through text-muted-foreground")}>
                        {habit.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" /> Tasks Due Today
                </h4>
                <div className="space-y-2">
                  {mockTasks.filter(t => t.dueDay === "Mon").map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <Checkbox
                        checked={taskStatus[task.id] || false}
                        onCheckedChange={(checked) =>
                          setTaskStatus((prev) => ({ ...prev, [task.id]: !!checked }))
                        }
                        data-testid={`checkbox-client-task-${task.id}`}
                      />
                      <span className={cn("text-sm", taskStatus[task.id] && "line-through text-muted-foreground")}>
                        {task.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-weeks" className="mt-6">
          <Card className="p-4" data-testid="card-all-weeks">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Week 1</p>
                <p className="text-sm text-muted-foreground">Jan 6 - Jan 12, 2025</p>
              </div>
              <Badge>72% complete</Badge>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CoachView({ clientName, weekIndex, onSwitchView }: { clientName: string; weekIndex: number; onSwitchView: () => void }) {
  const [localWeekIndex, setLocalWeekIndex] = useState(weekIndex);

  const getWeekStartDate = (weekNum: number) => {
    const baseDate = new Date(2025, 0, 6);
    baseDate.setDate(baseDate.getDate() + (weekNum - 1) * 7);
    return baseDate.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-week-title">Weekly Program for {clientName}</h2>
            <p className="text-muted-foreground text-sm">Week {localWeekIndex}, starting {getWeekStartDate(localWeekIndex)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onSwitchView} data-testid="button-switch-view">
              <Eye className="w-4 h-4 mr-2" /> Switch to Client View
            </Button>
            <Button variant="outline" data-testid="button-copy-week">
              <Copy className="w-4 h-4 mr-2" /> Copy to Next Week
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocalWeekIndex((prev) => Math.max(1, prev - 1))}
            disabled={localWeekIndex === 1}
            data-testid="button-prev-week"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <Badge variant="secondary" className="px-4 py-1">Week {localWeekIndex}</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocalWeekIndex((prev) => prev + 1)}
            data-testid="button-next-week"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 min-h-[500px]">
          <AiProgramBuilderPanel clientName={clientName} />
        </div>
        <div className="lg:col-span-8 min-h-[500px]">
          <WeeklyEditor />
        </div>
      </div>
    </div>
  );
}

export default function WeeklyProgramView({ role = "coach", clientName: propClientName }: WeeklyProgramViewProps) {
  const [, params] = useRoute("/coach/weekly-program/:clientId");
  const clientId = params?.clientId;

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId,
  });

  const [currentRole, setCurrentRole] = useState<"coach" | "client">(role);
  const [weekIndex, setWeekIndex] = useState(1);

  const clientName = client?.name || propClientName || "Client";

  const handleSwitchView = () => {
    setCurrentRole((prev) => (prev === "coach" ? "client" : "coach"));
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Tabs defaultValue="this-week" className="space-y-6">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="this-week" data-testid="tab-this-week">This Week</TabsTrigger>
          <TabsTrigger value="main-plan" data-testid="tab-main-plan">Main Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="this-week">
          {currentRole === "coach" ? (
            <CoachView clientName={clientName} weekIndex={weekIndex} onSwitchView={handleSwitchView} />
          ) : (
            <div className="space-y-4">
              <Button variant="outline" onClick={handleSwitchView} data-testid="button-back-to-coach">
                <Eye className="w-4 h-4 mr-2" /> Switch to Coach View
              </Button>
              <ClientTodayView clientName={clientName} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="main-plan">
          <Card className="p-8 text-center" data-testid="card-main-plan-placeholder">
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">Main Plan</h3>
              <p className="text-muted-foreground">
                The overall training program and long-term plan for {clientName} will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
