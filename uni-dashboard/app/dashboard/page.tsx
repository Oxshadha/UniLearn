import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, Clock, Users, TrendingUp } from 'lucide-react'

export default async function DashboardHome() {
    const supabase = await createClient()

    // Get user profile
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
        .from('profiles')
        .select('*, batches(batch_code, current_semester, batch_number)')
        .eq('id', user?.id)
        .single()

    const batchInfo = profile?.batches
    const userYear = batchInfo?.batch_number ? 25 - batchInfo.batch_number : 0
    const greeting = getGreeting()

    // Get module counts
    const { count: totalModules } = await supabase
        .from('modules')
        .select('*', { count: 'exact', head: true })

    const { count: editableModules } = await supabase
        .from('modules')
        .select('*', { count: 'exact', head: true })
        .lte('year', userYear)

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div>
                <h1 className="text-3xl font-bold text-[#161616]">
                    {greeting}, <span className="text-[#1B61D9]">{profile?.index_number || 'Student'}</span>
                </h1>
                <p className="text-gray-500 mt-1">
                    {batchInfo
                        ? `${batchInfo.batch_code?.split('_')[0]} | Batch ${batchInfo.batch_number} | Year ${userYear}`
                        : 'Welcome to UniLearn'
                    }
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#f0f4ff] rounded-xl">
                                <BookOpen className="h-6 w-6 text-[#1B61D9]" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[#161616]">{editableModules || 0}</p>
                                <p className="text-sm text-gray-500">Editable Modules</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#f0fff4] rounded-xl">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[#161616]">{totalModules || 0}</p>
                                <p className="text-sm text-gray-500">Total Modules</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#fff7ed] rounded-xl">
                                <Clock className="h-6 w-6 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[#161616]">Year {userYear}</p>
                                <p className="text-sm text-gray-500">Current Year</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Access Years */}
            <div>
                <h2 className="text-lg font-semibold text-[#161616] mb-4">Browse by Year</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((year) => {
                        const canEdit = year <= userYear
                        return (
                            <Link key={year} href={`/dashboard/year/${year}`}>
                                <Card className={`border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer ${canEdit ? 'hover:border-[#1B61D9] hover:border' : ''
                                    }`}>
                                    <CardContent className="p-6 text-center">
                                        <p className="text-3xl font-bold text-[#1B61D9]">{year}</p>
                                        <p className="text-sm text-gray-500 mt-1">Year {year}</p>
                                        <p className="text-xs mt-2">
                                            {canEdit ? (
                                                <span className="text-green-600 font-medium">Can Edit</span>
                                            ) : (
                                                <span className="text-gray-400">View Only</span>
                                            )}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
}
