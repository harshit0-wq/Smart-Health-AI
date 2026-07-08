import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY' && key.trim() !== '') {
      try {
        aiClient = new GoogleGenAI({ apiKey: key });
      } catch (err) {
        console.error('Failed to initialize Gemini client:', err);
      }
    }
  }
  return aiClient;
}

// ==========================================
// IN-MEMORY DATABASE SEED DATA
// ==========================================

const users = [
  { id: 'u1', email: 'patient@hospital.com', passwordHash: 'password', role: 'PATIENT', name: 'John Doe' },
  { id: 'u2', email: 'doctor@hospital.com', passwordHash: 'password', role: 'DOCTOR', name: 'Dr. Sarah Jenkins' },
  { id: 'u3', email: 'pharmacist@hospital.com', passwordHash: 'password', role: 'PHARMACIST', name: 'David Wright' },
  { id: 'u4', email: 'admin@hospital.com', passwordHash: 'password', role: 'ADMIN', name: 'Marcus Admin' }
];

const patients = [
  {
    id: 'p1',
    userId: 'u1',
    firstName: 'John',
    lastName: 'Doe',
    dob: '1981-04-12',
    gender: 'Male',
    bloodGroup: 'O+',
    phone: '+91 98765 43210',
    emergencyContact: '+91 98765 43211',
    allergies: ['Penicillin'],
    conditions: ['Diabetic (Type 2)', 'Hypertension'],
    height: '178 cm',
    weight: '82 kg'
  },
  {
    id: 'p2',
    userId: '',
    firstName: 'Rahul',
    lastName: 'Sharma',
    dob: '1995-08-20',
    gender: 'Male',
    bloodGroup: 'B+',
    phone: '+91 91122 33445',
    emergencyContact: '+91 91122 33446',
    allergies: [],
    conditions: ['High Fever (102°F)'],
    height: '172 cm',
    weight: '70 kg'
  },
  {
    id: 'p3',
    userId: '',
    firstName: 'Sarah',
    lastName: 'Miller',
    dob: '1990-11-05',
    gender: 'Female',
    bloodGroup: 'A-',
    phone: '+91 92233 44556',
    emergencyContact: '+91 92233 44557',
    allergies: ['Sulfonamides'],
    conditions: ['Routine Follow-up'],
    height: '165 cm',
    weight: '62 kg'
  }
];

const doctors = [
  { id: 'd1', userId: 'u2', name: 'Dr. Sarah Jenkins', specialty: 'Cardiology', fee: 150, rating: 4.9, avatar: 'SJ' },
  { id: 'd2', userId: '', name: 'Dr. Emily Carter', specialty: 'General Practice', fee: 90, rating: 4.9, avatar: 'EC' },
  { id: 'd3', userId: '', name: 'Dr. Robert Davis', specialty: 'General Practice', fee: 85, rating: 4.6, avatar: 'RD' },
  { id: 'd4', userId: '', name: 'Dr. Michael Chen', specialty: 'Cardiology', fee: 130, rating: 4.8, avatar: 'MC' },
  { id: 'd5', userId: '', name: 'Dr. Anna Smith', specialty: 'Dermatology', fee: 120, rating: 4.9, avatar: 'AS' },
  { id: 'd6', userId: '', name: 'Dr. David Lee', specialty: 'Dermatology', fee: 110, rating: 4.7, avatar: 'DL' },
  { id: 'd7', userId: '', name: 'Dr. William Brown', specialty: 'Neurology', fee: 200, rating: 4.9, avatar: 'WB' },
  { id: 'd8', userId: '', name: 'Dr. Susan White', specialty: 'Neurology', fee: 180, rating: 4.8, avatar: 'SW' },
  { id: 'd9', userId: '', name: 'Dr. James Wilson', specialty: 'Orthopedics', fee: 160, rating: 4.7, avatar: 'JW' },
  { id: 'd10', userId: '', name: 'Dr. Richard Taylor', specialty: 'Orthopedics', fee: 145, rating: 4.5, avatar: 'RT' },
  { id: 'd11', userId: '', name: 'Dr. Linda Martinez', specialty: 'Pediatrics', fee: 100, rating: 4.9, avatar: 'LM' },
  { id: 'd12', userId: '', name: 'Dr. Thomas Anderson', specialty: 'Pediatrics', fee: 95, rating: 4.8, avatar: 'TA' },
  { id: 'd13', userId: '', name: 'Dr. Jennifer Thomas', specialty: 'Psychiatry', fee: 175, rating: 4.9, avatar: 'JT' },
  { id: 'd14', userId: '', name: 'Dr. Charles Jackson', specialty: 'Psychiatry', fee: 160, rating: 4.7, avatar: 'CJ' },
  { id: 'd15', userId: '', name: 'Dr. Patricia Moore', specialty: 'Gastroenterology', fee: 140, rating: 4.8, avatar: 'PM' },
  { id: 'd16', userId: '', name: 'Dr. Christopher Martin', specialty: 'Gastroenterology', fee: 135, rating: 4.6, avatar: 'CM' }
];

