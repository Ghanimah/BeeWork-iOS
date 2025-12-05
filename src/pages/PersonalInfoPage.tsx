// src/pages/PersonalInfoPage.tsx
import { useEffect, useState, type FC } from 'react';
import { ArrowLeft, Save, Lock } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim().toLowerCase());
const nameOk = (v: string) => v.trim() === '' || /^\p{L}[\p{L}\p{M}'\- ]{1,49}$/u.test(v.trim());

const replaceAllCompat = (s: string, re: RegExp, repl: string) =>
  (s as any).replaceAll?.(re, repl) ?? s.split(re).join(repl);
const normalizeIban = (v: string) => replaceAllCompat(v, /\s+/g, '').toUpperCase();
const ibanOk = (v: string) => {
  const x = normalizeIban(v);
  if (x === '') return true;
  if (!/^[A-Z0-9]{15,34}$/.test(x)) return false;
  return true;
};
const genderOptions = ['male', 'female'] as const;
const genderOk = (v: string) => v === '' || genderOptions.includes(v as (typeof genderOptions)[number]);
const dobOk = (v: string) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v);
const nationalIdOk = (v: string) => v === '' || /^\d{10}$/.test(v);
const cliqOk = (v: string) => v === '' || /^[A-Za-z0-9]+$/.test(v);

const PersonalInfoPage: FC = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [origEmail, setOrigEmail] = useState('');
  const [password, setPassword] = useState('');

  const [iban, setIban] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [cliq, setCliq] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const u = auth.currentUser;
      if (!u) return;
      const snap = await getDoc(doc(db, 'users', u.uid));
      if (snap.exists()) {
        const d = snap.data() as any;
        const nextEmail = (d.email || u.email || '').toString();
        setFirstName(d.firstName || '');
        setLastName(d.lastName || '');
        setEmail(nextEmail);
        setOrigEmail(nextEmail);
        setIban(d.iban || '');
        setPhone(d.phone || '');
        setGender(d.gender || '');
        setDob(d.dob || '');
        setNationalId(d.nationalId || '');
        setCliq(d.cliq || '');
      } else {
        setEmail(u.email || '');
        setOrigEmail(u.email || '');
      }
    };
    load();
  }, []);

  const validateInputs = (): string | null => {
    if (!nameOk(firstName)) return 'Enter a valid first name.';
    if (!nameOk(lastName)) return 'Enter a valid last name.';
    if (!emailOk(email)) return 'Enter a valid email.';
    if (!ibanOk(iban)) return 'Enter a valid IBAN (letters and numbers only, 15-34 chars).';
    const phoneOk = phone === '' || /^\d+$/.test(phone);
    if (!phoneOk) return 'Phone should contain digits only.';
    if (!genderOk(gender)) return 'Choose a valid gender.';
    if (!dobOk(dob)) return 'Enter date of birth in YYYY-MM-DD.';
    if (!nationalIdOk(nationalId)) return 'National ID must be exactly 10 digits.';
    if (!cliqOk(cliq)) return 'Cliq can contain letters and numbers only.';
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
        gender: gender.trim(),
        dob: dob.trim(),
        nationalId: nationalId.trim(),
        cliq: cliq.trim(),
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
    if (err) {
      alert(err);
      return;
    }
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
    <div className="page-shell space-y-5">
      <div className="flex items-center">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors mr-3"
          aria-label="Back"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Personal information</h1>
      </div>

      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pi-first" className="block text-sm font-medium text-gray-700 mb-1">
              First name
            </label>
            <input
              id="pi-first"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="w-full p-3 border rounded-lg text-black border-gray-300"
              inputMode="text"
              autoCapitalize="words"
            />
          </div>
          <div>
            <label htmlFor="pi-last" className="block text-sm font-medium text-gray-700 mb-1">
              Last name
            </label>
            <input
              id="pi-last"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="w-full p-3 border rounded-lg text-black border-gray-300"
              inputMode="text"
              autoCapitalize="words"
            />
          </div>
        </div>

        <div>
          <label htmlFor="pi-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="pi-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full p-3 border rounded-lg text-black border-gray-300"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
          />
          {emailChanged && (
            <div className="mt-3 space-y-2">
              <label htmlFor="pi-password" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm with password
              </label>
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-gray-500" />
                <input
                  type="password"
                  id="pi-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full p-3 border rounded-lg text-black border-gray-300"
                  autoComplete="current-password"
                />
              </div>
              <p className="text-xs text-gray-500">
                We will email a confirmation link to the new address.
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="pi-iban" className="block text-sm font-medium text-gray-700 mb-1">
            IBAN
          </label>
          <input
            id="pi-iban"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            placeholder="e.g., JO12 3456 7890 1234 5678 9012 3456"
            className="w-full p-3 border rounded-lg text-black border-gray-300"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter your bank IBAN (letters and numbers only). We will format it automatically.
          </p>
        </div>

        <div>
          <label htmlFor="pi-phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone number
          </label>
          <input
            id="pi-phone"
            value={phone}
            onChange={(e) => setPhone(replaceAllCompat(e.target.value, /\D+/g, ''))}
            placeholder="07XXXXXXXX"
            className="w-full p-3 border rounded-lg text-black border-gray-300"
            inputMode="numeric"
            pattern="\d*"
          />
          <p className="text-xs text-gray-500 mt-1">Digits only.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pi-gender" className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              id="pi-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full p-3 border rounded-lg text-black border-gray-300 bg-white"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label htmlFor="pi-dob" className="block text-sm font-medium text-gray-700 mb-1">
              Date of birth
            </label>
            <input
              id="pi-dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full h-12 px-3 border rounded-lg text-black border-gray-300 bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pi-national" className="block text-sm font-medium text-gray-700 mb-1">
              National ID
            </label>
            <input
              id="pi-national"
              value={nationalId}
              onChange={(e) => setNationalId(replaceAllCompat(e.target.value, /\D+/g, '').slice(0, 10))}
              placeholder="10 digits"
              className="w-full p-3 border rounded-lg text-black border-gray-300"
              inputMode="numeric"
              pattern="\d{10}"
              maxLength={10}
            />
            <p className="text-xs text-gray-500 mt-1">Exactly 10 digits.</p>
          </div>
          <div>
            <label htmlFor="pi-cliq" className="block text-sm font-medium text-gray-700 mb-1">
              Cliq
            </label>
            <input
              id="pi-cliq"
              value={cliq}
              onChange={(e) => setCliq(replaceAllCompat(e.target.value, /[^A-Za-z0-9]/g, ''))}
              placeholder="Letters and numbers"
              className="w-full p-3 border rounded-lg text-black border-gray-300"
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center space-x-2 p-3 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
        >
          <Save size={18} />
          <span>{saving ? 'Saving...' : 'Save'}</span>
        </button>
      </div>
    </div>
  );
};

export default PersonalInfoPage;
