import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

interface ZoomImageProps {
  src: string;
  alt: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function ZoomImage({ src, alt, onClick }: ZoomImageProps) {
  return (
    <TransformWrapper 
      initialScale={1} 
      minScale={1} 
      maxScale={4} 
      centerOnInit
      panning={{ excluded: ['zoom-close-btn'] }}
      pinch={{ excluded: ['zoom-close-btn'] }}
      wheel={{ excluded: ['zoom-close-btn'] }}
      doubleClick={{ excluded: ['zoom-close-btn'] }}
    >
      <TransformComponent wrapperClass="!w-full !h-full flex items-center justify-center" contentClass="!w-full !h-full flex items-center justify-center">
        <img loading="lazy" decoding="async" 
          src={src} 
          alt={alt} 
          className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing" 
          onClick={onClick}
          draggable={false}
        />
      </TransformComponent>
    </TransformWrapper>
  );
}
