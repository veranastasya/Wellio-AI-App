import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, X, Sparkles, Home, TrendingUp, Bot, MessageSquare, BarChart3, Star, PartyPopper } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface OnboardingProps {
  clientId: string;
  clientName: string;
  onComplete: () => void;
}

const SLIDES = [
  {
    title: "Welcome to Your Wellness Journey",
    description: "Track your progress, chat with your coach, and achieve your health goals with AI-powered insights.",
    image: "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800&q=80",
    icon: Sparkles,
  },
  {
    title: "AI-Powered Progress Tracking",
    description: "Simply chat with our AI to log meals, workouts, and how you feel. No complicated forms or manual entry.",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80",
    icon: Bot,
  },
  {
    title: "Stay Connected with Your Coach",
    description: "Get personalized guidance, ask questions, and receive support whenever you need it.",
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80",
    icon: MessageSquare,
  },
];

const TOUR_STEPS = [
  {
    title: "Your Dashboard",
    description: "Quick overview of your weekly stats and achievements. Check here daily for motivation!",
    target: "Dashboard",
    icon: Home,
    path: "/client/dashboard",
  },
  {
    title: "Track Your Progress",
    description: "See all your metrics, weight trends, and progress photos in one place. This is what your coach sees too!",
    target: "My Progress",
    icon: BarChart3,
    path: "/client/my-progress",
  },
  {
    title: "AI Tracker",
    description: "Just chat naturally! Log meals, workouts, and how you feel. AI automatically tracks everything for you.",
    target: "AI Tracker",
    icon: Bot,
    path: "/client/ai-tracker",
  },
  {
    title: "Message Your Coach",
    description: "Get personalized support, ask questions, and stay accountable with direct coach messaging.",
    target: "Coach Chat",
    icon: MessageSquare,
    path: "/client/chat",
  },
  {
    title: "Your Personalized Plan",
    description: "View weekly programs your coach created just for you - workouts, meals, habits, and tasks.",
    target: "My Plan",
    icon: TrendingUp,
    path: "/client/plan",
  },
];

function ConfettiPiece({ delay, x }: { delay: number; x: number }) {
  const colors = ["#E2F9AD", "#28A0AE", "#FFD700", "#FF6B6B", "#4ECDC4", "#A78BFA"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  return (
    <motion.div
      className="absolute w-3 h-3 rounded-sm"
      style={{ 
        backgroundColor: color,
        left: `${x}%`,
        top: -20,
      }}
      initial={{ y: -20, rotate: 0, opacity: 1 }}
      animate={{ 
        y: typeof window !== 'undefined' ? window.innerHeight + 50 : 800,
        rotate: 720,
        opacity: [1, 1, 0],
      }}
      transition={{ 
        duration: 3,
        delay,
        ease: "easeOut",
      }}
    />
  );
}

function Confetti() {
  const pieces = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    delay: Math.random() * 0.5,
    x: Math.random() * 100,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {pieces.map((piece) => (
        <ConfettiPiece key={piece.id} delay={piece.delay} x={piece.x} />
      ))}
    </div>
  );
}

