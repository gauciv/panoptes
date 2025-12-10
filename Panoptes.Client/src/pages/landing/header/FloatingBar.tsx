import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VolumeControl } from '@/components/VolumeControl';
import { GlitchButton } from '@/components/GlitchButton';
import { Menu } from './Menu';

// 1. Accept the onOpenLogin prop
export function FloatingBar({ onOpenLogin }: { onOpenLogin: () => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      // Show bar after scrolling 80vh (past most of the hero)
      const threshold = window.innerHeight * 0.8;
      if (window.scrollY > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
        setIsMenuOpen(false); // Close menu if we scroll back up to hero
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* 1. The Fixed Bar Container */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.4, ease: "circOut" }}
            className="fixed top-0 left-0 right-0 z-[90] flex items-center justify-between px-6 py-4 bg-[#050505]/80 backdrop-blur-md border-b border-white/5"
          >
            {/* Left: Mini Logo */}
            <div className="flex items-center gap-3">
               <img src="/logo_panoptes.svg" alt="Logo" className="h-8 w-8" />
               <span className="font-michroma text-[10px] tracking-widest hidden md:block">PANOPTES</span>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-4">
               {/* Mute Button (Persistent) */}
               <VolumeControl /> 
               
               {/* 2. Login Shortcut (Desktop) - Updated to open Modal */}
               <div className="hidden md:block" onClick={onOpenLogin}>
                  <GlitchButton 
                    label="LOGIN" 
                    variant="ghost" // Changed to ghost for better contrast on bar
                    className="text-[10px] cursor-pointer" 
                  />
               </div>

               {/* Hamburger / Close Toggle */}
               <button
                 onClick={() => setIsMenuOpen(!isMenuOpen)}
                 className="group relative h-8 w-8 flex flex-col items-center justify-center gap-[5px] z-[110]"
               >
                 <motion.span 
                   animate={isMenuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                   className="h-[2px] w-6 bg-ghost group-hover:bg-sentinel transition-colors" 
                 />
                 <motion.span 
                   animate={isMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                   className="h-[2px] w-6 bg-ghost group-hover:bg-sentinel transition-colors" 
                 />
                 <motion.span 
                   animate={isMenuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                   className="h-[2px] w-6 bg-ghost group-hover:bg-sentinel transition-colors" 
                 />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. The Full Screen Menu Overlay */}
      <AnimatePresence>
         {isMenuOpen && (
            <Menu 
               closeMenu={() => setIsMenuOpen(false)} 
               onOpenLogin={onOpenLogin} // 3. Pass the prop down to the Menu
            />
         )}
      </AnimatePresence>
    </>
  );
}