import { motion } from "framer-motion";

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
        y: typeof window !== "undefined" ? window.innerHeight + 50 : 800,
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

export function Confetti() {
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
