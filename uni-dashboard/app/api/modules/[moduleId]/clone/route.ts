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

        const { data, error } = await supabase.rpc('clone_module_bundle', {
            p_module_id: moduleId,
            p_from_batch: fromBatch,
            p_to_batch: toBatch
        })

        if (error) {
            console.error('Error cloning module bundle:', error)
            const status = error.message.includes('No source content')
                ? 404
                : error.message.includes('own batch') || error.message.includes('Profile is missing')
                    ? 403
                    : error.message.includes('Unauthorized')
                        ? 401
                        : 500
            return NextResponse.json({ error: error.message }, { status })
        }

        return NextResponse.json(data ?? {
            success: true,
            clonedFrom: fromBatch,
            clonedTo: toBatch
        })

    } catch (error) {
        console.error('Error cloning batch content:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
