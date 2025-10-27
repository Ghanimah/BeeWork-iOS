import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useApp } from '../contexts/AppContext';

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim().toLowerCase());
const pwOk = (v: string) => /^(?=.*[A-Za-z])(?=.*\d)[\s\S]{8,64}$/.test(v);

const SignIn: React.FC<{ onSwitch: () => void }> = ({ onSwitch }) => {
  const { setUser } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const em = email.trim().toLowerCase();
    if (!emailOk(em)) return setErr('Enter a valid email address.');
    if (!pwOk(password)) return setErr('Password must be 8–64 chars with letters and numbers.');

    try {
      setBusy(true);
      const { user } = await signInWithEmailAndPassword(auth, em, password);
      const uid = user.uid;
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) {
        setBusy(false);
        return setErr('User profile not found. Contact support.');
        }
      const data = snap.data() as any;
      setUser({
        id: uid,
        email: data.email || user.email || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        rating: data.rating || 0,
        totalHours: data.totalHours || 0,
        language: data.language || 'en',
        role: data.role || 'employee',
        profilePicture: data.profilePicture || ''
      });
      navigate('/');
    } catch (e: any) {
      const code = e?.code as string | undefined;
      let msg = 'Sign-in failed.';
      switch (code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          msg = 'Email or password is incorrect, or the account does not exist in this project.';
          break;
        case 'auth/too-many-requests':
          msg = 'Too many attempts. Please try again later or reset your password.';
          break;
        case 'auth/user-disabled':
          msg = 'This account has been disabled.';
          break;
        case 'auth/network-request-failed':
          msg = 'Network error. Check your connection and try again.';
          break;
        default:
          msg = e?.message || msg;
      }
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async () => {
    const em = email.trim().toLowerCase();
    if (!emailOk(em)) return setErr('Enter your valid email above, then tap “Forgot password?”.');
    try {
      setBusy(true);
      await sendPasswordResetEmail(auth, em);
      alert('Password reset email sent. Check your inbox/spam.');
    } catch (e: any) {
      setErr(e?.message || 'Could not send reset email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <form onSubmit={handleSignIn} className="bg-white p-6 rounded-xl shadow-md w-80 text-center">
        <div className="flex justify-center mb-4">
          <img src="/images/PlanB.jpeg" alt="Plan B Logo"
            className="w-24 h-24 object-contain rounded-full shadow-md hover:scale-105 transition-transform duration-300" />
        </div>
        <h2 className="text-xl font-bold mb-4 text-black">Sign In to BeeWork</h2>

        <input
          type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-2 border rounded mb-3 text-black bg-white placeholder:text-gray-500"
          autoComplete="email" required
        />
        <input
          type="password" placeholder="Password"
          value={password} onChange={e => setPassword(e.target.value)}
          className="w-full p-2 border rounded mb-2 text-black bg-white placeholder:text-gray-500"
          autoComplete="current-password" required
        />

        <div className="text-right mb-4">
          <button type="button" onClick={handleForgot}
            className="text-sm text-blue-600 underline disabled:opacity-50" disabled={busy}>
            Forgot password?
          </button>
        </div>

        {err && <div className="text-red-600 text-sm mb-3">{err}</div>}

        <button type="submit" disabled={busy}
          className="w-full bg-amber-500 text-white py-2 rounded disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign In'}
        </button>

        <p className="text-sm text-center mt-4 text-black">
          Don’t have an account?{' '}
          <span onClick={onSwitch} className="text-blue-600 cursor-pointer underline">Sign Up</span>
        </p>
      </form>
    </div>
  );
};

export default SignIn;
