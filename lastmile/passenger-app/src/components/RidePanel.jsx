import React, { useState } from 'react';
import { MapPin, Navigation2, Zap } from 'lucide-react';

const RidePanel = ({ zones, onRequestRide }) => {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [loading, setLoading] = useState(false);

  const estimate = React.useMemo(() => {
    if (!pickup || !dropoff) return null;
    if (pickup === dropoff) return 0;

    const pZone = zones.find(z => z.id === pickup);
    const dZone = zones.find(z => z.id === dropoff);
    
    if (pZone && dZone) {
      const pName = pZone.name.toLowerCase();
      const dName = dZone.name.toLowerCase();
      
      // Somaiya Gate to Sion Station (and vice-versa)
      if (
        (pName.includes('somaiya') && dName.includes('sion')) ||
        (pName.includes('sion') && dName.includes('somaiya'))
      ) {
        return Math.floor(Math.random() * 4) + 32; // Random between 32 and 35
      }
      
      // Somaiya to Vidyavihar
      if (
        (pName.includes('somaiya') && dName.includes('vidyavihar')) ||
        (pName.includes('vidyavihar') && dName.includes('somaiya'))
      ) {
        return Math.random() > 0.5 ? 15 : 18;
      }
    }

    const base = 25; 
    return base + Math.floor(Math.random() * 20); 
  }, [pickup, dropoff, zones]);

  const handleRequest = async () => {
    if (!pickup || !dropoff) return;
    setLoading(true);
    await onRequestRide(pickup, dropoff, estimate, 'UPI');
    setLoading(false);
  };

  const isReady = pickup && dropoff && pickup !== dropoff;

  return (
    <div className="bg-white/85 backdrop-blur-2xl rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.12)] p-6 pb-8 space-y-5 max-h-[70vh] overflow-y-auto w-full border-t border-white/60 transition-all duration-500">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto" />
      
      <div className="flex items-center space-x-2">
        <div className="p-2 bg-blue-50 rounded-xl">
          <Zap className="text-blue-600" size={20} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Where to?</h2>
      </div>
      
      {/* Location Selector */}
      <div className="space-y-4 relative bg-gradient-to-b from-gray-50 to-white p-4 rounded-3xl border border-gray-100 shadow-inner">
        <div className="absolute left-[31px] top-10 bottom-10 w-0.5 bg-gradient-to-b from-blue-500 to-indigo-600 z-0 rounded-full" />
        
        <div className="relative z-10 flex items-center space-x-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center ring-4 ring-white shadow-sm">
             <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />
          </div>
          <div className="flex-1 bg-white border border-gray-200 shadow-sm rounded-2xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all duration-300">
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Pickup Point</p>
            <select 
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              className="w-full bg-transparent outline-none font-bold text-gray-800 cursor-pointer appearance-none"
            >
              <option value="" disabled className="text-gray-400 font-medium">Select Starting Location</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
        </div>

        <div className="relative z-10 flex items-center space-x-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center ring-4 ring-white shadow-sm">
             <MapPin size={14} className="text-white" />
          </div>
          <div className="flex-1 bg-white border border-gray-200 shadow-sm rounded-2xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-gray-900 transition-all duration-300">
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Destination</p>
            <select 
              value={dropoff}
              onChange={(e) => setDropoff(e.target.value)}
              className="w-full bg-transparent outline-none font-bold text-gray-800 cursor-pointer appearance-none"
            >
              <option value="" disabled className="text-gray-400 font-medium">Select Drop-off Location</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Fare Estimate */}
      {isReady && (
        <div className="animate-fadeInUp">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-5 flex justify-between items-center shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <div className="flex items-center space-x-4">
               <div className="bg-white p-3 rounded-2xl shadow-sm">
                 <span className="text-blue-600 font-black text-xl tracking-tight">Auto</span>
               </div>
               <div>
                  <p className="text-sm font-black text-gray-800">Quick Ride</p>
                  <p className="text-xs font-bold text-blue-600/80">~5 mins away</p>
               </div>
            </div>
            <div className="text-right">
              <span className="text-gray-400 text-xs font-bold line-through mr-2">₹{estimate + 15}</span>
              <span className="text-3xl font-black text-gray-900 tracking-tighter">₹{estimate}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2 font-medium">💳 Pay after your ride via UPI</p>
        </div>
      )}

      {pickup && dropoff && pickup === dropoff && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center text-sm font-bold animate-pulse">
          Starting point and destination cannot be the same.
        </div>
      )}

      <button 
        onClick={handleRequest}
        disabled={!isReady || loading}
        className={`w-full py-5 rounded-[1.5rem] font-black text-lg shadow-2xl transition-all duration-300 flex items-center justify-center space-x-2 ${
          isReady && !loading
            ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-[0_15px_30px_rgba(37,99,235,0.3)] hover:-translate-y-1 active:scale-95' 
            : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
        }`}
      >
        <span>{loading ? 'Finding Match...' : isReady ? 'Confirm Booking' : 'Select Locations'}</span>
        {!loading && isReady && <Navigation2 className="ml-1" size={20} />}
      </button>
    </div>
  );
};

export default RidePanel;
