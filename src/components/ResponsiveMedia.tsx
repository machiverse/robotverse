import { useState } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (type === 'image') {
    return (
      <div className={cn("relative overflow-hidden rounded-lg bg-muted", className)}>
        <img
          src={src}
          alt={alt || title || 'Image'}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
          style={{
            aspectRatio: 'auto',
            maxWidth: '100%',
            height: 'auto'
          }}
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement?.classList.add('bg-muted/50');
          }}
        />
      </div>
    );
  }

  return (
    <div 
      className={cn("relative aspect-video bg-black rounded-lg overflow-hidden group", className)}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        src={src}
        poster={poster || src}
        autoPlay={autoplay}
        muted={isMuted}
        controls={controls}
        loop={autoplay}
        playsInline
        className="w-full h-full object-cover"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={(e) => {
          const video = e.target as HTMLVideoElement;
          if (autoplay && video.paused) {
            video.play().catch(console.error);
          }
        }}
        onCanPlay={(e) => {
          const video = e.target as HTMLVideoElement;
          if (autoplay && video.paused) {
            video.play().catch(console.error);
          }
        }}
      />

      {/* Custom Video Controls Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-sm rounded-full p-4 shadow-lg group-hover:scale-110 transition-transform cursor-pointer">
            <Play className="h-8 w-8 text-primary fill-primary" />
          </div>
        </div>
      )}

      {/* Duration Badge */}
      {videoDuration && (
        <div className="absolute bottom-3 right-3 bg-black/80 text-white text-sm px-3 py-1 rounded-md font-medium">
          {formatDuration(videoDuration)}
        </div>
      )}

      {/* Mute Toggle */}
      {showControls && (
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

      {/* Loading State */}
      <div className="absolute inset-0 bg-muted/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="text-sm text-muted-foreground">
          {title && <div className="font-medium">{title}</div>}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveMedia;