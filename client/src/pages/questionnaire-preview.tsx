import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Upload } from "lucide-react";
import type { Questionnaire, Question } from "@shared/schema";
import { normalizeQuestion } from "@shared/schema";

export default function QuestionnairePreview() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: questionnaire, isLoading } = useQuery<Questionnaire>({
    queryKey: ["/api/questionnaires", id],
  });

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!questionnaire) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground">Questionnaire not found</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const questions = (questionnaire.questions as any[]).map(normalizeQuestion);

  const renderQuestion = (question: Question) => {
    const settings = (question.settings || {}) as any;

    return (
      <div key={question.id} className="space-y-2" data-testid={`preview-question-${question.id}`}>
        <Label>
          {question.label}
          {question.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {question.description && (
          <p className="text-sm text-muted-foreground">{question.description}</p>
        )}

        {question.type === "short_text" && (
          <Input 
            placeholder={settings.placeholder || "Your answer"} 
            disabled 
            data-testid={`preview-input-${question.id}`} 
          />
        )}

        {question.type === "paragraph" && (
          <Textarea 
            placeholder={settings.placeholder || "Your answer"} 
            rows={4} 
            disabled 
            data-testid={`preview-textarea-${question.id}`} 
          />
        )}

        {question.type === "email" && (
          <Input 
            type="email"
            placeholder={settings.placeholder || "email@example.com"} 
            disabled 
            data-testid={`preview-input-${question.id}`} 
          />
        )}

        {question.type === "phone" && (
          <Input 
            type="tel"
            placeholder={settings.placeholder || "(555) 123-4567"} 
            disabled 
            data-testid={`preview-input-${question.id}`} 
          />
        )}

        {question.type === "number" && (
          <div className="flex items-center gap-2">
            <Input 
              type="number" 
              placeholder={settings.placeholder || "Enter a number"} 
              disabled 
              data-testid={`preview-input-${question.id}`} 
            />
            {settings.unitLabel && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {settings.unitLabel}
              </span>
            )}
          </div>
        )}

        {question.type === "date" && (
          <Input 
            type="date" 
            disabled 
            data-testid={`preview-input-${question.id}`} 
          />
        )}

        {question.type === "multiple_choice" && (
          <div className="space-y-2">
            {settings.options?.map((option: string, idx: number) => (
              <div key={idx} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${question.id}-${idx}`}
                  name={question.id}
                  disabled
                  className="w-4 h-4"
                  data-testid={`preview-radio-${question.id}-${idx}`}
                />
                <Label htmlFor={`${question.id}-${idx}`} className="font-normal">
                  {option}
                </Label>
              </div>
            ))}
            {settings.allowOther && (
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${question.id}-other`}
                  name={question.id}
                  disabled
                  className="w-4 h-4"
                  data-testid={`preview-radio-${question.id}-other`}
                />
                <Label htmlFor={`${question.id}-other`} className="font-normal">
                  Other:
                </Label>
                <Input placeholder="Please specify" disabled className="ml-2" />
              </div>
            )}
          </div>
        )}

        {question.type === "checkboxes" && (
          <div className="space-y-2">
            {settings.options?.map((option: string, idx: number) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox disabled data-testid={`preview-checkbox-${question.id}-${idx}`} />
                <Label className="font-normal">{option}</Label>
              </div>
            ))}
            {settings.allowOther && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox disabled data-testid={`preview-checkbox-${question.id}-other`} />
                  <Label className="font-normal">Other</Label>
                </div>
                <Input placeholder="Please specify" disabled className="ml-6" />
              </div>
            )}
          </div>
        )}

        {question.type === "dropdown" && (
          <div className="space-y-1">
            <div 
              className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-muted px-3 py-2 text-sm shadow-sm cursor-not-allowed opacity-50"
              data-testid={`preview-select-${question.id}`}
              aria-label={`${question.label} (preview only)`}
            >
              <span className="text-muted-foreground">Select an option</span>
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 opacity-50"
              >
                <path
                  d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z"
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="text-xs text-muted-foreground pl-2">
              Options: {settings.options?.join(", ") || "None configured"}
            </div>
          </div>
        )}

        {question.type === "file_upload" && (
          <div className="border-2 border-dashed rounded-lg p-6 bg-muted/50">
            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">File upload (preview only)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Accepts: {settings.allowedTypes?.join(", ") || "any files"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Max size: {settings.maxSizeMB || 10}MB, Max files: {settings.maxFiles || 5}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
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
            <h1 className="text-3xl font-bold">Preview: {questionnaire.name}</h1>
            <p className="text-muted-foreground mt-1">
              This is how clients will see your form
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{questionnaire.name}</CardTitle>
            {questionnaire.welcomeText && (
              <p className="text-muted-foreground">{questionnaire.welcomeText}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input placeholder="Enter your first name" disabled />
              </div>

              <div className="space-y-2">
                <Label>
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input placeholder="Enter your last name" disabled />
              </div>

              <div className="space-y-2">
                <Label>
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input type="email" placeholder="Enter your email" disabled />
              </div>

              <div className="space-y-2">
                <Label>
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input type="tel" placeholder="Enter your phone number" disabled />
              </div>
              
              {questionnaire.standardFields && (questionnaire.standardFields.sex || questionnaire.standardFields.age || questionnaire.standardFields.weight || questionnaire.standardFields.height) && (
                <>
                  {questionnaire.standardFields.sex && (
                    <div className="space-y-2" data-testid="standard-field-sex-preview">
                      <Label>Sex</Label>
                      <div 
                        className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-muted px-3 py-2 text-sm shadow-sm cursor-not-allowed opacity-50"
                        aria-label="Sex (preview only)"
                      >
                        <span className="text-muted-foreground">Select sex</span>
                      </div>
                    </div>
                  )}
                  
                  {questionnaire.standardFields.age && (
                    <div className="space-y-2" data-testid="standard-field-age-preview">
                      <Label>Age</Label>
                      <Input type="number" placeholder="Enter your age" disabled />
                    </div>
                  )}
                  
                  {questionnaire.standardFields.weight && (
                    <div className="space-y-2" data-testid="standard-field-weight-preview">
                      <Label>Weight (lbs)</Label>
                      <Input type="number" step="0.1" placeholder="Enter your weight" disabled />
                    </div>
                  )}
                  
                  {questionnaire.standardFields.height && (
                    <div className="space-y-2" data-testid="standard-field-height-preview">
                      <Label>Height (inches)</Label>
                      <Input type="number" step="0.1" placeholder="Enter your height" disabled />
                    </div>
                  )}
                </>
              )}
            </div>

            {questions.length > 0 && (
              <div className="pt-4 border-t space-y-4">
                {questions.map((question: Question) => renderQuestion(question))}
              </div>
            )}

            {questionnaire.consentRequired && questionnaire.consentText && (
              <div className="pt-4 border-t">
                <div className="flex items-start space-x-2">
                  <Checkbox disabled />
                  <Label className="text-sm leading-relaxed">
                    {questionnaire.consentText}
                  </Label>
                </div>
              </div>
            )}

            <div className="pt-4">
              <Button disabled className="w-full" data-testid="button-submit-preview">
                Submit (Preview Mode)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
