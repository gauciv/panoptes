
export function Footer() {
  return (
    // 1. Changed to a standard semantic <footer> tag
    // 2. Removed 'fixed', 'h-[800px]', and 'clipPath'
    // 3. Added 'relative' and 'z-10' to ensure it sits on top of any background layers
    <footer className="relative z-10 w-full bg-[#080808] px-6 py-12 md:py-24 flex flex-col justify-between border-t border-white/5">
        
        {/* TOP: LINKS GRID */}
        <div className="mx-auto w-full max-w-[1600px] grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          
          {/* BRAND COL */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <img src="/logo_panoptes.svg" alt="Logo" className="h-8 w-8 md:h-10 md:w-10 opacity-80" />
                <span className="font-michroma text-sm tracking-[0.2em] text-ghost">PANOPTES</span>
              </div>
              <p className="font-sans text-xs text-ghost/50 leading-relaxed max-w-xs">
                The self-hosted reactive event engine for Cardano. 
                Bridge on-chain activity to your infrastructure in milliseconds.
              </p>
              <div className="mt-4">
                 {/* Optional: Add CTA here if needed */}
              </div>
          </div>

          {/* LINKS COL 1 */}
          <div className="flex flex-col gap-4">
              <h4 className="font-mono text-[10px] text-sentinel tracking-widest">PRODUCT</h4>
              <a href="#" className="font-sans text-sm text-ghost/60 hover:text-white transition-colors">Features</a>
              <a href="#" className="font-sans text-sm text-ghost/60 hover:text-white transition-colors">Integrations</a>
              <a href="#" className="font-sans text-sm text-ghost/60 hover:text-white transition-colors">Enterprise</a>
              <a href="#" className="font-sans text-sm text-ghost/60 hover:text-white transition-colors">Changelog</a>
          </div>

          {/* LINKS COL 2 */}
          <div className="flex flex-col gap-4">
              <h4 className="font-mono text-[10px] text-sentinel tracking-widest">RESOURCES</h4>
              <a href="#" className="font-sans text-sm text-ghost/60 hover:text-white transition-colors">Documentation</a>
              <a href="#" className="font-sans text-sm text-ghost/60 hover:text-white transition-colors">API Reference</a>
              <a href="#" className="font-sans text-sm text-ghost/60 hover:text-white transition-colors">Community</a>
              <a href="#" className="font-sans text-sm text-ghost/60 hover:text-white transition-colors">GitHub</a>
          </div>

          {/* LINKS COL 3 */}
          <div className="flex flex-col gap-4">
              <h4 className="font-mono text-[10px] text-sentinel tracking-widest">LEGAL</h4>
              <a href="#" className="font-sans text-sm text-ghost/60 hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="font-sans text-sm text-ghost/60 hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="font-sans text-sm text-ghost/60 hover:text-white transition-colors">Cookie Settings</a>
          </div>
        </div>

        {/* BOTTOM: BIG WATERMARK */}
        <div className="mx-auto w-full max-w-[1600px] border-t border-white/5 pt-8 md:pt-12 flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mt-12">
          <div className="flex flex-col gap-1 order-2 md:order-1">
              <p className="font-mono text-[10px] text-ghost/30">
                © 2025 Team NonceSense. ALL RIGHTS RESERVED.
              </p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-sentinel animate-pulse" />
                <span className="font-mono text-[10px] text-sentinel">SYSTEMS_OPERATIONAL</span>
              </div>
          </div>
          
          <h3 className="font-michroma text-[12vw] leading-[0.8] text-white/5 select-none pointer-events-none order-1 md:order-2">
              PANOPTES
          </h3>
        </div>
        
    </footer>
  );
}