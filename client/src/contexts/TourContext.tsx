import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface TourContextType {
  isActive: boolean;
  currentTourTarget: string | null;
  setTourActive: (active: boolean) => void;
  setCurrentTourTarget: (target: string | null) => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentTourTarget, setCurrentTourTargetState] = useState<string | null>(null);

  const setTourActive = useCallback((active: boolean) => {
    setIsActive(active);
    if (!active) {
      setCurrentTourTargetState(null);
    }
  }, []);

  const setCurrentTourTarget = useCallback((target: string | null) => {
    setCurrentTourTargetState(target);
  }, []);

  return (
    <TourContext.Provider 
      value={{ 
        isActive, 
        currentTourTarget, 
        setTourActive, 
        setCurrentTourTarget 
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    return { 
      isActive: false, 
      currentTourTarget: null, 
      setTourActive: () => {}, 
      setCurrentTourTarget: () => {} 
    };
  }
  return context;
}
