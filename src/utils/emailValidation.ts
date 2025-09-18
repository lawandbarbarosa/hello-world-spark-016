export interface EmailValidationResult {
  isValid: boolean;
  email: string;
  error?: string;
}

/**
 * Comprehensive email validation that checks for:
 * - Proper email format
 * - Valid characters
 * - Common typos and issues
 * - Domain structure
 */
export const validateEmail = (email: string): EmailValidationResult => {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      email: email || '',
      error: 'Email is required'
    };
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Check for empty email after trimming
  if (!trimmedEmail) {
    return {
      isValid: false,
      email: email,
      error: 'Email cannot be empty'
    };
  }

  // Check for basic structure (must have @ and .)
  if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
    return {
      isValid: false,
      email: email,
      error: 'Email must contain @ and domain extension'
    };
  }

  // More comprehensive regex for email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return {
      isValid: false,
      email: email,
      error: 'Invalid email format'
    };
  }

  // Split email into local and domain parts
  const [localPart, ...domainParts] = trimmedEmail.split('@');
  const domain = domainParts.join('@'); // Rejoin in case there were multiple @

  // Check for multiple @ symbols
  if (domainParts.length !== 1) {
    return {
      isValid: false,
      email: email,
      error: 'Email cannot contain multiple @ symbols'
    };
  }

  // Validate local part (before @)
  if (!localPart || localPart.length === 0) {
    return {
      isValid: false,
      email: email,
      error: 'Email must have content before @'
    };
  }

  if (localPart.length > 64) {
    return {
      isValid: false,
      email: email,
      error: 'Email local part too long (max 64 characters)'
    };
  }

  // Check for consecutive dots in local part
  if (localPart.includes('..')) {
    return {
      isValid: false,
      email: email,
      error: 'Email cannot contain consecutive dots'
    };
  }

  // Check for leading/trailing dots in local part
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return {
      isValid: false,
      email: email,
      error: 'Email cannot start or end with a dot'
    };
  }

  // Validate domain part (after @)
  if (!domain || domain.length === 0) {
    return {
      isValid: false,
      email: email,
      error: 'Email must have domain after @'
    };
  }

  if (domain.length > 253) {
    return {
      isValid: false,
      email: email,
      error: 'Email domain too long'
    };
  }

  // Check domain structure
  const domainParts2 = domain.split('.');
  if (domainParts2.length < 2) {
    return {
      isValid: false,
      email: email,
      error: 'Email domain must have at least one dot'
    };
  }

  // Check each domain part
  for (const part of domainParts2) {
    if (!part || part.length === 0) {
      return {
        isValid: false,
        email: email,
        error: 'Email domain cannot have empty parts'
      };
    }

    if (part.length > 63) {
      return {
        isValid: false,
        email: email,
        error: 'Email domain part too long'
      };
    }

    // Domain parts cannot start or end with hyphen
    if (part.startsWith('-') || part.endsWith('-')) {
      return {
        isValid: false,
        email: email,
        error: 'Email domain parts cannot start or end with hyphen'
      };
    }
  }

  // Check for valid TLD (top-level domain)
  const tld = domainParts2[domainParts2.length - 1];
  if (tld.length < 2) {
    return {
      isValid: false,
      email: email,
      error: 'Email domain extension must be at least 2 characters'
    };
  }

  // Check for common typos in domains
  const commonTypos = [
    'gmial.com', 'gmai.com', 'gmail.co', 'yahooo.com', 'yahoo.co', 
    'hotmial.com', 'hotmai.com', 'outlok.com', 'outloo.com'
  ];
  
  if (commonTypos.includes(domain)) {
    return {
      isValid: false,
      email: email,
      error: 'Possible typo in email domain'
    };
  }

  // All checks passed
  return {
    isValid: true,
    email: trimmedEmail
  };
};

/**
 * Validate multiple emails and return results with statistics
 */
export const validateEmailList = (emails: string[]): {
  validEmails: string[];
  invalidEmails: { email: string; error: string }[];
  statistics: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
  };
} => {
  const validEmails: string[] = [];
  const invalidEmails: { email: string; error: string }[] = [];
  const seenEmails = new Set<string>();
  let duplicateCount = 0;

  for (const email of emails) {
    const result = validateEmail(email);
    
    if (result.isValid) {
      if (seenEmails.has(result.email)) {
        duplicateCount++;
      } else {
        seenEmails.add(result.email);
        validEmails.push(result.email);
      }
    } else {
      invalidEmails.push({
        email: result.email,
        error: result.error || 'Invalid email'
      });
    }
  }

  return {
    validEmails,
    invalidEmails,
    statistics: {
      total: emails.length,
      valid: validEmails.length,
      invalid: invalidEmails.length,
      duplicates: duplicateCount
    }
  };
};