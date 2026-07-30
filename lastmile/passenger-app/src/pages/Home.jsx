import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import LiveMap from '../components/LiveMap';
import RidePanel from '../components/RidePanel';
import FeedbackModal from '../components/FeedbackModal';
import io from 'socket.io-client';
import { Check, ShieldCheck, Phone, MapPin } from 'lucide-react';

const Home = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [rideStatus, setRideStatus] = useState('IDLE'); // IDLE, SEARCHING, ACCEPTED, IN_PROGRESS, PAYMENT_PENDING
  const [fareBreakdown, setFareBreakdown] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [completedRideId, setCompletedRideId] = useState(null);
  const [telemetryData, setTelemetryData] = useState(null);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const { data } = await api.get('/zones');
        if (data.success) {
          setZones(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch zones", error);
      }
    };
    fetchZones();

    const fetchDrivers = async () => {
      try {
        const { data } = await api.get('/passenger/nearby-drivers?lat=19.0760&lng=72.8777&radius=100');
        if (data.success) {
          setDrivers(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch drivers", error);
      }
    };
    fetchDrivers();

    // Active Session Rehydration on tab mount/refresh — only if authenticated
    const fetchActiveSession = async () => {
      if (!user) return; // Don't attempt if not logged in
      try {
        const { data } = await api.get('/rides/active-session');
        if (data.success && data.data) {
          const ride = data.data;
          if (ride.status === 'CANCELLED' || (ride.status === 'COMPLETED' && ride.payment_status === 'PAID')) {
            setActiveRide(null);
            setRideStatus('IDLE');
            return;
          }
          setActiveRide(ride);
          if (ride.status === 'SEARCHING') {
            setRideStatus('SEARCHING');
          } else if (ride.status === 'ACCEPTED' || ride.status === 'DRIVER_ARRIVING') {
            setRideStatus('ACCEPTED');
          } else if (ride.status === 'IN_PROGRESS') {
            setRideStatus('IN_PROGRESS');
          } else if (ride.status === 'COMPLETED' && ride.payment_status === 'PENDING') {
            setRideStatus('PAYMENT_PENDING');
            setCompletedRideId(ride.id);
            setFareBreakdown({
              rideId: ride.id,
              totalFare: ride.total_fare,
              baseFare: ride.meter_fare || (ride.total_fare - ride.convenience_fee - ride.peak_hour_surcharge),
              convenienceFee: ride.convenience_fee,
              peakSurcharge: ride.peak_hour_surcharge
            });
          } else {
            setActiveRide(null);
            setRideStatus('IDLE');
          }
        } else {
          setActiveRide(null);
          setRideStatus('IDLE');
        }
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error("Active session fetch error", error);
        }
        setActiveRide(null);
        setRideStatus('IDLE');
      }
    };
    fetchActiveSession();

    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
    setSocket(newSocket);

    if (user) {
      newSocket.emit('register', { role: 'Passenger', id: user.id });
      
      newSocket.on(`ride:driver_found_${user.id}`, (data) => {
        setRideStatus('ACCEPTED');
        setActiveRide(prev => ({ ...prev, ...data }));
      });

      newSocket.on(`ride:status_update_${user.id}`, (data) => {
        setRideStatus(data.status);
      });

      newSocket.on(`ride:completed_${user.id}`, (data) => {
        setRideStatus('PAYMENT_PENDING');
        setCompletedRideId(data.rideId);
        setFareBreakdown(data.fare_breakdown);
        setActiveRide(prev => ({ ...prev, completedRideId: data.rideId }));
      });

      newSocket.on(`ride:payment_confirmed_${user.id}`, () => {
        setPaymentConfirmed(true);
        setTimeout(() => {
          setPaymentConfirmed(false);
          setShowFeedbackModal(true);
        }, 1500);
      });

      newSocket.on('ride_cancelled', () => {
        setRideStatus('IDLE');
        setActiveRide(null);
      });

      newSocket.on(`ride_cancelled_${user.id}`, () => {
        setRideStatus('IDLE');
        setActiveRide(null);
      });

      newSocket.on(`ride:request_cancelled_${user.id}`, () => {
        setRideStatus('IDLE');
        setActiveRide(null);
      });

      newSocket.on('ride:driver_location', (data) => {
        setTelemetryData(data);
      });
    }

    return () => newSocket.close();
  }, [user]);

  const handleConfirmPayment = async () => {
    const rideId = fareBreakdown?.rideId || activeRide?.completedRideId || completedRideId || activeRide?.id;
    if (!rideId) return;
    
    setPaymentLoading(true);
    try {
      const { data } = await api.post(`/rides/${rideId}/confirm-payment`);
      if (data.success) {
        setPaymentConfirmed(true);
        setTimeout(() => {
          setPaymentConfirmed(false);
          setShowFeedbackModal(true);
        }, 1500);
      }
    } catch (e) {
      console.error("Failed to confirm payment", e);
      alert("Failed to confirm payment. Please try again.");
    }
    setPaymentLoading(false);
  };

  const handleFeedbackDone = () => {
    setShowFeedbackModal(false);
    setRideStatus('IDLE');
    setActiveRide(null);
    setFareBreakdown(null);
    setPaymentConfirmed(false);
    setCompletedRideId(null);
    setTelemetryData(null);
  };

  const handleCancelRide = async () => {
    const rideId = activeRide?.id;
    if (rideId) {
      try {
        await api.patch(`/rides/${rideId}/cancel`, { cancel_reason: 'Cancelled by passenger' });
      } catch (e) {
        try {
          await api.delete(`/rides/${rideId}/cancel`);
        } catch (err) {
          console.error("Cancel API failed", err);
        }
      }
      if (socket) {
        socket.emit('ride_cancelled', { ride_id: rideId, driverId: activeRide?.driverId });
      }
    }
    setRideStatus('IDLE');
    setActiveRide(null);
  };

  return (
    <div className="flex flex-col h-screen relative bg-gray-100">
      <div className="flex-1 w-full h-full">
        <LiveMap 
          zones={zones} 
          drivers={drivers} 
          userLocation={null}
          rideStatus={rideStatus}
          activeRide={activeRide}
          telemetryData={telemetryData}
        />
      </div>
      
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-[1000] glass rounded-2xl shadow-xl p-4 flex items-center justify-between animate-fadeInUp">
        <div>
          <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">LastMile</h1>
          <p className="text-sm font-medium text-gray-500">Hello, {user?.name || 'Student'} 👋</p>
        </div>
        <div 
          onClick={() => navigate('/profile')}
          className="w-11 h-11 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25 font-bold text-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform"
        >
          {user?.name?.charAt(0) || 'U'}
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000]">
        {rideStatus === 'IDLE' ? (
          <RidePanel 
            zones={zones} 
            onRequestRide={async (pickupZoneId, dropoffZoneId, meterEstimate, paymentMethod) => {
              try {
                const { data } = await api.post('/rides/request', { pickupZoneId, dropoffZoneId, meterEstimate, paymentMethod });
                if (data.success) {
                  setActiveRide(data.data);
                  setRideStatus('SEARCHING');
                }
              } catch (e) {
                console.error("Ride request failed", e);
                alert("Failed to request ride");
              }
            }} 
          />
        ) : rideStatus === 'PAYMENT_PENDING' ? (
          /* ─── Payment Pending Panel ─────────────────────────── */
          <div className="bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.15)] p-6 pb-8 space-y-5 border-t border-white/50 animate-slideInBottom">
            <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto mb-2" />

            {paymentConfirmed ? (
              /* ─── Payment Success ───────────────────────── */
              <div className="py-8 flex flex-col items-center animate-fadeInUp">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <ShieldCheck size={48} className="text-green-500" />
                </div>
                <h2 className="text-2xl font-black text-green-600 mb-1">Payment Confirmed!</h2>
                <p className="text-sm text-gray-500 font-medium">Thank you for riding with LastMile 🛺</p>
              </div>
            ) : (
              /* ─── Fare Breakdown + Pay via UPI Button ──── */
              <div className="space-y-5">
                <div className="text-center">
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Trip Completed! 🎉</h2>
                  <p className="text-sm text-gray-500 mt-1 font-medium">Please pay the driver via UPI</p>
                </div>

                {fareBreakdown && (
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-3xl p-5 space-y-3">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-500 font-medium">Base Fare</span>
                      <span className="text-sm font-bold text-gray-800">₹{Math.round(fareBreakdown.baseFare || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-500 font-medium">Convenience Fee</span>
                      <span className="text-sm font-bold text-gray-800">₹{fareBreakdown.convenienceFee || 5}</span>
                    </div>
                    {fareBreakdown.peakSurcharge > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-sm text-gray-500 font-medium">Peak Surcharge</span>
                        <span className="text-sm font-bold text-gray-800">₹{fareBreakdown.peakSurcharge}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                      <span className="text-base font-black text-gray-900">Total</span>
                      <span className="text-3xl font-black text-gray-900 tracking-tight">₹{Math.round(fareBreakdown.totalFare || 0)}</span>
                    </div>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                  <p className="text-xs text-amber-700 font-bold">
                    📱 Scan the driver's UPI QR code and make payment, then tap below to confirm.
                  </p>
                </div>

                <button 
                  onClick={handleConfirmPayment}
                  disabled={paymentLoading}
                  className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black text-lg rounded-[1.5rem] shadow-[0_15px_30px_rgba(34,197,94,0.3)] hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Check size={22} />
                  <span>{paymentLoading ? 'Confirming...' : 'I Have Paid via UPI ✅'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.15)] p-6 pb-8 space-y-6 border-t border-white/50 animate-slideInBottom">
            <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto mb-2" />
            <h2 className="text-2xl font-black text-gray-900 tracking-tight text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {rideStatus === 'SEARCHING' ? 'Connecting to nearby drivers...' : 
               rideStatus === 'ACCEPTED' ? 'Driver is arriving!' : 'Enjoy your ride!'}
            </h2>

            {rideStatus === 'SEARCHING' && (
              <div className="py-8 flex flex-col justify-center items-center">
                <div className="relative w-24 h-24 flex items-center justify-center">
                   <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
                   <div className="absolute inset-2 border-4 border-indigo-400 rounded-full border-b-transparent animate-spin-reverse" />
                   <span className="text-3xl animate-bounce-subtle">🛺</span>
                </div>
                <p className="text-sm text-gray-400 font-medium mt-4">Looking for the best driver near you...</p>
              </div>
            )}

            {activeRide && rideStatus === 'ACCEPTED' && (
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:scale-150 transition-transform duration-1000" />
                
                <div className="flex justify-between items-center mb-6 relative z-10">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center border border-white/10 text-white font-bold text-xl shadow-lg">
                      {activeRide.driver?.name?.charAt(0) || 'D'}
                    </div>
                    <div>
                      <p className="font-black text-xl text-white tracking-wide">{activeRide.driver?.name || 'Assigned Driver'}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-bold text-gray-400 tracking-widest uppercase">{activeRide.driver?.vehicle_number || 'MH-03-EB-1234'}</p>
                        <span className="text-xs text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded-full">★ {activeRide.driver?.rating || '5.0'}</span>
                      </div>
                    </div>
                  </div>

                  <a 
                    href={`tel:${activeRide.driver?.phone || ''}`}
                    className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 hover:bg-blue-500 hover:text-white transition-colors border border-blue-500/30"
                  >
                    <Phone size={20} />
                  </a>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-2xl flex justify-between items-center relative z-10">
                  <div>
                    <p className="text-xs text-blue-300 uppercase font-black tracking-widest mb-1">Your Dynamic OTP</p>
                    <p className="text-xs text-gray-400 font-medium">Give this to driver on arrival</p>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-5 py-2 rounded-xl border border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    <p className="text-3xl font-black tracking-[0.2em]">{activeRide.otp || activeRide.ride?.otp || '••••'}</p>
                  </div>
                </div>
              </div>
            )}

            {rideStatus === 'IN_PROGRESS' && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-[2rem] p-6 border border-green-200 flex flex-col items-center space-y-3">
                 <div className="relative w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                   <div className="w-5 h-5 bg-green-500 rounded-full animate-ping absolute opacity-50" />
                   <div className="w-5 h-5 bg-green-500 rounded-full relative" />
                 </div>
                 <p className="text-green-800 font-black text-xl">You're on the move 🛺</p>
                 <p className="text-green-600 font-medium text-sm text-center">Check the map above for live ride tracking to destination</p>
              </div>
            )}

            {rideStatus !== 'IN_PROGRESS' && (
              <button 
                onClick={handleCancelRide}
                className="w-full mt-2 bg-gray-50 text-gray-500 py-4 rounded-2xl font-bold hover:bg-red-50 hover:text-red-500 transition-all duration-300 border border-gray-100"
              >
                Cancel Ride Request
              </button>
            )}
          </div>
        )}
      </div>

      {/* Post-Ride Feedback Modal */}
      {showFeedbackModal && (
        <FeedbackModal
          rideId={completedRideId || fareBreakdown?.rideId || activeRide?.id}
          driverName={activeRide?.driver?.name}
          onClose={handleFeedbackDone}
          onSubmitted={handleFeedbackDone}
        />
      )}
    </div>
  );
};

export default Home;
