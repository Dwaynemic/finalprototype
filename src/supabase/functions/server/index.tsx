import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createClient } from '@supabase/supabase-js';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
app.use('*', logger(console.log));

// Initialize Supabase client
// Prefer Node-style environment variables on the server; fall back to VITE_ names if present.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ============= AUTH ROUTES =============

// Sign up route
app.post('/make-server-8a3943bb/signup', async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();
    
    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: role || 'owner' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    // Store user profile in KV store
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      role: role || 'owner',
      createdAt: new Date().toISOString()
    });

    return c.json({ user: data.user });
  } catch (error) {
    console.log('Signup error:', error);
    return c.json({ error: 'Failed to create account' }, 500);
  }
});

// Get user profile
app.get('/make-server-8a3943bb/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 401);
    }
    return c.json({ profile });
  } catch (error) {
    console.log('Profile fetch error:', error);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

// ============= PET MANAGEMENT ROUTES =============

// Create pet profile
app.post('/make-server-8a3943bb/pets', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const petData = await c.req.json();
    const petId = `pet:${user.id}:${Date.now()}`;
    // Check for duplicates: prefer microchipId if present, otherwise name+species+breed+dob
    const userPets = await kv.get(`user:${user.id}:pets`) || { petIds: [] };
    const existingPets = await kv.mget(userPets.petIds);
    const duplicate = existingPets.find((p: any) => {
      if (!p) return false;
      if (petData.microchipId && p.microchipId && p.microchipId === petData.microchipId) return true;
      // Compare basic identifying fields (case-insensitive)
      const sameName = (p.name || '').toLowerCase() === (petData.name || '').toLowerCase();
      const sameSpecies = (p.species || '').toLowerCase() === (petData.species || '').toLowerCase();
      const sameBreed = (p.breed || '').toLowerCase() === (petData.breed || '').toLowerCase();
      const sameDob = (p.dateOfBirth || '') === (petData.dateOfBirth || '');
      return sameName && sameSpecies && sameBreed && sameDob;
    });

    if (duplicate) {
      return c.json({ error: 'Duplicate pet exists', pet: duplicate }, 409);
    }
    
    const pet = {
      id: petId,
      ownerId: user.id,
      ...petData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await kv.set(petId, pet);
    
    // Add to user's pet list
    const userPetsAfter = await kv.get(`user:${user.id}:pets`) || { petIds: [] };
    userPetsAfter.petIds.push(petId);
    await kv.set(`user:${user.id}:pets`, userPetsAfter);

    return c.json({ pet });
  } catch (error) {
    console.log('Pet creation error:', error);
    return c.json({ error: 'Failed to create pet profile' }, 500);
  }
});

// Get user's pets
app.get('/make-server-8a3943bb/pets', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userPets = await kv.get(`user:${user.id}:pets`) || { petIds: [] };
    const pets = await kv.mget(userPets.petIds);

    return c.json({ pets: pets.filter(p => p !== null) });
  } catch (error) {
    console.log('Pets fetch error:', error);
    return c.json({ error: 'Failed to fetch pets' }, 500);
  }
});

// Get all pets (staff/admin only)
app.get('/make-server-8a3943bb/pets/all', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is staff or admin
    const profile = await kv.get(`user:${user.id}`);
    if (!profile || (profile.role !== 'staff' && profile.role !== 'admin')) {
      return c.json({ error: 'Forbidden: Staff access required' }, 403);
    }

    const allPets = await kv.getByPrefix('pet:');

    // Enrich each pet with owner info (name/email/phone) so staff can see owner when scheduling
    const enriched = await Promise.all(allPets.map(async (pet: any) => {
      try {
        const owner = await kv.get(`user:${pet.ownerId}`);
        return {
          ...pet,
          ownerName: owner?.name,
          ownerEmail: owner?.email,
          ownerPhone: owner?.phone,
        };
      } catch (err) {
        return pet;
      }
    }));

    return c.json({ pets: enriched });
  } catch (error) {
    console.log('All pets fetch error:', error);
    return c.json({ error: 'Failed to fetch all pets' }, 500);
  }
});

