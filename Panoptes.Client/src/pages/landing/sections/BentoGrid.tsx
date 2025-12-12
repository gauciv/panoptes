import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { 
  Zap, 
  ShieldCheck, 
  Activity, 
  Cpu, 
  Terminal, 
  ArrowDownRight 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer, 
  Tooltip, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  Radar 
} from 'recharts';
import { ScrambleText } from '@/components/ScrambleText';

// --- MOCK CHART DATA ---
const latencyData = [
  { time: '10:00', ms: 24 }, { time: '10:05', ms: 28 },
  { time: '10:10', ms: 22 }, { time: '10:15', ms: 35 },
  { time: '10:20', ms: 20 }, { time: '10:25', ms: 24 },
  { time: '10:30', ms: 18 }, { time: '10:35', ms: 24 },
];

const distributionData = [
  { subject: 'SWAP', A: 120, fullMark: 150 },
  { subject: 'MINT', A: 98, fullMark: 150 },
  { subject: 'BURN', A: 86, fullMark: 150 },
  { subject: 'META', A: 99, fullMark: 150 },
  { subject: 'VOTE', A: 85, fullMark: 150 },
  { subject: 'POOL', A: 65, fullMark: 150 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="border border-white/10 bg-[#050505] p-2 px-3 shadow-xl backdrop-blur-md">
        <p className="font-mono text-[10px] text-ghost/70">{label}</p>
        <p className="font-mono text-xs text-sentinel">{payload[0].value}ms</p>
      </div>
    );
  }
  return null;
};

// --- SUB-COMPONENT: ACTIVE REDUCERS LIST (Self-Updating) ---
function ActiveReducersList() {
  const [reducers, setReducers] = useState([
    { id: '01', name: 'SwapExecuted', status: 'LISTENING', count: 8420 },
    { id: '02', name: 'NftMinted', status: 'LISTENING', count: 1205 },
    { id: '03', name: 'LimitOrder', status: 'PROCESSING', count: 340 },
    { id: '04', name: 'GovVote', status: 'IDLE', count: 0 },
    { id: '05', name: 'StakeReg', status: 'IDLE', count: 45 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setReducers(prev => prev.map(r => {
        if (r.status === 'IDLE') return r;
        return { ...r, count: r.count + Math.floor(Math.random() * 3) };
      }));
    }, 200); 

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-2 flex flex-col gap-1 font-mono text-xs">
      {reducers.map((item, i) => (
        <div key={i} className="group/item flex items-center justify-between rounded p-2 transition-colors hover:bg-white/5">
          <span className="flex items-center gap-3 text-ghost/60 group-hover/item:text-ghost">
            <span className="text-[10px] text-ghost/20">{item.id}</span>
            {item.name}
          </span>
          <div className="flex items-center gap-3">
             <span className="font-mono text-[10px] text-ghost/40">
                {item.count.toLocaleString()}
             </span>
             <span className={clsx(
                "w-16 text-right text-[10px] font-bold tracking-wider",
                item.status === 'PROCESSING' ? "text-blue-400 animate-pulse" :
                item.status === 'LISTENING' ? "text-sentinel" : 
                "text-yellow-500/50"
             )}>
                {item.status}
             </span>
          </div>
        </div>
      ))}
    </div>
  );
}


// define a stable structure for your logs
type LogEntry = {
  id: string;
  text: string;
  type: 'info' | 'block' | 'match';
};

