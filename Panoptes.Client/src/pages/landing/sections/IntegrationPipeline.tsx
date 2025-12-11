import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Terminal, Cpu, Share2, ChevronRight } from 'lucide-react';
import { ScrambleText } from '../../../components/ScrambleText';
import { MaskText } from '../../../components/MaskText';

// --- CONFIGURATION ---
const steps = [
  {
    id: '01',
    title: 'PROVISION_SOURCE',
    icon: Terminal,
    desc: 'Bypass local node synchronization. Connect Panoptes directly to Demeter\'s high-throughput Oura endpoint using your workspace API key.',
    code: `{
  "Ingestion": {
    "Type": "Demeter",
    "Config": {
      "Network": "mainnet",
      "ApiKey": "\${DMTR_API_KEY}",
      "Compression": "Zstd"
    }
  }
}`
  },
  {
    id: '02',
    title: 'REDUCE_IN_CLOUD',
    icon: Cpu,
    desc: 'Deploy your C# logic directly into a Demeter Workspace container. Filter millions of blocks server-side without latency.',
    code: `public class DemeterWatcher : IReducer
{
    public void Reduce(Block block)
    {
        // Logic runs on Demeter infrastructure
        if (block.Tx.HasMetadata(label: 674)) 
        {
            Emit("DemeterEvent", block.Tx);
        }
    }
}`
  },
  {
    id: '03',
    title: 'CLUSTER_DISPATCH',
    icon: Share2,
    desc: 'Route filtered events internally within your Demeter cluster or push to external Webhooks with enterprise-grade reliability.',
    code: `// POST https://svc.demeter.run/events
{
  "source": "demeter-workspace-01",
  "event": "SmartContractTrigger",
  "slot": 4928102,
  "payload": { ... }
}`
  }
];

export function IntegrationPipeline() {
  const [activeStep, setActiveStep] = useState(0);

  // Auto-cycle through steps if user is idle (optional)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 5000); // Switch every 5 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative w-full px-6 py-24" id="features">
      <div className="mx-auto max-w-[1600px]">
        
        {/* Section Header */}
        <div className="mb-16 md:mb-24 flex flex-col">
           <MaskText 
             text="INTEGRATION_PROTOCOL" 
             className="font-mono text-xs text-sentinel tracking-[0.2em] mb-4 block"
           />
           <ScrambleText 
             text="INFRASTRUCTURE AS CODE." 
             className="font-michroma text-3xl md:text-5xl text-ghost" 
             speed={30}
           />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          
          {/* --- LEFT: STEPPER NAVIGATION --- */}
          <div className="flex flex-col gap-2 relative">
             {/* Connecting Line */}
             <div className="absolute left-[27px] top-8 bottom-8 w-[1px] bg-white/10 hidden md:block" />

             {steps.map((step, index) => {
               const isActive = activeStep === index;
               const Icon = step.icon;

               return (
                 <div 
                   key={step.id}
                   onClick={() => setActiveStep(index)}
                   className={clsx(
                     "group relative flex gap-6 p-6 rounded-sm border border-transparent transition-all duration-500 cursor-pointer",
                     isActive ? "bg-white/5 border-sentinel/20" : "hover:bg-white/5 hover:border-white/5"
                   )}
                 >
                    {/* Icon Bubble */}
                    <div className={clsx(
                      "relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border transition-all duration-300",
                      isActive 
                        ? "bg-[#050505] border-sentinel text-sentinel shadow-[0_0_20px_rgba(0,255,148,0.2)]" 
                        : "bg-[#050505] border-white/10 text-ghost/40 group-hover:border-white/30"
                    )}>
                       <Icon size={24} />
                    </div>

                    {/* Text Content */}
                    <div className="flex flex-col justify-center">
                       <div className="flex items-center gap-3 mb-2">
                          <span className={clsx("font-mono text-[10px]", isActive ? "text-sentinel" : "text-ghost/30")}>
                             {step.id}
                          </span>
                          <h3 className={clsx("font-michroma text-sm transition-colors", isActive ? "text-ghost" : "text-ghost/50")}>
                             {step.title}
                          </h3>
                       </div>
                       <p className="font-sans text-sm text-ghost/60 max-w-md leading-relaxed">
                          {step.desc}
                       </p>
                    </div>

                    {/* Active Arrow Indicator */}
                    {isActive && (
                      <motion.div 
                        layoutId="activeArrow" 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sentinel hidden md:block"
                      >
                        <ChevronRight size={20} />
                      </motion.div>
                    )}
                 </div>
               );
             })}
          </div>

          {/* --- RIGHT: HOLOGRAPHIC CODE TERMINAL --- */}
          <div className="relative">
             {/* Glow Effect behind terminal */}
             <div className="absolute -inset-1 bg-gradient-to-r from-sentinel/20 to-blue-500/20 rounded-lg blur-2xl opacity-20" />
             
             <div className="relative rounded-lg border border-white/10 bg-[#0A0A0A] overflow-hidden shadow-2xl">
                {/* Terminal Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
                   <div className="flex gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500/20 border border-red-500/50" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                      <div className="h-3 w-3 rounded-full bg-green-500/20 border border-green-500/50" />
                   </div>
                   <div className="font-mono text-[10px] text-ghost/40">
                      panoptes_config.json
                   </div>
                </div>

                {/* Code Window */}
                <div className="p-6 overflow-x-auto min-h-[300px]">
                   <AnimatePresence mode="wait">
                      <motion.pre
                        key={activeStep}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="font-mono text-sm text-ghost/80 leading-relaxed"
                      >
                         <code>
                            {steps[activeStep].code.split('\n').map((line, i) => (
                               <div key={i} className="table-row">
                                  <span className="table-cell select-none text-ghost/20 text-right pr-4 w-8">{i + 1}</span>
                                  <span className="table-cell">{line}</span>
                               </div>
                            ))}
                         </code>
                      </motion.pre>
                   </AnimatePresence>
                </div>

                {/* Status Bar */}
                <div className="flex items-center gap-4 px-4 py-2 bg-sentinel/5 border-t border-sentinel/10 font-mono text-[10px]">
                   <span className="text-sentinel">● CONNECTED</span>
                   <span className="text-ghost/40">UTF-8</span>
                   <span className="text-ghost/40 ml-auto">Ln {steps[activeStep].code.split('\n').length}, Col 1</span>
                </div>
             </div>
          </div>

        </div>
      </div>
    </section>
  );
}