import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface ProfileBatchRow {
    index_number: string
    batches: {
        batch_number: number
    } | null
}

interface ContinuousAssessmentInput {
    caNumber: number
    type: string
    weight: number
    description: string
}

interface SaveContentBody {
    batchNumber?: number
    contentJson?: Record<string, unknown>
    pastPaperStructure?: Record<string, unknown> | null
    continuousAssessments?: ContinuousAssessmentInput[]
    lecturerName?: string
}

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
        const { data: contentVersion } = await supabase
            .from('module_content_versions')
            .select('*')
            .eq('module_id', moduleId)
            .eq('batch_number', batchNumber)
            .is('deleted_at', null)
            .single()

        // Fetch past paper structure
        const { data: paperStructure } = await supabase
            .from('past_paper_structures')
            .select('*')
            .eq('module_id', moduleId)
            .eq('batch_number', batchNumber)
            .is('deleted_at', null)
            .single()

        // Fetch continuous assessments
        const { data: continuousAssessments } = await supabase
            .from('continuous_assessments')
            .select('*')
            .eq('module_id', moduleId)
            .eq('batch_number', batchNumber)
            .is('deleted_at', null)
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
        const body = await request.json() as SaveContentBody

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

        if (userBatchNumber !== batchNumber) {
            return NextResponse.json(
                { error: 'You can only edit content for your own batch' },
                { status: 403 }
            )
        }

        const { data, error } = await supabase.rpc('save_module_bundle', {
            p_module_id: moduleId,
            p_batch_number: batchNumber,
            p_content_json: contentJson ?? null,
            p_past_paper_structure: pastPaperStructure ?? null,
            p_continuous_assessments: continuousAssessments ?? null,
            p_lecturer_name: lecturerName ?? null
        })

        if (error) {
            console.error('Error saving module bundle:', error)
            const status = error.message.includes('own batch')
                || error.message.includes('Profile is missing')
                || error.message.includes('locked until your batch reaches semester')
                ? 403
                : error.message.includes('Unauthorized')
                    ? 401
                    : error.message.includes('Module not found')
                        ? 404
                    : 500
            return NextResponse.json({ error: error.message }, { status })
        }

        return NextResponse.json(data ?? { success: true })

    } catch (error) {
        console.error('Error saving batch content:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
