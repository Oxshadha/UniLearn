import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/modules/[moduleId]/batches
 * Get available batch versions for a module
 * Returns metadata for each batch that has content
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { moduleId: string } }
) {
    try {
        const supabase = await createClient()
        const { moduleId } = params

        // Get current user's batch
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's batch number
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('batch_id, batches(batch_number)')
            .eq('id', user.id)
            .single()

        console.log('Profile data:', JSON.stringify(profile, null, 2))
        console.log('Profile error:', profileError)

        if (profileError) {
            return NextResponse.json({ error: `Profile error: ${profileError.message}` }, { status: 500 })
        }

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        if (!profile.batch_id) {
            return NextResponse.json({ error: 'User has no batch assigned. Please contact admin.' }, { status: 404 })
        }

        const batchData = profile.batches as any
        if (!batchData || !batchData.batch_number) {
            return NextResponse.json({
                error: 'Batch data not found. User has batch_id but join failed.',
                debug: { batch_id: profile.batch_id, batches: profile.batches }
            }, { status: 500 })
        }

        const userBatchNumber = batchData.batch_number

        // Get viewable batches (current + 3 senior)
        const viewableBatches = [
            userBatchNumber,
            userBatchNumber - 1,
            userBatchNumber - 2,
            userBatchNumber - 3
        ].filter(b => b > 0) // Filter out negative batch numbers

        // Get all available batch versions for this module
        const { data: contentVersions, error } = await supabase
            .from('module_content_versions')
            .select('batch_number, updated_at, lecturer_name, created_by')
            .eq('module_id', moduleId)
            .in('batch_number', viewableBatches)
            .order('batch_number', { ascending: false })

        if (error) {
            console.error('Error fetching batch versions:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Get past paper structures
        const { data: paperVersions } = await supabase
            .from('past_paper_structures')
            .select('batch_number, updated_at')
            .eq('module_id', moduleId)
            .in('batch_number', viewableBatches)

        // Get CA structures
        const { data: caVersions } = await supabase
            .from('continuous_assessments')
            .select('batch_number, updated_at')
            .eq('module_id', moduleId)
            .in('batch_number', viewableBatches)

        // Combine all batch info
        const batchesMap = new Map()

        // Add content versions
        contentVersions?.forEach(cv => {
            batchesMap.set(cv.batch_number, {
                batchNumber: cv.batch_number,
                hasContent: true,
                contentUpdatedAt: cv.updated_at,
                lecturerName: cv.lecturer_name,
                hasPaperStructure: false,
                hasCAs: false
            })
        })

        // Mark batches with paper structures
        paperVersions?.forEach(pv => {
            const batch = batchesMap.get(pv.batch_number) || {
                batchNumber: pv.batch_number,
                hasContent: false,
                hasPaperStructure: false,
                hasCAs: false
            }
            batch.hasPaperStructure = true
            batch.paperUpdatedAt = pv.updated_at
            batchesMap.set(pv.batch_number, batch)
        })

        // Mark batches with CAs
        caVersions?.forEach(ca => {
            const batch = batchesMap.get(ca.batch_number) || {
                batchNumber: ca.batch_number,
                hasContent: false,
                hasPaperStructure: false,
                hasCAs: false
            }
            batch.hasCAs = true
            batch.caUpdatedAt = ca.updated_at
            batchesMap.set(ca.batch_number, batch)
        })

        // Ensure all viewable batches are in the map (even if empty)
        viewableBatches.forEach(bn => {
            if (!batchesMap.has(bn)) {
                batchesMap.set(bn, {
                    batchNumber: bn,
                    hasContent: false,
                    hasPaperStructure: false,
                    hasCAs: false
                })
            }
        })

        // Convert to array and sort by batch number (descending)
        const availableBatches = Array.from(batchesMap.values())
            .sort((a, b) => b.batchNumber - a.batchNumber)

        // Find the most recently updated batch
        const mostRecentBatch = availableBatches
            .filter(b => b.hasContent || b.hasPaperStructure || b.hasCAs)
            .sort((a, b) => {
                const aDate = new Date(a.contentUpdatedAt || a.paperUpdatedAt || a.caUpdatedAt || 0)
                const bDate = new Date(b.contentUpdatedAt || b.paperUpdatedAt || b.caUpdatedAt || 0)
                return bDate.getTime() - aDate.getTime()
            })[0]

        return NextResponse.json({
            userBatchNumber,
            availableBatches,
            defaultBatch: mostRecentBatch?.batchNumber || userBatchNumber
        })

    } catch (error) {
        console.error('Error in batches API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
