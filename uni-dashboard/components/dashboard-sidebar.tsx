'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Bell, History, GraduationCap, User, LogOut, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DashboardSidebarProps {
    profile: {
        index_number?: string
    } | null
    batchInfo: {
        batch_code?: string
        current_semester?: number
    } | null
    currentSemester?: number
    userYear: number
    signOutAction: () => Promise<void>
}

interface SidebarContentProps extends DashboardSidebarProps {
    pathname: string | null
    onClose: () => void
}

function SidebarContent({
    profile,
    batchInfo,
    currentSemester,
    userYear,
    signOutAction,
    pathname,
    onClose,
}: SidebarContentProps) {
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const response = await fetch('/api/notifications', { cache: 'no-store' })
                if (!response.ok) return
                const data = await response.json()
                setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0)
            } catch {
                setUnreadCount(0)
            }
        }

        fetchUnreadCount()
    }, [pathname])

    return (
        <div className="flex flex-col h-full bg-white text-[#161616]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
                    <div className="p-2 bg-[#1B61D9] rounded-lg">
                        <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-[#161616]">UniLearn</span>
                </Link>
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={onClose}
                >
                    <X className="h-5 w-5" />
                </Button>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <Link
                    href="/dashboard"
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname === '/dashboard'
                        ? 'bg-[#f0f4ff] text-[#1B61D9]'
                        : 'text-gray-600 hover:bg-[#f0f4ff] hover:text-[#1B61D9]'
                        }`}
                >
                    <Home className="h-5 w-5" />
                    <span className="font-medium">Dashboard</span>
                </Link>

                {[1, 2, 3, 4].map((year) => (
                    <Link
                        key={year}
                        href={`/dashboard/year/${year}`}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${year <= userYear
                            ? 'text-gray-600 hover:bg-[#f0f4ff] hover:text-[#1B61D9]'
                            : 'text-gray-400'
                            } ${pathname?.includes(`/dashboard/year/${year}`)
                                ? 'bg-[#f0f4ff] text-[#1B61D9]'
                                : ''
                            }`}
                    >
                        <BookOpen className="h-5 w-5" />
                        <span className="font-medium">Year {year}</span>
                        {year <= userYear && (
                            <span className="ml-auto text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                Edit
                            </span>
                        )}
                    </Link>
                ))}

                <div className="pt-4 mt-4 border-t border-gray-100">
                    <Link
                        href="/dashboard/notifications"
                        onClick={onClose}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname === '/dashboard/notifications'
                            ? 'bg-[#f0f4ff] text-[#1B61D9]'
                            : 'text-gray-600 hover:bg-[#f0f4ff] hover:text-[#1B61D9]'
                            }`}
                    >
                        <Bell className="h-5 w-5" />
                        <span className="font-medium">Notifications</span>
                        {unreadCount > 0 && (
                            <span className="ml-auto rounded-full bg-[#1B61D9] px-2 py-0.5 text-xs font-semibold text-white">
                                {unreadCount}
                            </span>
                        )}
                    </Link>

                    <Link
                        href="/dashboard/history"
                        onClick={onClose}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname === '/dashboard/history'
                            ? 'bg-[#f0f4ff] text-[#1B61D9]'
                            : 'text-gray-600 hover:bg-[#f0f4ff] hover:text-[#1B61D9]'
                            }`}
                    >
                        <History className="h-5 w-5" />
                        <span className="font-medium">Edit History</span>
                    </Link>
                </div>
            </nav>

            <div className="p-4 border-t border-gray-100 mt-auto">
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-[#1B61D9] rounded-full">
                        <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#161616] truncate">
                            {profile?.index_number || 'Student'}
                        </p>
                        <p className="text-xs text-gray-500">
                            {batchInfo ? `Semester ${currentSemester || 0} | Year ${userYear} | ${batchInfo.batch_code?.split('_')[0]}` : 'No batch'}
                        </p>
                    </div>
                </div>

                <form action={signOutAction} className="mt-2">
                    <button
                        type="submit"
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </form>
            </div>
        </div>
    )
}

export default function DashboardSidebar({ profile, batchInfo, currentSemester, userYear, signOutAction }: DashboardSidebarProps) {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()

    const handleClose = () => {
        setIsOpen(false)
    }

    return (
        <>
            {/* Mobile Header Bar */}
            <header className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#1B61D9] rounded-md">
                        <GraduationCap className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-[#161616]">UniLearn</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
                    <Menu className="h-6 w-6 text-gray-700" />
                </Button>
            </header>

            {/* Desktop Sidebar (Hidden on Mobile) */}
            <aside className="hidden md:flex w-64 border-r border-gray-200 flex-col fixed inset-y-0 left-0 bg-white z-40">
                <SidebarContent
                    profile={profile}
                    batchInfo={batchInfo}
                    currentSemester={currentSemester}
                    userYear={userYear}
                    signOutAction={signOutAction}
                    pathname={pathname}
                    onClose={handleClose}
                />
            </aside>

            {/* Spacer for fixed sidebar on desktop */}
            <div className="hidden md:block w-64 shrink-0" />

            {/* Mobile Sidebar Overlay (Visible on Mobile when Open) */}
            {isOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Sidebar Drawer */}
                    <div className="absolute left-0 top-0 bottom-0 w-[80%] max-w-xs shadow-xl animate-in slide-in-from-left duration-200">
                        <SidebarContent
                            profile={profile}
                            batchInfo={batchInfo}
                            currentSemester={currentSemester}
                            userYear={userYear}
                            signOutAction={signOutAction}
                            pathname={pathname}
                            onClose={handleClose}
                        />
                    </div>
                </div>
            )}
        </>
    )
}
