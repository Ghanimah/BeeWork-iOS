import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import type { FC } from 'react';

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

const SignInRoute: FC = () => {
  const n = useNavigate();
  return <SignIn onSwitch={() => n('/sign-up')} />;
};

const SignUpRoute: FC = () => {
  const n = useNavigate();
  return <SignUp onSwitch={() => n('/sign-in')} />;
};

const AppRoutes: FC = () => {
  const { user, authReady } = useApp();
  const isAuthed = Boolean(user.id);
  const requireAuth = (el: JSX.Element) => (isAuthed ? el : <Navigate to="/sign-in" replace />);

  if (!authReady) return null;

  return (
    <Routes>
      <Route path="/" element={isAuthed ? <Navigate to="/home" replace /> : <Navigate to="/sign-in" replace />} />
      <Route path="/sign-in" element={isAuthed ? <Navigate to="/home" replace /> : <SignInRoute />} />
      <Route path="/sign-up" element={isAuthed ? <Navigate to="/home" replace /> : <SignUpRoute />} />

      <Route path="/home" element={requireAuth(<HomePage />)} />
      <Route path="/profile" element={requireAuth(<ProfilePage />)} />
      <Route path="/settings" element={requireAuth(<SettingsPage />)} />

      {/* Account-related */}
      <Route path="/personal-info" element={requireAuth(<PersonalInfoPage />)} />
      <Route path="/change-password" element={requireAuth(<ChangePasswordPage />)} />

      {/* Payouts */}
      <Route path="/payouts" element={requireAuth(<PayoutsPage />)} />

      {/* Other existing pages */}
      <Route path="/assign" element={requireAuth(<AssignShiftPage />)} />
      <Route path="/availability" element={requireAuth(<AvailabilityPage />)} />
      <Route path="/shift" element={requireAuth(<ShiftDetailPage />)} />
      <Route path="/empty" element={requireAuth(<EmptyShiftPage />)} />

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
        <div className="app-shell">
          <main className={`app-scroll ${hideNav ? 'no-nav' : ''}`}>
            <AppRoutes />
          </main>
          {!hideNav && <Navigation />}
        </div>
      </AppProvider>
    </AuthProvider>
  );
}
