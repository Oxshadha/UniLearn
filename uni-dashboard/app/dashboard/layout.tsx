import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from './actions'
import DashboardSidebar from '@/components/dashboard-sidebar'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get user profile with batch info
    const { data: profile } = await supabase
        .from('profiles')
        .select('*, batches(batch_code, current_semester, batch_number)')
        .eq('id', user.id)
        .single()

    const batchInfo = profile?.batches
    const userYear = batchInfo?.batch_number ? 25 - batchInfo.batch_number : 0

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row">
            {/* Responsive Sidebar */}
            <DashboardSidebar
                profile={profile}
                batchInfo={batchInfo}
                userYear={userYear}
                signOutAction={signOut}
            />

            {/* Main Content */}
            <main className="flex-1 overflow-auto min-h-screen w-full">
                <div className="max-w-6xl mx-auto p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
