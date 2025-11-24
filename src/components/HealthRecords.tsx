import { useState, useEffect } from 'react';
import { User } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, FileText, Syringe, Pill, Activity, Calendar } from 'lucide-react';
import { projectId, functionsBase } from '../utils/supabase/info';

type HealthRecordsProps = {
  user: User;
  accessToken: string;
  userRole: 'owner' | 'staff';
};

type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string;
  dateOfBirth: string;
};

type HealthRecord = {
  id: string;
  petId: string;
  recordType: string;
  title: string;
  description: string;
  date: string;
  veterinarian?: string;
  medications?: string;
  followUp?: string;
  createdAt: string;
};

export function HealthRecords({ user, accessToken, userRole }: HealthRecordsProps) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    petId: '',
    recordType: 'checkup',
    title: '',
    description: '',
    date: '',
    veterinarian: '',
    medications: '',
    followUp: '',
  });

  useEffect(() => {
    fetchPets();
  }, []);

  useEffect(() => {
    if (selectedPetId) {
      fetchRecords(selectedPetId);
    }
  }, [selectedPetId]);

  const fetchPets = async () => {
    try {
      const endpoint = userRole === 'owner' 
        ? `${functionsBase}/pets`
        : `${functionsBase}/pets/all`;

      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPets(data.pets || []);
        if (data.pets.length > 0) {
          setSelectedPetId(data.pets[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching pets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecords = async (petId: string) => {
    try {
      const response = await fetch(
        `${functionsBase}/health-records/${petId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('Error fetching health records:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `${functionsBase}/health-records`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        await fetchRecords(formData.petId);
        setIsDialogOpen(false);
        setFormData({
          petId: '',
          recordType: 'checkup',
          title: '',
          description: '',
          date: '',
          veterinarian: '',
          medications: '',
          followUp: '',
        });
      }
    } catch (error) {
      console.error('Error creating health record:', error);
    }
  };

  const getRecordIcon = (recordType: string) => {
    switch (recordType) {
      case 'vaccination':
        return <Syringe className="w-5 h-5 text-blue-600" />;
      case 'medication':
        return <Pill className="w-5 h-5 text-purple-600" />;
      case 'surgery':
        return <Activity className="w-5 h-5 text-red-600" />;
      default:
        return <FileText className="w-5 h-5 text-green-600" />;
    }
  };

  const selectedPet = pets.find(p => p.id === selectedPetId);
  const sortedRecords = [...records].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const recordsByType = {
    all: sortedRecords,
    checkup: sortedRecords.filter(r => r.recordType === 'checkup'),
    vaccination: sortedRecords.filter(r => r.recordType === 'vaccination'),
    medication: sortedRecords.filter(r => r.recordType === 'medication'),
    surgery: sortedRecords.filter(r => r.recordType === 'surgery'),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No pets available to view health records</p>
          {userRole === 'owner' && (
            <p className="text-gray-600">Please add a pet first to manage health records</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-gray-900">Health Records</h2>
          <p className="text-gray-600 mt-1">View and manage medical history</p>
        </div>
        {userRole === 'staff' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Health Record</DialogTitle>
                <DialogDescription>Record medical information for a pet</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="petId">Select Pet *</Label>
                  <Select
                    value={formData.petId}
                    onValueChange={(value: string) => setFormData({ ...formData, petId: value })}
                  >
                    <SelectTrigger id="petId">
                      <SelectValue placeholder="Choose a pet" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name} ({pet.species})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recordType">Record Type *</Label>
                  <Select
                    value={formData.recordType}
                    onValueChange={(value: string) => setFormData({ ...formData, recordType: value })}
                  >
                    <SelectTrigger id="recordType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checkup">General Checkup</SelectItem>
                      <SelectItem value="vaccination">Vaccination</SelectItem>
                      <SelectItem value="medication">Medication</SelectItem>
                      <SelectItem value="surgery">Surgery/Procedure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Annual Checkup, Rabies Vaccination"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="veterinarian">Veterinarian</Label>
                  <Input
                    id="veterinarian"
                    placeholder="Dr. Name"
                    value={formData.veterinarian}
                    onChange={(e) => setFormData({ ...formData, veterinarian: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Detailed notes about the visit, findings, diagnosis..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medications">Medications Prescribed</Label>
                  <Textarea
                    id="medications"
                    placeholder="List medications, dosage, and frequency..."
                    value={formData.medications}
                    onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="followUp">Follow-up Instructions</Label>
                  <Textarea
                    id="followUp"
                    placeholder="Next steps, follow-up appointment date..."
                    value={formData.followUp}
                    onChange={(e) => setFormData({ ...formData, followUp: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Record</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Pet Selector */}
      <Card>
        <CardContent className="pt-6">
          <Label htmlFor="petSelector">Select Pet</Label>
          <Select value={selectedPetId} onValueChange={setSelectedPetId}>
            <SelectTrigger id="petSelector" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pets.map((pet) => (
                <SelectItem key={pet.id} value={pet.id}>
                  {pet.name} - {pet.species} ({pet.breed})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Records Display */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({recordsByType.all.length})</TabsTrigger>
          <TabsTrigger value="checkup">Checkups ({recordsByType.checkup.length})</TabsTrigger>
          <TabsTrigger value="vaccination">Vaccines ({recordsByType.vaccination.length})</TabsTrigger>
          <TabsTrigger value="medication">Meds ({recordsByType.medication.length})</TabsTrigger>
          <TabsTrigger value="surgery">Surgery ({recordsByType.surgery.length})</TabsTrigger>
        </TabsList>

        {Object.entries(recordsByType).map(([type, typeRecords]) => (
          <TabsContent key={type} value={type}>
            {typeRecords.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No {type === 'all' ? '' : type} records found for {selectedPet?.name}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {typeRecords.map((record) => (
                  <Card key={record.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        {getRecordIcon(record.recordType)}
                        <div>
                          <div>{record.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="w-4 h-4 text-gray-600" />
                            <span className="text-gray-600">
                              {new Date(record.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Badge className="mb-2">{record.recordType}</Badge>
                        <p className="text-gray-900">{record.description}</p>
                      </div>
                      
                      {record.veterinarian && (
                        <div className="pt-3 border-t">
                          <p className="text-gray-600">Veterinarian</p>
                          <p className="text-gray-900">{record.veterinarian}</p>
                        </div>
                      )}
                      
                      {record.medications && (
                        <div className="pt-3 border-t">
                          <p className="text-gray-600">Medications</p>
                          <p className="text-gray-900">{record.medications}</p>
                        </div>
                      )}
                      
                      {record.followUp && (
                        <div className="pt-3 border-t">
                          <p className="text-gray-600">Follow-up</p>
                          <p className="text-gray-900">{record.followUp}</p>
                        </div>
                      )}
                      
                      <div className="pt-3 border-t">
                        <p className="text-gray-600">
                          Added on {new Date(record.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
