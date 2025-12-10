import { motion } from 'framer-motion';
import { Curve } from './TechCurve';
import { ScrambleText } from '../ScrambleText';

const navItems = [
  { title: "Features", href: "#features" },
  { title: "Pricing", href: "#pricing" },
  { title: "Documentation", href: "#docs" },
  { title: "Contribute", href: "#contribute" },
  { title: "Login", href: "/login" },
];

const menuSlide = {
  initial: { x: "calc(100% + 100px)" },
  enter: { x: "0", transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } },
  exit: { x: "calc(100% + 100px)", transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } },
};

const slide = {
  initial: { x: 80 },
  enter: (i: number) => ({
    x: 0,
    transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1], delay: 0.05 * i },
  }),
  exit: (i: number) => ({
    x: 80,
    transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1], delay: 0.05 * i },
  }),
};

const scale = {
  open: { scale: 1, transition: { duration: 0.3 } },
  closed: { scale: 0, transition: { duration: 0.3 } },
};

export function Nav({ setIsActive }: { setIsActive: (b: boolean) => void }) {
  return (
    <motion.div
      variants={menuSlide}
      initial="initial"
      animate="enter"
      exit="exit"
      className="fixed right-0 top-0 z-[100] h-screen w-full md:w-[450px] bg-[#050505] text-ghost"
    >
      <Curve />
      
      <div className="box-border flex h-full flex-col justify-between p-[100px] md:p-24">
        
        {/* LINKS */}
        <div className="flex flex-col gap-3">
          <div className="mb-10 border-b border-white/10 pb-4 text-[10px] text-ghost/40 uppercase tracking-widest font-mono">
             Navigation
          </div>
          {navItems.map((item, index) => (
            <motion.div
              key={index}
              custom={index}
              variants={slide}
              initial="initial"
              animate="enter"
              exit="exit"
              className="relative"
            >
              <a 
                href={item.href} 
                onClick={() => setIsActive(false)}
                className="group block text-4xl md:text-5xl font-michroma text-ghost transition-colors hover:text-sentinel"
              >
                {/* Arrow indicator on hover */}
                <span className="absolute -left-8 top-1/2 -translate-y-1/2 text-xl text-sentinel opacity-0 transition-all group-hover:opacity-100 group-hover:-left-6">
                  &
                </span>
                {item.title}
              </a>
            </motion.div>
          ))}
        </div>

        {/* FOOTER INFO */}
        <motion.div 
            variants={slide} 
            custom={5}
            initial="initial" 
            animate="enter" 
            exit="exit"
            className="flex flex-col gap-4"
        >
             <div className="h-px w-full bg-white/10" />
             <div className="flex justify-between text-xs font-mono text-ghost/50">
                 <div className="flex flex-col gap-2">
                     <span className="text-white">Socials</span>
                     <a href="#" className="hover:text-sentinel">Twitter / X</a>
                     <a href="#" className="hover:text-sentinel">GitHub</a>
                     <a href="#" className="hover:text-sentinel">Discord</a>
                 </div>
                 <div className="flex flex-col gap-2 text-right">
                     <span className="text-white">Status</span>
                     <span className="text-sentinel animate-pulse">● Systems Normal</span>
                     <span>v1.0.4-beta</span>
                 </div>
             </div>
        </motion.div>

      </div>
    </motion.div>
  );
}