import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, AlertCircle, Upload, X } from "lucide-react";
import type { Question, Questionnaire } from "@shared/schema";
import { normalizeQuestion, ACTIVITY_LEVELS, ACTIVITY_LEVEL_LABELS_TRANSLATED, GOAL_TYPES, GOAL_TYPE_LABELS_TRANSLATED, ONBOARDING_TRANSLATIONS, type SupportedLanguage } from "@shared/schema";
import { type UnitsPreference, UNITS_LABELS, UNITS_LABELS_TRANSLATED, lbsToKg, kgToLbs, inchesToCm, cmToInches, inchesToFeetAndInches, feetAndInchesToInches } from "@shared/units";

export default function ClientOnboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [consentGiven, setConsentGiven] = useState(false);
  const [unitsPreference, setUnitsPreference] = useState<UnitsPreference>("us");
  
  // Get language from invite or default to English
  const lang: SupportedLanguage = (tokenData?.invite?.language as SupportedLanguage) || "en";
  const t = ONBOARDING_TRANSLATIONS;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    
    if (!urlToken) {
      toast({
        title: t.error.title[lang],
        description: t.error.invalidLink[lang],
        variant: "destructive",
      });
      setIsVerifying(false);
      return;
    }

    setToken(urlToken);
    verifyToken(urlToken);
  }, []);

  const verifyToken = async (tokenValue: string) => {
    try {
      const response = await apiRequest("POST", "/api/client-auth/verify", { token: tokenValue });
      const data = await response.json();
      setTokenData(data);
      
      if (data.client) {
        if (data.client.passwordHash) {
          // Get invite language from the response, or default to English
          const inviteLang = (data.invite?.language as SupportedLanguage) || "en";
          toast({
            title: ONBOARDING_TRANSLATIONS.account.existsTitle[inviteLang],
            description: ONBOARDING_TRANSLATIONS.account.existsDescription[inviteLang],
          });
          setLocation("/client/login");
        } else {
          setLocation("/client/setup-password?token=" + tokenValue);
        }
      }
    } catch (error) {
      // Use English fallback for error during token verification since we don't have tokenData yet
      toast({
        title: ONBOARDING_TRANSLATIONS.error.title.en,
        description: ONBOARDING_TRANSLATIONS.error.expiredLink.en,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const questionnaireId = tokenData?.invite?.questionnaireId;
  
  const { data: questionnaire, isLoading: isLoadingQuestionnaire } = useQuery<Questionnaire>({
    queryKey: questionnaireId ? ["/api/questionnaires", questionnaireId] : ["skip"],
    enabled: !!questionnaireId,
  });

  useEffect(() => {
    if (questionnaire?.defaultUnitsPreference) {
      setUnitsPreference(questionnaire.defaultUnitsPreference as UnitsPreference);
    }
  }, [questionnaire]);

  useEffect(() => {
    if (tokenData?.invite) {
      setAnswers(prev => ({
        ...prev,
        name: tokenData.invite.name || prev.name,
        email: tokenData.invite.email || prev.email,
      }));
    }
  }, [tokenData]);

  const submitMutation = useMutation({
    mutationFn: async (formAnswers: Record<string, any>) => {
      const { weightCanonical, heightCanonical, heightFeet, heightInches, heightCm, targetWeightCanonical, goalWeightCanonical, ...otherAnswers } = formAnswers;
      const submissionAnswers: Record<string, any> = {
        ...otherAnswers,
        weight: weightCanonical,
        height: heightCanonical,
        targetWeight: targetWeightCanonical,
        goalWeight: goalWeightCanonical,
        unitsPreference,
      };
      
      return await apiRequest("POST", "/api/responses", {
        questionnaireId: tokenData.invite.questionnaireId,
        clientId: "",
        answers: submissionAnswers,
        submittedAt: new Date().toISOString(),
        token,
      });
    },
    onSuccess: () => {
      const message = questionnaire?.confirmationMessage || t.success.questionnaireSent[lang];
      toast({
        title: t.success.great[lang],
        description: message,
      });
      setLocation("/client/setup-password?token=" + token);
    },
    onError: (error: any) => {
      toast({
        title: t.error.title[lang],
        description: error.message || t.error.submitFailed[lang],
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedQuestions = (questionnaire?.questions as any[] || []).map(normalizeQuestion);
    
    const unansweredRequired = normalizedQuestions.filter(
      (q: Question) => q.required && !answers[q.id]
    );

    if (unansweredRequired && unansweredRequired.length > 0) {
      toast({
        title: t.validation.missingRequiredFields[lang],
        description: t.validation.pleaseAnswerAllRequired[lang],
        variant: "destructive",
      });
      return;
    }

    if (questionnaire?.consentRequired && !consentGiven) {
      toast({
        title: t.validation.consentRequiredTitle[lang],
        description: t.validation.pleaseProvideConsent[lang],
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate(answers);
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const renderQuestion = (question: Question) => {
    const value = answers[question.id] || "";
    const settings = (question.settings || {}) as any;

    switch (question.type) {
      case "short_text":
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={question.id} data-testid={`label-${question.id}`}>
              {question.label}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="text-sm text-muted-foreground">{question.description}</p>
            )}
            <Input
              id={question.id}
              data-testid={`input-${question.id}`}
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder={settings.placeholder}
              required={question.required}
              minLength={settings.minLength}
              maxLength={settings.maxLength}
              pattern={settings.pattern}
            />
          </div>
        );

      case "paragraph":
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={question.id} data-testid={`label-${question.id}`}>
              {question.label}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="text-sm text-muted-foreground">{question.description}</p>
            )}
            <Textarea
              id={question.id}
              data-testid={`textarea-${question.id}`}
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder={settings.placeholder}
              required={question.required}
              minLength={settings.minLength}
              maxLength={settings.maxLength}
              className="min-h-24"
            />
          </div>
        );

      case "email":
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={question.id} data-testid={`label-${question.id}`}>
              {question.label}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="text-sm text-muted-foreground">{question.description}</p>
            )}
            <Input
              id={question.id}
              data-testid={`input-${question.id}`}
              type="email"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder={settings.placeholder || "email@example.com"}
              required={question.required}
            />
          </div>
        );

      case "phone":
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={question.id} data-testid={`label-${question.id}`}>
              {question.label}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="text-sm text-muted-foreground">{question.description}</p>
            )}
            <Input
              id={question.id}
              data-testid={`input-${question.id}`}
              type="tel"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder={settings.placeholder || "(555) 123-4567"}
              required={question.required}
            />
          </div>
        );

      case "number":
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={question.id} data-testid={`label-${question.id}`}>
              {question.label}
              {question.required && <span className="text-destructive ml-1">*</span>}
              {settings.unitLabel && (
                <span className="text-sm text-muted-foreground ml-2">({settings.unitLabel})</span>
              )}
            </Label>
            {question.description && (
              <p className="text-sm text-muted-foreground">{question.description}</p>
            )}
            <Input
              id={question.id}
              data-testid={`input-${question.id}`}
              type="number"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder={settings.placeholder}
              required={question.required}
              min={settings.min}
              max={settings.max}
              step={settings.step}
            />
          </div>
        );

      case "date":
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={question.id} data-testid={`label-${question.id}`}>
              {question.label}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="text-sm text-muted-foreground">{question.description}</p>
            )}
            <Input
              id={question.id}
              data-testid={`input-${question.id}`}
              type="date"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              required={question.required}
              min={settings.minDate}
              max={settings.maxDate}
            />
          </div>
        );

      case "multiple_choice":
        return (
          <div key={question.id} className="space-y-2">
            <Label data-testid={`label-${question.id}`}>
              {question.label}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="text-sm text-muted-foreground">{question.description}</p>
            )}
            <div className="space-y-2">
              {settings.options?.map((option: string, idx: number) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`${question.id}-${idx}`}
                    data-testid={`radio-${question.id}-${idx}`}
                    name={question.id}
                    value={option}
                    checked={value === option}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    className="w-4 h-4"
                    required={question.required}
                  />
                  <Label htmlFor={`${question.id}-${idx}`} className="font-normal cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
              {settings.allowOther && (
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`${question.id}-other`}
                    data-testid={`radio-${question.id}-other`}
                    name={question.id}
                    value="__other__"
                    checked={value?.startsWith("Other: ")}
                    onChange={() => handleAnswerChange(question.id, "Other: ")}
                    className="w-4 h-4"
                  />
                  <Label htmlFor={`${question.id}-other`} className="font-normal cursor-pointer">
                    Other:
                  </Label>
                  {value?.startsWith("Other: ") && (
                    <Input
                      value={value.replace("Other: ", "")}
                      onChange={(e) => handleAnswerChange(question.id, `Other: ${e.target.value}`)}
                      placeholder="Please specify"
                      className="ml-2"
                      data-testid={`input-${question.id}-other`}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case "checkboxes":
        const checkboxValues = Array.isArray(value) ? value : [];
        return (
          <div key={question.id} className="space-y-2">
            <Label data-testid={`label-${question.id}`}>
              {question.label}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="text-sm text-muted-foreground">{question.description}</p>
            )}
            <div className="space-y-2">
              {settings.options?.map((option: string, idx: number) => (
                <div key={idx} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.id}-${idx}`}
                    data-testid={`checkbox-${question.id}-${idx}`}
                    checked={checkboxValues.includes(option)}
                    onCheckedChange={(checked) => {
                      const newValues = checked
                        ? [...checkboxValues, option]
                        : checkboxValues.filter((v: string) => v !== option);
                      handleAnswerChange(question.id, newValues);
                    }}
                  />
                  <Label htmlFor={`${question.id}-${idx}`} className="font-normal cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
              {settings.allowOther && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${question.id}-other`}
                      data-testid={`checkbox-${question.id}-other`}
                      checked={checkboxValues.some((v: string) => v.startsWith("Other: "))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleAnswerChange(question.id, [...checkboxValues, "Other: "]);
                        } else {
                          handleAnswerChange(question.id, checkboxValues.filter((v: string) => !v.startsWith("Other: ")));
                        }
                      }}
                    />
                    <Label htmlFor={`${question.id}-other`} className="font-normal cursor-pointer">
                      Other
                    </Label>
                  </div>
                  {checkboxValues.some((v: string) => v.startsWith("Other: ")) && (
                    <Input
                      value={checkboxValues.find((v: string) => v.startsWith("Other: "))?.replace("Other: ", "") || ""}
                      onChange={(e) => {
                        const newValues = checkboxValues.filter((v: string) => !v.startsWith("Other: "));
                        handleAnswerChange(question.id, [...newValues, `Other: ${e.target.value}`]);
                      }}
                      placeholder="Please specify"
                      className="ml-6"
                      data-testid={`input-${question.id}-other`}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case "dropdown":
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={question.id} data-testid={`label-${question.id}`}>
              {question.label}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="text-sm text-muted-foreground">{question.description}</p>
            )}
            <Select
              value={value}
              onValueChange={(val) => handleAnswerChange(question.id, val)}
              required={question.required}
            >
              <SelectTrigger id={question.id} data-testid={`select-${question.id}`}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {settings.options?.map((option: string, idx: number) => (
                  <SelectItem key={idx} value={option} data-testid={`select-option-${question.id}-${idx}`}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "file_upload":
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={question.id} data-testid={`label-${question.id}`}>
              {question.label}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="text-sm text-muted-foreground">{question.description}</p>
            )}
            <div className="border-2 border-dashed rounded-lg p-4">
              <Input
                id={question.id}
                type="file"
                data-testid={`input-${question.id}`}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  handleAnswerChange(question.id, files.map(f => ({ name: f.name, size: f.size, type: f.type })));
                }}
                accept={settings.allowedTypes?.join(",")}
                multiple={settings.maxFiles > 1}
                required={question.required}
                className="hidden"
              />
              <label
                htmlFor={question.id}
                className="flex flex-col items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">Click to upload</p>
                  <p className="text-xs text-muted-foreground">
                    {settings.allowedTypes?.join(", ")} (max {settings.maxSizeMB}MB)
                  </p>
                </div>
              </label>
              {value && value.length > 0 && (
                <div className="mt-3 space-y-1">
                  {value.map((file: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span>{file.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          const newFiles = value.filter((_: any, i: number) => i !== idx);
                          handleAnswerChange(question.id, newFiles);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-16 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">{t.loading.verifying[lang]}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenData || !questionnaire) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-16 text-center">
            {isLoadingQuestionnaire ? (
              <>
                <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">{t.loading.loadingForm[lang]}</p>
              </>
            ) : (
              <>
                <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
                <p className="text-lg font-medium">{t.error.expiredLink[lang]}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const normalizedQuestions = (questionnaire.questions as any[]).map(normalizeQuestion);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg sm:text-xl">{questionnaire.name}</CardTitle>
                {questionnaire.welcomeText && (
                  <CardDescription className="text-sm sm:text-base mt-2">
                    {questionnaire.welcomeText}
                  </CardDescription>
                )}
              </div>
              {questionnaire.standardFields && (questionnaire.standardFields.weight || questionnaire.standardFields.height) && (
                <div className="w-full sm:w-auto sm:flex-shrink-0">
                  <Select
                    value={unitsPreference}
                    onValueChange={(value: UnitsPreference) => setUnitsPreference(value)}
                  >
                    <SelectTrigger className="w-full sm:w-[140px] min-h-10" data-testid="select-units-top">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">{UNITS_LABELS_TRANSLATED[lang].us}</SelectItem>
                      <SelectItem value="metric">{UNITS_LABELS_TRANSLATED[lang].metric}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="overflow-y-auto max-h-[calc(100vh-200px)] p-4 sm:p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" data-testid="label-name">
                    {t.fields.name[lang]} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    data-testid="input-name"
                    value={answers.name || ""}
                    onChange={(e) => handleAnswerChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" data-testid="label-email">
                    {t.fields.email[lang]} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    data-testid="input-email"
                    value={answers.email || ""}
                    onChange={(e) => handleAnswerChange("email", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" data-testid="label-phone">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    data-testid="input-phone"
                    value={answers.phone || ""}
                    onChange={(e) => handleAnswerChange("phone", e.target.value)}
                  />
                </div>
                
                {questionnaire.standardFields && (questionnaire.standardFields.sex || questionnaire.standardFields.age || questionnaire.standardFields.weight || questionnaire.standardFields.height || questionnaire.standardFields.activityLevel || questionnaire.standardFields.bodyFatPercentage || questionnaire.standardFields.goal) && (
                  <>
                    {questionnaire.standardFields.sex && (
                      <div className="space-y-2" data-testid="standard-field-sex">
                        <Label htmlFor="sex">Sex</Label>
                        <Select
                          value={answers.sex || ""}
                          onValueChange={(value) => handleAnswerChange("sex", value)}
                        >
                          <SelectTrigger data-testid="select-sex">
                            <SelectValue placeholder="Select sex" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {questionnaire.standardFields.age && (
                      <div className="space-y-2" data-testid="standard-field-age">
                        <Label htmlFor="age">Age</Label>
                        <Input
                          id="age"
                          type="number"
                          min="0"
                          max="120"
                          data-testid="input-age"
                          value={answers.age || ""}
                          onChange={(e) => handleAnswerChange("age", e.target.value)}
                          placeholder="Enter your age"
                        />
                      </div>
                    )}
                    
                    {questionnaire.standardFields.weight && (
                      <div className="space-y-2" data-testid="standard-field-weight">
                        <Label htmlFor="weight">Weight ({unitsPreference === "us" ? "lbs" : "kg"})</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1000"
                          data-testid="input-weight"
                          value={
                            unitsPreference === "metric" && answers.weightCanonical
                              ? lbsToKg(parseFloat(answers.weightCanonical))
                              : answers.weightCanonical || ""
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            const canonicalValue = unitsPreference === "metric" && value
                              ? kgToLbs(parseFloat(value)).toString()
                              : value;
                            handleAnswerChange("weightCanonical", canonicalValue);
                          }}
                          placeholder={`Enter your weight in ${unitsPreference === "us" ? "lbs" : "kg"}`}
                        />
                      </div>
                    )}
                    
                    {questionnaire.standardFields.height && unitsPreference === "us" && (
                      <div className="space-y-2" data-testid="standard-field-height">
                        <Label>Height</Label>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          <div className="flex-1 space-y-2">
                            <Input
                              id="heightFeet"
                              type="number"
                              min="0"
                              max="8"
                              data-testid="input-height-feet"
                              value={answers.heightFeet || ""}
                              onChange={(e) => {
                                const feet = parseFloat(e.target.value) || 0;
                                const inches = parseFloat(answers.heightInches || "0");
                                const totalInches = feetAndInchesToInches(feet, inches);
                                handleAnswerChange("heightFeet", e.target.value);
                                handleAnswerChange("heightCanonical", totalInches.toString());
                              }}
                              placeholder="Feet"
                              className="min-h-10"
                            />
                          </div>
                          <div className="flex-1 space-y-2">
                            <Input
                              id="heightInches"
                              type="number"
                              step="0.01"
                              min="0"
                              max="11.99"
                              data-testid="input-height-inches"
                              value={answers.heightInches || ""}
                              onChange={(e) => {
                                const feet = parseFloat(answers.heightFeet || "0");
                                const inches = parseFloat(e.target.value) || 0;
                                const totalInches = feetAndInchesToInches(feet, inches);
                                handleAnswerChange("heightInches", e.target.value);
                                handleAnswerChange("heightCanonical", totalInches.toString());
                              }}
                              placeholder="Inches"
                              className="min-h-10"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {questionnaire.standardFields.height && unitsPreference === "metric" && (
                      <div className="space-y-2" data-testid="standard-field-height">
                        <Label htmlFor="height">Height (cm)</Label>
                        <Input
                          id="height"
                          type="number"
                          step="0.01"
                          min="0"
                          max="300"
                          data-testid="input-height-cm"
                          value={answers.heightCm || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            const canonicalValue = value ? cmToInches(parseFloat(value)).toString() : "";
                            handleAnswerChange("heightCm", value);
                            handleAnswerChange("heightCanonical", canonicalValue);
                          }}
                          placeholder="Enter your height in cm"
                        />
                      </div>
                    )}
                    
                    {questionnaire.standardFields.activityLevel && (
                      <div className="space-y-2" data-testid="standard-field-activity-level">
                        <Label htmlFor="activityLevel">Activity Level</Label>
                        <Select
                          value={answers.activityLevel || ""}
                          onValueChange={(value) => handleAnswerChange("activityLevel", value)}
                        >
                          <SelectTrigger data-testid="select-activity-level">
                            <SelectValue placeholder="Select activity level" />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTIVITY_LEVELS.map((level) => (
                              <SelectItem key={level} value={level}>
                                {ACTIVITY_LEVEL_LABELS_TRANSLATED[lang][level]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {questionnaire.standardFields.bodyFatPercentage && (
                      <div className="space-y-2" data-testid="standard-field-body-fat">
                        <Label htmlFor="bodyFatPercentage">Body Fat %</Label>
                        <Input
                          id="bodyFatPercentage"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          data-testid="input-body-fat"
                          value={answers.bodyFatPercentage || ""}
                          onChange={(e) => handleAnswerChange("bodyFatPercentage", e.target.value)}
                          placeholder="Enter your body fat percentage"
                        />
                      </div>
                    )}
                    
                    {questionnaire.standardFields.goal && (
                      <>
                        <div className="space-y-2" data-testid="standard-field-goal">
                          <Label htmlFor="goalType">Primary Goal</Label>
                          <Select
                            value={answers.goalType || ""}
                            onValueChange={(value) => handleAnswerChange("goalType", value)}
                          >
                            <SelectTrigger data-testid="select-goal-type">
                              <SelectValue placeholder="Select your primary goal" />
                            </SelectTrigger>
                            <SelectContent>
                              {GOAL_TYPES.map((goal) => (
                                <SelectItem key={goal} value={goal}>
                                  {GOAL_TYPE_LABELS_TRANSLATED[lang][goal]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {answers.goalType === "lose_weight" && (
                          <div className="space-y-2" data-testid="conditional-field-target-weight">
                            <Label htmlFor="targetWeight">Target Weight (optional) - {unitsPreference === "us" ? "lbs" : "kg"}</Label>
                            <Input
                              id="targetWeight"
                              type="number"
                              step="0.01"
                              min="0"
                              max="1000"
                              data-testid="input-target-weight"
                              value={
                                unitsPreference === "metric" && answers.targetWeightCanonical
                                  ? lbsToKg(parseFloat(answers.targetWeightCanonical))
                                  : answers.targetWeightCanonical || ""
                              }
                              onChange={(e) => {
                                const value = e.target.value;
                                if (unitsPreference === "metric") {
                                  const canonicalValue = value ? kgToLbs(parseFloat(value)).toString() : "";
                                  handleAnswerChange("targetWeightCanonical", canonicalValue);
                                } else {
                                  handleAnswerChange("targetWeightCanonical", value);
                                }
                              }}
                              placeholder={`Enter your target weight in ${unitsPreference === "us" ? "lbs" : "kg"}`}
                            />
                          </div>
                        )}
                        
                        {answers.goalType === "improve_body_composition" && (
                          <div className="space-y-2" data-testid="conditional-field-target-body-fat">
                            <Label htmlFor="targetBodyFat">Target Body Fat % (optional)</Label>
                            <Input
                              id="targetBodyFat"
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              data-testid="input-target-body-fat"
                              value={answers.targetBodyFat || ""}
                              onChange={(e) => handleAnswerChange("targetBodyFat", e.target.value)}
                              placeholder="Enter your target body fat percentage"
                            />
                          </div>
                        )}
                        
                        {answers.goalType === "maintain_weight" && (
                          <div className="space-y-2" data-testid="conditional-field-goal-weight">
                            <Label htmlFor="goalWeight">Confirm Goal Weight (optional) - {unitsPreference === "us" ? "lbs" : "kg"}</Label>
                            <Input
                              id="goalWeight"
                              type="number"
                              step="0.01"
                              min="0"
                              max="1000"
                              data-testid="input-goal-weight"
                              value={
                                unitsPreference === "metric" && (answers.goalWeightCanonical || answers.weightCanonical)
                                  ? lbsToKg(parseFloat(answers.goalWeightCanonical || answers.weightCanonical))
                                  : answers.goalWeightCanonical || answers.weightCanonical || ""
                              }
                              onChange={(e) => {
                                const value = e.target.value;
                                if (unitsPreference === "metric") {
                                  const canonicalValue = value ? kgToLbs(parseFloat(value)).toString() : "";
                                  handleAnswerChange("goalWeightCanonical", canonicalValue);
                                } else {
                                  handleAnswerChange("goalWeightCanonical", value);
                                }
                              }}
                              placeholder={`Confirm weight to maintain in ${unitsPreference === "us" ? "lbs" : "kg"}`}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              {normalizedQuestions.length > 0 && (
                <div className="border-t pt-6">
                  <div className="space-y-6">
                    {normalizedQuestions.map((question: Question) => renderQuestion(question))}
                  </div>
                </div>
              )}

              {questionnaire.consentRequired && questionnaire.consentText && (
                <div className="border-t pt-6">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="consent"
                      checked={consentGiven}
                      onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
                      data-testid="checkbox-consent"
                    />
                    <Label
                      htmlFor="consent"
                      className="text-sm leading-relaxed cursor-pointer"
                      data-testid="label-consent"
                    >
                      {questionnaire.consentText}
                    </Label>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 sm:gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={submitMutation.isPending}
                  data-testid="button-submit"
                  className="w-full sm:w-auto min-h-10"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.submitting[lang]}
                    </>
                  ) : (
                    t.submit[lang]
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
