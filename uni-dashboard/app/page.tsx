import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, BookOpen, Users } from 'lucide-react'

export default function LandingPage() {
  const degrees = [
    { code: 'AI', name: 'Artificial Intelligence', icon: GraduationCap },
    { code: 'IT', name: 'Information Technology', icon: BookOpen },
    { code: 'ITM', name: 'IT Management', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <header className="px-6 py-4 flex justify-between items-center border-b bg-white dark:bg-zinc-900">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          UniLearn
        </h1>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </header>

      <main className="flex-1 container mx-auto px-4 py-16 flex flex-col items-center">
        <div className="text-center max-w-2xl mb-12">
          <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
            Collaborative Learning for Everyone
          </h2>
          <p className="text-lg text-muted-foreground">
            Access module contents, share knowledge across batches, and prep for exams together.
            Select your degree program to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
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
      </main>

      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        <p>&copy; 2024 University Learning Dashboard. Built for the Community.</p>
      </footer>
    </div>
  )
}
