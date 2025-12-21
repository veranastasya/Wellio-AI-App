import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, X } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useTour } from "@/contexts/tour-context";

interface InteractiveTourProps {
  isCoach: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

interface TourStep {
  target: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
  highlightPadding?: number;
}

const CLIENT_STEPS: TourStep[] = [
  { 
    target: '[data-tour="dashboard"]', 
    title: "Your Dashboard 🏠", 
    description: "Quick overview of your weekly stats and achievements. Check here daily for motivation!", 
    position: "right" 
  },
  { 
    target: '[data-tour="progress"]', 
    title: "Track Your Progress 📈", 
    description: "See all your metrics, weight trends, and progress photos in one place. This is what your coach sees too!", 
    position: "right" 
  },
  { 
    target: '[data-tour="ai-chat"]', 
    title: "AI Tracker 🤖", 
    description: "Just chat naturally! Log meals, workouts, and how you feel. AI automatically tracks everything for you.", 
    position: "right" 
  },
  { 
    target: '[data-tour="coach-chat"]', 
    title: "Message Your Coach 💬", 
    description: "Get personalized support, ask questions, and stay accountable with direct coach messaging.", 
    position: "right" 
  },
  { 
    target: '[data-tour="plan"]', 
    title: "Your Personalized Plan 📋", 
    description: "View weekly programs your coach created just for you - workouts, meals, habits, and tasks.", 
    position: "right" 
  },
];

const COACH_STEPS: TourStep[] = [
  { 
    target: '[data-tour="dashboard"]', 
    title: "Your Dashboard 🏠", 
    description: "Get a quick overview of your coaching practice - active clients, upcoming sessions, and key metrics.", 
    position: "right" 
  },
  { 
    target: '[data-tour="clients"]', 
    title: "Manage Clients 👥", 
    description: "View all your clients, their progress, and access detailed profiles with one click.", 
    position: "right" 
  },
  { 
    target: '[data-tour="questionnaires"]', 
    title: "Questionnaire Builder 📝", 
    description: "Create custom intake forms and questionnaires to gather client information efficiently.", 
    position: "right" 
  },
  { 
    target: '[data-tour="communication"]', 
    title: "Client Communication 💬", 
    description: "Message clients directly, send updates, and stay connected with your coaching community.", 
    position: "right" 
  },
];

interface TooltipPosition {
  top: number;
  left: number;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function InteractiveTour({ isCoach, onComplete, onSkip }: InteractiveTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({ top: 100, left: 280 });
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const positioningRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 10;
  const isMobile = useIsMobile();
  
  const { setOpenMobile, isMobile: isSidebarMobile, open: sidebarOpen, openMobile } = useSidebar();
  const { setTourActive, setCurrentTourTarget } = useTour();
  
  const steps = isCoach ? COACH_STEPS : CLIENT_STEPS;
  const step = steps[currentStep];

  const extractTourId = (target: string): string | null => {
    const match = target.match(/data-tour="([^"]+)"/);
    return match ? match[1] : null;
  };

  // Check if element is actually visible on screen (not just in DOM)
  const isElementVisible = useCallback((element: Element): boolean => {
    const rect = element.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    
    // Element must have positive dimensions
    if (rect.width <= 0 || rect.height <= 0) return false;
    
    // Element must be within the viewport horizontally
    // On mobile, sidebar elements should be visible (left >= 0 and left < windowWidth)
    if (rect.left < 0 || rect.left >= windowWidth) return false;
    
    // Element must be within reasonable vertical bounds
    if (rect.top < 0 || rect.bottom > window.innerHeight) return false;
    
    return true;
  }, []);

  // Open sidebar at tour start (mobile) and keep it open throughout
  // The Sidebar component now prevents closing during active tour
  useEffect(() => {
    setTourActive(true);
    if (isSidebarMobile) {
      setOpenMobile(true);
    }
    return () => {
      setTourActive(false);
      setCurrentTourTarget(null);
    };
  }, [setTourActive, setOpenMobile, isSidebarMobile, setCurrentTourTarget]);

  useEffect(() => {
    const tourId = extractTourId(step.target);
    setCurrentTourTarget(tourId);
  }, [step.target, setCurrentTourTarget]);

  const calculatePositions = useCallback((): boolean => {
    // On mobile, first check if the sidebar is actually open
    // If not, we need to wait for it to open before finding elements
    if (isSidebarMobile && !openMobile) {
      return false; // Sidebar not open yet, retry later
    }

    // On mobile, use a more specific selector to only find elements inside the open sidebar sheet
    // The mobile sidebar has data-mobile="true" attribute when rendered
    let element: Element | null = null;
    if (isSidebarMobile) {
      // First try to find the element inside the mobile sidebar sheet
      element = document.querySelector(`[data-mobile="true"] ${step.target}`);
    }
    
    // Fallback to general selector (for desktop or if mobile selector fails)
    if (!element) {
      element = document.querySelector(step.target);
    }
    
    if (!element) return false;

    // Check if element is actually visible on screen
    if (!isElementVisible(element)) {
      return false; // Signal that we need to retry
    }

    const rect = element.getBoundingClientRect();
    const padding = step.highlightPadding ?? 4;
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const gap = 12;

    setHighlightRect({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });

    let top = rect.top;
    let left = rect.right + gap;

    switch (step.position) {
      case "right":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + gap;
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - gap;
        break;
      case "top":
        top = rect.top - tooltipHeight - gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case "bottom":
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
    }

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    
    if (top < 20) top = 20;
    if (top + tooltipHeight > windowHeight - 20) top = windowHeight - tooltipHeight - 20;
    if (left < 20) left = 20;
    if (left + tooltipWidth > windowWidth - 20) left = windowWidth - tooltipWidth - 20;

    setTooltipPosition({ top, left });
    return true; // Success
  }, [step, isElementVisible, isSidebarMobile, openMobile]);

