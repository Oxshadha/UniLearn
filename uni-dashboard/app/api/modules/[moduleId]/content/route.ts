import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/modules/[moduleId]/content?batch=24
 * Fetch module content for a specific batch
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { moduleId: string } }
) {
    try {
        const supabase = await createClient()
        const { moduleId } = params
        const searchParams = request.nextUrl.searchParams
        const batchNumber = parseInt(searchParams.get('batch') || '0')

        if (!batchNumber) {
            return NextResponse.json({ error: 'Batch number required' }, { status: 400 })
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch content for the batch
        const { data: contentVersion, error: contentError } = await supabase
            .from('module_content_versions')
            .select('*')
            .eq('module_id', moduleId)
            .eq('batch_number', batchNumber)
            .single()

        // Fetch past paper structure
        const { data: paperStructure } = await supabase
            .from('past_paper_structures')
            .select('*')
            .eq('module_id', moduleId)
            .eq('batch_number', batchNumber)
            .single()

        // Fetch continuous assessments
        const { data: continuousAssessments } = await supabase
            .from('continuous_assessments')
            .select('*')
            .eq('module_id', moduleId)
            .eq('batch_number', batchNumber)
            .order('ca_number', { ascending: true })

        // Return combined data
        return NextResponse.json({
            batchNumber,
            content: contentVersion || null,
            pastPaperStructure: paperStructure || null,
            continuousAssessments: continuousAssessments || [],
            hasContent: !!contentVersion,
            hasPaperStructure: !!paperStructure,
            hasCAs: (continuousAssessments?.length || 0) > 0
        })

    } catch (error) {
        console.error('Error fetching batch content:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/modules/[moduleId]/content
 * Save/update module content for a batch
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { moduleId: string } }
) {
    try {
        const supabase = await createClient()
        const { moduleId } = params
        const body = await request.json()

        const {
            batchNumber,
            contentJson,
            pastPaperStructure,
            continuousAssessments,
            lecturerName
        } = body

        if (!batchNumber) {
            return NextResponse.json({ error: 'Batch number required' }, { status: 400 })
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify user can edit this batch
        const { data: profile } = await supabase
            .from('profiles')
            .select('batch_id, batches(batch_number)')
            .eq('id', user.id)
            .single()

        const userBatchNumber = (profile?.batches as any)?.batch_number

        if (userBatchNumber !== batchNumber) {
            return NextResponse.json(
                { error: 'You can only edit content for your own batch' },
                { status: 403 }
            )
        }

        // Save/update module content
        if (contentJson) {
            const { error: contentError } = await supabase
                .from('module_content_versions')
                .upsert({
                    module_id: moduleId,
                    batch_number: batchNumber,
                    content_json: contentJson,
                    lecturer_name: lecturerName,
                    updated_by: user.id,
                    created_by: user.id
                }, {
                    onConflict: 'module_id,batch_number'
                })

            if (contentError) {
                console.error('Error saving content:', contentError)
                return NextResponse.json({ error: contentError.message }, { status: 500 })
            }
        }

        // Save/update past paper structure
        if (pastPaperStructure) {
            const { error: paperError } = await supabase
                .from('past_paper_structures')
                .upsert({
                    module_id: moduleId,
                    batch_number: batchNumber,
                    structure_json: pastPaperStructure,
                    updated_by: user.id,
                    created_by: user.id
                }, {
                    onConflict: 'module_id,batch_number'
                })

            if (paperError) {
                console.error('Error saving paper structure:', paperError)
                return NextResponse.json({ error: paperError.message }, { status: 500 })
            }
        }

        // Save/update continuous assessments
        if (continuousAssessments && Array.isArray(continuousAssessments)) {
            // Delete existing CAs for this batch
            await supabase
                .from('continuous_assessments')
                .delete()
                .eq('module_id', moduleId)
                .eq('batch_number', batchNumber)

            // Insert new CAs
            if (continuousAssessments.length > 0) {
                const casToInsert = continuousAssessments.map(ca => ({
                    module_id: moduleId,
                    batch_number: batchNumber,
                    ca_number: ca.caNumber,
                    ca_type: ca.type,
                    ca_weight: ca.weight,
                    description: ca.description
                }))

                const { error: caError } = await supabase
                    .from('continuous_assessments')
                    .insert(casToInsert)

                if (caError) {
                    console.error('Error saving CAs:', caError)
                    return NextResponse.json({ error: caError.message }, { status: 500 })
                }
            }
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error saving batch content:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