const appointments = [
  {
    id: 'k-1',
    patientId: 'p1',
    patientName: 'John Doe',
    doctorId: 'd1',
    doctorName: 'Dr. Sarah Jenkins',
    startTime: '09:00',
    endTime: '09:30',
    date: '2026-07-08',
    status: 'WAITING',
    type: 'IN_PERSON',
    symptoms: 'Severe Chest Pain',
    category: 'Cardiology'
  },
  {
    id: 'k-2',
    patientId: 'p2',
    patientName: 'Rahul Sharma',
    doctorId: 'd2',
    doctorName: 'Dr. Emily Carter',
    startTime: '09:30',
    endTime: '10:00',
    date: '2026-07-08',
    status: 'CONSULTING',
    type: 'IN_PERSON',
    symptoms: 'High Fever (102°F)',
    category: 'General Practice'
  },
  {
    id: 'k-3',
    patientId: 'p3',
    patientName: 'Sarah Miller',
    doctorId: 'd3',
    doctorName: 'Dr. Robert Davis',
    startTime: '08:30',
    endTime: '09:00',
    date: '2026-07-08',
    status: 'COMPLETED',
    type: 'IN_PERSON',
    symptoms: 'Routine Follow-up',
    category: 'General Practice'
  }
];

const medicineDb = [
  { name: 'Paracetamol 500mg', type: 'Tablet', stock: 120, price: 10, reorderLevel: 30 },
  { name: 'Paracetamol 650mg', type: 'Tablet', stock: 80, price: 15, reorderLevel: 20 },
  { name: 'Paracetamol Syrup', type: 'Syrup', stock: 40, price: 45, reorderLevel: 10 },
  { name: 'Azithromycin 500mg', type: 'Tablet', stock: 90, price: 150, reorderLevel: 15 },
  { name: 'Pantoprazole 40mg', type: 'Tablet', stock: 150, price: 25, reorderLevel: 40 },
  { name: 'Amlodipine 5mg', type: 'Tablet', stock: 100, price: 120, reorderLevel: 20 },
  { name: 'Aspirin 75mg', type: 'Tablet', stock: 12, price: 45, reorderLevel: 20 }, // Trigger Low stock
  { name: 'Atorvastatin 20mg', type: 'Tablet', stock: 75, price: 35, reorderLevel: 15 },
  { name: 'Vitamin C', type: 'Tablet', stock: 200, price: 60, reorderLevel: 50 }
];

