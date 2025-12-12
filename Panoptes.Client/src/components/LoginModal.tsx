import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { OAuthButtons } from './OAuthButtons';
import { ScrambleText } from './ScrambleText';
import { useAudio } from '@/pages/landing/context/VolumeContext';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const modalVariants = {
  closed: { opacity: 0, scaleX: 0.005, scaleY: 0.005, y: 0, filter: "brightness(5) contrast(2)" },
  open: { 
    opacity: 1, scaleX: 1, scaleY: 1, filter: "brightness(1) contrast(1)",
    transition: { duration: 0.5, scaleX: { duration: 0.2, ease: "easeOut" }, scaleY: { duration: 0.35, delay: 0.2, ease: "circOut" }, filter: { duration: 0.4, delay: 0.25 }, opacity: { duration: 0.1 } }
  },
  exit: { 
    opacity: 0, scaleY: 0.005, scaleX: 0.005, filter: "brightness(5)",
    transition: { duration: 0.4, scaleY: { duration: 0.2, ease: "easeIn" }, scaleX: { duration: 0.2, delay: 0.2, ease: "circIn" }, filter: { duration: 0.1 }, opacity: { duration: 0.3, delay: 0.1 } }
  }
};

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  // New State: Is the form verifying? If so, hide Google buttons.
  const [isVerifying, setIsVerifying] = useState(false);
  const { isPlaying } = useAudio(); 

  useEffect(() => {
    if (isPlaying) {
      const openSfx = new Audio('/sounds/menu_sound.mp3');
      openSfx.volume = 0.3;
      openSfx.play().catch(() => {});
    }
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, isPlaying]);

  const handleClose = () => {
    if (isPlaying) {
      const closeSfx = new Audio('/sounds/menu_sound.mp3');
      closeSfx.volume = 0.3;
      closeSfx.play().catch(() => {});
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
        animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
        onClick={handleClose}
        className="absolute inset-0 bg-black/60 pointer-events-auto"
        aria-hidden="true"
      />

      {/* Modal Container */}
      <motion.div
        variants={modalVariants}
        initial="closed"
        animate="open"
        exit="exit"
        className="pointer-events-auto relative z-10 w-full max-w-[900px] mx-4 overflow-hidden rounded-sm border border-white/10 bg-[#050505] shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="pointer-events-none absolute inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,6px_100%] opacity-20" />

        {/* Close Button */}
        <button 
            onClick={handleClose}
            className="absolute top-4 right-4 z-[60] p-2 text-ghost/50 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-sentinel rounded"
            aria-label="Close Modal"
        >
            <X size={20} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[550px]">
          
          {/* --- LEFT: FORM --- */}
          <div className="relative p-8 md:p-10 flex flex-col justify-center border-r border-white/5">
            <div className="absolute top-4 left-4 font-mono text-[10px] text-ghost/20 select-none">
                [ ESC_TO_ABORT ]
            </div>

            <div className="mt-8 mb-8">
                <ScrambleText 
                    text={isVerifying ? "IDENTITY_CHECK" : (mode === 'signin' ? "SYSTEM_LOGIN" : "NEW_OPERATOR")} 
                    className="block font-michroma text-xl text-ghost" 
                    speed={50}
                />
                <p className="font-mono text-[10px] text-ghost/50 mt-2">
                    {isVerifying 
                        ? "> TWO-FACTOR AUTHENTICATION" 
                        : (mode === 'signin' ? "> ENTER ACCESS CREDENTIALS" : "> INITIALIZE REGISTRATION SEQUENCE")
                    }
                </p>
            </div>

            <div className="flex-1">
                {/* 1. Hide OAuth when verifying */}
                <OAuthButtons isVerifying={isVerifying} />
                
                {/* 2. Hide Divider when verifying */}
                {!isVerifying && (
                    <div className="flex items-center gap-4 my-6">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-[10px] text-ghost/30">OR</span>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>
                )}

                {/* 3. Render Form with Callback */}
                <LoginForm 
                    mode={mode} 
                    setMode={setMode}
                    onVerificationModeChange={setIsVerifying} // Passes state up
                />
            </div>

            {/* 4. Hide "Switch Mode" button when verifying */}
            {!isVerifying && (
                <div className="mt-8 pt-4 border-t border-white/5">
                    <button 
                        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                        className="text-xs font-mono text-ghost/60 hover:text-sentinel transition-colors focus:outline-none"
                    >
                        {mode === 'signin' 
                            ? "> NO_ID? REQUEST_ACCESS" 
                            : "> HAVE_ID? AUTHENTICATE"}
                    </button>
                </div>
            )}
          </div>

          {/* --- RIGHT: VISUAL --- */}
          <div className="relative hidden md:flex flex-col items-center justify-center bg-zinc-900/20">
             <div className="absolute inset-0 opacity-20" 
                  style={{ backgroundImage: 'radial-gradient(circle at center, #00FF94 1px, transparent 1px)', backgroundSize: '30px 30px' }} 
             />
             
             <div className="relative z-10">
                <div className="h-32 w-32 rounded-full border border-sentinel/20 flex items-center justify-center animate-pulse">
                    <img src="/logo_panoptes.svg" alt="Seal" className="h-16 w-16 opacity-80" />
                </div>
             </div>

             <div className="absolute bottom-8 left-0 right-0 text-center">
                 <p className="font-mono text-[9px] text-sentinel/60 animate-pulse">
                    SECURE_CONNECTION_ESTABLISHED
                 </p>
                 <p className="font-mono text-[9px] text-ghost/20 mt-1">
                    ENCRYPTION: AES-256
                 </p>
             </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}