'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { sanitizeText } from '@/utils/sanitize'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PastPaperForm, { PastPaperStructure, defaultPaperStructure } from './past-paper-form'
import CAAssignmentForm, { ContinuousAssessment } from './ca-assignment-form'
import RichTextArea from './rich-text-editor'
import { useBatchContent } from '@/hooks/use-batch-content'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    Plus,
    Trash2,
    Save,
    ChevronDown,
    ChevronRight,
    Link as LinkIcon,
    FileText,
    Loader2,
    User,
    Copy,
    CheckCircle,
    ExternalLink,
    RotateCcw,
    Info
} from 'lucide-react'

interface ContentBlock {
    id: string
    type: 'text' | 'link' | 'note'
    content: string
    url?: string
}

interface SubTopic {
    id: string
    title: string
    blocks: ContentBlock[]
}

interface Topic {
    id: string
    title: string
    subTopics: SubTopic[]
    collapsed?: boolean
}

interface ModuleContent {
    topics: Topic[]
    pastPaperStructure?: PastPaperStructure
    continuousAssessments?: ContinuousAssessment[]
    additionalNotes?: string
}

interface PastPaperLink {
    id: string
    module_id: string
    batch_number: number
    year: number
    download_url: string
    file_name: string
    uploaded_at?: string
    purge_after?: string | null
}

interface Props {
    moduleId: string
    canEdit: boolean
}

