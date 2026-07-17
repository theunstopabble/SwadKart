import React, { useState, useEffect } from "react";
import { Star, X, CheckCircle, ChevronRight } from "lucide-react";
import { BASEURL } from "../config";
import { toast } from "react-hot-toast";

const ReviewModal = ({ isOpen, onClose, orderItems }) => {

  // --- States ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0); // 👈 Real-time hover state
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Current product from the queue
  const currentItem =
    orderItems && orderItems.length > 0 ? orderItems[currentIndex] : null;

  // Reset states when modal is opened
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsFinished(false);
      setRating(0);
      setHover(0);
      setComment("");
    }
  }, [isOpen]);

  // ==========================================
  // SUBMIT LOGIC
  // ==========================================
  const handleSubmitReview = async () => {
    if (!rating || !comment)
      return toast.error("Please provide both rating and feedback");

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${BASEURL}/api/v1/products/${currentItem.product}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ rating, comment }),
        },
      );

      if (res.ok) {
        await res.json().catch(() => ({}));
        toast.success(`${currentItem?.name || "Item"} rated!`);
        moveToNext();
      } else {
        const err = await res.json().catch(() => ({}));
        const errorMsg = err?.message?.toLowerCase?.() || "";
        if (errorMsg.includes("already")) {
          toast.error("You already reviewed this item");
          moveToNext();
        } else {
          toast.error(err?.message || "Failed to submit");
        }
      }
    } catch {
      toast.error("Network error while submitting review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveToNext = () => {
    if (currentIndex < orderItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setRating(0);
      setHover(0);
      setComment("");
    } else {
      setIsFinished(true);
    }
  };

  if (!isOpen) return null;
  if (!orderItems || orderItems.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[9999] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
        {!isFinished ? (
          <div className="animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">
                  Item {currentIndex + 1} of {orderItems?.length}
                </p>
                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">
                  How was the <span className="text-primary">Taste?</span>
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-600 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Current Item Info */}
            <div className="flex items-center gap-4 mb-8 p-4 bg-black/40 rounded-3xl border border-gray-800">
              <img
                src={currentItem?.image}
                alt={currentItem?.name}
                className="w-16 h-16 rounded-2xl object-cover border border-gray-700 shadow-lg"
                onError={(e) => {
                  e.target.src = "https://placehold.co/100";
                }}
              />
              <h3 className="font-bold text-white text-lg leading-tight uppercase truncate">
                {currentItem?.name}
              </h3>
            </div>

            {/* ⭐ REAL-TIME STAR RATING WITH HOVER */}
            <div className="flex justify-center gap-3 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  className="hover:scale-125 active:scale-90 transition-all duration-150"
                >
                  <Star
                    size={42}
                    fill={(hover || rating) >= star ? "#ff6b6b" : "none"}
                    className={
                      (hover || rating) >= star
                        ? "text-primary drop-shadow-[0_0_8px_rgba(255,107,107,0.5)]"
                        : "text-gray-700"
                    }
                    strokeWidth={(hover || rating) >= star ? 0 : 2}
                  />
                </button>
              ))}
            </div>

            {/* Feedback Input */}
            <textarea
              className="w-full bg-black border border-gray-800 rounded-3xl p-5 text-white text-sm focus:border-primary outline-none transition-all h-32 resize-none placeholder:text-gray-700"
              placeholder={`Write a quick note about ${currentItem?.name}...`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            ></textarea>

            {/* Submit / Next Button */}
            <button
              disabled={isSubmitting || !rating || !comment}
              onClick={handleSubmitReview}
              className="w-full bg-primary hover:bg-red-600 disabled:opacity-20 text-white font-black py-5 rounded-[1.5rem] mt-8 transition-all shadow-xl shadow-primary/20 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {currentIndex === orderItems?.length - 1
                    ? "Finish & Close"
                    : "Next Dish"}
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        ) : (
          /* --- Final Success Screen --- */
          <div className="text-center py-10 animate-in slide-in-from-top-10 duration-500">
            <div className="bg-green-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(34,197,94,0.2)]">
              <CheckCircle size={50} className="text-green-500" />
            </div>
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">
              Awesome!
            </h2>
            <p className="text-gray-500 font-bold text-sm uppercase tracking-widest px-6 leading-relaxed">
              Your feedback helps SwadKart improve every single day.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-white text-black font-black py-5 rounded-3xl mt-10 transition-all hover:bg-gray-200 uppercase tracking-widest text-xs shadow-lg shadow-white/10"
            >
              Back to Orders
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewModal;
