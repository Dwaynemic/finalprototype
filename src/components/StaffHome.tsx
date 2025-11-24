import { useState, useEffect } from 'react';
import { User } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, PawPrint, Users, AlertCircle, TrendingUp } from 'lucide-react';
import { functionsBase } from '../utils/supabase/info';

type StaffHomeProps = {
  user: User;
  accessToken: string;
};

type DashboardStats = {
  totalPets: number;
  totalClients: number;
  todayAppointments: number;
  weekAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  missedAppointments: number;
  vaccinationsDue: number;
  recentActivity: any[];
};

export function StaffHome({ user, accessToken }: StaffHomeProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `${functionsBase}/dashboard/stats`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
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

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-600">
        Failed to load dashboard stats
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <CardTitle>Pet House Veterinary Clinic Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Overview of Pet House Veterinary Clinic operations and performance</p>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">Total Pets</p>
                <p className="text-primary mt-2">{stats.totalPets}</p>
              </div>
              <PawPrint className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">Total Clients</p>
                <p className="text-primary mt-2">{stats.totalClients}</p>
              </div>
              <Users className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">Today's Appointments</p>
                <p className="text-green-600 mt-2">{stats.todayAppointments}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">Missed Appointments</p>
                <p className="text-red-600 mt-2">{stats.missedAppointments}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Status */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <p className="text-yellow-600">Pending</p>
              <p className="text-yellow-900 mt-2">{stats.pendingAppointments}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-green-600">Completed</p>
              <p className="text-green-900 mt-2">{stats.completedAppointments}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-blue-600">This Week</p>
              <p className="text-blue-900 mt-2">{stats.weekAppointments}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Vaccinations Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-red-900">{stats.vaccinationsDue}</p>
              <p className="text-gray-600 mt-2">Pets require vaccination within 14 days</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <TrendingUp className="w-5 h-5" />
              Weekly Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-green-900">{stats.weekAppointments}</p>
              <p className="text-gray-600 mt-2">Appointments this week</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.slice(0, 5).map((activity: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-gray-900">{activity.petName}</p>
                    <p className="text-gray-600">{activity.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-600">{formatDate(activity.dateTime)}</p>
                    <Badge variant={
                      activity.status === 'completed' ? 'default' :
                      activity.status === 'pending' ? 'secondary' :
                      'destructive'
                    }>
                      {activity.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}