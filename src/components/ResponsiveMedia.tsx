import { useState, useEffect, useRef } from "react";
import { Play, Volume2, VolumeX, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ResponsiveMediaProps {
  src: string;
  type: 'image' | 'video';
  alt?: string;
  title?: string;
  className?: string;
  videoDuration?: number;
  autoplay?: boolean;
  controls?: boolean;
  poster?: string;
}

const ResponsiveMedia = ({ 
  src, 
  type, 
  alt, 
  title, 
  className,
  videoDuration,
  autoplay = false,
  controls = true,
  poster
}: ResponsiveMediaProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleLoad = () => setLoading(false);
  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  // Auto-play video when it comes into view (for social media style autoplay)
  useEffect(() => {
    if (type === 'video' && autoplay && videoRef.current) {
      const video = videoRef.current;
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              video.play().catch(() => {
                // Autoplay failed, which is fine
              });
            } else {
              video.pause();
            }
          });
        },
        { threshold: 0.5 }
      );

      observer.observe(video);
      return () => observer.disconnect();
    }
  }, [type, autoplay]);

  if (error) {
    return (
      <div className={cn("bg-muted rounded-lg flex items-center justify-center p-8", className)}>
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load media</p>
        </div>
      </div>
    );
  }

  if (type === 'image') {
    return (
      <div className={cn("relative overflow-hidden rounded-lg bg-muted", className)}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        )}
        <img
          src={src}
          alt={alt || title || 'Image'}
          className="w-full h-auto max-h-[70vh] object-contain transition-transform duration-300 hover:scale-[1.02]"
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div 
      className={cn("relative bg-black rounded-lg overflow-hidden group", className)}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Skeleton className="w-full h-full" />
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        poster={poster || src}
        autoPlay={false} // Controlled by intersection observer
        muted={isMuted}
        controls={controls}
        loop={autoplay}
        playsInline
        preload="metadata"
        className="w-full h-auto max-h-[70vh] object-contain"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedData={handleLoad}
        onError={handleError}
      />

      {/* Custom Video Controls Overlay */}
      {!isPlaying && !loading && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-xs rounded-full p-4 shadow-lg group-hover:scale-110 transition-transform cursor-pointer">
            <Play className="h-8 w-8 text-primary fill-primary" />
          </div>
        </div>
      )}

      {/* Duration Badge */}
      {videoDuration && !loading && (
        <div className="absolute bottom-3 right-3 bg-black/80 text-white text-sm px-3 py-1 rounded-md font-medium">
          {formatDuration(videoDuration)}
        </div>
      )}

      {/* Mute Toggle */}
      {showControls && !loading && (
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
      )}

      {/* Video Info Overlay */}
      {title && showControls && !loading && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="text-white font-medium text-sm">{title}</div>
        </div>
      )}
    </div>
  );
};

export default ResponsiveMedia;