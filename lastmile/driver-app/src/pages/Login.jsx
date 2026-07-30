import React, { useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ArrowRight, Upload, FileCheck, FileX, Camera, Shield, Clock } from 'lucide-react';

export default function Login() {
  const { sendOtp, verifyOtp, uploadDocuments } = useContext(AuthContext);
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1=phone, 2=otp+details, 3=documents, 4=pending
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Document states
  const [docs, setDocs] = useState({ driving_license: null, fitness_certificate: null, aadhar_card: null });
  const [previews, setPreviews] = useState({ driving_license: null, fitness_certificate: null, aadhar_card: null });

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendOtp(phone);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await verifyOtp(phone, otp, name, vehicle);
      if (result.requiresDocuments) {
        setStep(3);
      } else if (result.pendingVerification) {
        setStep(4);
      } else if (result.documentRejected) {
        setError(`Documents rejected: ${result.rejectionReason}`);
        setStep(3);
      } else if (result.user?.document_status === 'APPROVED') {
        navigate('/', { replace: true });
      } else {
        setStep(3);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    }
    setLoading(false);
  };

  const handleFileChange = (field, e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocs(prev => ({ ...prev, [field]: reader.result }));
      setPreviews(prev => ({ ...prev, [field]: URL.createObjectURL(file) }));
    };
    reader.readAsDataURL(file);
    setError('');
  };

  const handleUploadDocs = async () => {
    if (!docs.driving_license || !docs.fitness_certificate || !docs.aadhar_card) {
      setError('Please upload all three documents');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await uploadDocuments(docs.driving_license, docs.fitness_certificate, docs.aadhar_card);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload documents');
    }
    setLoading(false);
  };

  const DocUploadCard = ({ label, field, icon }) => (
    <div className="bg-[#1A1F36] rounded-2xl p-4 border border-gray-800 hover:border-[#FF6B00]/30 transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-sm font-bold text-gray-300">{label}</span>
        </div>
        {docs[field] ? (
          <FileCheck size={18} className="text-green-400" />
        ) : (
          <FileX size={18} className="text-gray-600" />
        )}
      </div>
      
      {previews[field] ? (
        <div className="relative">
          <img src={previews[field]} alt={label} className="w-full h-32 object-cover rounded-xl border border-gray-700" />
          <button 
            onClick={() => { setDocs(p => ({...p, [field]: null})); setPreviews(p => ({...p, [field]: null})); }}
            className="absolute top-2 right-2 bg-red-500/80 text-white p-1 rounded-lg text-xs hover:bg-red-600 transition-colors"
          >
            ✕
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-[#FF6B00]/50 hover:bg-[#FF6B00]/5 transition-all duration-300">
          <Camera size={24} className="text-gray-600 mb-2" />
          <span className="text-xs font-medium text-gray-500">Tap to upload</span>
          <input type="file" accept="image/*" onChange={(e) => handleFileChange(field, e)} className="hidden" />
        </label>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0B0F19 0%, #1A1A2E 50%, #0B0F19 100%)' }}>
      
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #FF6B00, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] left-[-15%] w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #FF6B00, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-sm space-y-6 relative z-10 animate-fadeInUp">
        {/* Header */}
        <div className="text-center mb-2">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#FF6B00] to-[#FFA03A] rounded-3xl rotate-6 opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#FF6B00] to-[#FFA03A] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#FF6B00]/30">
              <span className="text-4xl">🧑‍✈️</span>
            </div>
          </div>
          <h2 className="text-3xl font-black text-white">LastMile <span className="text-[#FF6B00]">Driver</span></h2>
          <p className="text-gray-400 mt-1.5 font-medium text-sm">
            {step === 1 && 'Earn more on short trips'}
            {step === 2 && 'Verify your identity'}
            {step === 3 && 'Upload your documents'}
            {step === 4 && 'Verification in progress'}
          </p>
          
          {/* Step indicators */}
          <div className="flex justify-center mt-4 space-x-2">
            {[1,2,3,4].map(s => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${
                s === step ? 'w-8 bg-[#FF6B00]' : s < step ? 'w-4 bg-[#FF6B00]/50' : 'w-4 bg-gray-700'
              }`} />
            ))}
          </div>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-2xl text-sm text-center font-medium animate-fadeInUp">{error}</div>}

        {/* Step 1: Phone */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4 animate-fadeInUp">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Phone Number</label>
              <div className="flex">
                <span className="inline-flex items-center px-4 rounded-l-2xl border border-r-0 border-gray-700 bg-[#1A1F36] text-gray-400 text-sm font-bold">+91</span>
                <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 min-w-0 block w-full px-4 py-3.5 rounded-r-2xl border border-gray-700 bg-[#1A1F36] text-white focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00]/50 outline-none transition-all text-sm font-medium"
                  placeholder="9876543210" />
              </div>
            </div>
            <button type="submit" disabled={loading || phone.length < 10}
              className="w-full flex justify-center items-center py-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#FF6B00] to-[#FFA03A] hover:shadow-[0_15px_30px_rgba(255,107,0,0.3)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-40 transition-all duration-300 shadow-lg">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Get OTP<ArrowRight className="ml-2 h-4 w-4" /></>}
            </button>
          </form>
        )}

        {/* Step 2: OTP + Details */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fadeInUp">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Full Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3.5 border border-gray-700 bg-[#1A1F36] rounded-2xl text-white outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00]/50 text-sm font-medium transition-all"
                placeholder="Raju B." />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Vehicle Registration</label>
              <input type="text" value={vehicle} onChange={(e) => setVehicle(e.target.value)}
                className="w-full px-4 py-3.5 border border-gray-700 bg-[#1A1F36] rounded-2xl text-white outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00]/50 text-sm font-medium transition-all"
                placeholder="MH 01 AB 1234" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Enter 6-digit OTP</label>
              <input type="text" required value={otp} onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-3.5 border border-gray-700 bg-[#1A1F36] rounded-2xl text-white outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00]/50 text-center text-xl font-black tracking-[0.3em] transition-all"
                placeholder="• • • • • •" maxLength={6} />
            </div>
            <button type="submit" disabled={loading || otp.length < 4}
              className="w-full flex justify-center items-center py-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#FF6B00] to-[#FFA03A] hover:shadow-[0_15px_30px_rgba(255,107,0,0.3)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-40 transition-all duration-300 shadow-lg">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify & Continue'}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-center text-sm text-gray-500 hover:text-gray-300 transition-colors py-2">
              ← Back to Phone Entry
            </button>
          </form>
        )}

        {/* Step 3: Document Upload */}
        {step === 3 && (
          <div className="space-y-4 animate-fadeInUp">
            <div className="bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-2xl p-4 flex items-start space-x-3">
              <Shield size={20} className="text-[#FF6B00] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-[#FF6B00]">Document Verification Required</p>
                <p className="text-xs text-gray-400 mt-1">Upload clear photos of the following documents. Admin will verify them before you can start accepting rides.</p>
              </div>
            </div>

            <DocUploadCard label="Driving License" field="driving_license" icon={<Shield size={16} className="text-blue-400" />} />
            <DocUploadCard label="Fitness Certificate" field="fitness_certificate" icon={<FileCheck size={16} className="text-green-400" />} />
            <DocUploadCard label="Aadhar Card" field="aadhar_card" icon={<Shield size={16} className="text-purple-400" />} />

            <button onClick={handleUploadDocs} disabled={loading || !docs.driving_license || !docs.fitness_certificate || !docs.aadhar_card}
              className="w-full flex justify-center items-center py-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#FF6B00] to-[#FFA03A] hover:shadow-[0_15px_30px_rgba(255,107,0,0.3)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-40 transition-all duration-300 shadow-lg">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                <>
                  <Upload size={18} className="mr-2" />
                  Submit Documents for Verification
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 4: Pending Verification */}
        {step === 4 && (
          <div className="text-center space-y-6 animate-fadeInUp">
            <div className="relative w-28 h-28 mx-auto">
              <div className="absolute inset-0 bg-[#FF6B00]/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-0 bg-[#1A1F36] rounded-full flex items-center justify-center border-2 border-[#FF6B00]/30">
                <Clock size={40} className="text-[#FF6B00]" />
              </div>
            </div>
            
            <div>
              <h3 className="text-2xl font-black text-white mb-2">Verification Pending</h3>
              <p className="text-gray-400 text-sm font-medium leading-relaxed">
                Your documents have been submitted successfully. Our admin team will verify them shortly. You'll be able to log in once approved.
              </p>
            </div>

            <div className="bg-[#1A1F36] rounded-2xl p-4 border border-gray-800 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-sm text-gray-300 font-medium">Documents uploaded</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#FF6B00] rounded-full animate-pulse" />
                <span className="text-sm text-gray-300 font-medium">Admin review in progress</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-600 rounded-full" />
                <span className="text-sm text-gray-500 font-medium">Account activation</span>
              </div>
            </div>

            <button onClick={() => { window.location.reload(); }}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-[#FF6B00] bg-[#FF6B00]/10 border border-[#FF6B00]/30 hover:bg-[#FF6B00]/20 transition-all">
              Refresh Status
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
