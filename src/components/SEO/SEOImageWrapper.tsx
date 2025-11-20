import React, { useState } from 'react';

interface SEOImageWrapperProps {
  src: string;
  alt: string;
  title?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  width?: number;
  height?: number;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * SEO-Optimized Image Component
 * - Automatic lazy loading
 * - Proper alt text
 * - Loading states
 * - Error handling
 * - Performance optimization
 */
export const SEOImageWrapper: React.FC<SEOImageWrapperProps> = ({
  src,
  alt,
  title,
  className = '',
  loading = 'lazy',
  width,
  height,
  onLoad,
  onError
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const handleLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };
  
  const handleError = () => {
    setImageError(true);
    onError?.();
  };
  
  if (imageError) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ width, height }}
      >
        <span className="text-muted-foreground text-sm">Image not available</span>
      </div>
    );
  }
  
  return (
    <div className="relative">
      {!imageLoaded && loading === 'lazy' && (
        <div 
          className={`absolute inset-0 bg-muted animate-pulse ${className}`}
          style={{ width, height }}
        />
      )}
      <img
        src={src}
        alt={alt}
        title={title || alt}
        className={`${className} ${!imageLoaded ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}
        loading={loading}
        width={width}
        height={height}
        onLoad={handleLoad}
        onError={handleError}
        itemProp="image"
      />
    </div>
  );
};

export default SEOImageWrapper;
