'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'

export interface BatchInfo {
    batchNumber: number
    hasContent: boolean
    hasPaperStructure: boolean
    hasCAs: boolean
    contentUpdatedAt?: string
    paperUpdatedAt?: string
    caUpdatedAt?: string
    lecturerName?: string
}

interface Props {
    moduleId: string
    currentUserBatch: number
    selectedBatch: number
    onBatchChange: (batch: number) => void
    availableBatches: BatchInfo[]
    defaultBatch: number
}

export default function BatchSelector({
    currentUserBatch,
    selectedBatch,
    onBatchChange,
    availableBatches,
}: Props) {
    const hasAnyContent = (batch: BatchInfo) =>
        batch.hasContent || batch.hasPaperStructure || batch.hasCAs

    return (
        <div className="bg-white rounded-lg p-3 border shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <h3 className="font-semibold text-sm text-gray-900">Version</h3>
                </div>

                {/* Compact batch buttons */}
                <div className="flex gap-1">
                    {availableBatches.map((batch) => {
                        const isSelected = selectedBatch === batch.batchNumber
                        const isUserBatch = currentUserBatch === batch.batchNumber
                        const hasContent = hasAnyContent(batch)

                        return (
                            <button
                                key={batch.batchNumber}
                                onClick={() => onBatchChange(batch.batchNumber)}
                                className={cn(
                                    'px-3 py-1.5 rounded text-sm font-medium transition-all',
                                    isSelected && 'bg-blue-600 text-white shadow',
                                    !isSelected && hasContent && 'bg-gray-100 hover:bg-gray-200 text-gray-700',
                                    !isSelected && !hasContent && 'bg-gray-50 text-gray-400',
                                )}
                                title={`Batch ${batch.batchNumber}${isUserBatch ? ' (Your batch)' : ''}`}
                            >
                                B{batch.batchNumber}
                                {isUserBatch && <span className="ml-1">✓</span>}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
