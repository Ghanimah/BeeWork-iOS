import React, { useState } from "react";
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
    if (!user || !user.email) return alert("You need to be signed in.");

    if (newPassword.length < 6) return alert("New password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return alert("New passwords do not match.");
    if (!currentPassword) return alert("Please enter your current password.");

    try {
      setSaving(true);
      // Re-authenticate with current password
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);

      // Update to the new password
      await updatePassword(user, newPassword);

      alert("Password updated successfully. Use your new password next time you sign in.");
      navigate("/settings");
    } catch (e: any) {
      const msg =
        e?.code === "auth/wrong-password" ? "Current password is incorrect."
        : e?.code === "auth/weak-password" ? "New password is too weak."
        : e?.code === "auth/requires-recent-login" ? "Please sign in again and retry."
        : e?.message || "Failed to update password. Please try again.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="px-4 pt-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-6">
            <button onClick={() => navigate("/settings")} className="p-2 rounded-lg hover:bg-gray-100 transition-colors mr-3">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">Change password</h1>
          </div>

          <div className="card space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-gray-500" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full p-3 border rounded-lg text-black"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full p-3 border rounded-lg text-black"
                autoComplete="new-password"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters (Firebase requirement).</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full p-3 border rounded-lg text-black"
                autoComplete="new-password"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center space-x-2 p-3 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
            >
              <Save size={18} />
              <span>{saving ? "Saving…" : "Save"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
