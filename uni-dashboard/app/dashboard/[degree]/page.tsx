import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'

// Mock Data for Degree names - in real app, fetch from DB
const DEGREES: Record<string, string> = {
    'AI': 'Artificial Intelligence',
    'IT': 'Information Technology',
    'ITM': 'IT Management',
}

export default function DegreePage({ params }: { params: { degree: string } }) {
    const degreeCode = params.degree.toUpperCase()
    const degreeName = DEGREES[degreeCode]

    if (!degreeName) {
        notFound()
    }

    const semesters = Array.from({ length: 8 }, (_, i) => i + 1)

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{degreeName}</h1>
                <p className="text-muted-foreground mt-2">Select a semester to view modules.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {semesters.map((sem) => (
                    <Link key={sem} href={`/dashboard/${params.degree}/sem/${sem}`} className="group">
                        <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-primary/50 cursor-pointer">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    Semester {sem}
                                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    View modules and contents
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
