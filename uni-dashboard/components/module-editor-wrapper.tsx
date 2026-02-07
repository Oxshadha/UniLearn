'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Copy, CheckCircle, AlertCircle, Info, FileText } from 'lucide-react'
import BatchSelector, { BatchInfo } from './batch-selector'
import ModuleEditor from './module-editor'

interface Props {
    moduleId: string
    canEdit: boolean
    userBatchNumber: number
    userIndex?: string
}

export default function ModuleEditorWrapper({
    moduleId,
    canEdit,
    userBatchNumber,
    userIndex
}: Props) {
    const [selectedBatch, setSelectedBatch] = useState<number>(userBatchNumber)
    const [availableBatches, setAvailableBatches] = useState<BatchInfo[]>([])
    const [defaultBatch, setDefaultBatch] = useState<number>(userBatchNumber)
    const [contentData, setContentData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isCloning, setIsCloning] = useState(false)
    const [cloneSuccess, setCloneSuccess] = useState(false)

    // Fetch available batches
    useEffect(() => {
        async function fetchBatches() {
            try {
                const res = await fetch(`/api/modules/${moduleId}/batches`)
                if (!res.ok) throw new Error('Failed to fetch batches')

                const data = await res.json()
                setAvailableBatches(data.availableBatches || [])
                setDefaultBatch(data.defaultBatch || userBatchNumber)
                setSelectedBatch(data.defaultBatch || userBatchNumber)
            } catch (err) {
                console.error('Error fetching batches:', err)
                const batches: BatchInfo[] = [
                    { batchNumber: userBatchNumber, hasContent: false, hasPaperStructure: false, hasCAs: false },
                    { batchNumber: userBatchNumber - 1, hasContent: false, hasPaperStructure: false, hasCAs: false },
                    { batchNumber: userBatchNumber - 2, hasContent: false, hasPaperStructure: false, hasCAs: false },
                    { batchNumber: userBatchNumber - 3, hasContent: false, hasPaperStructure: false, hasCAs: false },
                ].filter(b => b.batchNumber > 0)
                setAvailableBatches(batches)
                setSelectedBatch(userBatchNumber)
            }
        }

        fetchBatches()
    }, [moduleId, userBatchNumber])

    // Fetch content for selected batch
    useEffect(() => {
        async function fetchContent() {
            if (!selectedBatch) return

            try {
                setIsLoading(true)
                setError(null)

                const res = await fetch(`/api/modules/${moduleId}/content?batch=${selectedBatch}`)
                if (!res.ok) throw new Error('Failed to fetch content')

                const data = await res.json()
                setContentData(data)
            } catch (err) {
                console.error('Error fetching content:', err)
                setError(err instanceof Error ? err.message : 'Failed to load content')
            } finally {
                setIsLoading(false)
            }
        }

        fetchContent()
    }, [moduleId, selectedBatch])

    // Clone functionality
    const handleClone = async () => {
        if (!selectedBatch || selectedBatch === userBatchNumber) return

        try {
            setIsCloning(true)
            setError(null)

            const res = await fetch(`/api/modules/${moduleId}/clone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromBatch: selectedBatch,
                    toBatch: userBatchNumber
                })
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Failed to clone')
            }

            setCloneSuccess(true)
            setSelectedBatch(userBatchNumber)
            setTimeout(() => setCloneSuccess(false), 3000)
        } catch (err) {
            console.error('Clone error:', err)
            setError(err instanceof Error ? err.message : 'Failed to clone content')
        } finally {
            setIsCloning(false)
        }
    }

    if (isLoading && availableBatches.length === 0) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    const isViewingOwnBatch = selectedBatch === userBatchNumber
    const hasTopics = contentData?.content?.content_json?.topics?.length > 0
    const canEditTopics = isViewingOwnBatch && canEdit
    const canEditPapersAndCA = canEdit // Can always edit if user can edit

    return (
        <div className="space-y-4">
            {/* Batch Selector */}
            <BatchSelector
                moduleId={moduleId}
                currentUserBatch={userBatchNumber}
                selectedBatch={selectedBatch}
                onBatchChange={setSelectedBatch}
                availableBatches={availableBatches}
                defaultBatch={defaultBatch}
            />

            {/* Clone Success Alert */}
            {cloneSuccess && (
                <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                        Content cloned to Batch {userBatchNumber}!
                    </AlertDescription>
                </Alert>
            )}

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Info when viewing different batch */}
            {!isViewingOwnBatch && hasTopics && (
                <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-sm">
                        <strong>Viewing Batch {selectedBatch}</strong> • Topics are read-only. Past Papers & CA are editable.
                    </AlertDescription>
                </Alert>
            )}

            {/* Clone Button for Topics */}
            {!isViewingOwnBatch && hasTopics && canEdit && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-blue-900">
                                Clone topics to Batch {userBatchNumber} to edit them
                            </p>
                            <Button
                                onClick={handleClone}
                                disabled={isCloning}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {isCloning ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Cloning...
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-4 w-4 mr-2" />
                                        Clone to B{userBatchNumber}
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Topics Section - Only show if topics exist */}
            {(hasTopics || canEditTopics) ? (
                <ModuleEditor
                    moduleId={moduleId}
                    canEdit={canEditTopics}
                    userBatchId={selectedBatch.toString()}
                    userIndex={userIndex}
                />
            ) : (
                canEditTopics && (
                    <Card className="border-dashed border-2">
                        <CardContent className="p-12 text-center">
                            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 mb-2">No topics yet</p>
                            <p className="text-sm text-gray-400">Content will appear here when added</p>
                        </CardContent>
                    </Card>
                )
            )}
        </div>
    )
}
