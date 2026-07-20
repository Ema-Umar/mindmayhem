import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, Users, History, User, LogOut, ArrowLeft, Mail, Camera, 
  Edit2, Save, X, Trophy, Gamepad2, Loader, CheckCircle, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import '../Login/Home.css'; // Reuses your master workspace frame configuration
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Preserved Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    gamesWon: 0,
    winRate: 0,
    friendsCount: 0,
    roomsCreated: 0
  });

  const API_URL = 'http://localhost:5000/api';

  const avatarUrl = (userData) =>
    avatarPreview || userData?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userData?.username || 'default'}`;

  // Preserved logic: Fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        const userData = response.data.user;
        setUser(userData);
        setUsername(userData.username || '');
        setEmail(userData.email || '');
        setAvatarPreview(userData.avatar || '');
        
        setStats({
          gamesPlayed: userData.gamesPlayed || 0,
          gamesWon: userData.gamesWon || 0,
          winRate: userData.gamesPlayed > 0 ? Math.round((userData.gamesWon / userData.gamesPlayed) * 100) : 0,
          friendsCount: userData.friendsCount || 0,
          roomsCreated: userData.roomsCreated || 0
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Failed to load profile data');
      }
    } finally {
      setLoading(false);
    }
  }, [API_URL, navigate]);

  useEffect(() => {
    fetchUserData();
    
    // Preserved logic: Fetch friends count
    const fetchFriendsCount = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await axios.get(`${API_URL}/friends`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.data.success) {
          setStats(prev => ({
            ...prev,
            friendsCount: response.data.friends?.length || 0
          }));
        }
      } catch (error) {
        console.error('Error fetching friends count:', error);
      }
    };
    
    fetchFriendsCount();
  }, [API_URL, fetchUserData]);

  // Preserved logic: Handle avatar upload
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Preserved logic: Handle profile update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      if (showPasswordFields) {
        if (newPassword !== confirmNewPassword) {
          setError('New passwords do not match');
          setSaving(false);
          return;
        }
        if (newPassword.length > 0 && newPassword.length < 6) {
          setError('Password must be at least 6 characters');
          setSaving(false);
          return;
        }
        if (newPassword) {
          formData.append('currentPassword', currentPassword);
          formData.append('newPassword', newPassword);
        }
      }

      const response = await axios.put(
        `${API_URL}/profile/update`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setSuccess('Profile updated successfully!');
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setShowPasswordFields(false);
        setIsEditing(false);
        
        await fetchUserData();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Preserved logic: Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('currentRoom');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="dashboard-layout loading-state">
        <div className="loader-spinner">Loading Profile Framework...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Top Shared Navbar Layout */}
      <nav className="top-navigation-bar">
        <div className="brand-logo" onClick={() => navigate('/Home')}>
          Doodle<span>Up!</span>
        </div>
        
        <div className="center-menu-pills">
          <button className="menu-pill" onClick={() => navigate('/Home')}>
            <Home size={16} /> <span>Lobby</span>
          </button>
          <button className="menu-pill" onClick={() => navigate('/friends')}>
            <Users size={16} /> <span>Friends</span>
          </button>
          <button className="menu-pill" onClick={() => navigate('/history')}>
            <History size={16} /> <span>History</span>
          </button>
          <button className="menu-pill active" onClick={() => navigate('/profile')}>
            <User size={16} /> <span>Profile</span>
          </button>
          <button className="menu-pill logout-pill" onClick={handleLogout}>
            <LogOut size={16} /> <span>Logout</span>
          </button>
        </div>

        <div className="navbar-right-avatar">
          <img src={avatarUrl(user)} alt="Global Avatar" />
        </div>
      </nav>

      {/* Main Unified Workspace Content Block Frame */}
      <div className="dashboard-content-frame profile-view-frame">
        
        {/* Profile Info Header */}
        <div className="profile-identity-banner">
          <div className="profile-avatar-stack-wrapper">
            <img 
              src={avatarUrl(user)}
              alt={user?.username || 'Avatar'} 
              className="profile-master-avatar-img"
            />
            {isEditing && (
              <label className="avatar-upload-overlay-trigger">
                <Camera size={18} />
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          <div className="profile-identity-meta-info">
            <h2>{user?.username || 'ArtMaster'}</h2>
            <p className="level-xp-indicator">Level 12 · 850 / 1200 XP</p>
          </div>

          <div className="profile-banner-action-controls">
            {!isEditing ? (
              <button className="profile-action-btn edit" onClick={() => setIsEditing(true)}>
                <Edit2 size={16} /> Edit Profile
              </button>
            ) : (
              <button className="profile-action-btn cancel" onClick={() => {
                setIsEditing(false);
                setError('');
                setSuccess('');
                setShowPasswordFields(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
                fetchUserData();
              }}>
                <X size={16} /> Cancel
              </button>
            )}
          </div>
        </div>

        {/* Global Notification Feedback Alert Panels */}
        {error && (
          <div className="profile-feedback-alert-card error">
            <AlertCircle size={18} /> <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="profile-feedback-alert-card success">
            <CheckCircle size={18} /> <span>{success}</span>
          </div>
        )}

        {/* Triple Column Big Stats Card Displays */}
        <section className="profile-triple-stats-layout">
          <div className="stat-summary-card-cell">
            <span className="stat-card-numerical-value pink-accent">{stats.gamesPlayed}</span>
            <span className="stat-card-label-text">GAMES</span>
          </div>
          <div className="stat-summary-card-cell">
            <span className="stat-card-numerical-value magenta-accent">{stats.gamesWon}</span>
            <span className="stat-card-label-text">WINS</span>
          </div>
          <div className="stat-summary-card-cell">
            <span className="stat-card-numerical-value pink-accent">{stats.winRate}%</span>
            <span className="stat-card-label-text">WIN RATE</span>
          </div>
        </section>

        {/* Achievements Grid Block Section */}
        <section className="achievements-display-section">
          <h3>Achievements</h3>
          <div className="achievements-row-badge-grid">
            <div className="achievement-badge-cell active"><span className="badge-emoji">🏆</span></div>
            <div className="achievement-badge-cell active"><span className="badge-emoji">🎨</span></div>
            <div className="achievement-badge-cell"><span className="badge-emoji">⚡</span></div>
            <div className="achievement-badge-cell"><span className="badge-emoji">🔥</span></div>
            <div className="achievement-badge-cell"><span className="badge-emoji">👑</span></div>
            <div className="achievement-badge-cell"><span className="badge-emoji">🎯</span></div>
            <div className="achievement-badge-cell"><span className="badge-emoji">🌟</span></div>
            <div className="achievement-badge-cell"><span className="badge-emoji">💎</span></div>
          </div>
        </section>

        {/* Core Editable Options Form Panel Drawer */}
        {isEditing && (
          <form onSubmit={handleUpdateProfile} className="profile-settings-form-drawer">
            <div className="form-fields-twin-row-grid">
              <div className="form-input-field-group">
                <label><User size={14} /> Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="form-input-field-group">
                <label><Mail size={14} /> Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="password-accordion-wrapper">
              <button 
                type="button"
                className="accordion-toggle-trigger-btn"
                onClick={() => setShowPasswordFields(!showPasswordFields)}
              >
                {showPasswordFields ? 'Hide Password Options' : 'Modify Account Password'}
              </button>

              {showPasswordFields && (
                <div className="accordion-password-inputs-grid">
                  <div className="form-input-field-group">
                    <label>Current Password</label>
                    <input 
                      type="password" 
                      placeholder="Verify past credentials"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="form-input-field-group">
                    <label>New Password</label>
                    <input 
                      type="password" 
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="form-input-field-group">
                    <label>Confirm New Password</label>
                    <input 
                      type="password" 
                      placeholder="Repeat credentials exactly"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="form-commit-save-btn" disabled={saving}>
              {saving ? (
                <><Loader size={16} className="spinning" /> Applying updates...</>
              ) : (
                <><Save size={16} /> Save New Config</>
              )}
            </button>
          </form>
        )}

        {/* Lower Left Action Stack Block Footer */}
        <div className="profile-lower-footer-actions-tray">
          <button type="button" className="footer-logout-action-btn" onClick={handleLogout}>
            LOG OUT
          </button>
        </div>

      </div>
    </div>
  );
};

export default Profile;