export function LiveChainFeed() {
  // Use a ref to generate truly unique keys (counters are safer than random numbers)
  const uniqueIdCounter = useRef(0);
  const blockRef = useRef(10294001);

  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'init-1', text: "// INITIALIZING CONNECTION...", type: 'info' },
    { id: 'init-2', text: "> CONNECTED TO MAINNET NODE (WS)", type: 'info' },
    { id: 'init-3', text: "> SYNCING MEMPOOL...", type: 'info' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const isBlock = Math.random() > 0.7; 
      
      // Generate a stable unique ID for this specific log entry
      uniqueIdCounter.current += 1;
      const newId = `log-${uniqueIdCounter.current}`;
      
      let newEntry: LogEntry;

      if (isBlock) {
        blockRef.current++;
        newEntry = {
            id: newId,
            text: `⚡ BLOCK #${blockRef.current.toLocaleString()} FINALIZED`,
            type: 'block'
        };
      } else {
        const txHash = Math.random().toString(36).substring(7).toUpperCase();
        newEntry = {
            id: newId,
            text: `> TX DETECTED: ${txHash}... [MATCH]`,
            type: 'match'
        };
      }

      setLogs(prev => {
        const updatedLogs = [...prev, newEntry];
        if (updatedLogs.length > 7) {
            return updatedLogs.slice(updatedLogs.length - 7);
        }
        return updatedLogs;
      });
    }, 800); 

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-2 font-mono text-[10px] overflow-hidden h-full">
        <div className="border-b border-white/5 pb-2 text-ghost/30">
            // LIVE EVENT STREAM
        </div>
        
        <div className="flex flex-col gap-1.5 min-h-[140px] justify-end relative">
            {/* mode='popLayout' prevents the exiting item from breaking the layout flow */}
            <AnimatePresence mode='popLayout'>
                {logs.map((log) => (
                    <motion.div
                        key={log.id} // CRITICAL: Use the stable ID, NOT the index
                        layout // Automatically animates the slide-up movement
                        initial={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, x: 20, filter: "blur(4px)" }}
                        transition={{ duration: 0.4, ease: "circOut" }}
                        className={clsx(
                            "truncate w-full",
                            log.type === 'block' ? "text-sentinel" : 
                            log.type === 'match' ? "text-white font-bold" : 
                            "text-ghost/60"
                        )}
                    >
                        {log.text}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    </div>
  );
}
// --- MAIN CARD SHELL (CRT EFFECT) ---
function BentoCard({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  // 1. Detect Mobile State
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); // Check on mount
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <motion.div
      // 2. Conditionally apply animations
      initial={isMobile ? "open" : "closed"}
      whileInView="open"
      viewport={{ once: true, margin: "-10%" }}
      variants={{
        closed: {
          opacity: 0,
          scaleX: 0.1,
          scaleY: 0.005,
          filter: "brightness(3) contrast(2)",
          y: 50,
        },
        open: {
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
          y: 0,
          filter: "brightness(1) contrast(1)",
          transition: {
            duration: 0.6,
            delay: isMobile ? 0 : delay, // No delay on mobile
            scaleX: { duration: 0.2, ease: "easeOut" }, 
            scaleY: { duration: 0.4, delay: isMobile ? 0 : delay + 0.15, ease: "circOut" },
            filter: { duration: 0.5, delay: isMobile ? 0 : delay + 0.2 },
            opacity: { duration: 0.1 },
          }
        }
      }}
      className={clsx(
        "group relative overflow-hidden rounded-sm border border-white/5 bg-[#050505]/60 p-6 backdrop-blur-md transition-colors hover:border-sentinel/30",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,6px_100%] opacity-20" />
      <div className="relative z-10 flex h-full flex-col">
        {children}
      </div>
    </motion.div>
  );
}
// --- HEADER ---
function CardHeader({ title, icon: Icon, delay }: { title: string; icon: any; delay: number }) {
  return (
    <div className="mb-4 flex items-center gap-3 border-b border-white/5 pb-3">
      <div className="flex h-6 w-6 items-center justify-center rounded bg-white/5 text-sentinel">
        <Icon size={14} strokeWidth={2} />
      </div>
      <ScrambleText 
        text={title} 
        className="font-mono text-[10px] uppercase tracking-[0.2em] text-ghost/70"
        delay={delay + 0.5} 
        speed={50}
      />
    </div>
  );
}

// --- MAIN GRID COMPONENT ---
export function BentoGrid() {
  return (
    <section className="relative w-full px-6 py-24">
      <div className="mx-auto max-w-[1600px]">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:grid-rows-2">

          {/* Card 1: Trigger Latency */}
          <BentoCard className="min-h-[300px] lg:col-span-2" delay={0.0}>
            <CardHeader title="TRIGGER_LATENCY" icon={Zap} delay={0.0} />
            <div className="flex h-full flex-col justify-between">
               <div className="flex items-baseline gap-4">
                  <span className="font-michroma text-5xl text-ghost">24ms</span>
                  <div className="flex items-center gap-1 rounded bg-sentinel/10 px-2 py-1 font-mono text-[10px] text-sentinel">
                    <ArrowDownRight size={12} />
                    <span>12% vs POLLING</span>
                  </div>
               </div>
               <div className="mt-4 h-40 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={latencyData}>
                     <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#FFFFFF20' }} />
                     <Line type="monotone" dataKey="ms" stroke="#00FF94" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#00FF94' }} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </BentoCard>

          {/* Card 2: Active Reducers (NOW DYNAMIC) */}
          <BentoCard className="min-h-[300px] lg:col-span-1" delay={0.1}>
            <CardHeader title="ACTIVE_REDUCERS" icon={ShieldCheck} delay={0.1} />
            <ActiveReducersList />
          </BentoCard>

          {/* Card 3: Distribution */}
          <BentoCard className="min-h-[280px] lg:col-span-1" delay={0.2}>
             <CardHeader title="EVENT_DISTRIBUTION" icon={Activity} delay={0.2} />
             <div className="relative flex flex-1 items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={distributionData}>
                    <PolarGrid stroke="#FFFFFF10" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#FFFFFF40', fontSize: 10, fontFamily: 'monospace' }} />
                    <Radar name="Events" dataKey="A" stroke="#00FF94" strokeWidth={2} fill="#00FF94" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
             </div>
          </BentoCard>

          {/* Card 4: Health */}
          <BentoCard className="min-h-[280px] lg:col-span-1" delay={0.3}>
             <CardHeader title="SYSTEM_HEALTH" icon={Cpu} delay={0.3} />
             <div className="flex flex-1 flex-col items-center justify-center gap-4">
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/5 border-t-sentinel rotate-[135deg] shadow-[0_0_20px_rgba(0,255,148,0.1)]">
                    <div className="absolute inset-0 rounded-full border-4 border-white/5 border-r-sentinel rotate-90 opacity-40" />
                </div>
                <div className="absolute text-center mt-8">
                   <span className="block font-michroma text-3xl text-ghost">99.9%</span>
                   <span className="font-mono text-[10px] text-ghost/40">UPTIME SCORE</span>
                </div>
             </div>
          </BentoCard>

          {/* Card 5: Live Feed (NOW DYNAMIC) */}
          <BentoCard className="min-h-[280px] lg:col-span-1" delay={0.4}>
             <CardHeader title="CHAIN_FEED" icon={Terminal} delay={0.4} />
             <LiveChainFeed />
          </BentoCard>

        </div>
      </div>
    </section>
  );
}