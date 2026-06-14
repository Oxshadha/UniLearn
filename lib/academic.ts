export function getYearFromSemester(currentSemester: number | null | undefined) {
    if (!currentSemester || currentSemester < 1) {
        return 0
    }

    return Math.ceil(currentSemester / 2)
}

export function canEditModuleAtSemester(
    currentSemester: number | null | undefined,
    moduleSemester: number | null | undefined
) {
    if (!currentSemester || !moduleSemester) {
        return false
    }

    return currentSemester >= moduleSemester
}

export function getCurrentYearSuffix(referenceDate: Date = new Date()) {
    return referenceDate.getFullYear() % 100
}

export function getAcademicYearFromBatchNumber(
    batchNumber: number | null | undefined,
    referenceDate: Date = new Date()
) {
    if (!batchNumber) {
        return 0
    }

    const year = getCurrentYearSuffix(referenceDate) - batchNumber
    return Math.max(1, year)
}

export function getStartingSemesterForBatch(
    batchNumber: number | null | undefined,
    referenceDate: Date = new Date()
) {
    const academicYear = getAcademicYearFromBatchNumber(batchNumber, referenceDate)
    return Math.max(1, academicYear * 2 - 1)
}
