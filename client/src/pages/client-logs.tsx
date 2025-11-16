import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertNutritionLogSchema, insertWorkoutLogSchema, insertCheckInSchema } from "@shared/schema";
import { ClipboardList, Apple, Dumbbell, Scale, Target } from "lucide-react";
import type { z } from "zod";
import { DeviceConnection } from "@/components/device-connection";
import { ClientGoals } from "@/components/goals/client-goals";

interface Client {
  id: string;
  name: string;
  email: string;
  status: string;
}

type NutritionLogFormData = z.infer<typeof insertNutritionLogSchema>;
type WorkoutLogFormData = z.infer<typeof insertWorkoutLogSchema>;
type CheckInFormData = z.infer<typeof insertCheckInSchema>;

export default function ClientLogs() {
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const activeClients = clients?.filter(c => c.status === "active") || [];
  const selectedClient = activeClients.find(c => c.id === selectedClientId);

  const nutritionForm = useForm<NutritionLogFormData>({
    resolver: zodResolver(insertNutritionLogSchema),
    defaultValues: {
      clientId: "",
      clientName: "",
      date: new Date().toISOString().split('T')[0],
      calories: null,
      protein: null,
      carbs: null,
      fats: null,
      notes: "",
    },
  });

  const workoutForm = useForm<WorkoutLogFormData>({
    resolver: zodResolver(insertWorkoutLogSchema),
    defaultValues: {
      clientId: "",
      clientName: "",
      date: new Date().toISOString().split('T')[0],
      workoutType: "strength",
      duration: null,
      intensity: "moderate",
      notes: "",
    },
  });

  const checkInForm = useForm<CheckInFormData>({
    resolver: zodResolver(insertCheckInSchema),
    defaultValues: {
      clientId: "",
      clientName: "",
      date: new Date().toISOString().split('T')[0],
      weight: null,
      bodyFat: null,
      notes: "",
    },
  });

  const nutritionMutation = useMutation({
    mutationFn: (data: NutritionLogFormData) => 
      apiRequest("POST", "/api/nutrition-logs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition-logs"] });
      toast({
        title: "Success",
        description: "Nutrition log added successfully",
      });
      nutritionForm.reset({
        clientId: selectedClientId,
        clientName: selectedClient?.name || "",
        date: new Date().toISOString().split('T')[0],
        calories: null,
        protein: null,
        carbs: null,
        fats: null,
        notes: "",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add nutrition log",
        variant: "destructive",
      });
    },
  });

  const workoutMutation = useMutation({
    mutationFn: (data: WorkoutLogFormData) => 
      apiRequest("POST", "/api/workout-logs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-logs"] });
      toast({
        title: "Success",
        description: "Workout log added successfully",
      });
      workoutForm.reset({
        clientId: selectedClientId,
        clientName: selectedClient?.name || "",
        date: new Date().toISOString().split('T')[0],
        workoutType: "strength",
        duration: null,
        intensity: "moderate",
        notes: "",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add workout log",
        variant: "destructive",
      });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (data: CheckInFormData) => 
      apiRequest("POST", "/api/check-ins", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/check-ins"] });
      toast({
        title: "Success",
        description: "Check-in log added successfully",
      });
      checkInForm.reset({
        clientId: selectedClientId,
        clientName: selectedClient?.name || "",
        date: new Date().toISOString().split('T')[0],
        weight: null,
        bodyFat: null,
        notes: "",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add check-in log",
        variant: "destructive",
      });
    },
  });

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = activeClients.find(c => c.id === clientId);
    if (client) {
      nutritionForm.setValue("clientId", clientId);
      nutritionForm.setValue("clientName", client.name);
      workoutForm.setValue("clientId", clientId);
      workoutForm.setValue("clientName", client.name);
      checkInForm.setValue("clientId", clientId);
      checkInForm.setValue("clientName", client.name);
    }
  };

  const onNutritionSubmit = (data: NutritionLogFormData) => {
    nutritionMutation.mutate(data);
  };

  const onWorkoutSubmit = (data: WorkoutLogFormData) => {
    workoutMutation.mutate(data);
  };

  const onCheckInSubmit = (data: CheckInFormData) => {
    checkInMutation.mutate(data);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 sm:p-6 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="heading-client-logs">
              Client Data Logs
            </h1>
            <p className="text-sm text-muted-foreground">
              Track nutrition, workouts, and progress check-ins
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card data-testid="card-client-selector">
            <CardHeader>
              <CardTitle className="text-lg">Select Client</CardTitle>
              <CardDescription>Choose a client to log their data</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedClientId} onValueChange={handleClientChange}>
                <SelectTrigger data-testid="select-client">
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {activeClients.map((client) => (
                    <SelectItem key={client.id} value={client.id} data-testid={`client-option-${client.id}`}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedClientId && selectedClient && (
            <>
              <DeviceConnection 
                clientId={selectedClientId} 
                clientName={selectedClient.name}
                clientEmail={selectedClient.email}
              />
              
              <Tabs defaultValue="nutrition" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
                <TabsTrigger value="nutrition" data-testid="tab-nutrition" className="text-xs sm:text-sm">
                  <Apple className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Nutrition</span>
                  <span className="sm:hidden">Nutr</span>
                </TabsTrigger>
                <TabsTrigger value="workout" data-testid="tab-workout" className="text-xs sm:text-sm">
                  <Dumbbell className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Workout</span>
                  <span className="sm:hidden">Work</span>
                </TabsTrigger>
                <TabsTrigger value="checkin" data-testid="tab-checkin" className="text-xs sm:text-sm">
                  <Scale className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Check-in</span>
                  <span className="sm:hidden">Check</span>
                </TabsTrigger>
                <TabsTrigger value="goals" data-testid="tab-goals" className="text-xs sm:text-sm">
                  <Target className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Goals</span>
                  <span className="sm:hidden">Goals</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="nutrition">
                <Card>
                  <CardHeader>
                    <CardTitle>Log Nutrition Data</CardTitle>
                    <CardDescription>
                      Track daily macronutrient intake for {selectedClient?.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...nutritionForm}>
                      <form onSubmit={nutritionForm.handleSubmit(onNutritionSubmit)} className="space-y-4">
                        <FormField
                          control={nutritionForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-nutrition-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                          <FormField
                            control={nutritionForm.control}
                            name="calories"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Calories</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    {...field} 
                                    value={field.value ?? ""}
                                    onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                    data-testid="input-calories" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={nutritionForm.control}
                            name="protein"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Protein (g)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    {...field} 
                                    value={field.value ?? ""}
                                    onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                    data-testid="input-protein" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={nutritionForm.control}
                            name="carbs"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Carbs (g)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    {...field} 
                                    value={field.value ?? ""}
                                    onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                    data-testid="input-carbs" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={nutritionForm.control}
                            name="fats"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fats (g)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    {...field} 
                                    value={field.value ?? ""}
                                    onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                    data-testid="input-fats" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={nutritionForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes (Optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  value={field.value || ""}
                                  placeholder="Any additional observations..."
                                  data-testid="input-nutrition-notes" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          disabled={nutritionMutation.isPending}
                          data-testid="button-save-nutrition"
                        >
                          {nutritionMutation.isPending ? "Saving..." : "Save Nutrition Log"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="workout">
                <Card>
                  <CardHeader>
                    <CardTitle>Log Workout Data</CardTitle>
                    <CardDescription>
                      Track training sessions for {selectedClient?.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...workoutForm}>
                      <form onSubmit={workoutForm.handleSubmit(onWorkoutSubmit)} className="space-y-4">
                        <FormField
                          control={workoutForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-workout-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                          <FormField
                            control={workoutForm.control}
                            name="workoutType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Workout Type</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-workout-type">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="strength">Strength</SelectItem>
                                    <SelectItem value="cardio">Cardio</SelectItem>
                                    <SelectItem value="hiit">HIIT</SelectItem>
                                    <SelectItem value="flexibility">Flexibility</SelectItem>
                                    <SelectItem value="sports">Sports</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={workoutForm.control}
                            name="duration"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Duration (minutes)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    {...field} 
                                    value={field.value ?? ""}
                                    onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                    data-testid="input-duration" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={workoutForm.control}
                          name="intensity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Intensity</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value ?? undefined}
                                value={field.value ?? undefined}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-intensity">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="moderate">Moderate</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={workoutForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes (Optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  value={field.value || ""}
                                  placeholder="Exercises performed, sets, reps, etc..."
                                  data-testid="input-workout-notes" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          disabled={workoutMutation.isPending}
                          data-testid="button-save-workout"
                        >
                          {workoutMutation.isPending ? "Saving..." : "Save Workout Log"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="checkin">
                <Card>
                  <CardHeader>
                    <CardTitle>Log Check-in Data</CardTitle>
                    <CardDescription>
                      Track body metrics and progress for {selectedClient?.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...checkInForm}>
                      <form onSubmit={checkInForm.handleSubmit(onCheckInSubmit)} className="space-y-4">
                        <FormField
                          control={checkInForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-checkin-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                          <FormField
                            control={checkInForm.control}
                            name="weight"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Weight (lbs)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.1"
                                    {...field} 
                                    value={field.value ?? ""}
                                    onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                    data-testid="input-weight" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={checkInForm.control}
                            name="bodyFat"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Body Fat (%)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.1"
                                    {...field} 
                                    value={field.value ?? ""}
                                    onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                    data-testid="input-bodyfat" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={checkInForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes (Optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  value={field.value || ""}
                                  placeholder="Energy levels, measurements, photos, etc..."
                                  data-testid="input-checkin-notes" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          disabled={checkInMutation.isPending}
                          data-testid="button-save-checkin"
                        >
                          {checkInMutation.isPending ? "Saving..." : "Save Check-in Log"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="goals">
                <ClientGoals clientId={selectedClientId} clientName={selectedClient.name} />
              </TabsContent>
            </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
