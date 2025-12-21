import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/Group 626535_1761099357468.png";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  
  const params = new URLSearchParams(searchString);
  const userType = params.get("type") || "client";
  
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest("POST", "/api/auth/forgot-password", {
        email,
        userType,
      });
      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        throw new Error(data.error || "Request failed");
      }
    } catch (error: any) {
      toast({
        title: "Request Failed",
        description: "Unable to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginPath = userType === "coach" ? "/coach/login" : "/client/login";
  const portalName = userType === "coach" ? "Coach" : "Client";

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 p-4 sm:p-6 pb-2 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl">Check Your Email</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              If an account exists for {email}, you'll receive a password reset link shortly.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 space-y-4">
            <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground space-y-2">
              <p>The link will expire in 24 hours.</p>
              <p>Don't see the email? Check your spam folder.</p>
            </div>
            
            <Link href={loginPath}>
              <Button variant="outline" className="w-full min-h-10" data-testid="button-back-to-login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 p-4 sm:p-6 pb-2">
          <div className="flex items-baseline gap-3 mb-2">
            <Link
              href="/"
              aria-label="Wellio home"
              data-testid="brand-icon-link"
              className="flex items-center justify-center min-h-10 min-w-10 p-2 rounded-lg overflow-visible hover-elevate active-elevate-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <img 
                src={logoImage} 
                alt="Wellio Logo" 
                className="w-6 h-6 object-contain"
              />
            </Link>
            <CardTitle className="text-xl sm:text-2xl">Reset Password</CardTitle>
          </div>
          <CardDescription className="text-sm sm:text-base">
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  autoComplete="email"
                  className="pl-9"
                  data-testid="input-email"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full min-h-10"
              disabled={isSubmitting || !email}
              data-testid="button-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              href={loginPath}
              className="text-sm text-primary hover:underline"
              data-testid="link-back-to-login"
            >
              <ArrowLeft className="w-3 h-3 inline mr-1" />
              Back to {portalName} Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
