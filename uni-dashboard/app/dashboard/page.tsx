import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, BookOpen, Users } from 'lucide-react'

export default function DashboardHome() {
    // In a real app, we might check the user's enrolled degree and redirect there directly.
    // For now, allow selection.
    const degrees = [
        { code: 'AI', name: 'Artificial Intelligence', icon: GraduationCap },
        { code: 'IT', name: 'Information Technology', icon: BookOpen },
        { code: 'ITM', name: 'IT Management', icon: Users },
    ]

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Select Your Degree Program</h1>
                <p className="text-muted-foreground mt-2">Choose a program to view available modules and content.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {degrees.map((degree) => (
                    <Link key={degree.code} href={`/dashboard/${degree.code}`} className="group">
                        <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-primary/50 cursor-pointer">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <degree.icon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                                    {degree.code}
                                </CardTitle>
                                <CardDescription>Bachelor of Science</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Access modules, notes, and past papers for {degree.name}.
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
