import { useState, useEffect, useRef } from 'react';
import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps } from 'react-joyride';

const TOUR_STORAGE_KEY = 'panoptes_onboarding_completed';

interface OnboardingTourProps {
  enabled?: boolean;
  onFinish?: () => void;
}

function CustomTooltip({
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep,
}: TooltipRenderProps) {
  return (
    <div
      {...tooltipProps}
      className="bg-[#050505] border border-[#006A33] text-[#F8F8FF] p-6 max-w-md rounded-none shadow-[0_0_20px_rgba(0,106,51,0.3)] font-mono relative overflow-hidden"
    >
      {/* Grid Background Effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#006A33 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-4 border-b border-[#006A33]/30 pb-2 relative z-10">
        <span className="text-[#006A33] text-xs tracking-widest uppercase font-bold">
          SYSTEM_GUIDE // STEP_0{index + 1}
        </span>
        <button 
          {...closeProps} 
          className="text-[#006A33] hover:text-white transition-colors p-1"
          title="Skip Tour"
        >
          <span className="sr-only">Close</span>
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="mb-6 relative z-10">
        {step.content}
      </div>

      {/* Footer / Controls */}
      <div className="flex justify-between items-center relative z-10">
        <div className="flex gap-2">
          {index > 0 && (
            <button
              {...backProps}
              className="px-4 py-2 text-xs font-bold text-[#006A33] border border-[#006A33] hover:bg-[#006A33] hover:text-white transition-all uppercase tracking-wider"
            >
              Back
            </button>
          )}
        </div>
        
        <button
          {...primaryProps}
          className="px-6 py-2 text-xs font-bold bg-[#006A33] text-white hover:bg-[#008040] transition-all uppercase tracking-wider shadow-[0_0_10px_rgba(0,106,51,0.5)]"
        >
          {isLastStep ? 'Initialize_System >' : 'Next_Step >'}
        </button>
      </div>
    </div>
  );
}

export function OnboardingTour({ enabled = true, onFinish }: OnboardingTourProps) {
  const [run, setRun] = useState(false);
  const hasNotifiedRef = useRef(false);
  
  // Check if tour has been completed
  useEffect(() => {
    if (!enabled) {
      setRun(false);
      return;
    }
    
    const isCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!isCompleted) {
      setRun(true);
    } else {
      // Tour was already completed, notify parent immediately (only once)
      if (onFinish && !hasNotifiedRef.current) {
        hasNotifiedRef.current = true;
        setTimeout(() => onFinish(), 100);
      }
    }
  }, [enabled, onFinish]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
      // Use setTimeout to ensure state updates have processed
      setTimeout(() => {
        if (onFinish) onFinish();
      }, 100);
    }
  };

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2 text-white uppercase tracking-wide">System_Login</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Welcome to Panoptes. Your real-time blockchain surveillance system is ready for configuration.
          </p>
        </div>
      ),
      placement: 'center',
    },
    {
      target: '[data-tour="create-subscription"]',
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2 text-white uppercase tracking-wide">Initialize_Monitor</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Deploy new surveillance hooks here. Monitor wallets, contracts, and transaction flows.
          </p>
        </div>
      ),
    },
    {
      target: '[data-tour="filters"]',
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2 text-white uppercase tracking-wide">Filter_Protocols</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Isolate specific event streams. Filter by status, event type, or search for specific subscription IDs.
          </p>
        </div>
      ),
    },
    {
      target: '[data-tour="recent-logs"]',
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2 text-white uppercase tracking-wide">Event_Logs</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Detailed audit trail of all captured events and delivery attempts.
          </p>
        </div>
      ),
      placement: 'left',
      disableScrolling: true,
    },
    {
      target: 'body',
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2 text-white uppercase tracking-wide">System_Test</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Verify your integration integrity. Use the built-in tester to simulate events and validate webhook delivery.
          </p>
        </div>
      ),
      placement: 'center',
    }
  ];

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      disableOverlayClose
      spotlightClicks={false}
      spotlightPadding={8}
      callback={handleJoyrideCallback}
      tooltipComponent={CustomTooltip}
      styles={{
        options: {
          zIndex: 1000,
          overlayColor: 'rgba(5, 5, 5, 0.85)',
        },
        spotlight: {
          borderRadius: 8,
          border: '2px solid #006A33',
          boxShadow: '0 0 20px rgba(0, 106, 51, 0.5)',
        },
      }}
      floaterProps={{
        disableAnimation: true,
      }}
    />
  );
}
