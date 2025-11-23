import { useState } from "react";
import { ArrowLeft, Save, Lock } from "lucide-react";
import { auth } from "../firebase";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user?.email) return alert("You need to be signed in.");

    if (newPassword.length < 6) return alert("New password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return alert("New passwords do not match.");
    if (!currentPassword) return alert("Please enter your current password.");

    try {
      setSaving(true);
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);

      await updatePassword(user, newPassword);

      alert("Password updated successfully. Use your new password next time you sign in.");
      navigate("/settings");
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string } | undefined;
      let msg = "Failed to update password. Please try again.";
      if (err?.code === "auth/wrong-password") {
        msg = "Current password is incorrect.";
      } else if (err?.code === "auth/weak-password") {
        msg = "New password is too weak.";
      } else if (err?.code === "auth/requires-recent-login") {
        msg = "Please sign in again and retry.";
      } else if (err?.message) {
        msg = err.message;
      }
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell space-y-5">
      <div className="flex items-center">
        <button
          onClick={() => navigate("/settings")}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors mr-3"
          aria-label="Back"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Change password</h1>
      </div>

      <div className="card space-y-4">
        <div>
          <label htmlFor="cp-current" className="block text-sm font-medium text-gray-700 mb-1">
            Current password
          </label>
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-gray-500" />
            <input
              type="password"
              id="cp-current"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full p-3 border rounded-lg text-black border-gray-300"
              autoComplete="current-password"
            />
          </div>
        </div>

        <div>
          <label htmlFor="cp-new" className="block text-sm font-medium text-gray-700 mb-1">
            New password
          </label>
          <input
            type="password"
            id="cp-new"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            className="w-full p-3 border rounded-lg text-black border-gray-300"
            autoComplete="new-password"
          />
          <p className="text-xs text-gray-500 mt-1">Minimum 6 characters (Firebase requirement).</p>
        </div>

        <div>
          <label htmlFor="cp-confirm" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm new password
          </label>
          <input
            type="password"
            id="cp-confirm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className="w-full p-3 border rounded-lg text-black border-gray-300"
            autoComplete="new-password"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center space-x-2 p-3 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
        >
          <Save size={18} />
          <span>{saving ? "Saving..." : "Save"}</span>
        </button>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
