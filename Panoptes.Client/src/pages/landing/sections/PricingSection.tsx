import { useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Check, Server, Cloud, Shield, Lock } from 'lucide-react'; 
import { GlitchButton } from '@/components/GlitchButton';
import { MaskText } from '@/components/MaskText';

// --- CONFIGURATION ---
const plans = [
  {
    id: 'TIER_01',
    name: 'LOCAL_HOST',
    price: '$0',
    period: '/forever',
    icon: Server,
    desc: 'Self-hosted Docker container. Complete sovereignty.',
    features: ['Direct Socket Access', 'Unlimited Local Events', 'Community Support'],
    cta: 'PULL_IMAGE',
    highlight: false,
    color: 'text-ghost'
  },
  {
    id: 'TIER_02',
    name: 'CLOUD_UPLINK',
    price: '$49',
    period: '/month',
    icon: Cloud,
    desc: 'Managed Argus Indexer with 99.9% Uptime SLA.',
    features: ['Managed Sentinel Node', '50 Active Watchers', '10ms Latency Guarantee', 'Priority Email Support'],
    cta: 'ESTABLISH_UPLINK',
    highlight: true,
    color: 'text-sentinel'
  },
  {
    id: 'TIER_03',
    name: 'DEDICATED',
    price: 'CUSTOM',
    period: '',
    icon: Shield,
    desc: 'Bare metal throughput for HFT & Enterprise.',
    features: ['Dedicated Bare Metal', 'Unlimited Watchers', 'Private VPC Peering', '24/7 Engineer Access'],
    cta: 'CONTACT_SALES',
    highlight: false,
    color: 'text-blue-400'
  }
];


function PricingRow({ plan, index }: { plan: typeof plans[0], index: number }) {
  const delay = index * 0.15;

  return (
    <motion.div
      initial="closed"
      whileInView="open"
      viewport={{ once: true, margin: "-10%" }}
      variants={{
        closed: { opacity: 0, scaleX: 0.05, scaleY: 0.05, filter: "brightness(3)" },
        open: { 
            opacity: 1, scaleX: 1, scaleY: 1, filter: "brightness(1)",
            transition: { duration: 0.8, delay, scaleX: { duration: 0.4 }, scaleY: { duration: 0.3, delay: delay + 0.3 } } 
        }
      }}
      className={clsx(
        "group relative grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-8 rounded-sm border p-6 lg:p-8 transition-all duration-500",
        plan.highlight ? "border-sentinel/30 bg-sentinel/5 shadow-[0_0_30px_rgba(0,255,148,0.05)]" : "border-white/5 bg-[#050505]"
      )}
    >
        {plan.highlight && (
            <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(90deg,transparent_0%,rgba(0,255,148,0.05)_50%,transparent_100%)] animate-[scan_3s_linear_infinite]" />
        )}
        
        <div className="lg:col-span-4 flex items-start gap-4 z-10">
            <div className={clsx("flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border bg-[#0A0A0A]", plan.highlight ? "border-sentinel text-sentinel" : "border-white/10 text-ghost/50")}>
                <plan.icon size={24} />
            </div>
            <div>
                <h3 className={clsx("font-michroma text-lg", plan.highlight ? "text-white" : "text-ghost")}>{plan.name}</h3>
                <p className="font-sans text-xs text-ghost/50 leading-relaxed max-w-xs">{plan.desc}</p>
            </div>
        </div>

        <div className="lg:col-span-4 z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <Check size={12} className={clsx(plan.highlight ? "text-sentinel" : "text-ghost/30")} />
                        <span className="font-mono text-[10px] text-ghost/70">{feat}</span>
                    </div>
                ))}
            </div>
        </div>

        <div className="lg:col-span-4 flex items-center justify-between lg:justify-end gap-8 z-10">
            <div className="text-right">
                <div className="flex items-baseline justify-end gap-1">
                    <span className={clsx("font-michroma text-2xl", plan.highlight ? "text-white" : "text-ghost")}>{plan.price}</span>
                    <span className="font-mono text-[10px] text-ghost/40">{plan.period}</span>
                </div>
            </div>
            <GlitchButton label={plan.cta} href="#" variant={plan.highlight ? "primary" : "ghost"} className="min-w-[140px]" />
        </div>
    </motion.div>
  );
}

function BillingToggle({ isAnnual, onToggle }: { isAnnual: boolean, onToggle: () => void }) {
    // ... (Keep existing BillingToggle logic) ...
    return (
        <div onClick={onToggle} className="flex items-center gap-4 cursor-pointer group select-none">
            <span className={clsx("font-mono text-xs transition-colors", !isAnnual ? "text-sentinel" : "text-ghost/50")}>MONTHLY</span>
            <div className="relative h-4 w-10 border border-white/20 bg-[#0A0A0A] flex items-center px-0.5">
                <motion.div className="h-2.5 w-4 bg-sentinel shadow-[0_0_10px_rgba(0,255,148,0.5)]" animate={{ x: isAnnual ? 20 : 0 }} />
            </div>
            <span className={clsx("font-mono text-xs transition-colors", isAnnual ? "text-sentinel" : "text-ghost/50")}>ANNUAL</span>
        </div>
    );
}

export function PricingSection({ comingSoon = false }: { comingSoon?: boolean }) {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section className="relative w-full px-6 py-32 border-t border-white/5 bg-black/80" id="pricing">
      <div className="mx-auto max-w-[1600px]">
        
        {/* HEADER AREA */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 relative z-20">
            <div className='flex flex-col items-start'>
                <MaskText text="PROVISIONING_MANIFEST" className="font-mono text-xs text-sentinel tracking-[0.2em] mb-4 block" />
                <MaskText text="SELECT CLEARANCE LEVEL" className="font-michroma text-3xl md:text-5xl text-ghost"/>
            </div>
            
            {!comingSoon && (
                <BillingToggle isAnnual={isAnnual} onToggle={() => setIsAnnual(!isAnnual)} />
            )}
        </div>

        {/* CONTENT AREA */}
        <div className="relative">
            
            {/* 1. ACTUAL CONTENT (Blurred if comingSoon) */}
            <div className={clsx("flex flex-col gap-4 transition-all duration-500", comingSoon && "blur-md opacity-20 pointer-events-none select-none")}>
                {plans.map((plan, i) => (
                    <PricingRow key={plan.id} plan={plan} index={i} />
                ))}
            </div>

            {/* 2. COMING SOON OVERLAY */}
            {comingSoon && (
                <div className="absolute inset-0 z-30 flex items-center justify-center">
                    <div className="relative p-8 border border-sentinel/30 bg-[#050505]/90 backdrop-blur-xl rounded-sm text-center">
                        {/* Animated Border */}
                        <div className="absolute inset-0 border border-sentinel/20 animate-pulse" />
                        
                        <div className="flex justify-center mb-4 text-sentinel">
                            <Lock size={32} />
                        </div>
                        <h3 className="font-michroma text-2xl text-white mb-2">
                            SECTION_LOCKED
                        </h3>
                        <p className="font-mono text-xs text-ghost/60 max-w-xs mx-auto mb-6">
                             PROVISIONING MODULE CURRENTLY OFFLINE.
                            <br/>AWAITING MAINNET DEPLOYMENT.
                        </p>
                        
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-sentinel/10 rounded-full border border-sentinel/20">
                            <div className="h-1.5 w-1.5 bg-sentinel animate-pulse rounded-full" />
                            <span className="font-mono text-[10px] text-sentinel tracking-widest">ETA: Q3 2024</span>
                        </div>
                    </div>
                </div>
            )}

        </div>

      </div>
    </section>
  );
}