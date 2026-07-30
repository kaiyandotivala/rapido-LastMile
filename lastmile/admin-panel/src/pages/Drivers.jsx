import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Search, CheckCircle, XCircle, FileText, X } from 'lucide-react';

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED
  
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/drivers');
      setDrivers(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm("Are you sure you want to approve this driver?")) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/drivers/${id}/approve`);
      setSelectedDriver(null);
      fetchDrivers();
    } catch (e) {
      alert('Failed to approve driver');
    }
    setActionLoading(false);
  };

  const handleReject = async (id) => {
    if (!rejectReason) {
      alert("Please provide a rejection reason");
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/admin/drivers/${id}/reject`, { reason: rejectReason });
      setSelectedDriver(null);
      setRejectReason('');
      fetchDrivers();
    } catch (e) {
      alert('Failed to reject driver');
    }
    setActionLoading(false);
  };

  const filteredDrivers = drivers.filter(d => {
    if (filter === 'ALL') return true;
    return d.document_status === filter;
  });

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Driver Management</h2>
          <p className="text-gray-400 font-medium mt-1 text-sm">Review documents and manage driver access</p>
        </div>
        <div className="flex flex-wrap gap-1 bg-gray-900/50 p-1 rounded-xl border border-gray-800">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                filter === f 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="table-glass">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading drivers...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Rides</th>
                <th>Earnings</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map(driver => (
                <tr key={driver.id}>
                  <td>
                    <p className="font-bold">{driver.name || 'N/A'}</p>
                    <p className="text-xs text-gray-500">{driver.phone}</p>
                  </td>
                  <td className="font-mono text-sm">{driver.vehicle_number || '-'}</td>
                  <td>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex w-max items-center space-x-1 ${
                      driver.document_status === 'APPROVED' ? 'bg-green-500/10 text-green-400' :
                      driver.document_status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                      'bg-[#FF6B00]/10 text-[#FF6B00]'
                    }`}>
                      {driver.document_status === 'APPROVED' && <CheckCircle size={10} />}
                      {driver.document_status === 'REJECTED' && <XCircle size={10} />}
                      {driver.document_status === 'PENDING' && <FileText size={10} />}
                      <span>{driver.document_status}</span>
                    </span>
                  </td>
                  <td>{driver.completedRides || 0}</td>
                  <td>₹{driver.totalEarnings || 0}</td>
                  <td>
                    <button 
                      onClick={() => setSelectedDriver(driver)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-colors"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Verification Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#1A1F36] border border-gray-700 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-fadeInUp">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">{selectedDriver.name}</h3>
                <p className="text-gray-400 text-sm">Phone: {selectedDriver.phone} | Vehicle: {selectedDriver.vehicle_number}</p>
              </div>
              <button onClick={() => { setSelectedDriver(null); setRejectReason(''); }} className="p-2 hover:bg-gray-800 rounded-xl transition-colors">
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Documents */}
                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Driving License</p>
                  {selectedDriver.driving_license ? (
                    <img src={selectedDriver.driving_license} alt="License" className="w-full rounded-xl border border-gray-700 aspect-video object-cover hover:object-contain bg-black/50 cursor-zoom-in" />
                  ) : <div className="h-32 bg-gray-900 rounded-xl flex items-center justify-center text-gray-600 text-sm">Not Uploaded</div>}
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Fitness Certificate</p>
                  {selectedDriver.fitness_certificate ? (
                    <img src={selectedDriver.fitness_certificate} alt="Fitness" className="w-full rounded-xl border border-gray-700 aspect-video object-cover hover:object-contain bg-black/50 cursor-zoom-in" />
                  ) : <div className="h-32 bg-gray-900 rounded-xl flex items-center justify-center text-gray-600 text-sm">Not Uploaded</div>}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Aadhar Card</p>
                  {selectedDriver.aadhar_card ? (
                    <img src={selectedDriver.aadhar_card} alt="Aadhar" className="w-full rounded-xl border border-gray-700 aspect-video object-cover hover:object-contain bg-black/50 cursor-zoom-in" />
                  ) : <div className="h-32 bg-gray-900 rounded-xl flex items-center justify-center text-gray-600 text-sm">Not Uploaded</div>}
                </div>
              </div>

              {selectedDriver.document_status === 'REJECTED' && (
                <div className="mt-6 bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                  <p className="text-xs font-bold text-red-400 uppercase">Current Status: Rejected</p>
                  <p className="text-red-300 mt-1">{selectedDriver.rejection_reason}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-800 bg-[#0F1423] rounded-b-3xl">
              {selectedDriver.document_status === 'PENDING' ? (
                <div className="flex space-x-4">
                  <div className="flex-1 flex space-x-2">
                    <input 
                      type="text" 
                      placeholder="Reason (if rejecting)..." 
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="flex-1 bg-[#1A1F36] border border-gray-700 rounded-xl px-4 text-sm text-white outline-none focus:border-red-500"
                    />
                    <button 
                      onClick={() => handleReject(selectedDriver.id)} disabled={actionLoading}
                      className="px-6 py-3 bg-red-500/10 text-red-500 font-bold rounded-xl hover:bg-red-500/20 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                  <button 
                    onClick={() => handleApprove(selectedDriver.id)} disabled={actionLoading}
                    className="flex-1 px-6 py-3 bg-green-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:bg-green-400 transition-colors"
                  >
                    {actionLoading ? 'Processing...' : 'Approve Documents'}
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center text-sm text-gray-400">
                  <span>This driver is currently {selectedDriver.document_status}.</span>
                  {selectedDriver.document_status === 'REJECTED' && (
                    <button onClick={() => handleApprove(selectedDriver.id)} className="text-green-500 font-bold hover:underline">
                      Override & Approve
                    </button>
                  )}
                  {selectedDriver.document_status === 'APPROVED' && (
                    <button onClick={() => handleReject(selectedDriver.id)} className="text-red-500 font-bold hover:underline">
                      Revoke Access
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
