// src/pages/SignIn.tsx
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useApp } from '../contexts/AppContext';

const SignIn: React.FC<{ onSwitch: () => void }> = ({ onSwitch }) => {
  const { setUser } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const uid = user.uid;

      // Load user profile from Firestore
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) {
        alert('User data not found in Firestore');
        return;
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

      navigate('/'); // ✅ go to Home route
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <form onSubmit={handleSignIn} className="bg-white p-6 rounded-xl shadow-md w-80 text-center">
        <div className="flex justify-center mb-4">
          <img
            src="/images/PlanB.jpeg"
            alt="Plan B Logo"
            className="w-24 h-24 object-contain rounded-full shadow-md hover:scale-105 transition-transform duration-300"
          />
        </div>
        {/* Title now black */}
        <h2 className="text-xl font-bold mb-4 text-black">Sign In to BeeWork</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-2 border rounded mb-3"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          required
        />
        <button type="submit" className="w-full bg-amber-500 text-white py-2 rounded">
          Sign In
        </button>
        {/* Paragraph now black */}
        <p className="text-sm text-center mt-4 text-black">
          Don’t have an account?{' '}
          <span onClick={onSwitch} className="text-blue-600 cursor-pointer underline">
            Sign Up
          </span>
        </p>
      </form>
    </div>
  );
};

export default SignIn;
