import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ArrowRight, AlertCircle, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isDemoMode } from '@/hooks/useDemoMode';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, demoBypassLogin, user, isLoading } = useAuth();

  if (user) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = username.trim();
    if (!cleanEmail || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      const result = await login(cleanEmail, password);
      if (result.success) {
        navigate('/admin/dashboard');
      } else {
        if (isDemoMode) {
          demoBypassLogin(cleanEmail);
          navigate('/admin/dashboard');
          return;
        }
        setError(result.error || 'Invalid email or password');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-3xl mix-blend-multiply transition-all duration-1000"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-3xl mix-blend-multiply transition-all duration-1000"></div>
      </div>

      {/* Return to Store Button */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-8 left-8 z-20"
      >
        <Link 
          to="/" 
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all group"
        >
          <motion.div
            whileHover={{ x: -4 }}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="uppercase tracking-[0.2em] text-[10px]">Return to Store</span>
          </motion.div>
        </Link>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card/80 border border-border/60 rounded-2xl p-8 shadow-2xl z-10 relative backdrop-blur-xl"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Admin Access</h1>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2 tracking-widest uppercase">Demo Mode</span>
            <br/>
            Please use your store <strong>Email ID</strong> and <strong>Password</strong> to access the demonstration portal.
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email Address</label>
            <div className="relative">
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                placeholder="Enter store email address"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <input
                type="password"
                name="admin_password_field"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                placeholder="Enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-primary/25 group"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

      </motion.div>
    </div>
  );
};

export default AdminLogin;
