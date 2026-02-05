import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogOut, User as UserIcon } from 'lucide-react'
import { signOut } from './actions'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
            <header className="border-b bg-white dark:bg-zinc-900 sticky top-0 z-10">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/dashboard" className="font-bold text-lg flex items-center gap-2">
                        UniLearn Dashboard
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                            <UserIcon className="h-4 w-4" />
                            <span>{user.user_metadata.index_number || user.email}</span>
                        </div>

                        <form action={signOut}>
                            <Button variant="ghost" size="icon" title="Sign Out">
                                <LogOut className="h-5 w-5" />
                            </Button>
                        </form>
                    </div>
                </div>
            </header>
            <main className="flex-1 container mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    )
}
