/**
 * Chat content filter to block sensitive information
 */

interface FilterResult {
  isBlocked: boolean;
  reason?: string;
  originalMessage: string;
}

// Regex patterns for sensitive information
const PATTERNS = {
  // Phone numbers (various formats)
  phone: /(\+?\d{1,4}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
  
  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  
  // URLs and links
  url: /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|net|org|in|co|io|dev|app|xyz|online|site|tech|info|biz)[^\s]*)/gi,
  
  // WhatsApp mentions
  whatsapp: /whatsapp|wa\.me|whats\s*app/gi,
  
  // Contact keywords
  contact: /\b(call|phone|mobile|email|contact|reach|dm|direct\s*message|inbox|mail)\s*(me|us|at|on|number|id)?/gi,
  
  // Number sequences that look like phone numbers
  phoneSequence: /\b\d{10,}\b/g,
};

// Additional suspicious phrases
const SUSPICIOUS_PHRASES = [
  'call me',
  'email me',
  'contact me',
  'reach me',
  'dm me',
  'message me',
  'mail me',
  'phone number',
  'mobile number',
  'my number',
  'my email',
  'my contact',
];

/**
 * Filter chat message for sensitive information
 */
export const filterChatMessage = (message: string): FilterResult => {
  const lowerMessage = message.toLowerCase();
  
  // Check for phone numbers
  if (PATTERNS.phone.test(message) || PATTERNS.phoneSequence.test(message)) {
    return {
      isBlocked: true,
      reason: 'Message contains phone number',
      originalMessage: message,
    };
  }
  
  // Check for email addresses
  if (PATTERNS.email.test(message)) {
    return {
      isBlocked: true,
      reason: 'Message contains email address',
      originalMessage: message,
    };
  }
  
  // Check for URLs
  if (PATTERNS.url.test(message)) {
    return {
      isBlocked: true,
      reason: 'Message contains external link',
      originalMessage: message,
    };
  }
  
  // Check for WhatsApp mentions
  if (PATTERNS.whatsapp.test(message)) {
    return {
      isBlocked: true,
      reason: 'Message contains external messaging platform reference',
      originalMessage: message,
    };
  }
  
  // Check for contact-sharing phrases
  if (PATTERNS.contact.test(message)) {
    return {
      isBlocked: true,
      reason: 'Message attempts to share contact information',
      originalMessage: message,
    };
  }
  
  // Check for suspicious phrases
  for (const phrase of SUSPICIOUS_PHRASES) {
    if (lowerMessage.includes(phrase)) {
      return {
        isBlocked: true,
        reason: 'Message attempts to exchange contact details',
        originalMessage: message,
      };
    }
  }
  
  return {
    isBlocked: false,
    originalMessage: message,
  };
};
