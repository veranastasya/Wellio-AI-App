import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/Group 626535_1761099357468.png";
import type { SupportedLanguage } from "@shared/schema";

const t = {
  welcomeToWellio: { en: "Welcome to Wellio", ru: "Добро пожаловать в Wellio", es: "Bienvenido a Wellio" },
  signInToContinue: { en: "Sign in to continue your wellness journey", ru: "Войдите, чтобы продолжить путь к здоровью", es: "Inicia sesión para continuar tu camino de bienestar" },
  email: { en: "Email", ru: "Эл. почта", es: "Correo electrónico" },
  password: { en: "Password", ru: "Пароль", es: "Contraseña" },
  forgotPassword: { en: "Forgot password?", ru: "Забыли пароль?", es: "¿Olvidaste tu contraseña?" },
  enterPassword: { en: "Enter your password", ru: "Введите пароль", es: "Ingresa tu contraseña" },
  signingIn: { en: "Signing In...", ru: "Вход...", es: "Iniciando sesión..." },
  signIn: { en: "Sign In", ru: "Войти", es: "Iniciar sesión" },
  firstTimeHere: { en: "First time here? Check your email for an invite link from your coach.", ru: "Впервые здесь? Проверьте почту — тренер отправил вам ссылку-приглашение.", es: "¿Primera vez aquí? Revisa tu correo para un enlace de invitación de tu entrenador." },
  missingInfo: { en: "Missing Information", ru: "Заполните все поля", es: "Información faltante" },
  enterBothFields: { en: "Please enter both email and password", ru: "Пожалуйста, введите email и пароль", es: "Por favor ingresa correo y contraseña" },
  welcomeBack: { en: "Welcome Back!", ru: "С возвращением!", es: "¡Bienvenido de vuelta!" },
  loggedInAs: { en: "Logged in as", ru: "Вы вошли как", es: "Sesión iniciada como" },
  loginFailed: { en: "Login Failed", ru: "Ошибка входа", es: "Error de inicio de sesión" },
  invalidCredentials: { en: "Invalid email or password. Please try again.", ru: "Неверный email или пароль. Попробуйте снова.", es: "Correo o contraseña incorrectos. Inténtalo de nuevo." },
} as const;

export default function ClientLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lang, setLang] = useState<SupportedLanguage>("en");

  useEffect(() => {
    const storedLang = localStorage.getItem("clientPreferredLanguage") as SupportedLanguage | null;
    if (storedLang && (storedLang === "en" || storedLang === "ru" || storedLang === "es")) {
      setLang(storedLang);
    } else {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith("ru")) setLang("ru");
      else if (browserLang.startsWith("es")) setLang("es");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: t.missingInfo[lang],
        description: t.enterBothFields[lang],
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest("POST", "/api/client-auth/login", {
        email,
        password,
      });
      const data = await response.json();

      if (data.success && data.client) {
        localStorage.setItem("clientId", data.client.id);
        localStorage.setItem("clientEmail", data.client.email);
        
        toast({
          title: t.welcomeBack[lang],
          description: `${t.loggedInAs[lang]} ${data.client.name}`,
        });

        setLocation("/client/dashboard");
      } else {
        throw new Error("Login failed");
      }
    } catch (error: any) {
      toast({
        title: t.loginFailed[lang],
        description: t.invalidCredentials[lang],
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBrandKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 p-4 sm:p-6 pb-2">
          <div className="flex items-baseline gap-3 mb-2">
            <Link
              href="/"
              aria-label="Wellio home"
              data-testid="brand-icon-link"
              onKeyDown={handleBrandKeyDown}
              className="flex items-center justify-center min-h-10 min-w-10 p-2 rounded-lg overflow-visible hover-elevate active-elevate-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <img 
                src={logoImage} 
                alt="Wellio Logo" 
                className="w-6 h-6 object-contain"
              />
            </Link>
            <CardTitle className="text-xl sm:text-2xl">{t.welcomeToWellio[lang]}</CardTitle>
          </div>
          <CardDescription className="text-sm sm:text-base">
            {t.signInToContinue[lang]}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t.email[lang]}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                autoComplete="email"
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t.password[lang]}</Label>
                <Link 
                  href="/forgot-password?type=client"
                  className="text-xs text-primary hover:underline"
                  data-testid="link-forgot-password"
                >
                  {t.forgotPassword[lang]}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.enterPassword[lang]}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1 hover:bg-accent rounded-md transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full min-h-10"
              disabled={isSubmitting || !email || !password}
              data-testid="button-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.signingIn[lang]}
                </>
              ) : (
                t.signIn[lang]
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs sm:text-sm text-muted-foreground">
            <p>{t.firstTimeHere[lang]}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
