import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ArrowRight, Mail, Lock, User, Eye, EyeOff, GraduationCap, Shield } from 'lucide-react';

export default function Login() {
  const { register, login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = email.endsWith('@somaiya.edu');
  const emailError = email.length > 0 && !isValidEmail;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail) {
      setError('Only @somaiya.edu email addresses are allowed');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail) {
      setError('Only @somaiya.edu email addresses are allowed');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }} />
        <div className="absolute bottom-[-30%] left-[-20%] w-[600px] h-[600px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
        <div className="absolute top-[10%] left-[5%] w-3 h-3 bg-blue-400/20 rounded-full animate-float" />
        <div className="absolute top-[30%] right-[10%] w-2 h-2 bg-cyan-400/30 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[20%] left-[15%] w-4 h-4 bg-indigo-400/15 rounded-full animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-sm space-y-6 p-6 relative z-10 animate-fadeInUp">
        {/* Logo & Header */}
        <div className="text-center mb-2">
          <div className="relative w-24 h-24 mx-auto mb-5">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-3xl rotate-6 opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-3xl flex items-center justify-center shadow-2xl">
              <span className="text-5xl">🛺</span>
            </div>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Last<span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Mile</span>
          </h1>
          <p className="text-gray-400 mt-2 font-medium text-sm">Your college-to-station ride in 5 mins</p>
          
          <div className="flex items-center justify-center mt-3 space-x-2">
            <GraduationCap size={14} className="text-cyan-400" />
            <span className="text-xs font-bold text-cyan-400/80 uppercase tracking-widest">Somaiya Students Only</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 ${
              mode === 'login'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 ${
              mode === 'register'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-2xl text-sm text-center font-medium animate-fadeInUp">
            {error}
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4 animate-fadeInUp" key="login">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3.5 bg-white/5 border rounded-2xl text-white placeholder-gray-500 outline-none transition-all duration-300 text-sm font-medium ${
                    emailError ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/30' : 'border-white/10 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50'
                  }`}
                  placeholder="yourname@somaiya.edu"
                />
              </div>
              {emailError && (
                <p className="text-red-400 text-xs mt-1.5 font-medium flex items-center space-x-1">
                  <Shield size={12} />
                  <span>Only @somaiya.edu emails are allowed</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all duration-300 text-sm font-medium"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isValidEmail}
              className="w-full flex justify-center items-center py-4 rounded-2xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500 hover:shadow-[0_15px_30px_rgba(59,130,246,0.35)] hover:-translate-y-0.5 active:scale-[0.98] shadow-lg"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In<ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegister} className="space-y-4 animate-fadeInUp" key="register">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all duration-300 text-sm font-medium"
                  placeholder="Krish Jain"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Somaiya Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3.5 bg-white/5 border rounded-2xl text-white placeholder-gray-500 outline-none transition-all duration-300 text-sm font-medium ${
                    emailError ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/30' : 'border-white/10 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50'
                  }`}
                  placeholder="yourname@somaiya.edu"
                />
              </div>
              {emailError && (
                <p className="text-red-400 text-xs mt-1.5 font-medium flex items-center space-x-1">
                  <Shield size={12} />
                  <span>Only @somaiya.edu emails are allowed</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all duration-300 text-sm font-medium"
                  placeholder="Min. 6 characters"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3.5 bg-white/5 border rounded-2xl text-white placeholder-gray-500 outline-none transition-all duration-300 text-sm font-medium ${
                    confirmPassword && password !== confirmPassword ? 'border-red-500/50' : 'border-white/10 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50'
                  }`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isValidEmail || password.length < 6}
              className="w-full flex justify-center items-center py-4 rounded-2xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500 hover:shadow-[0_15px_30px_rgba(59,130,246,0.35)] hover:-translate-y-0.5 active:scale-[0.98] shadow-lg"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create Account<ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </button>
          </form>
        )}

        <p className="text-center text-gray-500 text-xs font-medium pt-2">
          🔒 Secure authentication for Somaiya students
        </p>
      </div>
    </div>
  );
}