  // Schedule position calculation with retry logic
  const schedulePositionCalculation = useCallback(() => {
    if (positioningRef.current) {
      clearTimeout(positioningRef.current);
    }

    // Clear highlight immediately when starting new calculation
    // This prevents showing highlight at wrong position during transition
    setHighlightRect(null);

    const attemptCalculation = () => {
      const success = calculatePositions();
      
      if (!success && retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        // Retry after 100ms if element isn't visible yet
        positioningRef.current = setTimeout(attemptCalculation, 100);
      }
    };

    // Reset retry count for new step
    retryCountRef.current = 0;
    
    // Initial delay - wait for sidebar animation to start
    const initialDelay = isSidebarMobile ? 400 : 100;
    
    positioningRef.current = setTimeout(attemptCalculation, initialDelay);
  }, [calculatePositions, isSidebarMobile]);

  // Recalculate positions when step changes or sidebar opens
  useEffect(() => {
    schedulePositionCalculation();

    const handleResize = () => {
      retryCountRef.current = 0;
      schedulePositionCalculation();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (positioningRef.current) {
        clearTimeout(positioningRef.current);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [currentStep, schedulePositionCalculation, openMobile]);

  const cleanupTour = useCallback(() => {
    setTourActive(false);
    setCurrentTourTarget(null);
    if (isSidebarMobile) {
      setOpenMobile(false);
    }
  }, [setTourActive, setCurrentTourTarget, setOpenMobile, isSidebarMobile]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      cleanupTour();
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipWithCleanup = () => {
    cleanupTour();
    onSkip();
  };

  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 pointer-events-none" />
      
      {highlightRect && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg ring-2 ring-[#28A0AE] shadow-[0_0_20px_rgba(40,160,174,0.5)]"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
          }}
          data-testid="tour-highlight"
        />
      )}

      <AnimatePresence mode="wait">
        {isMobile ? (
          <motion.div
            key={`mobile-${currentStep}`}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed z-[9999] bottom-0 left-0 right-0 bg-white dark:bg-card rounded-t-2xl shadow-2xl pointer-events-auto safe-area-bottom"
            style={{ touchAction: "auto" }}
            data-testid="tour-tooltip-mobile"
          >
            <div className="bg-[#28A0AE] px-4 py-3 flex items-center justify-between pointer-events-auto">
              <span className="text-sm font-medium text-white">
                Step {currentStep + 1} of {steps.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkipWithCleanup}
                className="h-8 w-8 text-white hover:bg-white/20 pointer-events-auto"
                data-testid="button-tour-close"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground text-lg">
                  {step.title}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="flex gap-1.5">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 flex-1 rounded-full transition-all ${
                      index <= currentStep ? "bg-[#28A0AE]" : "bg-muted"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 pb-2 pointer-events-auto" style={{ touchAction: "manipulation" }}>
                <Button
                  variant="ghost"
                  size="default"
                  onClick={handleSkipWithCleanup}
                  className="text-muted-foreground text-base h-12 px-4 pointer-events-auto"
                  data-testid="button-tour-skip"
                >
                  Skip tour
                </Button>

                <div className="flex items-center gap-2 pointer-events-auto">
                  {currentStep > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePrev}
                      className="h-12 w-12 pointer-events-auto"
                      data-testid="button-tour-prev"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    className="gap-2 bg-[#28A0AE] hover:bg-[#229099] h-12 px-6 text-base pointer-events-auto"
                    data-testid="button-tour-next"
                  >
                    {isLastStep ? "Finish" : "Next"}
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[70] w-80 bg-white dark:bg-card rounded-xl shadow-2xl overflow-hidden"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
            }}
            data-testid="tour-tooltip"
          >
            <div className="bg-[#28A0AE] px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm font-medium text-white">
                Step {currentStep + 1} of {steps.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkipWithCleanup}
                className="h-7 w-7 text-white hover:bg-white/20"
                data-testid="button-tour-close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <h3 className="font-semibold text-foreground text-base">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="flex gap-1">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      index <= currentStep ? "bg-[#28A0AE]" : "bg-muted"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipWithCleanup}
                  className="text-muted-foreground text-sm h-9 px-3"
                  data-testid="button-tour-skip"
                >
                  Skip tour
                </Button>

                <div className="flex items-center gap-1.5">
                  {currentStep > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePrev}
                      className="h-9 w-9"
                      data-testid="button-tour-prev"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    className="gap-1.5 bg-[#28A0AE] hover:bg-[#229099] h-9 px-4"
                    data-testid="button-tour-next"
                  >
                    {isLastStep ? "Finish" : "Next"}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
