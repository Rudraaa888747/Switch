import React, { useState } from 'react';
import { ZoomIn, ZoomOut, X, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ProductImageViewerProps {
  src: string;
  alt: string;
  className?: string;
}

export const ProductImageViewer: React.FC<ProductImageViewerProps> = ({ src, alt, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleReset = () => setScale(1);

  return (
    <>
      <div className={`relative group cursor-pointer ${className}`} onClick={() => setIsOpen(true)}>
        <img loading="lazy" decoding="async" src={src} alt={alt} className="w-full h-full object-cover rounded border border-border/30 transition-all group-hover:border-primary/50" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Maximize2 className="h-5 w-5 text-white" />
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-border/50">
          <div className="relative">
            <div className="absolute top-4 right-4 z-50 flex gap-2">
              <Button size="icon" variant="secondary" onClick={handleZoomOut} disabled={scale <= 0.5} className="bg-foreground/10 hover:bg-foreground/20 backdrop-blur-sm">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="secondary" onClick={handleReset} className="bg-foreground/10 hover:bg-foreground/20 backdrop-blur-sm">
                <span className="text-xs font-bold">{Math.round(scale * 100)}%</span>
              </Button>
              <Button size="icon" variant="secondary" onClick={handleZoomIn} disabled={scale >= 3} className="bg-foreground/10 hover:bg-foreground/20 backdrop-blur-sm">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="secondary" onClick={() => setIsOpen(false)} className="bg-foreground/10 hover:bg-foreground/20 backdrop-blur-sm">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-auto max-h-[85vh] flex items-center justify-center p-8">
              <img loading="lazy" decoding="async"
                src={src}
                alt={alt}
                style={{ transform: `scale(${scale})`, transition: 'transform 0.2s ease-in-out' }}
                className="max-w-full h-auto"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
