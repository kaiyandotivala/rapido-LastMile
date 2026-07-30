import React, { useState } from 'react';
import { Star, Send, X, ShieldCheck } from 'lucide-react';
import api from '../services/api';

const FeedbackModal = ({ rideId, driverName, onClose, onSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rideId) return;

    setSubmitting(true);
    try {
      await api.post(`/rides/${rideId}/rate`, {
        stars: rating,
        comment: comment.trim() || undefined
      });
      setSubmitted(true);
      setTimeout(() => {
        if (onSubmitted) onSubmitted();
        if (onClose) onClose();
      }, 1800);
    } catch (err) {
      console.error("Failed to submit rating", err);
      alert("Failed to submit feedback. Thank you anyway!");
      if (onClose) onClose();
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[2000] flex items-end sm:items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl border border-white/40 animate-slideInBottom">
        
        {submitted ? (
          <div className="py-8 flex flex-col items-center text-center animate-fadeInUp">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-500">
              <ShieldCheck size={44} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-1">Thank You! 🎉</h3>
            <p className="text-sm text-gray-500 font-medium">Your feedback helps improve our campus ride service.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                  Ride Completed
                </span>
                <h3 className="text-2xl font-black text-gray-900 mt-2 tracking-tight">Rate Your Driver</h3>
              </div>
              <button 
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 p-4 rounded-2xl border border-blue-100 flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md">
                {driverName?.charAt(0) || 'D'}
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Driver</p>
                <p className="font-black text-gray-800 text-base">{driverName || 'Somaiya Driver'}</p>
              </div>
            </div>

            {/* Star Rating */}
            <div className="flex flex-col items-center space-y-2 py-2">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tap to Rate</p>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-2 transition-transform hover:scale-125 active:scale-95 focus:outline-none"
                  >
                    <Star
                      size={36}
                      className={star <= rating ? "fill-yellow-400 text-yellow-400 shadow-yellow-200 drop-shadow-md" : "text-gray-300"}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Feedback / Comments (Optional)
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How was the driver's service? E.g., polite, smooth ride, punctual..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder-gray-400 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Send size={18} />
                <span>{submitting ? 'Submitting...' : 'Submit Feedback'}</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
