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
  AlertTriangle,
  Coins,
  Gift,
  Copy,
  Users,
} from "lucide-react";
import { setCredentials, updateUserProfile } from "../redux/userSlice";
import { registerBiometric } from "../utils/biometricService";
import { BASEURL } from "../config";

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

  useEffect(() => {
    const fetchFreshProfile = async () => {
      try {
        const res = await fetch(`${BASEURL}/api/v1/users/profile`, {
          credentials: "include",
        });
        if (res.ok) {
          const freshData = await res.json();
          dispatch(setCredentials({ ...userInfo, ...freshData }));
        }
      } catch (err) {
        console.error("Error fetching fresh profile:", err);
      }
    };
    if (userInfo) fetchFreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔍 Check Device Capability + Fetch Server Status
  useEffect(() => {
    const checkBiometricCapability = async () => {
      try {
        // 1. Check if device supports biometric (WebAuthn)
        if (window.PublicKeyCredential) {
          const available =
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsBiometricSupported(available);
          console.log("🔐 Biometric Supported:", available);
        } else {
          setIsBiometricSupported(false);
        }

        // 2. Fetch biometric status from server (if logged in)
        if (userInfo) {
          const { data } = await axios.get(
            `${BASEURL}/api/v1/users/profile/biometric-status`,
            { withCredentials: true },
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
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (bioEnabled) {
        // DISABLE: Update server + clear localStorage
        await axios.put(
          `${BASEURL}/api/v1/users/profile/biometric-status`,
          { isEnabled: false },
          config,
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
          `${BASEURL}/api/v1/users/profile/biometric-status`,
          { isEnabled: true },
          config,
        );

        // 3. Set localStorage for app lock
        localStorage.setItem("isBiometricEnabled", "true");
        setBioEnabled(true);
        setLocalMsg("Fingerprint Registered Successfully! 🚀");
      }
    } catch (err) {
      console.error(err);
      setLocalMsg(
        "Biometric Error: " +
          (err.response?.data?.message || err.message || "Failed"),
      );
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
    if (password && password.length < 6) {
      setLocalMsg("Password must be at least 6 characters 🔐");
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
                  {/* NEW-06 FIX: Email is read-only — backend blocks email changes */}
                  <input
                    type="email"
                    className="w-full bg-black border border-gray-700 text-gray-500 cursor-not-allowed rounded-lg pl-10 pr-4 py-3 focus:border-gray-600 focus:outline-none"
                    value={email}
                    readOnly
                    title="Email cannot be changed. Contact support."
                  />
                  <p className="text-xs text-gray-600 mt-1 pl-1">
                    ⚠️ Email cannot be changed directly.
                  </p>
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
                  <div
                    className={`p-3 rounded-xl ${isBiometricSupported ? "bg-gray-800 text-primary" : "bg-gray-800/50 text-gray-600"}`}
                  >
                    <Fingerprint size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">App Lock</h3>
                    <p className="text-xs text-gray-500">
                      {isBiometricSupported
                        ? "Biometric Login"
                        : "Not Available"}
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
                    <span className="text-[10px] font-bold uppercase">
                      Unsupported
                    </span>
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

            {/* 🪙 SWADCOINS LOYALTY */}
            <div className="bg-gradient-to-br from-amber-900 to-gray-900 border border-amber-700/30 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group mt-6">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl group-hover:bg-amber-500/30 transition-all"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-1">
                    SwadCoins
                  </p>
                  <h3 className="text-4xl font-black text-white italic tracking-tighter">
                    {userInfo?.swadCoins || 0}
                  </h3>
                  <p className="text-[9px] text-amber-400 mt-1">
                    100 coins = ₹10 off your next order
                  </p>
                </div>
                <div className="p-3 bg-gray-800 rounded-2xl text-amber-500 border border-amber-700/30">
                  <Coins size={24} />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="bg-gray-800/50 rounded-xl p-3 flex-1 text-center">
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Earn Rate</p>
                  <p className="text-sm font-black text-white">₹10 = 1 coin</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3 flex-1 text-center">
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">First Order</p>
                  <p className="text-sm font-black text-amber-400">+500 coins</p>
                </div>
              </div>
            </div>

            {/* 🔗 REFERRAL PROGRAM */}
            <div className="bg-gradient-to-br from-blue-900 to-gray-900 border border-blue-700/30 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group mt-6">
              <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all"></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                  <Gift size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Refer & Earn</h3>
                  <p className="text-[9px] text-gray-400">Share your code. Both get rewards.</p>
                </div>
              </div>
              <div className="bg-gray-800/80 rounded-2xl p-4 border border-blue-700/20 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Your Code</p>
                  <p className="text-xl font-black text-white font-mono tracking-wider">
                    {userInfo?.referralCode || "—"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (userInfo?.referralCode) {
                      navigator.clipboard.writeText(userInfo.referralCode);
                    }
                  }}
                  className="p-2 bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors text-white"
                  title="Copy code"
                >
                  <Copy size={18} />
                </button>
              </div>
              <div className="flex gap-3 mt-4 relative z-10">
                <div className="flex-1 bg-gray-800/50 rounded-xl p-3 text-center">
                  <Users size={16} className="mx-auto text-blue-400 mb-1" />
                  <p className="text-lg font-black text-white">{userInfo?.referralStats?.totalReferrals || 0}</p>
                  <p className="text-[8px] text-gray-500 uppercase tracking-widest">Invited</p>
                </div>
                <div className="flex-1 bg-gray-800/50 rounded-xl p-3 text-center">
                  <Coins size={16} className="mx-auto text-amber-400 mb-1" />
                  <p className="text-lg font-black text-white">{userInfo?.referralStats?.totalEarnings || 0}</p>
                  <p className="text-[8px] text-gray-500 uppercase tracking-widest">Earned</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
