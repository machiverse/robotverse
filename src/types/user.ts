// Centralized user type definitions
export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  user_type?: 'buyer' | 'seller' | 'service_provider' | 'logistics_provider' | 'finance_provider';
  account_type?: string;
  seller_roles?: string[];
  service_categories?: string[];
  company_name?: string;
  phone?: string;
  verification_status?: boolean;
  created_at: string;
  updated_at?: string; // Make this optional to match all usages
  // Allow additional properties for database flexibility
  [key: string]: any;
}

// Database profile interface for raw data from Supabase
export interface DatabaseProfile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  user_type?: string;
  account_type?: string;
  seller_roles?: string[];
  service_categories?: string[];
  company_name?: string;
  phone?: string;
  verification_status?: boolean;
  created_at: string;
  updated_at?: string;
  [key: string]: any;
}

// Helper function to convert database profile to UserProfile
export const convertToUserProfile = (dbProfile: DatabaseProfile): UserProfile => {
  const validUserTypes: Array<'buyer' | 'seller' | 'service_provider' | 'logistics_provider' | 'finance_provider'> = 
    ['buyer', 'seller', 'service_provider', 'logistics_provider', 'finance_provider'];
  
  let userType: UserProfile['user_type'] = undefined;
  
  const typeToCheck = dbProfile.user_type || dbProfile.account_type;
  if (typeToCheck && validUserTypes.includes(typeToCheck as any)) {
    userType = typeToCheck as UserProfile['user_type'];
  } else if (typeToCheck) {
    switch (typeToCheck.toLowerCase()) {
      case 'logistics':
        userType = 'logistics_provider';
        break;
      case 'finance':
        userType = 'finance_provider';
        break;
      case 'service':
        userType = 'service_provider';
        break;
      default:
        userType = 'buyer';
    }
  }

  return {
    id: dbProfile.id,
    user_id: dbProfile.user_id,
    email: dbProfile.email,
    full_name: dbProfile.full_name,
    user_type: userType,
    account_type: dbProfile.account_type,
    seller_roles: dbProfile.seller_roles || [],
    service_categories: dbProfile.service_categories || [],
    company_name: dbProfile.company_name,
    phone: dbProfile.phone,
    verification_status: dbProfile.verification_status,
    created_at: dbProfile.created_at,
    updated_at: dbProfile.updated_at
  };
};