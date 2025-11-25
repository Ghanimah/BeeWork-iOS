import { useState, type FC } from 'react';
import { ArrowLeft, Globe, Mail, LogOut, ChevronRight, User, Lock, Trash2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { deleteUser, signOut } from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';

const SettingsPage: FC = () => {
  const { setLanguage, language, setUser } = useApp();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLanguageToggle = () => setLanguage(language === 'en' ? 'ar' : 'en');
  const handleContactUs = () => {
    globalThis.location.href = 'mailto:support@beework.com?subject=Support Request';
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser({
        id: '',
        firstName: '',
        lastName: '',
        email: '',
        rating: 0,
        totalHours: 0,
        language: 'en',
        role: 'employee',
        profilePicture: '',
      });
      navigate('/');
    } catch {
      alert('Failed to sign out. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) {
      setShowDeleteModal(false);
      return;
    }
    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      setUser({
        id: '',
        firstName: '',
        lastName: '',
        email: '',
        rating: 0,
        totalHours: 0,
        language: 'en',
        role: 'employee',
        profilePicture: '',
      });
      navigate('/sign-in');
    } catch {
      alert('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="page-shell space-y-5">
      <div className="flex items-center">
        <button
          onClick={() => navigate('/profile')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors mr-3"
          aria-label="Back"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Settings</h1>
      </div>

      <div className="space-y-4">
        <div className="card space-y-2">
          <h2 className="text-lg font-semibold text-gray-800">Preferences</h2>
          <button
            onClick={handleLanguageToggle}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Globe size={20} className="text-gray-600" />
              <div className="text-left">
                <p className="font-medium text-gray-800">Language</p>
                <p className="text-sm text-gray-600">{language === 'en' ? 'English' : 'Arabic'}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="card space-y-2">
          <h2 className="text-lg font-semibold text-gray-800">Account</h2>

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

          <button
            onClick={handleContactUs}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Mail size={20} className="text-gray-600" />
              <div className="text-left">
                <p className="font-medium text-gray-800">Contact Us</p>
                <p className="text-sm text-gray-600">Get help and support</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-between p-4 hover:bg-red-50 rounded-lg transition-colors text-red-600"
          >
            <div className="flex items-center space-x-3">
              <Trash2 size={20} />
              <div className="text-left">
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-red-500">Permanently delete your account and data</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-red-400" />
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-4 hover:bg-red-50 rounded-lg transition-colors text-red-600"
          >
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

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Delete account?</h3>
            <p className="text-sm text-gray-600">
              This action is permanent. All your data will be deleted.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
