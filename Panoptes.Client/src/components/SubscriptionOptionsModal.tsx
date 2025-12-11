import React from 'react';

interface SubscriptionOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'csv' | 'json') => void;
  onTestWebhook: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deliverLatestOnly: boolean;
  onDeliverLatestOnlyChange: (value: boolean) => void;
  showLatestOnlyToggle: boolean;
  hasLogs: boolean;
}

const SubscriptionOptionsModal: React.FC<SubscriptionOptionsModalProps> = ({
  isOpen,
  onClose,
  onExport,
  onTestWebhook,
  onEdit,
  onDelete,
  deliverLatestOnly,
  onDeliverLatestOnlyChange,
  showLatestOnlyToggle,
  hasLogs,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#050505] bg-opacity-85 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[#050505] border border-[#006A33] text-[#F8F8FF] max-w-lg w-full transform transition-all shadow-[0_0_20px_rgba(0,106,51,0.3)] font-mono overflow-hidden">
          {/* Grid Background Effect */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#006A33 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#006A33]/30 relative z-10">
            <h3 className="text-[#006A33] text-xs tracking-widest uppercase font-bold">
              SUBSCRIPTION_TOOLS // CONFIG
            </h3>
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
            {/* Testing Section */}
            <div className="space-y-3">
              <h4 className="text-[#006A33] text-xs font-bold uppercase tracking-widest border-b border-[#006A33]/30 pb-2">
                // TESTING_PROTOCOLS
              </h4>
              <button
                onClick={() => {
                  onTestWebhook();
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-4 bg-[#006A33]/10 border border-[#006A33] hover:bg-[#006A33] hover:text-white transition-all group"
              >
                <div className="flex-shrink-0 w-10 h-10 border border-[#006A33] flex items-center justify-center group-hover:bg-[#050505] transition-colors">
                  <svg className="w-5 h-5 text-[#006A33] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold uppercase tracking-wide">Test_Webhook</p>
                  <p className="text-xs opacity-70">Simulate event delivery</p>
                </div>
              </button>
            </div>

            {/* Export Section */}
            <div className="space-y-3">
              <h4 className="text-[#006A33] text-xs font-bold uppercase tracking-widest border-b border-[#006A33]/30 pb-2">
                // EXPORT_DATA
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    onExport('csv');
                    onClose();
                  }}
                  disabled={!hasLogs}
                  className="flex items-center gap-2 p-3 bg-[#006A33]/10 border border-[#006A33] hover:bg-[#006A33] hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                  <div className="flex-shrink-0 w-8 h-8 border border-[#006A33] flex items-center justify-center group-hover:bg-[#050505] transition-colors">
                    <svg className="w-4 h-4 text-[#006A33] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-wide">CSV</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onExport('json');
                    onClose();
                  }}
                  disabled={!hasLogs}
                  className="flex items-center gap-2 p-3 bg-[#006A33]/10 border border-[#006A33] hover:bg-[#006A33] hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                  <div className="flex-shrink-0 w-8 h-8 border border-[#006A33] flex items-center justify-center group-hover:bg-[#050505] transition-colors">
                    <svg className="w-4 h-4 text-[#006A33] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-wide">JSON</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Resume Behavior Section (only shown when applicable) */}
            {showLatestOnlyToggle && (
              <div className="space-y-3">
                <h4 className="text-[#006A33] text-xs font-bold uppercase tracking-widest border-b border-[#006A33]/30 pb-2">
                  // RESUME_BEHAVIOR
                </h4>
                <div className="p-4 bg-[#006A33]/10 border border-[#006A33]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <label htmlFor="latest-only-toggle" className="text-sm font-bold uppercase tracking-wide cursor-pointer">
                        Latest_Event_Only
                      </label>
                      <p className="text-xs opacity-70 mt-1">
                        Only deliver the most recent halted event. Queued events will be discarded.
                      </p>
                    </div>
                    <button
                      id="latest-only-toggle"
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
            )}

            {/* Management Section */}
            <div className="space-y-3">
              <h4 className="text-[#006A33] text-xs font-bold uppercase tracking-widest border-b border-[#006A33]/30 pb-2">
                // MANAGEMENT_CONTROLS
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    onEdit();
                    onClose();
                  }}
                  className="flex items-center gap-2 p-3 bg-[#006A33]/10 border border-[#006A33] hover:bg-[#006A33] hover:text-white transition-all group"
                >
                  <div className="flex-shrink-0 w-8 h-8 border border-[#006A33] flex items-center justify-center group-hover:bg-[#050505] transition-colors">
                    <svg className="w-4 h-4 text-[#006A33] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-wide">Edit</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onDelete();
                    onClose();
                  }}
                  className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-600 hover:bg-red-600 hover:text-white transition-all group"
                >
                  <div className="flex-shrink-0 w-8 h-8 border border-red-600 flex items-center justify-center group-hover:bg-[#050505] transition-colors">
                    <svg className="w-4 h-4 text-red-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-wide text-red-600 group-hover:text-white">Delete</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#006A33]/30 relative z-10">
            <button
              onClick={onClose}
              className="w-full px-6 py-2 text-xs font-bold bg-[#006A33] text-white hover:bg-[#008040] transition-all uppercase tracking-wider shadow-[0_0_10px_rgba(0,106,51,0.5)]"
            >
              Close_Menu &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionOptionsModal;