// ============= BLOCKS (STAFF) =============

// Create a block for a date (staff only)
app.post('/make-server-8a3943bb/blocks', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user || error) return c.json({ error: 'Unauthorized' }, 401);

    const profile = await kv.get(`user:${user.id}`);
    if (!profile || (profile.role !== 'staff' && profile.role !== 'admin')) {
      return c.json({ error: 'Forbidden: Staff access required' }, 403);
    }

    const { date, notes } = await c.req.json(); // date: YYYY-MM-DD
    if (!date) return c.json({ error: 'Date required' }, 400);

    const blockId = `block:${date}`;
    const block = { id: blockId, date, notes: notes || '', createdAt: new Date().toISOString(), createdBy: user.id };
    await kv.set(blockId, block);
    return c.json({ block });
  } catch (err) {
    console.error('Create block error:', err);
    return c.json({ error: 'Failed to create block' }, 500);
  }
});

// Get blocks (staff/admin only)
app.get('/make-server-8a3943bb/blocks', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user || error) return c.json({ error: 'Unauthorized' }, 401);

    const profile = await kv.get(`user:${user.id}`);
    if (!profile || (profile.role !== 'staff' && profile.role !== 'admin')) {
      return c.json({ error: 'Forbidden: Staff access required' }, 403);
    }

    const blocks = await kv.getByPrefix('block:');
    return c.json({ blocks });
  } catch (err) {
    console.error('Get blocks error:', err);
    return c.json({ error: 'Failed to fetch blocks' }, 500);
  }
});

// Delete a block (staff/admin only)
app.delete('/make-server-8a3943bb/blocks/:blockId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user || error) return c.json({ error: 'Unauthorized' }, 401);

    const profile = await kv.get(`user:${user.id}`);
    if (!profile || (profile.role !== 'staff' && profile.role !== 'admin')) {
      return c.json({ error: 'Forbidden: Staff access required' }, 403);
    }

    const blockId = c.req.param('blockId');
    await kv.del(blockId);
    return c.json({ deleted: blockId });
  } catch (err) {
    console.error('Delete block error:', err);
    return c.json({ error: 'Failed to delete block' }, 500);
  }
});

// Update pet profile
app.put('/make-server-8a3943bb/pets/:petId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const petId = c.req.param('petId');
    const updates = await c.req.json();
    
    const pet = await kv.get(petId);
    if (!pet) {
      return c.json({ error: 'Pet not found' }, 404);
    }

    // Check ownership or staff role
    const profile = await kv.get(`user:${user.id}`);
    if (pet.ownerId !== user.id && profile.role !== 'staff' && profile.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const updatedPet = {
      ...pet,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await kv.set(petId, updatedPet);
    return c.json({ pet: updatedPet });
  } catch (error) {
    console.log('Pet update error:', error);
    return c.json({ error: 'Failed to update pet' }, 500);
  }
});

// Delete pet
app.delete('/make-server-8a3943bb/pets/:petId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user || error) return c.json({ error: 'Unauthorized' }, 401);
    const petId = c.req.param('petId');
    const pet = await kv.get(petId);
    console.log('Delete pet request:', { requestedBy: user.id, petId });
    console.log('Found pet:', pet ? { id: pet.id, ownerId: pet.ownerId } : null);
    if (!pet) return c.json({ error: 'Pet not found' }, 404);

    // Only allow owner or staff/admin to delete
    const profile = await kv.get(`user:${user.id}`);
    console.log('Requester profile:', profile ? { id: profile.id, role: profile.role } : null);
    if (pet.ownerId !== user.id && profile.role !== 'staff' && profile.role !== 'admin') {
      console.log('Delete forbidden: requester is not owner or staff/admin');
      return c.json({ error: 'Forbidden: only owner or staff may delete' }, 403);
    }

    // Remove pet key
    await kv.del(petId);

    // Remove from owner's pet list
    const ownerPetsKey = `user:${pet.ownerId}:pets`;
    const ownerPets = await kv.get(ownerPetsKey) || { petIds: [] };
    ownerPets.petIds = (ownerPets.petIds || []).filter((id: string) => id !== petId);
    await kv.set(ownerPetsKey, ownerPets);

    console.log('Pet deleted:', petId);
    return c.json({ deleted: petId });
  } catch (err) {
    console.error('Delete pet error:', err);
    return c.json({ error: 'Failed to delete pet' }, 500);
  }
});

