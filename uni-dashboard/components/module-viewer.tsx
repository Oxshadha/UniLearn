'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash, Save, History as HistoryIcon, Edit3, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Point {
    text: string
}

interface Topic {
    title: string
    points: Point[]
}

interface Content {
    topics: Topic[]
}

interface ModuleViewerProps {
    moduleId: string
    initialContent: Content | null
    initialVersionId?: string
    canEdit: boolean
    userBatchId?: string
}

export default function ModuleViewer({ moduleId, initialContent, canEdit, userBatchId }: ModuleViewerProps) {
    const [content, setContent] = useState<Content>(initialContent || { topics: [] })
    const [isEditing, setIsEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const supabase = createClient()

    const handleAddTopic = () => {
        setContent({
            ...content,
            topics: [...content.topics, { title: 'New Topic', points: [] }]
        })
    }

    const handleRemoveTopic = (index: number) => {
        const newTopics = [...content.topics]
        newTopics.splice(index, 1)
        setContent({ ...content, topics: newTopics })
    }

    const handleTopicTitleChange = (index: number, title: string) => {
        const newTopics = [...content.topics]
        newTopics[index].title = title
        setContent({ ...content, topics: newTopics })
    }

    const handleAddPoint = (topicIndex: number) => {
        const newTopics = [...content.topics]
        newTopics[topicIndex].points.push({ text: '' })
        setContent({ ...content, topics: newTopics })
    }

    const handlePointChange = (topicIndex: number, pointIndex: number, text: string) => {
        const newTopics = [...content.topics]
        newTopics[topicIndex].points[pointIndex].text = text
        setContent({ ...content, topics: newTopics })
    }
    const handleRemovePoint = (topicIndex: number, pointIndex: number) => {
        const newTopics = [...content.topics]
        newTopics[topicIndex].points.splice(pointIndex, 1)
        setContent({ ...content, topics: newTopics })
    }


    const handleSave = async () => {
        if (!userBatchId) return
        setSaving(true)

        // Insert new version
        // We always insert a new row for the batch if they edit.
        // Logic: Upsert if same batch has an active one? 
        // For simplicity and "cloning":
        // 1. Deactivate old active content for THIS batch if exists?
        // Actually, we'll just insert a new one and maybe valid the user's batch logic in backend.
        // Assuming we just insert:

        const { error } = await supabase
            .from('module_contents')
            .insert({
                module_id: moduleId,
                batch_id: userBatchId,
                content_json: content,
                version_number: 1, // Simplified versioning
                is_active: true
            })

        if (error) {
            alert('Error saving: ' + error.message)
        } else {
            setIsEditing(false)
            alert('Saved successfully!')
        }
        setSaving(false)
    }

    if (!content.topics.length && !isEditing) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No content available for this module yet.</p>
                {canEdit && (
                    <Button onClick={() => setIsEditing(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Create First Version
                    </Button>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Learning Material</h2>
                <div className="flex gap-2">
                    {/* {history available todo} */}
                    {!isEditing && canEdit && (
                        <Button onClick={() => setIsEditing(true)} variant="outline">
                            <Edit3 className="mr-2 h-4 w-4" /> Edit Content
                        </Button>
                    )}
                    {isEditing && (
                        <>
                            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {isEditing ? (
                <div className="space-y-8">
                    {content.topics.map((topic, tIndex) => (
                        <Card key={tIndex}>
                            <CardHeader className="flex flex-row items-center gap-4">
                                <div className="flex-1">
                                    <Input
                                        value={topic.title}
                                        onChange={(e) => handleTopicTitleChange(tIndex, e.target.value)}
                                        className="font-bold text-lg"
                                        placeholder="Topic Title"
                                    />
                                </div>
                                <Button variant="destructive" size="icon" onClick={() => handleRemoveTopic(tIndex)}>
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {topic.points.map((point, pIndex) => (
                                    <div key={pIndex} className="flex gap-2">
                                        <Textarea
                                            value={point.text}
                                            onChange={(e) => handlePointChange(tIndex, pIndex, e.target.value)}
                                            className="min-h-[60px]"
                                            placeholder="Explain text..."
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => handleRemovePoint(tIndex, pIndex)}>
                                            <Trash className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={() => handleAddPoint(tIndex)} className="w-full mt-2">
                                    <Plus className="mr-2 h-4 w-4" /> Add Point
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                    <Button onClick={handleAddTopic} className="w-full border-dashed" variant="outline">
                        <Plus className="mr-2 h-4 w-4" /> Add New Topic
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    {content.topics.map((topic, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <CardTitle>{topic.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="list-disc pl-5 space-y-2">
                                    {topic.points.map((point, j) => (
                                        <li key={j} className="text-muted-foreground">
                                            {point.text}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
