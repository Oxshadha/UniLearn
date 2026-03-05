import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sanitizeText } from '@/utils/sanitize'

export const dynamic = 'force-dynamic'

interface ProfileBatchDetailsRow {
    batches: {
        batch_number: number
    } | null
}

interface CreatePastPaperBody {
    batchNumber?: number
    downloadUrl?: string
    fileName?: string
}

const canManageTargetBatch = (userBatchNumber: number, targetBatchNumber: number) =>
    userBatchNumber === targetBatchNumber || userBatchNumber === targetBatchNumber + 1

const isValidHttpUrl = (value: string) => {
    try {
        const url = new URL(value)
        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
        return false
    }
}

const deriveFileName = (url: string) => {
    try {
        const parsedUrl = new URL(url)
        const segment = parsedUrl.pathname.split('/').filter(Boolean).pop()
        if (!segment) return 'Past Paper'
        return decodeURIComponent(segment).slice(0, 150)
    } catch {
        return 'Past Paper'
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: { moduleId: string } }
) {
    try {
        const supabase = await createClient()
        const { moduleId } = params
        const batchNumber = Number.parseInt(request.nextUrl.searchParams.get('batch') || '', 10)
        const includeDeleted = request.nextUrl.searchParams.get('includeDeleted') === 'true'

        if (!batchNumber) {
            return NextResponse.json({ error: 'Batch number required' }, { status: 400 })
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let query = supabase
            .from('past_paper_downloads')
            .select('*')
            .eq('module_id', moduleId)
            .eq('batch_number', batchNumber)
            .order('uploaded_at', { ascending: false })

        if (!includeDeleted) {
            query = query.is('deleted_at', null)
        }

        const { data, error } = await query
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            items: data || [],
        })
    } catch (error) {
        console.error('Error fetching past paper links:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { moduleId: string } }
) {
    try {
        const supabase = await createClient()
        const { moduleId } = params
        const body = await request.json() as CreatePastPaperBody
        const batchNumber = body.batchNumber
        const downloadUrl = sanitizeText(body.downloadUrl || '')
        const fileNameInput = sanitizeText(body.fileName || '')

        if (!batchNumber || !downloadUrl) {
            return NextResponse.json({ error: 'Batch number and link are required' }, { status: 400 })
        }

        if (!isValidHttpUrl(downloadUrl)) {
            return NextResponse.json({ error: 'Please provide a valid URL (http/https)' }, { status: 400 })
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profileRow, error: profileError } = await supabase
            .from('profiles')
            .select('batches(batch_number)')
            .eq('id', user.id)
            .single()

        const profile = profileRow as ProfileBatchDetailsRow | null
        if (profileError || !profile?.batches?.batch_number) {
            return NextResponse.json({ error: 'Profile is missing a valid batch assignment' }, { status: 403 })
        }

        const userBatchNumber = profile.batches.batch_number
        if (!canManageTargetBatch(userBatchNumber, batchNumber)) {
            return NextResponse.json({ error: 'You do not have permission to add papers for this batch' }, { status: 403 })
        }

        const { data: moduleRow, error: moduleError } = await supabase
            .from('modules')
            .select('year, semester, deleted_at')
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

        const finalFileName = fileNameInput || deriveFileName(downloadUrl)

        const { error: insertError } = await supabase
            .from('past_paper_downloads')
            .insert({
                module_id: moduleId,
                batch_number: batchNumber,
                year: moduleRow.year,
                download_url: downloadUrl,
                file_name: finalFileName,
                uploaded_by: user.id,
                deleted_at: null,
                deleted_by: null,
                purge_after: null,
            })

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error adding past paper link:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { moduleId: string } }
) {
    try {
        const supabase = await createClient()
        const { moduleId } = params
        const body = await request.json() as {
            id?: string
            batchNumber?: number
            action?: 'restore'
        }

        const { id, batchNumber, action } = body
        if (!id || !batchNumber || action !== 'restore') {
            return NextResponse.json({ error: 'id, batchNumber, and action=restore are required' }, { status: 400 })
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profileRow, error: profileError } = await supabase
            .from('profiles')
            .select('batches(batch_number)')
            .eq('id', user.id)
            .single()

        const profile = profileRow as ProfileBatchDetailsRow | null
        if (profileError || !profile?.batches?.batch_number) {
            return NextResponse.json({ error: 'Profile is missing a valid batch assignment' }, { status: 403 })
        }

        const userBatchNumber = profile.batches.batch_number
        if (!canManageTargetBatch(userBatchNumber, batchNumber)) {
            return NextResponse.json({ error: 'You do not have permission to restore papers for this batch' }, { status: 403 })
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

        const { error: restoreError } = await supabase
            .from('past_paper_downloads')
            .update({
                deleted_at: null,
                deleted_by: null,
                purge_after: null,
            })
            .eq('id', id)
            .eq('module_id', moduleId)
            .eq('batch_number', batchNumber)
            .not('deleted_at', 'is', null)

        if (restoreError) {
            return NextResponse.json({ error: restoreError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error restoring past paper link:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
