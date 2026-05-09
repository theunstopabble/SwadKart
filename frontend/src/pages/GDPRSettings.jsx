import React, { useState } from "react";
import axios from "axios";
import { BASEURL } from "../config";
import {
  Download,
  Trash2,
  AlertTriangle,
  FileText,
  Loader,
  Shield,
} from "lucide-react";

const GDPRSettings = () => {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setMessage("");
    try {
      const { data } = await axios.get(
        `${BASEURL}/api/v1/user/gdpr/export`,
        { withCredentials: true }
      );
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `swadkart-data-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage("Data exported successfully!");
    } catch (err) {
      setMessage(err.response?.data?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setMessage("");
    try {
      await axios.delete(`${BASEURL}/api/v1/user/gdpr/delete`, {
        withCredentials: true,
      });
      setMessage("Account deletion requested. Logging out...");
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Deletion failed");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="text-blue-400" size={32} />
          <h1 className="text-3xl font-bold">Privacy & Data</h1>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              message.includes("failed")
                ? "bg-red-900/50 text-red-200"
                : "bg-green-900/50 text-green-200"
            }`}
          >
            {message}
          </div>
        )}

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-900/30 rounded-lg">
              <FileText className="text-blue-400" size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-1">Download Your Data</h2>
              <p className="text-gray-400 text-sm mb-4">
                Export all your personal data including orders, profile, and
                preferences as a JSON file.
              </p>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition disabled:opacity-50"
              >
                {exporting ? (
                  <Loader className="animate-spin" size={18} />
                ) : (
                  <Download size={18} />
                )}
                Export My Data
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 border-red-900/30">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-900/30 rounded-lg">
              <AlertTriangle className="text-red-400" size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-1 text-red-300">
                Delete Account
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
              {confirmDelete && (
                <div className="bg-red-950/50 border border-red-800 rounded-lg p-4 mb-4 text-sm text-red-200">
                  Are you sure? This will permanently delete your account,
                  orders, and all personal data.
                </div>
              )}
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition disabled:opacity-50"
              >
                {deleting ? (
                  <Loader className="animate-spin" size={18} />
                ) : (
                  <Trash2 size={18} />
                )}
                {confirmDelete ? "Confirm Delete" : "Delete Account"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-gray-500 text-sm">
          SwadKart complies with GDPR. You have full control over your data.
        </div>
      </div>
    </div>
  );
};

export default GDPRSettings;
