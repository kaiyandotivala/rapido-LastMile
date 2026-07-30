import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function Rides() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const { data } = await api.get('/admin/rides');
        setRides(data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRides();
  }, []);

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">Ride History</h2>
        <p className="text-gray-400 font-medium mt-1 text-sm">Complete log of all platform rides</p>
      </div>

      <div className="table-glass">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading rides...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Passenger</th>
                <th>Driver</th>
                <th>Route</th>
                <th>Fare</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rides.map(ride => (
                <tr key={ride.id}>
                  <td className="font-mono text-xs text-gray-500">{ride.id.substring(0,8)}</td>
                  <td className="text-sm">{new Date(ride.createdAt).toLocaleString()}</td>
                  <td>
                    <p className="font-bold">{ride.passenger?.name}</p>
                  </td>
                  <td>
                    <p className="font-bold">{ride.driver?.name || 'Unassigned'}</p>
                  </td>
                  <td className="text-xs">
                    <div><span className="text-blue-400">P:</span> {ride.pickup_zone?.name}</div>
                    <div><span className="text-green-400">D:</span> {ride.dropoff_zone?.name}</div>
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
        )}
      </div>
    </div>
  );
}
