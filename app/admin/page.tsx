import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, CalendarClock, Bell, ShieldCheck } from 'lucide-react'

export default async function AdminHomePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        redirect('/dashboard')
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
            <div>
                <h1 className="text-2xl font-bold text-[#161616]">Admin Panel</h1>
                <p className="mt-1 text-gray-500">Manage semesters, policies, and system controls.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="border shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CalendarClock className="h-5 w-5 text-[#1B61D9]" />
                            Semester Management
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm text-gray-600">
                            Set exact semester per batch or advance to the next semester.
                        </p>
                        <Button asChild style={{ backgroundColor: '#1B61D9' }}>
                            <Link href="/admin/semesters">Open Semester Controls</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Bell className="h-5 w-5 text-[#1B61D9]" />
                            Notifications
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm text-gray-600">
                            Batch notifications are now active for save and clone events.
                        </p>
                        <Button asChild variant="outline">
                            <Link href="/dashboard/notifications">View as User</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border shadow-sm md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ShieldCheck className="h-5 w-5 text-[#1B61D9]" />
                            Current Policy Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-gray-700">
                        <p>All batches can view all versions (read-only).</p>
                        <p>Only own batch can edit module content and structures.</p>
                        <p>Past paper links can be managed by owning batch and immediate junior batch.</p>
                        <p>Semester gating controls editability by module semester and batch current semester.</p>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-lg border bg-blue-50 p-4 text-sm text-blue-800">
                <div className="flex items-center gap-2 font-medium">
                    <Settings className="h-4 w-4" />
                    Recommended Admin Routine
                </div>
                <p className="mt-2">Update each batch semester at transition points. Use direct set controls if academic calendar shifts.</p>
            </div>
        </div>
    )
}
