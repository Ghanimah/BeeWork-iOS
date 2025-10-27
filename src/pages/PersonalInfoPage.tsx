// src/pages/PersonalInfoPage.tsx
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save, Lock } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim().toLowerCase());
// Name may be empty (optional). If provided: start with a letter, then letters/marks/apostrophe/hyphen/space up to 50 total.
const nameOk  = (v: string) => v.trim() === '' || /^\p{L}[\p{L}\p{M}'\- ]{1,49}$/u.test(v.trim());

// Basic IBAN checker (uppercased, no spaces). Accepts 15–34 alphanumerics, optional stricter JO note below.
// Prefer String#replaceAll when available; otherwise use split/join to avoid regex replace smells.
const replaceAllCompat = (s: string, re: RegExp, repl: string) => ((s as any).replaceAll?.(re, repl)) ?? s.split(re).join(repl);
const normalizeIban = (v: string) => replaceAllCompat(v, /\s+/g, '').toUpperCase();
const ibanOk = (v: string) => {
  const x = normalizeIban(v);
  if (x === '') return true; // optional field is ok empty
  // Generic IBAN length/charset rule:
  if (!/^[A-Z0-9]{15,34}$/.test(x)) return false;
  // Optional: if you want to enforce Jordan specifically, uncomment next line (JO + 30 chars total)
  // if (!/^JO[A-Z0-9]{28}$/.test(x)) return false;
  return true;
};

const PersonalInfoPage: React.FC = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [origEmail, setOrigEmail] = useState('');
  const [password,  setPassword]  = useState(''); // only required if email changes

  // CHANGED: cliq -> iban
  const [iban, setIban] = useState('');
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
        // Prefill from existing iban, or migrate old cliq (if present)
        setIban(d.iban || d.cliq || '');
        setPhone(d.phone || '');
      } else {
        setEmail(u.email || '');
        setOrigEmail(u.email || '');
      }
    };
    load();
  }, []);

  // --- helpers to reduce cognitive complexity ---
  const validateInputs = (): string | null => {
    if (!nameOk(firstName)) return 'Enter a valid first name.';
    if (!nameOk(lastName)) return 'Enter a valid last name.';
    if (!emailOk(email)) return 'Enter a valid email.';
    if (!ibanOk(iban)) return 'Enter a valid IBAN (letters & numbers only, 15–34 chars).';
    const phoneOk = phone === '' || /^\d+$/.test(phone);
    if (!phoneOk) return 'Phone should contain digits only.';
    return null;
  };

  const persistBasics = async (uid: string) => {
    await setDoc(
      doc(db, 'users', uid),
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        iban: normalizeIban(iban),
        phone: phone.trim(),
      },
      { merge: true }
    );
  };

  const handleEmailChange = async (u: any, newEmail: string) => {
    if (!password) {
      setSaving(false);
      alert('Please enter your current password to confirm email change.');
      return;
    }
    const cred = EmailAuthProvider.credential(origEmail, password);
    await reauthenticateWithCredential(u, cred);
    await verifyBeforeUpdateEmail(u, newEmail, {
      url: (globalThis.location?.origin ?? '') + '/email-updated',
      handleCodeInApp: false,
    });
    alert('We sent a confirmation link to the new email. Open it to finish the change.');
  };

  const save = async () => {
    const u = auth.currentUser;
    if (!u) return;
    const err = validateInputs();
    if (err) { alert(err); return; }
    try {
      setSaving(true);
      await persistBasics(u.uid);
      const newEmail = email.trim().toLowerCase();
      if (newEmail === origEmail) {
        alert('Saved!');
        navigate('/settings');
        return;
      }
      await handleEmailChange(u, newEmail);
      navigate('/settings');
    } catch (e: unknown) {
      const errObj = e as { code?: string; message?: string } | undefined;
      let msg = 'Failed to save. Please try again.';
      if (errObj?.code === 'auth/requires-recent-login') {
        msg = 'Please re-enter your password and try again.';
      } else if (errObj?.code === 'auth/email-already-in-use') {
        msg = 'This email is already in use.';
      } else if (errObj?.code === 'auth/operation-not-allowed') {
        msg = 'Email change requires verification. Please use the link we send.';
      } else if (errObj?.message) {
        msg = errObj.message;
      }
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
                <label htmlFor="pi-first" className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input
                  id="pi-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full p-3 border rounded-lg text-black"
                  inputMode="text"
                  autoCapitalize="words"
                />
              </div>
              <div>
                <label htmlFor="pi-last" className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input
                  id="pi-last"
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
              <label htmlFor="pi-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="pi-email"
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
                  <label htmlFor="pi-password" className="block text-sm font-medium text-gray-700 mb-1">Confirm with password</label>
                  <div className="flex items-center gap-2">
                    <Lock size={16} className="text-gray-500" />
                    <input
                      type="password"
                      id="pi-password"
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

            {/* IBAN */}
            <div>
              <label htmlFor="pi-iban" className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
              <input
                id="pi-iban"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="e.g., JO12 3456 7890 1234 5678 9012 3456"
                className="w-full p-3 border rounded-lg text-black"
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter your bank IBAN (letters & numbers only). We’ll format it automatically.
              </p>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="pi-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
              <input
                id="pi-phone"
                value={phone}
                onChange={(e) => setPhone(replaceAllCompat(e.target.value, /\D+/g, ''))}
                placeholder="07XXXXXXXX"
                className="w-full p-3 border rounded-lg text-black"
                inputMode="numeric"
                pattern="\d*"
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
