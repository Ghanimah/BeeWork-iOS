import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

const backgroundOptions = ['blue', 'green', 'pink', 'amber'] as const;
const faceOptions       = ['happy', 'cool', 'sleepy'] as const;
const hatOptions        = ['none', 'cap', 'crown'] as const;

const bgClasses: Record<(typeof backgroundOptions)[number], string> = {
  blue:  'bg-blue-200',
  green: 'bg-green-200',
  pink:  'bg-pink-200',
  amber: 'bg-amber-200',
};

interface BeeAvatarProps {
  background: (typeof backgroundOptions)[number];
  face:       (typeof faceOptions)[number];
  hat:        (typeof hatOptions)[number];
}

export const BeeAvatar: React.FC<BeeAvatarProps> = ({ background, face, hat }) => (
  <div className={`relative w-40 h-40 ${bgClasses[background]} rounded-full mx-auto mb-6`}>
    <span className="absolute inset-0 flex items-center justify-center text-6xl">🐝</span>
    {hat !== 'none' && (
      <span className="absolute top-2 right-2 text-3xl">
        {hat === 'cap' ? '🧢' : '👑'}
      </span>
    )}
    <span
      className={`absolute bottom-4 left-4 text-3xl ${
        face === 'happy' ? 'text-yellow-500' : face === 'cool' ? 'text-gray-700' : 'text-purple-500'
      }`}
    >
      {face === 'cool' ? '😎' : face === 'sleepy' ? '😴' : '😊'}
    </span>
  </div>
);

const BeeBuilder: React.FC = () => {
  const { user, updateProfile } = useApp();
  const [background, setBackground] = useState<(typeof backgroundOptions)[number]>('blue');
  const [face,       setFace]       = useState<(typeof faceOptions)[number]>('happy');
  const [hat,        setHat]        = useState<(typeof hatOptions)[number]>('none');
  const [saving,     setSaving]     = useState(false);

  const handleSave = async () => {
    const uid = auth.currentUser?.uid || user.id;
    if (!uid) {
      alert('Please sign in first to save your avatar.');
      return;
    }

    const avatarData = { background, face, hat };

    try {
      setSaving(true);
      // create/update user doc with merge
      await setDoc(doc(db, 'users', uid), { avatar: avatarData }, { merge: true });

      // update local state (cast in case User type doesn’t include avatar)
      updateProfile({ avatar: JSON.stringify(avatarData) } as any);

      alert('✅ Avatar saved!');
    } catch (e: any) {
      console.error('Avatar save error:', e);
      alert('❌ Error saving avatar. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderOptions = <T extends readonly string[]>(
    label: string,
    options: T,
    selected: T[number],
    setter: (v: T[number]) => void
  ) => (
    <div className="mb-4 text-center">
      <div className="font-medium mb-2">{label}:</div>
      <div className="inline-flex space-x-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => setter(opt)}
            className={`px-4 py-1 border rounded ${
              selected === opt ? 'bg-amber-200 border-amber-400' : 'bg-white hover:bg-gray-100'
            }`}
            type="button"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-sm mx-auto">
      <BeeAvatar background={background} face={face} hat={hat} />
      {renderOptions('Background', backgroundOptions, background, setBackground)}
      {renderOptions('Face',       faceOptions,       face,       setFace)}
      {renderOptions('Hat',        hatOptions,        hat,        setHat)}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full text-white py-2 rounded-lg mt-4 ${
          saving ? 'bg-amber-300 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600'
        }`}
        type="button"
      >
        {saving ? 'Saving…' : 'Save Avatar'}
      </button>
    </div>
  );
};

export default BeeBuilder;
