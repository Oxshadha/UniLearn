'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, History, GraduationCap, User, LogOut, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DashboardSidebarProps {
    profile: any
    batchInfo: any
    userYear: number
    signOutAction: () => Promise<void>
}

export default function DashboardSidebar({ profile, batchInfo, userYear, signOutAction }: DashboardSidebarProps) {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()

    // Helper to close menu on navigation
    const handleLinkClick = () => {
        setIsOpen(false)
    }

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-white text-[#161616]">
            {/* Logo */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-3" onClick={handleLinkClick}>
                    <div className="p-2 bg-[#1B61D9] rounded-lg">
                        <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-[#161616]">UniLearn</span>
                </Link>
                {/* Mobile Close Button (only visible inside mobile sheet) */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setIsOpen(false)}
                >
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <Link
                    href="/dashboard"
                    onClick={handleLinkClick}
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
                        onClick={handleLinkClick}
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
                        href="/dashboard/history"
                        onClick={handleLinkClick}
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

            {/* User Info */}
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
                            {batchInfo ? `Year ${userYear} | ${batchInfo.batch_code?.split('_')[0]}` : 'No batch'}
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
                <SidebarContent />
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
                        <SidebarContent />
                    </div>
                </div>
            )}
        </>
    )
}