export default function ModuleEditor({
    moduleId,
    canEdit
}: Props) {
    // Use batch content hook
    const {
        selectedBatch,
        userBatchNumber,
        availableBatches,
        defaultBatch,
        contentData,
        isLoading,
        isSaving,
        handleBatchChange,
        saveContent,
        cloneFromBatch
    } = useBatchContent(moduleId)

    const [content, setContent] = useState<ModuleContent>({
        topics: [],
        pastPaperStructure: defaultPaperStructure,
        continuousAssessments: [],
        additionalNotes: ''
    })
    const [lecturerName, setLecturerName] = useState('')
    const [lastSaved, setLastSaved] = useState<string | null>(null)
    const [isEditMode, setIsEditMode] = useState(false)
    const [showCloneSuccess, setShowCloneSuccess] = useState(false)
    const [pastPaperLinks, setPastPaperLinks] = useState<PastPaperLink[]>([])
    const [deletedPastPaperLinks, setDeletedPastPaperLinks] = useState<PastPaperLink[]>([])
    const [newPastPaperUrl, setNewPastPaperUrl] = useState('')
    const [newPastPaperName, setNewPastPaperName] = useState('')
    const [pastPaperError, setPastPaperError] = useState<string | null>(null)
    const [isPastPaperSubmitting, setIsPastPaperSubmitting] = useState(false)
    const nextIdRef = useRef(0)

    // Load content when contentData changes
    useEffect(() => {
        if (contentData) {
            const syncTimer = window.setTimeout(() => {
                setContent({
                    topics: contentData.content?.content_json?.topics || [],
                    pastPaperStructure: contentData.pastPaperStructure?.structure_json || defaultPaperStructure,
                    continuousAssessments: contentData.continuousAssessments.map(ca => ({
                        caNumber: ca.ca_number,
                        type: ca.ca_type as ContinuousAssessment['type'],
                        weight: ca.ca_weight,
                        description: ca.description
                    })) || [],
                    additionalNotes: contentData.content?.content_json?.additionalNotes || ''
                })
                setLecturerName(contentData.content?.lecturer_name || '')
                setPastPaperLinks(contentData.pastPaperDownloads || [])
            }, 0)

            return () => window.clearTimeout(syncTimer)
        }
    }, [contentData])

    const fetchPastPaperLinks = useCallback(async (batchNumber: number) => {
        try {
            const [activeResponse, deletedResponse] = await Promise.all([
                fetch(`/api/modules/${moduleId}/past-papers?batch=${batchNumber}`, { cache: 'no-store' }),
                fetch(`/api/modules/${moduleId}/past-papers?batch=${batchNumber}&includeDeleted=true`, { cache: 'no-store' }),
            ])

            if (!activeResponse.ok || !deletedResponse.ok) {
                throw new Error('Failed to refresh past paper links')
            }

            const activeData = await activeResponse.json()
            const deletedData = await deletedResponse.json()
            const deletedItems = (deletedData.items || []) as PastPaperLink[]
            const restorable = deletedItems.filter((item) => {
                if (!item.purge_after) return false
                return new Date(item.purge_after).getTime() > Date.now()
            })

            setPastPaperLinks((activeData.items || []) as PastPaperLink[])
            setDeletedPastPaperLinks(restorable)
        } catch (error) {
            console.error('Error refreshing past paper links:', error)
        }
    }, [moduleId])

    const handleClone = useCallback(async () => {
        if (!selectedBatch || !defaultBatch) return

        const result = await cloneFromBatch(defaultBatch)

        if (result.success) {
            setShowCloneSuccess(true)
            setTimeout(() => setShowCloneSuccess(false), 3000)
            if (userBatchNumber) {
                await fetchPastPaperLinks(userBatchNumber)
            }
        }
    }, [selectedBatch, defaultBatch, cloneFromBatch, userBatchNumber, fetchPastPaperLinks])

    // Track if we have attempted auto-clone
    const hasAttemptedClone = useRef(false)

    // Auto-clone when entering edit mode if no own content exists
    useEffect(() => {
        const hasNoTopics = !content.topics || content.topics.length === 0
        const isViewingOwnBatch = selectedBatch === userBatchNumber
        const hasContentToClone = defaultBatch && defaultBatch !== userBatchNumber
        
        const shouldAutoClone = 
            isEditMode && 
            isViewingOwnBatch &&
            hasNoTopics &&
            hasContentToClone &&
            !hasAttemptedClone.current

        if (shouldAutoClone) {
            const cloneTimer = window.setTimeout(() => {
                console.log('Auto-cloning from batch', defaultBatch)
                hasAttemptedClone.current = true
                void handleClone()
                setIsEditMode(false)
            }, 0)

            return () => window.clearTimeout(cloneTimer)
        }
        
        if (!isViewingOwnBatch) {
            hasAttemptedClone.current = false
        }
    }, [isEditMode, selectedBatch, userBatchNumber, defaultBatch, content.topics, handleClone])

    useEffect(() => {
        if (selectedBatch !== null) {
            void fetchPastPaperLinks(selectedBatch)
        }
    }, [selectedBatch, fetchPastPaperLinks])

    const generateId = () => {
        nextIdRef.current += 1
        return `local-${nextIdRef.current}`
    }

    // Topic functions
    const addTopic = () => {
        setContent(prev => ({
            ...prev,
            topics: [...prev.topics, { id: generateId(), title: 'New Topic', subTopics: [], collapsed: false }]
        }))
    }

    const updateTopicTitle = (topicId: string, title: string) => {
        setContent(prev => ({
            ...prev,
            topics: prev.topics.map(t => t.id === topicId ? { ...t, title } : t)
        }))
    }

    const deleteTopic = (topicId: string) => {
        setContent(prev => ({
            ...prev,
            topics: prev.topics.filter(t => t.id !== topicId)
        }))
    }

    const toggleTopic = (topicId: string) => {
        setContent(prev => ({
            ...prev,
            topics: prev.topics.map(t => t.id === topicId ? { ...t, collapsed: !t.collapsed } : t)
        }))
    }

    // SubTopic functions
    const addSubTopic = (topicId: string) => {
        setContent(prev => ({
            ...prev,
            topics: prev.topics.map(t =>
                t.id === topicId
                    ? { ...t, subTopics: [...t.subTopics, { id: generateId(), title: 'New Sub-topic', blocks: [] }] }
                    : t
            )
        }))
    }

    const updateSubTopicTitle = (topicId: string, subTopicId: string, title: string) => {
        setContent(prev => ({
            ...prev,
            topics: prev.topics.map(t =>
                t.id === topicId
                    ? { ...t, subTopics: t.subTopics.map(st => st.id === subTopicId ? { ...st, title } : st) }
                    : t
            )
        }))
    }

    const deleteSubTopic = (topicId: string, subTopicId: string) => {
        setContent(prev => ({
            ...prev,
            topics: prev.topics.map(t =>
                t.id === topicId
                    ? { ...t, subTopics: t.subTopics.filter(st => st.id !== subTopicId) }
                    : t
            )
        }))
    }

    // Content block functions
    const addBlock = (topicId: string, subTopicId: string, type: 'text' | 'link' | 'note') => {
        setContent(prev => ({
            ...prev,
            topics: prev.topics.map(t =>
                t.id === topicId
                    ? {
                        ...t,
                        subTopics: t.subTopics.map(st =>
                            st.id === subTopicId
                                ? { ...st, blocks: [...st.blocks, { id: generateId(), type, content: '', url: type === 'link' ? '' : undefined }] }
                                : st
                        )
                    }
                    : t
            )
        }))
    }

    const updateBlock = (topicId: string, subTopicId: string, blockId: string, field: 'content' | 'url', value: string) => {
        setContent(prev => ({
            ...prev,
            topics: prev.topics.map(t =>
                t.id === topicId
                    ? {
                        ...t,
                        subTopics: t.subTopics.map(st =>
                            st.id === subTopicId
                                ? { ...st, blocks: st.blocks.map(b => b.id === blockId ? { ...b, [field]: value } : b) }
                                : st
                        )
                    }
                    : t
            )
        }))
    }

    const deleteBlock = (topicId: string, subTopicId: string, blockId: string) => {
        setContent(prev => ({
            ...prev,
            topics: prev.topics.map(t =>
                t.id === topicId
                    ? {
                        ...t,
                        subTopics: t.subTopics.map(st =>
                            st.id === subTopicId
                                ? { ...st, blocks: st.blocks.filter(b => b.id !== blockId) }
                                : st
                        )
                    }
                    : t
            )
        }))
    }

    const canManagePastPapers = Boolean(
        canEdit
        && selectedBatch
        && userBatchNumber
        && (userBatchNumber === selectedBatch || userBatchNumber === selectedBatch + 1)
    )

    const addPastPaperLink = async () => {
        if (!selectedBatch || !newPastPaperUrl.trim()) return

        try {
            setIsPastPaperSubmitting(true)
            setPastPaperError(null)

            const response = await fetch(`/api/modules/${moduleId}/past-papers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    batchNumber: selectedBatch,
                    downloadUrl: newPastPaperUrl.trim(),
                    fileName: newPastPaperName.trim() || undefined,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to add past paper link')
            }

            setNewPastPaperUrl('')
            setNewPastPaperName('')
            await fetchPastPaperLinks(selectedBatch)
        } catch (error) {
            setPastPaperError(error instanceof Error ? error.message : 'Failed to add past paper link')
        } finally {
            setIsPastPaperSubmitting(false)
        }
    }

    const deletePastPaperLink = async (downloadId: string) => {
        if (!selectedBatch) return

        try {
            setPastPaperError(null)
            const response = await fetch(
                `/api/modules/${moduleId}/content?batch=${selectedBatch}&downloadId=${downloadId}`,
                { method: 'DELETE' }
            )

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to delete past paper link')
            }

            await fetchPastPaperLinks(selectedBatch)
        } catch (error) {
            setPastPaperError(error instanceof Error ? error.message : 'Failed to delete past paper link')
        }
    }

    const restorePastPaperLink = async (id: string) => {
        if (!selectedBatch) return

        try {
            setPastPaperError(null)
            const response = await fetch(`/api/modules/${moduleId}/past-papers`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    batchNumber: selectedBatch,
                    action: 'restore',
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to restore past paper link')
            }

            await fetchPastPaperLinks(selectedBatch)
        } catch (error) {
            setPastPaperError(error instanceof Error ? error.message : 'Failed to restore past paper link')
        }
    }

    const handleSave = async () => {
        if (!selectedBatch) return

        try {
            // Sanitize all text content before saving
            const sanitizedContent = {
                ...content,
                topics: content.topics.map(topic => ({
                    ...topic,
                    title: sanitizeText(topic.title),
                    subTopics: topic.subTopics.map(st => ({
                        ...st,
                        title: sanitizeText(st.title),
                        blocks: st.blocks.map(b => ({
                            ...b,
                            content: sanitizeText(b.content),
                            url: b.url ? sanitizeText(b.url) : undefined
                        }))
                    }))
                }))
            }

            const result = await saveContent(
                sanitizedContent,
                content.pastPaperStructure || null,
                content.continuousAssessments || [],
                sanitizeText(lecturerName)
            )

            if (result.success) {
                setLastSaved(new Date().toLocaleTimeString())
            }
        } catch (error) {
            console.error('Error saving:', error)
            alert('Failed to save. Please try again.')
        }
    }

    // Show loading state
    if (isLoading && !selectedBatch) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    // If can't edit and no content
    if (!canEdit && (!content.topics || content.topics.length === 0)) {
        return (
            <Card className="border-2 border-dashed">
                <CardContent className="p-12 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No content yet.</p>
                    <p className="text-sm text-gray-400 mt-2">
                        Only students in the current semester window can add content.
                    </p>
                </CardContent>
            </Card>
        )
    }

    // If user CAN edit but there's no content yet - show welcome message
    const showEmptyState = canEdit && (!content.topics || content.topics.length === 0)

    return (
        <div className="space-y-6">
            {/* Batch Selector - Always show */}
            {availableBatches && availableBatches.length > 0 && (
                <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Copy className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">Version:</span>
                        </div>
                        <div className="flex gap-2">
                            {availableBatches.map((batch) => (
                                <Button
                                    key={batch.batchNumber}
                                    onClick={() => handleBatchChange(batch.batchNumber)}
                                    variant={selectedBatch === batch.batchNumber ? "default" : "outline"}
                                    size="sm"
                                    className={selectedBatch === batch.batchNumber ? "" : ""}
                                    style={selectedBatch === batch.batchNumber ? { backgroundColor: '#1B61D9' } : {}}
                                >
                                    B{batch.batchNumber}
                                    {selectedBatch === batch.batchNumber && " ✓"}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Clone notification */}
                    {showCloneSuccess && (
                        <Alert className="mt-3 bg-green-50 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                Content cloned successfully! You can now edit it.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Viewing other batch notification */}
                    {selectedBatch !== userBatchNumber && (
                        <Alert className="mt-3 bg-blue-50 border-blue-200">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-800">
                                Viewing B{selectedBatch} version. Topics are read-only.
                                <Button
                                    onClick={handleClone}
                                    size="sm"
                                    variant="link"
                                    className="text-blue-600 underline ml-2 p-0 h-auto"
                                >
                                    Clone to B{userBatchNumber} to edit topics
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}

            {/* Topics Section - Can only edit OWN batch */}
            <div className="space-y-6">
                {/* Edit Mode Bar - Only for topics */}
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        {isEditMode ? (
                            <>
                                <div className="text-sm text-gray-500">
                                    {lastSaved ? `Last saved: ${lastSaved}` : 'Unsaved changes'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-gray-400" />
                                    <Input
                                        value={lecturerName}
                                        onChange={(e) => setLecturerName(sanitizeText(e.target.value))}
                                        placeholder="Lecturer name (optional)"
                                        className="w-48 h-8 text-sm"
                                        maxLength={100}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="text-sm text-gray-600">
                                {selectedBatch === userBatchNumber ? 'Preview Mode - Topics' : 'View Only - Topics (B' + selectedBatch + ')'}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Only show edit button if viewing OWN batch */}
                        {selectedBatch === userBatchNumber && canEdit && (
                            <Button
                                onClick={() => setIsEditMode(!isEditMode)}
                                variant={isEditMode ? "outline" : "default"}
                                size="sm"
                                style={!isEditMode ? { backgroundColor: '#1B61D9' } : {}}
                            >
                                {isEditMode ? 'Preview Mode' : 'Edit Topics'}
                            </Button>
                        )}
                        {isEditMode && (
                            <>
                                <Button onClick={addTopic} variant="outline" size="sm">
                                    <Plus className="h-4 w-4 mr-1" /> Add Topic
                                </Button>
                                <Button onClick={handleSave} disabled={isSaving} style={{ backgroundColor: '#1B61D9' }}>
                                    {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                                    Save Changes
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Empty State - First time editing */}
                {showEmptyState && isEditMode && (
                    <Card className="border-2 border-dashed border-[#1B61D9]/30 bg-[#f0f4ff]/30">
                        <CardContent className="p-12 text-center">
                            <div className="w-16 h-16 bg-[#1B61D9] rounded-full flex items-center justify-center mx-auto mb-4">
                                <Plus className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-[#161616] mb-2">Start Building Content</h3>
                            <p className="text-gray-500 mb-4 max-w-md mx-auto">
                                Click &ldquo;Add Topic&rdquo; above to start organizing this module&apos;s learning materials.
                                Add topics, sub-topics, notes, and links.
                            </p>
                            <Button onClick={addTopic} style={{ backgroundColor: '#1B61D9' }}>
                                <Plus className="h-4 w-4 mr-2" /> Add Your First Topic
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Topics */}
                <div className="space-y-4">
                    {content.topics.map((topic, topicIndex) => (
                        <Card key={topic.id} className="border shadow-sm overflow-hidden">
                            <CardHeader className="bg-gray-50 py-3 px-4">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => toggleTopic(topic.id)} className="text-gray-400 hover:text-gray-600">
                                        {topic.collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                    </button>
                                    <Badge className="bg-[#1B61D9] text-white text-xs">Topic {topicIndex + 1}</Badge>
                                    {isEditMode ? (
                                        <Input
                                            value={topic.title}
                                            onChange={(e) => updateTopicTitle(topic.id, e.target.value)}
                                            className="flex-1 font-semibold border-0 bg-transparent p-0 h-auto focus:ring-0"
                                            placeholder="Topic title..."
                                        />
                                    ) : (
                                        <span className="flex-1 font-semibold">{topic.title}</span>
                                    )}
                                    {isEditMode && (
                                        <div className="flex items-center gap-2">
                                            <Button onClick={() => addSubTopic(topic.id)} variant="ghost" size="sm">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                            <Button onClick={() => deleteTopic(topic.id)} variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>

                            {!topic.collapsed && (
                                <CardContent className="p-4 space-y-4">
                                    {topic.subTopics.length === 0 && isEditMode && (
                                        <p className="text-sm text-gray-400 text-center py-4">
                                            Click + to add sub-topics
                                        </p>
                                    )}

                                    {topic.subTopics.map((subTopic, stIndex) => (
                                        <div key={subTopic.id} className="pl-6 border-l-2 border-[#1B61D9]/20">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Badge className="bg-[#60A5FA] text-white text-xs">{topicIndex + 1}.{stIndex + 1}</Badge>
                                                {isEditMode ? (
                                                    <Input
                                                        value={subTopic.title}
                                                        onChange={(e) => updateSubTopicTitle(topic.id, subTopic.id, e.target.value)}
                                                        className="flex-1 text-sm font-medium border-0 bg-transparent p-0 h-auto"
                                                        placeholder="Sub-topic title..."
                                                    />
                                                ) : (
                                                    <span className="flex-1 text-sm font-medium">{subTopic.title}</span>
                                                )}
                                                {isEditMode && (
                                                    <Button
                                                        onClick={() => deleteSubTopic(topic.id, subTopic.id)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-gray-400 hover:text-red-500"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Content Blocks */}
                                            <div className="space-y-2 ml-4">
                                                {subTopic.blocks.map((block) => (
                                                    <div key={block.id} className="flex items-start gap-2">
                                                        {block.type === 'text' && (
                                                            <>
                                                                <FileText className="h-4 w-4 text-gray-400 mt-2" />
                                                                <div className="flex-1">
                                                                    <RichTextArea
                                                                        value={block.content}
                                                                        onChange={(val) => updateBlock(topic.id, subTopic.id, block.id, 'content', val)}
                                                                        placeholder="Add notes..."
                                                                        minHeight="60px"
                                                                        disabled={!isEditMode}
                                                                    />
                                                                </div>
                                                            </>
                                                        )}
                                                        {block.type === 'link' && (
                                                            <>
                                                                <LinkIcon className="h-4 w-4 text-blue-500 mt-2" />
                                                                <div className="flex-1 space-y-1">
                                                                    {isEditMode ? (
                                                                        <>
                                                                            <Input
                                                                                value={block.content}
                                                                                onChange={(e) => updateBlock(topic.id, subTopic.id, block.id, 'content', e.target.value)}
                                                                                className="text-sm"
                                                                                placeholder="Link title..."
                                                                            />
                                                                            <Input
                                                                                value={block.url || ''}
                                                                                onChange={(e) => updateBlock(topic.id, subTopic.id, block.id, 'url', e.target.value)}
                                                                                className="text-sm"
                                                                                placeholder="https://..."
                                                                            />
                                                                        </>
                                                                    ) : (
                                                                        <a href={block.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                                                            {block.content || block.url}
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                        {isEditMode && (
                                                            <Button
                                                                onClick={() => deleteBlock(topic.id, subTopic.id, block.id)}
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-gray-300 hover:text-red-500"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}

                                                {isEditMode && (
                                                    <div className="flex gap-2 pt-2">
                                                        <Button
                                                            onClick={() => addBlock(topic.id, subTopic.id, 'text')}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-xs text-gray-500"
                                                        >
                                                            <FileText className="h-3 w-3 mr-1" /> Note
                                                        </Button>
                                                        <Button
                                                            onClick={() => addBlock(topic.id, subTopic.id, 'link')}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-xs text-gray-500"
                                                        >
                                                            <LinkIcon className="h-3 w-3 mr-1" /> Link
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>

                {/* Continuous Assessment Structure */}
                <CAAssignmentForm
                    value={content.continuousAssessments || []}
                    onChange={(newValue) => setContent(prev => ({ ...prev, continuousAssessments: newValue }))}
                    canEdit={isEditMode}
                />

                {/* Past Paper Structure */}
                <PastPaperForm
                    value={content.pastPaperStructure || defaultPaperStructure}
                    onChange={(newValue) => setContent(prev => ({ ...prev, pastPaperStructure: newValue }))}
                    canEdit={isEditMode}
                />

                <Card className="border shadow-sm">
                    <CardHeader className="py-3 px-4 bg-blue-50">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold text-blue-700">
                                Past Paper Links (Google Drive / PDF URL)
                            </h3>
                            <Badge variant="outline">B{selectedBatch}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4">
                        {pastPaperError && (
                            <Alert className="border-red-200 bg-red-50">
                                <AlertDescription className="text-red-700">{pastPaperError}</AlertDescription>
                            </Alert>
                        )}

                        {canManagePastPapers ? (
                            <div className="rounded-lg border bg-white p-3 space-y-3">
                                <Input
                                    value={newPastPaperUrl}
                                    onChange={(e) => setNewPastPaperUrl(sanitizeText(e.target.value))}
                                    placeholder="Paste Google Drive link or PDF URL"
                                />
                                <Input
                                    value={newPastPaperName}
                                    onChange={(e) => setNewPastPaperName(sanitizeText(e.target.value))}
                                    placeholder="Optional name (e.g., 2025 Final Paper)"
                                    maxLength={150}
                                />
                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        onClick={addPastPaperLink}
                                        disabled={isPastPaperSubmitting || !newPastPaperUrl.trim()}
                                        style={{ backgroundColor: '#1B61D9' }}
                                    >
                                        {isPastPaperSubmitting ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Plus className="h-4 w-4 mr-2" />
                                        )}
                                        Add Link
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">
                                You can view links for this batch. Editing is allowed for the owning batch and its immediate junior batch.
                            </p>
                        )}

                        <div className="space-y-2">
                            {pastPaperLinks.length === 0 ? (
                                <p className="text-sm text-gray-500">No past paper links added yet.</p>
                            ) : (
                                pastPaperLinks.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-sm text-[#161616]">{item.file_name}</p>
                                            <a
                                                href={item.download_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="truncate text-xs text-blue-600 hover:underline block"
                                            >
                                                {item.download_url}
                                            </a>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button type="button" variant="outline" size="sm" asChild>
                                                <a href={item.download_url} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="h-3 w-3 mr-1" />
                                                    Open
                                                </a>
                                            </Button>
                                            {canManagePastPapers && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700"
                                                    onClick={() => deletePastPaperLink(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {canManagePastPapers && deletedPastPaperLinks.length > 0 && (
                            <div className="space-y-2 border-t pt-2">
                                <p className="text-xs font-medium text-gray-600">Recently Deleted (7-day restore)</p>
                                {deletedPastPaperLinks.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50/40 p-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm text-[#161616]">{item.file_name}</p>
                                            <p className="truncate text-xs text-gray-500">{item.download_url}</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => restorePastPaperLink(item.id)}
                                        >
                                            <RotateCcw className="h-3 w-3 mr-1" />
                                            Restore
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
