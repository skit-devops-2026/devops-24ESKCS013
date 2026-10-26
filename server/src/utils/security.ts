/**
 * Security & Sanitization Utilities for Student Hub
 */

/**
 * Safely escapes special regular expression characters in user-provided search strings
 * to protect against ReDoS (Regular Expression Denial of Service) and unhandled regex syntax errors.
 */
export function escapeRegExp(str: string): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
