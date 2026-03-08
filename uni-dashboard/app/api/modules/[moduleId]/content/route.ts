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

interface ProfileBatchDetailsRow {
    batches: {
        batch_number: number
        current_semester: number
    } | null
}

const canManageTargetBatchPapers = (userBatchNumber: number, targetBatchNumber: number) =>
    userBatchNumber === targetBatchNumber || userBatchNumber === targetBatchNumber + 1

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

        // Fetch past paper links
        const { data: pastPaperDownloads } = await supabase
            .from('past_paper_downloads')
            .select('*')
            .eq('module_id', moduleId)
            .eq('batch_number', batchNumber)
            .is('deleted_at', null)
            .order('uploaded_at', { ascending: false })

        // Return combined data
        return NextResponse.json({
            batchNumber,
            content: contentVersion || null,
            pastPaperStructure: paperStructure || null,
            continuousAssessments: continuousAssessments || [],
            pastPaperDownloads: pastPaperDownloads || [],
            hasContent: !!contentVersion,
            hasPaperStructure: !!paperStructure,
            hasCAs: (continuousAssessments?.length || 0) > 0,
            hasPastPaperDownloads: (pastPaperDownloads?.length || 0) > 0
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

/**
 * DELETE /api/modules/[moduleId]/content?batch=23&downloadId=<uuid>
 * Soft-delete a past paper link for a batch (7-day restore window)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { moduleId: string } }
) {
    try {
        const supabase = await createClient()
        const { moduleId } = params
        const batchNumber = Number.parseInt(request.nextUrl.searchParams.get('batch') || '', 10)
        const downloadId = request.nextUrl.searchParams.get('downloadId')

        if (!batchNumber || !downloadId) {
            return NextResponse.json({ error: 'Batch number and downloadId are required' }, { status: 400 })
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profileRow, error: profileError } = await supabase
            .from('profiles')
            .select('batches(batch_number, current_semester)')
            .eq('id', user.id)
            .single()

        const profile = profileRow as ProfileBatchDetailsRow | null

        if (profileError || !profile?.batches?.batch_number) {
            return NextResponse.json({ error: 'Profile is missing a valid batch assignment' }, { status: 403 })
        }

        const userBatchNumber = profile.batches.batch_number
        if (!canManageTargetBatchPapers(userBatchNumber, batchNumber)) {
            return NextResponse.json({ error: 'You do not have permission to modify these past papers' }, { status: 403 })
        }

        const { data: moduleRow, error: moduleError } = await supabase
            .from('modules')
            .select('semester, deleted_at')
            .eq('id', moduleId)
            .single()

        if (moduleError || !moduleRow || moduleRow.deleted_at) {
            return NextResponse.json({ error: 'Module not found' }, { status: 404 })
        }

        const { data: targetBatch, error: batchError } = await supabase
            .from('batches')
            .select('current_semester')
            .eq('batch_number', batchNumber)
            .single()

        if (batchError || !targetBatch) {
            return NextResponse.json({ error: 'Target batch not found' }, { status: 404 })
        }

        if (targetBatch.current_semester < moduleRow.semester) {
            return NextResponse.json(
                { error: `Past papers are locked until Batch ${batchNumber} reaches semester ${moduleRow.semester}` },
                { status: 403 }
            )
        }

        const restoreUntil = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString()

        const { error: updateError } = await supabase
            .from('past_paper_downloads')
            .update({
                deleted_at: new Date().toISOString(),
                deleted_by: user.id,
                purge_after: restoreUntil,
            })
            .eq('id', downloadId)
            .eq('module_id', moduleId)
            .eq('batch_number', batchNumber)
            .is('deleted_at', null)

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting past paper link:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
