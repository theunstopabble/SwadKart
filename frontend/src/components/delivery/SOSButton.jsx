import React, { useState } from "react";
import { Siren, X, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { BASE_URL } from "../../config";
import { useSelector } from "react-redux";

const SOSButton = () => {
  const { userInfo } = useSelector((state) => state.user);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSOS = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      toast.error("GPS not supported");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const res = await fetch(`${BASE_URL}/api/v1/orders/sos`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${userInfo.token}`,
            },
            body: JSON.stringify({
              lat: latitude,
              lng: longitude,
              address: "Live GPS Location",
            }),
          });

          if (res.ok) {
            toast.success("🚨 SOS SENT! Admin notified.", { duration: 5000 });
            setShowModal(false);
          } else {
            toast.error("SOS Signal Failed");
          }
        } catch (error) {
          toast.error("Network Error");
        } finally {
          setLoading(false);
        }
      },
      () => {
        toast.error("GPS Permission Denied");
        setLoading(false);
      }
    );
  };

  return (
    <>
      {/* 🔴 Floating Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-6 z-[999] bg-red-600 text-white p-4 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.6)] animate-pulse hover:scale-110 transition-transform active:scale-95 border-4 border-red-900"
      >
        <Siren size={28} />
      </button>

      {/* ⚠️ Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-red-900/90 backdrop-blur-sm flex justify-center items-center z-[1000] p-6 animate-in zoom-in duration-200">
          <div className="bg-black border-2 border-red-500 p-8 rounded-[2rem] text-center w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X size={24} />
            </button>

            <AlertTriangle
              size={60}
              className="mx-auto text-red-500 mb-6 animate-bounce"
            />
            <h2 className="text-3xl font-black text-white uppercase italic mb-2">
              Emergency?
            </h2>
            <p className="text-gray-400 text-sm mb-8">
              This will alert the Admin & Support team with your live location.
              Use only in case of danger or accident.
            </p>

            <button
              onClick={handleSOS}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase py-4 rounded-xl text-lg tracking-widest shadow-lg shadow-red-600/30 flex justify-center items-center gap-3"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>SEND SOS ALERT</>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SOSButton;
