'use client'

import { useState, useEffect, useCallback } from 'react'
import { BatchInfo } from '@/components/batch-selector'

export interface ModuleContent {
    topics: any[]
    additionalNotes?: string
}

export interface PastPaperStructure {
    totalQuestions: number
    duration: number
    hasMcqs: boolean
    mcqCount: number
    mcqMarks: number
    essayCount: number
    essayMarks: number
    essayQuestions: any[]
}

export interface ContinuousAssessment {
    caNumber: number
    type: string
    weight: number
    description: string
}

export interface BatchContentData {
    batchNumber: number
    content: {
        content_json: ModuleContent
        lecturer_name?: string
        updated_at?: string
    } | null
    pastPaperStructure: {
        structure_json: PastPaperStructure
        updated_at?: string
    } | null
    continuousAssessments: Array<{
        ca_number: number
        ca_type: string
        ca_weight: number
        description: string
    }>
    hasContent: boolean
    hasPaperStructure: boolean
    hasCAs: boolean
}

export function useBatchContent(moduleId: string) {
    const [selectedBatch, setSelectedBatch] = useState<number | null>(null)
    const [userBatchNumber, setUserBatchNumber] = useState<number | null>(null)
    const [availableBatches, setAvailableBatches] = useState<BatchInfo[]>([])
    const [defaultBatch, setDefaultBatch] = useState<number | null>(null)
    const [contentData, setContentData] = useState<BatchContentData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Fetch available batches
    const fetchBatches = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)

            const response = await fetch(`/api/modules/${moduleId}/batches`)
            if (!response.ok) {
                throw new Error('Failed to fetch batches')
            }

            const data = await response.json()

            setUserBatchNumber(data.userBatchNumber)
            setAvailableBatches(data.availableBatches)
            setDefaultBatch(data.defaultBatch)

            // Set selected batch to default if not already set
            if (!selectedBatch) {
                setSelectedBatch(data.defaultBatch)
            }

        } catch (err) {
            console.error('Error fetching batches:', err)
            setError(err instanceof Error ? err.message : 'Failed to fetch batches')
        } finally {
            setIsLoading(false)
        }
    }, [moduleId, selectedBatch])

    // Fetch content for selected batch
    const fetchContent = useCallback(async (batchNumber: number) => {
        try {
            setIsLoading(true)
            setError(null)

            const response = await fetch(`/api/modules/${moduleId}/content?batch=${batchNumber}`)
            if (!response.ok) {
                throw new Error('Failed to fetch content')
            }

            const data: BatchContentData = await response.json()
            setContentData(data)

        } catch (err) {
            console.error('Error fetching content:', err)
            setError(err instanceof Error ? err.message : 'Failed to fetch content')
        } finally {
            setIsLoading(false)
        }
    }, [moduleId])

    // Save content
    const saveContent = useCallback(async (
        contentJson: ModuleContent,
        pastPaperStructure: PastPaperStructure | null,
        continuousAssessments: ContinuousAssessment[],
        lecturerName?: string
    ) => {
        if (!selectedBatch) return

        try {
            setIsSaving(true)
            setError(null)

            const response = await fetch(`/api/modules/${moduleId}/content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    batchNumber: selectedBatch,
                    contentJson,
                    pastPaperStructure,
                    continuousAssessments,
                    lecturerName
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to save content')
            }

            // Refresh content after saving
            await fetchContent(selectedBatch)

            return { success: true }

        } catch (err) {
            console.error('Error saving content:', err)
            setError(err instanceof Error ? err.message : 'Failed to save content')
            return { success: false, error: err instanceof Error ? err.message : 'Failed to save content' }
        } finally {
            setIsSaving(false)
        }
    }, [moduleId, selectedBatch, fetchContent])

    // Clone content from another batch
    const cloneFromBatch = useCallback(async (fromBatch: number) => {
        if (!userBatchNumber) return

        try {
            setIsLoading(true)
            setError(null)

            const response = await fetch(`/api/modules/${moduleId}/clone`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fromBatch,
                    toBatch: userBatchNumber
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to clone content')
            }

            const result = await response.json()

            // Switch to user's batch and refresh content
            setSelectedBatch(userBatchNumber)
            await fetchContent(userBatchNumber)

            return { success: true, ...result }

        } catch (err) {
            console.error('Error cloning content:', err)
            setError(err instanceof Error ? err.message : 'Failed to clone content')
            return { success: false, error: err instanceof Error ? err.message : 'Failed to clone content' }
        } finally {
            setIsLoading(false)
        }
    }, [moduleId, userBatchNumber, fetchContent])

    // Handle batch change
    const handleBatchChange = useCallback((batchNumber: number) => {
        setSelectedBatch(batchNumber)
    }, [])

    // Load batches on mount
    useEffect(() => {
        fetchBatches()
    }, [fetchBatches])

    // Load content when selected batch changes
    useEffect(() => {
        if (selectedBatch !== null) {
            fetchContent(selectedBatch)
        }
    }, [selectedBatch, fetchContent])

    return {
        selectedBatch,
        userBatchNumber,
        availableBatches,
        defaultBatch,
        contentData,
        isLoading,
        isSaving,
        error,
        handleBatchChange,
        saveContent,
        cloneFromBatch,
        refetch: fetchBatches
    }
}
