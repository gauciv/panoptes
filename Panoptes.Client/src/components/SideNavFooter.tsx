import { BookOpen, ExternalLink } from 'lucide-react';

interface SideNavFooterProps {
  isCollapsed: boolean;
}

export function SideNavFooter({ isCollapsed }: SideNavFooterProps) {
  if (isCollapsed) return null;
  
  return (
    <div className="p-3 m-2 mb-4 bg-gradient-to-br from-sentinel/10 to-sentinel/5 border border-sentinel/20 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-tech bg-sentinel/10 text-sentinel flex items-center justify-center mt-0.5">
          <BookOpen className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-sans font-semibold text-sm text-foreground mb-1">
            View Documentation
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Learn how to integrate and use Panoptes
          </p>
          <a 
            href="#" 
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-sentinel hover:bg-sentinel-hover text-white rounded-tech text-xs font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel focus-visible:ring-offset-2"
          >
            Read Docs
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
