 // src/pages/SignUp.tsx
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';   // ✅ add
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useApp } from '../contexts/AppContext';

const SignUp: React.FC<{ onSwitch: () => void }> = ({ onSwitch }) => {
  const { setUser } = useApp();                  // ⬅️ keep setUser, drop setCurrentPage
  const navigate = useNavigate();                // ✅ router hook

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);

      // Save new user doc
      await setDoc(doc(db, 'users', userCred.user.uid), {
        email,
        firstName,
        lastName,
        availability: {},
        profilePicture: '',
        role: 'employee',  // ✅ default role
      });

      // Update context
      setUser({
        id: userCred.user.uid,
        email,
        firstName,
        lastName,
        rating: 0,
        totalHours: 0,
        language: 'en',
        role: 'employee',
        profilePicture: '',
      });

      navigate('/'); // ✅ go to Home route
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <form onSubmit={handleSignUp} className="bg-white p-6 rounded-xl shadow-md w-80 text-center">
        <div className="flex justify-center mb-4">
          <img
            src="/images/PlanB.jpeg"
            alt="Plan B Logo"
            className="w-24 h-24 object-contain rounded-full shadow-md hover:scale-105 transition-transform duration-300"
          />
        </div>
        <h2 className="text-xl font-bold mb-4">Create a BeeWork Account</h2>

        <input
          type="text"
          placeholder="Your first name"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          className="w-full p-2 border rounded mb-3"
          required
        />
        <input
          type="text"
          placeholder="Your last name"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          className="w-full p-2 border rounded mb-3"
          required
        />
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-2 border rounded mb-3"
          required
        />
        <input
          type="password"
          placeholder="Your password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full p-2 border rounded mb-3"
          required
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          required
        />

        <button type="submit" className="w-full bg-amber-500 text-white py-2 rounded">
          Sign Up
        </button>

        <p className="text-sm text-center mt-4">
          Already have an account?{' '}
          <span onClick={onSwitch} className="text-blue-600 cursor-pointer underline">
            Sign In
          </span>
        </p>
      </form>
    </div>
  );
};

export default SignUp;
