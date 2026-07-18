import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../api/axios';
import {
  Home, Globe, Palmtree, Compass, Map, BarChart3, CalendarDays,
  ClipboardList, Mail, Lock, Settings, Users, LogOut, Menu, X,
  UserPlus, BookOpen, TrendingUp, Eye, PlusCircle, LayoutDashboard,
  Image, Star, MessageSquare
} from 'lucide-react';

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const loadProfileImage = () => {
    if (isAuthenticated) {
      profileAPI.get().then(res => {
        setProfileImage(res.data.profile_image || null);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    loadProfileImage();
    window.addEventListener('profile-updated', loadProfileImage);
    return () => window.removeEventListener('profile-updated', loadProfileImage);
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    setExpanded(false);
    setMobileOpen(false);
    navigate('/login');
  };

  const closeAll = () => {
    setExpanded(false);
    setMobileOpen(false);
  };

  const adminNavItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/home-editor', label: 'Home Editor', icon: Image },
    { to: '/admin/customers', label: 'Customers', icon: Users },
    { to: '/admin/tours', label: 'Manage Tours', icon: Globe },
    { to: '/admin/trips', label: 'Trips', icon: BookOpen },
    { to: '/admin/bookings', label: 'Bookings', icon: ClipboardList },
    { to: '/admin/attractions', label: 'Attractions', icon: Map },
    { to: '/admin/reviews', label: 'Reviews', icon: Star },
    { to: '/admin/tips', label: 'Tips', icon: BookOpen },
    { to: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
    { to: '/admin/messages', label: 'Messages', icon: MessageSquare },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const customerNavItems = [
    { to: '/', label: 'Home', icon: Home, exact: true },
    { to: '/tours', label: 'Browse Tours', icon: Globe },
    { to: '/tours/zanzibar', label: 'Zanzibar Tours', icon: Palmtree },
    { to: '/tours/tanzania', label: 'Tanzania Safaris', icon: Compass },
    { to: '/attractions', label: 'Attractions', icon: Map },
    { to: '/trips', label: 'Trips', icon: BookOpen },
    ...(isAuthenticated ? [
      { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
      { to: '/booking', label: 'Book a Tour', icon: CalendarDays },
      { to: '/bookings', label: 'My Bookings', icon: ClipboardList },
      { to: '/settings', label: 'Settings', icon: Settings },
    ] : []),
    { to: '/contact', label: 'Contact', icon: Mail },
  ];

  const navItems = isAdmin ? adminNavItems : customerNavItems;

  const NavIcon = ({ icon: Icon, size = 20 }) => (
    <Icon size={size} className="nav-svg-icon" />
  );

  return (
    <>
      <button className="mobile-menu-btn" onClick={() => { setExpanded(!expanded); setMobileOpen(!mobileOpen); }}>
        {expanded || mobileOpen ? <X size={20} color="white" /> : <Menu size={20} color="white" />}
      </button>

      <aside className={`sidebar ${expanded ? 'expanded' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
        onMouseEnter={() => { if (!mobileOpen) setExpanded(true); }}
        onMouseLeave={() => { if (!mobileOpen) setExpanded(false); }}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Plane size={24} className="logo-plane" />
            {expanded && <span className="logo-text">Tanzania Travel</span>}
          </div>
          {expanded && (
            <button className="collapse-btn" onClick={closeAll}>
              <X size={16} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact || item.to === '/admin/dashboard'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={closeAll}
            >
              <span className="nav-icon"><NavIcon icon={item.icon} /></span>
              {expanded && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}

          {isAdmin && expanded && (
            <>
              <div className="nav-section-title">Customer</div>
              {[
                { to: '/', label: 'View Site', icon: Eye },
                { to: '/tours', label: 'Browse Tours', icon: Globe },
              ].map((item) => (
                <NavLink key={item.to} to={item.to} end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeAll}>
                  <span className="nav-icon"><NavIcon icon={item.icon} /></span>
                  {expanded && <span className="nav-label">{item.label}</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          {isAuthenticated ? (
            <>
              <div className="sidebar-user">
                <div className="user-avatar">
                  {profileImage ? (
                    <img src={profileImage} alt="" className="avatar-img" />
                  ) : (
                    user?.username?.[0]?.toUpperCase() || 'U'
                  )}
                </div>
                {expanded && (
                  <div className="user-info">
                    <span className="user-name">{user?.username}</span>
                    <span className="user-email">{user?.email}</span>
                    {isAdmin && <span className="user-badge">Admin</span>}
                  </div>
                )}
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Logout">
                <LogOut size={16} />
                {expanded && <span>Logout</span>}
              </button>
            </>
          ) : (
            <div className="auth-buttons">
              <NavLink to="/login" className="auth-btn login-btn" onClick={closeAll}>
                <Lock size={14} />
                {expanded && <span>Login</span>}
              </NavLink>
              <NavLink to="/register" className="auth-btn register-btn" onClick={closeAll}>
                <UserPlus size={14} />
                {expanded && <span>Register</span>}
              </NavLink>
            </div>
          )}
        </div>
      </aside>

      {mobileOpen && <div className="sidebar-overlay" onClick={closeAll} />}
    </>
  );
}

function Plane({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
    </svg>
  );
}
