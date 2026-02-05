import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Book } from 'lucide-react'

export default async function SemesterPage({
    params,
}: {
    params: { degree: string; semester: string }
}) {
    const supabase = await createClient()
    const degreeCode = params.degree.toUpperCase()
    const semester = parseInt(params.semester)

    // Fetch modules
    // Note: This relies on the degrees table having the exact code
    const { data: degree } = await supabase
        .from('degrees')
        .select('id')
        .eq('code', degreeCode)
        .single()

    let modules = []
    if (degree) {
        const { data } = await supabase
            .from('modules')
            .select('*')
            .eq('degree_id', degree.id)
            .eq('semester', semester)
            .order('code')

        modules = data || []
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Semester {semester} Modules ({degreeCode})</h1>
                <p className="text-muted-foreground mt-2">Select a module to view or edit learning materials.</p>
            </div>

            {modules.length === 0 ? (
                <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
                    No modules found for this semester.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map((module: any) => (
                        <Link key={module.id} href={`/dashboard/${params.degree}/module/${module.id}`} className="group">
                            <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-primary/50 cursor-pointer">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Book className="h-5 w-5 text-primary" />
                                        {module.code}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="font-semibold">{module.name}</p>
                                    <p className="text-xs text-muted-foreground mt-2">Click to view contents</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
