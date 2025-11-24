import { useState } from 'react';
import logo from '../petyow.jpg';
import { User } from '../App';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Home, PawPrint, Calendar, FileText, LogOut, Bell } from 'lucide-react';
import { OwnerHome } from './OwnerHome';
import { PetManagement } from './PetManagement';
import { AppointmentManagement } from './AppointmentManagement';
import { HealthRecords } from './HealthRecords';

type OwnerDashboardProps = {
  user: User;
  accessToken: string;
  onLogout: () => void;
};

export function OwnerDashboard({ user, accessToken, onLogout }: OwnerDashboardProps) {
  const [activeTab, setActiveTab] = useState('home');

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
                <h1 className="text-white mb-0">Pet House Veterinary Clinic</h1>
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
            <TabsTrigger value="home" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </TabsTrigger>
            <TabsTrigger value="pets" className="flex items-center gap-2">
              <PawPrint className="w-4 h-4" />
              <span className="hidden sm:inline">My Pets</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Appointments</span>
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Records</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home">
            <OwnerHome user={user} accessToken={accessToken} />
          </TabsContent>

          <TabsContent value="pets">
            <PetManagement user={user} accessToken={accessToken} />
          </TabsContent>

          <TabsContent value="appointments">
            <AppointmentManagement user={user} accessToken={accessToken} userRole="owner" />
          </TabsContent>

          <TabsContent value="records">
            <HealthRecords user={user} accessToken={accessToken} userRole="owner" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}