import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ChevronLeft, LogOut, Wallet, TrendingUp, Calendar, Shield, CheckCircle } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalEarnings: 0, rides: [], count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const { data } = await api.get('/driver/earnings');
        setStats({ totalEarnings: data.data.totalEarnings, rides: data.data.rides, count: data.count });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEarnings();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen bg-[#0B0F19] text-white font-sans overflow-hidden">
      <div className="glass-dark px-6 py-5 sticky top-0 z-20 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2.5 -ml-2 text-gray-400 hover:text-white rounded-2xl transition-all active:scale-90">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black bg-gradient-to-r from-[#FF6B00] to-[#FFA03A] bg-clip-text text-transparent">Driver Profile</h1>
        <button onClick={handleLogout} className="p-2.5 -mr-2 text-red-400 hover:text-red-300 rounded-2xl transition-all active:scale-90">
          <LogOut size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-12 relative z-10">
        {/* Profile Card */}
        <div className="bg-[#1A1F36] rounded-[2rem] p-6 border border-gray-800 shadow-2xl flex items-center space-x-5 animate-fadeInUp">
          <div className="w-16 h-16 bg-gradient-to-tr from-[#FF6B00] to-[#FFA03A] rounded-2xl flex items-center justify-center font-black text-2xl shadow-[0_0_20px_rgba(255,107,0,0.3)]">
             {user?.name?.charAt(0) || 'D'}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black">{user?.name || 'Driver'}</h2>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Vehicle</span>
              <span className="text-sm font-semibold text-gray-200">{user?.vehicle_number || 'N/A'}</span>
            </div>
            <div className="flex items-center space-x-1.5 mt-1">
              <CheckCircle size={12} className="text-green-400" />
              <span className="text-xs text-green-400 font-bold uppercase tracking-wider">Verified Driver</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-5 rounded-[2rem] shadow-[0_10px_30px_rgba(37,99,235,0.25)] relative overflow-hidden">
             <Wallet className="absolute right-[-8px] bottom-[-8px] w-20 h-20 text-white opacity-10" />
             <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-1 relative z-10">Total Earnings</p>
             <p className="text-3xl font-black relative z-10">₹{Math.round(stats.totalEarnings)}</p>
          </div>
          <div className="bg-[#1A1F36] p-5 rounded-[2rem] border border-gray-800 relative overflow-hidden">
             <TrendingUp className="absolute right-[-8px] bottom-[-8px] w-20 h-20 text-green-500 opacity-5" />
             <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 relative z-10">Trips Done</p>
             <p className="text-3xl font-black text-white relative z-10">{stats.count}</p>
          </div>
        </div>

        {/* Recent Earnings */}
        <div className="mt-4 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-lg font-bold mb-4 flex items-center space-x-2 text-gray-200">
            <Calendar size={20} className="text-[#FF6B00]" />
            <span>Recent Earnings</span>
          </h3>

          {loading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="skeleton-dark h-20 w-full" />)}
            </div>
          ) : stats.rides.length === 0 ? (
            <div className="text-center bg-[#1A1F36] p-10 rounded-3xl border border-dashed border-gray-700 text-gray-500">
              <span className="text-4xl block mb-3">🛺</span>
              <p className="font-bold">No completed trips</p>
              <p className="text-sm mt-1">Start accepting rides to earn!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.rides.map((ride, idx) => (
                <div key={ride.id} className="bg-[#1A1F36] p-4 rounded-2xl border border-gray-800 flex justify-between items-center hover:border-gray-700 transition-colors animate-fadeInUp" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div>
                    <p className="text-sm font-bold text-gray-300 mb-1">Trip #{ride.id.substring(0,6).toUpperCase()}</p>
                    <p className="text-xs text-gray-500 font-medium">
                      {new Date(ride.dropoff_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-green-400">+₹{Math.round(ride.total_fare)}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-0.5">Paid</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
