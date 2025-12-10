import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Nav } from './Nav';
import { ScrambleText } from '../ScrambleText';
import { VolumeControl } from '../VolumeControl';

export function Header({ loading }: { loading: boolean }) {
  const [isActive, setIsActive] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[110] flex items-center justify-between px-6 py-6 lg:px-12 pointer-events-none">
        
        {/* LEFT: LOGO (Always Visible) */}
        <div className="pointer-events-auto flex items-center gap-4">
          <img src="/logo_panoptes.svg" alt="Panoptes Logo" className="h-10 w-10 opacity-90" />
          <ScrambleText
             text="PANOPTES"
             className="hidden md:block font-michroma text-xs tracking-[0.25em] text-ghost"
             delay={0}
             margin="0px"
          />
        </div>

        {/* RIGHT: CONTROLS & MENU BUTTON */}
        <div className="pointer-events-auto flex items-center gap-6">
           {/* Volume Control (Hide on mobile if space is tight) */}
           <div className="hidden md:block">
              <VolumeControl src="/ambient.mp3" shouldStart={!loading} />
           </div>

           {/* THE HAMBURGER BUTTON */}
           <button 
             onClick={() => setIsActive(!isActive)}
             className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-[#050505]/80 backdrop-blur-md border border-white/10 transition-colors hover:bg-sentinel hover:border-sentinel hover:text-black"
           >
             <div className="relative w-5 h-5 flex flex-col justify-center gap-[5px] group-hover:gap-[6px] transition-all">
                {/* Top Line */}
                <motion.span 
                  animate={isActive ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                  className="h-[1px] w-full bg-current origin-center transition-transform duration-300" 
                />
                {/* Middle Line */}
                <motion.span 
                  animate={isActive ? { opacity: 0 } : { opacity: 1 }}
                  className="h-[1px] w-full bg-current transition-opacity duration-300" 
                />
                {/* Bottom Line */}
                <motion.span 
                  animate={isActive ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                  className="h-[1px] w-full bg-current origin-center transition-transform duration-300" 
                />
             </div>
           </button>
        </div>
      </header>

      {/* THE NAVIGATION OVERLAY */}
      <AnimatePresence mode="wait">
        {isActive && <Nav setIsActive={setIsActive} />}
      </AnimatePresence>
    </>
  );
}