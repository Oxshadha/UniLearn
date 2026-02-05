'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
    const [indexNumber, setIndexNumber] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        // Map Index Number to Email for Supabase Auth
        const email = `${indexNumber.trim()}@uni.local`

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (authError) {
            setError(authError.message)
            setLoading(false)
        } else {
            router.push('/dashboard')
            router.refresh()
        }
    }

    const handleSignUp = async () => {
        setLoading(true)
        setError(null)

        const email = `${indexNumber.trim()}@uni.local`

        // Simple sign up for demo purposes - in prod, you'd want Admin creation or verification
        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    index_number: indexNumber,
                    // defaulting to 'student' role, backend trigger should handle batch assignment if possible
                    // or we configure it later
                }
            }
        })

        if (signUpError) {
            setError(signUpError.message)
            setLoading(false)
        } else {
            alert("Account created! You can now log in.")
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">UniLearn

                    </CardTitle>
                    <CardDescription className="text-center">
                        Enter your Index Number (e.g., 235550X)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="index">Index Number</Label>
                            <Input
                                id="index"
                                placeholder="235550X"
                                value={indexNumber}
                                onChange={(e) => setIndexNumber(e.target.value)}
                                required
                                className="uppercase placeholder:normal-case"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <div className="text-sm text-center text-muted-foreground">
                        First time?
                    </div>
                    <Button variant="outline" className="w-full" onClick={handleSignUp} disabled={loading}>
                        Register New ID
                    </Button>

                </CardFooter>
            </Card>
        </div>
    )
}