const prescriptions = [
  {
    id: 'krx-1',
    appointmentId: 'k-1',
    patientId: 'p1',
    patientName: 'John Doe',
    doctorId: 'd1',
    doctorName: 'Dr. Sarah Jenkins',
    diagnosis: 'Acute Coronary Syndrome Suspected',
    advice: 'Adhere strictly to medication, rest, and keep immediate emergency contact numbers handy.',
    date: '2026-07-08',
    medicines: [
      { name: 'Amlodipine 5mg', morning: true, afternoon: false, night: true, food: 'After Food', duration: '5 Days', notes: '', price: 120 },
      { name: 'Aspirin 75mg', morning: true, afternoon: false, night: false, food: 'After Food', duration: '5 Days', notes: '', price: 45 }
    ],
    status: 'RECEIVED',
    totalPrice: 173.25 // subtotal 165 + 5% tax
  },
  {
    id: 'krx-2',
    appointmentId: 'k-2',
    patientId: 'p2',
    patientName: 'Rahul Sharma',
    doctorId: 'd2',
    doctorName: 'Dr. Emily Carter',
    diagnosis: 'Viral Fever',
    advice: 'Drink plenty of fluids. Warm saline gargles twice a day.',
    date: '2026-07-08',
    medicines: [
      { name: 'Paracetamol 650mg', morning: true, afternoon: true, night: true, food: 'After Food', duration: '3 Days', notes: 'If fever is high', price: 15 },
      { name: 'Azithromycin 500mg', morning: true, afternoon: false, night: false, food: 'After Food', duration: '3 Days', notes: 'Daily once', price: 150 },
      { name: 'Vitamin C', morning: true, afternoon: false, night: true, food: 'After Food', duration: '7 Days', notes: '', price: 60 }
    ],
    status: 'PACKING',
    totalPrice: 236.25 // subtotal 225 + 5% tax
  },
  {
    id: 'krx-3',
    appointmentId: 'k-3',
    patientId: 'p3',
    patientName: 'Sarah Miller',
    doctorId: 'd3',
    doctorName: 'Dr. Robert Davis',
    diagnosis: 'Routine follow-up of mild gastritis',
    advice: 'Avoid spicy and fatty foods.',
    date: '2026-07-08',
    medicines: [
      { name: 'Paracetamol 500mg', morning: true, afternoon: false, night: true, food: 'Before Food', duration: '5 Days', notes: '', price: 10 }
    ],
    status: 'DISPENSED',
    totalPrice: 10.50
  }
];

const systemLogs = [
  { id: '1', text: 'Dr. Sarah Jenkins logged in.', subtitle: 'Cardiology Dept', time: '2 mins ago', type: 'info' },
  { id: '2', text: 'Low Stock Alert Triggered', subtitle: 'Pharmacy reports Aspirin 75mg dropping below threshold (12 units left).', time: '15 mins ago', type: 'alert' },
  { id: '3', text: 'New Patient Registration', subtitle: 'Front Desk', time: '45 mins ago', type: 'success' },
  { id: '4', text: 'Server Backup Completed', subtitle: 'IT Operations', time: '2 hours ago', type: 'info' }
];

const chatSessions: Record<string, Array<{ sender: 'user' | 'ai'; text: string }>> = {};

// SSE connections pool
let sseClients: any[] = [];

// Send notifications to all active clients
function sendSSEEvent(type: string, data: any) {
  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  });
}

// ==========================================
// REAL API ENDPOINTS
// ==========================================

// SSE Live Notification Feed
app.get('/api/realtime/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  sseClients.push(res);
  
  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

// Authentication
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join('='));
    }
  });
  return list;
}

