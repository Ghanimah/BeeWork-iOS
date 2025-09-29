import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';

import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import AssignShiftPage from './pages/AssignShiftPage';
import AvailabilityPage from './pages/AvailabilityPage';
import ShiftDetailPage from './pages/ShiftDetailPage';
import EmptyShiftPage from './pages/EmptyShiftPage';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';

// Existing extra pages
import PersonalInfoPage from './pages/PersonalInfoPage';
import ChangePasswordPage from './pages/ChangePasswordPage';

// NEW
import PayoutsPage from './pages/PayoutsPage';

const SignInRoute: React.FC = () => {
  const n = useNavigate();
  return <SignIn onSwitch={() => n('/sign-up')} />;
};

const SignUpRoute: React.FC = () => {
  const n = useNavigate();
  return <SignUp onSwitch={() => n('/sign-in')} />;
};

const AppRoutes: React.FC = () => {
  const { user } = useApp();

  return (
    <Routes>
      <Route path="/" element={user.id ? <Navigate to="/home" replace /> : <Navigate to="/sign-in" replace />} />
      <Route path="/sign-in" element={<SignInRoute />} />
      <Route path="/sign-up" element={<SignUpRoute />} />

      <Route path="/home" element={<HomePage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />

      {/* Account-related */}
      <Route path="/personal-info" element={<PersonalInfoPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

      {/* Payouts */}
      <Route path="/payouts" element={<PayoutsPage />} />

      {/* Other existing pages */}
      <Route path="/assign" element={<AssignShiftPage />} />
      <Route path="/availability" element={<AvailabilityPage />} />
      <Route path="/shift" element={<ShiftDetailPage />} />
      <Route path="/empty" element={<EmptyShiftPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  const { pathname } = useLocation();
  const hideNav = pathname === '/sign-in' || pathname === '/sign-up';

  return (
    <AuthProvider>
      <AppProvider>
        <div className="min-h-dvh bg-background text-foreground flex flex-col">
          <main className="flex-1 overflow-y-auto">
            <AppRoutes />
          </main>
          {!hideNav && <Navigation />}
        </div>
      </AppProvider>
    </AuthProvider>
  );
}
