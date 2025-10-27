import React from 'react';
import { ArrowLeft, Globe, Mail, LogOut, ChevronRight, User, Lock } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

const SettingsPage: React.FC = () => {
  const { setLanguage, language, setUser } = useApp();
  const navigate = useNavigate();

  const handleLanguageToggle = () => setLanguage(language === 'en' ? 'ar' : 'en');
  const handleContactUs = () => { globalThis.location.href = 'mailto:support@beework.com?subject=Support Request'; };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser({
        id: '', firstName: '', lastName: '', email: '',
        rating: 0, totalHours: 0, language: 'en', role: 'employee',
        profilePicture: '',
      });
      navigate('/');
    } catch {
      alert('Failed to sign out. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="px-4 pt-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-6">
            <button onClick={() => navigate('/profile')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors mr-3">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">Settings</h1>
          </div>

          <div className="space-y-4">
            {/* Preferences */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Preferences</h2>
              <button onClick={handleLanguageToggle} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center space-x-3">
                  <Globe size={20} className="text-gray-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-800">Language</p>
                    <p className="text-sm text-gray-600">{language === 'en' ? 'English' : 'العربية'}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Account */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Account</h2>

              {/* Personal information */}
              <button
                onClick={() => navigate('/personal-info')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <User size={20} className="text-gray-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-800">Personal information</p>
                    <p className="text-sm text-gray-600">First/Last name, email, Cliq & phone</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>

              {/* Change password */}
              <button
                onClick={() => navigate('/change-password')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Lock size={20} className="text-gray-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-800">Change password</p>
                    <p className="text-sm text-gray-600">Update your sign-in password</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>

              {/* Contact Us */}
              <button onClick={handleContactUs} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center space-x-3">
                  <Mail size={20} className="text-gray-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-800">Contact Us</p>
                    <p className="text-sm text-gray-600">Get help and support</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>

              {/* Log out */}
              <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 hover:bg-red-50 rounded-lg transition-colors text-red-600">
                <div className="flex items-center space-x-3">
                  <LogOut size={20} />
                  <div className="text-left">
                    <p className="font-medium">Log Out</p>
                    <p className="text-sm text-red-500">Sign out of your account</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-red-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;
