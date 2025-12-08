import { useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Eye, Calendar, Dumbbell, UtensilsCrossed, CheckCircle2, ClipboardList, Send, Trash2, Plus, GripVertical, Sparkles, Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { usePlanBuilder } from "@/hooks/use-plan-builder";
import { PlanBuilderContent } from "@/components/plan-builder-content";

interface PlanBuilderTabProps {
  clientId: string;
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
    <Card className="h-full flex flex-col overflow-hidden border-2 border-[#28A0AE]/20" data-testid="card-ai-builder">
      <div className="bg-[#28A0AE] px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">AI Program Builder</h3>
          <p className="text-white/80 text-xs">Tell me what to add - training, meals, habits, or tasks</p>
        </div>
      </div>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-xl p-3 text-sm whitespace-pre-line",
                  msg.role === "assistant"
                    ? "bg-[#E2F9AD]/30 text-foreground border border-[#E2F9AD]"
                    : "bg-[#28A0AE] text-white ml-6"
                )}
                data-testid={`message-${msg.role}-${msg.id}`}
              >
                {msg.content}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-4 border-t bg-muted/30">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Add upper body workout for Monday"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="text-sm bg-background"
              data-testid="input-ai-message"
            />
            <Button 
              size="icon" 
              onClick={handleSend} 
              className="bg-[#28A0AE] hover:bg-[#28A0AE]/90 text-white flex-shrink-0"
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrainingTab({ days }: { days: TrainingDay[] }) {
  return (
    <div className="space-y-4">
      {days.map((day) => (
        <Card key={day.day} className="overflow-hidden border" data-testid={`card-training-${day.day.toLowerCase()}`}>
          <div className="bg-[#28A0AE] px-4 py-2.5 flex items-center gap-3">
            <GripVertical className="w-4 h-4 text-white/60" />
            <Calendar className="w-4 h-4 text-white" />
            <Badge variant="outline" className="bg-white/90 border-transparent text-[#28A0AE] font-semibold">
              {day.day}
            </Badge>
            <span className="text-white font-medium text-sm">{day.title}</span>
          </div>
          <CardContent className="p-4 space-y-3">
            {day.exercises.map((exercise) => (
              <div key={exercise.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover-elevate" data-testid={`exercise-${exercise.id}`}>
                <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{exercise.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sets: {exercise.sets} &nbsp;&nbsp; Reps: {exercise.reps}
                  </p>
                  {exercise.note && (
                    <p className="text-xs text-[#28A0AE] mt-1">Coach note: {exercise.note}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-[#28A0AE] w-full justify-start" data-testid={`button-add-exercise-${day.day.toLowerCase()}`}>
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
        <Card key={day.day} className="overflow-hidden border" data-testid={`card-nutrition-${day.day.toLowerCase()}`}>
          <div className="bg-[#28A0AE] px-4 py-2.5 flex items-center gap-3">
            <GripVertical className="w-4 h-4 text-white/60" />
            <Calendar className="w-4 h-4 text-white" />
            <Badge variant="outline" className="bg-white/90 border-transparent text-[#28A0AE] font-semibold">
              {day.day}
            </Badge>
            <span className="text-white font-medium text-sm">{day.title}</span>
          </div>
          <CardContent className="p-4 space-y-3">
            {day.meals.map((meal) => (
              <div key={meal.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover-elevate" data-testid={`meal-${meal.id}`}>
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
            <Button variant="ghost" size="sm" className="text-[#28A0AE] w-full justify-start" data-testid={`button-add-meal-${day.day.toLowerCase()}`}>
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
          <div key={habit.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover-elevate" data-testid={`habit-${habit.id}`}>
            <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <CheckCircle2 className={cn("w-5 h-5 flex-shrink-0", habit.completed ? "text-[#28A0AE]" : "text-muted-foreground")} />
            <span className="flex-1 text-sm">{habit.name}</span>
            <Badge variant="outline" className="text-xs">{habit.frequency}</Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="text-[#28A0AE] w-full justify-start mt-2" data-testid="button-add-habit">
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
          <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover-elevate" data-testid={`task-${task.id}`}>
            <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <CheckCircle2 className={cn("w-5 h-5 flex-shrink-0", task.completed ? "text-[#28A0AE]" : "text-muted-foreground")} />
            <span className="flex-1 text-sm">{task.name}</span>
            <Badge variant="outline" className="text-xs">{task.dueDay}</Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="text-[#28A0AE] w-full justify-start mt-2" data-testid="button-add-task">
          <Plus className="w-4 h-4 mr-1" /> Add task
        </Button>
      </CardContent>
    </Card>
  );
}

function WeeklyEditor() {
  return (
    <Card className="h-full flex flex-col border-2 border-[#28A0AE]/20" data-testid="card-weekly-editor">
      <Tabs defaultValue="training" className="flex-1 flex flex-col">
        <div className="border-b px-4 pt-3 bg-muted/30">
          <TabsList className="inline-flex h-10 items-center gap-1 bg-transparent p-0">
            <TabsTrigger value="training" className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-[#28A0AE] data-[state=active]:text-[#28A0AE] rounded-none" data-testid="tab-training">
              <Dumbbell className="w-4 h-4" />
              Training
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-[#28A0AE] data-[state=active]:text-[#28A0AE] rounded-none" data-testid="tab-nutrition">
              <UtensilsCrossed className="w-4 h-4" />
              Nutrition
            </TabsTrigger>
            <TabsTrigger value="habits" className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-[#28A0AE] data-[state=active]:text-[#28A0AE] rounded-none" data-testid="tab-habits">
              <CheckCircle2 className="w-4 h-4" />
              Habits
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-[#28A0AE] data-[state=active]:text-[#28A0AE] rounded-none" data-testid="tab-tasks">
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

export function PlanBuilderTab({ clientId, clientName, onSwitchToClientView }: PlanBuilderTabProps) {
  const [weekIndex, setWeekIndex] = useState(1);
  const [isCopying, setIsCopying] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAssigned, setIsAssigned] = useState(false);
  const { toast } = useToast();

  const planBuilder = usePlanBuilder(clientId || undefined);

  const getWeekStartDate = (weekNum: number) => {
    const baseDate = new Date(2025, 0, 6);
    baseDate.setDate(baseDate.getDate() + (weekNum - 1) * 7);
    return baseDate.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const handleCopyToNextWeek = () => {
    setIsCopying(true);
    setTimeout(() => {
      setIsCopying(false);
      setWeekIndex((prev) => prev + 1);
      toast({
        title: "Week copied!",
        description: `Week ${weekIndex} has been copied to Week ${weekIndex + 1}. You can now edit the new week.`,
      });
    }, 800);
  };

  const handleAssignToClient = () => {
    setIsAssigning(true);
    setTimeout(() => {
      setIsAssigning(false);
      setIsAssigned(true);
      toast({
        title: "Plan assigned!",
        description: `Week ${weekIndex} program has been sent to ${clientName}. They can now view it in their portal.`,
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="this-week">
        <TabsList className="inline-flex h-10 items-center gap-1 bg-transparent p-0 border-b w-full justify-start rounded-none">
          <TabsTrigger 
            value="this-week" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-[#28A0AE] data-[state=active]:text-[#28A0AE] rounded-none px-4"
            data-testid="tab-this-week"
          >
            This Week
          </TabsTrigger>
          <TabsTrigger 
            value="main-plan" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-[#28A0AE] data-[state=active]:text-[#28A0AE] rounded-none px-4"
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
                    <Eye className="w-4 h-4 mr-2" /> Client View
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyToNextWeek}
                  disabled={isCopying}
                  data-testid="button-copy-week"
                >
                  {isCopying ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  Copy to Next Week
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleAssignToClient}
                  disabled={isAssigning || isAssigned}
                  className={cn(
                    "transition-all",
                    isAssigned 
                      ? "bg-green-600 hover:bg-green-600 text-white" 
                      : "bg-[#28A0AE] hover:bg-[#28A0AE]/90 text-white"
                  )}
                  data-testid="button-assign-plan"
                >
                  {isAssigning ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : isAssigned ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {isAssigned ? "Assigned" : "Assign to Client"}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setWeekIndex((prev) => Math.max(1, prev - 1)); setIsAssigned(false); }}
                disabled={weekIndex === 1}
                data-testid="button-prev-week"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Badge className="px-3 bg-[#E2F9AD] text-[#1a1a1a] hover:bg-[#E2F9AD]">Week {weekIndex}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setWeekIndex((prev) => prev + 1); setIsAssigned(false); }}
                data-testid="button-next-week"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-4 flex flex-col min-h-[600px]">
              <AiProgramBuilderPanel clientName={clientName} />
            </div>
            <div className="lg:col-span-8 flex flex-col min-h-[600px]">
              <WeeklyEditor />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="main-plan" className="mt-6">
          {!clientId ? (
            <Card className="p-8 text-center border-2 border-[#28A0AE]/20" data-testid="card-main-plan-no-client">
              <CardContent className="py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Client Selected</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Please select a client to view or create their plan.
                </p>
              </CardContent>
            </Card>
          ) : planBuilder.isLoadingContext || planBuilder.isLoadingSession ? (
            <div className="flex items-center justify-center h-[600px]">
              <Loader2 className="w-8 h-8 animate-spin text-[#28A0AE]" data-testid="loader-main-plan" />
            </div>
          ) : (
            <div className="h-[700px]" data-testid="main-plan-content">
              <PlanBuilderContent
                messages={planBuilder.messages}
                input={planBuilder.input}
                planName={planBuilder.planName}
                planContent={planBuilder.planContent}
                planStatus={planBuilder.planStatus}
                isSaving={planBuilder.isSaving}
                isAssigning={planBuilder.isAssigning}
                isCanvasExpanded={planBuilder.isCanvasExpanded}
                messagesEndRef={planBuilder.messagesEndRef}
                canvasTextareaRef={planBuilder.canvasTextareaRef}
                chatMutation={planBuilder.chatMutation}
                setInput={planBuilder.setInput}
                setPlanName={planBuilder.setPlanName}
                setPlanContent={planBuilder.setPlanContent}
                setIsCanvasExpanded={planBuilder.setIsCanvasExpanded}
                handleSendMessage={planBuilder.handleSendMessage}
                handleAddToCanvas={planBuilder.handleAddToCanvas}
                handleAddSection={planBuilder.handleAddSection}
                handleSavePlan={planBuilder.handleSavePlan}
                handleAssignToClient={planBuilder.handleAssignToClient}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