// ============= HEALTH RECORDS ROUTES =============

// Add health record
app.post('/make-server-8a3943bb/health-records', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const recordData = await c.req.json();
    const recordId = `record:${recordData.petId}:${Date.now()}`;
    
    const record = {
      id: recordId,
      ...recordData,
      addedBy: user.id,
      createdAt: new Date().toISOString()
    };

    await kv.set(recordId, record);
    
    // Add to pet's record list
    const petRecords = await kv.get(`${recordData.petId}:records`) || { recordIds: [] };
    petRecords.recordIds.push(recordId);
    await kv.set(`${recordData.petId}:records`, petRecords);

    return c.json({ record });
  } catch (error) {
    console.log('Health record creation error:', error);
    return c.json({ error: 'Failed to create health record' }, 500);
  }
});

// Get pet health records
app.get('/make-server-8a3943bb/health-records/:petId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const petId = c.req.param('petId');
    const pet = await kv.get(petId);
    
    if (!pet) {
      return c.json({ error: 'Pet not found' }, 404);
    }

    // Check access
    const profile = await kv.get(`user:${user.id}`);
    if (pet.ownerId !== user.id && profile.role !== 'staff' && profile.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const petRecords = await kv.get(`${petId}:records`) || { recordIds: [] };
    const records = await kv.mget(petRecords.recordIds);

    return c.json({ records: records.filter(r => r !== null) });
  } catch (error) {
    console.log('Health records fetch error:', error);
    return c.json({ error: 'Failed to fetch health records' }, 500);
  }
});

// ============= APPOINTMENT ROUTES =============

// Create appointment
app.post('/make-server-8a3943bb/appointments', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const appointmentData = await c.req.json();
    const appointmentId = `appointment:${Date.now()}`;

    // Check for conflicts
    const allAppointments = await kv.getByPrefix('appointment:');
    // Also fetch any blocks (days when clinic is unavailable)
    const allBlocks = await kv.getByPrefix('block:');
    const requestedTime = new Date(appointmentData.dateTime).getTime();
    const conflict = allAppointments.some(apt => {
      if (apt.status === 'cancelled') return false;
      const aptTime = new Date(apt.dateTime).getTime();
      const diff = Math.abs(aptTime - requestedTime);
      return diff < 30 * 60 * 1000; // 30 minutes buffer
    });

    // If there is a block on the requested date, treat as conflict
    const requestedDateStr = new Date(appointmentData.dateTime).toISOString().slice(0,10);
    const blocked = allBlocks.some((b: any) => b.date === requestedDateStr);

    if (blocked) {
      return c.json({ error: 'Time slot unavailable - clinic blocked on this date' }, 409);
    }

    if (conflict) {
      return c.json({ error: 'Time slot unavailable - conflicts with existing appointment' }, 409);
    }

    // Determine owner (userId) for the appointment.
    // If a staff/admin is creating the appointment and a petId is provided,
    // associate the appointment with the pet's owner so the owner receives reminders and it appears in their list.
    let appointmentUserId = user.id;
    const creatorProfile = await kv.get(`user:${user.id}`);
    if (creatorProfile && (creatorProfile.role === 'staff' || creatorProfile.role === 'admin')) {
      if (appointmentData.petId) {
        const pet = await kv.get(appointmentData.petId);
        if (!pet) {
          return c.json({ error: 'Pet not found' }, 404);
        }
        // If pet has an ownerId, use that as the appointment's userId
        if (pet.ownerId) appointmentUserId = pet.ownerId;
      }
    }

    const appointment = {
      id: appointmentId,
      userId: appointmentUserId,
      ...appointmentData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await kv.set(appointmentId, appointment);

    // Add to the owner's appointments
    const userAppointments = await kv.get(`user:${appointmentUserId}:appointments`) || { appointmentIds: [] };
    userAppointments.appointmentIds.push(appointmentId);
    await kv.set(`user:${appointmentUserId}:appointments`, userAppointments);

    return c.json({ appointment });
  } catch (error) {
    console.log('Appointment creation error:', error);
    return c.json({ error: 'Failed to create appointment' }, 500);
  }
});

