import { useState, useEffect } from 'react';
import { User } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { BarChart3, Download, Calendar, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { functionsBase } from '../utils/supabase/info';

type StaffReportsProps = {
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

export function StaffReports({ user, accessToken }: StaffReportsProps) {
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
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = (reportType: string) => {
    if (!stats) return;

    let csvContent = '';
    let filename = '';

    if (reportType === 'appointments') {
      filename = `appointments_report_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = 'Pet Name,Date/Time,Reason,Status\n';
      stats.recentActivity.forEach(apt => {
        csvContent += `"${apt.petName}","${apt.dateTime}","${apt.reason}","${apt.status}"\n`;
      });
    } else if (reportType === 'summary') {
      filename = `pet_house_veterinary_clinic_summary_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = 'Metric,Value\n';
      csvContent += `Total Pets,${stats.totalPets}\n`;
      csvContent += `Total Clients,${stats.totalClients}\n`;
      csvContent += `Pending Appointments,${stats.pendingAppointments}\n`;
      csvContent += `Completed Appointments,${stats.completedAppointments}\n`;
      csvContent += `Missed Appointments,${stats.missedAppointments}\n`;
      csvContent += `Vaccinations Due,${stats.vaccinationsDue}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        Failed to load reports
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-gray-900">Reports & Analytics</h2>
        <p className="text-gray-600 mt-1">Generate and download Pet House Veterinary Clinic performance reports</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-6">
            <Card>
                  <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Pet House Veterinary Clinic Summary Report</CardTitle>
                  <Button onClick={() => downloadReport('summary')}>
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-600">Total Pets</p>
                        <p className="text-blue-900 mt-1">{stats.totalPets}</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-blue-600 opacity-50" />
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-600">Total Clients</p>
                        <p className="text-green-900 mt-1">{stats.totalClients}</p>
                      </div>
                      <Users className="w-8 h-8 text-green-600 opacity-50" />
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-600">This Week</p>
                        <p className="text-purple-900 mt-1">{stats.weekAppointments} appointments</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-purple-600 opacity-50" />
                    </div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-600">Today</p>
                        <p className="text-orange-900 mt-1">{stats.todayAppointments} appointments</p>
                      </div>
                      <Calendar className="w-8 h-8 text-orange-600 opacity-50" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appointment Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="text-yellow-700">Pending Appointments</p>
                      <p className="text-yellow-900 mt-1">Awaiting completion</p>
                    </div>
                    <div className="text-yellow-900">{stats.pendingAppointments}</div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-green-700">Completed Appointments</p>
                      <p className="text-green-900 mt-1">Successfully finished</p>
                    </div>
                    <div className="text-green-900">{stats.completedAppointments}</div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                    <div>
                      <p className="text-red-700">Missed Appointments</p>
                      <p className="text-red-900 mt-1">Requires follow-up</p>
                    </div>
                    <div className="text-red-900">{stats.missedAppointments}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600">Completion Rate</span>
                      <span className="text-gray-900">
                        {stats.completedAppointments + stats.pendingAppointments > 0
                          ? Math.round((stats.completedAppointments / (stats.completedAppointments + stats.pendingAppointments)) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${
                            stats.completedAppointments + stats.pendingAppointments > 0
                              ? (stats.completedAppointments / (stats.completedAppointments + stats.pendingAppointments)) * 100
                              : 0
                          }%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600">Client Retention</span>
                      <span className="text-gray-900">
                        {stats.totalPets > 0
                          ? Math.min(Math.round((stats.weekAppointments / stats.totalPets) * 100), 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${
                            stats.totalPets > 0
                              ? Math.min((stats.weekAppointments / stats.totalPets) * 100, 100)
                              : 0
                          }%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Appointment History</CardTitle>
                <Button onClick={() => downloadReport('appointments')}>
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stats.recentActivity.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No appointment data available</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentActivity.map((apt: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-gray-900">{apt.petName}</p>
                        <p className="text-gray-600">{apt.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-600">
                          {new Date(apt.dateTime).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <Badge
                          variant={
                            apt.status === 'completed' ? 'default' :
                            apt.status === 'pending' ? 'secondary' :
                            'destructive'
                          }
                        >
                          {apt.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Vaccinations Due
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-red-50 p-6 rounded-lg text-center">
                  <p className="text-red-900 mb-2">{stats.vaccinationsDue}</p>
                  <p className="text-red-700">Pets require vaccination within 14 days</p>
                  <p className="text-red-600 mt-3">
                    Immediate action required to prevent overdue vaccinations
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="w-5 h-5" />
                  Missed Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-orange-50 p-6 rounded-lg text-center">
                  <p className="text-orange-900 mb-2">{stats.missedAppointments}</p>
                  <p className="text-orange-700">Appointments were not completed</p>
                  <p className="text-orange-600 mt-3">
                    Contact pet owners for rescheduling to maintain client trust
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.vaccinationsDue > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-red-900">Send vaccination reminders</p>
                        <p className="text-red-700 mt-1">
                          {stats.vaccinationsDue} pets need to be contacted
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {stats.missedAppointments > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="text-orange-900">Follow up on missed appointments</p>
                        <p className="text-orange-700 mt-1">
                          {stats.missedAppointments} appointments require rescheduling
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {stats.pendingAppointments > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-yellow-900">Upcoming appointments</p>
                        <p className="text-yellow-700 mt-1">
                          {stats.pendingAppointments} appointments scheduled
                        </p>
                      </div>
                    </div>
                  )}

                  {stats.vaccinationsDue === 0 && stats.missedAppointments === 0 && stats.pendingAppointments === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <p className="text-green-900">All caught up! No urgent action items.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
