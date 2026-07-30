import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, RefreshCw, Shield, Upload } from 'lucide-react';

export default function PendingVerification() {
  const { user, checkDocumentStatus, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const status = user?.document_status || 'PENDING';

  useEffect(() => {
    // Auto-check status every 30 seconds
    const interval = setInterval(async () => {
      try {
        const result = await checkDocumentStatus();
        if (result.data?.document_status === 'APPROVED') {
          navigate('/', { replace: true });
        }
      } catch (e) { /* silent */ }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setChecking(true);
    try {
      const result = await checkDocumentStatus();
      if (result.data?.document_status === 'APPROVED') {
        navigate('/', { replace: true });
      }
    } catch (e) { /* silent */ }
    setChecking(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0B0F19 0%, #1A1A2E 50%, #0B0F19 100%)' }}>
      
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #FF6B00, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-sm space-y-8 relative z-10 text-center">
        {/* Status Icon */}
        {status === 'PENDING' && (
          <div className="animate-fadeInUp">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 bg-[#FF6B00]/15 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-3 bg-[#FF6B00]/10 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
              <div className="absolute inset-0 bg-[#1A1F36] rounded-full flex items-center justify-center border-2 border-[#FF6B00]/30 shadow-2xl">
                <Clock size={48} className="text-[#FF6B00]" />
              </div>
            </div>
            
            <h2 className="text-3xl font-black text-white mb-3">Under Review</h2>
            <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-xs mx-auto">
              Your documents are being reviewed by our admin team. This usually takes a few hours.
            </p>
          </div>
        )}

        {status === 'REJECTED' && (
          <div className="animate-fadeInUp">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 bg-red-500/10 rounded-full" />
              <div className="absolute inset-0 bg-[#1A1F36] rounded-full flex items-center justify-center border-2 border-red-500/30 shadow-2xl">
                <XCircle size={48} className="text-red-500" />
              </div>
            </div>
            
            <h2 className="text-3xl font-black text-white mb-3">Documents Rejected</h2>
            <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-xs mx-auto mb-4">
              Unfortunately, your documents didn't pass verification.
            </p>
            
            {user?.rejection_reason && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-left mb-4">
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Reason</p>
                <p className="text-sm text-red-300 font-medium">{user.rejection_reason}</p>
              </div>
            )}

            <button 
              onClick={() => navigate('/login')}
              className="w-full flex justify-center items-center space-x-2 py-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#FF6B00] to-[#FFA03A] hover:shadow-[0_15px_30px_rgba(255,107,0,0.3)] active:scale-[0.98] transition-all shadow-lg"
            >
              <Upload size={18} />
              <span>Re-upload Documents</span>
            </button>
          </div>
        )}

        {status === 'APPROVED' && (
          <div className="animate-fadeInUp">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 bg-green-500/10 rounded-full" />
              <div className="absolute inset-0 bg-[#1A1F36] rounded-full flex items-center justify-center border-2 border-green-500/30 shadow-2xl">
                <CheckCircle size={48} className="text-green-500" />
              </div>
            </div>
            
            <h2 className="text-3xl font-black text-white mb-3">Verified!</h2>
            <p className="text-gray-400 text-sm font-medium">Your account is verified. Redirecting...</p>
          </div>
        )}

        {/* Progress Steps */}
        {status === 'PENDING' && (
          <div className="bg-[#1A1F36] rounded-3xl p-6 border border-gray-800 space-y-4 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <CheckCircle size={20} className="text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Documents Uploaded</p>
                <p className="text-xs text-gray-500">Successfully received</p>
              </div>
            </div>
            <div className="ml-5 border-l-2 border-dashed border-gray-700 h-4" />
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-xl flex items-center justify-center">
                <Shield size={20} className="text-[#FF6B00] animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Admin Review</p>
                <p className="text-xs text-[#FF6B00]">In progress...</p>
              </div>
            </div>
            <div className="ml-5 border-l-2 border-dashed border-gray-700 h-4" />
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
                <CheckCircle size={20} className="text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-500">Account Activation</p>
                <p className="text-xs text-gray-600">Waiting for approval</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <button onClick={handleRefresh} disabled={checking}
            className="w-full flex justify-center items-center space-x-2 py-4 rounded-2xl text-sm font-bold text-[#FF6B00] bg-[#FF6B00]/10 border border-[#FF6B00]/30 hover:bg-[#FF6B00]/20 transition-all disabled:opacity-50">
            <RefreshCw size={18} className={checking ? 'animate-spin' : ''} />
            <span>{checking ? 'Checking...' : 'Check Status'}</span>
          </button>

          <button onClick={handleLogout}
            className="w-full py-3 rounded-2xl text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
