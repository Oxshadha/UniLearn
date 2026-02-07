'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { sanitizeText, sanitizeEmail } from '@/utils/sanitize'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, GraduationCap, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import BackgroundAnimation from '@/components/background-animation'
import Link from 'next/link'

export default function LoginPage() {
    const [indexNumber, setIndexNumber] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    // Parse index to extract batch info
    const parseIndex = (index: string) => {
        const clean = index.trim().toUpperCase()
        const match = clean.match(/^(\d{2})(\d{2})\d+[A-Za-z]?$/)

        if (!match) return null

        const batchNum = parseInt(match[1])
        const degreeCode = match[2]
        const currentYear = 25 - batchNum

        let degree = 'AI'
        let batchCode = `AI_Batch_${batchNum}`

        if (degreeCode === '55') {
            degree = 'AI'
            batchCode = `AI_Batch_${batchNum}`
        } else if (degreeCode === '40') {
            degree = 'IT'
            batchCode = `IT_Batch_${batchNum}`
        } else if (degreeCode === '50') {
            degree = 'ITM'
            batchCode = `ITM_Batch_${batchNum}`
        }

        return { batchNum, currentYear, degree, batchCode }
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const cleanIndex = indexNumber.trim().toUpperCase()
        const email = `${cleanIndex.toLowerCase()}@student.unilearn.edu`

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (authError) {
            setError(authError.message)
            setLoading(false)
            return
        }

        if (authData.user) {
            const parsed = parseIndex(cleanIndex)
            if (parsed) {
                const { data: batchData } = await supabase
                    .from('batches')
                    .select('id')
                    .eq('batch_code', parsed.batchCode)
                    .single()

                if (batchData) {
                    await supabase
                        .from('profiles')
                        .update({ batch_id: batchData.id })
                        .eq('id', authData.user.id)
                }
            }
        }

        router.push('/dashboard')
        router.refresh()
        setLoading(false)
    }

    const handleSignUp = async () => {
        setLoading(true)
        setError(null)

        const cleanIndex = indexNumber.trim().toUpperCase()
        const parsed = parseIndex(cleanIndex)

        if (!parsed) {
            setError("Invalid Index Number format. Expected: 235550X")
            setLoading(false)
            return
        }

        const { data: batchData, error: batchError } = await supabase
            .from('batches')
            .select('id')
            .eq('batch_code', parsed.batchCode)
            .single()

        if (batchError || !batchData) {
            const { data: degreeData } = await supabase
                .from('degrees')
                .select('id')
                .eq('code', parsed.degree)
                .single()

            if (!degreeData) {
                setError(`Degree ${parsed.degree} not found in system.`)
                setLoading(false)
                return
            }

            const { data: newBatch, error: createError } = await supabase
                .from('batches')
                .insert({
                    batch_code: parsed.batchCode,
                    degree_id: degreeData.id,
                    batch_number: parsed.batchNum,
                    current_semester: parsed.currentYear * 2 - 1
                })
                .select('id')
                .single()

            if (createError) {
                console.error('Batch creation error:', createError)
                setError("Could not create batch. Contact admin.")
                setLoading(false)
                return
            }
        }

        const { data: finalBatch } = await supabase
            .from('batches')
            .select('id')
            .eq('batch_code', parsed.batchCode)
            .single()

        if (!finalBatch) {
            setError("Batch not found. Please retry.")
            setLoading(false)
            return
        }

        const email = `${cleanIndex.toLowerCase()}@student.unilearn.edu`

        const { data: signupData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    index_number: cleanIndex,
                    full_name: '',
                    batch_id: finalBatch.id
                }
            }
        })

        if (signUpError) {
            setError(signUpError.message)
            setLoading(false)
            return
        }

        if (signupData.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ batch_id: finalBatch.id })
                .eq('id', signupData.user.id)

            if (profileError) {
                console.error('Profile update error:', profileError)
            }
        }

        alert(`Account created! Detected: ${parsed.degree} Batch ${parsed.batchNum} (Year ${parsed.currentYear})`)
        router.push('/dashboard')
        router.refresh()
        setLoading(false)
    }

    return (
        <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden bg-white">
            {/* Background Animation */}
            <BackgroundAnimation />

            {/* Back to Home Button */}
            <Link href="/" className="absolute top-6 left-6 z-20">
                <Button variant="ghost" className="text-gray-600 hover:text-[#1B61D9] hover:bg-blue-50">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Home
                </Button>
            </Link>

            {/* Login Card */}
            <Card className="w-full max-w-md shadow-2xl border-gray-100 relative z-10 bg-white">
                <CardHeader className="space-y-1 text-center pb-6">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-[#1B61D9] rounded-2xl shadow-lg">
                            <GraduationCap className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold text-[#161616]">
                        Welcome to UniLearn
                    </CardTitle>
                    <CardDescription className="text-base">
                        Sign in with your University Index Number
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="index" className="text-sm font-semibold text-gray-700">Index Number</Label>
                            <Input
                                id="index"
                                placeholder="235550X"
                                value={indexNumber}
                                onChange={(e) => setIndexNumber(sanitizeText(e.target.value))}
                                required
                                className="uppercase text-center text-lg font-mono tracking-wider h-12 border-2 border-gray-200 focus:border-[#1B61D9] focus:ring-[#1B61D9]"
                                maxLength={10}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-12 border-2 border-gray-200 focus:border-[#1B61D9] focus:ring-[#1B61D9] text-center pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#1B61D9] transition-colors"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                        {error && (
                            <p className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded-lg border border-red-200">
                                {error}
                            </p>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-semibold bg-[#1B61D9] hover:bg-[#1551b8] text-white shadow-md hover:shadow-lg transition-all"
                            disabled={loading}
                        >
                            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            Sign In
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 pt-2">
                    <div className="w-full border-t pt-4">
                        <Button
                            variant="outline"
                            className="w-full h-12 text-base font-semibold border-2 border-gray-200 hover:border-[#1B61D9] hover:bg-blue-50 hover:text-[#1B61D9]"
                            onClick={handleSignUp}
                            disabled={loading}
                        >
                            Register New Account
                        </Button>
                    </div>
                    <p className="text-xs text-center text-gray-500 px-4">
                        Your batch and year will be automatically detected from your Index Number
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}
