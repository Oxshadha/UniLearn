import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, ArrowRight, Users, FileText, History } from 'lucide-react'
import BackgroundAnimation from '@/components/background-animation'

export default function LandingPage() {
  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden bg-white">
      {/* Dynamic Background */}
      <BackgroundAnimation />

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="px-6 py-4 flex justify-between items-center bg-white border-b border-gray-100">
          <h1 className="text-xl font-bold flex items-center gap-2 text-[#161616]">
            <div className="p-1.5 bg-[#1B61D9] rounded-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            UniLearn
          </h1>
          <Link href="/login">
            <Button className="font-semibold bg-[#1B61D9] hover:bg-[#1551b8] text-white border-0">
              Sign In
            </Button>
          </Link>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-center">
          <div className="text-center max-w-4xl mb-8 md:mb-16 animate-in fade-in zoom-in-50 duration-1000">

            <h2 className="text-3xl md:text-5xl lg:text-7xl font-black tracking-tight mb-4 md:mb-6 pb-2 text-[#161616]">
              Faculty of <span className="text-[#1B61D9]">Information Technology</span>
            </h2>

            <h3 className="text-xl md:text-3xl font-bold text-gray-700 mb-6 md:mb-8 flex items-center justify-center gap-3">
              <span className="h-px w-8 md:w-12 bg-gray-300"></span>
              University of Moratuwa
              <span className="h-px w-8 md:w-12 bg-gray-300"></span>
            </h3>

            <p className="text-base md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-6 md:mb-10 px-4">
              A centralized collaborative learning ecosystem for <span className="font-bold text-[#1B61D9]">AI</span>, <span className="font-bold text-[#1B61D9]">IT</span>, and <span className="font-bold text-[#1B61D9]">ITM</span> students.
              <br />
              Connect, share, and excel together.
            </p>

            <Link href="/login">
              <Button size="lg" className="h-12 md:h-14 px-6 md:px-8 text-base md:text-lg rounded-full bg-[#1B61D9] hover:bg-[#1551b8] text-white shadow-lg hover:shadow-xl transition-all duration-300 border-0">
                Get Started Now <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>
          </div>

          {/* Single Feature Card */}
          <Card className="bg-white border-gray-100 shadow-xl w-full max-w-3xl">
            <CardContent className="p-6 md:p-8">
              <h3 className="text-xl md:text-2xl font-bold text-[#161616] mb-4 md:mb-6 text-center">What's Inside UniLearn?</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 md:p-4 bg-blue-50 rounded-xl mb-2 md:mb-3">
                    <FileText className="h-6 w-6 md:h-8 md:w-8 text-[#1B61D9]" />
                  </div>
                  <h4 className="font-semibold text-[#161616] mb-1 md:mb-2 text-sm md:text-base">Module Contents</h4>
                  <p className="text-xs md:text-sm text-gray-500">Access comprehensive lecture notes and study materials for all years</p>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="p-3 md:p-4 bg-blue-50 rounded-xl mb-2 md:mb-3">
                    <Users className="h-6 w-6 md:h-8 md:w-8 text-[#1B61D9]" />
                  </div>
                  <h4 className="font-semibold text-[#161616] mb-1 md:mb-2 text-sm md:text-base">Collaborative Learning</h4>
                  <p className="text-xs md:text-sm text-gray-500">Share knowledge across batches and contribute to the community</p>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="p-3 md:p-4 bg-blue-50 rounded-xl mb-2 md:mb-3">
                    <History className="h-6 w-6 md:h-8 md:w-8 text-[#1B61D9]" />
                  </div>
                  <h4 className="font-semibold text-[#161616] mb-1 md:mb-2 text-sm md:text-base">Edit History</h4>
                  <p className="text-xs md:text-sm text-gray-500">Track all changes and contributions made to module content</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>

        <footer className="py-8 text-center text-sm text-gray-400 border-t border-gray-100">
          <p>
            &copy; 2024 University Learning Dashboard.
          </p>
        </footer>
      </div>
    </div>
  )
}
