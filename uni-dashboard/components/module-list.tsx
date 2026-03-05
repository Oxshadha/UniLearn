'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BookOpen, ChevronRight, RotateCcw, Trash2, Pencil, X, Check, Lock } from 'lucide-react'
import AddModuleDialog from '@/components/add-module-dialog'
import { canEditModuleAtSemester } from '@/lib/academic'

interface Module {
    id: string
    code: string
    name: string
    year: number
    semester: number
    deleted_at?: string | null
    deleted_by?: string | null
    purge_after?: string | null
}

interface Props {
    modules: Module[]
    deletedModules: Module[]
    year: number
    canEdit: boolean
    currentSemester: number
}

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000

const isRestorable = (module: Module) => {
    if (!module.purge_after) return false
    return new Date(module.purge_after).getTime() > Date.now()
}

const formatTimeRemaining = (purgeAfter?: string | null) => {
    if (!purgeAfter) return 'Restore window unavailable'

    const remainingMs = new Date(purgeAfter).getTime() - Date.now()
    if (remainingMs <= 0) return 'Restore window expired'

    const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000))
    if (days >= 1) {
        return `${days} day${days === 1 ? '' : 's'} left to restore`
    }

    const hours = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)))
    return `${hours} hour${hours === 1 ? '' : 's'} left to restore`
}

export default function ModuleList({
    modules: initialModules,
    deletedModules: initialDeletedModules,
    year,
    canEdit,
    currentSemester,
}: Props) {
    const [modules, setModules] = useState<Module[]>(initialModules)
    const [deletedModules, setDeletedModules] = useState<Module[]>(
        initialDeletedModules.filter(isRestorable)
    )
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editCode, setEditCode] = useState('')
    const [editName, setEditName] = useState('')
    const [actionError, setActionError] = useState<string | null>(null)
    const supabase = createClient()

    const refreshModules = async () => {
        const nowIso = new Date().toISOString()

        const [{ data: activeData }, { data: deletedData }] = await Promise.all([
            supabase
                .from('modules')
                .select('*')
                .eq('year', year)
                .is('deleted_at', null)
                .order('code'),
            supabase
                .from('modules')
                .select('*')
                .eq('year', year)
                .not('deleted_at', 'is', null)
                .gt('purge_after', nowIso)
                .order('deleted_at', { ascending: false }),
        ])

        if (activeData) setModules(activeData)
        if (deletedData) setDeletedModules(deletedData.filter(isRestorable))
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
        setActionError(null)

        const { error } = await supabase
            .from('modules')
            .update({ code: editCode.trim().toUpperCase(), name: editName.trim() })
            .eq('id', moduleId)

        if (!error) {
            await refreshModules()
            cancelEdit()
        } else {
            setActionError(error.message)
        }
    }

    const deleteModule = async (moduleId: string) => {
        if (!confirm('Remove this module from the UI? You can restore it for 7 days.')) return
        setActionError(null)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setActionError('You must be signed in to delete a module.')
            return
        }

        const restoreUntilDate = new Date()
        restoreUntilDate.setTime(restoreUntilDate.getTime() + SEVEN_DAYS_IN_MS)

        const { error } = await supabase
            .from('modules')
            .update({
                deleted_at: new Date().toISOString(),
                deleted_by: user.id,
                purge_after: restoreUntilDate.toISOString(),
            })
            .eq('id', moduleId)
            .is('deleted_at', null)

        if (!error) {
            await refreshModules()
        } else {
            setActionError(error.message)
        }
    }

    const restoreModule = async (moduleId: string) => {
        setActionError(null)

        const { error } = await supabase
            .from('modules')
            .update({
                deleted_at: null,
                deleted_by: null,
                purge_after: null,
            })
            .eq('id', moduleId)
            .not('deleted_at', 'is', null)

        if (!error) {
            await refreshModules()
        } else {
            setActionError(error.message)
        }
    }

    if (modules.length === 0) {
        return (
            <div className="space-y-4">
                {actionError && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {actionError}
                    </p>
                )}
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
            {actionError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {actionError}
                </p>
            )}

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
                                    <div className="flex items-center justify-between mb-3 gap-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-mono text-[#1B61D9] border-[#1B61D9]">
                                                {module.code}
                                            </Badge>
                                            <Badge variant="secondary" className="text-xs">
                                                Sem {module.semester}
                                            </Badge>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-[#1B61D9] transition-colors" />
                                    </div>

                                    {canEditModuleAtSemester(currentSemester, module.semester) ? (
                                        <Badge className="mb-3 bg-green-100 text-green-700 hover:bg-green-100">
                                            Unlocked
                                        </Badge>
                                    ) : (
                                        <Badge className="mb-3 bg-orange-100 text-orange-700 hover:bg-orange-100">
                                            <Lock className="h-3 w-3 mr-1" />
                                            Locked Until Sem {module.semester}
                                        </Badge>
                                    )}

                                    <h3 className="font-semibold text-[#161616] group-hover:text-[#1B61D9] transition-colors">
                                        {module.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-2">
                                        {canEditModuleAtSemester(currentSemester, module.semester)
                                            ? 'Click to view or edit content'
                                            : 'Click to view content'}
                                    </p>
                                </CardContent>
                            </Link>
                        )}

                        {/* Edit/Delete buttons (only show when not editing and canEdit) */}
                        {canEdit && canEditModuleAtSemester(currentSemester, module.semester) && editingId !== module.id && (
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

            {canEdit && deletedModules.length > 0 && (
                <Card className="border border-orange-200 bg-orange-50/40">
                    <CardContent className="p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 className="font-semibold text-[#161616]">Recently Deleted</h3>
                                <p className="text-sm text-gray-600">
                                    Deleted modules stay restorable for 7 days before they can be purged.
                                </p>
                            </div>
                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                                {deletedModules.length} hidden
                            </Badge>
                        </div>

                        <div className="space-y-3">
                            {deletedModules.map((module) => (
                                <div
                                    key={module.id}
                                    className="flex flex-col gap-3 rounded-lg border border-orange-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-mono text-[#1B61D9] border-[#1B61D9]">
                                                {module.code}
                                            </Badge>
                                            <Badge variant="secondary">Sem {module.semester}</Badge>
                                        </div>
                                        <p className="font-medium text-[#161616]">{module.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {formatTimeRemaining(module.purge_after)}
                                        </p>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => restoreModule(module.id)}
                                    >
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Restore
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
