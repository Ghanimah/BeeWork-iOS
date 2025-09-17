// src/pages/ProfilePage.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Camera, Star, Clock, Settings, Pencil } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [editing,   setEditing]   = useState(false);
  const [changed,   setChanged]   = useState(false);
  const [calculatedHours, setCalculatedHours] = useState<number>(0);

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setEmail(data.email || '');
      }

      const shiftsRef = collection(db, 'shifts');
      const q = query(shiftsRef, where('userId', '==', currentUser.uid), where('status', '==', 'completed'));
      const snapshot = await getDocs(q);

      let total = 0;
      snapshot.forEach(docu => {
        const shift = docu.data();
        if (shift.startTime && shift.endTime) {
          const start = new Date(shift.startTime);
          const end   = new Date(shift.endTime);
          total += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }
      });

      setCalculatedHours(Math.round(total * 100) / 100);
    };

    fetchUserData();
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        const result = e.target?.result as string;
        updateProfile({ profilePicture: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerImageUpload = () => fileInputRef.current?.click();

  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { firstName, lastName, email });
      setEditing(false);
      setChanged(false);
      alert('Profile updated!');
    } catch {
      alert('Error saving changes.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-20">
      <div className="px-4 pt-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Profile</h1>
            <p className="text-gray-600">Manage your account information</p>
          </div>

          <div className="card text-center">
            {/* Avatar */}
            <div className="relative mb-6">
              <div className="w-24 h-24 mx-auto mb-4 relative">
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-white text-2xl font-bold">
                      {firstName[0] || ''}{lastName[0] || ''}
                    </span>
                  </div>
                )}
                <button
                  onClick={triggerImageUpload}
                  className="absolute bottom-0 right-0 p-2 bg-amber-500 rounded-full shadow-lg hover:bg-amber-600 transition-colors"
                >
                  <Camera size={16} className="text-white" />
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>

            {/* Info */}
            <div className="flex flex-col items-center mb-4">
              {editing ? (
                <>
                  <div className="flex space-x-4 mb-2">
                    <input
                      value={firstName}
                      onChange={e => { setFirstName(e.target.value); setChanged(true); }}
                      className="p-2 border rounded text-center text-black"
                      placeholder="First Name"
                    />
                    <input
                      value={lastName}
                      onChange={e => { setLastName(e.target.value); setChanged(true); }}
                      className="p-2 border rounded text-center text-black"
                      placeholder="Last Name"
                    />
                  </div>
                  <input
                    value={email}
                    onChange={e => { setEmail(e.target.value); setChanged(true); }}
                    className="p-2 border rounded text-center w-full text-black"
                    placeholder="Email"
                  />
                </>
              ) : (
                <>
                  {/* ✅ Names centered */}
                  <div className="mb-1 text-center">
                    <p className="text-gray-800 font-medium">
                      {firstName} {lastName}
                    </p>
                  </div>
                  <p className="text-gray-600">{email}</p>
                </>
              )}

              <button onClick={() => setEditing(!editing)} className="mt-2 text-gray-500 hover:text-gray-700">
                <Pencil size={18} />
              </button>

              {editing && changed && (
                <button onClick={handleSave} className="mt-3 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded">
                  Save Changes
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6 mt-6">
              <div className="p-4 bg-amber-50 rounded-xl text-center">
                <div className="flex items-center justify-center mb-2"><Star size={20} className="text-amber-600" /></div>
                <div className="text-2xl font-bold text-gray-800">{user.rating}</div>
                <div className="text-sm text-gray-600">Rating</div>
              </div>
              <div className="p-4 bg-green-50 rounded-xl text-center">
                <div className="flex items-center justify-center mb-2"><Clock size={20} className="text-green-600" /></div>
                <div className="text-2xl font-bold text-gray-800">{calculatedHours}</div>
                <div className="text-sm text-gray-600">Total Hours</div>
              </div>
            </div>

            {/* Router buttons */}
            <button
              onClick={() => navigate("/settings")}
              className="w-full flex items-center justify-center space-x-2 p-4 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <Settings size={20} className="text-gray-600" />
              <span className="text-gray-700 font-medium">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;