import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminSemesterUpdate() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        redirect('/dashboard')
    }

    const { data: batches } = await supabase
        .from('batches')
        .select('*')
        .order('batch_number', { ascending: false })

    async function incrementSemester(batchId: string) {
        'use server'
        const supabase = await createClient()
        await supabase.rpc('increment_batch_semester', { batch_id: batchId })
    }

    async function setSemester(formData: FormData) {
        'use server'
        const supabase = await createClient()

        const batchId = String(formData.get('batchId') || '')
        const value = Number.parseInt(String(formData.get('semester') || ''), 10)
        const semester = Number.isNaN(value) ? 1 : Math.max(1, Math.min(8, value))

        await supabase
            .from('batches')
            .update({ current_semester: semester })
            .eq('id', batchId)
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#161616]">Semester Management</h1>
                    <p className="text-sm text-gray-600 mt-1">Admin-only controls for batch progression.</p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/admin">Back to Admin</Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Batch Semester Controls</CardTitle>
                    <p className="text-sm text-gray-600">
                        Set exact semester manually (1-8) or advance by +1.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {batches?.map((batch) => (
                            <div key={batch.id} className="flex flex-col gap-4 p-4 border rounded-lg md:flex-row md:items-center md:justify-between">
                                <div className="min-w-[220px]">
                                    <p className="font-semibold">Batch {batch.batch_number}</p>
                                    <p className="text-sm text-gray-600">
                                        Current: Semester {batch.current_semester} (Year {Math.ceil(batch.current_semester / 2)})
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                    <form action={setSemester} className="flex items-center gap-2">
                                        <input type="hidden" name="batchId" value={batch.id} />
                                        <Input
                                            type="number"
                                            name="semester"
                                            min={1}
                                            max={8}
                                            defaultValue={batch.current_semester}
                                            className="w-24"
                                        />
                                        <Button type="submit" size="sm" variant="outline">
                                            Set
                                        </Button>
                                    </form>
                                    <form action={incrementSemester.bind(null, batch.id)}>
                                        <Button type="submit" size="sm" style={{ backgroundColor: '#1B61D9' }}>
                                            Advance +1
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <strong>Guideline:</strong> Update at semester transitions. Use manual set when academic schedules shift.
                        </p>
                        <p className="text-xs text-blue-600 mt-2">
                            Semester gating is enforced in backend for content and past-paper actions.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
