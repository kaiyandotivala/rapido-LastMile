import React, { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, NavLink } from 'react-router-dom';
import api from './services/api';
import { LayoutDashboard, Users, Car, LogOut, Menu, X } from 'lucide-react';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Drivers from './pages/Drivers';
import Rides from './pages/Rides';

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      // In a real app, verify token with backend. For MVP, we'll just check if it exists.
      setAdmin({ role: 'Admin' }); 
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/admin/login', { email, password });
    if (data.success && data.accessToken) {
      localStorage.setItem('adminToken', data.accessToken);
      setAdmin(data.user);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const PrivateRoute = ({ children }) => {
  const { admin, loading } = useContext(AuthContext);
  if (loading) return <div className="h-screen bg-[#0B0F19] flex items-center justify-center text-white">Loading...</div>;
  return admin ? children : <Navigate to="/login" replace />;
};

const AdminLayout = () => {
  const { logout } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen bg-[#0B0F19] text-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 glass-dark border-r border-gray-800 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <span className="text-xl font-black">⚙️</span>
              </div>
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">LastMile</h1>
            </div>
            <button onClick={closeSidebar} className="lg:hidden p-1 text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest pl-13">Admin Portal</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavLink to="/" onClick={closeSidebar} className={({ isActive }) => `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${isActive ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/drivers" onClick={closeSidebar} className={({ isActive }) => `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${isActive ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
            <Users size={20} />
            <span>Drivers & Verifications</span>
          </NavLink>
          <NavLink to="/rides" onClick={closeSidebar} className={({ isActive }) => `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${isActive ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
            <Car size={20} />
            <span>Ride History</span>
          </NavLink>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button onClick={logout} className="flex items-center justify-center space-x-2 w-full py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors font-medium">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 lg:hidden glass-dark border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors">
            <Menu size={22} />
          </button>
          <h1 className="text-lg font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">LastMile Admin</h1>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.03] pointer-events-none" style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] left-[10%] w-[600px] h-[600px] rounded-full opacity-[0.02] pointer-events-none" style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }} />
        
        <div className="p-4 sm:p-6 lg:p-8 relative z-10 min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="rides" element={<Rides />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
