/**
 * Play catchy notification sound for new messages
 * Works on desktop, tablet, and mobile devices
 */
export const playNotificationSound = () => {
  try {
    // Create a pleasant multi-tone notification using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Play a pleasant two-tone notification
    const playTone = (frequency: number, startTime: number, duration: number, volume: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(volume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const currentTime = audioContext.currentTime;
    
    // First tone (higher pitch) - ding
    playTone(800, currentTime, 0.15, 0.3);
    
    // Second tone (lower pitch) - dong
    playTone(600, currentTime + 0.1, 0.25, 0.25);
    
    // Optional: Add a subtle echo for richness
    playTone(800, currentTime + 0.05, 0.12, 0.1);
    playTone(600, currentTime + 0.15, 0.2, 0.08);

    console.log('🔔 Notification sound played');
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
};

/**
 * Request notification permission (for desktop/mobile notifications)
 * Call this once on user interaction to enable notifications
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

/**
 * Show browser notification with sound
 * Works even when tab is in background
 */
export const showNotificationWithSound = (title: string, body: string, icon?: string) => {
  // Play sound immediately
  playNotificationSound();

  // Show browser notification if permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notificationOptions: NotificationOptions = {
        body,
        icon: icon || '/robotverse-logo.png',
        badge: '/robotverse-r-logo.png',
        tag: 'chat-message', // Prevents multiple notifications stacking
        requireInteraction: false,
      };

      // Add vibrate pattern for mobile devices (if supported)
      if ('vibrate' in navigator) {
        (notificationOptions as any).vibrate = [200, 100, 200];
      }

      const notification = new Notification(title, notificationOptions);

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Handle click to focus window
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }
};