export function ClientOnboarding({ clientId, clientName, onComplete }: OnboardingProps) {
  const [phase, setPhase] = useState<"slides" | "tour" | "celebration">("slides");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [, setLocation] = useLocation();

  const handleSkip = useCallback(async () => {
    try {
      await apiRequest("PATCH", `/api/clients/${clientId}`, {
        onboardingCompleted: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/client-auth/me"] });
    } catch (error) {
      console.error("Failed to save onboarding status:", error);
    }
    onComplete();
  }, [clientId, onComplete]);

  const handleNextSlide = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      setPhase("tour");
    }
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleNextTourStep = () => {
    if (currentTourStep < TOUR_STEPS.length - 1) {
      setCurrentTourStep(currentTourStep + 1);
      setLocation(TOUR_STEPS[currentTourStep + 1].path);
    } else {
      setPhase("celebration");
      setShowConfetti(true);
    }
  };

  const handlePrevTourStep = () => {
    if (currentTourStep > 0) {
      setCurrentTourStep(currentTourStep - 1);
      setLocation(TOUR_STEPS[currentTourStep - 1].path);
    }
  };

  useEffect(() => {
    if (phase === "celebration") {
      const timer = setTimeout(async () => {
        try {
          await apiRequest("PATCH", `/api/clients/${clientId}`, {
            onboardingCompleted: true,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/client-auth/me"] });
        } catch (error) {
          console.error("Failed to save onboarding status:", error);
        }
        onComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [phase, clientId, onComplete]);

  useEffect(() => {
    if (phase === "tour") {
      setLocation(TOUR_STEPS[0].path);
    }
  }, [phase, setLocation]);

  if (phase === "slides") {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col min-h-0 overflow-y-auto"
          >
            <div className="relative h-[40vh] min-h-[200px] max-h-[350px] flex-shrink-0 overflow-hidden">
              <img
                src={SLIDES[currentSlide].image}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-primary/30">
                  {(() => {
                    const Icon = SLIDES[currentSlide].icon;
                    return <Icon className="w-7 h-7 md:w-8 md:h-8 text-primary" />;
                  })()}
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-between px-5 md:px-8 pt-10 pb-6 min-h-0">
              <div className="text-center space-y-3 flex-shrink-0">
                <h1 className="text-lg md:text-2xl font-bold text-foreground leading-tight">
                  {SLIDES[currentSlide].title}
                </h1>
                <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto leading-relaxed">
                  {SLIDES[currentSlide].description}
                </p>
              </div>

              <div className="space-y-4 flex-shrink-0 pt-4">
                <div className="flex justify-center gap-2">
                  {SLIDES.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        index === currentSlide
                          ? "w-6 bg-primary"
                          : "w-2 bg-muted"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                    data-testid="button-onboarding-skip"
                  >
                    Skip
                  </Button>

                  <div className="flex items-center gap-2">
                    {currentSlide > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePrevSlide}
                        data-testid="button-onboarding-prev"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                    )}
                    <Button
                      onClick={handleNextSlide}
                      className="gap-2 bg-primary hover:bg-primary/90"
                      data-testid="button-onboarding-next"
                    >
                      {currentSlide === SLIDES.length - 1 ? (
                        <>
                          Get Started <Sparkles className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Next <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (phase === "tour") {
    const currentStep = TOUR_STEPS[currentTourStep];
    const Icon = currentStep.icon;

    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/50 pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:w-80 z-50 bg-primary rounded-xl shadow-2xl overflow-hidden max-h-[80vh]"
          data-testid="tour-tooltip"
        >
          <div className="p-1">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-medium text-primary-foreground">
                Step {currentTourStep + 1} of {TOUR_STEPS.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                data-testid="button-tour-close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  {currentStep.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {currentStep.description}
                </p>
              </div>
            </div>

            <div className="flex gap-1">
              {TOUR_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    index <= currentTourStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground text-sm"
                data-testid="button-tour-skip"
              >
                Skip tour
              </Button>

              <div className="flex items-center gap-1">
                {currentTourStep > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevTourStep}
                    data-testid="button-tour-prev"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleNextTourStep}
                  className="gap-1.5 bg-primary hover:bg-primary/90"
                  data-testid="button-tour-next"
                >
                  {currentTourStep === TOUR_STEPS.length - 1 ? (
                    <>
                      Finish <Star className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Next <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </>
    );
  }

  if (phase === "celebration") {
    return (
      <>
        {showConfetti && <Confetti />}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <div className="text-center space-y-6 max-w-md">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center"
            >
              <PartyPopper className="w-10 h-10 text-primary" />
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-2"
            >
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                You're All Set, {clientName.split(' ')[0]}!
              </h1>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                Your wellness journey starts now. Let's achieve those goals together!
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Redirecting to dashboard...</span>
            </motion.div>
          </div>
        </motion.div>
      </>
    );
  }

  return null;
}