// Get user appointments
app.get('/make-server-8a3943bb/appointments', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userAppointments = await kv.get(`user:${user.id}:appointments`) || { appointmentIds: [] };
    const appointments = await kv.mget(userAppointments.appointmentIds);

    return c.json({ appointments: appointments.filter(a => a !== null) });
  } catch (error) {
    console.log('Appointments fetch error:', error);
    return c.json({ error: 'Failed to fetch appointments' }, 500);
  }
});

// Get all appointments (staff/admin only)
app.get('/make-server-8a3943bb/appointments/all', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is staff or admin
    const profile = await kv.get(`user:${user.id}`);
    if (!profile || (profile.role !== 'staff' && profile.role !== 'admin')) {
      return c.json({ error: 'Forbidden: Staff access required' }, 403);
    }

    const allAppointments = await kv.getByPrefix('appointment:');
    return c.json({ appointments: allAppointments });
  } catch (error) {
    console.log('All appointments fetch error:', error);
    return c.json({ error: 'Failed to fetch all appointments' }, 500);
  }
});

// Update appointment
app.put('/make-server-8a3943bb/appointments/:appointmentId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const appointmentId = c.req.param('appointmentId');
    const updates = await c.req.json();
    
    const appointment = await kv.get(appointmentId);
    if (!appointment) {
      return c.json({ error: 'Appointment not found' }, 404);
    }

    // Check ownership or staff role
    const profile = await kv.get(`user:${user.id}`);
    if (appointment.userId !== user.id && profile.role !== 'staff' && profile.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const updatedAppointment = {
      ...appointment,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await kv.set(appointmentId, updatedAppointment);
    return c.json({ appointment: updatedAppointment });
  } catch (error) {
    console.log('Appointment update error:', error);
    return c.json({ error: 'Failed to update appointment' }, 500);
  }
});

// ============= REMINDERS ROUTES =============

// Get upcoming reminders for user
app.get('/make-server-8a3943bb/reminders', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get user's pets
    const userPets = await kv.get(`user:${user.id}:pets`) || { petIds: [] };
    const pets = await kv.mget(userPets.petIds);
    
    // Get user's appointments
    const userAppointments = await kv.get(`user:${user.id}:appointments`) || { appointmentIds: [] };
    const appointments = await kv.mget(userAppointments.appointmentIds);

    // Get dismissed reminders for this user (array of keys/hashes)
    const dismissed = await kv.get(`user:${user.id}:dismissed_reminders`) || { hashes: [] };
    const dismissedHashes: string[] = dismissed.hashes || [];

    const reminders: { id: any; type: string; petId: any; appointmentId?: any; message: string; dateTime: any; priority: string; petName?: any; }[] = [];
    const now = Date.now();

    // Check for upcoming appointments
    appointments.filter(a => a !== null && a.status === 'pending').forEach(apt => {
      const aptTime = new Date(apt.dateTime).getTime();
      const daysUntil = Math.ceil((aptTime - now) / (1000 * 60 * 60 * 24));
      
        if (daysUntil <= 7 && daysUntil >= 0) {
          // Normalize appointment reminder id. Appointment records already use an id like "appointment:12345".
          const h = (typeof apt.id === 'string' && apt.id.startsWith('appointment:')) ? apt.id : `appointment:${apt.id}`;
          if (!dismissedHashes.includes(h)) {
            reminders.push({
              id: h,
              type: 'appointment',
              petId: apt.petId,
              appointmentId: apt.id,
              message: `Upcoming appointment in ${daysUntil} days`,
              dateTime: apt.dateTime,
              priority: daysUntil <= 1 ? 'high' : 'medium'
            });
          }
        }
    });

    // Check for vaccination due dates
    pets.filter(p => p !== null && p.nextVaccinationDate).forEach(pet => {
      const vacDate = new Date(pet.nextVaccinationDate).getTime();
      const daysUntil = Math.ceil((vacDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntil <= 14 && daysUntil >= -7) {
        const h = `vaccination:${pet.id}:${pet.nextVaccinationDate}`;
        if (!dismissedHashes.includes(h)) {
          reminders.push({
            id: h,
            type: 'vaccination',
            petId: pet.id,
            petName: pet.name,
            message: daysUntil >= 0 
              ? `${pet.name}'s vaccination due in ${daysUntil} days`
              : `${pet.name}'s vaccination is ${Math.abs(daysUntil)} days overdue`,
            dateTime: pet.nextVaccinationDate,
            priority: daysUntil <= 0 ? 'high' : 'medium'
          });
        }
      }
    });

    return c.json({ reminders });
  } catch (error) {
    console.log('Reminders fetch error:', error);
    return c.json({ error: 'Failed to fetch reminders' }, 500);
  }
});

