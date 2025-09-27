import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const PersonalInfoPage: React.FC = () => {
  const navigate = useNavigate();
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
        setCliq(d.cliq || '');
        setPhone(d.phone || '');
      }
    };
    load();
  }, []);

  const save = async () => {
    const u = auth.currentUser;
    if (!u) return;

    // simple validations
    const cliqOk = cliq === '' || /^[a-zA-Z0-9]+$/.test(cliq);
    const phoneOk = phone === '' || /^[0-9]+$/.test(phone);
    if (!cliqOk) return alert('Cliq alias should contain letters and numbers only.');
    if (!phoneOk) return alert('Phone should contain digits only.');

    try {
      setSaving(true);
      await setDoc(
        doc(db, 'users', u.uid),
        { cliq: cliq.trim(), phone: phone.trim() },
        { merge: true }
      );
      alert('Saved!');
      navigate('/settings');
    } catch (e) {
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
            {/* Cliq alias */}
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
