import { useState, useEffect } from 'react';
import { User } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Plus, PawPrint, Calendar, Syringe } from 'lucide-react';
import { functionsBase, supabase } from '../utils/supabase/info';

type PetManagementProps = {
  user: User;
  accessToken: string;
};

type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string;
  dateOfBirth: string;
  weight: string;
  microchipId?: string;
  nextVaccinationDate?: string;
  medicalNotes?: string;
  createdAt: string;
};

export function PetManagement({ user, accessToken }: PetManagementProps) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    species: '',
    breed: '',
    dateOfBirth: '',
    weight: '',
    microchipId: '',
    nextVaccinationDate: '',
    medicalNotes: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);

  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async () => {
    try {
      const response = await fetch(
          `${functionsBase}/pets`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPets(data.pets || []);
      }
    } catch (error) {
      console.error('Error fetching pets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // If a photo is selected upload it to Supabase Storage first
      let photoUrl: string | undefined = undefined;
      if (selectedFile) {
        // Ensure you have created a bucket named `pet-photos` in your Supabase project
        const timestamp = Date.now();
        const filePath = `pet-${timestamp}-${selectedFile.name}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('pet-photos')
          .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          console.error('Photo upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage.from('pet-photos').getPublicUrl(filePath);
          photoUrl = urlData.publicUrl;
        }
      }

      const payload = { ...formData, photoUrl };

      let response;
      if (editingPetId) {
        // Update existing pet
        response = await fetch(
          `${functionsBase}/pets/${editingPetId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        // Create new pet
        response = await fetch(
          `${functionsBase}/pets`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
          }
        );
      }

      if (response.ok) {
        await fetchPets();
        setIsDialogOpen(false);
        setFormData({
          name: '',
          species: '',
          breed: '',
          dateOfBirth: '',
          weight: '',
          microchipId: '',
          nextVaccinationDate: '',
          medicalNotes: '',
        });
        setSelectedFile(null);
        setEditingPetId(null);
      } else if (response.status === 409) {
        // Duplicate detected — server returns { error, pet }
        const data = await response.json();
        if (data?.pet) {
          // Offer to edit existing pet
          if (confirm('A similar pet already exists. Open existing pet for editing?')) {
            const existing = data.pet;
            setEditingPetId(existing.id);
            setFormData({
              name: existing.name || '',
              species: existing.species || '',
              breed: existing.breed || '',
              dateOfBirth: existing.dateOfBirth || '',
              weight: existing.weight || '',
              microchipId: existing.microchipId || '',
              nextVaccinationDate: existing.nextVaccinationDate || '',
              medicalNotes: existing.medicalNotes || '',
            });
            setIsDialogOpen(true);
          }
        } else {
          alert('A similar pet already exists.');
        }
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || 'Failed to create pet');
      }
    } catch (error) {
      console.error('Error creating pet:', error);
    }
  };

  const handleDelete = async (petId: string) => {
    if (!confirm('Delete this pet? This action cannot be undone.')) return;
    try {
      console.log('Deleting pet', petId);
      const res = await fetch(`${functionsBase}/pets/${encodeURIComponent(petId)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (res.ok) {
        await fetchPets();
      } else {
        // Try to parse JSON first, otherwise show plain text
        let bodyText = '';
        try {
          const json = await res.json();
          bodyText = json?.error ? `${json.error}` : JSON.stringify(json);
        } catch (e) {
          try { bodyText = await res.text(); } catch (e2) { bodyText = '<unreadable response>'; }
        }
        console.error('Delete failed', res.status, bodyText, { petId });
        alert(`Failed to delete pet (${res.status}) for id ${petId}: ${bodyText}`);
      }
    } catch (err) {
      console.error('Delete pet error', err);
      alert('Failed to delete pet');
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                        (today.getMonth() - birthDate.getMonth());
    
    if (ageInMonths < 12) {
      return `${ageInMonths} months`;
    }
    const years = Math.floor(ageInMonths / 12);
    const months = ageInMonths % 12;
    return months > 0 ? `${years} years, ${months} months` : `${years} years`;
  };

  const isVaccinationDue = (nextVaccinationDate?: string) => {
    if (!nextVaccinationDate) return false;
    const vacDate = new Date(nextVaccinationDate);
    const today = new Date();
    const daysUntil = Math.ceil((vacDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 14;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-gray-900">My Pets</h2>
          <p className="text-gray-600 mt-1">Manage your pet profiles and information</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Pet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Pet</DialogTitle>
              <DialogDescription>Enter your pet's information</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Pet Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="photo">Pet Photo</Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={(e: any) => setSelectedFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="species">Species *</Label>
                  <Input
                    id="species"
                    placeholder="e.g., Dog, Cat"
                    value={formData.species}
                    onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="breed">Breed *</Label>
                  <Input
                    id="breed"
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="microchipId">Microchip ID</Label>
                  <Input
                    id="microchipId"
                    value={formData.microchipId}
                    onChange={(e) => setFormData({ ...formData, microchipId: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nextVaccinationDate">Next Vaccination Date</Label>
                  <Input
                    id="nextVaccinationDate"
                    type="date"
                    value={formData.nextVaccinationDate}
                    onChange={(e) => setFormData({ ...formData, nextVaccinationDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="medicalNotes">Medical Notes</Label>
                  <Textarea
                    id="medicalNotes"
                    placeholder="Any allergies, conditions, or important information..."
                    value={formData.medicalNotes}
                    onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Pet</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {pets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <PawPrint className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">You haven't added any pets yet</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Pet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pets.map((pet) => (
            <Card key={pet.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PawPrint className="w-5 h-5 text-primary" />
                  {pet.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs text-gray-400 mb-2">ID: {pet.id}</div>
              </CardContent>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-gray-600">Species & Breed</p>
                  <p className="text-gray-900">{pet.species} - {pet.breed}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-900">{calculateAge(pet.dateOfBirth)}</span>
                </div>
                <div>
                  <p className="text-gray-600">Weight</p>
                  <p className="text-gray-900">{pet.weight} kg</p>
                </div>
                {pet.microchipId && (
                  <div>
                    <p className="text-gray-600">Microchip ID</p>
                    <p className="text-gray-900">{pet.microchipId}</p>
                  </div>
                )}
                {pet.nextVaccinationDate && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Syringe className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-600">Next Vaccination</span>
                      </div>
                      {isVaccinationDue(pet.nextVaccinationDate) && (
                        <Badge variant="destructive">Due Soon</Badge>
                      )}
                    </div>
                    <p className="text-gray-900 mt-1">
                      {new Date(pet.nextVaccinationDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {pet.medicalNotes && (
                  <div className="pt-2 border-t">
                    <p className="text-gray-600">Medical Notes</p>
                    <p className="text-gray-900 line-clamp-2">{pet.medicalNotes}</p>
                  </div>
                )}
                <div className="pt-2 border-t flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Open edit dialog pre-filled
                      setEditingPetId(pet.id);
                      setFormData({
                        name: pet.name || '',
                        species: pet.species || '',
                        breed: pet.breed || '',
                        dateOfBirth: pet.dateOfBirth || '',
                        weight: pet.weight || '',
                        microchipId: pet.microchipId || '',
                        nextVaccinationDate: pet.nextVaccinationDate || '',
                        medicalNotes: pet.medicalNotes || '',
                      });
                      setIsDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(pet.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}