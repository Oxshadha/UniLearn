'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BookOpen, ChevronRight, Plus, Trash2, Pencil, X, Check } from 'lucide-react'
import AddModuleDialog from '@/components/add-module-dialog'

interface Module {
    id: string
    code: string
    name: string
    year: number
}

interface Props {
    modules: Module[]
    year: number
    canEdit: boolean
    userYear: number
}

export default function ModuleList({ modules: initialModules, year, canEdit, userYear }: Props) {
    const [modules, setModules] = useState<Module[]>(initialModules)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editCode, setEditCode] = useState('')
    const [editName, setEditName] = useState('')
    const router = useRouter()
    const supabase = createClient()

    const refreshModules = async () => {
        const { data } = await supabase
            .from('modules')
            .select('*')
            .eq('year', year)
            .order('code')
        if (data) setModules(data)
    }

    const startEdit = (module: Module) => {
        setEditingId(module.id)
        setEditCode(module.code)
        setEditName(module.name)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditCode('')
        setEditName('')
    }

    const saveEdit = async (moduleId: string) => {
        if (!editCode.trim() || !editName.trim()) return

        const { error } = await supabase
            .from('modules')
            .update({ code: editCode.trim().toUpperCase(), name: editName.trim() })
            .eq('id', moduleId)

        if (!error) {
            await refreshModules()
            cancelEdit()
        }
    }

    const deleteModule = async (moduleId: string) => {
        if (!confirm('Delete this module? This will also delete all content.')) return

        const { error } = await supabase
            .from('modules')
            .delete()
            .eq('id', moduleId)

        if (!error) {
            setModules(modules.filter(m => m.id !== moduleId))
        }
    }

    if (modules.length === 0) {
        return (
            <div className="space-y-4">
                <Card className="border-2 border-dashed">
                    <CardContent className="p-12 text-center">
                        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">No modules found for Year {year}</p>
                        {canEdit && (
                            <AddModuleDialog year={year} onModuleAdded={refreshModules} />
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Add Module Button */}
            {canEdit && (
                <div className="flex justify-end">
                    <AddModuleDialog year={year} onModuleAdded={refreshModules} />
                </div>
            )}

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((module) => (
                    <Card
                        key={module.id}
                        className="h-full border-0 shadow-sm hover:shadow-lg transition-all group relative"
                    >
                        {editingId === module.id ? (
                            // Edit Mode
                            <CardContent className="p-4 space-y-3">
                                <Input
                                    value={editCode}
                                    onChange={(e) => setEditCode(e.target.value)}
                                    className="font-mono uppercase"
                                    placeholder="Module Code"
                                />
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Module Name"
                                />
                                <div className="flex gap-2">
                                    <Button onClick={() => saveEdit(module.id)} size="sm" style={{ backgroundColor: '#1B61D9' }}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button onClick={cancelEdit} size="sm" variant="outline">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        ) : (
                            // View Mode
                            <Link href={`/dashboard/module/${module.id}`}>
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <Badge variant="outline" className="font-mono text-[#1B61D9] border-[#1B61D9]">
                                            {module.code}
                                        </Badge>
                                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-[#1B61D9] transition-colors" />
                                    </div>
                                    <h3 className="font-semibold text-[#161616] group-hover:text-[#1B61D9] transition-colors">
                                        {module.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-2">
                                        {canEdit ? 'Click to view/edit content' : 'Click to view'}
                                    </p>
                                </CardContent>
                            </Link>
                        )}

                        {/* Edit/Delete buttons (only show when not editing and canEdit) */}
                        {canEdit && editingId !== module.id && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button
                                    onClick={(e) => { e.preventDefault(); startEdit(module) }}
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                >
                                    <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                    onClick={(e) => { e.preventDefault(); deleteModule(module.id) }}
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    )
}
