import React from 'react';

interface AdvancedOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionName: string;
  deliverLatestOnly: boolean;
  onDeliverLatestOnlyChange: (value: boolean) => void;
}

const AdvancedOptionsModal: React.FC<AdvancedOptionsModalProps> = ({
  isOpen,
  onClose,
  subscriptionName,
  deliverLatestOnly,
  onDeliverLatestOnlyChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 dark:bg-black/80 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-card border border-primary/50 text-card-foreground w-full max-w-lg transform transition-all shadow-[0_0_20px_rgba(0,106,51,0.2)] overflow-hidden font-mono">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-primary/30 relative z-10">
            <div>
              <h3 className="text-primary dark:text-white text-xs tracking-widest uppercase font-bold">
                ADVANCED_CONFIG // {subscriptionName.toUpperCase()}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-primary dark:text-white hover:text-primary/70 dark:hover:text-white/70 transition-colors p-1"
              title="Close"
            >
              <span className="sr-only">Close</span>
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5 relative z-10">
            {/* Delivery Behavior Section */}
            <div className="space-y-3">
              <h4 className="text-primary dark:text-white text-xs font-bold uppercase tracking-widest border-b border-primary/30 pb-2">
                // DELIVERY_BEHAVIOR
              </h4>
              
              {/* Latest Only Toggle */}
              <div className="p-4 bg-primary/10 border border-primary/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-bold uppercase tracking-wide cursor-pointer">
                      Latest_Event_Only
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      When resuming from pause, only the most recent event will be delivered. 
                      All queued events will be discarded.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={deliverLatestOnly}
                    onClick={() => onDeliverLatestOnlyChange(!deliverLatestOnly)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card ${
                      deliverLatestOnly ? 'bg-primary border-primary' : 'bg-transparent border-primary'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform border border-primary bg-card shadow-[0_0_10px_rgba(0,106,51,0.5)] transition duration-200 ease-in-out ${
                        deliverLatestOnly ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Placeholder for future options */}
            <div className="border-t border-primary/30 pt-4">
              <p className="text-xs text-muted-foreground italic tracking-wide">
                &gt; More advanced protocols coming soon...
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-primary/30 relative z-10">
            <button
              onClick={onClose}
              className="w-full px-6 py-2 text-xs font-bold bg-primary text-white hover:bg-primary/80 transition-all uppercase tracking-wider shadow-[0_0_10px_rgba(0,106,51,0.5)]"
            >
              Close_Config &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedOptionsModal;
