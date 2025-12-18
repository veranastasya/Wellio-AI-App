import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Copy, Eye, Calendar, Dumbbell, UtensilsCrossed, CheckCircle2, ClipboardList, Send, Trash2, Plus, GripVertical, Sparkles, Check, Loader2, Edit2 } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  id: string;
  day: string;
  date?: Date;
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
  date?: Date;
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

const generateId = () => Math.random().toString(36).substring(2, 11);

const initialTrainingDays: TrainingDay[] = [
  {
    id: "td1",
    day: "Monday",
    title: "Upper Body Strength",
    exercises: [
      { id: "1", name: "Dumbbell Bench Press", sets: 3, reps: 12, note: "Focus on controlled movement" },
      { id: "2", name: "Bent-over Rows", sets: 3, reps: 12, note: "Keep back straight" },
      { id: "3", name: "Shoulder Press", sets: 3, reps: 10 },
    ],
  },
  {
    id: "td2",
    day: "Wednesday",
    title: "Lower Body & Core",
    exercises: [
      { id: "4", name: "Squats", sets: 4, reps: 15 },
      { id: "5", name: "Romanian Deadlifts", sets: 3, reps: 12 },
      { id: "6", name: "Lunges", sets: 3, reps: 10 },
    ],
  },
  {
    id: "td3",
    day: "Friday",
    title: "Full Body Circuit",
    exercises: [
      { id: "7", name: "Kettlebell Swings", sets: 4, reps: 15 },
      { id: "8", name: "Push-ups", sets: 3, reps: 20 },
    ],
  },
];

const initialNutritionDays: NutritionDay[] = [
  {
    id: "nd1",
    day: "Monday",
    title: "High protein day",
    meals: [
      { id: "m1", type: "Breakfast", name: "Oats and berries", calories: 420, protein: 30, carbs: 45, fat: 12 },
      { id: "m2", type: "Lunch", name: "Grilled chicken salad", calories: 550, protein: 45, carbs: 25, fat: 28 },
      { id: "m3", type: "Dinner", name: "Salmon with vegetables", calories: 620, protein: 42, carbs: 30, fat: 35 },
    ],
  },
  {
    id: "nd2",
    day: "Tuesday",
    title: "Recovery nutrition",
    meals: [
      { id: "m4", type: "Breakfast", name: "Eggs and avocado toast", calories: 480, protein: 25, carbs: 35, fat: 28 },
      { id: "m5", type: "Lunch", name: "Turkey wrap", calories: 520, protein: 38, carbs: 42, fat: 22 },
    ],
  },
];

const initialHabits: Habit[] = [
  { id: "h1", name: "Drink 2 liters of water", frequency: "Daily", completed: false },
  { id: "h2", name: "10 minutes stretching", frequency: "Daily", completed: true },
  { id: "h3", name: "Take vitamins", frequency: "Daily", completed: false },
  { id: "h4", name: "30 minute walk", frequency: "3x per week", completed: false },
];

const initialTasks: Task[] = [
  { id: "t1", name: "Submit food log", dueDay: "Mon", completed: true },
  { id: "t2", name: "Weigh in", dueDay: "Wed", completed: false },
  { id: "t3", name: "Send progress photos", dueDay: "Fri", completed: false },
];

interface WeeklyProgramState {
  trainingDays: TrainingDay[];
  nutritionDays: NutritionDay[];
  habits: Habit[];
  tasks: Task[];
}

interface AiProgramBuilderPanelProps {
  clientName: string;
  trainingDays: TrainingDay[];
  onAddTrainingDay: (day: TrainingDay) => void;
  onAddMeal: (dayId: string, meal: Meal) => void;
  onAddHabit: (habit: Habit) => void;
  onAddTask: (task: Task) => void;
  onAddExercise: (dayId: string, exercise: Exercise) => void;
}

function AiProgramBuilderPanel({ clientName, trainingDays, onAddTrainingDay, onAddMeal, onAddHabit, onAddTask, onAddExercise }: AiProgramBuilderPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      role: "assistant",
      content: `Hi! I'm ready to help you build this week's program for ${clientName}. I can create:\n\n- Training sessions with exercises, sets, and reps\n- Meal plans with macros and recipes\n- Daily habits to track\n- Weekly tasks and goals\n\nWhat would you like to add to this week's program?`,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue,
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = inputValue;
    setInputValue("");
    setIsProcessing(true);

    try {
      const response = await fetch("/api/program-builder/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: messageText,
          clientName,
          existingTrainingDays: trainingDays.map(d => ({
            day: d.day,
            title: d.title,
            exercises: d.exercises.map(e => ({ name: e.name, sets: e.sets, reps: e.reps })),
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process request");
      }

      const result = await response.json();
      
      const assistantResponse: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.response,
      };

      setMessages((prev) => [...prev, assistantResponse]);

      if (result.type === "add_training" && result.data) {
        const newDay: TrainingDay = {
          id: generateId(),
          day: result.data.day || "Monday",
          title: result.data.title || "New Workout",
          exercises: (result.data.exercises || []).map((e: any) => ({
            id: generateId(),
            name: e.name,
            sets: e.sets || 3,
            reps: e.reps || 10,
            note: e.note,
          })),
        };
        onAddTrainingDay(newDay);
      } else if (result.type === "modify_training" && result.data?.exercisesToAdd) {
        const targetDay = result.data.targetDay;
        const existingDay = trainingDays.find(d => 
          d.day.toLowerCase() === targetDay?.toLowerCase()
        );
        if (existingDay) {
          for (const exercise of result.data.exercisesToAdd) {
            onAddExercise(existingDay.id, {
              id: generateId(),
              name: exercise.name,
              sets: exercise.sets || 3,
              reps: exercise.reps || 10,
              note: exercise.note,
            });
          }
        } else if (result.data.exercisesToAdd.length > 0) {
          const newDay: TrainingDay = {
            id: generateId(),
            day: targetDay || "Wednesday",
            title: `${targetDay || "Wednesday"} Workout`,
            exercises: result.data.exercisesToAdd.map((e: any) => ({
              id: generateId(),
              name: e.name,
              sets: e.sets || 3,
              reps: e.reps || 10,
              note: e.note,
            })),
          };
          onAddTrainingDay(newDay);
        }
      } else if (result.type === "add_meal" && result.data?.meal) {
        const meal: Meal = {
          id: generateId(),
          type: result.data.meal.type || "Lunch",
          name: result.data.meal.name || "New Meal",
          calories: result.data.meal.calories || 500,
          protein: result.data.meal.protein || 30,
          carbs: result.data.meal.carbs || 40,
          fat: result.data.meal.fat || 20,
        };
        onAddMeal("nd1", meal);
      } else if (result.type === "add_habit" && result.data?.habit) {
        onAddHabit({
          id: generateId(),
          name: result.data.habit.name || "New Habit",
          frequency: result.data.habit.frequency || "Daily",
          completed: false,
        });
      } else if (result.type === "add_task" && result.data?.task) {
        onAddTask({
          id: generateId(),
          name: result.data.task.name || "New Task",
          dueDay: result.data.task.dueDay || "Fri",
          completed: false,
        });
      }
    } catch (error) {
      console.error("Error processing AI request:", error);
      const errorResponse: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "I'm having trouble processing your request right now. Please try again with something like 'Add an upper body workout for Monday' or 'Add Bulgarian split squats to Wednesday'.",
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsProcessing(false);
    }
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
                    ? "bg-muted text-foreground border border-border"
                    : "bg-[#28A0AE] text-white ml-6"
                )}
                data-testid={`message-${msg.role}-${msg.id}`}
              >
                {msg.content}
              </div>
            ))}
            {isProcessing && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </div>
            )}
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
              disabled={isProcessing}
              data-testid="input-ai-message"
            />
            <Button 
              size="icon" 
              onClick={handleSend} 
              disabled={isProcessing}
              className="bg-[#28A0AE] hover:bg-[#28A0AE]/90 text-white flex-shrink-0"
              data-testid="button-send-message"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface EditableExerciseProps {
  exercise: Exercise;
  onUpdate: (updated: Exercise) => void;
  onDelete: () => void;
}

