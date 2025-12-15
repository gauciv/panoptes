import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
      className="bg-[#09090b] border border-zinc-800 text-zinc-100 p-6 max-w-md rounded-sm shadow-2xl font-mono relative overflow-hidden"
    >
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2 relative z-10">
        <span className="text-zinc-500 text-xs tracking-widest uppercase font-bold">
          SYSTEM_GUIDE // STEP_0{index + 1}
        </span>
        <button 
          {...closeProps} 
          className="text-zinc-500 hover:text-white transition-colors p-1"
          title="Skip Tour"
        >
          <span className="sr-only">Close</span>
          ✕
        </button>
      </div>

      <div className="mb-6 relative z-10">
        {step.content}
      </div>

      <div className="flex justify-between items-center relative z-10">
        <div className="flex gap-2">
          {index > 0 && (
            <button
              {...backProps}
              className="px-4 py-2 text-xs font-bold text-zinc-500 border border-zinc-800 hover:bg-zinc-800 hover:text-white transition-all uppercase tracking-wider rounded-sm"
            >
              Back
            </button>
          )}
        </div>
        
        <button
          {...primaryProps}
          className="px-6 py-2 text-xs font-bold bg-emerald-500 text-zinc-950 hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all uppercase tracking-wider rounded-sm"
        >
          {isLastStep ? 'Launch_Wizard >' : 'Next_Step >'}
        </button>
      </div>
    </div>
  );
}

export function OnboardingTour({ enabled = true, onFinish }: OnboardingTourProps) {
  const [run, setRun] = useState(false);
  const hasNotifiedRef = useRef(false);
  const navigate = useNavigate();
  
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
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
      
      if (status === STATUS.FINISHED) {
          console.log("[Onboarding] Launching Setup Wizard Navigation...");
          
          // ✅ FIX: Updated path to include '/dashboard' prefix
          navigate('/dashboard/settings?setup=true');
          
          if (onFinish) {
             onFinish();
          }
      }

      setTimeout(() => setRun(false), 50);
    }
  };

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2 text-white uppercase tracking-wide">System_Login</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Welcome to Panoptes. Your real-time blockchain surveillance system is ready for configuration.
          </p>
        </div>
      ),
      placement: 'center',
    },
    {
        target: 'nav', 
        content: (
            <div>
                <h3 className="font-bold text-lg mb-2 text-white uppercase tracking-wide">Network_Manager</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                    Switch between <strong>Preprod</strong>, <strong>Mainnet</strong>, and <strong>Preview</strong> using the dropdown menu.
                </p>
            </div>
        ),
        placement: 'right'
    },
    {
      target: '[data-tour="create-subscription"]',
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2 text-white uppercase tracking-wide">Initialize_Monitor</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
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
          <p className="text-zinc-400 text-sm leading-relaxed">
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
          <p className="text-zinc-400 text-sm leading-relaxed">
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
          <h3 className="font-bold text-lg mb-2 text-white uppercase tracking-wide">System_Setup</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Your environment requires initial configuration. Click below to launch the <strong>Setup Wizard</strong> and generate your API keys.
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
          borderRadius: 4,
          border: '2px solid #52525b', // zinc-600
          boxShadow: '0 0 20px rgba(255, 255, 255, 0.1)',
        },
      }}
      floaterProps={{
        disableAnimation: true,
      }}
    />
  );
}