app.post('/api/auth/login', (req, res) => {
  const { email, password, role } = req.body;
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === role);
  
  if (user) {
    res.cookie('userId', user.id, { httpOnly: true, path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({
      accessToken: 'access-token-jwt-placeholder-' + Date.now(),
      refreshToken: 'refresh-token-jwt-placeholder-' + Date.now(),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } else {
    // Dynamically sign up or fail
    const nameMatch = email.split('@')[0];
    const newName = nameMatch.charAt(0).toUpperCase() + nameMatch.slice(1);
    const newUser = {
      id: 'u_' + Date.now(),
      email,
      passwordHash: password,
      role: role || 'PATIENT',
      name: newName
    };
    users.push(newUser);
    
    // Seed new profile
    if (role === 'PATIENT') {
      patients.push({
        id: 'p_' + Date.now(),
        userId: newUser.id,
        firstName: newName,
        lastName: 'Doe',
        dob: '1990-01-01',
        gender: 'Male',
        bloodGroup: 'O+',
        phone: '+91 99999 88888',
        emergencyContact: '+91 99999 77777',
        allergies: [],
        conditions: [],
        height: '175 cm',
        weight: '75 kg'
      });
    }

    res.cookie('userId', newUser.id, { httpOnly: true, path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({
      accessToken: 'access-token-jwt-placeholder-' + Date.now(),
      refreshToken: 'refresh-token-jwt-placeholder-' + Date.now(),
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name
      }
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const userId = cookies.userId;
  const user = users.find(u => u.id === userId);
  
  if (user) {
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('userId', { path: '/' });
  res.json({ success: true });
});

// Staff accounts creation
app.post('/api/auth/staff', (req, res) => {
  const { firstName, lastName, email, role, department } = req.body;
  const newName = `${firstName} ${lastName}`;
  const userId = 'u_staff_' + Date.now();
  
  const newUser = {
    id: userId,
    email,
    passwordHash: 'password',
    role: role.toUpperCase() === 'ADMINISTRATOR' ? 'ADMIN' : role.toUpperCase(),
    name: newName
  };
  users.push(newUser);
  
  if (role.toUpperCase() === 'DOCTOR') {
    doctors.push({
      id: 'd_' + Date.now(),
      userId: userId,
      name: newName,
      specialty: department,
      fee: 100,
      rating: 5.0,
      avatar: firstName.substring(0, 1) + lastName.substring(0, 1)
    });
  }

  // Create system log
  const log = {
    id: String(systemLogs.length + 1),
    text: `New Staff Created: ${newName}`,
    subtitle: `${role} joined ${department} Department`,
    time: 'Just now',
    type: 'success'
  };
  systemLogs.unshift(log);

  sendSSEEvent('LOG_CREATED', log);
  sendSSEEvent('STAFF_CREATED', { name: newName, role, department });

  res.json({ success: true, user: newUser });
});

app.get('/api/staff', (req, res) => {
  // Return consolidated lists of staff for Admin Dashboard
  const adminStaff = doctors.map(doc => {
    const matchedUser = users.find(u => u.id === doc.userId);
    return {
      id: doc.id,
      name: doc.name,
      email: matchedUser?.email || `${doc.name.toLowerCase().replace(/[^a-z]/g, '')}@smarthealth.com`,
      phone: '+91 98765 43210',
      role: doc.id === 'd1' ? 'Senior Doctor' : 'Doctor',
      department: doc.specialty,
      status: doc.id === 'd3' ? 'On Leave' : 'Online',
      avatar: doc.avatar
    };
  });
  
  // Add David Wright pharmacist
  adminStaff.push({
    id: 'pharm_dw',
    name: 'David Wright',
    email: 'd.wright@smarthealth.com',
    phone: '+91 91234 56789',
    role: 'Lead Pharmacist',
    department: 'Pharmacy',
    status: 'Offline',
    avatar: 'DW'
  });

  res.json(adminStaff);
});

// Patients APIs
app.get('/api/patients', (req, res) => {
  res.json(patients);
});

app.get('/api/patients/profile/:userId', (req, res) => {
  const { userId } = req.params;
  const patient = patients.find(p => p.userId === userId) || patients[0];
  res.json(patient);
});

// App list of doctors
app.get('/api/doctors', (req, res) => {
  res.json(doctors);
});

// Appointments APIs
app.get('/api/appointments', (req, res) => {
  res.json(appointments);
});

app.post('/api/appointments', (req, res) => {
  const { patientId, doctorId, symptoms, startTime, date, category } = req.body;
  const doc = doctors.find(d => d.id === doctorId) || doctors[0];
  const pat = patients.find(p => p.id === patientId || p.userId === patientId) || patients[0];
  
  const newApp = {
    id: 'k-' + (appointments.length + 1),
    patientId: pat.id,
    patientName: `${pat.firstName} ${pat.lastName}`,
    doctorId: doc.id,
    doctorName: doc.name,
    startTime: startTime || '10:00',
    endTime: '10:30',
    date: date || new Date().toISOString().split('T')[0],
    status: 'WAITING',
    type: 'IN_PERSON',
    symptoms: symptoms || 'None specified',
    category: category || doc.specialty
  };

  appointments.push(newApp);

  // Trigger real-time notifications
  sendSSEEvent('APPOINTMENT_CREATED', newApp);

  // Add to activity log
  const log = {
    id: String(systemLogs.length + 1),
    text: `New Appointment Booked`,
    subtitle: `${newApp.patientName} with ${newApp.doctorName}`,
    time: 'Just now',
    type: 'info'
  };
  systemLogs.unshift(log);
  sendSSEEvent('LOG_CREATED', log);

  res.json(newApp);
});

app.patch('/api/appointments/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'WAITING', 'CONSULTING', 'COMPLETED'
  
  const appIndex = appointments.findIndex(a => a.id === id);
  if (appIndex !== -1) {
    appointments[appIndex].status = status;
    
    // Broadcast event
    sendSSEEvent('APPOINTMENT_UPDATED', appointments[appIndex]);

    // Handle check in vs checked out
    const logText = status === 'CONSULTING' ? 'Consultation Started' : status === 'COMPLETED' ? 'Consultation Completed' : 'Patient Checked In';
    const log = {
      id: String(systemLogs.length + 1),
      text: logText,
      subtitle: `${appointments[appIndex].patientName} with ${appointments[appIndex].doctorName}`,
      time: 'Just now',
      type: 'success'
    };
    systemLogs.unshift(log);
    sendSSEEvent('LOG_CREATED', log);

    res.json(appointments[appIndex]);
  } else {
    res.status(404).json({ error: 'Appointment not found' });
  }
});

// Prescriptions APIs
app.get('/api/prescriptions', (req, res) => {
  res.json(prescriptions);
});

app.post('/api/clinical/prescriptions', (req, res) => {
  const { patientId, doctorId, diagnosis, advice, medicines } = req.body;
  const pat = patients.find(p => p.id === patientId || p.userId === patientId) || patients[0];
  const doc = doctors.find(d => d.id === doctorId) || doctors[0];
  
  const subtotal = medicines.reduce((sum: number, med: any) => sum + (med.price || 100), 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const newRx = {
    id: 'krx-' + (prescriptions.length + 1),
    appointmentId: req.body.appointmentId || 'k-1',
    patientId: pat.id,
    patientName: `${pat.firstName} ${pat.lastName}`,
    doctorId: doc.id,
    doctorName: doc.name,
    diagnosis: diagnosis || 'Not specified',
    advice: advice || '',
    date: new Date().toISOString().split('T')[0],
    medicines: medicines.map((m: any) => ({
      name: m.name,
      morning: m.morning !== undefined ? m.morning : true,
      afternoon: m.afternoon !== undefined ? m.afternoon : false,
      night: m.night !== undefined ? m.night : true,
      food: m.food || 'After Food',
      duration: m.duration || '5 Days',
      notes: m.notes || '',
      price: m.price || 100
    })),
    status: 'RECEIVED' as const,
    totalPrice: total
  };

  prescriptions.push(newRx);

  // Mark appointment completed
  if (req.body.appointmentId) {
    const appIndex = appointments.findIndex(a => a.id === req.body.appointmentId);
    if (appIndex !== -1) {
      appointments[appIndex].status = 'COMPLETED';
      sendSSEEvent('APPOINTMENT_UPDATED', appointments[appIndex]);
    }
  }

  // Trigger pharmacist and patient notifications
  sendSSEEvent('PRESCRIPTION_ISSUED', newRx);

  // Add logging
  const log = {
    id: String(systemLogs.length + 1),
    text: `Prescription Issued`,
    subtitle: `Rx-${newRx.id} for ${newRx.patientName}`,
    time: 'Just now',
    type: 'success'
  };
  systemLogs.unshift(log);
  sendSSEEvent('LOG_CREATED', log);

  res.json(newRx);
});

app.patch('/api/clinical/prescriptions/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'RECEIVED' | 'PACKING' | 'READY' | 'DISPENSED'
  
  const rxIndex = prescriptions.findIndex(r => r.id === id);
  if (rxIndex !== -1) {
    prescriptions[rxIndex].status = status;

    if (status === 'DISPENSED') {
      // Reduce Inventory stock accordingly
      prescriptions[rxIndex].medicines.forEach(m => {
        const item = medicineDb.find(med => med.name.toLowerCase() === m.name.toLowerCase());
        if (item) {
          item.stock = Math.max(0, item.stock - 5); // reduce stock
          if (item.stock < item.reorderLevel) {
            // Low stock trigger notification
            const lowStockLog = {
              id: String(systemLogs.length + 1),
              text: `Low Stock Alert Triggered`,
              subtitle: `Pharmacy reports ${item.name} dropping below threshold (${item.stock} left).`,
              time: 'Just now',
              type: 'alert'
            };
            systemLogs.unshift(lowStockLog);
            sendSSEEvent('LOG_CREATED', lowStockLog);
            sendSSEEvent('LOW_STOCK', item);
          }
        }
      });
    }

    sendSSEEvent('PRESCRIPTION_UPDATED', prescriptions[rxIndex]);
    res.json(prescriptions[rxIndex]);
  } else {
    res.status(404).json({ error: 'Prescription not found' });
  }
});

// Pharmacy database APIs
app.get('/api/pharmacy/inventory', (req, res) => {
  res.json(medicineDb);
});

// System logs
app.get('/api/system/logs', (req, res) => {
  res.json(systemLogs);
});

// ==========================================
// GEMINI AI SERVICE INTEGRATIONS
// ==========================================

// Endpoint for Patient Symptoms Analysis (Step 1)
app.post('/api/clinical/analyze-symptoms', async (req, res) => {
  const { symptoms } = req.body;
  const gemini = getGeminiClient();

  // Fallback function to classify symptoms
  const runFallbackHeuristic = (syms: string) => {
    let cat = 'General Practice';
    const s = (syms || '').toLowerCase();
    if (s.includes('heart') || s.includes('chest') || s.includes('cardio') || s.includes('bp') || s.includes('angina') || s.includes('cardiology')) {
      cat = 'Cardiology';
    } else if (s.includes('skin') || s.includes('rash') || s.includes('derm') || s.includes('acne') || s.includes('itching') || s.includes('eczema') || s.includes('dermatology')) {
      cat = 'Dermatology';
    } else if (s.includes('bone') || s.includes('back') || s.includes('joint') || s.includes('knee') || s.includes('fracture') || s.includes('pain') || s.includes('ortho') || s.includes('orthopedics')) {
      cat = 'Orthopedics';
    } else if (s.includes('kid') || s.includes('child') || s.includes('pedia') || s.includes('infant') || s.includes('baby') || s.includes('pediatrics')) {
      cat = 'Pediatrics';
    } else if (s.includes('mental') || s.includes('depress') || s.includes('anxiety') || s.includes('sleep') || s.includes('mood') || s.includes('stress') || s.includes('psych') || s.includes('psychiatry')) {
      cat = 'Psychiatry';
    } else if (s.includes('stomach') || s.includes('gas') || s.includes('digestion') || s.includes('acidity') || s.includes('gut') || s.includes('belly') || s.includes('gastro') || s.includes('gastroenterology')) {
      cat = 'Gastroenterology';
    } else if (s.includes('headache') || s.includes('migraine') || s.includes('brain') || s.includes('nerve') || s.includes('stroke') || s.includes('seizure') || s.includes('neuro') || s.includes('neurology')) {
      cat = 'Neurology';
    }
    return cat;
  };

  if (!gemini) {
    const cat = runFallbackHeuristic(symptoms);
    return res.json({ category: cat, reason: 'AI suggested department via fallback triage logic' });
  }

  try {
    const prompt = `You are a medical triage assistant. Analyze the patient's symptoms text and suggest the single best matching specialist category from this list:
["General Practice", "Cardiology", "Dermatology", "Neurology", "Orthopedics", "Pediatrics", "Psychiatry", "Gastroenterology"].

Symptom details:
"${symptoms}"

Respond ONLY with a JSON object. No extra explanations outside of the JSON.
Response Schema:
{
  "category": "One of the listed categories exactly",
  "reason": "Short explanation of your choice"
}`;

    const generatePromise = gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ['category', 'reason']
        }
      }
    });

    // Race the generation with a 4-second timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 4000);
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);

    let text = (response.text || '{}').trim();
    if (text.startsWith('```json')) {
      text = text.substring(7);
    }
    if (text.endsWith('```')) {
      text = text.substring(0, text.length - 3);
    }
    text = text.trim();
    const result = JSON.parse(text);
    if (result && result.category) {
      result.category = runFallbackHeuristic(result.category);
    }
    res.json(result);
  } catch (err: any) {
    console.warn('Gemini error or timeout during triage, using fallback:', err);
    const cat = runFallbackHeuristic(symptoms);
    res.json({ category: cat, reason: `AI suggested ${cat} via backup triage intelligence` });
  }
});

// Endpoint for SOAP notes generator (Doctor consultations)
app.post('/api/clinical/notes/generate', async (req, res) => {
  const { rawTranscript } = req.body;
  const gemini = getGeminiClient();

  if (!gemini) {
    return res.json({
      subjective: "Patient reports chest pain since morning.",
      objective: "Vitals: BP 140/90, Pulse 92. Mild sweating noted.",
      assessment: "Possible Acute Coronary Syndrome",
      plan: "Immediate STAT ECG, Troponin I test. Refer to Cardiology.",
      suggested_icd10: "I20.9"
    });
  }

  try {
    const prompt = `You are an expert medical AI assistant. Your task is to convert the following raw doctor-patient consultation transcript into a structured SOAP note (Subjective, Objective, Assessment, Plan).

Raw Transcript:
"${rawTranscript}"

Constraints:
- Output valid JSON only.
- Keys must be exactly: "subjective", "objective", "assessment", "plan", "suggested_icd10".
- Do not invent medical data. If information is missing, leave the field null.`;

    const response = await gemini.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subjective: { type: Type.STRING },
            objective: { type: Type.STRING },
            assessment: { type: Type.STRING },
            plan: { type: Type.STRING },
            suggested_icd10: { type: Type.STRING }
          },
          required: ['subjective', 'objective', 'assessment', 'plan', 'suggested_icd10']
        }
      }
    });

    let text = (response.text || '{}').trim();
    if (text.startsWith('```json')) {
      text = text.substring(7);
    }
    if (text.endsWith('```')) {
      text = text.substring(0, text.length - 3);
    }
    text = text.trim();
    const result = JSON.parse(text);
    res.json(result);
  } catch (err: any) {
    console.error('Gemini error generating notes:', err);
    res.status(500).json({ error: 'Failed to generate SOAP note', details: err.message });
  }
});

