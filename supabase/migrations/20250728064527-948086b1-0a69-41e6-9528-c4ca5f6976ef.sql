-- Update existing profiles where user_type is null but account_type is set
UPDATE profiles 
SET user_type = account_type 
WHERE user_type IS NULL AND account_type IS NOT NULL;

-- Update existing profiles where both are null but seller_roles exist (assume seller)
UPDATE profiles 
SET user_type = 'seller', account_type = 'seller'
WHERE user_type IS NULL AND account_type IS NULL AND array_length(seller_roles, 1) > 0;

-- Update remaining null user_types to default buyer type
UPDATE profiles 
SET user_type = 'buyer', account_type = 'buyer'
WHERE user_type IS NULL;