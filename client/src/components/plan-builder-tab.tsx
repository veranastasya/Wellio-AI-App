import { useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Eye, Calendar, Dumbbell, UtensilsCrossed, CheckCircle2, ClipboardList, Send, Trash2, Plus, GripVertical, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PlanBuilderTabProps {
  clientName: string;
  onSwitchToClientView?: () => void;
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
      { id: "2", name: "Bent-over Rows", sets: 3, reps: 12, note: "Keep back straight" },
      { id: "3", name: "Shoulder Press", sets: 3, reps: 10 },
    ],
  },
  {
    day: "Wednesday",
    title: "Lower Body & Core",
    exercises: [
      { id: "4", name: "Squats", sets: 4, reps: 15 },
      { id: "5", name: "Romanian Deadlifts", sets: 3, reps: 12 },
      { id: "6", name: "Lunges", sets: 3, reps: 10 },
    ],
  },
  {
    day: "Friday",
    title: "Full Body Circuit",
    exercises: [
      { id: "7", name: "Kettlebell Swings", sets: 4, reps: 15 },
      { id: "8", name: "Push-ups", sets: 3, reps: 20 },
    ],
  },
];

const mockNutritionDays: NutritionDay[] = [
  {
    day: "Monday",
    title: "High protein day",
    meals: [
      { id: "m1", type: "Breakfast", name: "Oats and berries", calories: 420, protein: 30, carbs: 45, fat: 12 },
      { id: "m2", type: "Lunch", name: "Grilled chicken salad", calories: 550, protein: 45, carbs: 25, fat: 28 },
      { id: "m3", type: "Dinner", name: "Salmon with vegetables", calories: 620, protein: 42, carbs: 30, fat: 35 },
    ],
  },
  {
    day: "Tuesday",
    title: "Recovery nutrition",
    meals: [
      { id: "m4", type: "Breakfast", name: "Eggs and avocado toast", calories: 480, protein: 25, carbs: 35, fat: 28 },
      { id: "m5", type: "Lunch", name: "Turkey wrap", calories: 520, protein: 38, carbs: 42, fat: 22 },
    ],
  },
];

const mockHabits: Habit[] = [
  { id: "h1", name: "Drink 2 liters of water", frequency: "Daily", completed: false },
  { id: "h2", name: "10 minutes stretching", frequency: "Daily", completed: true },
  { id: "h3", name: "Take vitamins", frequency: "Daily", completed: false },
  { id: "h4", name: "30 minute walk", frequency: "3x per week", completed: false },
];

const mockTasks: Task[] = [
  { id: "t1", name: "Submit food log", dueDay: "Mon", completed: true },
  { id: "t2", name: "Weigh in", dueDay: "Wed", completed: false },
  { id: "t3", name: "Send progress photos", dueDay: "Fri", completed: false },
];

