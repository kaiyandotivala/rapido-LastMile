import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ChevronLeft, LogOut, Clock, MapPin, CheckCircle, Mail, Shield } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const { data } = await api.get('/passenger/rides');
        setRides(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRides();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900 font-sans">
      {/* Header */}
      <div className="glass shadow-sm border-b border-gray-100/50 px-4 py-4 sticky top-0 z-10 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2.5 -ml-2 hover:bg-gray-100 rounded-2xl transition-all duration-300 active:scale-90">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">My Profile</h1>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-12">
        {/* Profile Card */}
        <div className="flex items-center space-x-4 bg-white p-6 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-gray-100 animate-fadeInUp">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/20">
            {user?.name?.charAt(0) || 'P'}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black text-gray-900">{user?.name || 'Student'}</h2>
            <div className="flex items-center space-x-1.5 mt-1">
              <Mail size={14} className="text-gray-400" />
              <p className="text-gray-500 font-medium text-sm">{user?.email || 'student@somaiya.edu'}</p>
            </div>
            <div className="flex items-center space-x-1.5 mt-1">
              <Shield size={12} className="text-green-500" />
              <p className="text-green-600 font-bold text-xs uppercase tracking-wider">Verified Student</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all duration-300 active:scale-90">
            <LogOut size={20} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-[2rem] text-white relative overflow-hidden shadow-lg shadow-blue-500/20">
            <div className="absolute right-[-10px] bottom-[-10px] w-20 h-20 bg-white/10 rounded-full" />
            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">Total Rides</p>
            <p className="text-3xl font-black">{rides.length}</p>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-gray-100 relative overflow-hidden shadow-sm">
            <div className="absolute right-[-10px] bottom-[-10px] w-20 h-20 bg-gray-50 rounded-full" />
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Completed</p>
            <p className="text-3xl font-black text-gray-900">{rides.filter(r => r.status === 'COMPLETED').length}</p>
          </div>
        </div>

        {/* Rides History */}
        <div className="animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-lg font-black mb-4 flex items-center space-x-2">
            <Clock size={20} className="text-blue-500" />
            <span>Ride History</span>
          </h3>

          {loading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="skeleton h-32 w-full" />
              ))}
            </div>
          ) : rides.length === 0 ? (
            <div className="text-center bg-white p-10 rounded-3xl border border-dashed border-gray-200 text-gray-400">
              <span className="text-4xl block mb-3">🛺</span>
              <p className="font-bold">No rides yet</p>
              <p className="text-sm mt-1">Book your first ride from the home screen!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rides.map((ride, idx) => (
                <div key={ride.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 animate-fadeInUp" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {new Date(ride.requested_at).toLocaleDateString()}
                    </span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      ride.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                      ride.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {ride.status}
                    </span>
                  </div>
                  
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="mt-1 flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-50" />
                      <div className="w-0.5 h-6 bg-gray-200 my-1" />
                      <div className="w-3 h-3 rounded-none bg-indigo-500 ring-4 ring-indigo-50" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <p className="text-sm font-bold text-gray-800">{ride.pickup_zone?.name}</p>
                      <p className="text-sm font-bold text-gray-800">{ride.dropoff_zone?.name}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 font-medium">
                      <span className="w-7 h-7 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center font-bold text-xs text-white">{ride.driver?.name?.charAt(0)}</span>
                      <span>{ride.driver?.name || 'No Driver'}</span>
                    </div>
                    <p className="font-black text-lg">₹{Math.round(ride.total_fare || ride.convenience_fee + 25)}</p>
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
