import { Power, X, AlertTriangle } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function LogoutModal({ isOpen, onConfirm, onCancel, isLoading = false }: LogoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal Container */}
      <div className="relative bg-[#0a0a0a] border border-red-500/40 text-[#F8F8FF] w-full max-w-sm shadow-[0_0_40px_rgba(239,68,68,0.15)] font-mono">
        {/* Top accent line */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
        
        {/* Close Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="absolute top-4 right-3 text-gray-500 hover:text-white transition-colors p-2 z-20"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        
        {/* Content */}
        <div className="px-6 py-8 relative z-10">
          {/* Warning Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 border border-red-500/50 bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
          </div>
          
          {/* Title */}
          <h2 className="text-base font-bold text-white text-center mb-3 uppercase tracking-widest">
            End Session?
          </h2>
          
          {/* Message */}
          <p className="text-gray-400 text-sm text-center leading-relaxed">
            You will be signed out of your account.
          </p>
        </div>
        
        {/* Actions */}
        <div className="px-6 pb-6 relative z-10">
          <div className="flex gap-3">
            {/* Cancel Button */}
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm font-mono text-gray-300 bg-transparent border border-gray-600 hover:border-gray-400 hover:text-white transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            
            {/* Confirm Button */}
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm font-mono text-white bg-red-600 border border-red-500 hover:bg-red-500 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <Power className="w-4 h-4" />
                  <span>Sign Out</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Bottom accent line */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
      </div>
    </div>
  );
}
