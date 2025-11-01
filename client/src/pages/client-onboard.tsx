import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function ClientOnboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [formData, setFormData] = useState<Record<string, any>>({});

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
      const data = response as any;
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

  const submitMutation = useMutation({
    mutationFn: async (answers: Record<string, any>) => {
      return await apiRequest("POST", "/api/responses", {
        questionnaireId: tokenData.invite.questionnaireId,
        clientId: "", // Will be set by backend
        answers,
        submittedAt: new Date().toISOString(),
        token, // Include token for onboarding flow
      });
    },
    onSuccess: () => {
      localStorage.setItem("clientToken", token!);
      toast({
        title: "Welcome!",
        description: "Your account has been created successfully",
      });
      setLocation("/client/dashboard");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit questionnaire",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
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
            <p className="text-lg font-medium text-destructive">Invalid Invite Link</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please contact your coach for a valid invite link
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
          <CardTitle className="text-2xl">Welcome to Wellio</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Complete your onboarding questionnaire to get started
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="goal">Primary Fitness Goal</Label>
                <Input
                  id="goal"
                  value={formData.goal || ""}
                  onChange={(e) => handleChange("goal", e.target.value)}
                  placeholder="e.g., Weight loss, Muscle gain, General fitness"
                  required
                />
              </div>

              <div>
                <Label htmlFor="experience">Fitness Experience Level</Label>
                <select
                  id="experience"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={formData.experience || ""}
                  onChange={(e) => handleChange("experience", e.target.value)}
                  required
                >
                  <option value="">Select level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <Label htmlFor="additionalInfo">Additional Information</Label>
                <Textarea
                  id="additionalInfo"
                  value={formData.additionalInfo || ""}
                  onChange={(e) => handleChange("additionalInfo", e.target.value)}
                  placeholder="Tell us about any injuries, dietary restrictions, or other relevant information..."
                  className="min-h-24"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitMutation.isPending}
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
