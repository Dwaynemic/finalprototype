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
import { Calendar, Plus, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { functionsBase } from '../utils/supabase/info';

type AppointmentManagementProps = {
  user: User;
  accessToken: string;
  userRole: 'owner' | 'staff';
};

type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string;
};

type Appointment = {
  id: string;
  petId: string;
  petName: string;
  dateTime: string;
  reason: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export function AppointmentManagement({ user, accessToken, userRole }: AppointmentManagementProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    petId: '',
    petName: '',
    dateTime: '',
    reason: '',
    notes: '',
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  });
  const [selectedPetOwnerName, setSelectedPetOwnerName] = useState<string>('');
  const [selectedPetOwnerEmail, setSelectedPetOwnerEmail] = useState<string>('');
  const [confirmationMessage, setConfirmationMessage] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  // Poll for updates to appointments every 10 seconds to simulate real-time availability
  useEffect(() => {
    const id = setInterval(() => {
      fetchData();
    }, 10000);
    return () => clearInterval(id);
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      // Fetch pets for the form
      if (userRole === 'owner') {
        const petsRes = await fetch(
          `${functionsBase}/pets`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          }
        );
        if (petsRes.ok) {
          const data = await petsRes.json();
          setPets(data.pets || []);
        }

        // Fetch user's appointments
        const appointmentsRes = await fetch(
          `${functionsBase}/appointments`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          }
        );
        if (appointmentsRes.ok) {
          const data = await appointmentsRes.json();
          setAppointments(data.appointments || []);
        }
      } else {
        // Fetch all pets for staff
        const petsRes = await fetch(
          `${functionsBase}/pets/all`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          }
        );
        if (petsRes.ok) {
          const data = await petsRes.json();
          setPets(data.pets || []);
        }

        // Fetch blocks (staff-only)
        const blocksRes = await fetch(
          `${functionsBase}/blocks`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        if (blocksRes.ok) {
          const d = await blocksRes.json();
          setBlocks(d.blocks || []);
        }

        // Fetch all appointments for staff
        const appointmentsRes = await fetch(
          `${functionsBase}/appointments/all`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          }
        );
        if (appointmentsRes.ok) {
          const data = await appointmentsRes.json();
          setAppointments(data.appointments || []);
        }
      }
    } catch (error) {
      console.error('Error fetching appointment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let response;
      // If editing an existing appointment
      if (selectedAppointment) {
        response = await fetch(
          `${functionsBase}/appointments/${selectedAppointment.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(formData),
          }
        );
      } else {
        response = await fetch(
          `${functionsBase}/appointments`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(formData),
          }
        );
      }

      if (response.ok) {
        const scheduledAt = formData.dateTime;
        await fetchData();
        setIsDialogOpen(false);
        // Show confirmation: if staff scheduled, show owner name
        const who = userRole === 'staff' ? (selectedPetOwnerName || 'the owner') : user.name;
        setConfirmationMessage(`Appointment scheduled for ${who} on ${formatDateTime(scheduledAt)}`);
        setFormData({ petId: '', petName: '', dateTime: '', reason: '', notes: '' });
        setSelectedPetOwnerName('');
        setSelectedPetOwnerEmail('');
        setSelectedAppointment(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create appointment');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to create appointment');
    }
  };

  const handleUpdateStatus = async (appointmentId: string, status: string) => {
    try {
      const response = await fetch(
        `${functionsBase}/appointments/${appointmentId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Generate time slots for the selected date (09:00 - 17:00 every 30 minutes)
  const generateSlots = (dateStr: string) => {
    const slots: { time: string; dateTimeIso: string }[] = [];
    const date = new Date(dateStr + 'T00:00:00');
    const startHour = 9;
    const endHour = 17;
    for (let h = startHour; h < endHour; h++) {
      for (let m of [0, 30]) {
        const dt = new Date(date);
        dt.setHours(h, m, 0, 0);
        slots.push({
          time: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dateTimeIso: dt.toISOString()
        });
      }
    }
    return slots;
  };

  const isSlotAvailable = (iso: string) => {
    const requested = new Date(iso).getTime();
    // Consider slot unavailable if any appointment is within 30 minutes
    // If the day is blocked, slots are unavailable
    const dateStr = new Date(iso).toISOString().slice(0,10);
    if (blocks.some(b => b.date === dateStr)) return false;

    return !appointments.some(apt => {
      if (apt.status === 'cancelled') return false;
      const aptTime = new Date(apt.dateTime).getTime();
      return Math.abs(aptTime - requested) < 30 * 60 * 1000;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const sortedAppointments = [...appointments].sort((a, b) => 
    new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {confirmationMessage && (
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-green-800">{confirmationMessage}</p>
            </div>
            <div>
              <Button variant="ghost" onClick={() => setConfirmationMessage('')}>Close</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-gray-900">
            {userRole === 'owner' ? 'My Appointments' : 'All Appointments'}
          </h2>
          <p className="text-gray-600 mt-1">
            {userRole === 'owner' 
              ? 'Schedule and manage your pet appointments' 
              : 'View and manage all Pet House Veterinary Clinic appointments'}
          </p>

          {/* Date selector + availability slots */}
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <Label htmlFor="slotDate">Choose date</Label>
              <Input
                id="slotDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-4 gap-2 mt-3">
              {generateSlots(selectedDate).map((slot) => {
                const available = isSlotAvailable(slot.dateTimeIso);
                return (
                  <button
                    key={slot.dateTimeIso}
                    type="button"
                    onClick={() => {
                      if (!available) return;
                      setFormData({ ...formData, dateTime: slot.dateTimeIso });
                      setIsDialogOpen(true);
                    }}
                    className={`px-2 py-1 rounded text-sm font-medium ${available ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 cursor-not-allowed'}`}
                    aria-disabled={!available}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Appointment</DialogTitle>
              <DialogDescription>Book a new appointment for your pet</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="petId">Select Pet *</Label>
                <Select
                  value={formData.petId}
                  onValueChange={(value: string) => {
                    const pet: any = pets.find(p => p.id === value);
                    setFormData({
                      ...formData,
                      petId: value,
                      petName: pet?.name || '',
                    });
                    // If staff selects a pet, show owner info enriched by the server
                    setSelectedPetOwnerName(pet?.ownerName || '');
                    setSelectedPetOwnerEmail(pet?.ownerEmail || '');
                  }}
                >
                  <SelectTrigger id="petId">
                    <SelectValue placeholder="Choose a pet" />
                  </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet: any) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name} ({pet.species}) {pet.ownerName ? `- Owner: ${pet.ownerName}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTime">Date & Time *</Label>
                <Input
                  id="dateTime"
                  type="datetime-local"
                  value={formData.dateTime}
                  onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                  required
                />
              </div>

              {/* Show owner info for staff when a pet is selected */}
              {userRole === 'staff' && selectedPetOwnerName && (
                <div className="space-y-2">
                  <Label>Appointment For</Label>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-gray-900 font-medium">{selectedPetOwnerName}</p>
                    {selectedPetOwnerEmail && <p className="text-gray-600">{selectedPetOwnerEmail}</p>}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Visit *</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., Annual checkup, vaccination, illness..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special instructions or concerns..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Schedule</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {sortedAppointments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No appointments scheduled</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule First Appointment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedAppointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-gray-900">{appointment.petName}</h3>
                      <Badge
                        variant={
                          appointment.status === 'completed' ? 'default' :
                          appointment.status === 'cancelled' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {getStatusIcon(appointment.status)}
                        <span className="ml-1">{appointment.status}</span>
                      </Badge>
                    </div>
                    <div className="space-y-2 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDateTime(appointment.dateTime)}</span>
                      </div>
                      <div>
                        <p className="text-gray-900">{appointment.reason}</p>
                      </div>
                      {appointment.notes && (
                        <div className="mt-2 p-3 bg-gray-50 rounded">
                          <p className="text-gray-700">{appointment.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {userRole === 'staff' && appointment.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(appointment.id, 'completed')}
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          // Open edit dialog pre-filled for rescheduling
                          setSelectedAppointment(appointment);
                          setFormData({
                            petId: appointment.petId,
                            petName: appointment.petName,
                            dateTime: appointment.dateTime,
                            reason: appointment.reason,
                            notes: appointment.notes || '',
                          });
                          setIsDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleUpdateStatus(appointment.id, 'approved')}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUpdateStatus(appointment.id, 'cancelled')}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
