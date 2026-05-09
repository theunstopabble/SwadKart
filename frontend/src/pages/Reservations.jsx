import React, { useState, useEffect } from "react";
import axios from "axios";
import { BASEURL } from "../config";
import { toast } from "react-hot-toast";
import {
  Calendar,
  Clock,
  Users,
  Plus,
  X,
  Check,
  QrCode,
  Loader,
  Utensils,
} from "lucide-react";

const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    restaurant: "",
    date: "",
    time: "",
    guests: 2,
    specialRequests: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const fetchReservations = async () => {
    try {
      const res = await axios.get(
        `${BASEURL}/api/v1/reservations/my`,
        { withCredentials: true }
      );
      if (res.status === 401 || res.status === 403) {
        setReservations([]);
      } else {
        setReservations(Array.isArray(res.data) ? res.data : res.data?.data || []);
      }
    } catch {
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      await axios.post(
        `${BASEURL}/api/v1/reservations`,
        form,
        { withCredentials: true }
      );
      setMessage("Reservation created successfully!");
      setShowForm(false);
      setForm({ restaurant: "", date: "", time: "", guests: 2, specialRequests: "" });
      fetchReservations();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to create reservation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this reservation?")) return;
    try {
      await axios.delete(
        `${BASEURL}/api/v1/reservations/${id}`,
        { withCredentials: true }
      );
      fetchReservations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
        <Loader className="animate-spin mr-2" /> Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Calendar className="text-orange-400" size={32} />
            <h1 className="text-3xl font-bold">Table Reservations</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium transition"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? "Close" : "New Reservation"}
          </button>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              message.includes("Failed")
                ? "bg-red-900/50 text-red-200"
                : "bg-green-900/50 text-green-200"
            }`}
          >
            {message}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Restaurant ID</label>
                <input
                  type="text"
                  required
                  value={form.restaurant}
                  onChange={(e) => setForm({ ...form, restaurant: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Restaurant ID"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Guests</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={form.guests}
                  onChange={(e) =>
                    setForm({ ...form, guests: parseInt(e.target.value) })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Time</label>
                <input
                  type="time"
                  required
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">
                Special Requests
              </label>
              <textarea
                value={form.specialRequests}
                onChange={(e) =>
                  setForm({ ...form, specialRequests: e.target.value })
                }
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                rows={3}
                placeholder="Any dietary restrictions or seating preferences..."
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <Loader className="animate-spin" size={18} />
              ) : (
                <Check size={18} />
              )}
              Book Table
            </button>
          </form>
        )}

        {reservations.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 border border-gray-800 text-center">
            <Utensils className="mx-auto text-gray-600 mb-3" size={48} />
            <p className="text-gray-400 text-lg">No reservations yet</p>
            <p className="text-gray-500 text-sm mt-1">
              Book a table at your favorite restaurant
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reservations.map((r) => (
              <div
                key={r._id}
                className="bg-gray-900 rounded-xl p-5 border border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === "confirmed"
                          ? "bg-green-900 text-green-300"
                          : r.status === "cancelled"
                          ? "bg-red-900 text-red-300"
                          : "bg-yellow-900 text-yellow-300"
                      }`}
                    >
                      {r.status}
                    </span>
                    {r.qrCode && (
                      <QrCode size={16} className="text-blue-400" />
                    )}
                  </div>
                    <div className="text-sm text-gray-400 flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} /> {r.date ? new Date(r.date).toLocaleDateString() : "—"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> {r.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={14} /> {r.guests} guests
                    </span>
                  </div>
                  {r.specialRequests && (
                    <p className="text-gray-500 text-sm mt-1">
                      Note: {r.specialRequests}
                    </p>
                  )}
                </div>
                {r.status !== "cancelled" && (
                  <button
                    onClick={() => handleCancel(r._id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition flex items-center gap-2"
                  >
                    <X size={16} /> Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reservations;
