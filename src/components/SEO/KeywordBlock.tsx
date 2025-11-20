import React from 'react';

interface KeywordBlockProps {
  keywords: string;
  visible?: boolean;
  className?: string;
}

/**
 * SEO Keyword Block Component
 * Renders keyword-rich text for search engine indexing
 * Can be hidden visually but accessible to search engines
 */
export const KeywordBlock: React.FC<KeywordBlockProps> = ({ 
  keywords, 
  visible = false,
  className = ''
}) => {
  if (!keywords) return null;
  
  // If not visible, use sr-only class for screen readers and search engines
  const visibilityClass = visible 
    ? 'text-sm text-muted-foreground' 
    : 'sr-only';
  
  return (
    <div 
      className={`keyword-block ${visibilityClass} ${className}`}
      aria-label="Search keywords"
    >
      <span itemProp="keywords">{keywords}</span>
    </div>
  );
};

interface SEOTextBlockProps {
  brand?: string;
  model?: string;
  category?: string;
  applications?: string[];
  description?: string;
}

/**
 * SEO-Rich Text Block for better indexing
 * Includes machine-readable text with brand names, models, and keywords
 */
export const SEOTextBlock: React.FC<SEOTextBlockProps> = ({
  brand,
  model,
  category,
  applications = [],
  description
}) => {
  return (
    <div className="seo-text-block hidden md:block mt-8 p-6 bg-muted/30 rounded-lg">
      <h2 className="text-lg font-semibold mb-4">About This Product</h2>
      
      {brand && model && (
        <p className="text-sm text-muted-foreground mb-2">
          The <strong>{brand} {model}</strong> is a high-quality industrial robot 
          designed for {applications.join(', ') || 'various applications'}.
          {description && ` ${description.substring(0, 150)}...`}
        </p>
      )}
      
      {category && (
        <p className="text-sm text-muted-foreground mb-2">
          Category: <strong>{category}</strong>
        </p>
      )}
      
      {applications.length > 0 && (
        <p className="text-sm text-muted-foreground mb-2">
          Applications: {applications.map((app, i) => (
            <span key={i}>
              <strong>{app}</strong>
              {i < applications.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
      )}
      
      <p className="text-sm text-muted-foreground mt-4">
        Available at <strong>RobotVerse</strong> - India's leading marketplace for 
        used industrial robots, spare parts, and automation services. Browse our 
        extensive collection of {brand || 'industrial'} robots including Fanuc, ABB, 
        KUKA, Yaskawa, and more.
      </p>
    </div>
  );
};

export default KeywordBlock;
