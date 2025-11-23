import { useState, type FC } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useApp } from '../contexts/AppContext';

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim().toLowerCase());
const pwOk = (v: string) => /^(?=.*[A-Za-z])(?=.*\d)[\s\S]{8,64}$/.test(v);

const SignIn: FC<{ onSwitch: () => void }> = ({ onSwitch }) => {
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
    if (!pwOk(password)) return setErr('Password must be 8-64 characters with letters and numbers.');

    try {
      setBusy(true);
      const cred = await signInWithEmailAndPassword(auth, em, password);
      // Rely on AppContext's onAuthStateChanged listener to populate full profile.
      setUser({
        id: cred.user.uid,
        email: cred.user.email || em,
        firstName: '',
        lastName: '',
        rating: 0,
        totalHours: 0,
        language: 'en',
        role: 'employee',
        profilePicture: '',
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
    if (!emailOk(em)) return setErr('Enter your valid email above, then tap "Forgot password?".');
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
    <div className="page-shell min-h-[70dvh] items-center justify-center">
      <form onSubmit={handleSignIn} className="card w-full max-w-sm text-center space-y-4">
        <div className="flex justify-center">
          <img
            src="/images/PlanB.jpeg"
            alt="Plan B Logo"
            className="w-24 h-24 object-contain rounded-full shadow-md hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900">Sign In to BeeWork</h2>
          <p className="text-sm text-gray-600">Welcome back. Please sign in to continue.</p>
        </div>

        <div className="space-y-3 text-left">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg text-black bg-white placeholder:text-gray-500"
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg text-black bg-white placeholder:text-gray-500"
            autoComplete="current-password"
            required
          />

          <div className="text-right">
            <button
              type="button"
              onClick={handleForgot}
              className="text-sm text-blue-600 underline disabled:opacity-50"
              disabled={busy}
            >
              Forgot password?
            </button>
          </div>
        </div>

        {err && <div className="text-red-600 text-sm">{err}</div>}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-amber-500 text-white py-3 rounded-xl font-semibold disabled:opacity-60 shadow-sm"
        >
          {busy ? 'Signing in...' : 'Sign In'}
        </button>

        <p className="text-sm text-center text-black">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitch}
            className="text-blue-600 underline bg-transparent p-0 border-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            Sign Up
          </button>
        </p>
      </form>
    </div>
  );
};

export default SignIn;
