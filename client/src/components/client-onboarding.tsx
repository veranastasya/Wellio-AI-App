import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, X, Sparkles, Home, TrendingUp, Bot, MessageSquare, BarChart3, Star, PartyPopper } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import aiInsightImage from "@assets/aiinsight_1766019536081.jpg";

interface OnboardingProps {
  clientId: string;
  clientName: string;
  onComplete: () => void;
  onTourStepChange?: (step: number | null) => void;
}

const SLIDES = [
  {
    title: "Welcome to Your Wellness Journey! 🌟",
    description: "Track your progress, chat with your coach, and achieve your health goals with AI-powered insights.",
    image: "https://images.unsplash.com/photo-1760217280712-a12c4ddaa2b2?w=800&q=80",
    icon: Sparkles,
  },
  {
    title: "AI-Powered Progress Tracking 🤖",
    description: "Simply chat with our AI to log meals, workouts, and how you feel. No complicated forms or manual entry.",
    image: aiInsightImage,
    icon: Bot,
  },
  {
    title: "Stay Connected with Your Coach 💬",
    description: "Get personalized guidance, ask questions, and receive support whenever you need it.",
    image: "https://images.unsplash.com/photo-1540206063137-4a88ca974d1a?w=800&q=80",
    icon: MessageSquare,
  },
];

