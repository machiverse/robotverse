import React, { useState, useEffect, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ResponsiveImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  src: string;
  alt: string;
  /**
   * Container aspect ratio - defaults to 'auto' which adapts to image
   * Common values: 'square' | 'video' | 'portrait' | 'auto' | 'custom'
   */
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto' | 'custom';
  /**
   * Custom aspect ratio as width/height (e.g., 16/9, 4/3, 3/4)
   */
  customRatio?: number;
  /**
   * How the image should fit within its container
   * 'contain' - entire image visible, may have letterboxing
   * 'cover' - fills container, may crop parts of image
   * 'fill' - stretches to fill, may distort
   * 'scale-down' - acts like contain or none, whichever is smaller
   */
  objectFit?: 'contain' | 'cover' | 'fill' | 'scale-down';
  /**
   * Loading placeholder color/pattern
   */
  placeholder?: 'blur' | 'empty' | React.ReactNode;
  /**
   * Container className
   */
  containerClassName?: string;
  /**
   * Loading state
   */
  loading?: boolean;
  /**
   * Error fallback
   */
  fallback?: React.ReactNode;
  /**
   * Enable hover effects
   */
  hoverEffect?: boolean;
  /**
   * Background color for transparent images
   */
  backgroundColor?: string;
}

const ResponsiveImage = forwardRef<HTMLImageElement, ResponsiveImageProps>(
  ({
    src,
    alt,
    aspectRatio = 'auto',
    customRatio,
    objectFit = 'contain',
    placeholder = 'blur',
    containerClassName,
    className,
    loading = false,
    fallback,
    hoverEffect = false,
    backgroundColor = 'transparent',
    ...props
  }, ref) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [naturalAspectRatio, setNaturalAspectRatio] = useState<number | null>(null);

    useEffect(() => {
      setImageLoaded(false);
      setImageError(false);
      setNaturalAspectRatio(null);
    }, [src]);

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      setNaturalAspectRatio(img.naturalWidth / img.naturalHeight);
      setImageLoaded(true);
      props.onLoad?.(e);
    };

    const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      setImageError(true);
      props.onError?.(e);
    };

    // Determine container aspect ratio
    const getAspectRatioClass = () => {
      if (aspectRatio === 'custom' && customRatio) {
        return '';
      }
      
      switch (aspectRatio) {
        case 'square':
          return 'aspect-square';
        case 'video':
          return 'aspect-video';
        case 'portrait':
          return 'aspect-[3/4]';
        case 'auto':
          if (naturalAspectRatio !== null) {
            return naturalAspectRatio > 1 ? 'aspect-video' : 'aspect-[3/4]';
          }
          return 'aspect-video'; // fallback
        default:
          return 'aspect-video';
      }
    };

    // Get object-fit class
    const getObjectFitClass = () => {
      switch (objectFit) {
        case 'contain':
          return 'object-contain';
        case 'cover':
          return 'object-cover';
        case 'fill':
          return 'object-fill';
        case 'scale-down':
          return 'object-scale-down';
        default:
          return 'object-contain';
      }
    };

    // Custom aspect ratio style
    const customAspectStyle = aspectRatio === 'custom' && customRatio 
      ? { aspectRatio: customRatio.toString() }
      : {};

    // Render placeholder
    const renderPlaceholder = () => {
      if (typeof placeholder === 'string') {
        if (placeholder === 'blur') {
          return (
            <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted animate-pulse rounded-inherit" />
          );
        }
        return (
          <div className="absolute inset-0 bg-muted rounded-inherit" />
        );
      }
      return placeholder;
    };

    // Render error fallback
    const renderFallback = () => {
      if (fallback) {
        return fallback;
      }
      return (
        <div className="absolute inset-0 bg-muted rounded-inherit flex items-center justify-center">
          <div className="text-muted-foreground text-sm">Failed to load image</div>
        </div>
      );
    };

    return (
      <div 
        className={cn(
          'relative overflow-hidden rounded-lg',
          getAspectRatioClass(),
          containerClassName
        )}
        style={{
          backgroundColor,
          ...customAspectStyle
        }}
      >
        {/* Loading placeholder */}
        {(!imageLoaded || loading) && !imageError && renderPlaceholder()}
        
        {/* Error fallback */}
        {imageError && renderFallback()}
        
        {/* Main image */}
        {!imageError && (
          <img
            ref={ref}
            src={src}
            alt={alt}
            className={cn(
              'w-full h-full transition-all duration-300',
              getObjectFitClass(),
              {
                'opacity-0': !imageLoaded || loading,
                'opacity-100': imageLoaded && !loading,
                'hover:scale-105 cursor-pointer': hoverEffect,
                'transition-transform duration-500': hoverEffect,
              },
              className
            )}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
            {...props}
          />
        )}
      </div>
    );
  }
);

ResponsiveImage.displayName = 'ResponsiveImage';

export { ResponsiveImage };

// Utility component for image grids
export const ImageGrid: React.FC<{
  images: Array<{ src: string; alt: string; id?: string }>;
  columns?: number;
  aspectRatio?: ResponsiveImageProps['aspectRatio'];
  objectFit?: ResponsiveImageProps['objectFit'];
  gap?: string;
  className?: string;
  onImageClick?: (image: { src: string; alt: string; id?: string }, index: number) => void;
}> = ({
  images,
  columns = 3,
  aspectRatio = 'square',
  objectFit = 'cover',
  gap = 'gap-4',
  className,
  onImageClick
}) => {
  return (
    <div className={cn(
      'grid',
      gap,
      {
        'grid-cols-1': columns === 1,
        'grid-cols-2': columns === 2,
        'grid-cols-3': columns === 3,
        'grid-cols-4': columns === 4,
        'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4': columns > 4,
      },
      className
    )}>
      {images.map((image, index) => (
        <ResponsiveImage
          key={image.id || index}
          src={image.src}
          alt={image.alt}
          aspectRatio={aspectRatio}
          objectFit={objectFit}
          hoverEffect={!!onImageClick}
          onClick={() => onImageClick?.(image, index)}
        />
      ))}
    </div>
  );
};

// Gallery component with masonry layout for mixed orientations
export const MasonryImageGallery: React.FC<{
  images: Array<{ src: string; alt: string; id?: string }>;
  columns?: number;
  gap?: string;
  className?: string;
  onImageClick?: (image: { src: string; alt: string; id?: string }, index: number) => void;
}> = ({
  images,
  columns = 3,
  gap = 'gap-4',
  className,
  onImageClick
}) => {
  return (
    <div className={cn(
      'columns-1 sm:columns-2 lg:columns-3',
      gap,
      {
        'lg:columns-2': columns === 2,
        'lg:columns-4': columns === 4,
      },
      className
    )}>
      {images.map((image, index) => (
        <div key={image.id || index} className="break-inside-avoid mb-4">
          <ResponsiveImage
            src={image.src}
            alt={image.alt}
            aspectRatio="auto"
            objectFit="cover"
            hoverEffect={!!onImageClick}
            onClick={() => onImageClick?.(image, index)}
            className="w-full"
          />
        </div>
      ))}
    </div>
  );
};