// NOTE: reminder dismissal endpoint removed — reminders are now read-only on the server.

// ============= DASHBOARD & REPORTS =============

// Get dashboard stats (staff/admin only)
app.get('/make-server-8a3943bb/dashboard/stats', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is staff or admin
    const profile = await kv.get(`user:${user.id}`);
    if (!profile || (profile.role !== 'staff' && profile.role !== 'admin')) {
      return c.json({ error: 'Forbidden: Staff access required' }, 403);
    }

    const allAppointments = await kv.getByPrefix('appointment:');
    const allPets = await kv.getByPrefix('pet:');
    const allUsers = await kv.getByPrefix('user:');
    
    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);
    const weekAgo = today - (7 * 24 * 60 * 60 * 1000);

    const todayAppointments = allAppointments.filter(apt => {
      const aptDate = new Date(apt.dateTime).setHours(0, 0, 0, 0);
      return aptDate === today;
    });

    const weekAppointments = allAppointments.filter(apt => {
      const aptDate = new Date(apt.dateTime).getTime();
      return aptDate >= weekAgo && aptDate <= now;
    });

    const missedAppointments = allAppointments.filter(apt => {
      const aptTime = new Date(apt.dateTime).getTime();
      return apt.status === 'pending' && aptTime < now;
    });

    const vaccinationsDue = allPets.filter(pet => {
      if (!pet.nextVaccinationDate) return false;
      const vacDate = new Date(pet.nextVaccinationDate).getTime();
      const daysUntil = Math.ceil((vacDate - now) / (1000 * 60 * 60 * 24));
      return daysUntil <= 14 && daysUntil >= -7;
    });

    const stats = {
      totalPets: allPets.length,
      totalClients: allUsers.filter(u => u.role === 'owner').length,
      todayAppointments: todayAppointments.length,
      weekAppointments: weekAppointments.length,
      pendingAppointments: allAppointments.filter(a => a.status === 'pending').length,
      completedAppointments: allAppointments.filter(a => a.status === 'completed').length,
      missedAppointments: missedAppointments.length,
      vaccinationsDue: vaccinationsDue.length,
      recentActivity: weekAppointments.slice(0, 10)
    };

    return c.json({ stats });
  } catch (error) {
    console.log('Dashboard stats fetch error:', error);
    return c.json({ error: 'Failed to fetch dashboard stats' }, 500);
  }
});

// Health check
app.get('/make-server-8a3943bb/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import { serve } from '@hono/node-server';

const port = Number(process.env.PORT || '54321');
console.log(`Functions server listening on port ${port}`);

serve({
  fetch: app.fetch,
  port,
}, () => {
  console.log(`Functions server listening on port ${port}`);
});
