import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface ProfileBatchRow {
    index_number: string
    batches: {
        batch_number: number
    } | null
}

interface CloneBody {
    fromBatch?: number
    toBatch?: number
}

/**
 * POST /api/modules/[moduleId]/clone
 * Clone content from one batch to another
 * Body: { fromBatch: 23, toBatch: 24 }
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { moduleId: string } }
) {
    try {
        const supabase = await createClient()
        const { moduleId } = params
        const body = await request.json() as CloneBody

        const { fromBatch, toBatch } = body

        if (!fromBatch || !toBatch) {
            return NextResponse.json(
                { error: 'fromBatch and toBatch are required' },
                { status: 400 }
            )
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify user can edit the target batch
        const { data: profileRow, error: profileError } = await supabase
            .from('profiles')
            .select('index_number, batches(batch_number)')
            .eq('id', user.id)
            .single()

        const profile = profileRow as ProfileBatchRow | null

        if (profileError || !profile?.batches?.batch_number) {
            return NextResponse.json(
                { error: 'Profile is missing a valid batch assignment' },
                { status: 403 }
            )
        }

        const userBatchNumber = profile.batches.batch_number

        if (userBatchNumber !== toBatch) {
            return NextResponse.json(
                { error: 'You can only clone to your own batch' },
                { status: 403 }
            )
        }

        // Fetch source content
        const { data: sourceContent } = await supabase
            .from('module_content_versions')
            .select('*')
            .eq('module_id', moduleId)
            .eq('batch_number', fromBatch)
            .single()

        // Fetch source past paper structure
        const { data: sourcePaper } = await supabase
            .from('past_paper_structures')
            .select('*')
            .eq('module_id', moduleId)
            .eq('batch_number', fromBatch)
            .single()

        // Fetch source CAs
        const { data: sourceCAs } = await supabase
            .from('continuous_assessments')
            .select('*')
            .eq('module_id', moduleId)
            .eq('batch_number', fromBatch)

        if (!sourceContent && !sourcePaper && (!sourceCAs || sourceCAs.length === 0)) {
            return NextResponse.json(
                { error: 'No source content found for the selected batch' },
                { status: 404 }
            )
        }

        const targetContentJson = sourceContent?.content_json ?? {
            topics: [],
            additionalNotes: ''
        }

        const { data: clonedContentVersion, error: contentError } = await supabase
            .from('module_content_versions')
            .upsert({
                module_id: moduleId,
                batch_number: toBatch,
                content_json: targetContentJson,
                lecturer_name: sourceContent?.lecturer_name ?? null,
                cloned_from_batch: fromBatch,
                created_by: user.id,
                updated_by: user.id
            }, {
                onConflict: 'module_id,batch_number'
            })
            .select('id, content_json')
            .single()

        if (contentError) {
            console.error('Error cloning content:', contentError)
            return NextResponse.json({ error: contentError.message }, { status: 500 })
        }

        // Clone past paper structure
        if (sourcePaper) {
            const { error: paperError } = await supabase
                .from('past_paper_structures')
                .upsert({
                    module_id: moduleId,
                    batch_number: toBatch,
                    structure_json: sourcePaper.structure_json,
                    created_by: user.id,
                    updated_by: user.id
                }, {
                    onConflict: 'module_id,batch_number'
                })

            if (paperError) {
                console.error('Error cloning paper structure:', paperError)
                return NextResponse.json({ error: paperError.message }, { status: 500 })
            }
        }

        // Clone CAs
        const { error: deleteCaError } = await supabase
            .from('continuous_assessments')
            .delete()
            .eq('module_id', moduleId)
            .eq('batch_number', toBatch)

        if (deleteCaError) {
            console.error('Error clearing CAs:', deleteCaError)
            return NextResponse.json({ error: deleteCaError.message }, { status: 500 })
        }

        if (sourceCAs && sourceCAs.length > 0) {
            // Insert cloned CAs
            const casToInsert = sourceCAs.map(ca => ({
                module_id: moduleId,
                batch_number: toBatch,
                ca_number: ca.ca_number,
                ca_type: ca.ca_type,
                ca_weight: ca.ca_weight,
                description: ca.description
            }))

            const { error: caError } = await supabase
                .from('continuous_assessments')
                .insert(casToInsert)

            if (caError) {
                console.error('Error cloning CAs:', caError)
                return NextResponse.json({ error: caError.message }, { status: 500 })
            }
        }

        const { error: logError } = await supabase
            .from('edit_logs')
            .insert({
                module_content_version_id: clonedContentVersion.id,
                module_id: moduleId,
                batch_number: toBatch,
                edited_by: user.id,
                edited_by_index: profile.index_number,
                action_type: 'clone',
                content_snapshot: clonedContentVersion.content_json,
                edit_reason: `Cloned from batch ${fromBatch}`
            })

        if (logError) {
            console.error('Error writing edit log:', logError)
            return NextResponse.json({ error: logError.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            clonedFrom: fromBatch,
            clonedTo: toBatch,
            clonedContent: !!sourceContent,
            clonedPaper: !!sourcePaper,
            clonedCAs: sourceCAs?.length || 0
        })

    } catch (error) {
        console.error('Error cloning batch content:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
