import { containsSqlInjection } from '@/utils/sanitize'

const INDEX_PATTERN = /^\d{6}[A-Za-z]$/
const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~])[A-Za-z\d!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]{8,}$/
const SCRIPT_PATTERN = /<|>|script|javascript:/i

export function toCanonicalIndex(index: string) {
    return index.trim().toUpperCase().slice(0, 6)
}

export function getIndexNumericPart(index: string) {
    return index.trim().toUpperCase().slice(0, 6)
}

export function getStudentEmail(index: string) {
    return `${toCanonicalIndex(index).toLowerCase()}@student.unilearn.edu`
}

export function validateIndexNumber(index: string) {
    const cleanIndex = index.trim().toUpperCase()

    if (!INDEX_PATTERN.test(cleanIndex)) {
        return {
            valid: false,
            error: 'Index number must be in the format 235550X.'
        }
    }

    if (containsSqlInjection(cleanIndex) || SCRIPT_PATTERN.test(cleanIndex)) {
        return {
            valid: false,
            error: 'Invalid characters detected in index number.'
        }
    }

    return {
        valid: true,
        cleanIndex,
        canonicalIndex: toCanonicalIndex(cleanIndex),
    }
}

export function validatePassword(password: string) {
    if (containsSqlInjection(password) || SCRIPT_PATTERN.test(password)) {
        return {
            valid: false,
            error: 'Invalid characters detected in password.'
        }
    }

    if (!PASSWORD_PATTERN.test(password)) {
        return {
            valid: false,
            error: 'Password must be at least 8 characters and include an uppercase letter, a number, and an ASCII special character. Emojis and spaces are not allowed.'
        }
    }

    return {
        valid: true
    }
}

export function validateStudentCredentials(index: string, password: string) {
    const indexValidation = validateIndexNumber(index)
    if (!indexValidation.valid) {
        return indexValidation
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
        return passwordValidation
    }

    return {
        valid: true,
        cleanIndex: indexValidation.cleanIndex,
        canonicalIndex: indexValidation.canonicalIndex,
        numericPart: getIndexNumericPart(indexValidation.cleanIndex),
    }
}
