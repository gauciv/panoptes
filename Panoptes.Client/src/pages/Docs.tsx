import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Terminal, 
  Server, 
  Shield, 
  ArrowLeft, 
  Cpu, 
  Zap,
  Box,
  ChevronRight,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// --- DOCS CONTENT CONFIG ---
const SECTIONS = [
  { id: 'intro', label: 'Introduction', icon: BookOpen },
  { id: 'architecture', label: 'Architecture', icon: Cpu },
  { id: 'setup', label: 'Quick Start', icon: Zap },
  { id: 'configuration', label: 'Configuration', icon: Server },
  { id: 'concepts', label: 'Core Concepts', icon: Box },
];

export default function Docs() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('intro');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans selection:bg-emerald-500/30">
      
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
                <ArrowLeft className="w-5 h-5 text-zinc-500" />
            </button>
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
            <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                <span className="font-mono font-bold tracking-wider uppercase text-sm hidden sm:block">Panoptes_Docs</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
             <span className="text-[10px] font-mono text-zinc-400 uppercase hidden sm:block">v1.2.0-beta</span>
             <Button variant="outline" size="sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden">
                <Menu className="w-4 h-4" />
             </Button>
        </div>
      </header>

      <div className="pt-16 flex min-h-screen">
        
        {/* Sidebar Navigation (Desktop) */}
        <aside className="hidden lg:block w-64 fixed left-0 top-16 bottom-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/50 overflow-y-auto p-6">
            <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 px-2">Table of Contents</h4>
                {SECTIONS.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-sm font-mono rounded-md transition-all",
                            activeSection === section.id 
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold" 
                                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                    >
                        <section.icon className="w-4 h-4" />
                        {section.label}
                    </button>
                ))}
            </div>
        </aside>

        {/* Mobile Navigation Overlay */}
        {mobileMenuOpen && (
             <div className="lg:hidden fixed inset-0 z-40 bg-zinc-50 dark:bg-zinc-950 pt-20 px-6">
                 <div className="space-y-2">
                    {SECTIONS.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => scrollToSection(section.id)}
                            className="w-full flex items-center gap-3 px-4 py-4 text-lg font-mono border-b border-zinc-100 dark:border-zinc-800"
                        >
                            <section.icon className="w-5 h-5" />
                            {section.label}
                        </button>
                    ))}
                 </div>
             </div>
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 p-6 lg:p-12 max-w-5xl mx-auto space-y-20">
            
            {/* 1. Intro */}
            <section id="intro" className="scroll-mt-24 space-y-6">
                <h1 className="text-4xl font-bold font-mono uppercase tracking-tight text-zinc-900 dark:text-zinc-50">
                    System Documentation
                </h1>
                <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
                    <strong>Panoptes</strong> is a real-time blockchain surveillance platform designed for the Cardano ecosystem. 
                    It allows developers and organizations to deploy "Hooks" that monitor specific on-chain events 
                    and deliver instant alerts via Webhooks.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900">
                        <div className="flex items-center gap-2 mb-2 text-indigo-500">
                            <Zap className="w-5 h-5" />
                            <h3 className="font-bold font-mono uppercase">Real-Time</h3>
                        </div>
                        <p className="text-sm text-zinc-500">Powered by UTxORPC for sub-second latency event detection.</p>
                    </div>
                    <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900">
                        <div className="flex items-center gap-2 mb-2 text-emerald-500">
                            <Shield className="w-5 h-5" />
                            <h3 className="font-bold font-mono uppercase">Argus Core</h3>
                        </div>
                        <p className="text-sm text-zinc-500">Built on top of the Argus indexing engine (C# / .NET 9).</p>
                    </div>
                </div>
            </section>

            {/* 2. Architecture */}
            <section id="architecture" className="scroll-mt-24 space-y-6">
                 <div className="flex items-center gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <Cpu className="w-6 h-6 text-zinc-400" />
                    <h2 className="text-2xl font-bold font-mono uppercase">System Architecture</h2>
                 </div>
                 <p className="text-zinc-600 dark:text-zinc-400">
                     Panoptes operates using a decoupled architecture to ensure scalability and fault tolerance.
                 </p>
                 
                 <div className="bg-zinc-100 dark:bg-zinc-900 p-6 rounded-lg font-mono text-xs md:text-sm space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-indigo-500 font-bold">[Blockchain]</span>
                        <ChevronRight className="w-3 h-3 text-zinc-500" />
                        <span className="text-zinc-500">Demeter (UTxORPC)</span>
                    </div>
                    <div className="pl-4 border-l border-zinc-300 dark:border-zinc-700 ml-3 py-2">
                         <div className="flex items-center gap-2">
                            <ChevronRight className="w-3 h-3 text-zinc-500" />
                            <span className="text-emerald-500 font-bold">[Panoptes Backend]</span>
                            <span className="text-zinc-400">(.NET 9 Worker)</span>
                        </div>
                        <div className="pl-4 pt-1 text-zinc-500 italic">
                             - Ingests blocks via gRPC<br/>
                             - Matches patterns (Argus Engine)<br/>
                             - Dispatches Webhooks
                        </div>
                    </div>
                    <div className="pl-4 border-l border-zinc-300 dark:border-zinc-700 ml-3">
                         <div className="flex items-center gap-2">
                            <ChevronRight className="w-3 h-3 text-zinc-500" />
                            <span className="text-emerald-500 font-bold">[Panoptes UI]</span>
                            <span className="text-zinc-400">(React / Vite)</span>
                        </div>
                         <div className="pl-4 pt-1 text-zinc-500 italic">
                             - Visualizes Logs<br/>
                             - Manages Subscriptions
                        </div>
                    </div>
                 </div>
            </section>

            {/* 3. Quick Start */}
            <section id="setup" className="scroll-mt-24 space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <Zap className="w-6 h-6 text-zinc-400" />
                    <h2 className="text-2xl font-bold font-mono uppercase">Quick Start</h2>
                 </div>
                 
                 <div className="space-y-4">
                    <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">1. Clone Repository</h3>
                    <div className="bg-black text-zinc-100 p-4 rounded-md font-mono text-sm overflow-x-auto">
                        git clone https://github.com/saib-dev/panoptes.git<br/>
                        cd panoptes
                    </div>

                    <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 pt-4">2. Start Backend</h3>
                    <p className="text-sm text-zinc-500">Ensure you have .NET 9 SDK installed.</p>
                    <div className="bg-black text-zinc-100 p-4 rounded-md font-mono text-sm overflow-x-auto">
                        cd Panoptes.Server<br/>
                        dotnet run
                    </div>

                    <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 pt-4">3. Start Frontend</h3>
                    <div className="bg-black text-zinc-100 p-4 rounded-md font-mono text-sm overflow-x-auto">
                        cd Panoptes.Client<br/>
                        npm install<br/>
                        npm run dev
                    </div>
                 </div>
            </section>

            {/* 4. Configuration */}
            <section id="configuration" className="scroll-mt-24 space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <Server className="w-6 h-6 text-zinc-400" />
                    <h2 className="text-2xl font-bold font-mono uppercase">Configuration (UTxORPC)</h2>
                 </div>
                 
                 <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900 rounded-lg">
                     <p className="text-sm text-indigo-800 dark:text-indigo-300 leading-relaxed">
                        To receive live blockchain data, you must provide a valid <strong>Demeter API Key</strong>. 
                        Panoptes uses the U5C (gRPC) provider standard.
                     </p>
                 </div>

                 <div className="space-y-4 pt-2">
                    <h4 className="font-bold font-mono uppercase">Step-by-Step:</h4>
                    <ol className="list-decimal list-inside space-y-3 text-zinc-600 dark:text-zinc-400 text-sm">
                        <li>Log in to <a href="https://demeter.run" target="_blank" className="underline text-emerald-500">Demeter.run</a>.</li>
                        <li>Create a new project (select the network you wish to monitor, e.g., Preprod).</li>
                        <li>Inside the project, click <strong>"Add Product"</strong> card.</li>
                        <li>Select <strong>"UtxoRPC"</strong> (it may be labeled as gRPC/U5C).</li>
                        <li>Once added, click into it to reveal your <strong>API Key</strong> (starts with <code>dmtr_</code>).</li>
                        <li>Navigate to <strong>Settings</strong> in Panoptes and paste this key.</li>
                    </ol>
                 </div>
            </section>

             {/* 5. Core Concepts */}
             <section id="concepts" className="scroll-mt-24 space-y-6 pb-20">
                <div className="flex items-center gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <Box className="w-6 h-6 text-zinc-400" />
                    <h2 className="text-2xl font-bold font-mono uppercase">Core Concepts</h2>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="space-y-2">
                         <h4 className="font-bold text-emerald-500 uppercase font-mono">Hooks</h4>
                         <p className="text-sm text-zinc-500">
                            A Hook is a subscription rule. You tell Panoptes "Watch this Wallet Address" or "Watch this Policy ID".
                         </p>
                     </div>
                     <div className="space-y-2">
                         <h4 className="font-bold text-indigo-500 uppercase font-mono">Matches</h4>
                         <p className="text-sm text-zinc-500">
                            When a block is processed and meets your Hook's criteria, it generates a Match event.
                         </p>
                     </div>
                     <div className="space-y-2">
                         <h4 className="font-bold text-rose-500 uppercase font-mono">Logs</h4>
                         <p className="text-sm text-zinc-500">
                            The record of the system attempting to send that Match data to your designated Webhook URL.
                         </p>
                     </div>
                 </div>
            </section>

        </main>
      </div>
    </div>
  );
}