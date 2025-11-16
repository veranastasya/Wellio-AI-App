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
  FormDescription,
} from "@/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Trash2, GripVertical, ArrowLeft, Save, X } from "lucide-react";
import type { Questionnaire, Question, QuestionType, QUESTION_TYPES } from "@shared/schema";
import { normalizeQuestion } from "@shared/schema";
import { type UnitsPreference, UNITS_LABELS } from "@shared/units";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  welcomeText: z.string().optional(),
  consentText: z.string().optional(),
  consentRequired: z.boolean(),
  confirmationMessage: z.string().optional(),
  defaultUnitsPreference: z.enum(["us", "metric"]),
});

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Short Answer",
  paragraph: "Paragraph",
  multiple_choice: "Multiple Choice",
  checkboxes: "Checkboxes",
  dropdown: "Dropdown",
  number: "Number",
  date: "Date",
  email: "Email",
  phone: "Phone",
  file_upload: "File Upload",
};

export default function QuestionnaireBuilder() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEditMode = Boolean(id) && id !== "new";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>("short_text");
  const [standardFields, setStandardFields] = useState({
    sex: true,
    weight: true,
    age: true,
    height: true,
    activityLevel: true,
    bodyFatPercentage: true,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      welcomeText: "",
      consentText: "",
      consentRequired: false,
      confirmationMessage: "Thank you for completing the questionnaire!",
      defaultUnitsPreference: "us" as UnitsPreference,
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
        defaultUnitsPreference: (questionnaire.defaultUnitsPreference as UnitsPreference) || "us",
      });
      const normalized = (questionnaire.questions as any[]).map(normalizeQuestion);
      setQuestions(normalized);
      
      if (questionnaire.standardFields) {
        setStandardFields({
          sex: questionnaire.standardFields.sex !== false,
          weight: questionnaire.standardFields.weight !== false,
          age: questionnaire.standardFields.age !== false,
          height: questionnaire.standardFields.height !== false,
          activityLevel: questionnaire.standardFields.activityLevel !== false,
          bodyFatPercentage: questionnaire.standardFields.bodyFatPercentage !== false,
        });
      } else {
        // Default to all enabled for questionnaires without standardFields
        setStandardFields({
          sex: true,
          weight: true,
          age: true,
          height: true,
          activityLevel: true,
          bodyFatPercentage: true,
        });
      }
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
          defaultUnitsPreference: formData.defaultUnitsPreference,
          standardFields,
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
          defaultUnitsPreference: formData.defaultUnitsPreference,
          standardFields,
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
      type: newQuestionType,
      label: "",
      description: "",
      required: false,
      settings: getDefaultSettings(newQuestionType),
    } as Question;
    
    setQuestions([...questions, newQuestion]);
  };

  const getDefaultSettings = (type: QuestionType): any => {
    switch (type) {
      case "multiple_choice":
      case "dropdown":
        return { options: ["Option 1", "Option 2"] };
      case "checkboxes":
        return { options: ["Option 1", "Option 2"] };
      case "short_text":
      case "paragraph":
      case "email":
      case "phone":
        return { placeholder: "" };
      case "number":
        return { placeholder: "", min: undefined, max: undefined, step: 1 };
      case "date":
        return { minDate: "", maxDate: "" };
      case "file_upload":
        return { allowedTypes: ["image/*", "application/pdf"], maxSizeMB: 10, maxFiles: 5 };
      default:
        return {};
    }
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => {
      if (q.id === id) {
        const updated = { ...q, ...updates };
        
        if (updates.type && updates.type !== q.type) {
          updated.settings = getDefaultSettings(updates.type);
        }
        
        return updated as Question;
      }
      return q;
    }));
  };

  const updateQuestionSettings = (id: string, settings: any) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, settings: { ...q.settings, ...settings } } : q
    ));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const duplicateQuestion = (question: Question) => {
    const duplicate: Question = {
      ...question,
      id: Math.random().toString(36).substr(2, 9),
      label: `${question.label} (Copy)`,
    } as Question;
    
    const index = questions.findIndex(q => q.id === question.id);
    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, duplicate);
    setQuestions(newQuestions);
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

    for (const question of questions) {
      if (!question.label || question.label.trim() === "") {
        toast({
          title: "Validation Error",
          description: "All questions must have a label",
          variant: "destructive",
        });
        return;
      }

      if (
        (question.type === "multiple_choice" || 
         question.type === "checkboxes" || 
         question.type === "dropdown") &&
        (!question.settings?.options || question.settings.options.length === 0 || question.settings.options.every((opt: string) => !opt.trim()))
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
            {["Client Name", "Email", "Phone"].map((field) => (
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
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle>Standard Health Metrics</CardTitle>
                <CardDescription>Enable optional health-related fields for your intake form</CardDescription>
              </div>
              <div className="flex-shrink-0">
                <FormField
                  control={form.control}
                  name="defaultUnitsPreference"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-[140px]" data-testid="select-default-units-top">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us">{UNITS_LABELS.us}</SelectItem>
                        <SelectItem value="metric">{UNITS_LABELS.metric}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "sex" as const, label: "Sex", description: "Gender identification (Male, Female, Other, Prefer not to say)" },
              { key: "age" as const, label: "Age", description: "Client's current age in years" },
              { key: "weight" as const, label: "Weight", description: "Current weight in kg or lbs" },
              { key: "height" as const, label: "Height", description: "Current height in cm or ft/in" },
              { key: "activityLevel" as const, label: "Activity Level", description: "Physical activity level (Sedentary to Extra Active)" },
              { key: "bodyFatPercentage" as const, label: "Body Fat %", description: "Body fat percentage (0-100%)" },
            ].map((field) => (
              <div
                key={field.key}
                className="flex items-center justify-between p-4 rounded-lg border"
                data-testid={`standard-field-${field.key}`}
              >
                <div className="space-y-0.5">
                  <div className="font-medium">{field.label}</div>
                  <div className="text-sm text-muted-foreground">{field.description}</div>
                </div>
                <Switch
                  checked={standardFields[field.key]}
                  onCheckedChange={(checked) =>
                    setStandardFields({ ...standardFields, [field.key]: checked })
                  }
                  data-testid={`switch-${field.key}`}
                />
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
            <Accordion type="multiple" className="w-full">
              {questions.map((question, index) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  index={index}
                  onUpdate={(updates) => updateQuestion(question.id, updates)}
                  onUpdateSettings={(settings) => updateQuestionSettings(question.id, settings)}
                  onDelete={() => deleteQuestion(question.id)}
                  onDuplicate={() => duplicateQuestion(question)}
                />
              ))}
            </Accordion>

            <div className="flex items-center gap-3 pt-4">
              <Select value={newQuestionType} onValueChange={(v) => setNewQuestionType(v as QuestionType)}>
                <SelectTrigger className="w-[200px]" data-testid="select-new-question-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {QUESTION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
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
    </div>
  );
}

interface QuestionEditorProps {
  question: Question;
  index: number;
  onUpdate: (updates: Partial<Question>) => void;
  onUpdateSettings: (settings: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function QuestionEditor({ question, index, onUpdate, onUpdateSettings, onDelete, onDuplicate }: QuestionEditorProps) {
  return (
    <AccordionItem value={question.id}>
      <div className="border rounded-lg">
        <div className="flex items-start gap-3 p-4">
          <GripVertical className="h-4 w-4 text-muted-foreground mt-2 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <AccordionTrigger className="hover:no-underline py-0">
              <div className="flex items-center gap-3 text-left">
                <span className="font-medium">
                  {question.label || `Question ${index + 1}`}
                </span>
                <span className="text-sm text-muted-foreground">
                  {QUESTION_TYPE_LABELS[question.type]}
                </span>
                {question.required && (
                  <span className="text-xs text-destructive">Required</span>
                )}
              </div>
            </AccordionTrigger>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              data-testid={`button-duplicate-question-${index}`}
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              data-testid={`button-delete-question-${index}`}
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <AccordionContent className="px-4 pb-4 pt-0">
          <div className="space-y-4 pl-7">
            <div className="space-y-2">
              <Label htmlFor={`question-label-${question.id}`}>Question Label *</Label>
              <Input
                id={`question-label-${question.id}`}
                value={question.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder="Enter your question"
                data-testid={`input-question-label-${index}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`question-description-${question.id}`}>Description (Optional)</Label>
              <Input
                id={`question-description-${question.id}`}
                value={question.description || ""}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="Helper text for this question"
                data-testid={`input-question-description-${index}`}
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={question.type}
                  onValueChange={(value) => onUpdate({ type: value as QuestionType })}
                >
                  <SelectTrigger className="w-[200px]" data-testid={`select-question-type-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {QUESTION_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={question.required}
                  onCheckedChange={(checked) => onUpdate({ required: checked })}
                  data-testid={`switch-required-${index}`}
                />
                <Label className="text-sm">Required</Label>
              </div>
            </div>

            <QuestionSettings
              question={question}
              index={index}
              onUpdateSettings={onUpdateSettings}
            />
          </div>
        </AccordionContent>
      </div>
    </AccordionItem>
  );
}

interface QuestionSettingsProps {
  question: Question;
  index: number;
  onUpdateSettings: (settings: any) => void;
}

function QuestionSettings({ question, index, onUpdateSettings }: QuestionSettingsProps) {
  const settings = (question.settings || {}) as any;

  const addOption = () => {
    if (question.type === "multiple_choice" || question.type === "checkboxes" || question.type === "dropdown") {
      const currentOptions = settings.options || [];
      onUpdateSettings({
        options: [...currentOptions, `Option ${currentOptions.length + 1}`]
      });
    }
  };

  const updateOption = (idx: number, value: string) => {
    if (question.type === "multiple_choice" || question.type === "checkboxes" || question.type === "dropdown") {
      const newOptions = [...(settings.options || [])];
      newOptions[idx] = value;
      onUpdateSettings({ options: newOptions });
    }
  };

  const deleteOption = (idx: number) => {
    if (question.type === "multiple_choice" || question.type === "checkboxes" || question.type === "dropdown") {
      const newOptions = (settings.options || []).filter((_: string, i: number) => i !== idx);
      onUpdateSettings({ options: newOptions });
    }
  };

  switch (question.type) {
    case "short_text":
    case "paragraph":
    case "email":
    case "phone":
      return (
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-sm font-medium">Settings</Label>
          <div className="space-y-2">
            <Label htmlFor={`placeholder-${question.id}`} className="text-sm text-muted-foreground">
              Placeholder Text
            </Label>
            <Input
              id={`placeholder-${question.id}`}
              value={settings.placeholder || ""}
              onChange={(e) => onUpdateSettings({ placeholder: e.target.value })}
              placeholder="Enter placeholder text..."
              data-testid={`input-placeholder-${index}`}
            />
          </div>
          {(question.type === "short_text" || question.type === "paragraph") && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`min-length-${question.id}`} className="text-sm text-muted-foreground">
                  Min Length
                </Label>
                <Input
                  id={`min-length-${question.id}`}
                  type="number"
                  value={settings.minLength || ""}
                  onChange={(e) => onUpdateSettings({ minLength: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Min"
                  data-testid={`input-min-length-${index}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`max-length-${question.id}`} className="text-sm text-muted-foreground">
                  Max Length
                </Label>
                <Input
                  id={`max-length-${question.id}`}
                  type="number"
                  value={settings.maxLength || ""}
                  onChange={(e) => onUpdateSettings({ maxLength: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Max"
                  data-testid={`input-max-length-${index}`}
                />
              </div>
            </div>
          )}
        </div>
      );

    case "multiple_choice":
    case "checkboxes":
    case "dropdown":
      return (
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-sm font-medium">Options</Label>
          <div className="space-y-2">
            {(settings.options || []).map((option: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  data-testid={`input-option-${index}-${idx}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteOption(idx)}
                  disabled={(settings.options || []).length <= 1}
                  data-testid={`button-delete-option-${index}-${idx}`}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addOption}
              data-testid={`button-add-option-${index}`}
            >
              <Plus className="h-3 w-3 mr-2" />
              Add Option
            </Button>
          </div>
          {question.type === "checkboxes" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`min-selections-${question.id}`} className="text-sm text-muted-foreground">
                  Min Selections
                </Label>
                <Input
                  id={`min-selections-${question.id}`}
                  type="number"
                  value={settings.minSelections || ""}
                  onChange={(e) => onUpdateSettings({ minSelections: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Min"
                  data-testid={`input-min-selections-${index}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`max-selections-${question.id}`} className="text-sm text-muted-foreground">
                  Max Selections
                </Label>
                <Input
                  id={`max-selections-${question.id}`}
                  type="number"
                  value={settings.maxSelections || ""}
                  onChange={(e) => onUpdateSettings({ maxSelections: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Max"
                  data-testid={`input-max-selections-${index}`}
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.allowOther || false}
              onCheckedChange={(checked) => onUpdateSettings({ allowOther: checked })}
              data-testid={`switch-allow-other-${index}`}
            />
            <Label className="text-sm">Allow "Other" option</Label>
          </div>
        </div>
      );

    case "number":
      return (
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-sm font-medium">Settings</Label>
          <div className="space-y-2">
            <Label htmlFor={`placeholder-${question.id}`} className="text-sm text-muted-foreground">
              Placeholder Text
            </Label>
            <Input
              id={`placeholder-${question.id}`}
              value={settings.placeholder || ""}
              onChange={(e) => onUpdateSettings({ placeholder: e.target.value })}
              placeholder="Enter a number..."
              data-testid={`input-placeholder-${index}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`unit-label-${question.id}`} className="text-sm text-muted-foreground">
              Unit Label (e.g., kg, lbs, cm)
            </Label>
            <Input
              id={`unit-label-${question.id}`}
              value={settings.unitLabel || ""}
              onChange={(e) => onUpdateSettings({ unitLabel: e.target.value })}
              placeholder="kg"
              data-testid={`input-unit-label-${index}`}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`min-${question.id}`} className="text-sm text-muted-foreground">
                Min
              </Label>
              <Input
                id={`min-${question.id}`}
                type="number"
                value={settings.min || ""}
                onChange={(e) => onUpdateSettings({ min: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="Min"
                data-testid={`input-min-${index}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`max-${question.id}`} className="text-sm text-muted-foreground">
                Max
              </Label>
              <Input
                id={`max-${question.id}`}
                type="number"
                value={settings.max || ""}
                onChange={(e) => onUpdateSettings({ max: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="Max"
                data-testid={`input-max-${index}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`step-${question.id}`} className="text-sm text-muted-foreground">
                Step
              </Label>
              <Input
                id={`step-${question.id}`}
                type="number"
                value={settings.step || 1}
                onChange={(e) => onUpdateSettings({ step: e.target.value ? parseFloat(e.target.value) : 1 })}
                placeholder="1"
                data-testid={`input-step-${index}`}
              />
            </div>
          </div>
        </div>
      );

    case "date":
      return (
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-sm font-medium">Settings</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`min-date-${question.id}`} className="text-sm text-muted-foreground">
                Min Date
              </Label>
              <Input
                id={`min-date-${question.id}`}
                type="date"
                value={settings.minDate || ""}
                onChange={(e) => onUpdateSettings({ minDate: e.target.value })}
                data-testid={`input-min-date-${index}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`max-date-${question.id}`} className="text-sm text-muted-foreground">
                Max Date
              </Label>
              <Input
                id={`max-date-${question.id}`}
                type="date"
                value={settings.maxDate || ""}
                onChange={(e) => onUpdateSettings({ maxDate: e.target.value })}
                data-testid={`input-max-date-${index}`}
              />
            </div>
          </div>
        </div>
      );

    case "file_upload":
      return (
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-sm font-medium">Settings</Label>
          <div className="space-y-2">
            <Label htmlFor={`allowed-types-${question.id}`} className="text-sm text-muted-foreground">
              Allowed File Types (comma-separated)
            </Label>
            <Input
              id={`allowed-types-${question.id}`}
              value={(settings.allowedTypes || []).join(", ")}
              onChange={(e) => onUpdateSettings({ 
                allowedTypes: e.target.value.split(",").map(t => t.trim()).filter(Boolean)
              })}
              placeholder="image/*, application/pdf"
              data-testid={`input-allowed-types-${index}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`max-size-${question.id}`} className="text-sm text-muted-foreground">
                Max Size (MB)
              </Label>
              <Input
                id={`max-size-${question.id}`}
                type="number"
                value={settings.maxSizeMB || ""}
                onChange={(e) => onUpdateSettings({ maxSizeMB: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="10"
                data-testid={`input-max-size-${index}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`max-files-${question.id}`} className="text-sm text-muted-foreground">
                Max Files
              </Label>
              <Input
                id={`max-files-${question.id}`}
                type="number"
                value={settings.maxFiles || ""}
                onChange={(e) => onUpdateSettings({ maxFiles: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="5"
                data-testid={`input-max-files-${index}`}
              />
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
