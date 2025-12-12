import { useState, useEffect } from 'react';
import { motion} from 'framer-motion';
import clsx from 'clsx';
import { MaskText } from '@/components/MaskText';

// --- MOCK STATS ---
const stats = [
  { label: "GLOBAL_THROUGHPUT", value: "2.4M", unit: "TX/DAY" },
  { label: "INDEXER_LATENCY", value: "24", unit: "MS" },
  { label: "ACTIVE_WATCHERS", value: "8,042", unit: "NODES" },
  { label: "SYSTEM_UPTIME", value: "99.99", unit: "%" },
];

// --- A SINGLE 'LED' CELL ---
function StatusCell({ active, hover }: { active: boolean, hover: boolean }) {
  return (
    <div 
      className={clsx(
        "w-full h-full rounded-[1px] transition-all duration-300",
        // Visual Logic:
        // 1. Hover = Bright White
        // 2. Active (Random Pulse) = Sentinel Green
        // 3. Idle = Dark Gray
        hover ? "bg-white shadow-[0_0_10px_white] scale-110 z-10" :
        active ? "bg-sentinel/80 shadow-[0_0_5px_rgba(0,255,148,0.5)]" : 
        "bg-[#111]"
      )}
    />
  );
}

export function SystemTelemetry() {
  // Grid Dimensions (Adjust based on density preference)
  const rows = 12;
  const cols = 24; 
  const totalCells = rows * cols;

  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); 
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 1. RANDOM PULSE EFFECT (Simulating data processing)
  useEffect(() => {
    const interval = setInterval(() => {
      // Pick 10-20 random cells to light up
      const count = Math.floor(Math.random() * 10) + 10;
      const newIndices = Array.from({ length: count }, () => Math.floor(Math.random() * totalCells));
      setActiveIndices(newIndices);
    }, 200); // Fast tick speed for "busy" feel

    return () => clearInterval(interval);
  }, [totalCells]);

  return (
    <section className="relative w-full py-32 bg-black overflow-hidden flex flex-col items-center justify-center border-t border-white/5">
      
      {/* 1. BACKGROUND GRID MESH */}
      <div 
        className="relative z-0 grid gap-1 w-full max-w-[1200px] px-6 opacity-30 select-none pointer-events-auto"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {Array.from({ length: totalCells }).map((_, i) => (
          <div 
            key={i} 
            className="aspect-square"
            onMouseEnter={() => setHoverIndex(i)}
          >
            <StatusCell 
                active={activeIndices.includes(i)} 
                hover={hoverIndex === i}
            />
          </div>
        ))}
        
        {/* Vignette Overlay to fade edges */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] pointer-events-none" />
      </div>

      {/* 2. FOREGROUND CONTENT (HUD) */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
         
         <div className="text-center mb-12">
            <MaskText 
               text="SYSTEM_TELEMETRY" 
               className="font-mono text-xs text-sentinel tracking-[0.5em] mb-4 block"
            />
            <h2 className="font-michroma text-4xl md:text-6xl text-green">
               GLOBAL NETWORK STATUS
            </h2>
         </div>

         {/* Stats Row */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 mb-12 text-center">
            {stats.map((stat, i) => (
               <motion.div 
                 key={i}
                 initial={isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 transition={{ delay: isMobile ? 0 : i * 0.1 }}
                 className="flex flex-col items-center"
               >
                  <div className="font-michroma text-3xl md:text-4xl text-white mb-2">
                     {stat.value}
                  </div>
                  <div className="font-mono text-[10px] text-ghost/50 tracking-widest uppercase">
                     {stat.label} <span className="text-sentinel">[{stat.unit}]</span>
                  </div>
               </motion.div>
            ))}
         </div>
      </div>
    </section>
  );
}