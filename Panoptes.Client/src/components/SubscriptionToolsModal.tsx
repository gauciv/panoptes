import React from 'react';

interface SubscriptionToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'csv' | 'json') => void;
  onEdit: () => void;
  onDelete: () => void;
  hasLogs: boolean;
}

const SubscriptionToolsModal: React.FC<SubscriptionToolsModalProps> = ({
  isOpen,
  onClose,
  onExport,
  onEdit,
  onDelete,
  hasLogs,
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
        <div className="relative bg-card border border-primary/50 text-card-foreground max-w-lg w-full transform transition-all shadow-[0_0_20px_rgba(0,106,51,0.2)] overflow-hidden font-mono">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-primary/30 relative z-10">
            <h3 className="text-primary dark:text-white text-xs tracking-widest uppercase font-bold">
              SUBSCRIPTION_TOOLS // CONFIG
            </h3>
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
            {/* Export Section */}
            <div className="space-y-3">
              <h4 className="text-primary dark:text-white text-xs font-bold uppercase tracking-widest border-b border-primary/30 pb-2">
                // EXPORT_DATA
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    onExport('csv');
                    onClose();
                  }}
                  disabled={!hasLogs}
                  className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/50 hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                  <div className="flex-shrink-0 w-8 h-8 border border-primary/50 flex items-center justify-center group-hover:border-white/50 transition-colors">
                    <svg className="w-4 h-4 text-primary dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide">CSV</p>
                </button>
                <button
                  onClick={() => {
                    onExport('json');
                    onClose();
                  }}
                  disabled={!hasLogs}
                  className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/50 hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                  <div className="flex-shrink-0 w-8 h-8 border border-primary/50 flex items-center justify-center group-hover:border-white/50 transition-colors">
                    <svg className="w-4 h-4 text-primary dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide">JSON</p>
                </button>
              </div>
            </div>

            {/* Management Section */}
            <div className="space-y-3">
              <h4 className="text-primary dark:text-white text-xs font-bold uppercase tracking-widest border-b border-primary/30 pb-2">
                // MANAGEMENT_CONTROLS
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    onEdit();
                    onClose();
                  }}
                  className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/50 hover:bg-primary hover:text-white hover:border-primary transition-all group"
                >
                  <div className="flex-shrink-0 w-8 h-8 border border-primary/50 flex items-center justify-center group-hover:border-white/50 transition-colors">
                    <svg className="w-4 h-4 text-primary dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide">Edit</p>
                </button>
                <button
                  onClick={() => {
                    onDelete();
                    onClose();
                  }}
                  className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-600/50 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all group"
                >
                  <div className="flex-shrink-0 w-8 h-8 border border-red-600/50 flex items-center justify-center group-hover:border-white/50 transition-colors">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide text-red-500 group-hover:text-white">Delete</p>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-primary/30 relative z-10">
            <button
              onClick={onClose}
              className="w-full px-6 py-2 text-xs font-bold bg-primary text-white hover:bg-primary/80 transition-all uppercase tracking-wider shadow-[0_0_10px_rgba(0,106,51,0.5)]"
            >
              Close_Menu &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionToolsModal;