// Endpoint for Interactive Chat Assistant (Floating chatbot and Clinical Assistant panel)
app.post('/api/ai/chat', async (req, res) => {
  const { prompt, history, patientContext } = req.body;
  const gemini = getGeminiClient();

  if (!gemini) {
    // Static response templates matching prompts
    let responseText = "Noted. Added to consultation context.";
    const lower = prompt.toLowerCase();
    if (lower.includes('chest pain') || lower.includes('diagnosis')) {
      responseText = `Differential Diagnosis:
1. Acute Coronary Syndrome (High Probability)
2. Gastroesophageal Reflux
3. Musculoskeletal strain

Recommended Immediate Tests:
• ECG
• Troponin I
• Stat BP`;
    } else if (lower.includes('drug') || lower.includes('interaction') || lower.includes('penicillin')) {
      responseText = `Interaction Check:
• Warning: Patient John Doe has a documented Penicillin allergy.
• No other severe drug-to-drug interactions detected between selected medicines (Amlodipine, Aspirin). Ensure to bypass any Penicillin-family products (Amoxicillin, Ampicillin).`;
    } else if (lower.includes('heart') || lower.includes('hypertension')) {
      responseText = `Cardiology Patient Context:
• John Doe is a 45-year old diabetic on hypertension control (Amlodipine 5mg). Watch for blood pressure trend line. Current reading indicates mild elevated readings (140/90).`;
    }
    return res.json({ text: responseText });
  }

  try {
    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const systemInstruction = `You are a clinical smart-health assistant.
Patient Context: ${JSON.stringify(patientContext || { name: 'John Doe', age: 45, allergies: ['Penicillin'], conditions: ['Diabetic (Type 2)', 'Hypertension'] })}
Warning: Flag any allergens or negative interactions immediately. Maintain professional, supportive, but clinical composure.`;

    const chat = gemini.chats.create({
      model: 'gemini-3.5-flash',
      config: {
        systemInstruction
      },
      history: formattedHistory
    });

    const response = await chat.sendMessage({ message: prompt });
    res.json({ text: response.text });
  } catch (err: any) {
    console.error('Gemini error in chat:', err);
    res.status(500).json({ error: 'Failed to chat with AI', details: err.message });
  }
});

// ==========================================
// VITE DEV SERVER / PRODUCTION SETUP
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartHealth Master Backend running on port ${PORT}`);
  });
}

startServer();
