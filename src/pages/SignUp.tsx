import { useState, useMemo, type FC } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useApp } from '../contexts/AppContext';
import { defaultAvailability } from '../utils/availability';

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim().toLowerCase());
// Name: starts with a letter, then 1-49 of letters/marks/apostrophe/hyphen/space
const nameOk = (v: string) => /^\p{L}[\p{L}\p{M}'\- ]{1,49}$/u.test(v.trim());
const pwOk = (v: string) => /^(?=.*[A-Za-z])(?=.*\d)[\s\S]{8,64}$/.test(v);

const SignUp: FC<{ onSwitch: () => void }> = ({ onSwitch }) => {
  const { setUser } = useApp();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = useMemo(
    () => nameOk(firstName) && nameOk(lastName) && emailOk(email) && pwOk(password) && password === confirm,
    [firstName, lastName, email, password, confirm]
  );

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!valid) return setErr('Please fix the highlighted fields.');

    try {
      setBusy(true);
      const em = email.trim().toLowerCase();
      const userCred = await createUserWithEmailAndPassword(auth, em, password);
      // Create profile doc, but don't block navigation if it hangs; AppContext will sync later.
      setDoc(doc(db, 'users', userCred.user.uid), {
        email: em,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        availability: defaultAvailability,
        profilePicture: '',
        role: 'employee',
      }).catch(() => {});
      setUser({
        id: userCred.user.uid,
        email: em,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        rating: 0,
        totalHours: 0,
        language: 'en',
        role: 'employee',
        profilePicture: '',
      });
      navigate('/');
    } catch (e: any) {
      setErr(e?.message || 'Sign-up failed.');
    } finally {
      setBusy(false);
    }
  };

  const mark = (ok: boolean) => (ok ? 'border border-gray-200' : 'border border-red-500');

  return (
    <div className="page-shell min-h-[70dvh] items-center justify-center">
      <form onSubmit={handleSignUp} className="card w-full max-w-sm text-center space-y-4">
        <div className="flex justify-center">
          <img
            src="/images/PlanB.jpeg"
            alt="Plan B Logo"
            className="w-24 h-24 object-contain rounded-full shadow-md hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900">Create a BeeWork Account</h2>
          <p className="text-sm text-gray-600">Join the hive and start picking up shifts.</p>
        </div>

        <div className="space-y-3 text-left">
          <input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={`w-full p-3 rounded-lg text-black bg-white placeholder:text-gray-500 ${mark(nameOk(firstName))}`}
            required
          />
          <input
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={`w-full p-3 rounded-lg text-black bg-white placeholder:text-gray-500 ${mark(nameOk(lastName))}`}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full p-3 rounded-lg text-black bg-white placeholder:text-gray-500 ${mark(emailOk(email))}`}
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Password (8-64, letters and numbers)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full p-3 rounded-lg text-black bg-white placeholder:text-gray-500 ${mark(pwOk(password))}`}
            autoComplete="new-password"
            required
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`w-full p-3 rounded-lg text-black bg-white placeholder:text-gray-500 ${
              mark(password === confirm && confirm.length > 0)
            }`}
            required
          />
        </div>

        {err && <div className="text-red-600 text-sm">{err}</div>}

        <button
          type="submit"
          disabled={!valid || busy}
          className="w-full bg-amber-500 text-white py-3 rounded-xl font-semibold disabled:opacity-60 shadow-sm"
        >
          {busy ? 'Creating...' : 'Sign Up'}
        </button>

        <p className="text-sm text-center text-black">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitch}
            className="text-blue-600 underline bg-transparent p-0 border-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            Sign In
          </button>
        </p>
      </form>
    </div>
  );
};

export default SignUp;
