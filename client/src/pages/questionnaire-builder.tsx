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
import type { Questionnaire, Question, QuestionType, Coach, SupportedLanguage } from "@shared/schema";
import { normalizeQuestion, COACH_UI_TRANSLATIONS } from "@shared/schema";
import { type UnitsPreference, UNITS_LABELS, UNITS_LABELS_TRANSLATED } from "@shared/units";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  welcomeText: z.string().optional(),
  consentText: z.string().optional(),
  consentRequired: z.boolean(),
  confirmationMessage: z.string().optional(),
  defaultUnitsPreference: z.enum(["us", "metric"]),
});

export default function QuestionnaireBuilder() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEditMode = Boolean(id) && id !== "new";

  const { data: coachProfile } = useQuery<Omit<Coach, "passwordHash">>({
    queryKey: ["/api/coach/profile"],
  });

  const lang = (coachProfile?.preferredLanguage || "en") as SupportedLanguage;
  const t = COACH_UI_TRANSLATIONS.questionnaires;

  const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
    short_text: t.shortText[lang],
    paragraph: t.paragraph[lang],
    multiple_choice: t.multipleChoice[lang],
    checkboxes: t.checkboxes[lang],
    dropdown: t.dropdown[lang],
    number: t.number[lang],
    date: t.dateType[lang],
    email: t.emailType[lang],
    phone: t.phoneType[lang],
    file_upload: t.fileUpload[lang],
  };

  const [questions, setQuestions] = useState<Question[]>([]);
  const [initialQuestions, setInitialQuestions] = useState<Question[]>([]);
  const [initialStandardFields, setInitialStandardFields] = useState({
    sex: true,
    weight: true,
    age: true,
    height: true,
    activityLevel: true,
    bodyFatPercentage: true,
    goal: true,
  });
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>("short_text");
  const [standardFields, setStandardFields] = useState({
    sex: true,
    weight: true,
    age: true,
    height: true,
    activityLevel: true,
    bodyFatPercentage: true,
    goal: true,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      welcomeText: "",
      consentText: "",
      consentRequired: false,
      confirmationMessage: lang === "ru" ? "Спасибо за заполнение анкеты!" : lang === "es" ? "¡Gracias por completar el cuestionario!" : "Thank you for completing the questionnaire!",
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
      setInitialQuestions(normalized);
      
      const fields = questionnaire.standardFields ? {
        sex: questionnaire.standardFields.sex !== false,
        weight: questionnaire.standardFields.weight !== false,
        age: questionnaire.standardFields.age !== false,
        height: questionnaire.standardFields.height !== false,
        activityLevel: questionnaire.standardFields.activityLevel !== false,
        bodyFatPercentage: questionnaire.standardFields.bodyFatPercentage !== false,
        goal: questionnaire.standardFields.goal !== false,
      } : {
        sex: true,
        weight: true,
        age: true,
        height: true,
        activityLevel: true,
        bodyFatPercentage: true,
        goal: true,
      };
      
      setStandardFields(fields);
      setInitialStandardFields(fields);
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
        title: t.success[lang],
        description: t.savedSuccessfully[lang],
      });
      setLocation("/questionnaires");
    },
    onError: (error: any) => {
      console.error("Save questionnaire error:", error);
      toast({
        title: t.error[lang],
        description: error?.message || t.failedToSave[lang],
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

  const updateQuestion = (qid: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => {
      if (q.id === qid) {
        const updated = { ...q, ...updates };
        
        if (updates.type && updates.type !== q.type) {
          updated.settings = getDefaultSettings(updates.type);
        }
        
        return updated as Question;
      }
      return q;
    }));
  };

  const updateQuestionSettings = (qid: string, settings: any) => {
    setQuestions(questions.map(q => 
      q.id === qid ? { ...q, settings: { ...q.settings, ...settings } } : q
    ));
  };

  const deleteQuestion = (qid: string) => {
    setQuestions(questions.filter(q => q.id !== qid));
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

  const hasChanges = () => {
    const formDirty = form.formState.isDirty;
    const questionsChanged = JSON.stringify(questions) !== JSON.stringify(initialQuestions);
    const fieldsChanged = JSON.stringify(standardFields) !== JSON.stringify(initialStandardFields);
    return formDirty || questionsChanged || fieldsChanged;
  };

  const currentStatus = questionnaire?.status || "draft";
  const hasUnsavedChanges = hasChanges();

  const handleSave = (status: "draft" | "published") => {
    const formData = form.getValues();
    if (!formData.name) {
      toast({
        title: t.error[lang],
        description: t.enterQuestionnaireName[lang],
        variant: "destructive",
      });
      return;
    }

    for (const question of questions) {
      if (!question.label || question.label.trim() === "") {
        toast({
          title: t.validationError[lang],
          description: t.allQuestionsMustHaveLabel[lang],
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
          title: t.validationError[lang],
          description: t.questionMustHaveOption[lang].replace("{label}", question.label),
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
              <div className="text-muted-foreground">{t.loading[lang]}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:gap-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/questionnaires")}
              data-testid="button-back"
              className="min-h-10 min-w-10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {isEditMode ? t.editQuestionnaire[lang] : t.newQuestionnaire[lang]}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                {t.customIntakeForm[lang]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:flex-shrink-0">
            {(currentStatus === "draft" || (currentStatus === "published" && hasUnsavedChanges)) && (
              <Button
                variant="outline"
                onClick={() => handleSave("draft")}
                disabled={saveMutation.isPending}
                data-testid="button-save-draft"
                className="min-h-10"
              >
                <Save className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">
                  {currentStatus === "published" ? t.saveAsDraft[lang] : t.saveDraft[lang]}
                </span>
                <span className="sm:hidden">{t.draft[lang]}</span>
              </Button>
            )}
            <Button
              onClick={() => handleSave("published")}
              disabled={saveMutation.isPending}
              data-testid="button-publish"
              className="min-h-10"
            >
              {currentStatus === "published" ? t.update[lang] : t.publish[lang]}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">{t.formSettings[lang]}</CardTitle>
            <CardDescription>{t.configureDetails[lang]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <Form {...form}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.formName[lang]}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={lang === "ru" ? "Анкета нового клиента" : lang === "es" ? "Formulario de Cliente" : "Client Intake Form"}
                        data-testid="input-form-name"
                        className="min-h-10"
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
                    <FormLabel>{t.welcomeText[lang]}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={lang === "ru" ? "Добро пожаловать! Заполните эту форму, чтобы помочь нам понять ваши цели." : lang === "es" ? "¡Bienvenido! Complete este formulario para ayudarnos a entender sus objetivos." : "Welcome! Please fill out this form to help us understand your goals."}
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
                    <FormLabel>{t.consentText[lang]}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={lang === "ru" ? "Я соглашаюсь с условиями..." : lang === "es" ? "Acepto los términos y condiciones..." : "I agree to the terms and conditions..."}
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
                      <FormLabel className="text-base">{t.requireConsent[lang]}</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        {t.consentDescription[lang]}
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
                    <FormLabel>{t.confirmationMessage[lang]}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={lang === "ru" ? "Спасибо за заполнение анкеты!" : lang === "es" ? "¡Gracias por completar el cuestionario!" : "Thank you for completing the questionnaire!"}
                        data-testid="input-confirmation-message"
                        className="min-h-10"
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
            <CardTitle className="text-lg sm:text-xl">{t.defaultClientInfo[lang]}</CardTitle>
            <CardDescription>{t.nameEmailRequired[lang]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6">
            {[
              { name: t.clientName[lang], required: true },
              { name: t.email[lang], required: true },
              { name: t.phone[lang], required: false }
            ].map((field) => (
              <div
                key={field.name}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                data-testid={`default-field-${field.name.toLowerCase().replace(" ", "-")}`}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{field.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {field.required ? t.required[lang] : t.optional[lang]}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg sm:text-xl">{t.standardHealthMetrics[lang]}</CardTitle>
                <CardDescription>{t.enableHealthFields[lang]}</CardDescription>
              </div>
              <div className="w-full sm:w-auto sm:flex-shrink-0">
                <FormField
                  control={form.control}
                  name="defaultUnitsPreference"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full sm:w-[140px]" data-testid="select-default-units-top">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us">{UNITS_LABELS_TRANSLATED[lang].us}</SelectItem>
                        <SelectItem value="metric">{UNITS_LABELS_TRANSLATED[lang].metric}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6">
            {[
              { key: "sex" as const, label: t.sex[lang], description: t.sexDescription[lang] },
              { key: "age" as const, label: t.age[lang], description: t.ageDescription[lang] },
              { key: "weight" as const, label: t.weight[lang], description: t.weightDescription[lang] },
              { key: "height" as const, label: t.height[lang], description: t.heightDescription[lang] },
              { key: "activityLevel" as const, label: t.activityLevel[lang], description: t.activityLevelDescription[lang] },
              { key: "bodyFatPercentage" as const, label: t.bodyFatPercentage[lang], description: t.bodyFatDescription[lang] },
              { key: "goal" as const, label: t.goal[lang], description: t.goalDescription[lang] },
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
            <CardTitle className="text-lg sm:text-xl">{t.customQuestions[lang]}</CardTitle>
            <CardDescription>{t.addQuestionsDescription[lang]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <Accordion type="multiple" className="w-full">
              {questions.map((question, index) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  index={index}
                  lang={lang}
                  t={t}
                  questionTypeLabels={QUESTION_TYPE_LABELS}
                  onUpdate={(updates) => updateQuestion(question.id, updates)}
                  onUpdateSettings={(settings) => updateQuestionSettings(question.id, settings)}
                  onDelete={() => deleteQuestion(question.id)}
                  onDuplicate={() => duplicateQuestion(question)}
                />
              ))}
            </Accordion>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
              <Select value={newQuestionType} onValueChange={(v) => setNewQuestionType(v as QuestionType)}>
                <SelectTrigger className="w-full sm:w-[200px] min-h-10" data-testid="select-new-question-type">
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
              <Button onClick={addQuestion} variant="outline" data-testid="button-add-question" className="w-full sm:w-auto min-h-10">
                <Plus className="h-4 w-4 mr-2" />
                {t.addQuestion[lang]}
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
  lang: SupportedLanguage;
  t: typeof COACH_UI_TRANSLATIONS.questionnaires;
  questionTypeLabels: Record<QuestionType, string>;
  onUpdate: (updates: Partial<Question>) => void;
  onUpdateSettings: (settings: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function QuestionEditor({ question, index, lang, t, questionTypeLabels, onUpdate, onUpdateSettings, onDelete, onDuplicate }: QuestionEditorProps) {
  return (
    <AccordionItem value={question.id}>
      <div className="border rounded-lg">
        <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4">
          <GripVertical className="hidden sm:block h-4 w-4 text-muted-foreground mt-2 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <AccordionTrigger className="hover:no-underline py-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-left">
                <span className="font-medium text-sm sm:text-base">
                  {question.label || `${t.questionText[lang]} ${index + 1}`}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {questionTypeLabels[question.type]}
                  </span>
                  {question.required && (
                    <span className="text-xs text-destructive">{t.required[lang]}</span>
                  )}
                </div>
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
              className="min-h-10 min-w-10"
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
              className="min-h-10 min-w-10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <AccordionContent className="px-3 sm:px-4 pb-4 pt-0">
          <div className="space-y-4 sm:pl-7">
            <div className="space-y-2">
              <Label htmlFor={`question-label-${question.id}`}>{t.questionLabel[lang]} *</Label>
              <Input
                id={`question-label-${question.id}`}
                value={question.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder={t.enterQuestion[lang]}
                data-testid={`input-question-label-${index}`}
                className="min-h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`question-description-${question.id}`}>{t.descriptionOptional[lang]}</Label>
              <Input
                id={`question-description-${question.id}`}
                value={question.description || ""}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder={t.helperText[lang]}
                data-testid={`input-question-description-${index}`}
                className="min-h-10"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <div className="space-y-2 flex-1">
                <Label>{t.questionType[lang]}</Label>
                <Select
                  value={question.type}
                  onValueChange={(value) => onUpdate({ type: value as QuestionType })}
                >
                  <SelectTrigger className="w-full min-h-10" data-testid={`select-question-type-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(questionTypeLabels) as QuestionType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {questionTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-2 rounded-lg border p-3 sm:p-0 sm:border-0 sm:pt-6">
                <Label className="text-sm">{t.required[lang]}</Label>
                <Switch
                  checked={question.required}
                  onCheckedChange={(checked) => onUpdate({ required: checked })}
                  data-testid={`switch-required-${index}`}
                />
              </div>
            </div>

            <QuestionSettings
              question={question}
              index={index}
              lang={lang}
              t={t}
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
  lang: SupportedLanguage;
  t: typeof COACH_UI_TRANSLATIONS.questionnaires;
  onUpdateSettings: (settings: any) => void;
}

function QuestionSettings({ question, index, lang, t, onUpdateSettings }: QuestionSettingsProps) {
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
          <Label className="text-sm font-medium">{t.settings[lang]}</Label>
          <div className="space-y-2">
            <Label htmlFor={`placeholder-${question.id}`} className="text-sm text-muted-foreground">
              {t.placeholder[lang]}
            </Label>
            <Input
              id={`placeholder-${question.id}`}
              value={settings.placeholder || ""}
              onChange={(e) => onUpdateSettings({ placeholder: e.target.value })}
              placeholder={lang === "ru" ? "Введите текст-подсказку..." : lang === "es" ? "Ingresa texto de marcador..." : "Enter placeholder text..."}
              data-testid={`input-placeholder-${index}`}
            />
          </div>
          {(question.type === "short_text" || question.type === "paragraph") && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`min-length-${question.id}`} className="text-sm text-muted-foreground">
                  {t.minLength[lang]}
                </Label>
                <Input
                  id={`min-length-${question.id}`}
                  type="number"
                  value={settings.minLength || ""}
                  onChange={(e) => onUpdateSettings({ minLength: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder={t.min[lang]}
                  data-testid={`input-min-length-${index}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`max-length-${question.id}`} className="text-sm text-muted-foreground">
                  {t.maxLength[lang]}
                </Label>
                <Input
                  id={`max-length-${question.id}`}
                  type="number"
                  value={settings.maxLength || ""}
                  onChange={(e) => onUpdateSettings({ maxLength: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder={t.max[lang]}
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
          <Label className="text-sm font-medium">{t.options[lang]}</Label>
          <div className="space-y-2">
            {(settings.options || []).map((option: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  data-testid={`input-option-${index}-${idx}`}
                  className="min-h-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteOption(idx)}
                  disabled={(settings.options || []).length <= 1}
                  data-testid={`button-delete-option-${index}-${idx}`}
                  className="flex-shrink-0 min-h-10 min-w-10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={addOption}
              data-testid={`button-add-option-${index}`}
              className="min-h-10"
            >
              <Plus className="h-3 w-3 mr-2" />
              {t.addOption[lang]}
            </Button>
          </div>
          {question.type === "checkboxes" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`min-selections-${question.id}`} className="text-sm text-muted-foreground">
                  {t.minSelections[lang]}
                </Label>
                <Input
                  id={`min-selections-${question.id}`}
                  type="number"
                  value={settings.minSelections || ""}
                  onChange={(e) => onUpdateSettings({ minSelections: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder={t.min[lang]}
                  data-testid={`input-min-selections-${index}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`max-selections-${question.id}`} className="text-sm text-muted-foreground">
                  {t.maxSelections[lang]}
                </Label>
                <Input
                  id={`max-selections-${question.id}`}
                  type="number"
                  value={settings.maxSelections || ""}
                  onChange={(e) => onUpdateSettings({ maxSelections: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder={t.max[lang]}
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
            <Label className="text-sm">{t.allowOther[lang]}</Label>
          </div>
        </div>
      );

    case "number":
      return (
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-sm font-medium">{t.settings[lang]}</Label>
          <div className="space-y-2">
            <Label htmlFor={`placeholder-${question.id}`} className="text-sm text-muted-foreground">
              {t.placeholder[lang]}
            </Label>
            <Input
              id={`placeholder-${question.id}`}
              value={settings.placeholder || ""}
              onChange={(e) => onUpdateSettings({ placeholder: e.target.value })}
              placeholder={t.enterNumber[lang]}
              data-testid={`input-placeholder-${index}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`unit-label-${question.id}`} className="text-sm text-muted-foreground">
              {t.unitLabel[lang]}
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
                {t.min[lang]}
              </Label>
              <Input
                id={`min-${question.id}`}
                type="number"
                value={settings.min || ""}
                onChange={(e) => onUpdateSettings({ min: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder={t.min[lang]}
                data-testid={`input-min-${index}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`max-${question.id}`} className="text-sm text-muted-foreground">
                {t.max[lang]}
              </Label>
              <Input
                id={`max-${question.id}`}
                type="number"
                value={settings.max || ""}
                onChange={(e) => onUpdateSettings({ max: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder={t.max[lang]}
                data-testid={`input-max-${index}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`step-${question.id}`} className="text-sm text-muted-foreground">
                {t.step[lang]}
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
          <Label className="text-sm font-medium">{t.settings[lang]}</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`min-date-${question.id}`} className="text-sm text-muted-foreground">
                {t.minDate[lang]}
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
                {t.maxDate[lang]}
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
          <Label className="text-sm font-medium">{t.settings[lang]}</Label>
          <div className="space-y-2">
            <Label htmlFor={`allowed-types-${question.id}`} className="text-sm text-muted-foreground">
              {t.allowedFileTypes[lang]}
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
                {t.maxSize[lang]}
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
                {t.maxFiles[lang]}
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
