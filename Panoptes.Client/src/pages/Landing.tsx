import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AnimatePresence, motion } from 'framer-motion';
import Lenis from 'lenis';

// --- COMPONENTS ---
import { GlitchButton } from '../components/GlitchButton';
import { MaskText } from '../components/MaskText';
import { ScrambleText } from '../components/ScrambleText';
import { AnimatedGrid } from '../components/AnimatedGrid';
import { VolumeControl } from '../components/VolumeControl';
import { BentoGrid } from './landing/sections/BentoGrid';
import { LoginModal } from '../components/LoginModal'; 
import { IntegrationPipeline } from './landing/sections/IntegrationPipeline';
import { FloatingBar } from './landing/header/FloatingBar';
import { DeploymentModules } from './landing/sections/DeploymentModules';
import { PricingSection } from './landing/sections/PricingSection';
import { SystemTelemetry } from './landing/sections/SystemTelemetry';
import { Footer } from './landing/components/Footer';
import { AudioProvider } from './landing/context/VolumeContext';

function Landing() {
  const [loading, setLoading] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const logoRef = useRef<HTMLImageElement | null>(null);

  // 1. Boot Sequence
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => {
      setLoading(false);
      document.body.style.overflow = 'unset';
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // 2. Smooth Scroll (Lenis)
  useEffect(() => {
    if (loading) return; 

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    return () => {
      lenis.destroy();
    };
  }, [loading]);

  // 3. GSAP Logo Animation
  useEffect(() => {
    if (loading) return; 
    
    gsap.registerPlugin(ScrollTrigger);
    const logo = logoRef.current;
    
    const ctx = gsap.context(() => {
      if (logo) {
        gsap.set(logo, { clearProps: "all" });
        gsap.set(logo, { transformOrigin: '50% 50%' });
        
        gsap.to(logo, {
          rotate: 360,
          ease: 'none',
          scrollTrigger: {
            trigger: logo,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });
      }
    });

    return () => ctx.revert();
  }, [loading]);

  return (
    <AudioProvider src="/sounds/ambient.mp3" shouldStart={!loading}>
      <div className="relative min-h-screen w-full bg-[#000000] text-ghost overflow-hidden">
        
        {/* 1. GLOBAL OVERLAYS (Z-50+) */}
        <FloatingBar onOpenLogin={() => setIsLoginOpen(true)} />
        <AnimatePresence>
          {isLoginOpen && (
            <LoginModal 
              isOpen={isLoginOpen} 
              onClose={() => setIsLoginOpen(false)} 
            />
          )}
        </AnimatePresence>

        {/* 2. MAIN CONTENT CURTAIN (Z-10) */}
        {/* FIX: Removed 'mb-[800px]' to fix the huge gap at bottom */}
        <div className="relative w-full bg-[#000000] shadow-[0_50px_100px_rgba(0,0,0,1)]">
          
          {/* --- GRID BACKGROUND --- */}
          <div className="absolute top-0 left-0 right-0 h-[180vh] z-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <AnimatedGrid />
            <div className="absolute inset-0 bg-gradient-to-br from-sentinel/10 via-[#012b15]/80 to-black opacity-90 mix-blend-multiply" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#000000] to-transparent" />
          </div>

          {/* --- SCROLLABLE CONTENT --- */}
          <div className="relative z-10 mx-auto min-h-screen w-full max-w-[1600px] overflow-hidden"> 
            
            <div className="relative flex min-h-screen flex-col">
              
              {/* === STATIC HEADER === */}
              {!loading && (
                <header className="flex items-start justify-between px-6 py-6 lg:px-8">
                  <div className="flex items-center gap-2">
                    <img 
                        src="/logo_panoptes.svg" 
                        alt="Panoptes Logo - Realtime Blockchain Indexer" 
                        className="w-[48px] h-[48px] opacity-80" 
                    />
                    <ScrambleText
                      text="PANOPTES"
                      className="hidden lg:block font-michroma text-sm tracking-[0.25em] text-ghost max-w-[100px]"
                      delay={0} 
                      margin='0px'
                    />
                  </div>

                  <nav className="hidden items-center gap-64 md:flex" aria-label="Primary Navigation">
                    <div className="flex flex-col gap-2 items-start">
                      <GlitchButton label="Features" href="#features" className="text-[10px]" maskText maskDelay={0.3} />
                      <GlitchButton label="Pricing" href="#pricing" className="text-[10px]" maskText maskDelay={0.4} />
                    </div>
                    <div className="flex flex-col gap-2 items-start">
                      <GlitchButton label="Docs" href="#docs" className="text-[10px]" maskText maskDelay={0.5} />
                      <GlitchButton label="Contribute" href="#contribute" className="text-[10px]" maskText maskDelay={0.6} />
                    </div>
                  </nav>

                  <div className="flex items-center gap-4">
                      <VolumeControl /> 
                      <div onClick={() => setIsLoginOpen(true)}>
                        <GlitchButton
                          label="Login"
                          variant="primary"
                          className="text-xs cursor-pointer"
                          maskText
                          maskDelay={0.5}
                        />
                      </div>
                  </div>
                </header>
              )}

              {/* === HERO CONTENT === */}
              <main className="flex flex-1 flex-col justify-center px-6 pb-16 lg:px-8">
                <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-between">
                  
                  {/* --- LOGO / REACTOR CORE --- */}
                  <div className="relative flex w-full max-w-2xl items-center justify-center mx-auto">
                    <div className="relative aspect-square w-[42vw] max-w-[520px] flex flex-col items-center justify-center">
                      
                      <AnimatePresence>
                        {loading && (
                          <motion.div
                            className="absolute inset-0 z-0 m-auto h-[120%] w-[120%] rounded-full border border-dashed border-sentinel/30"
                            initial={{ rotate: 0, opacity: 0, scale: 0.8 }}
                            animate={{ rotate: 360, opacity: 1, scale: 1 }}
                            exit={{ scale: 1.5, opacity: 0, transition: { duration: 0.8, ease: "circOut" }}}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                          />
                        )}
                      </AnimatePresence>

                      <motion.img
                        ref={logoRef}
                        src="/logo_3d.png"
                        alt="Panoptes 3D Core Visualization"
                        className="relative z-10 object-contain mix-blend-screen" 
                        animate={loading ? { rotate: 360 } : { rotate: 0 }}
                        transition={loading 
                          ? { duration: 2, repeat: Infinity, ease: "linear" } 
                          : { duration: 0.5, ease: "circOut" }
                        }
                      />

                      <AnimatePresence>
                        {loading && (
                          <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                            className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-xs tracking-[0.3em] text-sentinel"
                          >
                          </motion.p>
                        )}
                      </AnimatePresence>

                    </div>
                  </div>
                </div>

                {/* --- HERO TEXT SECTION --- */}
                  {!loading && (
                    <div className="mt-8 md:mt-14 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 lg:items-end">
                      
                      {/* LEFT COLUMN: BRANDING */}
                      <div className="flex flex-col space-y-2 md:space-y-4 text-left">
                        <h1>
                          <ScrambleText
                            text="PANOPTES"
                            // Mobile: 4xl (compact), Tablet: 6xl, Desktop: 7xl
                            className="block font-michroma text-4xl sm:text-6xl lg:text-7xl text-ghost leading-none"
                            delay={0.2}
                            speed={50}
                          />
                        </h1>
                        <MaskText
                          text="Cardano Webhook Service."
                          // Mobile: 10px, Desktop: xs
                          className="block font-terminal text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.35em] text-ghost-muted"
                          margin="0px"
                          delay={0.1}
                          as="h2"
                        />
                      </div>

                      {/* RIGHT COLUMN: DESCRIPTION */}
                      <div className="flex flex-col space-y-2 md:space-y-3 text-left">
                        <ScrambleText
                          text="Scroll Down"
                          className="block font-terminal text-[10px] uppercase tracking-[0.35em] text-ghost-muted mb-2"
                          delay={0.3}
                        />
                        
                        <MaskText
                            text="Reactive Webhooks for Cardano."
                            // Mobile: 2xl, Tablet: 3xl, Desktop: 5xl
                            className="block font-sans text-2xl sm:text-3xl lg:text-5xl leading-[1.1] text-ghost"
                            delay={0.4}
                            as="p"
                        />
                        
                        <MaskText
                          text="Bridge the gap between blockchain and backend."
                          // Mobile: lg (readable), Desktop: 3xl
                          className="block font-sans text-lg sm:text-2xl lg:text-4xl leading-[1.2] text-ghost-muted"
                          delay={0.5}
                          as="p"
                        />
                      </div>
                    </div>
                  )}
              </main>
            </div>

            {/* === CONTENT SECTIONS === */}
            <section aria-label="Live Metrics">
                <BentoGrid />
            </section>
            
            <section aria-label="Integration Process">
                <IntegrationPipeline />
            </section>

            <section aria-label="Deployment Modules">
                <DeploymentModules />
            </section>

            <section aria-label="Pricing Plans">
                <PricingSection />
            </section>

            <section aria-label="System Telemetry">
                <SystemTelemetry />
            </section>
            
            {/* FIX: Removed the empty spacer div (h-12) here */}

          </div>
          
          {/* Footer inside the main wrapper */}
          <Footer />
        </div>
      </div>
    </AudioProvider>
  );
}

export default Landing;