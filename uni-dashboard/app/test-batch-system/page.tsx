import BatchSystemTest from '@/components/batch-system-test'

export default function TestPage() {
    // Using a test module ID - replace with actual module ID from your database
    const testModuleId = '00000000-0000-0000-0000-000000000001' // Update this!

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">Batch Versioning Test</h1>
                <p className="text-gray-600 mb-6">
                    This page tests the database schema and API endpoints before full integration
                </p>

                <BatchSystemTest moduleId={testModuleId} />

                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                        <li>Make sure you've run the supabase_schema.sql in your database</li>
                        <li>Update the testModuleId above with a real module ID from your database</li>
                        <li>Click "Run All Tests" to verify the system works</li>
                        <li>Check that all tests pass before proceeding with frontend integration</li>
                    </ol>
                </div>
            </div>
        </div>
    )
}
