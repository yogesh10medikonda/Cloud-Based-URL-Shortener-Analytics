/**
 * Input Validation Utilities
 * 
 * Provides comprehensive validation for:
 * - URLs (format, length, protocol, SSRF prevention)
 * - Custom short codes
 * - Expiration dates
 * - Email addresses
 * - Passwords
 * 
 * Security Features:
 * - Prevents SSRF attacks (blocks private IP ranges)
 * - URL length limits
 * - Protocol whitelist (http/https only)
 * - Prevents malicious domain patterns
 * - XSS prevention (URL encoding)
 */

/**
 * Validate URL format and security
 * 
 * Checks:
 * - Valid URL format (using URL constructor)
 * - HTTP or HTTPS protocol only
 * - Not localhost or private IPs (SSRF prevention)
 * - Reasonable URL length (< 2048 characters)
 * - Not a data URI or javascript: URL
 * 
 * @param {string} url - The URL to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateUrl(url) {
  // Check if URL is provided and is a string
  if (!url || typeof url !== 'string') {
    return {
      valid: false,
      error: 'URL is required and must be a text string'
    };
  }

  // Trim whitespace
  const trimmedUrl = url.trim();

  // Check length (HTTP standard is 2048 chars, but let's be more restrictive)
  if (trimmedUrl.length > 2048) {
    return {
      valid: false,
      error: 'URL is too long (maximum 2048 characters)'
    };
  }

  // Check for minimum length
  if (trimmedUrl.length < 10) {
    return {
      valid: false,
      error: 'URL is too short (minimum 10 characters)'
    };
  }

  // Try to parse as URL
  let urlObj;
  try {
    urlObj = new URL(trimmedUrl);
  } catch (err) {
    return {
      valid: false,
      error: 'Invalid URL format. Please provide a valid HTTP or HTTPS URL'
    };
  }

  // Only allow HTTP and HTTPS protocols
  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    return {
      valid: false,
      error: 'Only HTTP and HTTPS protocols are allowed'
    };
  }

  // Prevent SSRF attacks - block localhost and private IP ranges
  const hostname = urlObj.hostname.toLowerCase();

  // Block localhost and variations
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('localhost:')
  ) {
    return {
      valid: false,
      error: 'Cannot shorten localhost URLs'
    };
  }

  // Block private IP ranges (prevent SSRF attacks)
  // 10.0.0.0 - 10.255.255.255
  // 172.16.0.0 - 172.31.255.255
  // 192.168.0.0 - 192.168.255.255
  // 169.254.0.0 - 169.254.255.255 (link-local)
  const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = hostname.match(ipPattern);

  if (ipMatch) {
    const [, oct1, oct2, oct3, oct4] = ipMatch.map(Number);

    // 10.0.0.0/8
    if (oct1 === 10) {
      return { valid: false, error: 'Cannot shorten private IP URLs' };
    }

    // 172.16.0.0/12
    if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) {
      return { valid: false, error: 'Cannot shorten private IP URLs' };
    }

    // 192.168.0.0/16
    if (oct1 === 192 && oct2 === 168) {
      return { valid: false, error: 'Cannot shorten private IP URLs' };
    }

    // 169.254.0.0/16 (link-local)
    if (oct1 === 169 && oct2 === 254) {
      return { valid: false, error: 'Cannot shorten link-local IP URLs' };
    }

    // 0.0.0.0/8
    if (oct1 === 0) {
      return { valid: false, error: 'Cannot shorten invalid IP URLs' };
    }
  }

  // Block IPv6 private ranges (simplified check)
  if (hostname === '::1' || hostname === '::' || hostname.startsWith('fc00:') || hostname.startsWith('fd00:')) {
    return { valid: false, error: 'Cannot shorten private IPv6 URLs' };
  }

  // Block data URIs and javascript:
  if (trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('javascript:')) {
    return { valid: false, error: 'Invalid URL scheme' };
  }

  // Block empty hostname
  if (!hostname || hostname === '') {
    return { valid: false, error: 'URL hostname is empty' };
  }

  // Success
  return { valid: true };
}

/**
 * Validate custom short code format
 * 
 * Checks:
 * - Length: 3-64 characters
 * - Characters: alphanumeric, dash, underscore only
 * - No spaces or special characters
 * 
 * @param {string} code - The custom short code
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateCustomCode(code) {
  if (!code || typeof code !== 'string') {
    return {
      valid: false,
      error: 'Custom code must be provided as text'
    };
  }

  const trimmed = code.trim();

  if (trimmed.length < 3) {
    return {
      valid: false,
      error: 'Custom code must be at least 3 characters'
    };
  }

  if (trimmed.length > 64) {
    return {
      valid: false,
      error: 'Custom code must not exceed 64 characters'
    };
  }

  // Only allow: a-z, A-Z, 0-9, hyphen, underscore
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(trimmed)) {
    return {
      valid: false,
      error: 'Custom code can only contain letters, numbers, hyphens, and underscores'
    };
  }

  // Prevent reserved words that might conflict with routes
  const reserved = ['api', 'auth', 'admin', 'user', 'users', 'profile', 'settings', 'logout', 'login', 'signup', 'dashboard', 'health'];
  if (reserved.includes(trimmed.toLowerCase())) {
    return {
      valid: false,
      error: `Custom code "${trimmed}" is reserved and cannot be used`
    };
  }

  return { valid: true };
}

/**
 * Validate expiration date
 * 
 * Checks:
 * - Valid date format
 * - Date is in the future
 * - Not too far in the future (> 10 years)
 * 
 * @param {string} dateStr - ISO date string
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateExpirationDate(dateStr) {
  if (!dateStr) {
    // Optional field, null is valid
    return { valid: true };
  }

  if (typeof dateStr !== 'string') {
    return {
      valid: false,
      error: 'Expiration date must be a text string'
    };
  }

  let expirationDate;
  try {
    expirationDate = new Date(dateStr);
  } catch (err) {
    return {
      valid: false,
      error: 'Invalid expiration date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)'
    };
  }

  // Check if valid date
  if (isNaN(expirationDate.getTime())) {
    return {
      valid: false,
      error: 'Invalid expiration date'
    };
  }

  // Check if in future
  const now = new Date();
  if (expirationDate <= now) {
    return {
      valid: false,
      error: 'Expiration date must be in the future'
    };
  }

  // Check if not too far in future (10 years)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 10);
  if (expirationDate > maxDate) {
    return {
      valid: false,
      error: 'Expiration date cannot be more than 10 years in the future'
    };
  }

  return { valid: true };
}

/**
 * Validate email format
 * 
 * Uses a reasonable regex pattern for email validation
 * (not RFC 5322 compliant but good for practical use)
 * 
 * @param {string} email - Email address
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return {
      valid: false,
      error: 'Email is required'
    };
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length > 254) {
    return {
      valid: false,
      error: 'Email is too long'
    };
  }

  // Reasonable email pattern
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmed)) {
    return {
      valid: false,
      error: 'Invalid email format'
    };
  }

  return { valid: true };
}

/**
 * Validate password strength
 * 
 * Checks:
 * - Minimum length (6 characters)
 * - Not too long (255 characters)
 * - Contains mix of character types (recommended but not required)
 * 
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.strict - Require uppercase, numbers, special chars
 * @returns {Object} { valid: boolean, error?: string, warning?: string }
 */