function EditableExercise({ exercise, onUpdate, onDelete }: EditableExerciseProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(exercise.name);
  const [editSets, setEditSets] = useState(exercise.sets);
  const [editReps, setEditReps] = useState(exercise.reps);
  const [editNote, setEditNote] = useState(exercise.note || "");

  const handleSave = () => {
    onUpdate({
      ...exercise,
      name: editName,
      sets: editSets,
      reps: editReps,
      note: editNote || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(exercise.name);
    setEditSets(exercise.sets);
    setEditReps(exercise.reps);
    setEditNote(exercise.note || "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="p-3 rounded-lg border-2 border-[#28A0AE] bg-card space-y-3" data-testid={`exercise-edit-${exercise.id}`}>
        <div className="space-y-2">
          <Label className="text-xs">Exercise Name</Label>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-8 text-sm"
            placeholder="Exercise name"
            data-testid="input-exercise-name"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Sets</Label>
            <Input
              type="number"
              min={1}
              value={editSets}
              onChange={(e) => setEditSets(parseInt(e.target.value) || 1)}
              className="h-8 text-sm"
              data-testid="input-exercise-sets"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Reps</Label>
            <Input
              type="number"
              min={1}
              value={editReps}
              onChange={(e) => setEditReps(parseInt(e.target.value) || 1)}
              className="h-8 text-sm"
              data-testid="input-exercise-reps"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Coach Note (optional)</Label>
          <Input
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            className="h-8 text-sm"
            placeholder="Add a note..."
            data-testid="input-exercise-note"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={handleCancel} data-testid="button-cancel-exercise">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="bg-[#28A0AE] hover:bg-[#28A0AE]/90 text-white" data-testid="button-save-exercise">
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex items-start gap-3 p-4 rounded-lg bg-white dark:bg-card border border-border/50 hover:border-[#28A0AE]/30 cursor-pointer group transition-colors shadow-sm" 
      onClick={() => setIsEditing(true)}
      data-testid={`exercise-${exercise.id}`}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0 cursor-grab" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{exercise.name}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Sets: {exercise.sets} &nbsp;&nbsp;&nbsp; Reps: {exercise.reps}
        </p>
        {exercise.note && (
          <p className="text-xs text-[#28A0AE] mt-1.5">
            <span className="font-medium">Coach note:</span> {exercise.note}
          </p>
        )}
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        data-testid={`button-delete-exercise-${exercise.id}`}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

interface TrainingTabProps {
  days: TrainingDay[];
  onUpdateDay: (dayId: string, updates: Partial<TrainingDay>) => void;
  onUpdateExercise: (dayId: string, exerciseId: string, updates: Exercise) => void;
  onDeleteExercise: (dayId: string, exerciseId: string) => void;
  onAddExercise: (dayId: string, exercise: Exercise) => void;
  onDeleteDay: (dayId: string) => void;
  onAddDay: (day: TrainingDay) => void;
}

function TrainingTab({ days, onUpdateDay, onUpdateExercise, onDeleteExercise, onAddExercise, onDeleteDay, onAddDay }: TrainingTabProps) {
  const [addingExerciseToDay, setAddingExerciseToDay] = useState<string | null>(null);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseSets, setNewExerciseSets] = useState(3);
  const [newExerciseReps, setNewExerciseReps] = useState(10);
  const [newExerciseNote, setNewExerciseNote] = useState("");
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const toggleDayCollapse = (dayId: string) => {
    setCollapsedDays(prev => ({ ...prev, [dayId]: !prev[dayId] }));
  };

  const handleAddExercise = (dayId: string) => {
    if (!newExerciseName.trim()) {
      toast({ title: "Please enter an exercise name", variant: "destructive" });
      return;
    }
    onAddExercise(dayId, {
      id: generateId(),
      name: newExerciseName,
      sets: newExerciseSets,
      reps: newExerciseReps,
      note: newExerciseNote.trim() || undefined,
    });
    setNewExerciseName("");
    setNewExerciseSets(3);
    setNewExerciseReps(10);
    setNewExerciseNote("");
    setAddingExerciseToDay(null);
  };

  const handleDayChange = (dayId: string, newDay: string) => {
    onUpdateDay(dayId, { day: newDay });
  };

  const handleAddTrainingDay = () => {
    const usedDays = days.map(d => d.day);
    const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const availableDay = allDays.find(d => !usedDays.includes(d)) || "Monday";
    
    onAddDay({
      id: generateId(),
      day: availableDay,
      title: "New Workout",
      date: new Date(),
      exercises: [],
    });
  };

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const isCollapsed = collapsedDays[day.id] || false;
        return (
        <Card key={day.id} className="overflow-hidden border-0 shadow-sm" data-testid={`card-training-${day.id}`}>
          <div className="bg-[#28A0AE]/10 px-4 py-3 flex items-center gap-3 rounded-t-lg">
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab flex-shrink-0" />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-[#28A0AE] hover:bg-[#28A0AE]/10" data-testid={`button-calendar-${day.id}`}>
                  <Calendar className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={day.date}
                  onSelect={(date) => date && onUpdateDay(day.id, { date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Select value={day.day} onValueChange={(value) => handleDayChange(day.id, value)}>
              <SelectTrigger className="w-auto h-7 bg-[#28A0AE]/10 border-[#28A0AE]/20 text-[#28A0AE] font-semibold text-sm" data-testid={`select-day-${day.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Monday">Monday</SelectItem>
                <SelectItem value="Tuesday">Tuesday</SelectItem>
                <SelectItem value="Wednesday">Wednesday</SelectItem>
                <SelectItem value="Thursday">Thursday</SelectItem>
                <SelectItem value="Friday">Friday</SelectItem>
                <SelectItem value="Saturday">Saturday</SelectItem>
                <SelectItem value="Sunday">Sunday</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">|</span>
            <Input
              value={day.title}
              onChange={(e) => onUpdateDay(day.id, { title: e.target.value })}
              className="flex-1 h-7 bg-transparent border-none font-medium text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Workout title..."
              data-testid={`input-day-title-${day.id}`}
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDeleteDay(day.id)}
              data-testid={`button-delete-day-${day.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => toggleDayCollapse(day.id)}
              data-testid={`button-collapse-${day.id}`}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
          {!isCollapsed && (
          <CardContent className="p-4 space-y-3 bg-[#28A0AE]/5">
            {day.exercises.map((exercise) => (
              <EditableExercise
                key={exercise.id}
                exercise={exercise}
                onUpdate={(updated) => onUpdateExercise(day.id, exercise.id, updated)}
                onDelete={() => onDeleteExercise(day.id, exercise.id)}
              />
            ))}
            
            {addingExerciseToDay === day.id ? (
              <div className="p-3 rounded-lg border-2 border-dashed border-[#28A0AE]/50 bg-muted/30 space-y-3">
                <Input
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="Exercise name (e.g., Bench Press)"
                  className="h-8 text-sm"
                  autoFocus
                  data-testid="input-new-exercise-name"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs w-10">Sets:</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newExerciseSets}
                      onChange={(e) => setNewExerciseSets(parseInt(e.target.value) || 1)}
                      className="h-8 text-sm"
                      data-testid="input-new-exercise-sets"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs w-10">Reps:</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newExerciseReps}
                      onChange={(e) => setNewExerciseReps(parseInt(e.target.value) || 1)}
                      className="h-8 text-sm"
                      data-testid="input-new-exercise-reps"
                    />
                  </div>
                </div>
                <Input
                  value={newExerciseNote}
                  onChange={(e) => setNewExerciseNote(e.target.value)}
                  placeholder="Coach notes (optional)"
                  className="h-8 text-sm"
                  data-testid="input-new-exercise-note"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setAddingExerciseToDay(null)} data-testid="button-cancel-new-exercise">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleAddExercise(day.id)} className="bg-[#28A0AE] hover:bg-[#28A0AE]/90 text-white" data-testid="button-add-new-exercise">
                    Add
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[#28A0AE] w-full justify-start" 
                onClick={() => setAddingExerciseToDay(day.id)}
                data-testid={`button-add-exercise-${day.id}`}
              >
                <Plus className="w-4 h-4 mr-1" /> Add exercise
              </Button>
            )}
          </CardContent>
          )}
        </Card>
        );
      })}
      <Button 
        variant="outline" 
        className="w-full border-dashed border-[#28A0AE]/50 text-[#28A0AE] hover:bg-[#28A0AE]/10"
        onClick={handleAddTrainingDay}
        data-testid="button-add-training-day"
      >
        <Plus className="w-4 h-4 mr-2" /> Add Training Day
      </Button>
    </div>
  );
}

interface EditableMealProps {
  meal: Meal;
  onUpdate: (updated: Meal) => void;
  onDelete: () => void;
}

function EditableMeal({ meal, onUpdate, onDelete }: EditableMealProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editType, setEditType] = useState(meal.type);
  const [editName, setEditName] = useState(meal.name);
  const [editCalories, setEditCalories] = useState(meal.calories);
  const [editProtein, setEditProtein] = useState(meal.protein);
  const [editCarbs, setEditCarbs] = useState(meal.carbs);
  const [editFat, setEditFat] = useState(meal.fat);

  const handleSave = () => {
    onUpdate({
      ...meal,
      type: editType,
      name: editName,
      calories: editCalories,
      protein: editProtein,
      carbs: editCarbs,
      fat: editFat,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="p-3 rounded-lg border-2 border-[#28A0AE] bg-card space-y-3" data-testid={`meal-edit-${meal.id}`}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Meal Type</Label>
            <Select value={editType} onValueChange={setEditType}>
              <SelectTrigger className="h-8 text-sm" data-testid="select-meal-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Breakfast">Breakfast</SelectItem>
                <SelectItem value="Lunch">Lunch</SelectItem>
                <SelectItem value="Dinner">Dinner</SelectItem>
                <SelectItem value="Snack">Snack</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Meal Name</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-8 text-sm"
              data-testid="input-meal-name"
            />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Calories</Label>
            <Input type="number" value={editCalories} onChange={(e) => setEditCalories(parseInt(e.target.value) || 0)} className="h-8 text-sm" data-testid="input-meal-calories" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Protein (g)</Label>
            <Input type="number" value={editProtein} onChange={(e) => setEditProtein(parseInt(e.target.value) || 0)} className="h-8 text-sm" data-testid="input-meal-protein" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Carbs (g)</Label>
            <Input type="number" value={editCarbs} onChange={(e) => setEditCarbs(parseInt(e.target.value) || 0)} className="h-8 text-sm" data-testid="input-meal-carbs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fat (g)</Label>
            <Input type="number" value={editFat} onChange={(e) => setEditFat(parseInt(e.target.value) || 0)} className="h-8 text-sm" data-testid="input-meal-fat" />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} className="bg-[#28A0AE] hover:bg-[#28A0AE]/90 text-white">Save</Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex items-start gap-3 p-4 rounded-lg bg-white dark:bg-card border border-border/50 hover:border-[#28A0AE]/30 cursor-pointer group transition-colors shadow-sm" 
      onClick={() => setIsEditing(true)}
      data-testid={`meal-${meal.id}`}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0 cursor-grab" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{meal.type} - {meal.name}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {meal.calories} kcal | {meal.protein}g P | {meal.carbs}g C | {meal.fat}g F
        </p>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

interface NutritionTabProps {
  days: NutritionDay[];
  onUpdateDay: (dayId: string, updates: Partial<NutritionDay>) => void;
  onDeleteDay: (dayId: string) => void;
  onAddDay: (day: NutritionDay) => void;
  onUpdateMeal: (dayId: string, mealId: string, updates: Meal) => void;
  onDeleteMeal: (dayId: string, mealId: string) => void;
  onAddMeal: (dayId: string, meal: Meal) => void;
}

function NutritionTab({ days, onUpdateDay, onDeleteDay, onAddDay, onUpdateMeal, onDeleteMeal, onAddMeal }: NutritionTabProps) {
  const [addingMealToDay, setAddingMealToDay] = useState<string | null>(null);
  const [newMealType, setNewMealType] = useState("Lunch");
  const [newMealName, setNewMealName] = useState("");
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const toggleDayCollapse = (dayId: string) => {
    setCollapsedDays(prev => ({ ...prev, [dayId]: !prev[dayId] }));
  };

  const handleAddMeal = (dayId: string) => {
    if (!newMealName.trim()) {
      toast({ title: "Please enter a meal name", variant: "destructive" });
      return;
    }
    onAddMeal(dayId, {
      id: generateId(),
      type: newMealType,
      name: newMealName,
      calories: 400,
      protein: 30,
      carbs: 40,
      fat: 15,
    });
    setNewMealName("");
    setAddingMealToDay(null);
  };

  const handleAddNutritionDay = () => {
    const usedDays = days.map(d => d.day);
    const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const availableDay = allDays.find(d => !usedDays.includes(d)) || "Monday";
    
    onAddDay({
      id: generateId(),
      day: availableDay,
      title: "Meal Plan",
      date: new Date(),
      meals: [],
    });
  };

  const handleDayChange = (dayId: string, newDay: string) => {
    onUpdateDay(dayId, { day: newDay });
  };

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const isCollapsed = collapsedDays[day.id] || false;
        return (
        <Card key={day.id} className="overflow-hidden border-0 shadow-sm" data-testid={`card-nutrition-${day.id}`}>
          <div className="bg-[#28A0AE]/10 px-4 py-3 flex items-center gap-3 rounded-t-lg">
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab flex-shrink-0" />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-[#28A0AE] hover:bg-[#28A0AE]/10" data-testid={`button-calendar-nutrition-${day.id}`}>
                  <Calendar className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={day.date}
                  onSelect={(date) => date && onUpdateDay(day.id, { date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Select value={day.day} onValueChange={(value) => handleDayChange(day.id, value)}>
              <SelectTrigger className="w-auto h-7 bg-[#28A0AE]/10 border-[#28A0AE]/20 text-[#28A0AE] font-semibold text-sm" data-testid={`select-nutrition-day-${day.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Monday">Monday</SelectItem>
                <SelectItem value="Tuesday">Tuesday</SelectItem>
                <SelectItem value="Wednesday">Wednesday</SelectItem>
                <SelectItem value="Thursday">Thursday</SelectItem>
                <SelectItem value="Friday">Friday</SelectItem>
                <SelectItem value="Saturday">Saturday</SelectItem>
                <SelectItem value="Sunday">Sunday</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">|</span>
            <Input
              value={day.title}
              onChange={(e) => onUpdateDay(day.id, { title: e.target.value })}
              className="flex-1 h-7 bg-transparent border-none font-medium text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Day title..."
              data-testid={`input-nutrition-title-${day.id}`}
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDeleteDay(day.id)}
              data-testid={`button-delete-nutrition-day-${day.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => toggleDayCollapse(day.id)}
              data-testid={`button-collapse-nutrition-${day.id}`}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
          {!isCollapsed && (
          <CardContent className="p-4 space-y-3 bg-[#28A0AE]/5">
            {day.meals.map((meal) => (
              <EditableMeal
                key={meal.id}
                meal={meal}
                onUpdate={(updated) => onUpdateMeal(day.id, meal.id, updated)}
                onDelete={() => onDeleteMeal(day.id, meal.id)}
              />
            ))}
            {addingMealToDay === day.id ? (
              <div className="p-3 rounded-lg border-2 border-dashed border-[#28A0AE]/50 bg-white dark:bg-card space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={newMealType} onValueChange={setNewMealType}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Breakfast">Breakfast</SelectItem>
                      <SelectItem value="Lunch">Lunch</SelectItem>
                      <SelectItem value="Dinner">Dinner</SelectItem>
                      <SelectItem value="Snack">Snack</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={newMealName}
                    onChange={(e) => setNewMealName(e.target.value)}
                    placeholder="Meal name..."
                    className="h-8 text-sm"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setAddingMealToDay(null)}>Cancel</Button>
                  <Button size="sm" onClick={() => handleAddMeal(day.id)} className="bg-[#28A0AE] hover:bg-[#28A0AE]/90 text-white">Add</Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[#28A0AE] w-full justify-start" 
                onClick={() => setAddingMealToDay(day.id)}
                data-testid={`button-add-meal-${day.id}`}
              >
                <Plus className="w-4 h-4 mr-1" /> Add meal
              </Button>
            )}
          </CardContent>
          )}
        </Card>
        );
      })}
      <Button 
        variant="outline" 
        className="w-full border-dashed border-[#28A0AE]/50 text-[#28A0AE] hover:bg-[#28A0AE]/10"
        onClick={handleAddNutritionDay}
        data-testid="button-add-nutrition-day"
      >
        <Plus className="w-4 h-4 mr-2" /> Add Nutrition Day
      </Button>
    </div>
  );
}

interface HabitsTabProps {
  habits: Habit[];
  onUpdateHabit: (habitId: string, updates: Partial<Habit>) => void;
  onDeleteHabit: (habitId: string) => void;
  onAddHabit: (habit: Habit) => void;
  onToggleHabit: (habitId: string) => void;
}

function HabitsTab({ habits, onUpdateHabit, onDeleteHabit, onAddHabit, onToggleHabit }: HabitsTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitFreq, setNewHabitFreq] = useState("Daily");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFreq, setEditFreq] = useState("");
  const { toast } = useToast();

  const handleAdd = () => {
    if (!newHabitName.trim()) {
      toast({ title: "Please enter a habit name", variant: "destructive" });
      return;
    }
    onAddHabit({
      id: generateId(),
      name: newHabitName,
      frequency: newHabitFreq,
      completed: false,
    });
    setNewHabitName("");
    setIsAdding(false);
    toast({ title: "Habit added!" });
  };

  const startEditing = (habit: Habit) => {
    setEditingId(habit.id);
    setEditName(habit.name);
    setEditFreq(habit.frequency);
  };

  const handleSaveEdit = (habitId: string) => {
    onUpdateHabit(habitId, { name: editName, frequency: editFreq });
    setEditingId(null);
  };

  return (
    <Card data-testid="card-habits">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Weekly Habits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {habits.map((habit) => (
          editingId === habit.id ? (
            <div key={habit.id} className="p-3 rounded-lg border-2 border-[#28A0AE] bg-card space-y-3">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Habit name" className="h-8 text-sm" />
              <Select value={editFreq} onValueChange={setEditFreq}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="3x per week">3x per week</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                <Button size="sm" onClick={() => handleSaveEdit(habit.id)} className="bg-[#28A0AE] hover:bg-[#28A0AE]/90 text-white">Save</Button>
              </div>
            </div>
          ) : (
            <div key={habit.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover-elevate group" data-testid={`habit-${habit.id}`}>
              <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <button onClick={() => onToggleHabit(habit.id)} className="focus:outline-none">
                <CheckCircle2 className={cn("w-5 h-5 flex-shrink-0 transition-colors", habit.completed ? "text-[#28A0AE]" : "text-muted-foreground")} />
              </button>
              <span 
                className={cn("flex-1 text-sm cursor-pointer", habit.completed && "line-through text-muted-foreground")}
                onClick={() => startEditing(habit)}
              >
                {habit.name}
              </span>
              <Badge variant="outline" className="text-xs">{habit.frequency}</Badge>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0 opacity-0 group-hover:opacity-100"
                onClick={() => onDeleteHabit(habit.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )
        ))}
        {isAdding ? (
          <div className="p-3 rounded-lg border-2 border-dashed border-[#28A0AE]/50 bg-muted/30 space-y-3">
            <Input value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} placeholder="Habit name (e.g., Drink 8 glasses of water)" className="h-8 text-sm" autoFocus />
            <Select value={newHabitFreq} onValueChange={setNewHabitFreq}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="3x per week">3x per week</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} className="bg-[#28A0AE] hover:bg-[#28A0AE]/90 text-white">Add</Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="text-[#28A0AE] w-full justify-start mt-2" onClick={() => setIsAdding(true)} data-testid="button-add-habit">
            <Plus className="w-4 h-4 mr-1" /> Add habit
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface TasksTabProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (task: Task) => void;
  onToggleTask: (taskId: string) => void;
}

function TasksTab({ tasks, onUpdateTask, onDeleteTask, onAddTask, onToggleTask }: TasksTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("Mon");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDue, setEditDue] = useState("");
  const { toast } = useToast();

  const handleAdd = () => {
    if (!newTaskName.trim()) {
      toast({ title: "Please enter a task name", variant: "destructive" });
      return;
    }
    onAddTask({
      id: generateId(),
      name: newTaskName,
      dueDay: newTaskDue,
      completed: false,
    });
    setNewTaskName("");
    setIsAdding(false);
    toast({ title: "Task added!" });
  };

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setEditName(task.name);
    setEditDue(task.dueDay);
  };

  const handleSaveEdit = (taskId: string) => {
    onUpdateTask(taskId, { name: editName, dueDay: editDue });
    setEditingId(null);
  };

  return (
    <Card data-testid="card-tasks">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Weekly Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map((task) => (
          editingId === task.id ? (
            <div key={task.id} className="p-3 rounded-lg border-2 border-[#28A0AE] bg-card space-y-3">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Task name" className="h-8 text-sm" />
              <Select value={editDue} onValueChange={setEditDue}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mon">Monday</SelectItem>
                  <SelectItem value="Tue">Tuesday</SelectItem>
                  <SelectItem value="Wed">Wednesday</SelectItem>
                  <SelectItem value="Thu">Thursday</SelectItem>
                  <SelectItem value="Fri">Friday</SelectItem>
                  <SelectItem value="Sat">Saturday</SelectItem>
                  <SelectItem value="Sun">Sunday</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                <Button size="sm" onClick={() => handleSaveEdit(task.id)} className="bg-[#28A0AE] hover:bg-[#28A0AE]/90 text-white">Save</Button>
              </div>
            </div>
          ) : (
            <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover-elevate group" data-testid={`task-${task.id}`}>
              <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <button onClick={() => onToggleTask(task.id)} className="focus:outline-none">
                <CheckCircle2 className={cn("w-5 h-5 flex-shrink-0 transition-colors", task.completed ? "text-[#28A0AE]" : "text-muted-foreground")} />
              </button>
              <span 
                className={cn("flex-1 text-sm cursor-pointer", task.completed && "line-through text-muted-foreground")}
                onClick={() => startEditing(task)}
              >
                {task.name}
              </span>
              <Badge variant="outline" className="text-xs">{task.dueDay}</Badge>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0 opacity-0 group-hover:opacity-100"
                onClick={() => onDeleteTask(task.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )
        ))}
        {isAdding ? (
          <div className="p-3 rounded-lg border-2 border-dashed border-[#28A0AE]/50 bg-muted/30 space-y-3">
            <Input value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} placeholder="Task name (e.g., Submit progress photos)" className="h-8 text-sm" autoFocus />
            <Select value={newTaskDue} onValueChange={setNewTaskDue}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mon">Monday</SelectItem>
                <SelectItem value="Tue">Tuesday</SelectItem>
                <SelectItem value="Wed">Wednesday</SelectItem>
                <SelectItem value="Thu">Thursday</SelectItem>
                <SelectItem value="Fri">Friday</SelectItem>
                <SelectItem value="Sat">Saturday</SelectItem>
                <SelectItem value="Sun">Sunday</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} className="bg-[#28A0AE] hover:bg-[#28A0AE]/90 text-white">Add</Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="text-[#28A0AE] w-full justify-start mt-2" onClick={() => setIsAdding(true)} data-testid="button-add-task">
            <Plus className="w-4 h-4 mr-1" /> Add task
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface WeeklyEditorProps {
  programState: WeeklyProgramState;
  onUpdateTrainingDay: (dayId: string, updates: Partial<TrainingDay>) => void;
  onUpdateExercise: (dayId: string, exerciseId: string, updates: Exercise) => void;
  onDeleteExercise: (dayId: string, exerciseId: string) => void;
  onAddExercise: (dayId: string, exercise: Exercise) => void;
  onDeleteTrainingDay: (dayId: string) => void;
  onAddTrainingDay: (day: TrainingDay) => void;
  onUpdateNutritionDay: (dayId: string, updates: Partial<NutritionDay>) => void;
  onDeleteNutritionDay: (dayId: string) => void;
  onAddNutritionDay: (day: NutritionDay) => void;
  onUpdateMeal: (dayId: string, mealId: string, updates: Meal) => void;
  onDeleteMeal: (dayId: string, mealId: string) => void;
  onAddMeal: (dayId: string, meal: Meal) => void;
  onUpdateHabit: (habitId: string, updates: Partial<Habit>) => void;
  onDeleteHabit: (habitId: string) => void;
  onAddHabit: (habit: Habit) => void;
  onToggleHabit: (habitId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (task: Task) => void;
  onToggleTask: (taskId: string) => void;
}

function WeeklyEditor({ 
  programState, 
  onUpdateTrainingDay, 
  onUpdateExercise, 
  onDeleteExercise, 
  onAddExercise, 
  onDeleteTrainingDay,
  onAddTrainingDay,
  onUpdateNutritionDay,
  onDeleteNutritionDay,
  onAddNutritionDay,
  onUpdateMeal,
  onDeleteMeal,
  onAddMeal,
  onUpdateHabit,
  onDeleteHabit,
  onAddHabit,
  onToggleHabit,
  onUpdateTask,
  onDeleteTask,
  onAddTask,
  onToggleTask
}: WeeklyEditorProps) {
  return (
    <Card className="h-full flex flex-col border-2 border-[#28A0AE]/20" data-testid="card-weekly-editor">
      <Tabs defaultValue="training" className="flex-1 flex flex-col">
        <div className="border-b px-4 pt-3 bg-muted/30">
          <TabsList className="grid grid-cols-4 h-auto p-1 bg-muted rounded-lg">
            <TabsTrigger value="training" className="gap-1.5 py-2 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md" data-testid="tab-training">
              <Dumbbell className="w-4 h-4" />
              Training
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="gap-1.5 py-2 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md" data-testid="tab-nutrition">
              <UtensilsCrossed className="w-4 h-4" />
              Nutrition
            </TabsTrigger>
            <TabsTrigger value="habits" className="gap-1.5 py-2 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md" data-testid="tab-habits">
              <CheckCircle2 className="w-4 h-4" />
              Habits
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5 py-2 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md" data-testid="tab-tasks">
              <ClipboardList className="w-4 h-4" />
              Tasks
            </TabsTrigger>
          </TabsList>
        </div>
        <CardContent className="flex-1 overflow-auto p-4">
          <TabsContent value="training" className="m-0 mt-0">
            <TrainingTab 
              days={programState.trainingDays} 
              onUpdateDay={onUpdateTrainingDay}
              onUpdateExercise={onUpdateExercise}
              onDeleteExercise={onDeleteExercise}
              onAddExercise={onAddExercise}
              onDeleteDay={onDeleteTrainingDay}
              onAddDay={onAddTrainingDay}
            />
          </TabsContent>
          <TabsContent value="nutrition" className="m-0 mt-0">
            <NutritionTab 
              days={programState.nutritionDays}
              onUpdateDay={onUpdateNutritionDay}
              onDeleteDay={onDeleteNutritionDay}
              onAddDay={onAddNutritionDay}
              onUpdateMeal={onUpdateMeal}
              onDeleteMeal={onDeleteMeal}
              onAddMeal={onAddMeal}
            />
          </TabsContent>
          <TabsContent value="habits" className="m-0 mt-0">
            <HabitsTab 
              habits={programState.habits}
              onUpdateHabit={onUpdateHabit}
              onDeleteHabit={onDeleteHabit}
              onAddHabit={onAddHabit}
              onToggleHabit={onToggleHabit}
            />
          </TabsContent>
          <TabsContent value="tasks" className="m-0 mt-0">
            <TasksTab 
              tasks={programState.tasks}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onAddTask={onAddTask}
              onToggleTask={onToggleTask}
            />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}

const emptyWeekState: WeeklyProgramState = {
  trainingDays: [],
  nutritionDays: [],
  habits: [],
  tasks: [],
};

export function PlanBuilderTab({ clientId, clientName, onSwitchToClientView }: PlanBuilderTabProps) {
  const [weekIndex, setWeekIndex] = useState(1);
  const [isCopying, setIsCopying] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAssigned, setIsAssigned] = useState(false);
  const { toast } = useToast();

  const planBuilder = usePlanBuilder(clientId || undefined);

  const [weeklyPrograms, setWeeklyPrograms] = useState<Record<number, WeeklyProgramState>>({
    1: {
      trainingDays: initialTrainingDays,
      nutritionDays: initialNutritionDays,
      habits: initialHabits,
      tasks: initialTasks,
    },
  });

  const programState = weeklyPrograms[weekIndex] || null;
  const hasWeekData = programState !== null;

  const setProgramState = (updater: (prev: WeeklyProgramState) => WeeklyProgramState) => {
    setWeeklyPrograms(prev => ({
      ...prev,
      [weekIndex]: updater(prev[weekIndex] || emptyWeekState),
    }));
  };

  const handleCopyFromWeek = (sourceWeek: number) => {
    const sourceData = weeklyPrograms[sourceWeek];
    if (!sourceData) return;
    
    const deepCopy = (data: WeeklyProgramState): WeeklyProgramState => ({
      trainingDays: data.trainingDays.map(d => ({
        ...d,
        id: generateId(),
        exercises: d.exercises.map(e => ({ ...e, id: generateId() })),
      })),
      nutritionDays: data.nutritionDays.map(d => ({
        ...d,
        id: generateId(),
        meals: d.meals.map(m => ({ ...m, id: generateId() })),
      })),
      habits: data.habits.map(h => ({ ...h, id: generateId(), completed: false })),
      tasks: data.tasks.map(t => ({ ...t, id: generateId(), completed: false })),
    });

    setWeeklyPrograms(prev => ({
      ...prev,
      [weekIndex]: deepCopy(sourceData),
    }));
    toast({
      title: "Week copied!",
      description: `Content from Week ${sourceWeek} has been copied to Week ${weekIndex}.`,
    });
  };

  const handleStartFresh = () => {
    setWeeklyPrograms(prev => ({
      ...prev,
      [weekIndex]: { ...emptyWeekState },
    }));
  };

  const getAvailableWeeksToCopy = () => {
    return Object.keys(weeklyPrograms)
      .map(Number)
      .filter(w => w !== weekIndex && weeklyPrograms[w])
      .sort((a, b) => b - a);
  };

  const handleAddTrainingDay = (day: TrainingDay) => {
    setProgramState(prev => ({
      ...prev,
      trainingDays: [...prev.trainingDays, day],
    }));
  };

  const handleUpdateTrainingDay = (dayId: string, updates: Partial<TrainingDay>) => {
    setProgramState(prev => ({
      ...prev,
      trainingDays: prev.trainingDays.map(d => d.id === dayId ? { ...d, ...updates } : d),
    }));
  };

  const handleDeleteTrainingDay = (dayId: string) => {
    setProgramState(prev => ({
      ...prev,
      trainingDays: prev.trainingDays.filter(d => d.id !== dayId),
    }));
    toast({ title: "Training day deleted" });
  };

  const handleUpdateExercise = (dayId: string, exerciseId: string, updates: Exercise) => {
    setProgramState(prev => ({
      ...prev,
      trainingDays: prev.trainingDays.map(d => 
        d.id === dayId 
          ? { ...d, exercises: d.exercises.map(e => e.id === exerciseId ? updates : e) }
          : d
      ),
    }));
  };

  const handleDeleteExercise = (dayId: string, exerciseId: string) => {
    setProgramState(prev => ({
      ...prev,
      trainingDays: prev.trainingDays.map(d => 
        d.id === dayId 
          ? { ...d, exercises: d.exercises.filter(e => e.id !== exerciseId) }
          : d
      ),
    }));
  };

  const handleAddExercise = (dayId: string, exercise: Exercise) => {
    setProgramState(prev => ({
      ...prev,
      trainingDays: prev.trainingDays.map(d => 
        d.id === dayId 
          ? { ...d, exercises: [...d.exercises, exercise] }
          : d
      ),
    }));
  };

  const handleAddMealToDay = (dayId: string, meal: Meal) => {
    setProgramState(prev => ({
      ...prev,
      nutritionDays: prev.nutritionDays.map(d => 
        d.id === dayId 
          ? { ...d, meals: [...d.meals, meal] }
          : d
      ),
    }));
  };

  const handleUpdateMeal = (dayId: string, mealId: string, updates: Meal) => {
    setProgramState(prev => ({
      ...prev,
      nutritionDays: prev.nutritionDays.map(d => 
        d.id === dayId 
          ? { ...d, meals: d.meals.map(m => m.id === mealId ? updates : m) }
          : d
      ),
    }));
  };

  const handleDeleteMeal = (dayId: string, mealId: string) => {
    setProgramState(prev => ({
      ...prev,
      nutritionDays: prev.nutritionDays.map(d => 
        d.id === dayId 
          ? { ...d, meals: d.meals.filter(m => m.id !== mealId) }
          : d
      ),
    }));
  };

  const handleAddNutritionDay = (day: NutritionDay) => {
    setProgramState(prev => ({
      ...prev,
      nutritionDays: [...prev.nutritionDays, day],
    }));
  };

  const handleUpdateNutritionDay = (dayId: string, updates: Partial<NutritionDay>) => {
    setProgramState(prev => ({
      ...prev,
      nutritionDays: prev.nutritionDays.map(d => d.id === dayId ? { ...d, ...updates } : d),
    }));
  };

  const handleDeleteNutritionDay = (dayId: string) => {
    setProgramState(prev => ({
      ...prev,
      nutritionDays: prev.nutritionDays.filter(d => d.id !== dayId),
    }));
  };

  const handleAddHabit = (habit: Habit) => {
    setProgramState(prev => ({
      ...prev,
      habits: [...prev.habits, habit],
    }));
  };

  const handleUpdateHabit = (habitId: string, updates: Partial<Habit>) => {
    setProgramState(prev => ({
      ...prev,
      habits: prev.habits.map(h => h.id === habitId ? { ...h, ...updates } : h),
    }));
  };

  const handleDeleteHabit = (habitId: string) => {
    setProgramState(prev => ({
      ...prev,
      habits: prev.habits.filter(h => h.id !== habitId),
    }));
    toast({ title: "Habit deleted" });
  };

  const handleToggleHabit = (habitId: string) => {
    setProgramState(prev => ({
      ...prev,
      habits: prev.habits.map(h => h.id === habitId ? { ...h, completed: !h.completed } : h),
    }));
  };

  const handleAddTask = (task: Task) => {
    setProgramState(prev => ({
      ...prev,
      tasks: [...prev.tasks, task],
    }));
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    setProgramState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    setProgramState(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== taskId),
    }));
    toast({ title: "Task deleted" });
  };

  const handleToggleTask = (taskId: string) => {
    setProgramState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t),
    }));
  };

  const getWeekStartDate = (weekNum: number) => {
    // Calculate the Monday of the current week as base
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Get Monday of current week (if today is Sunday, go back 6 days, otherwise go back (dayOfWeek - 1) days)
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - daysToMonday);
    
    // Week 1 is the current week, add (weekNum - 1) weeks for future weeks
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() + (weekNum - 1) * 7);
    
    return weekStart.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const handleCopyToNextWeek = () => {
    if (!programState) return;
    setIsCopying(true);
    
    const deepCopy = (data: WeeklyProgramState): WeeklyProgramState => ({
      trainingDays: data.trainingDays.map(d => ({
        ...d,
        id: generateId(),
        exercises: d.exercises.map(e => ({ ...e, id: generateId() })),
      })),
      nutritionDays: data.nutritionDays.map(d => ({
        ...d,
        id: generateId(),
        meals: d.meals.map(m => ({ ...m, id: generateId() })),
      })),
      habits: data.habits.map(h => ({ ...h, id: generateId(), completed: false })),
      tasks: data.tasks.map(t => ({ ...t, id: generateId(), completed: false })),
    });

    setTimeout(() => {
      setWeeklyPrograms(prev => ({
        ...prev,
        [weekIndex + 1]: deepCopy(programState),
      }));
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
        <TabsList className="inline-flex h-auto p-1 bg-muted rounded-lg">
          <TabsTrigger 
            value="this-week" 
            className="py-2 px-4 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md"
            data-testid="tab-this-week"
          >
            This Week
          </TabsTrigger>
          <TabsTrigger 
            value="main-plan" 
            className="py-2 px-4 data-[state=active]:bg-[#28A0AE] data-[state=active]:text-white rounded-md"
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
                  disabled={isCopying || !hasWeekData}
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

          {programState === null ? (
            <Card className="p-8 border-2 border-dashed border-[#28A0AE]/30" data-testid="card-empty-week">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[#28A0AE]/10 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-[#28A0AE]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Plan for Week {weekIndex}</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  This week doesn't have a program yet. Start fresh or copy content from a previous week.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={handleStartFresh}
                    className="bg-[#28A0AE] hover:bg-[#28A0AE]/90 text-white"
                    data-testid="button-start-fresh"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Start Fresh
                  </Button>
                  {getAvailableWeeksToCopy().length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" data-testid="button-copy-from-week">
                          <Copy className="w-4 h-4 mr-2" />
                          Copy from Previous Week
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" align="center">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground px-2 py-1">Select week to copy:</p>
                          {getAvailableWeeksToCopy().map(week => (
                            <Button
                              key={week}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => handleCopyFromWeek(week)}
                              data-testid={`button-copy-week-${week}`}
                            >
                              Week {week}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-4 flex flex-col min-h-[600px]">
                <AiProgramBuilderPanel 
                  clientName={clientName}
                  trainingDays={programState.trainingDays}
                  onAddTrainingDay={handleAddTrainingDay}
                  onAddMeal={handleAddMealToDay}
                  onAddHabit={handleAddHabit}
                  onAddTask={handleAddTask}
                  onAddExercise={handleAddExercise}
                />
              </div>
              <div className="lg:col-span-8 flex flex-col min-h-[600px]">
                <WeeklyEditor 
                  programState={programState}
                  onUpdateTrainingDay={handleUpdateTrainingDay}
                  onUpdateExercise={handleUpdateExercise}
                  onDeleteExercise={handleDeleteExercise}
                  onAddExercise={handleAddExercise}
                  onDeleteTrainingDay={handleDeleteTrainingDay}
                  onAddTrainingDay={handleAddTrainingDay}
                  onUpdateNutritionDay={handleUpdateNutritionDay}
                  onDeleteNutritionDay={handleDeleteNutritionDay}
                  onAddNutritionDay={handleAddNutritionDay}
                  onUpdateMeal={handleUpdateMeal}
                  onDeleteMeal={handleDeleteMeal}
                  onAddMeal={handleAddMealToDay}
                  onUpdateHabit={handleUpdateHabit}
                  onDeleteHabit={handleDeleteHabit}
                  onAddHabit={handleAddHabit}
                  onToggleHabit={handleToggleHabit}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onAddTask={handleAddTask}
                  onToggleTask={handleToggleTask}
                />
              </div>
            </div>
          )}
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