const TOUR_STEPS = [
  {
    stepNumber: 1,
    title: "Your Dashboard 🏠",
    description: "Quick overview of your weekly stats and achievements. Check here daily for motivation!",
    icon: Home,
    path: "/client/dashboard",
  },
  {
    stepNumber: 2,
    title: "Track Your Progress 📈",
    description: "See all your metrics, weight trends, and progress photos in one place. This is what your coach sees too!",
    icon: BarChart3,
    path: "/client/my-progress",
  },
  {
    stepNumber: 3,
    title: "Your Personalized Plan 📋",
    description: "View weekly programs your coach created just for you - workouts, meals, habits, and tasks.",
    icon: TrendingUp,
    path: "/client/plan",
  },
  {
    stepNumber: 4,
    title: "Message Your Coach 💬",
    description: "Get personalized support, ask questions, and stay accountable with direct coach messaging.",
    icon: MessageSquare,
    path: "/client/chat",
  },
  {
    stepNumber: 5,
    title: "AI Tracker 🤖",
    description: "Just chat naturally! Log meals, workouts, and how you feel. AI automatically tracks everything for you.",
    icon: Bot,
    path: "/client/ai-tracker",
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

export function ClientOnboarding({ clientId, clientName, onComplete, onTourStepChange }: OnboardingProps) {
  const [phase, setPhase] = useState<"slides" | "tour" | "celebration">("slides");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 100, left: 200 });
  const [, setLocation] = useLocation();

  const handleSkip = useCallback(async () => {
    if (onTourStepChange) onTourStepChange(null);
    try {
      await apiRequest("PATCH", `/api/clients/${clientId}`, {
        onboardingCompleted: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/client-auth/me"] });
    } catch (error) {
      console.error("Failed to save onboarding status:", error);
    }
    onComplete();
  }, [clientId, onComplete, onTourStepChange]);

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
      const nextStep = currentTourStep + 1;
      setCurrentTourStep(nextStep);
      setLocation(TOUR_STEPS[nextStep].path);
    } else {
      if (onTourStepChange) onTourStepChange(null);
      setPhase("celebration");
      setShowConfetti(true);
    }
  };

  const handlePrevTourStep = () => {
    if (currentTourStep > 0) {
      const prevStep = currentTourStep - 1;
      setCurrentTourStep(prevStep);
      setLocation(TOUR_STEPS[prevStep].path);
    }
  };

  // Notify parent of tour step changes
  useEffect(() => {
    if (phase === "tour" && onTourStepChange) {
      onTourStepChange(TOUR_STEPS[currentTourStep].stepNumber);
    }
  }, [phase, currentTourStep, onTourStepChange]);

  // Navigate to first tour step when entering tour phase
  useEffect(() => {
    if (phase === "tour") {
      setLocation(TOUR_STEPS[0].path);
      if (onTourStepChange) {
        onTourStepChange(TOUR_STEPS[0].stepNumber);
      }
    }
  }, [phase, setLocation, onTourStepChange]);

  // Calculate tooltip position based on highlighted element
  const updateTooltipPosition = useCallback(() => {
    if (phase !== "tour") return;
    
    const stepNumber = TOUR_STEPS[currentTourStep].stepNumber;
    const navItem = document.querySelector(`[data-tour-step="${stepNumber}"]`);
    if (navItem) {
      const rect = navItem.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const tooltipHeight = 280;
      
      // Ensure tooltip stays within viewport
      let topPos = rect.top;
      if (topPos + tooltipHeight > windowHeight - 20) {
        topPos = windowHeight - tooltipHeight - 20;
      }
      if (topPos < 20) {
        topPos = 20;
      }
      
      setTooltipPosition({
        top: topPos,
        left: rect.right + 12,
      });
    }
  }, [phase, currentTourStep]);

  // Update position on step change and resize
  useEffect(() => {
    if (phase === "tour") {
      // Initial positioning with small delay for navigation
      const timer = setTimeout(updateTooltipPosition, 150);
      
      // Update on resize
      window.addEventListener('resize', updateTooltipPosition);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateTooltipPosition);
      };
    }
  }, [phase, currentTourStep, updateTooltipPosition]);

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

  // Phase 1: Welcome Slides - Card Modal Design
  if (phase === "slides") {
    const Icon = SLIDES[currentSlide].icon;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl overflow-hidden"
            data-testid="onboarding-modal"
          >
            {/* Hero Image with Teal Gradient Overlay */}
            <div className="relative h-48 sm:h-56 overflow-hidden">
              <img
                src={SLIDES[currentSlide].image}
                alt=""
                className="w-full h-full object-cover"
              />
              {/* Teal gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-primary/20 to-primary/40" />
              
              {/* White icon badge at bottom of image */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10">
                <div className="w-14 h-14 rounded-xl bg-white shadow-lg flex items-center justify-center">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="px-6 pt-10 pb-6 text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {SLIDES[currentSlide].title}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                {SLIDES[currentSlide].description}
              </p>

              {/* Progress Indicator */}
              <div className="flex justify-center items-center gap-1.5 mt-6 mb-6">
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

              {/* Navigation Controls */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-muted-foreground hover:text-foreground"
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
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6"
                    data-testid="button-onboarding-next"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Phase 2: Interactive Tour - Positioned next to sidebar
  if (phase === "tour") {
    const currentStep = TOUR_STEPS[currentTourStep];
    const Icon = currentStep.icon;

    return (
      <>
        {/* Dark overlay - but allow clicking on highlighted element */}
        <div className="fixed inset-0 z-40 bg-black/50 pointer-events-none" />
        
        {/* Tour tooltip positioned next to sidebar */}
        <motion.div
          key={currentTourStep}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed z-[70] w-72 md:w-80 bg-card rounded-xl shadow-2xl overflow-hidden"
          style={{
            top: Math.min(tooltipPosition.top, typeof window !== 'undefined' ? window.innerHeight - 280 : 400),
            left: Math.max(tooltipPosition.left, 200),
          }}
          data-testid="tour-tooltip"
        >
          {/* Teal header */}
          <div className="bg-primary px-4 py-2.5 flex items-center justify-between">
            <span className="text-sm font-medium text-primary-foreground">
              Step {currentTourStep + 1} of {TOUR_STEPS.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
              data-testid="button-tour-close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* White content area */}
          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <h3 className="font-semibold text-foreground text-base">
                {currentStep.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentStep.description}
              </p>
            </div>

            {/* Progress bar segments */}
            <div className="flex gap-1">
              {TOUR_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    index <= currentTourStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground text-sm h-9 px-3"
                data-testid="button-tour-skip"
              >
                Skip tour
              </Button>

              <div className="flex items-center gap-1.5">
                {currentTourStep > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevTourStep}
                    className="h-9 w-9"
                    data-testid="button-tour-prev"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                )}
                <Button
                  onClick={handleNextTourStep}
                  className="gap-1.5 bg-primary hover:bg-primary/90 h-9 px-4"
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

  // Phase 3: Celebration
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
