'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Bell, CheckCheck, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface NotificationItem {
    id: string
    message: string
    event_type: string
    created_at: string
    metadata?: {
        moduleCode?: string
        moduleName?: string
        fromBatch?: number
        toBatch?: number
    }
    isRead: boolean
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isMarkingRead, setIsMarkingRead] = useState(false)

    const fetchNotifications = async () => {
        try {
            setIsLoading(true)
            setError(null)

            const response = await fetch('/api/notifications', { cache: 'no-store' })
            if (!response.ok) {
                throw new Error('Failed to load notifications')
            }

            const data = await response.json()
            setNotifications(data.notifications || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load notifications')
        } finally {
            setIsLoading(false)
        }
    }

    const markAllAsRead = async () => {
        try {
            setIsMarkingRead(true)
            setError(null)

            const response = await fetch('/api/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            })

            if (!response.ok) {
                throw new Error('Failed to mark notifications as read')
            }

            await fetchNotifications()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to mark notifications as read')
        } finally {
            setIsMarkingRead(false)
        }
    }

    useEffect(() => {
        fetchNotifications()
    }, [])

    const unreadCount = notifications.filter((item) => !item.isRead).length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                        <Link href="/dashboard" className="hover:text-[#1B61D9]">Dashboard</Link>
                        <ChevronRight className="h-4 w-4" />
                        <span>Notifications</span>
                    </div>
                    <h1 className="text-2xl font-bold text-[#161616]">Batch Notifications</h1>
                    <p className="mt-1 text-gray-500">Recent updates for your batch version.</p>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={markAllAsRead}
                    disabled={isMarkingRead || unreadCount === 0}
                >
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Mark all read
                </Button>
            </div>

            {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                </p>
            )}

            {isLoading ? (
                <Card>
                    <CardContent className="p-6 text-gray-500">Loading notifications...</CardContent>
                </Card>
            ) : notifications.length === 0 ? (
                <Card>
                    <CardContent className="p-10 text-center">
                        <Bell className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                        <p className="text-gray-500">No notifications yet for your batch.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {notifications.map((item) => (
                        <Card key={item.id} className={item.isRead ? 'border-gray-200' : 'border-[#1B61D9]/40 bg-[#f8fbff]'}>
                            <CardContent className="p-4">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="uppercase">
                                            {item.event_type}
                                        </Badge>
                                        {!item.isRead && (
                                            <Badge className="bg-[#1B61D9] hover:bg-[#1B61D9]">New</Badge>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {new Date(item.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <p className="font-medium text-[#161616]">{item.message}</p>
                                {item.metadata?.moduleCode && (
                                    <p className="mt-1 text-sm text-gray-500">
                                        {item.metadata.moduleCode}
                                        {item.metadata.moduleName ? ` - ${item.metadata.moduleName}` : ''}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
