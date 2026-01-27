'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '../../lib/postgrest'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../../components/ui/dialog'
import { Plus, Trash2, Edit2, Search, LogOut } from 'lucide-react'
import { useToast } from '../../hooks/use-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Person = {
    id: string
    full_name: string
    email: string | null
    company: string | null
    notes: string | null
    created_at: string
}

export default function AdminPage() {
    const router = useRouter()
    const [people, setPeople] = useState<Person[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingPerson, setEditingPerson] = useState<Person | null>(null)
    const { toast } = useToast()

    // Form state
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        company: '',
        notes: ''
    })

    const fetchPeople = useCallback(async () => {
        setLoading(true)
        const { data, error } = await db
            .from<Person>('people')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching people:', error)
            toast({
                title: 'Error',
                description: 'Failed to fetch people.',
                variant: 'destructive',
            })
        } else {
            setPeople((data as Person[]) || [])
        }
        setLoading(false)
    }, [toast])

    useEffect(() => {
        // Auth disabled - directly fetch people
        fetchPeople()
    }, [fetchPeople])


    const handleSave = async () => {
        if (!formData.full_name) {
            toast({
                title: 'Validation Error',
                description: 'Full Name is required',
                variant: 'destructive',
            })
            return
        }

        try {
            if (editingPerson) {
                // Update
                const { error } = await db
                    .from('people')
                    .update({
                        full_name: formData.full_name,
                        email: formData.email || null,
                        company: formData.company || null,
                        notes: formData.notes || null
                    })
                    .eq('id', editingPerson.id)

                if (error) throw error
                toast({ title: 'Success', description: 'Person updated successfully' })
            } else {
                // Create
                const { error } = await db
                    .from('people')
                    .insert([{
                        full_name: formData.full_name,
                        email: formData.email || null,
                        company: formData.company || null,
                        notes: formData.notes || null
                    }])

                if (error) throw error
                toast({ title: 'Success', description: 'Person created successfully' })
            }

            setIsDialogOpen(false)
            resetForm()
            fetchPeople()
        } catch (error) {
            console.error(error)
            toast({
                title: 'Error',
                description: 'Failed to save person',
                variant: 'destructive',
            })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this person?')) return

        try {
            const { error } = await db.from('people').delete().eq('id', id)
            if (error) throw error

            toast({ title: 'Success', description: 'Person deleted' })
            fetchPeople()
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete person',
                variant: 'destructive',
            })
        }
    }

    const handleSignOut = async () => {
        // Auth disabled - just redirect to home
        router.push('/')
    }

    const openEdit = (person: Person) => {
        setEditingPerson(person)
        setFormData({
            full_name: person.full_name,
            email: person.email || '',
            company: person.company || '',
            notes: person.notes || ''
        })
        setIsDialogOpen(true)
    }

    const resetForm = () => {
        setEditingPerson(null)
        setFormData({ full_name: '', email: '', company: '', notes: '' })
    }

    const filteredPeople = people.filter(p =>
        p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.company && p.company.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="container mx-auto p-6 md:py-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Manage people and participants.</p>
                </div>

                <div className="flex gap-2">
                    <Link href="/" passHref>
                        <Button variant="outline">Back to Home</Button>
                    </Link>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open)
                        if (!open) resetForm()
                    }}>
                        <DialogTrigger asChild>
                            <Button onClick={resetForm}><Plus className="mr-2 h-4 w-4" /> Add Person</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingPerson ? 'Edit Person' : 'Add New Person'}</DialogTitle>
                                <DialogDescription>
                                    Details for the participant to be stored in the database.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Full Name *</Label>
                                    <Input
                                        id="name"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="company">Company</Label>
                                    <Input
                                        id="company"
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Input
                                        id="notes"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleSave}>Save</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button variant="destructive" size="icon" onClick={handleSignOut} title="Sign Out">
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex items-center py-4">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">Loading...</TableCell>
                            </TableRow>
                        ) : filteredPeople.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">No people found.</TableCell>
                            </TableRow>
                        ) : (
                            filteredPeople.map((person) => (
                                <TableRow key={person.id}>
                                    <TableCell className="font-medium">{person.full_name}</TableCell>
                                    <TableCell>{person.email}</TableCell>
                                    <TableCell>{person.company}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(person)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(person.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

