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
