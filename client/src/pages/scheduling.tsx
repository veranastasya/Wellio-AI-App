import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Clock, Plus, ChevronLeft, ChevronRight, User, Video, Phone, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Client, type Session } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const bookingFormSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  sessionType: z.string().min(1, "Please select a session type"),
  locationType: z.string().min(1, "Please select a location type"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  duration: z.coerce.number().min(15, "Duration must be at least 15 minutes"),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

type ViewMode = "week" | "month";

const sessionTypeColors: Record<string, string> = {
  "Progress Review": "bg-blue-500",
  "Initial Consultation": "bg-cyan-500",
  "Check-in": "bg-amber-500",
  "Nutrition Planning": "bg-emerald-500",
  training: "bg-blue-500",
  consultation: "bg-cyan-500",
  follow_up: "bg-amber-500",
  assessment: "bg-emerald-500",
};

const sessionTypeDotColors: Record<string, string> = {
  "Progress Review": "bg-blue-500",
  "Initial Consultation": "bg-cyan-500",
  "Check-in": "bg-amber-500",
  "Nutrition Planning": "bg-emerald-500",
  training: "bg-blue-500",
  consultation: "bg-cyan-500",
  follow_up: "bg-amber-500",
  assessment: "bg-emerald-500",
};

function formatSessionType(type: string): string {
  const typeMap: Record<string, string> = {
    training: "Progress Review",
    consultation: "Initial Consultation",
    follow_up: "Check-in",
    assessment: "Nutrition Planning",
  };
  return typeMap[type] || type;
}

function getLocationIcon(location?: string) {
  switch (location) {
    case "video":
      return <Video className="w-3 h-3" />;
    case "phone":
      return <Phone className="w-3 h-3" />;
    case "in-person":
      return <MapPin className="w-3 h-3" />;
    default:
      return <Video className="w-3 h-3" />;
  }
}

function getLocationLabel(location?: string): string {
  switch (location) {
    case "video":
      return "Video";
    case "phone":
      return "Phone";
    case "in-person":
      return "In-Person";
    default:
      return "Video";
  }
}

function calculateDuration(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  return (endH * 60 + endM) - (startH * 60 + startM);
}

export default function Scheduling() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      clientId: "",
      sessionType: "",
      locationType: "video",
      date: "",
      startTime: "",
      duration: 45,
      notes: "",
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: BookingFormData & { clientName: string }) => {
      const startMinutes = parseInt(data.startTime.split(":")[0]) * 60 + parseInt(data.startTime.split(":")[1]);
      const endMinutes = startMinutes + data.duration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
      
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: data.clientId,
          clientName: data.clientName,
          sessionType: data.sessionType,
          locationType: data.locationType,
          date: data.date,
          startTime: data.startTime,
          endTime,
          status: "scheduled",
          notes: data.notes || "",
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create session");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Success",
        description: "Session booked successfully",
      });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to book session",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BookingFormData) => {
    const selectedClient = clients.find((c: Client) => c.id === data.clientId);
    if (selectedClient) {
      createSessionMutation.mutate({
        ...data,
        clientName: selectedClient.name,
      });
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startingDayOfWeek = firstDay.getDay();
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getWeekDays = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(selectedDate);
  const weekDays = getWeekDays(selectedDate);

  const previousMonth = () => {
    setSelectedDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setSelectedDate(new Date(year, month + 1, 1));
  };

  const previousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const getSessionsForDate = (day: number) => {
    const dateStr = new Date(year, month, day).toLocaleDateString("en-CA");
    return sessions.filter((s) => s.date === dateStr);
  };

  const getSessionsForDateObj = (date: Date) => {
    const dateStr = date.toLocaleDateString("en-CA");
    return sessions.filter((s) => s.date === dateStr);
  };

  const upcomingSessions = sessions
    .filter((s: Session) => {
      const sessionDate = new Date(s.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return sessionDate >= today && s.status === "scheduled";
    })
    .sort((a, b) => {
      const dateA = new Date(a.date + "T" + a.startTime);
      const dateB = new Date(b.date + "T" + b.startTime);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

  const timeSlots = Array.from({ length: 10 }, (_, i) => i + 9);

  if (clientsLoading || sessionsLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="heading-scheduling">
            Smart Scheduling
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your coaching sessions and appointments
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="button-new-session" 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Book New Session</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-client">
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client: Client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sessionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-session-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="training">Progress Review</SelectItem>
                          <SelectItem value="consultation">Initial Consultation</SelectItem>
                          <SelectItem value="follow_up">Check-in</SelectItem>
                          <SelectItem value="assessment">Nutrition Planning</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-location-type">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="video">Video Call</SelectItem>
                          <SelectItem value="phone">Phone Call</SelectItem>
                          <SelectItem value="in-person">In-Person</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-start-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (min)</FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(parseInt(val))} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-duration">
                              <SelectValue placeholder="Duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="45">45 min</SelectItem>
                            <SelectItem value="60">60 min</SelectItem>
                            <SelectItem value="90">90 min</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add session notes..."
                          {...field}
                          value={field.value || ""}
                          data-testid="input-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createSessionMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createSessionMutation.isPending ? "Booking..." : "Book Session"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={viewMode === "month" ? previousMonth : previousWeek}
                data-testid="button-prev"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="text-base font-semibold min-w-36 text-center" data-testid="text-current-period">
                {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={viewMode === "month" ? nextMonth : nextWeek}
                data-testid="button-next"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="ml-2"
                data-testid="button-today"
              >
                Today
              </Button>
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("week")}
                className={viewMode === "week" ? "bg-background shadow-sm" : ""}
                data-testid="button-week-view"
              >
                Week
              </Button>
              <Button
                variant={viewMode === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("month")}
                className={viewMode === "month" ? "bg-background shadow-sm text-primary" : ""}
                data-testid="button-month-view"
              >
                Month
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {viewMode === "month" ? (
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="grid grid-cols-7 border-b">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-muted-foreground py-3 border-r last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7">
                    {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="min-h-24 p-2 border-r border-b bg-muted/30" />
                    ))}
                    
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const daySessions = getSessionsForDate(day);
                      const isToday = 
                        day === new Date().getDate() &&
                        month === new Date().getMonth() &&
                        year === new Date().getFullYear();
                      
                      return (
                        <div
                          key={day}
                          className={`min-h-24 p-2 border-r border-b last:border-r-0 ${
                            isToday ? "bg-primary/5" : "hover:bg-muted/50"
                          }`}
                          data-testid={`calendar-day-${day}`}
                        >
                          <div className={`text-sm font-medium mb-2 ${isToday ? "text-primary" : "text-foreground"}`}>
                            {day}
                          </div>
                          <div className="space-y-1">
                            {daySessions.slice(0, 3).map((session: Session) => (
                              <div
                                key={session.id}
                                className="flex items-center gap-1"
                                data-testid={`session-${session.id}`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  sessionTypeDotColors[session.sessionType] || "bg-blue-500"
                                }`} />
                                <span className="text-xs text-muted-foreground truncate">
                                  {session.startTime}
                                </span>
                              </div>
                            ))}
                            {daySessions.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{daySessions.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  <div className="grid grid-cols-8 border-b">
                    <div className="py-3 px-2 text-sm font-medium text-muted-foreground border-r">
                      Time
                    </div>
                    {weekDays.map((day, i) => {
                      const isToday = day.toDateString() === new Date().toDateString();
                      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                      return (
                        <div 
                          key={i} 
                          className={`py-3 text-center border-r last:border-r-0 ${isToday ? "bg-primary/5" : ""}`}
                        >
                          <div className="text-sm font-medium text-muted-foreground">
                            {dayNames[i]}
                          </div>
                          <div className={`text-lg font-semibold ${isToday ? "text-primary" : ""}`}>
                            {day.getDate()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="relative max-h-[500px] overflow-y-auto">
                    {timeSlots.map((hour) => (
                      <div key={hour} className="grid grid-cols-8 border-b">
                        <div className="py-6 px-2 text-sm text-muted-foreground border-r">
                          {hour.toString().padStart(2, "0")}:00
                        </div>
                        {weekDays.map((day, dayIndex) => {
                          const daySessions = getSessionsForDateObj(day).filter((s) => {
                            const sessionHour = parseInt(s.startTime.split(":")[0]);
                            return sessionHour === hour;
                          });
                          const isToday = day.toDateString() === new Date().toDateString();
                          
                          return (
                            <div 
                              key={dayIndex} 
                              className={`py-1 px-1 border-r last:border-r-0 relative min-h-16 ${
                                isToday ? "bg-primary/5" : ""
                              }`}
                            >
                              {daySessions.map((session: Session) => {
                                const duration = session.endTime 
                                  ? calculateDuration(session.startTime, session.endTime)
                                  : 45;
                                const heightFactor = Math.max(duration / 60, 0.75);
                                
                                return (
                                  <div
                                    key={session.id}
                                    className={`absolute left-1 right-1 rounded-md p-2 text-white text-xs ${
                                      sessionTypeColors[session.sessionType] || "bg-blue-500"
                                    }`}
                                    style={{ 
                                      minHeight: `${heightFactor * 60}px`,
                                      zIndex: 10
                                    }}
                                    data-testid={`week-session-${session.id}`}
                                  >
                                    <div className="font-medium">
                                      {session.startTime} - {formatSessionType(session.sessionType)}
                                    </div>
                                    <div className="opacity-90 truncate">
                                      {session.clientName}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No upcoming sessions
              </div>
            ) : (
              upcomingSessions.map((session: Session) => {
                const duration = session.endTime 
                  ? calculateDuration(session.startTime, session.endTime)
                  : 45;
                const displayType = formatSessionType(session.sessionType);
                const locationType = (session as any).locationType || "video";
                
                return (
                  <div
                    key={session.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover-elevate"
                    data-testid={`upcoming-session-${session.id}`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                      sessionTypeDotColors[session.sessionType] || "bg-blue-500"
                    }`} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="font-medium text-sm">{displayType}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span className="truncate">{session.clientName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{session.startTime} • {duration} min</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {getLocationIcon(locationType)}
                        <span>{getLocationLabel(locationType)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
