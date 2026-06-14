import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface ProfileBatchRow {
    batches: {
        batch_number: number
    } | null
}

interface NotificationRow {
    id: string
    batch_number: number
    module_id: string | null
    event_type: 'save' | 'clone' | 'module_created' | 'module_deleted' | 'module_restored'
    message: string
    actor_id: string | null
    actor_index: string | null
    metadata: Record<string, unknown> | null
    created_at: string
}

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profileRow, error: profileError } = await supabase
            .from('profiles')
            .select('batches(batch_number)')
            .eq('id', user.id)
            .single()

        const profile = profileRow as ProfileBatchRow | null

        if (profileError || !profile?.batches?.batch_number) {
            return NextResponse.json({ error: 'Profile is missing a valid batch assignment' }, { status: 403 })
        }

        const batchNumber = profile.batches.batch_number

        const { data: notificationsData, error: notificationsError } = await supabase
            .from('batch_notifications')
            .select('*')
            .eq('batch_number', batchNumber)
            .order('created_at', { ascending: false })
            .limit(50)

        if (notificationsError) {
            return NextResponse.json({ error: notificationsError.message }, { status: 500 })
        }

        const notifications = (notificationsData || []) as NotificationRow[]

        if (notifications.length === 0) {
            return NextResponse.json({
                notifications: [],
                unreadCount: 0
            })
        }

        const notificationIds = notifications.map((notification) => notification.id)

        const { data: readRows, error: readsError } = await supabase
            .from('notification_reads')
            .select('notification_id')
            .eq('user_id', user.id)
            .in('notification_id', notificationIds)

        if (readsError) {
            return NextResponse.json({ error: readsError.message }, { status: 500 })
        }

        const readSet = new Set((readRows || []).map((row) => row.notification_id))
        const enriched = notifications.map((notification) => ({
            ...notification,
            isRead: readSet.has(notification.id),
        }))

        const unreadCount = enriched.filter((notification) => !notification.isRead).length

        return NextResponse.json({
            notifications: enriched,
            unreadCount,
        })
    } catch (error) {
        console.error('Error fetching notifications:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json().catch(() => ({})) as { notificationIds?: string[] }
        const notificationIds = Array.isArray(body.notificationIds) ? body.notificationIds : null

        let targetIds: string[] = []

        if (notificationIds && notificationIds.length > 0) {
            targetIds = notificationIds
        } else {
            const { data: profileRow, error: profileError } = await supabase
                .from('profiles')
                .select('batches(batch_number)')
                .eq('id', user.id)
                .single()

            const profile = profileRow as ProfileBatchRow | null

            if (profileError || !profile?.batches?.batch_number) {
                return NextResponse.json({ error: 'Profile is missing a valid batch assignment' }, { status: 403 })
            }

            const { data: allRows, error: allError } = await supabase
                .from('batch_notifications')
                .select('id')
                .eq('batch_number', profile.batches.batch_number)

            if (allError) {
                return NextResponse.json({ error: allError.message }, { status: 500 })
            }

            targetIds = (allRows || []).map((row) => row.id)
        }

        if (targetIds.length === 0) {
            return NextResponse.json({ success: true, markedRead: 0 })
        }

        const insertRows = targetIds.map((notificationId) => ({
            notification_id: notificationId,
            user_id: user.id,
            read_at: new Date().toISOString(),
        }))

        const { error: upsertError } = await supabase
            .from('notification_reads')
            .upsert(insertRows, { onConflict: 'notification_id,user_id', ignoreDuplicates: false })

        if (upsertError) {
            return NextResponse.json({ error: upsertError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, markedRead: targetIds.length })
    } catch (error) {
        console.error('Error marking notifications as read:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
