import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { WelcomeOnboarding } from "./WelcomeOnboarding";
import { InteractiveTour } from "./InteractiveTour";
import { Confetti } from "./Confetti";
import { PartyPopper, Star } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface HybridOnboardingProps {
  isCoach: boolean;
  userId: string;
  userName: string;
  onComplete: () => void;
}

type Phase = "welcome" | "tour" | "celebration";

export function HybridOnboarding({ isCoach, userId, userName, onComplete }: HybridOnboardingProps) {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [showConfetti, setShowConfetti] = useState(false);

  const handleWelcomeComplete = () => {
    setPhase("tour");
  };

  const handleTourComplete = () => {
    setPhase("celebration");
    setShowConfetti(true);
  };

  const handleSkip = async () => {
    await saveOnboardingComplete();
    onComplete();
  };

  const saveOnboardingComplete = async () => {
    try {
      if (isCoach) {
        await apiRequest("PATCH", `/api/user`, {
          onboardingCompleted: true,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      } else {
        await apiRequest("PATCH", `/api/clients/${userId}`, {
          onboardingCompleted: true,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/client-auth/me"] });
      }
    } catch (error) {
      console.error("Failed to save onboarding status:", error);
    }
  };

  useEffect(() => {
    if (phase === "celebration") {
      const timer = setTimeout(async () => {
        await saveOnboardingComplete();
        onComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  if (phase === "welcome") {
    return (
      <WelcomeOnboarding
        isCoach={isCoach}
        onComplete={handleWelcomeComplete}
        onSkip={handleSkip}
      />
    );
  }

  if (phase === "tour") {
    return (
      <InteractiveTour
        isCoach={isCoach}
        onComplete={handleTourComplete}
        onSkip={handleSkip}
      />
    );
  }

  if (phase === "celebration") {
    return (
      <>
        {showConfetti && <Confetti />}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-card rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
            data-testid="celebration-modal"
          >
            <div className="flex justify-center gap-2 mb-4">
              <Star className="w-8 h-8 text-[#E2F9AD] fill-[#E2F9AD]" />
              <PartyPopper className="w-10 h-10 text-[#28A0AE]" />
              <Star className="w-8 h-8 text-[#E2F9AD] fill-[#E2F9AD]" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {isCoach ? "You're All Set!" : "You're Ready to Go!"}
            </h2>
            <p className="text-muted-foreground">
              {isCoach 
                ? "Your coaching platform is ready. Start managing clients and building programs!"
                : `Great job, ${userName}! Your wellness journey begins now.`
              }
            </p>
          </motion.div>
        </div>
      </>
    );
  }

  return null;
}
