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
      {/* Backdrop  */}
      <div 
        className="fixed inset-0 bg-[#050505] bg-opacity-85 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[#050505] border border-[#006A33] text-[#F8F8FF] w-full max-w-lg transform transition-all shadow-[0_0_20px_rgba(0,106,51,0.3)] font-mono overflow-hidden">
          {/* Grid Background Effect */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#006A33 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#006A33]/30 relative z-10">
            <div>
              <h3 className="text-[#006A33] text-xs tracking-widest uppercase font-bold">
                ADVANCED_CONFIG // {subscriptionName.toUpperCase()}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-[#006A33] hover:text-white transition-colors p-1"
              title="Close"
            >
              <span className="sr-only">Close</span>
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5 relative z-10">
            {/* Delivery Behavior Section */}
            <div className="space-y-3">
              <h4 className="text-[#006A33] text-xs font-bold uppercase tracking-widest border-b border-[#006A33]/30 pb-2">
                // DELIVERY_BEHAVIOR
              </h4>
              
              {/* Latest Only Toggle */}
              <div className="p-4 bg-[#006A33]/10 border border-[#006A33]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-bold uppercase tracking-wide cursor-pointer">
                      Latest_Event_Only
                    </label>
                    <p className="text-xs opacity-70 mt-1">
                      When resuming from pause, only the most recent event will be delivered. 
                      All queued events will be discarded.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={deliverLatestOnly}
                    onClick={() => onDeliverLatestOnlyChange(!deliverLatestOnly)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#006A33] focus:ring-offset-2 focus:ring-offset-[#050505] ${
                      deliverLatestOnly ? 'bg-[#006A33] border-[#006A33]' : 'bg-transparent border-[#006A33]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform border border-[#006A33] bg-[#050505] shadow-[0_0_10px_rgba(0,106,51,0.5)] transition duration-200 ease-in-out ${
                        deliverLatestOnly ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Placeholder for future options */}
            <div className="border-t border-[#006A33]/30 pt-4">
              <p className="text-xs opacity-50 italic tracking-wide">
                &gt; More advanced protocols coming soon...
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#006A33]/30 relative z-10">
            <button
              onClick={onClose}
              className="w-full px-6 py-2 text-xs font-bold bg-[#006A33] text-white hover:bg-[#008040] transition-all uppercase tracking-wider shadow-[0_0_10px_rgba(0,106,51,0.5)]"
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
