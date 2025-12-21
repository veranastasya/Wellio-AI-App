import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface TourContextType {
  isActive: boolean;
  currentTourTarget: string | null;
  activeTourStep: number | null;
  setTourActive: (active: boolean) => void;
  setCurrentTourTarget: (target: string | null) => void;
  setActiveTourStep: (step: number | null) => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentTourTarget, setCurrentTourTargetState] = useState<string | null>(null);
  const [activeTourStep, setActiveTourStepState] = useState<number | null>(null);

  const setTourActive = useCallback((active: boolean) => {
    setIsActive(active);
    if (!active) {
      setCurrentTourTargetState(null);
      setActiveTourStepState(null);
    }
  }, []);

  const setCurrentTourTarget = useCallback((target: string | null) => {
    setCurrentTourTargetState(target);
  }, []);

  const setActiveTourStep = useCallback((step: number | null) => {
    setActiveTourStepState(step);
  }, []);

  return (
    <TourContext.Provider 
      value={{ 
        isActive, 
        currentTourTarget,
        activeTourStep,
        setTourActive, 
        setCurrentTourTarget,
        setActiveTourStep
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  // Return default values when used outside TourProvider (e.g., in sidebar.tsx)
  if (!context) {
    return {
      isActive: false,
      currentTourTarget: null,
      activeTourStep: null,
      setTourActive: () => {},
      setCurrentTourTarget: () => {},
      setActiveTourStep: () => {},
    };
  }
  return context;
}
