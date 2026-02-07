'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import RichTextArea, { FormattedContent } from './rich-text-editor'
import { Folder, HelpCircle, PenLine, BookOpen } from 'lucide-react'

export interface EssayQuestion {
    topics: string
    marks: number  // Individual marks for this question
}

export interface PastPaperStructure {
    totalQuestions: number
    duration: string
    hasMcqs: boolean
    mcqCount: number
    mcqMarks: number
    mcqNotes: string
    essayCount: number
    essayMarks: number
    essayQuestions: EssayQuestion[]
    generalNotes: string
}

export const defaultPaperStructure: PastPaperStructure = {
    totalQuestions: 0,
    duration: '',
    hasMcqs: false,
    mcqCount: 0,
    mcqMarks: 0,
    mcqNotes: '',
    essayCount: 0,
    essayMarks: 0,
    essayQuestions: [],
    generalNotes: ''
}

interface Props {
    value: PastPaperStructure
    onChange: (value: PastPaperStructure) => void
    canEdit: boolean
}

export default function PastPaperForm({ value, onChange, canEdit }: Props) {
    const update = (field: keyof PastPaperStructure, newValue: any) => {
        onChange({ ...value, [field]: newValue })
    }

    const updateEssayCount = (count: number) => {
        const currentQuestions = value.essayQuestions || []
        const newQuestions: EssayQuestion[] = []

        for (let i = 0; i < count; i++) {
            newQuestions.push(currentQuestions[i] || { topics: '', marks: 0 })
        }

        onChange({ ...value, essayCount: count, essayQuestions: newQuestions })
    }

    const updateEssayQuestion = (index: number, field: 'topics' | 'marks', newValue: string | number) => {
        const questions = [...(value.essayQuestions || [])]
        questions[index] = { ...questions[index], [field]: newValue }
        update('essayQuestions', questions)
    }

    const totalMarks = (value.hasMcqs ? value.mcqMarks : 0) + value.essayMarks

    if (!canEdit) {
        return (
            <Card className="border shadow-sm">
                <CardHeader className="py-3 px-4 bg-orange-50">
                    <CardTitle className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                        <Folder className="h-4 w-4" /> Past Paper Structure
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                    {value.totalQuestions > 0 ? (
                        <>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="bg-blue-50">
                                    {value.totalQuestions} Questions
                                </Badge>
                                {value.duration && (
                                    <Badge variant="outline" className="bg-green-50">
                                        {value.duration}
                                    </Badge>
                                )}
                                {totalMarks > 0 && (
                                    <Badge variant="outline" className="bg-purple-50">
                                        {totalMarks} Marks
                                    </Badge>
                                )}
                            </div>

                            <div className="space-y-2 text-sm">
                                {value.hasMcqs && (
                                    <div className="flex items-start gap-2">
                                        <HelpCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                                        <div>
                                            <span className="font-medium">MCQs: </span>
                                            <span>{value.mcqCount} questions ({value.mcqMarks} marks)</span>
                                            {value.mcqNotes && (
                                                <div className="text-gray-500 text-xs mt-1">
                                                    <FormattedContent content={value.mcqNotes} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {value.essayCount > 0 && (
                                    <div className="flex items-start gap-2">
                                        <PenLine className="h-4 w-4 text-green-500 mt-0.5" />
                                        <div className="flex-1">
                                            <span className="font-medium">Essay Questions: </span>
                                            <span>{value.essayCount} questions ({value.essayMarks} marks)</span>
                                            {value.essayQuestions?.map((q, i) => q.topics && (
                                                <div key={i} className="mt-1 p-2 bg-green-50 rounded text-xs">
                                                    <strong>Q{i + 1}:</strong>
                                                    <FormattedContent content={q.topics} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {value.generalNotes && (
                                <div className="pt-2 border-t">
                                    <FormattedContent content={value.generalNotes} className="text-sm text-gray-600" />
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-gray-500">No past paper structure added yet.</p>
                    )}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border shadow-sm">
            <CardHeader className="py-3 px-4 bg-orange-50">
                <CardTitle className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                    <Folder className="h-4 w-4" /> Past Paper Structure
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs">Total Questions</Label>
                        <Input
                            type="number"
                            min="0"
                            value={value.totalQuestions || ''}
                            onChange={(e) => update('totalQuestions', parseInt(e.target.value) || 0)}
                            placeholder="e.g., 50"
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Duration</Label>
                        <Input
                            value={value.duration || ''}
                            onChange={(e) => update('duration', e.target.value)}
                            placeholder="e.g., 3 hours"
                            className="mt-1"
                        />
                    </div>
                </div>

                {/* MCQ Section */}
                <div className="p-3 bg-blue-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <HelpCircle className="h-4 w-4 text-blue-600" />
                            <Label className="font-medium text-blue-800">MCQ Section</Label>
                        </div>
                        <Switch
                            checked={value.hasMcqs}
                            disabled={!canEdit}
                            onCheckedChange={(checked: boolean) => {
                                update('hasMcqs', checked)
                                // If MCQ is turned OFF, auto-set essay marks to 100
                                if (!checked) {
                                    update('essayMarks', 100)
                                }
                            }}
                        />
                    </div>
                    {value.hasMcqs && (
                        <div className="space-y-3 pt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Number of MCQs</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={value.mcqCount || ''}
                                        onChange={(e) => update('mcqCount', parseInt(e.target.value) || 0)}
                                        placeholder="e.g., 20"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">MCQ Marks</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={value.mcqMarks || ''}
                                        onChange={(e) => update('mcqMarks', parseInt(e.target.value) || 0)}
                                        placeholder="e.g., 40"
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs">MCQ Notes</Label>
                                <RichTextArea
                                    value={value.mcqNotes || ''}
                                    onChange={(val) => update('mcqNotes', val)}
                                    placeholder="e.g., 2 marks each, no negative marking"
                                    minHeight="60px"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Essay Questions Section - Always visible */}
                <div className="p-3 bg-green-50 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                        <PenLine className="h-4 w-4 text-green-600" />
                        <Label className="font-medium text-green-800">Essay Questions</Label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">Number of Essay Questions</Label>
                            <Input
                                type="number"
                                min="0"
                                max="20"
                                value={value.essayCount || ''}
                                onChange={(e) => updateEssayCount(parseInt(e.target.value) || 0)}
                                placeholder="e.g., 4"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Essay Marks</Label>
                            <Input
                                type="number"
                                min="0"
                                value={value.essayMarks || ''}
                                onChange={(e) => update('essayMarks', parseInt(e.target.value) || 0)}
                                placeholder="e.g., 60"
                                className="mt-1"
                            />
                        </div>
                    </div>

                    {/* Dynamic Essay Question Textareas */}
                    {value.essayCount > 0 && (
                        <div className="space-y-3 pt-2 border-t border-green-200">
                            <Label className="text-xs text-green-700">Topics and Marks for each question:</Label>
                            {Array.from({ length: value.essayCount }, (_, i) => {
                                const individualTotal = (value.essayQuestions || []).reduce((sum, q) => sum + (q.marks || 0), 0)
                                const currentMarks = value.essayQuestions?.[i]?.marks || 0

                                return (
                                    <div key={i} className="p-2 bg-white rounded border">
                                        <div className="flex items-center justify-between mb-1">
                                            <Label className="text-xs font-medium text-blue-700">
                                                Question {i + 1}
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor={`essay-marks-${i}`} className="text-xs font-medium">
                                                    Marks:
                                                </Label>
                                                <Input
                                                    id={`essay-marks-${i}`}
                                                    type="number"
                                                    min="0"
                                                    value={currentMarks || ''}
                                                    onChange={(e) => updateEssayQuestion(i, 'marks', parseInt(e.target.value) || 0)}
                                                    placeholder="0"
                                                    className="w-16 h-7 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <RichTextArea
                                            value={value.essayQuestions?.[i]?.topics || ''}
                                            onChange={(val) => updateEssayQuestion(i, 'topics', val)}
                                            placeholder={`Topics covered in Question ${i + 1}...`}
                                            minHeight="70px"
                                        />
                                    </div>
                                )
                            })}

                            {/* Show total validation */}
                            {value.essayCount > 0 && (() => {
                                const individualTotal = (value.essayQuestions || []).reduce((sum, q) => sum + (q.marks || 0), 0)
                                const isValid = individualTotal === value.essayMarks

                                return (
                                    <div className={`p-2 rounded text-xs ${isValid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        <span className="font-medium">Total Individual Marks:</span> {individualTotal} / {value.essayMarks}
                                        {!isValid && ' ⚠️ Does not match essay marks total'}
                                    </div>
                                )
                            })()}
                        </div>
                    )}
                </div>

                {/* General Notes */}
                <div>
                    <Label className="text-xs flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> General Paper Notes
                    </Label>
                    <div className="mt-1">
                        <RichTextArea
                            value={value.generalNotes || ''}
                            onChange={(val) => update('generalNotes', val)}
                            placeholder="Any additional notes about the paper format, allowed materials, marking scheme tips..."
                            minHeight="80px"
                        />
                    </div>
                </div>

                {/* Summary */}
                {totalMarks > 0 && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                        <span className="text-sm text-gray-500">Total Marks:</span>
                        <Badge variant="secondary" className="text-lg">{totalMarks}</Badge>
                    </div>
                )}
            </CardContent>
        </Card >
    )
}
