/**
 * Chat content filter to block sensitive information
 * Prevents users from sharing contact details outside the platform
 */

export interface FilterResult {
  isBlocked: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
  originalMessage: string;
}

// Refined regex patterns for sensitive information
const PATTERNS = {
  // Indian phone numbers - various formats
  // Matches: 9876543210, +91-9876-543-210, 09876543210, +919876543210, etc.
  indianPhone: /(\+?91[-.\s]?)?[6-9]\d{9}|\b0[6-9]\d{9}\b/g,
  
  // International phone numbers (more strict to avoid false positives)
  intlPhone: /\+\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,5}/g,
  
  // Email addresses
  email: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/gi,
  
  // URLs and website links
  url: /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\b[a-zA-Z0-9-]+\.(com|net|org|in|co|io|dev|app|xyz|online|site|tech|info|biz|edu|gov)\b)/gi,
  
  // External messaging platforms
  externalMessaging: /\b(whatsapp|wa\.me|whats\s*app|telegram|t\.me|signal|wechat|line|viber|messenger)\b/gi,
  
  // Contact sharing keywords (strict matching)
  contactKeywords: /\b(call\s+me|email\s+me|contact\s+me|reach\s+me|dm\s+me|direct\s*message\s+me|inbox\s+me|mail\s+me|message\s+me\s+at|text\s+me|ping\s+me)\b/gi,
  
  // Common contact phrases
  contactPhrases: /\b(my\s+(phone|mobile|number|email|contact|whatsapp|telegram))\b/gi,
};

/**
 * Check if message contains legitimate business terms that might trigger false positives
 */
const isLegitimateBusinessMessage = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  
  // Allow messages about prices, specifications, delivery
  const businessTerms = [
    'price', 'cost', 'delivery', 'specification', 'warranty',
    'shipping', 'payment', 'invoice', 'order', 'model',
    'available', 'stock', 'condition', 'year', 'location'
  ];
  
  return businessTerms.some(term => lowerMessage.includes(term));
};

/**
 * Filter chat message for sensitive information
 */
export const filterChatMessage = (message: string): FilterResult => {
  if (!message || message.trim().length === 0) {
    return {
      isBlocked: false,
      originalMessage: message,
    };
  }

  const trimmedMessage = message.trim();
  const lowerMessage = trimmedMessage.toLowerCase();
  
  // Check for Indian phone numbers
  if (PATTERNS.indianPhone.test(trimmedMessage)) {
    return {
      isBlocked: true,
      reason: 'Phone numbers are not allowed. Please keep all communication within the platform.',
      severity: 'high',
      originalMessage: message,
    };
  }
  
  // Check for international phone numbers
  if (PATTERNS.intlPhone.test(trimmedMessage)) {
    return {
      isBlocked: true,
      reason: 'Phone numbers are not allowed. Please keep all communication within the platform.',
      severity: 'high',
      originalMessage: message,
    };
  }
  
  // Check for email addresses
  if (PATTERNS.email.test(trimmedMessage)) {
    return {
      isBlocked: true,
      reason: 'Email addresses are not allowed. Please use the platform chat for communication.',
      severity: 'high',
      originalMessage: message,
    };
  }
  
  // Check for URLs (only if not a legitimate business discussion)
  if (PATTERNS.url.test(trimmedMessage) && !isLegitimateBusinessMessage(trimmedMessage)) {
    return {
      isBlocked: true,
      reason: 'External links are not allowed. Please share information directly in chat.',
      severity: 'medium',
      originalMessage: message,
    };
  }
  
  // Check for external messaging platform mentions
  if (PATTERNS.externalMessaging.test(trimmedMessage)) {
    return {
      isBlocked: true,
      reason: 'References to external messaging platforms are not allowed. Please use RobotVerse chat.',
      severity: 'high',
      originalMessage: message,
    };
  }
  
  // Check for contact-sharing keywords
  if (PATTERNS.contactKeywords.test(trimmedMessage)) {
    return {
      isBlocked: true,
      reason: 'Attempts to share contact information are not allowed. Please communicate within the platform.',
      severity: 'medium',
      originalMessage: message,
    };
  }
  
  // Check for common contact phrases
  if (PATTERNS.contactPhrases.test(trimmedMessage)) {
    return {
      isBlocked: true,
      reason: 'Sharing personal contact details is not allowed. Please use the platform chat.',
      severity: 'medium',
      originalMessage: message,
    };
  }
  
  // Message is clean
  return {
    isBlocked: false,
    originalMessage: message,
  };
};

/**
 * Sanitize message content (for display purposes)
 * Note: This should only be used for display, not for validation
 */
export const sanitizeMessage = (message: string): string => {
  return message
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
};
