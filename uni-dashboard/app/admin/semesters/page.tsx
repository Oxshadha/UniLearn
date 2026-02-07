import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'

export default async function AdminSemesterUpdate() {
    const supabase = await createClient()

    // Check if user is admin (you can add admin role check here)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Fetch current batch status
    const { data: batches } = await supabase
        .from('batches')
        .select('*')
        .order('batch_number', { ascending: false })

    async function incrementSemester(batchId: string) {
        'use server'
        const supabase = await createClient()
        await supabase.rpc('increment_batch_semester', { batch_id: batchId })
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Semester Management - Admin Only</CardTitle>
                    <p className="text-sm text-gray-600">
                        Click the buttons below to advance each batch to the next semester
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {batches?.map((batch) => (
                            <div key={batch.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <p className="font-semibold">Batch {batch.batch_number}</p>
                                    <p className="text-sm text-gray-600">
                                        Current: Semester {batch.current_semester} (Year {Math.ceil(batch.current_semester / 2)})
                                    </p>
                                </div>
                                <form action={incrementSemester.bind(null, batch.id)}>
                                    <Button type="submit" size="sm">
                                        → Semester {batch.current_semester + 1}
                                    </Button>
                                </form>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <strong>When to update:</strong> At the end of each semester (usually June and December)
                        </p>
                        <p className="text-xs text-blue-600 mt-2">
                            Click the button for each batch to move them to the next semester
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
