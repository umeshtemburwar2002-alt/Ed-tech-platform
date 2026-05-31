import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../context/NotificationContext';
import {
  FaGraduationCap,
  FaBars,
  FaTimes,
  FaBell,
  FaUserCircle,
  FaSignOutAlt,
  FaRocket,
  FaShoppingCart,
  FaHeart,
  FaShieldAlt,
  FaChevronDown
} from 'react-icons/fa';
import { setToken } from '../../slices/authSlice';
import { setUser } from '../../slices/profileSlice';
import { toast } from 'react-hot-toast';
import NotificationDropdown from './NotificationDropdown';
import ProfileDropdown from './ProfileDropdown';
import useOnClickOutside from '../../hooks/useOnClickOutside';
import Logo from '../../components/navbar/Logo';
import { fetchWishlist } from '../../services/operations/wishlistAPI';


const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // ✅ Use ONLY Redux for currentUser — it holds the profile with accountType.
  // AuthContext.user is the raw Supabase auth.User (no accountType field).
  const { user } = useSelector((state) => state.profile);
  const { token } = useSelector((state) => state.auth);
  const { cart } = useSelector((state) => state.cart);
  const { wishlist } = useSelector((state) => state.wishlist);

  // Alias: legacy code used currentUser/currentToken
  const currentUser = user;
  const currentToken = token;

  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns when clicking outside
  useOnClickOutside(notificationRef, () => setShowNotifications(false));
  useOnClickOutside(profileRef, () => setIsProfileOpen(false));

  const { notifications, unreadCount } = useNotifications();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (token && user?.accountType === "Student") {
      dispatch(fetchWishlist(token));
    }
  }, [token, user?.accountType, dispatch]);

  const handleLogout = async () => {
    try {
      const { performLogout } = await import('../../services/syncSupabaseSession');
      setIsProfileOpen(false);
      setIsMobileMenuOpen(false);
      await performLogout(dispatch, navigate);
      toast.success("Signed out successfully");
    } catch {
      toast.error("Sign out failed — please try again");
    }
  };



  // Pre-Login Links
  const publicLinks = [
    { name: 'Home', path: '/' },
    { name: 'Explore Courses', path: '/explore-courses' },
    { name: 'Students', path: '/students' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

    // Determine navigation links based on user role
   // Show all public links—including "Explore Courses"—for every user
   const currentLinks = publicLinks;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`fixed w-full z-[100] transition-all duration-500 ${isScrolled
        ? 'bg-[#000814]/80 backdrop-blur-md py-3 border-b border-white/10 shadow-2xl shadow-cyan-500/10'
        : 'bg-transparent py-5'
      }`}>
      <div className="flex justify-between items-center px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <Logo />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-8">
          <ul className="flex items-center gap-8">
            {currentLinks.map((link) => (
              <li key={link.name}>
                <Link
                  to={link.path}
                  className={`relative py-2 text-sm font-bold tracking-wide transition-all duration-300 hover:text-cyan-400 ${isActive(link.path) ? 'text-cyan-400' : 'text-slate-300'
                    }`}
                >
                  {link.name}
                  {isActive(link.path) && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(0,180,216,0.6)]"
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-6 ml-4 border-l border-white/10 pl-10">
            {currentToken && currentUser ? (
              <div className="flex items-center gap-5">
                {/* Cart Icon — hidden when empty */}
                {currentUser?.accountType === "Student" && cart.length > 0 && (
                  <Link to="/cart" className="relative w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all group">
                    <FaShoppingCart className="text-lg" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {cart.length}
                    </span>
                  </Link>
                )}

                {/* Wishlist Icon — hidden when empty */}
                {currentUser?.accountType === "Student" && wishlist?.length > 0 && (
                  <Link to="/dashboard/wishlist" className="relative w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all group">
                    <FaHeart className="text-lg group-hover:text-pink-500 transition-colors" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {wishlist.length}
                    </span>
                  </Link>
                )}

                {/* Notifications */}
                <div
                  className="relative"
                  ref={notificationRef}
                  onMouseEnter={() => setShowNotifications(true)}
                  onMouseLeave={() => setShowNotifications(false)}
                >
                  <button
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      setIsProfileOpen(false);
                    }}
                    className="relative w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all group"
                  >
                    <FaBell className="text-lg group-hover:animate-swing" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 text-white text-xs rounded-full flex items-center justify-center">{unreadCount}</span>
                    )}
                  </button>

                  <NotificationDropdown
                    isOpen={showNotifications}
                    onClose={() => setShowNotifications(false)}
                    notifications={notifications}
                  />
                </div>

                {/* Profile Dropdown */}
                <div
                  className="relative"
                  ref={profileRef}
                  onMouseEnter={() => setIsProfileOpen(true)}
                  onMouseLeave={() => setIsProfileOpen(false)}
                >
                  <button
                    onClick={() => {
                      setIsProfileOpen(!isProfileOpen);
                      setShowNotifications(false);
                    }}
                    className="flex items-center gap-3 p-1.5 rounded-full bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.05)]">
                      <img
                        src={currentUser?.image || `https://api.dicebear.com/5.x/initials/svg?seed=${currentUser?.firstName}`}
                        alt="User"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <FaChevronDown className={`text-[10px] text-slate-400 transition-transform duration-300 mr-2 group-hover:text-white ${isProfileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <ProfileDropdown
                    isOpen={isProfileOpen}
                    onClose={() => setIsProfileOpen(false)}
                    user={currentUser}
                    handleLogout={handleLogout}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link to="/signup" className="btn-primary py-2.5 px-8 text-sm shadow-lg shadow-cyan-500/20">
                  Join Now
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Toggle */}
        <button
          className="lg:hidden text-white text-2xl"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="lg:hidden fixed inset-0 z-[110] bg-[#000814] p-8"
          >
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-12">
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2">
                  <Logo />
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white"
                >
                  <FaTimes />
                </button>
              </div>

              <ul className="flex flex-col gap-6">
                {/* Mobile Cart — hidden when empty */}
                {currentUser?.accountType === "Student" && cart.length > 0 && (
                  <li>
                    <Link
                      to="/cart"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-2 text-2xl font-bold transition-all relative ${isActive("/cart") ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      <FaShoppingCart /> Cart
                      <span className="ml-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {cart.length}
                      </span>
                    </Link>
                  </li>
                )}
                {/* Mobile Wishlist — hidden when empty */}
                {currentUser?.accountType === "Student" && wishlist?.length > 0 && (
                  <li>
                    <Link
                      to="/dashboard/wishlist"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-2 text-2xl font-bold transition-all relative ${isActive("/dashboard/wishlist") ? 'text-pink-400' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      <FaHeart className={isActive("/dashboard/wishlist") ? 'text-pink-400' : ''} /> Wishlist
                      <span className="ml-2 w-6 h-6 bg-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {wishlist.length}
                      </span>
                    </Link>
                  </li>
                )}
                {currentLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`text-2xl font-bold transition-all ${isActive(link.path) ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-10 border-t border-white/10">
                {currentToken && currentUser ? (
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-cyan-500/30">
                        <img
                          src={currentUser?.image || `https://api.dicebear.com/5.x/initials/svg?seed=${currentUser?.firstName}`}
                          alt="User"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">{currentUser?.firstName} {currentUser?.lastName}</p>
                        <p className={`text-xs font-bold uppercase tracking-widest ${currentUser?.accountType?.toLowerCase() === 'instructor'
                            ? 'text-violet-400'
                            : currentUser?.accountType?.toLowerCase() === 'admin'
                              ? 'text-amber-400'
                              : 'text-cyan-400'
                          }`}>
                          {currentUser?.accountType === 'Instructor' ? 'Instructor Portal'
                            : currentUser?.accountType === 'Admin' ? 'Admin Portal'
                              : 'Student Portal'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full py-4 rounded-2xl bg-red-500/10 text-red-500 font-bold flex items-center justify-center gap-3 border border-red-500/20"
                    >
                      <FaSignOutAlt /> Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <Link
                      to="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full py-4 rounded-2xl bg-white/5 text-white font-bold text-center border border-white/10"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="btn-primary w-full py-4 text-center"
                    >
                      Join Now
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
