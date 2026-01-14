import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TechCurve } from './TechCurve';
import { GlitchButton } from '@/components/GlitchButton';

const navItems = [
  { title: "Features", href: "#features", external: false },
  { title: "Pricing", href: "#pricing", external: false },
  { title: "Documentation", href: "/docs", external: false },
  { title: "Contribute", href: "https://github.com/We-Are-Triji/panoptes", external: true },
];

const menuVariants = {
  initial: { y: "-110%" },
  enter: { 
    y: "0%", 
    transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } 
  },
  exit: { 
    y: "-110%", 
    transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1], delay: 0.1 } 
  }
};

type MenuProps = {
  closeMenu: () => void;
  onOpenLogin: () => void;
};

export function Menu({ closeMenu, onOpenLogin }: MenuProps) {
  const navigate = useNavigate();
  
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const handleNavClick = (item: typeof navItems[0]) => {
    closeMenu();
    if (item.external) {
      window.open(item.href, '_blank');
    } else if (item.href.startsWith('/')) {
      navigate(item.href);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] h-screen w-screen">
       
       <motion.div 
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0 }}
         onClick={closeMenu}
         className="absolute inset-0 bg-black/80 backdrop-blur-sm"
       />

       <motion.div 
         variants={menuVariants}
         initial="initial"
         animate="enter"
         exit="exit"
         className="relative w-full bg-[#050505] text-ghost pt-24 pb-16 rounded-b-sm border-b border-sentinel/10"
       >
         <TechCurve />

         <div className="container mx-auto px-6 max-w-[1600px] relative z-10">
            <div className="flex flex-col items-center gap-8">
               
               <div className="flex items-center gap-4 opacity-50 mb-4">
                  <div className="h-px w-12 bg-sentinel" />
                  <div className="font-mono text-[10px] text-sentinel tracking-[0.3em]">
                     NAVIGATION_MATRIX
                  </div>
                  <div className="h-px w-12 bg-sentinel" />
               </div>
               
               {navItems.map((item, i) => (
                  <motion.button
                    key={i}
                    onClick={() => handleNavClick(item)}
                    initial={{ opacity: 0, x: -50, filter: "blur(10px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    transition={{ delay: 0.2 + (i * 0.1), duration: 0.5 }}
                    className="relative group text-4xl md:text-6xl font-michroma text-ghost hover:text-white transition-colors"
                  >
                    <span className="absolute -left-8 top-1/2 -translate-y-1/2 text-sm text-sentinel opacity-0 transition-all group-hover:opacity-100 group-hover:-left-10">
                       {item.external ? '↗' : '►'}
                    </span>
                    {item.title}
                  </motion.button>
               ))}
               
               <motion.div 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 transition={{ delay: 0.6 }}
                 className="mt-12 hidden md:block"
               >
                   <div onClick={() => { closeMenu(); onOpenLogin(); }}>
                       <GlitchButton 
                         label="LOGIN / ACCESS" 
                         variant="primary" 
                         maskText 
                         className="cursor-pointer"
                       />
                   </div>
               </motion.div>

            </div>
         </div>
       </motion.div>
    </div>
  );
}