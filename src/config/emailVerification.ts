// Email verification configuration
export const EMAIL_VERIFICATION_CONFIG = {
  // Set to 'neverbounce' for full API verification or 'simple' for basic validation
  method: 'neverbounce' as 'neverbounce' | 'simple',
  
  // Function names for each method
  functions: {
    neverbounce: 'verify-email',
    simple: 'verify-email-simple'
  }
};

// Helper function to get the current verification function name
export const getVerificationFunction = () => {
  return EMAIL_VERIFICATION_CONFIG.functions[EMAIL_VERIFICATION_CONFIG.method];
};