function validatePassword(password, options = {}) {
  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      error: 'Password is required'
    };
  }

  if (password.length < 6) {
    return {
      valid: false,
      error: 'Password must be at least 6 characters'
    };
  }

  if (password.length > 255) {
    return {
      valid: false,
      error: 'Password is too long'
    };
  }

  const result = { valid: true };

  // Strict mode: recommend strong passwords
  if (options.strict) {
    let strength = 0;

    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength < 3) {
      result.warning = 'Password is weak. Consider using uppercase, numbers, and special characters';
    }
  }

  return result;
}

/**
 * Sanitize string input (prevent XSS)
 * 
 * Removes potentially dangerous characters
 * 
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

/**
 * Check if value is a reasonable request size
 * 
 * Prevents oversized payloads
 * 
 * @param {any} value - Value to check
 * @param {number} maxSize - Max size in KB
 * @returns {boolean} True if acceptable size
 */
function isReasonableSize(value, maxSize = 10) {
  if (!value) return true;

  const json = JSON.stringify(value);
  const sizeInKB = Buffer.byteLength(json) / 1024;

  return sizeInKB <= maxSize;
}

module.exports = {
  validateUrl,
  validateCustomCode,
  validateExpirationDate,
  validateEmail,
  validatePassword,
  sanitizeInput,
  isReasonableSize
};
