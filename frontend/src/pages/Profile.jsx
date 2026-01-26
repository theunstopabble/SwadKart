import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  User,
  Mail,
  Lock,
  Save,
  FileText,
  Wallet,
  TrendingUp,
  TrendingDown,
  Fingerprint,
  AlertTriangle, // For unsupported device warning
} from "lucide-react";
import { updateUserProfile } from "../redux/userSlice";
import { registerBiometric } from "../utils/biometricService";
import { BASE_URL } from "../config";

const Profile = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [description, setDescription] = useState("");
  const [localMsg, setLocalMsg] = useState(null);

  // 🔐 Biometric State (Industry Standard)
  const [bioEnabled, setBioEnabled] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);

  const dispatch = useDispatch();

  const { userInfo, loading, error, success } = useSelector(
    (state) => state.user,
  );

  // 🔍 Check Device Capability + Fetch Server Status
  useEffect(() => {
    const checkBiometricCapability = async () => {
      try {
        // 1. Check if device supports biometric (WebAuthn)
        if (window.PublicKeyCredential) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsBiometricSupported(available);
          console.log("🔐 Biometric Supported:", available);
        } else {
          setIsBiometricSupported(false);
        }

        // 2. Fetch biometric status from server (if logged in)
        if (userInfo?.token) {
          const config = {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          };
          const { data } = await axios.get(
            `${BASE_URL}/api/v1/users/profile/biometric-status`,
            config
          );
          setBioEnabled(data.isBiometricEnabled);
          
          // Also sync to localStorage for app lock
          if (data.isBiometricEnabled && data.hasCredentials) {
            localStorage.setItem("isBiometricEnabled", "true");
          }
        }
      } catch (err) {
        console.error("Biometric Check Error:", err);
      }
    };

    if (userInfo) {
      setName(userInfo.name);
      setEmail(userInfo.email);
      setDescription(userInfo.description || "");
      checkBiometricCapability();
    }
  }, [userInfo]);

  useEffect(() => {
    if (success) {
      setLocalMsg("Profile Updated Successfully! 🎉");
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => setLocalMsg(null), 3000);
    }
    if (error) {
      setLocalMsg(error);
    }
  }, [success, error]);

  // 👆 HANDLER: Toggle Biometric (Industry Standard)
  const handleBiometricToggle = async () => {
    if (bioLoading) return;
    setBioLoading(true);
    setLocalMsg(null);

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          "Content-Type": "application/json",
        },
      };

      if (bioEnabled) {
        // DISABLE: Update server + clear localStorage
        await axios.put(
          `${BASE_URL}/api/v1/users/profile/biometric-status`,
          { isEnabled: false },
          config
        );
        localStorage.removeItem("isBiometricEnabled");
        setBioEnabled(false);
        setLocalMsg("Fingerprint Login Disabled 🔒");
      } else {
        // ENABLE: Register biometric first, then update server
        setLocalMsg("Scanning... Please verify identity 👆");

        // 1. Register with device (WebAuthn)
        await registerBiometric();

        // 2. Update server status
        await axios.put(
          `${BASE_URL}/api/v1/users/profile/biometric-status`,
          { isEnabled: true },
          config
        );

        // 3. Set localStorage for app lock
        localStorage.setItem("isBiometricEnabled", "true");
        setBioEnabled(true);
        setLocalMsg("Fingerprint Registered Successfully! 🚀");
      }
    } catch (err) {
      console.error(err);
      setLocalMsg("Biometric Error: " + (err.response?.data?.message || err.message || "Failed"));
    } finally {
      setBioLoading(false);
      setTimeout(() => setLocalMsg(null), 4000);
    }
  };

  const submitHandler = (e) => {
    e.preventDefault();
    setLocalMsg(null);

    if (password !== confirmPassword) {
      setLocalMsg("Passwords do not match ❌");
      return;
    }

    dispatch(updateUserProfile({ name, email, password, description }));
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-10 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <User className="text-primary" size={32} />
          <h1 className="text-3xl font-bold">User Profile</h1>
        </div>

        {/* 👇 Messages Display Area */}
        {localMsg && (
          <div
            className={`p-4 rounded-lg mb-6 border ${
              localMsg.includes("Success") || localMsg.includes("Registered")
                ? "bg-green-500/20 text-green-400 border-green-500/50"
                : "bg-red-500/20 text-red-400 border-red-500/50"
            }`}
          >
            {localMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-8 order-2 lg:order-1">
            <h2 className="text-xl font-bold mb-6 border-b border-gray-800 pb-4">
              Edit Details
            </h2>
            <form onSubmit={submitHandler} className="space-y-6">
              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-3 text-gray-500"
                    size={18}
                  />
                  <input
                    type="text"
                    className="w-full bg-black border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 focus:border-primary focus:outline-none"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-3 text-gray-500"
                    size={18}
                  />
                  <input
                    type="email"
                    className="w-full bg-black border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 focus:border-primary focus:outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Description Box */}
              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">
                  About / Description
                </label>
                <div className="relative">
                  <FileText
                    className="absolute left-3 top-3 text-gray-500"
                    size={18}
                  />
                  <textarea
                    className="w-full bg-black border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 h-32 resize-none focus:border-primary focus:outline-none"
                    placeholder="Description about your shop..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">
                  New Password (Optional)
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-3 text-gray-500"
                    size={18}
                  />
                  <input
                    type="password"
                    className="w-full bg-black border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 focus:border-primary focus:outline-none"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-3 text-gray-500"
                    size={18}
                  />
                  <input
                    type="password"
                    className="w-full bg-black border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 focus:border-primary focus:outline-none"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-red-600 text-white font-bold py-3 px-8 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  "Updating..."
                ) : (
                  <>
                    <Save size={20} /> Update Profile
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT: Profile Card, Wallet & SECURITY */}
          <div className="space-y-8 order-1 lg:order-2">
            {/* Profile Card */}
            <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] p-8 flex flex-col items-center text-center relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/20 to-transparent"></div>
              <div className="relative w-28 h-28 bg-black rounded-full border-4 border-gray-800 flex items-center justify-center text-4xl font-black text-primary mb-4 shadow-xl uppercase">
                {userInfo?.image ? (
                  <img
                    src={userInfo.image}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  userInfo?.name?.charAt(0) || "U"
                )}
              </div>
              <h2 className="text-2xl font-black italic tracking-tighter text-white">
                {userInfo?.name}
              </h2>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-6">
                {userInfo?.email}
              </p>
              <span className="bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                {userInfo?.role === "restaurant_owner"
                  ? "Restaurant Partner"
                  : "Swad Club Member"}
              </span>
            </div>

            {/* 🔐 SECURITY CARD (Industry Standard) */}
            <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${isBiometricSupported ? "bg-gray-800 text-primary" : "bg-gray-800/50 text-gray-600"}`}>
                    <Fingerprint size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">App Lock</h3>
                    <p className="text-xs text-gray-500">
                      {isBiometricSupported ? "Biometric Login" : "Not Available"}
                    </p>
                  </div>
                </div>

                {/* TOGGLE SWITCH - Only show if supported */}
                {isBiometricSupported ? (
                  <button
                    onClick={handleBiometricToggle}
                    disabled={bioLoading}
                    className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                      bioLoading ? "opacity-50 cursor-wait" : ""
                    } ${bioEnabled ? "bg-primary" : "bg-gray-700"}`}
                  >
                    <div
                      className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${
                        bioEnabled ? "translate-x-6" : "translate-x-0"
                      }`}
                    ></div>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-gray-600">
                    <AlertTriangle size={14} />
                    <span className="text-[10px] font-bold uppercase">Unsupported</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-600 mt-4 px-1">
                {!isBiometricSupported
                  ? "This device doesn't support biometric authentication."
                  : bioEnabled
                    ? "App will ask for Fingerprint/FaceID when opened."
                    : "Enable this to secure the app with device biometrics."}
              </p>
            </div>

            {/* 💳 SWAD WALLET */}
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all"></div>

              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1">
                    Swad Balance
                  </p>
                  <h3 className="text-4xl font-black text-white italic tracking-tighter">
                    ₹{userInfo?.walletBalance || 0}
                  </h3>
                </div>
                <div className="p-3 bg-gray-800 rounded-2xl text-primary border border-gray-700">
                  <Wallet size={24} />
                </div>
              </div>

              {/* Transactions Mini List */}
              <div className="space-y-3 relative z-10">
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2">
                  Recent Activity
                </p>
                {userInfo?.walletTransactions &&
                userInfo.walletTransactions.length > 0 ? (
                  userInfo.walletTransactions.slice(0, 3).map((txn, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center bg-gray-800/50 p-3 rounded-xl border border-gray-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-1.5 rounded-lg ${txn.type === "Credit" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}
                        >
                          {txn.type === "Credit" ? (
                            <TrendingUp size={14} />
                          ) : (
                            <TrendingDown size={14} />
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-white uppercase">
                            {txn.description || "Transaction"}
                          </p>
                          <p className="text-[9px] text-gray-500">
                            {new Date(txn.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-black ${txn.type === "Credit" ? "text-green-400" : "text-white"}`}
                      >
                        {txn.type === "Credit" ? "+" : "-"} ₹{txn.amount}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-600 italic text-center py-4">
                    No transactions yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
