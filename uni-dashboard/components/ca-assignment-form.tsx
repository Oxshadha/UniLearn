'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, Plus, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'

export interface ContinuousAssessment {
    caNumber: number
    type: 'written_exam' | 'presentation' | 'mcq' | 'practical' | 'video' | 'other'
    weight: number
    description: string
}

interface Props {
    value: ContinuousAssessment[]
    onChange: (value: ContinuousAssessment[]) => void
    canEdit: boolean
}

const CA_TYPES = [
    { value: 'written_exam', label: 'Written Exam' },
    { value: 'presentation', label: 'Presentation' },
    { value: 'mcq', label: 'MCQ Test' },
    { value: 'practical', label: 'Practical' },
    { value: 'video', label: 'Video Project' },
    { value: 'other', label: 'Other' }
] as const

const CA_WEIGHTS = [20, 30, 40, 50] as const

export default function CAAssignmentForm({ value, onChange, canEdit }: Props) {
    const [cas, setCas] = useState<ContinuousAssessment[]>(value || [])

    useEffect(() => {
        setCas(value || [])
    }, [value])

    const totalCAWeight = cas.reduce((sum, ca) => sum + ca.weight, 0)
    const writtenExamWeight = 100 - totalCAWeight

    const addCA = () => {
        if (cas.length < 2) {
            const newCA: ContinuousAssessment = {
                caNumber: cas.length + 1,
                type: 'presentation',
                weight: 30,
                description: ''
            }
            const updated = [...cas, newCA]
            setCas(updated)
            onChange(updated)
        }
    }

    const removeCA = (index: number) => {
        const updated = cas.filter((_, i) => i !== index)
        // Re-number CAs
        updated.forEach((ca, i) => ca.caNumber = i + 1)
        setCas(updated)
        onChange(updated)
    }

    const updateCA = (index: number, field: keyof ContinuousAssessment, newValue: any) => {
        const updated = [...cas]
        updated[index] = { ...updated[index], [field]: newValue }
        setCas(updated)
        onChange(updated)
    }

    // Preview mode
    if (!canEdit) {
        return (
            <Card className="border shadow-sm">
                <CardHeader className="py-3 px-4 bg-blue-50">
                    <CardTitle className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" /> Assessment Structure
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                    {cas.length > 0 ? (
                        <>
                            <div className="space-y-2">
                                {cas.map((ca, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                        <div className="flex-1">
                                            <span className="font-medium text-sm">CA {ca.caNumber}:</span>
                                            <span className="text-sm ml-2">{CA_TYPES.find(t => t.value === ca.type)?.label}</span>
                                            {ca.description && (
                                                <p className="text-xs text-gray-600 ml-6">{ca.description}</p>
                                            )}
                                        </div>
                                        <Badge className="bg-blue-100 text-blue-700">{ca.weight}%</Badge>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                                <span className="font-medium text-sm text-green-800">Written Exam (Final)</span>
                                <Badge className="bg-green-600 text-white">{writtenExamWeight}%</Badge>
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-gray-500">No continuous assessments configured yet.</p>
                    )}
                </CardContent>
            </Card>
        )
    }

    // Edit mode
    return (
        <Card className="border shadow-sm">
            <CardHeader className="py-3 px-4 bg-blue-50">
                <CardTitle className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" /> Assessment Structure
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Continuous Assessments</Label>
                    {cas.length < 2 && (
                        <Button
                            onClick={addCA}
                            size="sm"
                            variant="outline"
                            className="h-8"
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            Add CA {cas.length + 1}
                        </Button>
                    )}
                </div>

                {cas.length > 0 && (
                    <div className="space-y-4">
                        {cas.map((ca, i) => (
                            <div key={i} className="p-3 border rounded-lg bg-gray-50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm">CA {ca.caNumber}</h4>
                                    <Button
                                        onClick={() => removeCA(i)}
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label htmlFor={`ca-type-${i}`} className="text-xs">Type</Label>
                                        <select
                                            id={`ca-type-${i}`}
                                            value={ca.type}
                                            onChange={(e) => updateCA(i, 'type', e.target.value)}
                                            className="w-full mt-1 h-9 border-2 border-gray-200 rounded-md px-2 text-sm focus:border-blue-500 focus:outline-none"
                                        >
                                            {CA_TYPES.map(type => (
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <Label htmlFor={`ca-weight-${i}`} className="text-xs">Weight (%)</Label>
                                        <select
                                            id={`ca-weight-${i}`}
                                            value={ca.weight}
                                            onChange={(e) => updateCA(i, 'weight', parseInt(e.target.value))}
                                            className="w-full mt-1 h-9 border-2 border-gray-200 rounded-md px-2 text-sm focus:border-blue-500 focus:outline-none"
                                        >
                                            {CA_WEIGHTS.map(weight => (
                                                <option key={weight} value={weight}>
                                                    {weight}%
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor={`ca-desc-${i}`} className="text-xs">Description (optional)</Label>
                                    <Input
                                        id={`ca-desc-${i}`}
                                        value={ca.description}
                                        onChange={(e) => updateCA(i, 'description', e.target.value)}
                                        placeholder="E.g., Group presentation on AI topics"
                                        className="mt-1 h-9 text-sm"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className={`p-3 rounded-lg ${totalCAWeight > 100 ? 'bg-red-50 border border-red-300' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                            Written Exam (Final)
                        </span>
                        <Badge className={totalCAWeight > 100 ? 'bg-red-600' : 'bg-green-600'}>
                            {writtenExamWeight}%
                        </Badge>
                    </div>
                    {totalCAWeight > 100 && (
                        <p className="text-xs text-red-600 mt-1">
                            ⚠️ Total CA weight exceeds 100%. Please adjust.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