function AiProgramBuilderPanel({ clientName }: { clientName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      role: "assistant",
      content: `Hi! I'm ready to help you build this week's program for ${clientName}. I can create:\n\n• Training sessions with exercises, sets, and reps\n• Meal plans with macros and recipes\n• Daily habits to track\n• Weekly tasks and goals\n\nWhat would you like to add to this week's program?`,
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
    if (lower.includes("workout") || lower.includes("training") || lower.includes("exercise") || lower.includes("upper body")) {
      return "I've drafted a new workout on the right. You can see it in the Training tab. Would you like me to add more exercises or modify anything?";
    }
    if (lower.includes("meal") || lower.includes("nutrition") || lower.includes("food")) {
      return "I've added a meal plan to the Nutrition tab. It includes balanced macros for your client's goals.";
    }
    if (lower.includes("habit")) {
      return "Added a new habit to track! Check the Habits tab to see it.";
    }
    if (lower.includes("task")) {
      return "I've created a new task in the Tasks tab.";
    }
    return "Got it! I've made the updates in the weekly editor. Is there anything else you'd like to add?";
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden" data-testid="card-ai-builder">
      <div className="bg-[#E2F9AD] px-4 py-3 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[#1a1a1a]" />
        <div>
          <h3 className="text-[#1a1a1a] font-semibold text-sm">AI Program Builder</h3>
          <p className="text-[#1a1a1a]/70 text-xs">Tell me what to add - training, meals, habits, or tasks</p>
        </div>
      </div>
      <CardContent className="flex-1 flex flex-col p-4 gap-4 min-h-0">
        <ScrollArea className="flex-1">
          <div className="space-y-3 pr-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-lg p-3 text-sm whitespace-pre-line",
                  msg.role === "assistant"
                    ? "bg-muted text-foreground"
                    : "bg-primary text-primary-foreground ml-6"
                )}
                data-testid={`message-${msg.role}-${msg.id}`}
              >
                {msg.content}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-2 pt-2 border-t">
          <Input
            placeholder="e.g. Add upper body workout for Monday"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="text-sm"
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
    <div className="space-y-4">
      {days.map((day) => (
        <Card key={day.day} className="overflow-hidden" data-testid={`card-training-${day.day.toLowerCase()}`}>
          <div className="bg-[#E2F9AD] px-4 py-2.5 flex items-center gap-3">
            <GripVertical className="w-4 h-4 text-[#1a1a1a]/50" />
            <Calendar className="w-4 h-4 text-[#1a1a1a]" />
            <Badge variant="outline" className="bg-white border-[#1a1a1a]/20 text-[#1a1a1a] font-medium">
              {day.day}
            </Badge>
            <span className="text-[#1a1a1a] font-medium text-sm">{day.title}</span>
          </div>
          <CardContent className="p-4 space-y-3">
            {day.exercises.map((exercise) => (
              <div key={exercise.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card" data-testid={`exercise-${exercise.id}`}>
                <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{exercise.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sets: {exercise.sets} &nbsp;&nbsp; Reps: {exercise.reps}
                  </p>
                  {exercise.note && (
                    <p className="text-xs text-primary mt-1">Coach note: {exercise.note}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-primary w-full justify-start" data-testid={`button-add-exercise-${day.day.toLowerCase()}`}>
              <Plus className="w-4 h-4 mr-1" /> Add exercise
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NutritionTab({ days }: { days: NutritionDay[] }) {
  return (
    <div className="space-y-4">
      {days.map((day) => (
        <Card key={day.day} className="overflow-hidden" data-testid={`card-nutrition-${day.day.toLowerCase()}`}>
          <div className="bg-[#E2F9AD] px-4 py-2.5 flex items-center gap-3">
            <GripVertical className="w-4 h-4 text-[#1a1a1a]/50" />
            <Calendar className="w-4 h-4 text-[#1a1a1a]" />
            <Badge variant="outline" className="bg-white border-[#1a1a1a]/20 text-[#1a1a1a] font-medium">
              {day.day}
            </Badge>
            <span className="text-[#1a1a1a] font-medium text-sm">{day.title}</span>
          </div>
          <CardContent className="p-4 space-y-3">
            {day.meals.map((meal) => (
              <div key={meal.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card" data-testid={`meal-${meal.id}`}>
                <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{meal.type}</span>
                    <span className="text-sm text-muted-foreground">- {meal.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {meal.calories} kcal • {meal.protein}g protein • {meal.carbs}g carbs • {meal.fat}g fat
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-primary w-full justify-start" data-testid={`button-add-meal-${day.day.toLowerCase()}`}>
              <Plus className="w-4 h-4 mr-1" /> Add meal
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function HabitsTab({ habits }: { habits: Habit[] }) {
  return (
    <Card data-testid="card-habits">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Weekly Habits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {habits.map((habit) => (
          <div key={habit.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card" data-testid={`habit-${habit.id}`}>
            <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <CheckCircle2 className={cn("w-5 h-5 flex-shrink-0", habit.completed ? "text-primary" : "text-muted-foreground")} />
            <span className="flex-1 text-sm">{habit.name}</span>
            <Badge variant="outline" className="text-xs">{habit.frequency}</Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="text-primary w-full justify-start mt-2" data-testid="button-add-habit">
          <Plus className="w-4 h-4 mr-1" /> Add habit
        </Button>
      </CardContent>
    </Card>
  );
}

function TasksTab({ tasks }: { tasks: Task[] }) {
  return (
    <Card data-testid="card-tasks">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Weekly Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card" data-testid={`task-${task.id}`}>
            <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <CheckCircle2 className={cn("w-5 h-5 flex-shrink-0", task.completed ? "text-primary" : "text-muted-foreground")} />
            <span className="flex-1 text-sm">{task.name}</span>
            <Badge variant="outline" className="text-xs">{task.dueDay}</Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="text-primary w-full justify-start mt-2" data-testid="button-add-task">
          <Plus className="w-4 h-4 mr-1" /> Add task
        </Button>
      </CardContent>
    </Card>
  );
}

function WeeklyEditor() {
  return (
    <Card className="h-full flex flex-col" data-testid="card-weekly-editor">
      <Tabs defaultValue="training" className="flex-1 flex flex-col">
        <div className="border-b px-4 pt-3">
          <TabsList className="inline-flex h-10 items-center gap-1 bg-transparent p-0">
            <TabsTrigger value="training" className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none" data-testid="tab-training">
              <Dumbbell className="w-4 h-4" />
              Training
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none" data-testid="tab-nutrition">
              <UtensilsCrossed className="w-4 h-4" />
              Nutrition
            </TabsTrigger>
            <TabsTrigger value="habits" className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none" data-testid="tab-habits">
              <CheckCircle2 className="w-4 h-4" />
              Habits
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none" data-testid="tab-tasks">
              <ClipboardList className="w-4 h-4" />
              Tasks
            </TabsTrigger>
          </TabsList>
        </div>
        <CardContent className="flex-1 overflow-auto p-4">
          <TabsContent value="training" className="m-0 mt-0">
            <TrainingTab days={mockTrainingDays} />
          </TabsContent>
          <TabsContent value="nutrition" className="m-0 mt-0">
            <NutritionTab days={mockNutritionDays} />
          </TabsContent>
          <TabsContent value="habits" className="m-0 mt-0">
            <HabitsTab habits={mockHabits} />
          </TabsContent>
          <TabsContent value="tasks" className="m-0 mt-0">
            <TasksTab tasks={mockTasks} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}

export function PlanBuilderTab({ clientName, onSwitchToClientView }: PlanBuilderTabProps) {
  const [weekIndex, setWeekIndex] = useState(1);

  const getWeekStartDate = (weekNum: number) => {
    const baseDate = new Date(2025, 0, 6);
    baseDate.setDate(baseDate.getDate() + (weekNum - 1) * 7);
    return baseDate.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="this-week">
        <TabsList className="inline-flex h-10 items-center gap-1 bg-transparent p-0 border-b w-full justify-start rounded-none">
          <TabsTrigger 
            value="this-week" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
            data-testid="tab-this-week"
          >
            This Week
          </TabsTrigger>
          <TabsTrigger 
            value="main-plan" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
            data-testid="tab-main-plan"
          >
            Main Plan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="this-week" className="mt-6 space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold" data-testid="text-week-title">Weekly Program for {clientName}</h2>
                <p className="text-muted-foreground text-sm">Week {weekIndex} • Starting {getWeekStartDate(weekIndex)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {onSwitchToClientView && (
                  <Button variant="outline" size="sm" onClick={onSwitchToClientView} data-testid="button-switch-view">
                    <Eye className="w-4 h-4 mr-2" /> Switch to Client View
                  </Button>
                )}
                <Button variant="outline" size="sm" data-testid="button-copy-week">
                  <Copy className="w-4 h-4 mr-2" /> Copy to Next Week
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekIndex((prev) => Math.max(1, prev - 1))}
                disabled={weekIndex === 1}
                data-testid="button-prev-week"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Badge variant="secondary" className="px-3">Week {weekIndex}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekIndex((prev) => prev + 1)}
                data-testid="button-next-week"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-4">
                <AiProgramBuilderPanel clientName={clientName} />
              </div>
            </div>
            <div className="lg:col-span-8">
              <WeeklyEditor />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="main-plan" className="mt-6">
          <Card className="p-8 text-center" data-testid="card-main-plan-placeholder">
            <CardContent className="py-12">
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
