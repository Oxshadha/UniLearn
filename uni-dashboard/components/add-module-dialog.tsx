'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { validateModuleCode, sanitizeText } from '@/utils/sanitize'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'

interface Props {
    year: number
    onModuleAdded: () => void
}

export default function AddModuleDialog({ year, onModuleAdded }: Props) {
    const [open, setOpen] = useState(false)
    const [code, setCode] = useState('')
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!code.trim() || !name.trim()) {
            setError('Please fill in all fields')
            return
        }

        setLoading(true)
        setError(null)

        // Validate module code format and year matching
        const validation = validateModuleCode(code, year)
        if (!validation.isValid) {
            setError(validation.error || 'Invalid module code format')
            setLoading(false)
            return
        }

        // Sanitize module name
        const sanitizedName = sanitizeText(name)
        if (!sanitizedName) {
            setError('Invalid module name')
            setLoading(false)
            return
        }

        const { error: insertError } = await supabase
            .from('modules')
            .insert({
                code: validation.sanitized,  // Use validated and sanitized code
                name: sanitizedName,
                year: year
            })

        if (insertError) {
            if (insertError.code === '23505') {
                setError('A module with this code already exists')
            } else {
                setError(insertError.message)
            }
        } else {
            setCode('')
            setName('')
            setOpen(false)
            onModuleAdded()
        }

        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button style={{ backgroundColor: '#1B61D9' }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Module
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Module to Year {year}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="code">Module Code</Label>
                        <Input
                            id="code"
                            placeholder="e.g., IN1621"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="uppercase font-mono"
                            maxLength={6}
                        />
                        <p className="text-xs text-gray-500">
                            Format: 2 letters + 4 digits. First digit should match year (Year {year} → {year}XXX or {year + 1}XXX)
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Module Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g., Introduction to IT"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    {error && (
                        <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} style={{ backgroundColor: '#1B61D9' }}>
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Add Module
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
