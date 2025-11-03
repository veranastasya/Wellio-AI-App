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
import { Loader2, AlertCircle } from "lucide-react";

type QuestionType = "short_text" | "paragraph" | "multiple_choice" | "checkboxes" | "dropdown" | "date" | "number";

interface Question {
  id: string;
  label: string;
  type: QuestionType;
  isRequired: boolean;
  options?: string[];
}

interface Questionnaire {
  id: string;
  name: string;
  status: string;
  questions: Question[];
  welcomeText?: string;
  consentText?: string;
  consentRequired: boolean;
  confirmationMessage?: string;
}

export default function ClientOnboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    
    if (!urlToken) {
      toast({
        title: "Error",
        description: "Invalid invite link",
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
      console.log("[CLIENT] Token verified, data:", data);
      console.log("[CLIENT] questionnaireId:", data?.invite?.questionnaireId);
      setTokenData(data);
      
      // If client already exists, redirect to dashboard
      if (data.client) {
        localStorage.setItem("clientToken", tokenValue);
        setLocation("/client/dashboard");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid or expired invite link",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Fetch questionnaire
  const questionnaireId = tokenData?.invite?.questionnaireId;
  console.log("[CLIENT] Questionnaire query state:", { questionnaireId, hasTokenData: !!tokenData });
  
  const { data: questionnaire, isLoading: isLoadingQuestionnaire, error: questionnaireError } = useQuery<Questionnaire>({
    queryKey: questionnaireId ? ["/api/questionnaires", questionnaireId] : ["skip"],
    enabled: !!questionnaireId,
  });
  
  console.log("[CLIENT] Questionnaire loaded:", { questionnaire: !!questionnaire, isLoading: isLoadingQuestionnaire, error: questionnaireError });

  const submitMutation = useMutation({
    mutationFn: async (formAnswers: Record<string, any>) => {
      return await apiRequest("POST", "/api/responses", {
        questionnaireId: tokenData.invite.questionnaireId,
        clientId: "", // Will be set by backend
        answers: formAnswers,
        submittedAt: new Date().toISOString(),
        token, // Include token for onboarding flow
      });
    },
    onSuccess: () => {
      localStorage.setItem("clientToken", token!);
      const message = questionnaire?.confirmationMessage || "Your account has been created successfully";
      toast({
        title: "Welcome!",
        description: message,
      });
      setLocation("/client/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit questionnaire",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required questions
    const unansweredRequired = questionnaire?.questions.filter(
      q => q.isRequired && !answers[q.id]
    );

    if (unansweredRequired && unansweredRequired.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: "Please answer all required questions",
        variant: "destructive",
      });
      return;
    }

    // Check consent if required
    if (questionnaire?.consentRequired && !consentGiven) {
      toast({
        title: "Consent Required",
        description: "Please provide your consent to continue",
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

    switch (question.type) {
      case "short_text":
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={question.id} data-testid={`label-${question.id}`}>
              {question.label}
              {question.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={question.id}
              data-testid={`input-${question.id}`}
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              required={question.isRequired}
            />
          </div>
        );

      case "paragraph":
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={question.id} data-testid={`label-${question.id}`}>
              {question.label}
              {question.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={question.id}
              data-testid={`textarea-${question.id}`}
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              required={question.isRequired}
              className="min-h-24"
            />
          </div>
        );

      case "number":
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={question.id} data-testid={`label-${question.id}`}>
              {question.label}
              {question.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={question.id}
              data-testid={`input-${question.id}`}
              type="number"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              required={question.isRequired}
            />
          </div>
        );

      case "date":
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={question.id} data-testid={`label-${question.id}`}>
              {question.label}
              {question.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={question.id}
              data-testid={`input-${question.id}`}
              type="date"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              required={question.isRequired}
            />
          </div>
        );

      case "multiple_choice":
        return (
          <div key={question.id} className="space-y-2">
            <Label data-testid={`label-${question.id}`}>
              {question.label}
              {question.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {question.options?.map((option, idx) => (
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
                    required={question.isRequired}
                  />
                  <Label htmlFor={`${question.id}-${idx}`} className="font-normal cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );

      case "checkboxes":
        const checkboxValues = Array.isArray(value) ? value : [];
        return (
          <div key={question.id} className="space-y-2">
            <Label data-testid={`label-${question.id}`}>
              {question.label}
              {question.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {question.options?.map((option, idx) => (
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
            </div>
          </div>
        );

      case "dropdown":
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={question.id} data-testid={`label-${question.id}`}>
              {question.label}
              {question.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => handleAnswerChange(question.id, val)}
              required={question.isRequired}
            >
              <SelectTrigger id={question.id} data-testid={`select-${question.id}`}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {question.options?.map((option, idx) => (
                  <SelectItem key={idx} value={option} data-testid={`select-option-${question.id}-${idx}`}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <p className="text-lg font-medium">Verifying your invite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-16 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive">Invalid Invite Link</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please contact your coach for a valid invite link
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingQuestionnaire) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-16 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Loading questionnaire...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!questionnaire) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-16 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive">Questionnaire Not Found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please contact your coach for assistance
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl" data-testid="text-questionnaire-title">{questionnaire.name}</CardTitle>
          {questionnaire.welcomeText && (
            <CardDescription className="text-base mt-2" data-testid="text-welcome-message">
              {questionnaire.welcomeText}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Render all questions */}
            <div className="space-y-6">
              {questionnaire.questions.map(question => renderQuestion(question))}
            </div>

            {/* Consent section */}
            {questionnaire.consentRequired && questionnaire.consentText && (
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="consent"
                    data-testid="checkbox-consent"
                    checked={consentGiven}
                    onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
                  />
                  <Label htmlFor="consent" className="font-normal cursor-pointer text-sm">
                    {questionnaire.consentText}
                  </Label>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitMutation.isPending}
              data-testid="button-submit-questionnaire"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating your account...
                </>
              ) : (
                "Complete Onboarding"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
