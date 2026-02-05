import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import ModuleViewer from '@/components/module-viewer'
import { Badge } from '@/components/ui/badge'

export default async function ModulePage({
    params,
}: {
    params: { degree: string; moduleId: string }
}) {
    const supabase = await createClient()
    const { moduleId } = params

    const { data: moduleData } = await supabase
        .from('modules')
        .select('*')
        .eq('id', moduleId)
        .single()

    if (!moduleData) {
        // For demo if ID not found or invalid UUID
        // In a real app we'd handle 404
        // notFound()
    }

    // 1. Get User Details
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null // Should be handled by layout

    const { data: profile } = await supabase
        .from('profiles')
        .select('*, batches(id, current_semester, batch_code)')
        .eq('id', user.id)
        .single()

    // 2. Check Permissions
    // Can edit if: User has batch AND Batch current_semester == Module semester
    const userBatch = profile?.batches
    const canEdit = !!(userBatch && moduleData && userBatch.current_semester === moduleData.semester)

    // 3. Fetch Active Content
    // We want the LATEST active content.
    // Ideally, prioritize current batch's content, else fallback to latest.
    // For now: Fetch latest created `module_contents`
    const { data: contentData } = await supabase
        .from('module_contents')
        .select('*')
        .eq('module_id', moduleId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{moduleData?.code || 'CODE'}</Badge>
                    {canEdit && <Badge>Editable</Badge>}
                </div>
                <h1 className="text-3xl font-bold">{moduleData?.name || 'Create Module Content'}</h1>
                {!moduleData && <p className="text-red-500">Note: Module ID not found in DB (Demo)</p>}
            </div>

            <ModuleViewer
                moduleId={moduleId}
                initialContent={contentData?.content_json}
                canEdit={canEdit}
                userBatchId={userBatch?.id}
            />

            {contentData && (
                <p className="text-xs text-muted-foreground text-right mt-8">
                    Version from Batch: {contentData.batch_id} <br />
                    Created: {new Date(contentData.created_at).toLocaleDateString()}
                </p>
            )}
        </div>
    )
}
