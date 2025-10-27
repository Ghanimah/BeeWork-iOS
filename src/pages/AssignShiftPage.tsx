// src/pages/AssignShiftPage.tsx

import React, { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { db } from '../firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface FormData {
  title: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  hourlyWage: string;
  latitude: string;
  longitude: string;
}

const AssignShiftPage: React.FC = () => {
  const { user, setCurrentPage } = useApp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [formData, setFormData] = useState<FormData>({
    title: '',
    location: '',
    date: '',
    startTime: '',
    endTime: '',
    hourlyWage: '',
    latitude: '',
    longitude: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Only admins may assign – keep hooks unconditionally called
  const isAdmin = user.role === 'admin';

  // Fetch all users once, then only keep those with role === 'user'
  useEffect(() => {
    if (!isAdmin) return;
    const fetchEmployees = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const list: Employee[] = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              role: data.role || 'user'
            };
          })
          .filter(u => u.role === 'user');
        setEmployees(list);
      } catch (err) {
        console.error('Error loading users:', err);
      }
    };
    fetchEmployees();
  }, [isAdmin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(curr => ({ ...curr, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      alert('Please select an employee.');
      return;
    }
    // Validate numeric fields
    const nextErrors: Partial<Record<keyof FormData, string>> = {};
    const hourly = Number.parseFloat(formData.hourlyWage);
    const lat = Number.parseFloat(formData.latitude);
    const lon = Number.parseFloat(formData.longitude);
    if (!Number.isFinite(hourly)) nextErrors.hourlyWage = 'Enter a valid hourly wage (number).';
    if (!Number.isFinite(lat)) nextErrors.latitude = 'Enter a valid latitude (number).';
    if (!Number.isFinite(lon)) nextErrors.longitude = 'Enter a valid longitude (number).';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    try {
      await addDoc(collection(db, 'shifts'), {
        userId: selectedUserId,
        title:     formData.title,
        location:  formData.location,
        date:      formData.date,
        startTime: formData.startTime,
        endTime:   formData.endTime,
        hourlyWage: hourly,
        latitude:   lat,
        longitude:  lon,
        status:    'scheduled',
      });
      alert('✅ Shift assigned!');
      setSelectedUserId('');
      setFormData({
        title: '',
        location: '',
        date: '',
        startTime: '',
        endTime: '',
        hourlyWage: '',
        latitude: '',
        longitude: '',
      });
      setErrors({});
    } catch (err) {
      console.error('Error assigning shift:', err);
      alert('❌ Error assigning shift.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md mt-10 text-center text-red-600">
        🚫 You do not have permission to access this page.
        <br />
        <button onClick={() => setCurrentPage('home')} className="mt-4 text-blue-600 underline">Go back to Home</button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md mt-10">
      <button
        onClick={() => setCurrentPage('profile')}
        className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
      >
        <ArrowLeft size={18} className="mr-2" /> Back to Profile
      </button>

      <h2 className="text-xl font-bold mb-4">Assign Shift</h2>

      <label htmlFor="assign-employee" className="block mb-2 font-medium">Select Employee:</label>
      <select
        id="assign-employee"
        value={selectedUserId}
        onChange={e => setSelectedUserId(e.target.value)}
        className="w-full mb-4 border border-gray-300 rounded p-2"
      >
        <option value="">-- Select --</option>
        {employees.length > 0 ? (
          employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.firstName} {emp.lastName}
            </option>
          ))
        ) : (
          <option disabled>No users with role "user" found</option>
        )}
      </select>

      {(([ 
        ['title', 'Job Title'],
        ['location', 'Location'],
        ['date', 'Date (YYYY-MM-DD)'],
        ['startTime', 'Start Time (HH:MM)'],
        ['endTime', 'End Time (HH:MM)'],
        ['hourlyWage', 'Hourly Wage'],
        ['latitude', 'Latitude'],
        ['longitude', 'Longitude'],
      ] as Array<[keyof FormData, string]>)).map(([field, label]) => {
        const id = `assign-${String(field)}`;
        const isNumeric = field === 'hourlyWage' || field === 'latitude' || field === 'longitude';
        return (
          <div key={field} className="mb-3">
            <label htmlFor={id} className="block text-sm font-medium mb-1">{label}</label>
            <input
              id={id}
              type="text"
              name={field}
              value={formData[field]}
              onChange={handleChange}
              inputMode={isNumeric ? 'decimal' : undefined}
              className={`w-full border rounded p-2 ${errors[field] ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors[field] && <p className="text-xs text-red-600 mt-1">{errors[field]}</p>}
          </div>
        );
      })}

      <button
        onClick={handleSubmit}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
      >
        Assign Shift
      </button>
    </div>
  );
};

export default AssignShiftPage;
