import { useMemo, useRef, type FC } from 'react';
import { Camera, Star, Clock, Settings, Wallet } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';

const ProfilePage: FC = () => {
  const { user, updateProfile, shifts } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  const email = user.email || '';
  const numeric = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const rating = numeric(user.rating);

  const computedHours = useMemo(() => {
    if (!user.id) return 0;
    return shifts
      .filter((s) => s.userId === user.id && s.startTime && s.endTime)
      .reduce((sum, s) => {
        const start = new Date(s.startTime as string).getTime();
        const end = new Date(s.endTime as string).getTime();
        if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return sum;
        return sum + (end - start) / 3_600_000;
      }, 0);
  }, [shifts, user.id]);

  const totalHours = Math.max(numeric(user.totalHours), computedHours);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => updateProfile({ profilePicture: e.target?.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="page-shell space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-800">Profile</h1>
        <p className="text-gray-600 text-sm">Your account information</p>
      </div>

      <div className="card text-center space-y-6">
        <div className="relative">
          <div className="w-28 h-28 mx-auto relative">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="Profile"
                className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg text-white text-2xl font-bold">
                {firstName[0] || ''}
                {lastName[0] || ''}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-amber-500 rounded-full shadow-lg hover:bg-amber-600 transition-colors"
              aria-label="Change profile picture"
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

        <div>
          <p className="text-gray-800 font-medium">{firstName} {lastName}</p>
          <p className="text-gray-600">{email}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-amber-50 rounded-xl text-center">
            <div className="flex items-center justify-center mb-2">
              <Star size={20} className="text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{rating.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Rating</div>
          </div>
          <div className="p-4 bg-green-50 rounded-xl text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock size={20} className="text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{totalHours.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Total Hours</div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate('/payouts')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors text-left"
          >
            <div className="flex items-center space-x-3">
              <Wallet size={20} className="text-gray-600" />
              <div>
                <p className="font-medium text-gray-800">Payouts</p>
                <p className="text-sm text-gray-600">See your paid shifts by period</p>
              </div>
            </div>
            <Settings size={20} className="opacity-0" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="w-full flex items-center justify-center space-x-2 p-4 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            <Settings size={20} className="text-gray-600" />
            <span className="text-gray-700 font-medium">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
