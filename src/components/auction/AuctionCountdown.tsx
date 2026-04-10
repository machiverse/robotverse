import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface AuctionCountdownProps {
  endTime: string;
  startTime?: string;
  status: string;
  compact?: boolean;
}

const AuctionCountdown: React.FC<AuctionCountdownProps> = ({ endTime, startTime, status, compact }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'warning' | 'critical'>('normal');

  useEffect(() => {
    const calc = () => {
      const now = Date.now();
      const end = new Date(endTime).getTime();
      const start = startTime ? new Date(startTime).getTime() : 0;

      if (status === 'upcoming' && start > now) {
        const diff = start - now;
        setTimeLeft(formatDiff(diff));
        setUrgency('normal');
        return;
      }

      if (end <= now) {
        setTimeLeft('Ended');
        setUrgency('critical');
        return;
      }

      const diff = end - now;
      setTimeLeft(formatDiff(diff));
      setUrgency(diff < 300000 ? 'critical' : diff < 3600000 ? 'warning' : 'normal');
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endTime, startTime, status]);

  const formatDiff = (ms: number) => {
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const colors = {
    normal: 'bg-primary/10 text-primary border-primary/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    critical: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-mono ${urgency === 'critical' ? 'text-destructive animate-pulse' : urgency === 'warning' ? 'text-amber-400' : 'text-primary'}`}>
        <Clock className="w-3 h-3" />
        {status === 'upcoming' ? `Starts in ${timeLeft}` : timeLeft}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors[urgency]}`}>
      <Clock className={`w-4 h-4 ${urgency === 'critical' ? 'animate-pulse' : ''}`} />
      <div>
        <p className="text-xs opacity-70">{status === 'upcoming' ? 'Starts in' : 'Time Remaining'}</p>
        <p className="font-mono font-bold text-sm">{timeLeft}</p>
      </div>
    </div>
  );
};

export default AuctionCountdown;
