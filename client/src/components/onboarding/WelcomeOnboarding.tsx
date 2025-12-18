import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Sparkles, Brain, MessageCircle, TrendingUp, LucideIcon } from "lucide-react";
import aiInsightImage from "@assets/aiinsight_1766019536081.jpg";

interface WelcomeOnboardingProps {
  isCoach: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface Slide {
  title: string;
  description: string;
  image: string;
  icon: LucideIcon;
}

const CLIENT_SLIDES: Slide[] = [
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
    icon: Brain,
  },
  {
    title: "Stay Connected with Your Coach 💬",
    description: "Get personalized guidance, ask questions, and receive support whenever you need it.",
    image: "https://images.unsplash.com/photo-1540206063137-4a88ca974d1a?w=800&q=80",
    icon: MessageCircle,
  },
];

const COACH_SLIDES: Slide[] = [
  {
    title: "Welcome to Your Coaching Platform! 🎯",
    description: "Manage clients, create personalized programs, and track progress all in one place.",
    image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80",
    icon: Sparkles,
  },
  {
    title: "AI-Powered Program Builder 🚀",
    description: "Create personalized weekly programs with AI. Just describe what your client needs, and let AI build structured workout plans, meal plans, and habits.",
    image: aiInsightImage,
    icon: Brain,
  },
  {
    title: "Track Client Progress in Real-Time 📊",
    description: "See client metrics, progress photos, and AI-logged data. Everything synced automatically.",
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80",
    icon: TrendingUp,
  },
];

export function WelcomeOnboarding({ isCoach, onComplete, onSkip }: WelcomeOnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = isCoach ? COACH_SLIDES : CLIENT_SLIDES;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const Icon = slides[currentSlide].icon;
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      data-testid="welcome-onboarding-overlay"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-2xl bg-white dark:bg-card rounded-2xl shadow-2xl overflow-hidden"
          data-testid="welcome-onboarding-modal"
        >
          <div className="relative h-48 sm:h-56 overflow-hidden">
            <img
              src={slides[currentSlide].image}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#28A0AE]/40 via-[#28A0AE]/20 to-[#E2F9AD]/30" />
            
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10">
              <div className="w-14 h-14 rounded-xl bg-white shadow-lg flex items-center justify-center">
                <Icon className="w-7 h-7 text-[#28A0AE]" />
              </div>
            </div>
          </div>

          <div className="px-6 pt-10 pb-6 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                {slides[currentSlide].title}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                {slides[currentSlide].description}
              </p>
            </div>

            <div className="flex justify-center gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    index === currentSlide 
                      ? "bg-[#28A0AE] scale-110" 
                      : "bg-muted hover:bg-muted-foreground/30"
                  }`}
                  data-testid={`slide-dot-${index}`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={onSkip}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-welcome-skip"
              >
                Skip
              </Button>

              <div className="flex items-center gap-2">
                {currentSlide > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrev}
                    data-testid="button-welcome-prev"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className="gap-2 bg-gradient-to-r from-[#28A0AE] to-[#229099] hover:from-[#229099] hover:to-[#1a7a82] text-white px-6"
                  data-testid="button-welcome-next"
                >
                  {isLastSlide ? "Get Started" : "Next"} 
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
