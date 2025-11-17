import { useState, useEffect } from 'react';

// Generate a unique session ID for anonymous users
const generateSessionId = () => {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useSessionId = () => {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Get or create session ID
    let id = localStorage.getItem('robobook_session_id');
    if (!id) {
      id = generateSessionId();
      localStorage.setItem('robobook_session_id', id);
    }
    setSessionId(id);
  }, []);

  return sessionId;
};