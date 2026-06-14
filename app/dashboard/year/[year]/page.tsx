import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'
import ModuleList from '@/components/module-list'
import { getYearFromSemester } from '@/lib/academic'

export default async function YearPage({
    params,
}: {
    params: Promise<{ year: string }>
}) {
    const supabase = await createClient()
    const resolvedParams = await params
    const year = parseInt(resolvedParams.year)

    // Get user info for permissions
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
        .from('profiles')
        .select('*, batches(current_semester)')
        .eq('id', user?.id)
        .single()

    const currentSemester = profile?.batches?.current_semester || 0
    const userYear = getYearFromSemester(currentSemester)
    const canEdit = year <= userYear

    // Fetch modules for this year
    const nowIso = new Date().toISOString()

    const { data: modules } = await supabase
        .from('modules')
        .select('*')
        .eq('year', year)
        .is('deleted_at', null)
        .order('code')

    const { data: deletedModules } = await supabase
        .from('modules')
        .select('*')
        .eq('year', year)
        .not('deleted_at', 'is', null)
        .gt('purge_after', nowIso)
        .order('deleted_at', { ascending: false })

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <Link href="/dashboard" className="hover:text-[#1B61D9]">Dashboard</Link>
                        <ChevronRight className="h-4 w-4" />
                        <span>Year {year}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-[#161616]">Year {year} Modules</h1>
                    <p className="text-gray-500 mt-1">
                        {year === 1 && 'Semester 1 & 2'}
                        {year === 2 && 'Semester 3 & 4'}
                        {year === 3 && 'Semester 5 & 6'}
                        {year === 4 && 'Semester 7 & 8'}
                    </p>
                </div>

                <Badge className={canEdit ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                    {canEdit ? `Some modules unlocked in Semester ${currentSemester}` : 'View Only'}
                </Badge>
            </div>

            {/* Module List with CRUD */}
            <ModuleList
                modules={modules || []}
                deletedModules={deletedModules || []}
                year={year}
                canEdit={canEdit}
                currentSemester={currentSemester}
            />
        </div>
    )
}
