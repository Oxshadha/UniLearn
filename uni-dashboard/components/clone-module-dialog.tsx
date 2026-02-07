'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { sanitizeText } from '@/utils/sanitize'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog'
import { Copy, Loader2, Users, Calendar, ChevronRight } from 'lucide-react'

interface BatchContent {
    id: string
    batch_id: string
    content_json: any
    lecturer_name: string | null
    created_at: string
    batches: {
        batch_code: string
        batch_number: number
    }
}

interface Props {
    moduleId: string
    moduleName: string
    moduleYear: number
    currentBatchId: string
    onCloneComplete?: () => void  // Optional - uses window.location.reload() if not provided
}

export default function CloneModuleDialog({
    moduleId,
    moduleName,
    moduleYear,
    currentBatchId,
    onCloneComplete
}: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [cloning, setCloning] = useState(false)
    const [availableContents, setAvailableContents] = useState<BatchContent[]>([])
    const [selectedContent, setSelectedContent] = useState<BatchContent | null>(null)
    const [lecturerName, setLecturerName] = useState('')
    const supabase = createClient()

    useEffect(() => {
        if (open) {
            fetchAvailableContents()
        }
    }, [open])

    const fetchAvailableContents = async () => {
        setLoading(true)

        // Fetch content from OTHER batches (senior batches with content for this module)
        const { data, error } = await supabase
            .from('module_contents')
            .select(`
                id,
                batch_id,
                content_json,
                lecturer_name,
                created_at,
                batches(batch_code, batch_number)
            `)
            .eq('module_id', moduleId)
            .eq('is_active', true)
            .neq('batch_id', currentBatchId)
            .order('created_at', { ascending: false })

        if (!error && data) {
            // Group by batch and get the most recent for each
            const batchMap = new Map<string, BatchContent>()
            data.forEach((item: any) => {
                if (!batchMap.has(item.batch_id)) {
                    batchMap.set(item.batch_id, item)
                }
            })
            setAvailableContents(Array.from(batchMap.values()))
        }

        setLoading(false)
    }

    const handleClone = async () => {
        if (!selectedContent) return

        setCloning(true)

        try {
            // Deactivate existing content for current batch
            await supabase
                .from('module_contents')
                .update({ is_active: false })
                .eq('module_id', moduleId)
                .eq('batch_id', currentBatchId)

            // Insert cloned content
            const { data: newContent, error } = await supabase
                .from('module_contents')
                .insert({
                    module_id: moduleId,
                    batch_id: currentBatchId,
                    content_json: selectedContent.content_json,
                    lecturer_name: lecturerName || selectedContent.lecturer_name,
                    cloned_from: selectedContent.id,
                    is_active: true
                })
                .select('id')
                .single()

            if (error) throw error

            // Log the clone action
            if (newContent) {
                const { data: { user } } = await supabase.auth.getUser()
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('index_number')
                    .eq('id', user?.id)
                    .single()

                await supabase
                    .from('edit_logs')
                    .insert({
                        module_content_id: newContent.id,
                        edited_by_index: profile?.index_number || 'unknown',
                        content_snapshot: selectedContent.content_json,
                        edit_reason: `Cloned from ${selectedContent.batches?.batch_code || 'senior batch'}`
                    })
            }

            setOpen(false)
            if (onCloneComplete) {
                onCloneComplete()
            } else {
                window.location.reload()
            }
        } catch (error) {
            console.error('Clone error:', error)
            alert('Failed to clone content. Please try again.')
        }

        setCloning(false)
    }

    const getSeniorYear = (batchNumber: number) => 25 - batchNumber

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-[#1B61D9] text-[#1B61D9] hover:bg-[#f0f4ff]">
                    <Copy className="h-4 w-4 mr-2" /> Clone from Senior Batch
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Clone Content for {moduleName}</DialogTitle>
                    <DialogDescription>
                        Select a senior batch's content to clone and customize for your batch.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-[#1B61D9]" />
                    </div>
                ) : availableContents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No senior batch content available for this module.</p>
                        <p className="text-sm mt-1">Start fresh by adding your own content!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Label>Select batch to clone from:</Label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {availableContents.map((content) => (
                                <Card
                                    key={content.id}
                                    className={`cursor-pointer transition-all ${selectedContent?.id === content.id
                                        ? 'border-[#1B61D9] bg-[#f0f4ff]'
                                        : 'hover:border-gray-300'
                                        }`}
                                    onClick={() => setSelectedContent(content)}
                                >
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {content.batches?.batch_code?.split('_')[0]}
                                                </Badge>
                                                <span className="font-medium text-sm">
                                                    Batch {content.batches?.batch_number}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    (Year {getSeniorYear(content.batches?.batch_number || 0)})
                                                </span>
                                            </div>
                                            {content.lecturer_name && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Lecturer: {content.lecturer_name}
                                                </p>
                                            )}
                                        </div>
                                        <ChevronRight className={`h-4 w-4 ${selectedContent?.id === content.id
                                            ? 'text-[#1B61D9]'
                                            : 'text-gray-300'
                                            }`} />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {selectedContent && (
                            <div className="space-y-2 pt-2 border-t">
                                <Label htmlFor="lecturer">Lecturer Name (Optional)</Label>
                                <Input
                                    id="lecturer"
                                    placeholder="e.g., Dr. John Smith"
                                    value={lecturerName}
                                    onChange={(e) => setLecturerName(sanitizeText(e.target.value))}
                                    maxLength={100}
                                />
                                <p className="text-xs text-gray-500">
                                    Update if your batch has a different lecturer
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleClone}
                        disabled={!selectedContent || cloning}
                        style={{ backgroundColor: '#1B61D9' }}
                    >
                        {cloning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Clone Content
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
