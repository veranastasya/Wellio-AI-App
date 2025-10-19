import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Trash2, GripVertical, ArrowLeft, Save, Eye } from "lucide-react";
import type { Questionnaire } from "@shared/schema";

type QuestionType = "short_text" | "paragraph" | "multiple_choice" | "checkboxes" | "dropdown" | "date" | "number";

interface Question {
  id: string;
  label: string;
  type: QuestionType;
  isRequired: boolean;
  options?: string[];
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  welcomeText: z.string().optional(),
  consentText: z.string().optional(),
  consentRequired: z.boolean(),
  confirmationMessage: z.string().optional(),
});

export default function QuestionnaireBuilder() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEditMode = Boolean(id) && id !== "new";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>("short_text");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      welcomeText: "",
      consentText: "",
      consentRequired: false,
      confirmationMessage: "Thank you for completing the questionnaire!",
    },
  });

  const { data: questionnaire, isLoading } = useQuery<Questionnaire>({
    queryKey: ["/api/questionnaires", id],
    enabled: isEditMode && Boolean(id),
  });

  useEffect(() => {
    if (questionnaire) {
      form.reset({
        name: questionnaire.name,
        welcomeText: questionnaire.welcomeText || "",
        consentText: questionnaire.consentText || "",
        consentRequired: questionnaire.consentRequired,
        confirmationMessage: questionnaire.confirmationMessage || "",
      });
      setQuestions(questionnaire.questions as Question[]);
    }
  }, [questionnaire, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: { status: "draft" | "published" }) => {
      const formData = form.getValues();
      const now = new Date().toISOString();
      
      if (isEditMode && id) {
        const payload = {
          name: formData.name,
          status: data.status,
          questions,
          welcomeText: formData.welcomeText,
          consentText: formData.consentText,
          consentRequired: formData.consentRequired,
          confirmationMessage: formData.confirmationMessage,
          updatedAt: now,
        };
        await apiRequest("PATCH", `/api/questionnaires/${id}`, payload);
      } else {
        const payload = {
          name: formData.name,
          status: data.status,
          questions,
          welcomeText: formData.welcomeText,
          consentText: formData.consentText,
          consentRequired: formData.consentRequired,
          confirmationMessage: formData.confirmationMessage,
          createdAt: now,
          updatedAt: now,
        };
        await apiRequest("POST", "/api/questionnaires", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaires"] });
      toast({
        title: "Success",
        description: "Questionnaire saved successfully",
      });
      setLocation("/questionnaires");
    },
    onError: (error: any) => {
      console.error("Save questionnaire error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save questionnaire",
        variant: "destructive",
      });
    },
  });

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      label: "",
      type: newQuestionType,
      isRequired: false,
      options: newQuestionType === "multiple_choice" || newQuestionType === "checkboxes" || newQuestionType === "dropdown"
        ? ["Option 1", "Option 2"]
        : undefined,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSave = (status: "draft" | "published") => {
    const formData = form.getValues();
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Please enter a questionnaire name",
        variant: "destructive",
      });
      return;
    }

    // Validate custom questions
    for (const question of questions) {
      if (!question.label || question.label.trim() === "") {
        toast({
          title: "Validation Error",
          description: "All questions must have a label",
          variant: "destructive",
        });
        return;
      }

      // Validate option-based questions have at least one option
      if (
        (question.type === "multiple_choice" || 
         question.type === "checkboxes" || 
         question.type === "dropdown") &&
        (!question.options || question.options.length === 0 || question.options.every(opt => !opt.trim()))
      ) {
        toast({
          title: "Validation Error",
          description: `Question "${question.label}" must have at least one option`,
          variant: "destructive",
        });
        return;
      }
    }

    saveMutation.mutate({ status });
  };

  if (isEditMode && isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/questionnaires")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {isEditMode ? "Edit Questionnaire" : "New Questionnaire"}
              </h1>
              <p className="text-muted-foreground mt-1">
                Create a custom intake form for your clients
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave("draft")}
              disabled={saveMutation.isPending}
              data-testid="button-save-draft"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={() => handleSave("published")}
              disabled={saveMutation.isPending}
              data-testid="button-publish"
            >
              Publish
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Form Settings</CardTitle>
                <CardDescription>Configure your questionnaire details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...form}>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Form Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Client Intake Form"
                            data-testid="input-form-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="welcomeText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Welcome Text (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Welcome! Please fill out this form to help us understand your goals."
                            rows={3}
                            data-testid="input-welcome-text"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="consentText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consent Text (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="I agree to the terms and conditions..."
                            rows={2}
                            data-testid="input-consent-text"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="consentRequired"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Require Consent</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Clients must agree to consent text before submitting
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-consent-required"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmationMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmation Message</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Thank you for completing the questionnaire!"
                            data-testid="input-confirmation-message"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Default Client Information</CardTitle>
                <CardDescription>These fields are required and cannot be removed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {["First Name", "Last Name", "Email", "Phone"].map((field) => (
                  <div
                    key={field}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                    data-testid={`default-field-${field.toLowerCase().replace(" ", "-")}`}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{field}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Required</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Custom Questions</CardTitle>
                <CardDescription>Add additional questions to your form</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="p-4 rounded-lg border space-y-3"
                    data-testid={`question-${index}`}
                  >
                    <div className="flex items-start gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-2" />
                      <div className="flex-1 space-y-3">
                        <Input
                          value={question.label}
                          onChange={(e) => updateQuestion(question.id, { label: e.target.value })}
                          placeholder="Question label"
                          data-testid={`input-question-label-${index}`}
                        />
                        
                        <div className="flex items-center gap-3">
                          <Select
                            value={question.type}
                            onValueChange={(value) => updateQuestion(question.id, { type: value as QuestionType })}
                          >
                            <SelectTrigger data-testid={`select-question-type-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="short_text">Short Text</SelectItem>
                              <SelectItem value="paragraph">Paragraph</SelectItem>
                              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                              <SelectItem value="checkboxes">Checkboxes</SelectItem>
                              <SelectItem value="dropdown">Dropdown</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={question.isRequired}
                              onCheckedChange={(checked) => updateQuestion(question.id, { isRequired: checked })}
                              data-testid={`switch-required-${index}`}
                            />
                            <Label className="text-sm">Required</Label>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteQuestion(question.id)}
                        data-testid={`button-delete-question-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-3">
                  <Select value={newQuestionType} onValueChange={(v) => setNewQuestionType(v as QuestionType)}>
                    <SelectTrigger className="w-[200px]" data-testid="select-new-question-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short_text">Short Text</SelectItem>
                      <SelectItem value="paragraph">Paragraph</SelectItem>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="checkboxes">Checkboxes</SelectItem>
                      <SelectItem value="dropdown">Dropdown</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={addQuestion} variant="outline" data-testid="button-add-question">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>How your form will look</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Preview feature coming soon. Your questionnaire will display all default fields followed by your custom questions.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
