import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Crosshair, Database, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { MaskText } from '@/components/MaskText';

// --- CONFIGURATION ---
const modules = [
  {
    id: 'MOD_01',
    title: 'PAYMENT_OPS',
    subtitle: 'E-Commerce & Exchanges',
    icon: Crosshair,
    desc: 'Monitor thousands of deposit addresses simultaneously. Trigger order fulfillment or balance updates immediately upon block confirmation. Eliminate database polling overhead.',
    status: 'ACTIVE',
    color: 'text-sentinel',
    border: 'group-hover:border-sentinel/50',
    bg: 'group-hover:bg-sentinel/5',
    path: "M0 80 L20 75 L40 80 L60 50 L80 60 L100 20 L120 40 L140 30 L160 50 L180 10 L200 40"
  },
  {
    id: 'MOD_02',
    title: 'LIVE_UX_FEED',
    subtitle: 'DApp Frontend Sync',
    icon: Database,
    desc: "Push transaction finality events directly to your client interface. Update user balances and NFT inventories in real-time. Banish the 'Refresh Page' button from your DApp.",
    status: 'ACTIVE',
    color: 'text-blue-400',
    border: 'group-hover:border-blue-400/50',
    bg: 'group-hover:bg-blue-400/5',
    path: "M20 20 L180 20 L180 40 L20 40 Z M20 50 L180 50 L180 70 L20 70 Z M20 80 L180 80 L180 100 L20 100 Z"
  },
  {
    id: 'MOD_03',
    title: 'ASSET_SCOPE',
    subtitle: 'NFT & Token Indexing',
    icon: ShieldAlert,
    desc: 'Filter the entire blockchain for specific Policy IDs. Index mints, burns, and transfers for your collection or marketplace without running a full node. Ingest only relevant noise.',
    status: 'STANDBY',
    color: 'text-red-400',
    border: 'group-hover:border-red-400/50',
    bg: 'group-hover:bg-red-400/5',
    path: "M100 10 L180 40 V90 C180 140 100 190 100 190 C100 190 20 140 20 90 V40 Z"
  }
];

// --- INDIVIDUAL MODULE CARD ---
function ModuleCard({ item, index }: { item: typeof modules[0], index: number }) {
  // Stagger delay based on index
  const delay = index * 0.1;

  return (
    <motion.div
       initial="closed"
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
            duration: 0.3,
            delay: delay,
            scaleX: { duration: 0.2, ease: "easeOut" }, 
            scaleY: { duration: 0.2, delay: delay + 0.15, ease: "circOut" },
            filter: { duration: 0.5, delay: delay + 0.2 },
            opacity: { duration: 0.1 },
          }
        }
      }}
      className={clsx(
        "group relative flex flex-col justify-between overflow-hidden rounded-sm border border-white/10 bg-[#050505] p-8 transition-all duration-500 hover:-translate-y-2",
        item.border
      )}
    >
      {/* 1. CRT SCANLINE OVERLAY (From BentoGrid) */}
      <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,6px_100%] opacity-20" />

      {/* 2. BACKGROUND HOLOGRAPHIC ANIMATION */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-20 z-0">
         <svg className="h-full w-full" preserveAspectRatio="none">
            <motion.path
               d={item.path}
               fill="none"
               stroke="currentColor"
               strokeWidth="2"
               className={item.color}
               initial={{ pathLength: 0 }}
               whileInView={{ pathLength: 1 }} // animate when visible
               transition={{ duration: 1.5, ease: "easeInOut", delay: delay + 0.5 }}
            />
         </svg>
         {/* Grid overlay */}
         <div className={clsx("absolute inset-0 bg-[radial-gradient(circle_at_center,currentColor_1px,transparent_1px)] bg-[length:10px_10px] opacity-20", item.color)} />
      </div>

      {/* 3. HEADER CONTENT */}
      <div className="relative z-10">
         <div className="mb-6 flex items-start justify-between">
            {/* Icon Box */}
            <div className={clsx(
               "flex h-12 w-12 items-center justify-center rounded-sm border bg-[#0A0A0A] transition-colors duration-300",
               "border-white/10 text-ghost/50",
               `group-hover:border-current group-hover:text-current ${item.color}`
            )}>
               <item.icon size={24} />
            </div>
            
            {/* ID Badge */}
            <div className="font-mono text-[10px] text-ghost/30">
               [{item.id}]
            </div>
         </div>

         <h3 className="mb-2 font-michroma text-lg text-ghost group-hover:text-white">
            {item.title}
         </h3>
         <p className="font-mono text-xs text-sentinel/60 mb-4">
            // {item.subtitle}
         </p>
         <p className="font-sans text-sm leading-relaxed text-ghost/60 group-hover:text-ghost/80">
            {item.desc}
         </p>
      </div>

      {/* 4. FOOTER (Status & Action) */}
      <div className="relative z-10 mt-8 flex items-center justify-between border-t border-white/5 pt-4">
         <div className="flex items-center gap-2">
            <div className={clsx("h-1.5 w-1.5 rounded-full animate-pulse", item.color.replace('text-', 'bg-'))} />
            <span className={clsx("font-mono text-[10px]", item.color)}>
               {item.status}
            </span>
         </div>
         
         <div className="flex items-center gap-1 text-[10px] text-ghost/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span>INIT_MODULE</span>
            <ArrowUpRight size={12} />
         </div>
      </div>
    </motion.div>
  );
}

export function DeploymentModules() {
  return (
    <section className="relative w-full px-6 py-24 bg-black/50" id="use-cases">
      <div className="mx-auto max-w-[1600px]">
        
        {/* SECTION HEADER */}
        <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
           <div>
              <MaskText 
                text="OPERATIONAL_CAPABILITIES" 
                className="font-mono text-xs text-sentinel tracking-[0.2em] mb-4 block"
              />
              <MaskText 
                text="DEPLOYMENT SCENARIOS" 
                className="font-michroma text-3xl md:text-5xl text-ghost" 
              />
           </div>
           <p className="max-w-sm font-sans text-sm text-ghost/50 text-right hidden md:block">
              Select a pre-configured architecture pattern to accelerate your integration timeline.
           </p>
        </div>

        {/* MODULES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {modules.map((mod, i) => (
              <ModuleCard key={mod.id} item={mod} index={i} />
           ))}
        </div>

      </div>
    </section>
  );
}