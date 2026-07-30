import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { IndianRupee, Users, Car, AlertCircle, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/admin/dashboard');
        setStats(data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="text-gray-400">Loading dashboard...</div>;
  if (!stats) return <div className="text-red-400">Failed to load stats</div>;

  return (
    <div className="space-y-8 animate-fadeInUp">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">Platform Overview</h2>
        <p className="text-gray-400 font-medium mt-1 text-sm">Real-time stats and metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-dark p-6 rounded-2xl relative overflow-hidden border border-gray-800">
          <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-cyan-500/10 rounded-full blur-xl" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Revenue</p>
              <h3 className="text-3xl font-black text-white">₹{stats.stats.totalRevenue}</h3>
            </div>
            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
              <IndianRupee size={20} className="text-cyan-400" />
            </div>
          </div>
        </div>

        <div className="glass-dark p-6 rounded-2xl relative overflow-hidden border border-gray-800">
          <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-blue-500/10 rounded-full blur-xl" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Rides</p>
              <h3 className="text-3xl font-black text-white">{stats.stats.totalRides}</h3>
            </div>
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Car size={20} className="text-blue-400" />
            </div>
          </div>
        </div>

        <div className="glass-dark p-6 rounded-2xl relative overflow-hidden border border-gray-800">
          <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-purple-500/10 rounded-full blur-xl" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Active Drivers</p>
              <h3 className="text-3xl font-black text-white">{stats.stats.activeDrivers}</h3>
            </div>
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Users size={20} className="text-purple-400" />
            </div>
          </div>
        </div>

        <div className="glass-dark p-6 rounded-2xl relative overflow-hidden border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)]">
          <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-[#FF6B00]/20 rounded-full blur-xl animate-pulse" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-[#FF6B00] uppercase tracking-widest mb-2">Pending Verification</p>
              <h3 className="text-3xl font-black text-white">{stats.stats.pendingDrivers}</h3>
            </div>
            <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-xl flex items-center justify-center">
              <AlertCircle size={20} className="text-[#FF6B00]" />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-dark rounded-2xl p-6 border border-gray-800">
        <h3 className="text-xl font-bold mb-6 flex items-center space-x-2">
          <TrendingUp size={20} className="text-blue-400" />
          <span>Recent Rides</span>
        </h3>
        
        <div className="table-glass">
          <table>
            <thead>
              <tr>
                <th>Passenger</th>
                <th>Driver</th>
                <th>Route</th>
                <th>Fare</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentRides.map(ride => (
                <tr key={ride.id}>
                  <td>
                    <p className="font-bold">{ride.passenger?.name}</p>
                    <p className="text-xs text-gray-500">{ride.passenger?.email}</p>
                  </td>
                  <td>
                    <p className="font-bold">{ride.driver?.name || '-'}</p>
                    <p className="text-xs text-gray-500">{ride.driver?.vehicle_number || '-'}</p>
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>{ride.pickup_zone?.name}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="w-2 h-2 bg-green-500" />
                      <span>{ride.dropoff_zone?.name}</span>
                    </div>
                  </td>
                  <td className="font-bold">₹{ride.total_fare || '-'}</td>
                  <td>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      ride.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' :
                      ride.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400' :
                      'bg-blue-500/10 text-blue-400'
                    }`}>
                      {ride.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.recentRides.length === 0 && (
            <div className="p-8 text-center text-gray-500">No recent rides found</div>
          )}
        </div>
      </div>
    </div>
  );
}
