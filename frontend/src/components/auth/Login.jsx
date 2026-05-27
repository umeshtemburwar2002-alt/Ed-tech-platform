import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDispatch } from 'react-redux'
import { toast } from 'react-hot-toast'
import { login } from '../../services/operations/authAPI'
import { signInWithGoogle, signInWithGitHub, OAUTH_ROLE_KEY } from '../../services/operations/googleAuthAPI'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null)
  const [error, setError] = useState('')
  const [selectedRole, setSelectedRole] = useState('student')
  
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const customRedirect = location.state?.from || null

  const handleLogin = async () => {
    try {
      setLoading(true)
      setError('')
      if (customRedirect) {
        sessionStorage.setItem("intended_redirect", customRedirect);
      }
      await dispatch(login(email, password, navigate, selectedRole, customRedirect))
    } catch (e) {
      setError(e.message || 'Login failed')
      toast.error('Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider) => {
    try {
      setOauthLoading(provider)
      sessionStorage.setItem(OAUTH_ROLE_KEY, selectedRole)
      if (customRedirect) {
        sessionStorage.setItem("intended_redirect", customRedirect);
      }
      if (provider === 'google') {
        await signInWithGoogle()
      } else if (provider === 'github') {
        await signInWithGitHub()
      }
    } catch (e) {
      console.error('OAuth login failed:', e)
    } finally {
      setOauthLoading(null)
    }
  }

  useEffect(() => {
    setError('')
  }, [email, password])

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center bg-[#000814] px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-cyan-900/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-dark p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative z-10 border border-white/5"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h1>
          <p className="mt-2 text-slate-400 text-sm font-medium">Log in to your account to continue</p>
        </div>

        {/* Role Selector for OAuth */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-300 mb-2">I am a</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedRole('student')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all ${
                selectedRole === 'student'
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
              }`}
            >
              <i className="fas fa-graduation-cap"></i>
              Student
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('instructor')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all ${
                selectedRole === 'instructor'
                  ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
              }`}
            >
              <i className="fas fa-chalkboard-teacher"></i>
              Instructor
            </button>
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-6 p-4 bg-red-500/10 text-red-400 rounded-xl text-sm font-bold border border-red-500/20 flex items-center gap-3">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </motion.div>
        )}

        <div className="space-y-6">
          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleOAuth('google')}
              disabled={oauthLoading === 'google'}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all disabled:opacity-50"
            >
              {oauthLoading === 'google' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <i className="fab fa-google text-lg"></i>
              )}
              Google
            </button>
            <button
              onClick={() => handleOAuth('github')}
              disabled={oauthLoading === 'github'}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all disabled:opacity-50"
            >
              {oauthLoading === 'github' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <i className="fab fa-github text-lg"></i>
              )}
              GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-sm text-slate-500 bg-[#0f172a]">or continue with email</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Email Address</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#00B4D8] transition-colors">
                <i className="fas fa-envelope"></i>
              </span>
              <input
                type="email"
                required
                className="input-field pl-12"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-slate-300">Password</label>
              <Link to="/forgot-password" size="sm" className="text-xs font-bold text-[#00B4D8] hover:text-[#00B4D8]/80 transition-colors">
                Forgot Password?
              </Link>
            </div>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#00B4D8] transition-colors">
                <i className="fas fa-lock"></i>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                className="input-field pl-12 pr-12"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input type="checkbox" id="remember" checked={remember} onChange={(e)=>setRemember(e.target.checked)} className="w-4 h-4 rounded bg-white/5 border-white/10 text-[#00B4D8] focus:ring-[#00B4D8] cursor-pointer" />
            <label htmlFor="remember" className="ml-2 text-sm text-slate-400 font-medium cursor-pointer">Remember Me</label>
          </div>

          <button
            onClick={() => handleLogin()}
            disabled={loading}
            className="w-full btn-primary py-4 text-lg font-bold flex items-center justify-center gap-3 relative overflow-hidden group"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                Log In
              </>
            )}
          </button>

          <p className="text-center text-sm text-slate-400">
            Don't have an account?{" "}
            <Link to="/signup" className="text-[#00B4D8] font-bold hover:text-[#00B4D8]/80 transition-colors">
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
