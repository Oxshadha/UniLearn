import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, History, Clock, User, ArrowLeft } from 'lucide-react'

export default async function ModuleHistoryPage({
    params,
}: {
    params: Promise<{ moduleId: string }>
}) {
    const supabase = await createClient()
    const { moduleId } = await params

    // Get module info
    const { data: module } = await supabase
        .from('modules')
        .select('*')
        .eq('id', moduleId)
        .single()

    if (!module) {
        notFound()
    }

    // Get edit logs for this module
    const { data: logs } = await supabase
        .from('edit_logs')
        .select(`
            *,
            module_contents!inner(module_id)
        `)
        .eq('module_contents.module_id', moduleId)
        .order('created_at', { ascending: false })
        .limit(50)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Link href="/dashboard" className="hover:text-[#1B61D9]">Dashboard</Link>
                    <ChevronRight className="h-4 w-4" />
                    <Link href={`/dashboard/year/${module.year}`} className="hover:text-[#1B61D9]">Year {module.year}</Link>
                    <ChevronRight className="h-4 w-4" />
                    <Link href={`/dashboard/module/${moduleId}`} className="hover:text-[#1B61D9]">{module.code}</Link>
                    <ChevronRight className="h-4 w-4" />
                    <span>History</span>
                </div>

                <div className="flex items-center gap-4">
                    <Link
                        href={`/dashboard/module/${moduleId}`}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-[#161616] flex items-center gap-3">
                            <Badge variant="outline" className="font-mono text-lg text-[#1B61D9] border-[#1B61D9]">
                                {module.code}
                            </Badge>
                            Edit History
                        </h1>
                        <p className="text-gray-500 mt-1">{module.name}</p>
                    </div>
                </div>
            </div>

            {/* Logs List */}
            {(!logs || logs.length === 0) ? (
                <Card className="border-2 border-dashed">
                    <CardContent className="p-12 text-center">
                        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No edit history for this module yet.</p>
                        <p className="text-sm text-gray-400 mt-2">
                            Changes will appear here when content is saved.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {logs.map((log: any, index: number) => (
                        <Card key={log.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className="p-2 bg-[#f0f4ff] rounded-full">
                                                <User className="h-4 w-4 text-[#1B61D9]" />
                                            </div>
                                            {index < logs.length - 1 && (
                                                <div className="w-0.5 h-8 bg-gray-200 mt-2" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-[#161616]">
                                                <span className="text-[#1B61D9]">{log.edited_by_index}</span>
                                                {' made changes'}
                                            </p>
                                            {log.edit_reason && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    "{log.edit_reason}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400">
                                            {new Date(log.created_at).toLocaleDateString()}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {new Date(log.created_at).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
