import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import type { Questionnaire } from "@shared/schema";

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

  const questions = questionnaire.questions as Array<{
    id: string;
    label: string;
    type: string;
    isRequired: boolean;
    options?: string[];
  }>;

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
            </div>

            {questions.length > 0 && (
              <div className="pt-4 border-t space-y-4">
                {questions.map((question) => (
                  <div key={question.id} className="space-y-2" data-testid={`preview-question-${question.id}`}>
                    <Label>
                      {question.label}
                      {question.isRequired && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {question.type === "short_text" && (
                      <Input placeholder="Your answer" disabled data-testid={`preview-input-${question.id}`} />
                    )}
                    {question.type === "paragraph" && (
                      <Textarea placeholder="Your answer" rows={4} disabled data-testid={`preview-textarea-${question.id}`} />
                    )}
                    {question.type === "number" && (
                      <Input type="number" placeholder="Enter a number" disabled data-testid={`preview-input-${question.id}`} />
                    )}
                    {question.type === "date" && (
                      <Input type="date" disabled data-testid={`preview-input-${question.id}`} />
                    )}
                    {question.type === "multiple_choice" && (
                      <div className="space-y-2">
                        {question.options?.map((option, idx) => (
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
                      </div>
                    )}
                    {question.type === "checkboxes" && (
                      <div className="space-y-2">
                        {question.options?.map((option, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <Checkbox disabled data-testid={`preview-checkbox-${question.id}-${idx}`} />
                            <Label className="font-normal">{option}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                    {question.type === "dropdown" && (
                      <Select disabled>
                        <SelectTrigger data-testid={`preview-select-${question.id}`}>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {question.options?.map((option, idx) => (
                            <SelectItem key={idx} value={option} data-testid={`preview-select-option-${question.id}-${idx}`}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
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
