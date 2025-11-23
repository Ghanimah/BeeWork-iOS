// src/pages/AssignShiftPage.tsx

import { useEffect, useState } from 'react';
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

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    const fetchEmployees = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const list: Employee[] = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              role: data.role || 'user',
            };
          })
          .filter((u) => u.role === 'user');
        setEmployees(list);
      } catch (err) {
        console.error('Error loading users:', err);
      }
    };
    fetchEmployees();
  }, [isAdmin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((curr) => ({ ...curr, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      alert('Please select an employee.');
      return;
    }
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
        title: formData.title,
        location: formData.location,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        hourlyWage: hourly,
        latitude: lat,
        longitude: lon,
        status: 'scheduled',
      });
      alert('Shift assigned!');
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
      alert('Error assigning shift.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="page-shell max-w-xl text-center">
        <div className="card text-red-600">
          <p>You do not have permission to access this page.</p>
          <button onClick={() => setCurrentPage('home')} className="mt-4 text-blue-600 underline">
            Go back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-xl space-y-4">
      <div className="flex items-center">
        <button
          onClick={() => setCurrentPage('profile')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors mr-2"
        >
          <ArrowLeft size={18} className="text-gray-700" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">Assign Shift</h2>
      </div>

      <div className="card space-y-4">
        <div>
          <label htmlFor="assign-employee" className="block mb-2 font-medium text-gray-800">
            Select Employee
          </label>
          <select
            id="assign-employee"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 bg-white"
          >
            <option value="">-- Select --</option>
            {employees.length > 0 ? (
              employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))
            ) : (
              <option disabled>No users with role "user" found</option>
            )}
          </select>
        </div>

        {(
          [
            ['title', 'Job Title', 'text'],
            ['location', 'Location', 'text'],
            ['date', 'Date (YYYY-MM-DD)', 'date'],
            ['startTime', 'Start Time (HH:MM)', 'time'],
            ['endTime', 'End Time (HH:MM)', 'time'],
            ['hourlyWage', 'Hourly Wage', 'number'],
            ['latitude', 'Latitude', 'number'],
            ['longitude', 'Longitude', 'number'],
          ] as Array<[keyof FormData, string, string]>
        ).map(([field, label, type]) => {
          const id = `assign-${String(field)}`;
          const isNumeric = type === 'number';
          return (
            <div key={field} className="space-y-1">
              <label htmlFor={id} className="block text-sm font-medium text-gray-700">
                {label}
              </label>
              <input
                id={id}
                type={type}
                name={field}
                value={formData[field]}
                onChange={handleChange}
                inputMode={isNumeric ? 'decimal' : undefined}
                {...(isNumeric ? { step: 'any' } : {})}
                className={`w-full border rounded-lg p-3 bg-white ${errors[field] ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors[field] && <p className="text-xs text-red-600">{errors[field]}</p>}
            </div>
          );
        })}

        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
        >
          Assign Shift
        </button>
      </div>
    </div>
  );
};

export default AssignShiftPage;
