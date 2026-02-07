'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, Database, Globe, Code } from 'lucide-react'

/**
 * Test page to verify batch-versioned system
 * Tests: Database schema, API endpoints, batch logic
 */
export default function BatchSystemTest({ moduleId }: { moduleId: string }) {
    const [testResults, setTestResults] = useState<any>({})
    const [isRunning, setIsRunning] = useState(false)

    const runTests = async () => {
        setIsRunning(true)
        const results: any = {}

        try {
            // Test 1: Fetch batches endpoint
            console.log('Testing batches endpoint...')
            const batchesRes = await fetch(`/api/modules/${moduleId}/batches`)
            results.batchesAPI = {
                passed: batchesRes.ok,
                data: batchesRes.ok ? await batchesRes.json() : null,
                error: !batchesRes.ok ? await batchesRes.text() : null
            }

            // Test 2: Fetch content for a batch
            if (results.batchesAPI.passed && results.batchesAPI.data?.userBatchNumber) {
                const batch = results.batchesAPI.data.userBatchNumber
                console.log(`Testing content endpoint for batch ${batch}...`)
                const contentRes = await fetch(`/api/modules/${moduleId}/content?batch=${batch}`)
                results.contentAPI = {
                    passed: contentRes.ok,
                    data: contentRes.ok ? await contentRes.json() : null,
                    error: !contentRes.ok ? await contentRes.text() : null
                }
            }

            // Test 3: Save content (if current batch)
            if (results.batchesAPI.passed) {
                const userBatch = results.batchesAPI.data?.userBatchNumber
                console.log(`Testing save endpoint for batch ${userBatch}...`)
                const saveRes = await fetch(`/api/modules/${moduleId}/content`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        batchNumber: userBatch,
                        contentJson: {
                            topics: [{ id: 'test1', title: 'Test Topic', subTopics: [] }],
                            additionalNotes: 'Test save from batch system test'
                        },
                        lecturerName: 'Test Lecturer'
                    })
                })
                results.saveAPI = {
                    passed: saveRes.ok,
                    data: saveRes.ok ? await saveRes.json() : null,
                    error: !saveRes.ok ? await saveRes.text() : null
                }
            }

        } catch (error) {
            results.error = error instanceof Error ? error.message : 'Unknown error'
        }

        setTestResults(results)
        setIsRunning(false)
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Batch Versioning System Test Suite
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                        Testing database schema, API endpoints, and batch logic
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={runTests} disabled={isRunning}>
                        {isRunning ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Running Tests...
                            </>
                        ) : (
                            'Run All Tests'
                        )}
                    </Button>

                    {Object.keys(testResults).length > 0 && (
                        <div className="space-y-3 mt-6">
                            {/* Test 1: Batches API */}
                            {testResults.batchesAPI && (
                                <TestResult
                                    title="GET /api/modules/[id]/batches"
                                    icon={<Globe className="h-4 w-4" />}
                                    passed={testResults.batchesAPI.passed}
                                    data={testResults.batchesAPI.data}
                                    error={testResults.batchesAPI.error}
                                />
                            )}

                            {/* Test 2: Content API */}
                            {testResults.contentAPI && (
                                <TestResult
                                    title="GET /api/modules/[id]/content?batch=X"
                                    icon={<Code className="h-4 w-4" />}
                                    passed={testResults.contentAPI.passed}
                                    data={testResults.contentAPI.data}
                                    error={testResults.contentAPI.error}
                                />
                            )}

                            {/* Test 3: Save API */}
                            {testResults.saveAPI && (
                                <TestResult
                                    title="POST /api/modules/[id]/content"
                                    icon={<Code className="h-4 w-4" />}
                                    passed={testResults.saveAPI.passed}
                                    data={testResults.saveAPI.data}
                                    error={testResults.saveAPI.error}
                                />
                            )}

                            {/* Overall Error */}
                            {testResults.error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-800 font-medium">Test Suite Error:</p>
                                    <p className="text-red-600 text-sm mt-1">{testResults.error}</p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function TestResult({ title, icon, passed, data, error }: any) {
    return (
        <div className={`p-4 rounded-lg border ${passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-medium">{title}</span>
                </div>
                {passed ? (
                    <Badge className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Passed
                    </Badge>
                ) : (
                    <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                    </Badge>
                )}
            </div>

            {data && (
                <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                        View Response Data
                    </summary>
                    <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </details>
            )}

            {error && (
                <div className="mt-2 text-sm text-red-600">
                    <strong>Error:</strong> {error}
                </div>
            )}
        </div>
    )
}
