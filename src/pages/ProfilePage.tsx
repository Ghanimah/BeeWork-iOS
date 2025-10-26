import React, { useRef, useEffect, useState } from 'react';
import { Camera, Star, Clock, Settings, Wallet } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { auth, db } from '../firebase';
import { doc, getDoc, collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// Lateness → stars: ≤5 min => 5★; 30 min => 3.5★; beyond 30 drops linearly to 1★ floor.
function starsForLateness(minLate: number) {
  if (minLate <= 5) return 5;
  const r = 5 - 0.06 * (minLate - 5); // 25 mins span reduces 1.5 stars
  return clamp(r, 1, 5);
}

const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [totalHours, setTotalHours] = useState<number>(0);
  const [rating, setRating] = useState<number>(5);

  useEffect(() => {
    const load = async () => {
      const u = auth.currentUser;
      if (!u) return;

      // Load profile doc
      const uDoc = await getDoc(doc(db, 'users', u.uid));
      if (uDoc.exists()) {
        const d = uDoc.data() as any;
        setFirstName(d.firstName || '');
        setLastName(d.lastName || '');
        setEmail(d.email || u.email || '');
        if (typeof d.totalHours === 'number') {
          setTotalHours(Math.round(d.totalHours * 100) / 100);
        }
      } else {
        setEmail(u.email || '');
      }

      // Fallback/derivation from punches for hours and rating
      const punchesQ = query(collectionGroup(db, 'punches'), where('userId', '==', u.uid));
      const punchSnaps = await getDocs(punchesQ);

      let mins = 0;
      const latenessStars: number[] = [];

      for (const snap of punchSnaps.docs) {
        const d = snap.data() as any;
        if (typeof d.durationMin === 'number') mins += d.durationMin;

        // rating only for completed punches
        const punchInAt = d?.punchInAt?.toDate?.();
        const punchOutAt = d?.punchOutAt?.toDate?.();
        if (!punchInAt || !punchOutAt) continue;

        // parent path: shifts/{shiftId}/punches/{uid}
        const parts = snap.ref.path.split('/');
        const shiftId = parts[1];
        const shiftDoc = await getDoc(doc(db, 'shifts', shiftId));
        if (!shiftDoc.exists()) continue;
        const s = shiftDoc.data() as any;

        const schedStart =
          s?.startTS?.toDate?.() ??
          s?.startTime?.toDate?.() ??
          (typeof s?.startTime === 'string' ? new Date(s.startTime) : null);

        if (schedStart) {
          const lateMin = Math.max(0, Math.round((punchInAt.getTime() - schedStart.getTime()) / 60000));
          latenessStars.push(starsForLateness(lateMin));
        }
      }

      setTotalHours(prev => prev || Math.round((mins / 60) * 100) / 100);

      const avg = latenessStars.length
        ? Math.round((latenessStars.reduce((a, b) => a + b, 0) / latenessStars.length) * 10) / 10
        : 5;
      setRating(avg);
    };

    load();
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => updateProfile({ profilePicture: e.target?.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-20">
      <div className="px-4 pt-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Profile</h1>
            <p className="text-gray-600">Your account information</p>
          </div>

          <div className="card text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 mx-auto mb-4 relative">
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-white text-2xl font-bold">
                      {firstName[0] || ''}{lastName[0] || ''}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-amber-500 rounded-full shadow-lg hover:bg-amber-600 transition-colors"
                >
                  <Camera size={16} className="text-white" />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Read-only fields */}
            <div className="mb-1 text-center">
              <p className="text-gray-800 font-medium">{firstName} {lastName}</p>
            </div>
            <p className="text-gray-600">{email}</p>

            {/* Tiles */}
            <div className="grid grid-cols-2 gap-4 mb-3 mt-6">
              <div className="p-4 bg-amber-50 rounded-xl text-center">
                <div className="flex items-center justify-center mb-2"><Star size={20} className="text-amber-600" /></div>
                <div className="text-2xl font-bold text-gray-800">{rating}</div>
                <div className="text-sm text-gray-600">Rating</div>
              </div>
              <div className="p-4 bg-green-50 rounded-xl text-center">
                <div className="flex items-center justify-center mb-2"><Clock size={20} className="text-green-600" /></div>
                <div className="text-2xl font-bold text-gray-800">{totalHours}</div>
                <div className="text-sm text-gray-600">Total Hours</div>
              </div>
            </div>

            {/* Payouts button */}
            <button
              onClick={() => navigate('/payouts')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Wallet size={20} className="text-gray-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-800">Payouts</p>
                  <p className="text-sm text-gray-600">See your paid shifts by period</p>
                </div>
              </div>
              {/* spacer icon for alignment */}
              <Settings size={20} className="opacity-0" />
            </button>

            <button
              onClick={() => navigate('/settings')}
              className="mt-3 w-full flex items-center justify-center space-x-2 p-4 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
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
