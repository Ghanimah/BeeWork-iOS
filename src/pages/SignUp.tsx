import React, { useState, useMemo } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useApp } from '../contexts/AppContext';

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim().toLowerCase());
const nameOk  = (v: string) => /^[\p{L}][\p{L}\p{M}' -]{1,49}$/u.test(v.trim());
const pwOk    = (v: string) => /^(?=.*[A-Za-z])(?=.*\d)[\s\S]{8,64}$/.test(v);

const SignUp: React.FC<{ onSwitch: () => void }> = ({ onSwitch }) => {
  const { setUser } = useApp();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = useMemo(
    () => nameOk(firstName) && nameOk(lastName) && emailOk(email) && pwOk(password) && password === confirm,
    [firstName,lastName,email,password,confirm]
  );

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!valid) return setErr('Please fix the highlighted fields.');

    try {
      setBusy(true);
      const em = email.trim().toLowerCase();
      const userCred = await createUserWithEmailAndPassword(auth, em, password);
      await setDoc(doc(db, 'users', userCred.user.uid), {
        email: em,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        availability: {},
        profilePicture: '',
        role: 'employee',
      });
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

  const mark = (ok: boolean) => ok ? 'border' : 'border border-red-500';

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <form onSubmit={handleSignUp} className="bg-white p-6 rounded-xl shadow-md w-80 text-center">
        <div className="flex justify-center mb-4">
          <img src="/images/PlanB.jpeg" alt="Plan B Logo"
            className="w-24 h-24 object-contain rounded-full shadow-md hover:scale-105 transition-transform duration-300" />
        </div>
        <h2 className="text-xl font-bold mb-4 text-black">Create a BeeWork Account</h2>

        <input
          type="text" placeholder="First name" value={firstName}
          onChange={e => setFirstName(e.target.value)}
          className={`w-full p-2 rounded mb-3 text-black bg-white placeholder:text-gray-500 ${mark(nameOk(firstName))}`}
          required
        />
        <input
          type="text" placeholder="Last name" value={lastName}
          onChange={e => setLastName(e.target.value)}
          className={`w-full p-2 rounded mb-3 text-black bg-white placeholder:text-gray-500 ${mark(nameOk(lastName))}`}
          required
        />
        <input
          type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          className={`w-full p-2 rounded mb-3 text-black bg-white placeholder:text-gray-500 ${mark(emailOk(email))}`}
          autoComplete="email" required
        />
        <input
          type="password" placeholder="Password (8–64, letters & numbers)" value={password}
          onChange={e => setPassword(e.target.value)}
          className={`w-full p-2 rounded mb-3 text-black bg-white placeholder:text-gray-500 ${mark(pwOk(password))}`}
          autoComplete="new-password" required
        />
        <input
          type="password" placeholder="Confirm password" value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className={`w-full p-2 rounded mb-2 text-black bg-white placeholder:text-gray-500 ${mark(password === confirm && confirm.length>0)}`}
          required
        />

        {err && <div className="text-red-600 text-sm mb-3">{err}</div>}

        <button type="submit" disabled={!valid || busy}
          className="w-full bg-amber-500 text-white py-2 rounded disabled:opacity-50">
          {busy ? 'Creating…' : 'Sign Up'}
        </button>

        <p className="text-sm text-center mt-4 text-black">
          Already have an account?{' '}
          <span onClick={onSwitch} className="text-blue-600 cursor-pointer underline">Sign In</span>
        </p>
      </form>
    </div>
  );
};

export default SignUp;
