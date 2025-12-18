import { createContext, useContext, useState, type ReactNode } from "react";

interface TourContextType {
  activeTourStep: number | null;
  setActiveTourStep: (step: number | null) => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [activeTourStep, setActiveTourStep] = useState<number | null>(null);

  return (
    <TourContext.Provider value={{ activeTourStep, setActiveTourStep }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}
