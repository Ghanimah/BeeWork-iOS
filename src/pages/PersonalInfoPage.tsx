import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save, Lock } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim().toLowerCase());
const nameOk  = (v: string) => v.trim() === '' || /^[\p{L}][\p{L}\p{M}' -]{1,49}$/u.test(v.trim());

const PersonalInfoPage: React.FC = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [origEmail, setOrigEmail] = useState('');
  const [password,  setPassword]  = useState(''); // only required if email changes

  const [cliq, setCliq] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const u = auth.currentUser;
      if (!u) return;
      const snap = await getDoc(doc(db, 'users', u.uid));
      if (snap.exists()) {
        const d = snap.data() as any;
        setFirstName(d.firstName || '');
        setLastName(d.lastName || '');
        setEmail((d.email || u.email || '').toString());
        setOrigEmail((d.email || u.email || '').toString());
        setCliq(d.cliq || '');
        setPhone(d.phone || '');
      } else {
        setEmail(u.email || '');
        setOrigEmail(u.email || '');
      }
    };
    load();
  }, []);

  const save = async () => {
    const u = auth.currentUser;
    if (!u) return;

    // basic validations
    if (!nameOk(firstName)) return alert('Enter a valid first name.');
    if (!nameOk(lastName))  return alert('Enter a valid last name.');
    if (!emailOk(email))    return alert('Enter a valid email.');
    const cliqOk = cliq === '' || /^[a-zA-Z0-9]+$/.test(cliq);
    const phoneOk = phone === '' || /^[0-9]+$/.test(phone);
    if (!cliqOk)  return alert('Cliq alias should contain letters and numbers only.');
    if (!phoneOk) return alert('Phone should contain digits only.');

    try {
      setSaving(true);

      // Update names / extra fields first
      await setDoc(
        doc(db, 'users', u.uid),
        {
          firstName: firstName.trim(),
          lastName : lastName.trim(),
          cliq: cliq.trim(),
          phone: phone.trim(),
        },
        { merge: true }
      );

      // If email changed → reauth + send verification link to new email.
      const newEmail = email.trim().toLowerCase();
      if (newEmail !== origEmail) {
        if (!password) {
          setSaving(false);
          return alert('Please enter your current password to confirm email change.');
        }
        const cred = EmailAuthProvider.credential(origEmail, password);
        await reauthenticateWithCredential(u, cred);

        await verifyBeforeUpdateEmail(u, newEmail, {
          url: window.location.origin + '/email-updated',
          handleCodeInApp: false, // simplest flow (Firebase handles the link)
        });

        // IMPORTANT: do NOT update Firestore email now. It updates after the user clicks the link.
        alert('We sent a confirmation link to the new email. Open it to finish the change.');
      } else {
        alert('Saved!');
      }

      navigate('/settings');
    } catch (e: any) {
      const msg =
        e?.code === 'auth/requires-recent-login' ? 'Please re-enter your password and try again.'
      : e?.code === 'auth/email-already-in-use' ? 'This email is already in use.'
      : e?.code === 'auth/operation-not-allowed' ? 'Email change requires verification. Please use the link we send.'
      : e?.message || 'Failed to save. Please try again.';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const emailChanged = email.trim().toLowerCase() !== origEmail.toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="px-4 pt-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-6">
            <button onClick={() => navigate('/settings')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors mr-3">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">Personal information</h1>
          </div>

          <div className="card space-y-4">
            {/* First / Last */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full p-3 border rounded-lg text-black"
                  inputMode="text"
                  autoCapitalize="words"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full p-3 border rounded-lg text-black"
                  inputMode="text"
                  autoCapitalize="words"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full p-3 border rounded-lg text-black"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
              />
              {emailChanged && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm with password</label>
                  <div className="flex items-center gap-2">
                    <Lock size={16} className="text-gray-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Current password"
                      className="w-full p-3 border rounded-lg text-black"
                      autoComplete="current-password"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    We’ll email a confirmation link to the new address.
                  </p>
                </div>
              )}
            </div>

            {/* Cliq */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliq alias</label>
              <input
                value={cliq}
                onChange={(e) => setCliq(e.target.value)}
                placeholder="e.g., amjad123"
                className="w-full p-3 border rounded-lg text-black"
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <p className="text-xs text-gray-500 mt-1">Letters and numbers only.</p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="07XXXXXXXX"
                className="w-full p-3 border rounded-lg text-black"
                inputMode="numeric"
                pattern="[0-9]*"
              />
              <p className="text-xs text-gray-500 mt-1">Digits only.</p>
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="w-full flex items-center justify-center space-x-2 p-3 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
            >
              <Save size={18} />
              <span>{saving ? 'Saving…' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoPage;
