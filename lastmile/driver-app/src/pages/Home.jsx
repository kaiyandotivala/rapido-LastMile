import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import io from 'socket.io-client';
import RideMap from '../components/RideMap';
import { MapPin, Navigation, CheckCircle, User, Power, CreditCard, Copy, Check, ShieldCheck, Phone } from 'lucide-react';

const UPI_ID = 'somaiyarides@upi';

const Home = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [socket, setSocket] = useState(null);
  const [incomingRide, setIncomingRide] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  // Payment collection state
  const [paymentState, setPaymentState] = useState('NONE'); // NONE, COLLECTING, CONFIRMED
  const [fareDetails, setFareDetails] = useState(null);
  const [completedRideId, setCompletedRideId] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Active session rehydration on tab refresh — only if user is logged in
    const fetchActiveSession = async () => {
      if (!user) return; // Don't fetch if not authenticated yet
      try {
        const { data } = await api.get('/rides/active-session');
        if (data.success && data.data) {
          const ride = data.data;
          const isAssignedToThisDriver = ride.driverId === user.id;
          const isAcceptedOrInProgress = ['ACCEPTED', 'DRIVER_ARRIVING', 'IN_PROGRESS'].includes(ride.status);
          const isPaymentPending = ride.status === 'COMPLETED' && ride.payment_status === 'PENDING';

          if (isAssignedToThisDriver && isPaymentPending) {
            setIsOnline(true);
            setCompletedRideId(ride.id);
            setFareDetails({
              rideId: ride.id,
              totalFare: ride.total_fare,
              baseFare: ride.meter_fare || (ride.total_fare - ride.convenience_fee - ride.peak_hour_surcharge),
              convenienceFee: ride.convenience_fee,
              peakSurcharge: ride.peak_hour_surcharge,
              driverPayout: ride.total_fare - ride.convenience_fee - ride.peak_hour_surcharge
            });
            setPaymentState('COLLECTING');
          } else if (isAssignedToThisDriver && isAcceptedOrInProgress) {
            setIsOnline(true);
            setActiveRide(ride);
          } else {
            // Drop any unassigned, cancelled, searching, or paid completed rides
            setActiveRide(null);
            setPaymentState('NONE');
          }
        } else {
          setActiveRide(null);
        }
      } catch (err) {
        if (err.response?.status !== 401) {
          console.error("Failed active session fetch", err);
        }
        setActiveRide(null);
      }
    };
    fetchActiveSession();

    const socketUrl = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, '') : 'http://localhost:5000');
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    if (user) {
      newSocket.emit('register', { role: 'Driver', id: user.id });

      newSocket.on('ride:new_request', ({ ride }) => {
        setIncomingRide(prev => prev ? prev : ride);
      });
      
      newSocket.on('ride:request_cancelled', ({ ride_id }) => {
        setIncomingRide(null);
        setActiveRide(prev => (prev?.id === ride_id ? null : prev));
      });

      newSocket.on('ride_cancelled', ({ ride_id, reset }) => {
        setIncomingRide(null);
        if (reset || !ride_id) {
          setActiveRide(null);
          setPaymentState('NONE');
        } else {
          setActiveRide(prev => (prev?.id === ride_id ? null : prev));
        }
      });

      newSocket.on(`ride_cancelled_${user.id}`, () => {
        setIncomingRide(null);
        setActiveRide(null);
        setPaymentState('NONE');
      });

      // Listen for passenger payment confirmation
      newSocket.on(`ride:payment_confirmed_${user.id}`, () => {
        setPaymentState('CONFIRMED');
        setTimeout(() => {
          setPaymentState('NONE');
          setFareDetails(null);
          setCompletedRideId(null);
          setActiveRide(null);
        }, 3000);
      });
    }

    // Screen Wake Lock setup
    let wakeLockSentinel = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (isOnline || activeRide)) {
          wakeLockSentinel = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.warn(`Screen Wake Lock error: ${err.name}, ${err.message}`);
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockSentinel) {
        try {
          await wakeLockSentinel.release();
          wakeLockSentinel = null;
        } catch (err) {
          console.warn(`Screen Wake Lock release error: ${err.name}, ${err.message}`);
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && (isOnline || activeRide)) {
        await requestWakeLock();
      }
    };

    if (isOnline || activeRide) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // High accuracy GPS geolocation watch
    let watchId;
    if (isOnline && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, heading, speed } = pos.coords;
          const speedKmh = speed ? Math.round(speed * 3.6) : 0;
          newSocket.emit('driver:location_update', { 
            lat: latitude, 
            lng: longitude,
            heading: heading || 0,
            speedKmh
          });
        },
        (err) => {
          console.error("Geolocation error:", err);
          if (err.code === err.PERMISSION_DENIED) {
            alert("Location access denied. Please enable location permissions in browser settings to go online.");
            setIsOnline(false);
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
      newSocket.close();
    };
  }, [user, isOnline]);

  const handleToggleOnline = async () => {
    try {
      const newState = !isOnline;
      await api.patch(`/driver/status`, { is_online: newState });
      setIsOnline(newState);
      if (!newState) setIncomingRide(null);
    } catch (e) {
      console.error("Failed to toggle status", e);
    }
  };

  const handleAcceptRide = async () => {
    if (!incomingRide) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/rides/${incomingRide.id}/accept`);
      if (data.success) {
        setActiveRide(data.data);
        setIncomingRide(null);
      }
    } catch (e) {
      alert("Failed to accept. Ride may be taken or cancelled.");
      setIncomingRide(null);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/rides/${activeRide.id}/verify-otp`, { otp });
      if (data.success) {
        setActiveRide({ ...activeRide, status: 'IN_PROGRESS' });
      }
    } catch (e) {
      alert("Invalid OTP. Please check with the passenger.");
    }
    setLoading(false);
  };

  const handleCompleteRide = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/rides/${activeRide.id}/complete`);
      if (data.success) {
        setCompletedRideId(activeRide.id);
        setFareDetails(data.fare);
        setPaymentState('COLLECTING');
        setActiveRide(null);
        setOtp('');
      }
    } catch (e) {
      alert("Failed to complete ride");
    }
    setLoading(false);
  };

  const handleCancelRide = async () => {
    if (!activeRide) return;
    if (!window.confirm("Are you sure you want to cancel / drop this ride?")) return;
    setLoading(true);
    try {
      await api.patch(`/rides/${activeRide.id}/cancel`, { cancel_reason: 'Cancelled by driver' });
    } catch (e) {
      console.error("Failed to cancel ride", e);
    } finally {
      setActiveRide(null);
      setOtp('');
      setLoading(false);
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualPaymentConfirm = async () => {
    const rideId = completedRideId || activeRide?.id;
    if (!rideId) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/rides/${rideId}/verify-payment`);
      if (data.success) {
        setPaymentState('CONFIRMED');
        setTimeout(() => {
          setPaymentState('NONE');
          setFareDetails(null);
          setCompletedRideId(null);
        }, 3000);
      }
    } catch (e) {
      alert("Failed to confirm payment");
    }
    setLoading(false);
  };

  // ─── Payment Collection Screen ────────────────────────────────
  if (paymentState !== 'NONE') {
    return (
      <div className="flex flex-col h-screen relative bg-[#0B0F19] text-white font-sans overflow-hidden">
        <div className="flex-1 flex flex-col px-6 pt-10 pb-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              {paymentState === 'CONFIRMED' ? '✅ Payment Done' : '💰 Collect Payment'}
            </h1>
          </div>

          {paymentState === 'CONFIRMED' ? (
            <div className="flex-1 flex flex-col items-center justify-center animate-fadeInUp">
              <div className="w-28 h-28 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                <ShieldCheck size={56} className="text-green-400" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Payment Confirmed!</h2>
              <p className="text-gray-400 font-medium">₹{Math.round(fareDetails?.totalFare || 0)} received</p>
            </div>
          ) : (
            /* COLLECTING state - Show QR + UPI */
            <div className="flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-5">
                {/* Fare Card */}
                <div className="bg-gradient-to-br from-[#1A1F36] to-[#0F1423] rounded-3xl p-6 border border-gray-800 text-center">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">Collect from passenger</p>
                  <p className="text-5xl font-black text-white tracking-tight">₹{Math.round(fareDetails?.totalFare || 0)}</p>
                  <p className="text-xs text-gray-400 mt-2 font-medium">Driver Payout: ₹{Math.round(fareDetails?.driverPayout || 0)}</p>
                </div>

                {/* QR Code */}
                <div className="bg-[#1A1F36] rounded-3xl p-5 border border-gray-800 flex flex-col items-center">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Show QR to Passenger</p>
                  <div className="bg-white p-3 rounded-2xl shadow-lg">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${UPI_ID}&pn=LastMile&am=${fareDetails?.totalFare || 0}`} 
                      alt="UPI QR Code" 
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                </div>

                {/* UPI ID */}
                <div className="bg-[#1A1F36] rounded-3xl p-5 border border-gray-800">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-3">Or pay to UPI ID</p>
                  <div className="flex items-center justify-between bg-[#0F1423] rounded-2xl p-4 border border-gray-700">
                    <code className="text-lg font-black text-white tracking-wide">{UPI_ID}</code>
                    <button 
                      onClick={handleCopyUpi}
                      className={`p-2.5 rounded-xl transition-all duration-300 ${
                        copied ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                      }`}
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
                  <p className="text-xs text-amber-400 font-bold animate-pulse">
                    ⏳ Waiting for passenger to confirm payment...
                  </p>
                </div>

                <button
                  disabled={loading}
                  onClick={handleManualPaymentConfirm}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-2xl shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all text-base disabled:opacity-50"
                >
                  {loading ? 'Confirming...' : '✅ Mark Cash/UPI Received'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Active Ride View ──────────────────────────────────────────
  if (activeRide) {
    const isNavigating = activeRide.status === 'IN_PROGRESS';
    return (
      <div className="flex flex-col h-screen relative bg-[#0B0F19] text-white font-sans overflow-hidden">
        <div className="h-[40vh] w-full relative">
          <RideMap activeRide={activeRide} isInProgress={isNavigating} />
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0B0F19] to-transparent pointer-events-none z-10" />
        </div>

        <div className="relative z-10 flex flex-col flex-1 px-6 pb-6 -mt-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              {isNavigating ? '🛺 In Transit' : '📍 Pickup Passenger'}
            </h1>
            <div className={`p-2.5 rounded-xl ${isNavigating ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'} animate-pulse`}>
              {isNavigating ? <Navigation size={20} /> : <CheckCircle size={20} />}
            </div>
          </div>

          <div className="bg-[#1A1F36] rounded-3xl p-5 border border-gray-800 shadow-2xl flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#0F1423] p-4 rounded-2xl border border-gray-800">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg">
                    <User className="text-white w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-0.5">Passenger</p>
                    <p className="text-lg font-bold">{activeRide.passenger?.name || 'Guest'}</p>
                  </div>
                </div>

                <a 
                  href={`tel:${activeRide.passenger?.phone || ''}`}
                  className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
                >
                  <Phone size={18} />
                </a>
              </div>

              {/* CLEAR DISPLAY OF PASSENGER PICKUP & DROP LOCATIONS */}
              <div className="relative bg-[#0F1423] p-4 rounded-2xl border border-gray-800 space-y-4">
                <div className="absolute left-[27px] top-9 bottom-9 w-0.5 bg-gradient-to-b from-blue-500 to-green-500 rounded-full" />
                
                {/* Pickup Details */}
                <div className="flex items-center space-x-3 relative z-10">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center ring-2 ring-[#1A1F36]">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Pickup Location</p>
                    <p className="font-bold text-base text-white">{activeRide.pickup_zone?.name || 'Zone A'}</p>
                  </div>
                </div>

                {/* Dropoff Details */}
                <div className="flex items-center space-x-3 relative z-10">
                  <div className="w-6 h-6 flex items-center justify-center ring-2 ring-[#1A1F36] bg-[#1A1F36]">
                    <MapPin size={16} className="text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Drop-off Location</p>
                    <p className="font-bold text-base text-white">{activeRide.dropoff_zone?.name || 'Zone B'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {!isNavigating ? (
                <div className="bg-[#0F1423] p-4 rounded-2xl border border-blue-500/20">
                  <p className="text-xs font-medium text-center text-blue-400 mb-3">Ask passenger for 4-digit OTP</p>
                  <input 
                    type="text" maxLength={4} value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • •"
                    className="w-full bg-[#1A1F36] text-white text-center text-3xl tracking-[0.5em] font-black py-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-800 transition-all placeholder-gray-700"
                  />
                  <button 
                    disabled={loading || otp.length < 4} onClick={handleVerifyOtp}
                    className="w-full mt-3 bg-gradient-to-r from-blue-600 to-blue-500 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all text-sm"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP & Start Ride'}
                  </button>
                  <button
                    disabled={loading}
                    onClick={handleCancelRide}
                    className="w-full mt-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 font-bold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center space-x-1"
                  >
                    <span>🚨 Cancel Ride / Reset</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                   <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-2xl flex items-center justify-center space-x-2">
                     <span className="relative flex h-2.5 w-2.5">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                     </span>
                     <span className="text-green-400 font-bold uppercase tracking-widest text-xs">Ride in Progress</span>
                   </div>
                   <button 
                    disabled={loading} onClick={handleCompleteRide}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black py-4 rounded-2xl shadow-[0_10px_30px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 active:scale-[0.98] transition-all text-lg disabled:opacity-50"
                  >
                    {loading ? "Processing..." : "✅ Complete Ride"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Default Home View ─────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen relative bg-[#0B0F19] text-white">
      <div className="flex justify-between items-center pt-8 pb-4 px-6 z-10 sticky top-0 glass-dark">
        <div className="flex items-center space-x-4">
          <div 
            onClick={() => navigate('/profile')}
            className="w-12 h-12 bg-gradient-to-tr from-[#FF6B00] to-[#FFA03A] rounded-2xl shadow-[0_0_20px_rgba(255,107,0,0.4)] flex items-center justify-center font-black text-white text-xl border-2 border-[#1A1F36] cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          >
             {user?.name?.charAt(0) || 'D'}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-100">{user?.name || 'Driver'}</h1>
            <div className="flex items-center space-x-1">
              <span className="text-xs font-black text-[#FF6B00] uppercase tracking-wider">Rating</span>
              <span className="text-xs font-bold text-white">★ {user?.rating || '5.0'}</span>
            </div>
          </div>
        </div>
        <button className="w-10 h-10 bg-[#1A1F36] rounded-2xl flex items-center justify-center border border-gray-800 text-gray-400 hover:text-white transition-colors">
          <CreditCard size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center relative z-0">
        <div className={`absolute inset-0 transition-opacity duration-1000 ${isOnline ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-[#0B0F19] z-10 bg-opacity-70" />
          <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at center, #3b82f6 2px, transparent 2px)', backgroundSize: '40px 40px', opacity: 0.1 }} />
        </div>

        <div className="relative z-20 flex flex-col items-center">
          <div className="relative flex justify-center items-center">
            {isOnline && (
              <>
                <div className="absolute w-64 h-64 rounded-full bg-green-500 opacity-20 animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute w-80 h-80 rounded-full border border-green-500 opacity-10 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                <div className="absolute w-96 h-96 rounded-full border border-green-500 opacity-5 animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
              </>
            )}
            
            <button 
              onClick={handleToggleOnline}
              className={`relative z-10 w-44 h-44 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-500 outline-none active:scale-95
                ${isOnline 
                  ? 'bg-gradient-to-t from-green-500 to-emerald-400 shadow-[0_0_60px_rgba(34,197,94,0.5)] scale-105' 
                  : 'bg-[#1A1F36] border-4 border-gray-800 shadow-[inset_0_4px_15px_rgba(0,0,0,0.4)]'
              }`}
            >
              <Power size={44} className={`mb-2 transition-colors duration-500 ${isOnline ? 'text-white' : 'text-gray-600'}`} />
              <span className={`text-sm tracking-[0.2em] font-black uppercase ${isOnline ? 'text-green-50' : 'text-gray-500'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </button>
          </div>
          
          <p className="mt-10 text-gray-500 font-medium tracking-wide text-sm">
            {isOnline ? '🔍 Finding nearby rides...' : 'Tap to start accepting rides'}
          </p>
        </div>
      </div>

      {/* Incoming Ride Modal */}
      {isOnline && incomingRide && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIncomingRide(null)} />
          <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-slideInBottom">
            <div className="bg-[#1A1F36] rounded-[2rem] p-6 shadow-2xl border border-blue-500/30 relative overflow-hidden max-w-md mx-auto">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />

              <div className="flex justify-between items-start mb-5 relative z-10">
                <div>
                  <span className="inline-flex items-center space-x-1.5 bg-blue-500/20 px-3 py-1 rounded-full mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-blue-300 text-xs font-bold uppercase tracking-wider">New Ride Request</span>
                  </span>
                  <div className="text-3xl font-black text-white tracking-tight">₹{Math.round(incomingRide.total_fare || 35)}</div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Est. Time</p>
                  <p className="text-white font-bold">5 mins</p>
                </div>
              </div>

              {/* VERY CLEAR DISPLAY OF PICKUP & DROP LOCATIONS ON INCOMING REQUEST */}
              <div className="space-y-4 mb-6 bg-[#0B0F19] rounded-2xl p-4 border border-gray-800 relative z-10">
                <div className="flex items-start space-x-3">
                  <div className="mt-1 w-3 h-3 rounded-full bg-blue-400 ring-4 ring-blue-400/20 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Passenger Pickup</p>
                    <p className="font-bold text-gray-100 text-base">{incomingRide.pickup_zone?.name || 'Pickup Zone'}</p>
                  </div>
                </div>
                
                <div className="pl-1.5 border-l-2 border-dashed border-gray-700 ml-1.5 h-3 -my-2" />
                
                <div className="flex items-start space-x-3">
                  <div className="mt-1 w-3 h-3 rounded-none bg-green-500 ring-4 ring-green-500/20 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Passenger Drop-off</p>
                    <p className="font-bold text-gray-100 text-base">{incomingRide.dropoff_zone?.name || 'Drop-off Zone'}</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 relative z-10">
                <button 
                  disabled={loading}
                  className="flex-1 py-3.5 rounded-xl font-bold bg-[#0F1423] text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all border border-gray-800 text-sm"
                  onClick={() => setIncomingRide(null)}
                >
                  Decline
                </button>
                <button 
                  disabled={loading}
                  className="flex-[2] py-3.5 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_0_25px_rgba(37,99,235,0.4)] hover:shadow-[0_0_35px_rgba(37,99,235,0.5)] active:scale-[0.98] transition-all outline-none text-sm"
                  onClick={handleAcceptRide}
                >
                  {loading ? 'Routing...' : '✅ Accept Ride'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
