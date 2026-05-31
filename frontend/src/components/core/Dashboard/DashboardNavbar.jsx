import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaBell, 
  FaSearch, 
  FaGraduationCap, 
  FaBars, 
  FaTimes, 
  FaChevronDown,
  FaShoppingCart 
} from 'react-icons/fa';
import NotificationDropdown from '../../../components/common/NotificationDropdown';
import ProfileDropdown from '../../common/ProfileDropdown';
import useOnClickOutside from '../../../hooks/useOnClickOutside';

const DashboardNavbar = () => {
  const { user } = useSelector((state) => state.profile);
  const { cart } = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSectionNav = (id) => {
    // Map section ids to routes
    const routes = {
      "my-courses": "/dashboard/instructor/my-courses",
      "add-course": "/dashboard/instructor/add-course",
    };
    if (routes[id]) navigate(routes[id]);
  };

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns when clicking outside
  useOnClickOutside(notificationRef, () => setShowNotifications(false));
  useOnClickOutside(profileRef, () => setShowProfileMenu(false));

  const handleLogout = async () => {
    const { performLogout } = await import('../../../services/syncSupabaseSession');
    await performLogout(dispatch, navigate);
  };

  const [searchResults, setSearchResults] = useState([]);

  const dummyCourses = [
    { id: 1, title: "Modern JavaScript Masterclass", path: "/courses/javascript-es6" },
    { id: 2, title: "Python for Data Science", path: "/courses/data-science-python" },
    { id: 3, title: "UI/UX Design Essentials", path: "/courses/ui-ux-design-figma" },
    { id: 4, title: "React Development Bootcamp", path: "/courses/react-development" },
    { id: 5, title: "Full-Stack Web Development", path: "/courses/nodejs-express" },
  ];

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 1) {
      const filtered = dummyCourses.filter(course => 
        course.title.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      navigate(searchResults[0].path);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const baseMenuItems = [
    { id: 'home', name: 'Home', path: '/' },
    { id: 'explore-courses', name: 'Explore Courses', path: '/explore-courses' },
    { id: 'students', name: 'Students', path: '/students' },
    { id: 'about', name: 'About', path: '/about' },
    { id: 'contact', name: 'Contact', path: '/contact' },
  ];
  const menuItems = baseMenuItems.filter(
    (item) => !(item.name === 'Explore Courses' && ['Instructor', 'Student'].includes(user?.accountType))
  );

  const isActive = (id) => false; // We handle this via state now

  return (
    <nav className="sticky top-0 z-[100] w-full bg-[#000814]/80 backdrop-blur-md border-b border-white/5 py-4">
      <div className="container mx-auto px-6 flex justify-between items-center gap-8">
        
        {/* 1. SEARCH BAR SECTION (Left/Center) */}
        <div className="hidden md:flex flex-1 justify-start max-w-md relative group">
          <form onSubmit={handleSearch} className="w-full relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search your library..." 
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-12 pr-6 text-sm text-slate-300 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all"
            />
          </form>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 w-full mt-2 bg-[#000814] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[110]"
              >
                {searchResults.map((course) => (
                  <Link
                    key={course.id}
                    to={course.path}
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                      <FaGraduationCap className="text-sm" />
                    </div>
                    <span className="text-sm text-slate-300 group-hover:text-white font-medium">{course.title}</span>
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. NAVIGATION MENU (Right-Middle) */}
        <div className="hidden lg:flex items-center gap-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.path) {
                  navigate(item.path);
                } else {
                  handleSectionNav(item.id);
                }
              }}
              className={`text-sm font-bold tracking-wide transition-all duration-300 relative py-1 text-slate-400 hover:text-white`}
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* 4. ICONS & PROFILE SECTION (Right) */}
        <div className="flex items-center gap-5 shrink-0">
          {/* Cart Icon */}
          {user?.accountType === "Student" && cart.length > 0 && (
            <Link to="/cart" className="relative w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all group">
              <FaShoppingCart className="text-lg" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cart.length}
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
                setShowProfileMenu(false);
              }}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all relative"
            >
              <FaBell />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(0,180,216,0.8)]"></span>
            </button>

            <NotificationDropdown 
              isOpen={showNotifications} 
              onClose={() => setShowNotifications(false)} 
            />
          </div>

          {/* Profile Dropdown */}
          <div 
            className="relative" 
            ref={profileRef}
            onMouseEnter={() => setShowProfileMenu(true)}
            onMouseLeave={() => setShowProfileMenu(false)}
          >
            <button 
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-3 p-1.5 rounded-full bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all group"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.05)]">
                <img 
                  src={user?.image || `https://api.dicebear.com/5.x/initials/svg?seed=${user?.firstName}`} 
                  alt="avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <FaChevronDown className={`text-[10px] text-slate-500 mr-2 transition-transform duration-300 ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            <ProfileDropdown 
              isOpen={showProfileMenu} 
              onClose={() => setShowProfileMenu(false)} 
              user={user} 
              handleLogout={handleLogout} 
            />
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden text-white text-2xl ml-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden w-full bg-[#000814] border-t border-white/5 mt-4 overflow-hidden"
          >
            <div className="container mx-auto px-6 py-8 flex flex-col gap-6">
              {/* Mobile Search */}
              <div className="relative group">
                <form onSubmit={handleSearch} className="w-full relative">
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search courses..." 
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-sm text-slate-300 focus:outline-none focus:border-cyan-500/50"
                  />
                </form>

                {/* Mobile Search Results */}
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <div className="mt-2 bg-[#000814] border border-white/10 rounded-xl overflow-hidden shadow-xl">
                      {searchResults.map((course) => (
                        <Link
                          key={course.id}
                          to={course.path}
                          onClick={() => {
                            setSearchQuery("");
                            setSearchResults([]);
                            setIsMobileMenuOpen(false);
                          }}
                          className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                        >
                          <FaGraduationCap className="text-cyan-400 text-sm" />
                          <span className="text-sm text-slate-300 font-medium">{course.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Mobile Navigation */}
              <ul className="flex flex-col gap-4">
                {user?.accountType === "Student" && cart.length > 0 && (
                  <li>
                    <Link
                      to="/cart"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`text-lg font-bold block py-2 transition-all relative ${
                        isActive('/cart') ? 'text-cyan-400' : 'text-slate-400'
                      }`}
                    >
                      Cart ({cart.length})
                    </Link>
                  </li>
                )}
                {/* Show menu items for all users */}
                {menuItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.path || '#'}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        if (item.path) {
                          navigate(item.path);
                        }
                      }}
                      className={`text-lg font-bold block py-2 transition-all ${
                        location.pathname === item.path ? 'text-cyan-400' : 'text-slate-400'
                      }`}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default DashboardNavbar;
