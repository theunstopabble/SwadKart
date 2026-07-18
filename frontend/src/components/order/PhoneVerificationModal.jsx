import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { setCredentials } from "../../redux/userSlice";
import { Phone, ArrowRight, X, CheckCircle } from "lucide-react";
import { BASEURL } from "../../config";

const PhoneVerificationModal = ({ onClose, onVerified, initialPhone = "" }) => {
 const [phone, setPhone] = useState(initialPhone);
 const [loading, setLoading] = useState(false);
 const dispatch = useDispatch();

 const handleSave = async () => {
 const phoneRegex = /^[6-9]\d{9}$/;
 if (!phoneRegex.test(phone)) {
 return toast.error("Enter a valid 10-digit Indian phone number");
 }
 setLoading(true);
 try {
 const res = await fetch(`${BASEURL}/api/v1/users/verify-phone`, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 credentials: "include",
 body: JSON.stringify({ phone }),
 });
 if (res.ok) {
 const data = await res.json();
 dispatch(setCredentials(data.user));
 toast.success("Phone saved successfully!");
 onVerified(data.user);
 } else {
 const err = await res.json();
 toast.error(err.message || "Failed to save phone");
 }
 } catch (err) {
 console.error("Phone save error:", err);
 toast.error("Network error. Please try again.");
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-6">
 <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl relative">
 <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white">
 <X size={20} />
 </button>

 <h2 className="text-2xl font-black uppercase text-white mb-2">
 {initialPhone ? "Update Your" : "Add Your"} <span className="text-primary">Phone</span>
 </h2>
 <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-8">
 {initialPhone ? "Change your number below" : "Required for delivery coordination"}
 </p>

 <div className="space-y-4">
 <div className="relative group">
 <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
 <input
 type="tel"
 placeholder="98765 43210"
 maxLength={10}
 className="w-full bg-black border border-gray-800 p-4 pl-12 rounded-xl text-white outline-none focus:border-primary font-bold tracking-widest transition-all"
 value={phone}
 onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
 />
 </div>
 <button
 onClick={handleSave}
 disabled={loading}
 className="w-full bg-primary hover:bg-red-600 text-white py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-primary/20 transition-all active:scale-95 flex justify-center items-center gap-2"
 >
 {loading ? "Saving..." : <>Save & Continue <CheckCircle size={16} /></>}
 </button>
 <p className="text-gray-600 text-[10px] text-center font-medium">
 Your phone is only shared with the delivery partner for order coordination.
 </p>
 </div>
 </div>
 </div>
 );
};

export default PhoneVerificationModal;
