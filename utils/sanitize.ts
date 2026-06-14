/**
 * Input Sanitization Utilities
 * Prevents XSS, SQL injection, and other security threats on the frontend
 */

import DOMPurify from 'dompurify'

/**
 * Sanitize text input to prevent XSS attacks
 * Removes HTML tags and dangerous scripts
 */
export function sanitizeText(input: string): string {
    if (!input) return ''

    // Remove any HTML tags and scripts
    const cleaned = DOMPurify.sanitize(input, {
        ALLOWED_TAGS: [], // No HTML tags allowed
        ALLOWED_ATTR: []
    })

    return cleaned.trim()
}

/**
 * Sanitize HTML content while allowing safe formatting
 * Used for rich text editors
 */
export function sanitizeHtml(input: string): string {
    if (!input) return ''

    // Allow only safe HTML tags for formatting
    const cleaned = DOMPurify.sanitize(input, {
        ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: []
    })

    return cleaned
}

/**
 * Escape HTML special characters
 * Converts <, >, &, ", ' to their HTML entities
 */
export function escapeHtml(text: string): string {
    if (!text) return ''

    const map: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    }

    return text.replace(/[&<>"'/]/g, (char) => map[char])
}

/**
 * Validate and sanitize module code format
 * Expected format: PREFIX + 4 DIGITS (e.g., IN1621, CM2345)
 * First digit should match the year
 */
export function validateModuleCode(code: string, year: number): {
    isValid: boolean
    sanitized: string
    error?: string
} {
    if (!code) {
        return { isValid: false, sanitized: '', error: 'Module code is required' }
    }

    // Sanitize input first
    const cleaned = code.trim().toUpperCase()

    // Check format: 2 letters + 4 digits
    const pattern = /^[A-Z]{2}\d{4}$/
    if (!pattern.test(cleaned)) {
        return {
            isValid: false,
            sanitized: cleaned,
            error: 'Format must be 2 letters + 4 digits (e.g., IN1621)'
        }
    }

    // Extract first digit
    const firstDigit = parseInt(cleaned.substring(2, 3))

    // Validate year matching
    // Year 1 should have first digit 1 or 2, Year 2 should have 2 or 3, etc.
    const expectedDigits = [year, year + 1]

    if (!expectedDigits.includes(firstDigit)) {
        return {
            isValid: false,
            sanitized: cleaned,
            error: `Year ${year} modules should start with ${year} or ${year + 1} (e.g., ${cleaned.substring(0, 2)}${year}XXX)`
        }
    }

    return { isValid: true, sanitized: cleaned }
}

/**
 * Prevent SQL injection patterns in input
 * Returns true if input contains suspicious SQL patterns
 */
export function containsSqlInjection(input: string): boolean {
    if (!input) return false

    const sqlPatterns = [
        /(\bOR\b|\bAND\b).*?=.*?/i,
        /;.*?(DROP|DELETE|INSERT|UPDATE|SELECT)/i,
        /UNION.*?SELECT/i,
        /'.*?OR.*?'.*?='/i,
        /--/,
        /\/\*/,
        /xp_/i,
        /EXEC(\s|\()/i
    ]

    return sqlPatterns.some(pattern => pattern.test(input))
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
    if (!email) return ''

    // Remove any whitespace and convert to lowercase
    const cleaned = email.trim().toLowerCase()

    // Basic email validation pattern
    const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/

    if (!emailPattern.test(cleaned)) {
        return ''
    }

    return cleaned
}

/**
 * Sanitize general form input
 * Combines text sanitization with SQL injection check
 */
export function sanitizeFormInput(input: string): string {
    if (!input) return ''

    // Check for SQL injection first
    if (containsSqlInjection(input)) {
        console.warn('Potential SQL injection detected')
        return ''
    }

    // Sanitize the text
    return sanitizeText(input)
}
