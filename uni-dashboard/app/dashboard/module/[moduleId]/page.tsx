import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, History, User } from 'lucide-react'
import ModuleEditorWrapper from '@/components/module-editor-wrapper'

export default async function ModulePage({
    params,
}: {
    params: Promise<{ moduleId: string }>
}) {
    const supabase = await createClient()
    const { moduleId } = await params

    // Fetch module info
    const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select('*')
        .eq('id', moduleId)
        .single()

    if (moduleError || !moduleData) {
        notFound()
    }

    // Get User Details
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Get user's profile and batch info
    const { data: profile } = await supabase
        .from('profiles')
        .select('*, batches(id, current_semester, batch_code, batch_number)')
        .eq('id', user.id)
        .single()

    const userBatch = profile?.batches as any
    const userBatchNumber = userBatch?.batch_number || 24 // Default to 24 if no batch

    // Check Permissions: User's year must >= module's year
    const userYear = userBatchNumber ? 25 - userBatchNumber : 1
    const canEdit = moduleData.year <= userYear

    return (
        <div className="space-y-6">
            {/* Breadcrumb & Header */}
            <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Link href="/dashboard" className="hover:text-[#1B61D9]">Dashboard</Link>
                    <ChevronRight className="h-4 w-4" />
                    <Link href={`/dashboard/year/${moduleData.year}`} className="hover:text-[#1B61D9]">Year {moduleData.year}</Link>
                    <ChevronRight className="h-4 w-4" />
                    <span>{moduleData.code}</span>
                </div>

                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="font-mono text-lg px-3 py-1 text-[#1B61D9] border-[#1B61D9]">
                                {moduleData.code}
                            </Badge>
                            <Badge className={canEdit ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                                {canEdit ? 'Can Edit' : 'View Only'}
                            </Badge>
                        </div>
                        <h1 className="text-2xl font-bold text-[#161616]">{moduleData.name}</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href={`/dashboard/module/${moduleId}/history`}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1B61D9] transition-colors"
                        >
                            <History className="h-4 w-4" />
                            View History
                        </Link>
                    </div>
                </div>

                {!canEdit && (
                    <p className="text-sm text-orange-600 mt-2 bg-orange-50 p-3 rounded-lg">
                        You are in Year {userYear}. Only Year {moduleData.year} (and above) students can edit this module.
                    </p>
                )}
            </div>

            {/* Module Editor with Batch Support */}
            <ModuleEditorWrapper
                moduleId={moduleId}
                canEdit={canEdit}
                userBatchNumber={userBatchNumber}
                userIndex={profile?.index_number}
            />
        </div>
    )
}
