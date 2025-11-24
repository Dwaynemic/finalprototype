import { useState, useEffect } from 'react';
import { User } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Bell, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { functionsBase } from '../utils/supabase/info';

type OwnerHomeProps = {
  user: User;
  accessToken: string;
};

type Reminder = {
  type: string;
  petId: string;
  id?: string;
  petName?: string;
  message: string;
  dateTime: string;
  priority: string;
};

type Appointment = {
  id: string;
  petId: string;
  petName: string;
  dateTime: string;
  reason: string;
  status: string;
};

export function OwnerHome({ user, accessToken }: OwnerHomeProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [readReminders, setReadReminders] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(`read_reminders:${user?.id}`);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch reminders
      const remindersRes = await fetch(
        `${functionsBase}/reminders`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );
      
      if (remindersRes.ok) {
        const data = await remindersRes.json();
        setReminders(data.reminders || []);
      }

      // Fetch appointments
      const appointmentsRes = await fetch(
        `${functionsBase}/appointments`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );
      
      if (appointmentsRes.ok) {
        const data = await appointmentsRes.json();
        const upcoming = data.appointments
          .filter((apt: Appointment) => 
            apt.status === 'pending' && 
            new Date(apt.dateTime) > new Date()
          )
          .sort((a: Appointment, b: Appointment) => 
            new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
          )
          .slice(0, 5);
        setUpcomingAppointments(upcoming);
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRead = (id?: string) => {
    if (!id) return;
    setReadReminders((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(`read_reminders:${user?.id}`, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to persist read reminders', e);
      }
      return next;
    });
  };

  // Reminder dismissal removed — reminders are informational only in this build.

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome back, {user.name}!</CardTitle>
          <CardDescription>Here's what's happening with your pets today</CardDescription>
        </CardHeader>
      </Card>

      {/* Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Reminders & Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <p>All caught up! No pending reminders.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((reminder, index) => {
                const id = reminder.id || `reminder-local-${index}`;
                const isRead = !!readReminders[id];
                return (
                <div
                  key={id}
                  className={`p-4 rounded-lg border-l-4 flex items-start justify-between ${
                    reminder.priority === 'high'
                      ? 'bg-red-50 border-red-500'
                      : 'bg-yellow-50 border-yellow-500'
                  } ${isRead ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`w-5 h-5 mt-0.5 ${
                        reminder.priority === 'high' ? 'text-red-600' : 'text-yellow-600'
                      }`}
                    />
                    <div>
                      <p className={`text-gray-900 ${isRead ? 'line-through' : ''}`}>{reminder.message}</p>
                      <p className="text-gray-600 mt-1">{formatDate(reminder.dateTime)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={reminder.priority === 'high' ? 'destructive' : 'default'}>
                      {reminder.priority}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => toggleRead(id)}>
                      {isRead ? 'Mark unread' : 'Mark read'}
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No upcoming appointments</p>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-gray-900">{appointment.petName}</p>
                    <p className="text-gray-600">{appointment.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-900">{formatDate(appointment.dateTime)}</p>
                    <Badge variant="outline">{appointment.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">Total Appointments</p>
              <p className="text-primary mt-2">{upcomingAppointments.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">Active Reminders</p>
              <p className="text-primary mt-2">{reminders.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">High Priority</p>
              <p className="text-red-600 mt-2">
                {reminders.filter(r => r.priority === 'high').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}