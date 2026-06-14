import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, History, Clock, User } from 'lucide-react'
import { getYearFromSemester } from '@/lib/academic'

interface HistoryLog {
    id: string
    edited_by_index: string
    edit_reason: string | null
    created_at: string
    module_content_versions: {
        batch_number: number
        modules: {
            code: string
            name: string
            year: number
        } | null
    } | null
}

export default async function HistoryPage() {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return <div>Please log in to view history.</div>
    }

    // Get user's profile with batch info
    const { data: profile } = await supabase
        .from('profiles')
        .select('*, batches(batch_code, batch_number, current_semester)')
        .eq('id', user.id)
        .single()

    const batchInfo = profile?.batches
    const userYear = getYearFromSemester(batchInfo?.current_semester)

    if (!batchInfo?.batch_number) {
        return <div>No batch assigned</div>
    }

    // Get edit logs from the current batch-versioned content model
    const { data: logs } = await supabase
        .from('edit_logs')
        .select(`
            *,
            module_content_versions(
                id,
                batch_number,
                module_id,
                modules(code, name, year)
            )
        `)
        .order('created_at', { ascending: false })
        .limit(100)

    // Filter logs
    const filteredLogs = (logs as HistoryLog[] | null)?.filter((log) => {
        const moduleYear = log.module_content_versions?.modules?.year
        const contentBatchNumber = log.module_content_versions?.batch_number

        // Show logs for modules in the student's visible years and from their own batch version.
        return moduleYear <= userYear && contentBatchNumber === batchInfo?.batch_number
    }) || []

    // Group logs by date
    const groupedLogs = filteredLogs.reduce<Record<string, HistoryLog[]>>((acc, log) => {
        const date = new Date(log.created_at).toLocaleDateString()
        if (!acc[date]) acc[date] = []
        acc[date].push(log)
        return acc
    }, {})

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Link href="/dashboard" className="hover:text-[#1B61D9]">Dashboard</Link>
                    <ChevronRight className="h-4 w-4" />
                    <span>Edit History</span>
                </div>
                <h1 className="text-2xl font-bold text-[#161616] flex items-center gap-3">
                    <History className="h-7 w-7 text-[#1B61D9]" />
                    Edit History
                </h1>
                <p className="text-gray-500 mt-1">
                    Your batch history for currently unlocked modules ({batchInfo?.batch_code})
                </p>
            </div>

            {/* Logs List */}
            {filteredLogs.length === 0 ? (
                <Card className="border-2 border-dashed">
                    <CardContent className="p-12 text-center">
                        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No edit history for your modules yet.</p>
                        <p className="text-sm text-gray-400 mt-2">
                            Changes will appear here after your content updates are logged.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                        <div key={date}>
                            <h3 className="text-sm font-medium text-gray-500 mb-2">{date}</h3>
                            <div className="space-y-2">
                                {dateLogs.map((log) => (
                                    <Card key={log.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 bg-[#f0f4ff] rounded-full">
                                                        <User className="h-4 w-4 text-[#1B61D9]" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-[#161616]">
                                                            <span className="text-[#1B61D9]">{log.edited_by_index}</span>
                                                            {' edited '}
                                                            {log.module_content_versions?.modules?.code && (
                                                                <Badge variant="outline" className="font-mono ml-1">
                                                                    {log.module_content_versions.modules.code}
                                                                </Badge>
                                                            )}
                                                        </p>
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            {log.module_content_versions?.modules?.name || 'Unknown Module'}
                                                        </p>
                                                        {log.edit_reason && (
                                                            <p className="text-sm text-gray-400 mt-1 italic">
                                                                <span>&ldquo;{log.edit_reason}&rdquo;</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                                                        Year {log.module_content_versions?.modules?.year}
                                                    </Badge>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {new Date(log.created_at).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
