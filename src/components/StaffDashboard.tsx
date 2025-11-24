import { useState } from 'react';
import logo from '../petyow.jpg';
import { User } from '../App';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LayoutDashboard, Calendar, PawPrint, BarChart3, LogOut } from 'lucide-react';
import { StaffHome } from './StaffHome';
import { AppointmentManagement } from './AppointmentManagement';
import { HealthRecords } from './HealthRecords';
import { StaffReports } from './StaffReports';

type StaffDashboardProps = {
  user: User;
  accessToken: string;
  onLogout: () => void;
};

export function StaffDashboard({ user, accessToken, onLogout }: StaffDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!user || !user.name) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600">Error: No staff user data available.</h2>
          <p className="mt-2 text-gray-600">Please log in again or contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-secondary border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-primary">
                <img src={logo} alt="Pethouse logo" className="w-full h-full object-cover object-center transform scale-110" />
              </div>
              <div>
                <h1 className="text-white mb-0">Pet House Veterinary Clinic - Staff Portal</h1>
                <p className="text-white/80">Welcome, {user.name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={onLogout} className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Appointments</span>
            </TabsTrigger>
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <PawPrint className="w-4 h-4" />
              <span className="hidden sm:inline">Patients</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <StaffHome user={user} accessToken={accessToken} />
          </TabsContent>

          <TabsContent value="appointments">
            <AppointmentManagement user={user} accessToken={accessToken} userRole="staff" />
          </TabsContent>

          <TabsContent value="patients">
            <HealthRecords user={user} accessToken={accessToken} userRole="staff" />
          </TabsContent>

          <TabsContent value="reports">
            <StaffReports user={user} accessToken={accessToken} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}