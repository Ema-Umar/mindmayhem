import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Home, Users, History, User, LogOut, Search, UserPlus, Check, X, Clock } from 'lucide-react';
import { connectSocket, getSocket, disconnectSocket } from '../../socket';
import './Friends.css';

const API_URL = 'http://localhost:5000/api';

const avatarUrl = (user) =>
  user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || 'default'}`;

const FriendsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [requestingIds, setRequestingIds] = useState(new Set());
  const debounceRef = useRef(null);

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const loadUserData = useCallback(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const loadFriendsData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/friends`, authHeaders());
      if (res.data.success) {
        setFriends(res.data.friends || []);
        setIncoming(res.data.incomingRequests || []);
        setOutgoing(res.data.outgoingRequests || []);
      }
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  }, []);

  const loadSuggestions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/users/suggestions`, authHeaders());
      if (res.data.success) setSuggestions(res.data.users || []);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      loadUserData();
      await Promise.all([loadFriendsData(), loadSuggestions()]);
      setLoading(false);
    };
    init();

    const socket = connectSocket();
    if (socket) {
      socket.on('friend-online', () => loadFriendsData());
      socket.on('friend-offline', () => loadFriendsData());
      socket.on('notification', (n) => {
        if (n.type === 'friend_request' || n.type === 'friend_accept') {
          loadFriendsData();
          loadSuggestions();
        }
      });
    }

    return () => {
      const s = getSocket();
      if (s) {
        s.off('friend-online');
        s.off('friend-offline');
        s.off('notification');
      }
    };
  }, [loadFriendsData, loadSuggestions, loadUserData]);

  // Debounced live search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_URL}/users/search`, {
          ...authHeaders(),
          params: { q: query.trim() }
        });
        if (res.data.success) setSearchResults(res.data.users || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const sendRequest = async (userId) => {
    setRequestingIds(prev => new Set(prev).add(userId));
    try {
      await axios.post(`${API_URL}/friends/request/${userId}`, {}, authHeaders());
      setSearchResults(prev => prev.filter(u => u._id !== userId));
      setSuggestions(prev => prev.filter(u => u._id !== userId));
      await loadFriendsData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send friend request');
    } finally {
      setRequestingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const respondToRequest = async (requestId, accept) => {
    try {
      await axios.post(`${API_URL}/friends/${accept ? 'accept' : 'reject'}/${requestId}`, {}, authHeaders());
      await loadFriendsData();
      await loadSuggestions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to respond to request');
    }
  };

  const cancelRequest = async (requestId) => {
    try {
      await axios.delete(`${API_URL}/friends/request/${requestId}`, authHeaders());
      await loadFriendsData();
      await loadSuggestions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel request');
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    localStorage.clear();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="dashboard-layout loading-state">
        <div className="loader-spinner">Loading Crew...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Unified Top Navigation Bar */}
      <nav className="top-navigation-bar">
        <div className="brand-logo" onClick={() => navigate('/Home')}>
          MindMey<span>Hem</span>
        </div>
        
        <div className="center-menu-pills">
          <button className="menu-pill" onClick={() => navigate('/Home')}>
            <Home size={16} /> <span>Lobby</span>
          </button>
          <button className="menu-pill active" onClick={() => navigate('/friends')}>
            <Users size={16} /> <span>Friends</span>
          </button>
          <button className="menu-pill" onClick={() => navigate('/history')}>
            <History size={16} /> <span>History</span>
          </button>
          <button className="menu-pill" onClick={() => navigate('/profile')}>
            <User size={16} /> <span>Profile</span>
          </button>
          <button className="menu-pill logout-pill" onClick={handleLogout}>
            <LogOut size={16} /> <span>Logout</span>
          </button>
        </div>

        <div className="navbar-right-avatar">
          <img src={avatarUrl(user)} alt="User Profile" />
        </div>
      </nav>

      {/* Main Workspace Frame */}
      <div className="dashboard-content-frame spec-friends-view">
        <header className="friends-title-section">
          <h1>Friends</h1>
          <p>Your doodle crew</p>
        </header>

        {/* Live Search Discovery Input */}
        <div className="friends-utility-row">
          <div className="friends-search-input-wrapper">
            <Search size={18} className="search-inline-icon" />
            <input
              type="text"
              placeholder="Search by username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Live Search Discovery Panel */}
        {query.trim() && (
          <div className="search-results-overlay-card">
            <h3 className="section-subtitle">Search Results</h3>
            {searching ? (
              <p className="status-placeholder-msg">Searching network database...</p>
            ) : searchResults.length === 0 ? (
              <p className="status-placeholder-msg">No users found matching "{query}"</p>
            ) : (
              <div className="two-column-rooms-grid">
                {searchResults.map(u => (
                  <div key={u._id} className="grid-room-card-cell">
                    <div className="card-left-identity-group">
                      <img src={avatarUrl(u)} alt={u.username} className="friends-grid-avatar-img" />
                      <div className="card-room-meta-details">
                        <h4>{u.username}</h4>
                        <p>{u.isOnline ? 'Online' : 'Offline'}</p>
                      </div>
                    </div>
                    <button
                      className="grid-join-action-btn"
                      onClick={() => sendRequest(u._id)}
                      disabled={requestingIds.has(u._id)}
                    >
                      {requestingIds.has(u._id) ? 'Sending...' : 'Add Friend'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Incoming & Outgoing Requests Summary Banner */}
        {(incoming.length > 0 || outgoing.length > 0) && (
          <div className="friends-secondary-flex-grid">
            {incoming.length > 0 && (
              <div className="secondary-panel-card">
                <div className="sec-header">
                  <Clock size={16} /> <h4>Friend Requests ({incoming.length})</h4>
                </div>
                {incoming.map(r => (
                  <div key={r.id} className="sec-list-item-row">
                    <div className="item-left">
                      <img src={avatarUrl(r.user)} alt="User" />
                      <span>{r.user.username}</span>
                    </div>
                    <div className="item-actions">
                      <button className="icon-action-pill accept" onClick={() => respondToRequest(r.id, true)}>
                        <Check size={14} />
                      </button>
                      <button className="icon-action-pill reject" onClick={() => respondToRequest(r.id, false)}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {outgoing.length > 0 && (
              <div className="secondary-panel-card">
                <div className="sec-header">
                  <Clock size={16} /> <h4>Sent Requests ({outgoing.length})</h4>
                </div>
                {outgoing.map(r => (
                  <div key={r.id} className="sec-list-item-row">
                    <div className="item-left">
                      <img src={avatarUrl(r.user)} alt="User" />
                      <span>{r.user.username}</span>
                    </div>
                    <button className="sec-action-txt-btn cancel" onClick={() => cancelRequest(r.id)}>
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Friends Grid Block */}
        <section className="active-rooms-grid-wrapper">
          <div className="rooms-section-headline">
            <h3>Your Friends ({friends.length})</h3>
          </div>
          <div className="two-column-rooms-grid">
            {friends.length === 0 ? (
              <div className="empty-friends-card-notice">
                <p>You haven't added any friends yet.</p>
              </div>
            ) : (
              friends.map(f => (
                <div key={f._id} className="grid-room-card-cell">
                  <div className="card-left-identity-group">
                    <div className="friends-avatar-status-wrapper">
                      <img src={avatarUrl(f)} alt={f.username} className="friends-grid-avatar-img" />
                      <span className={`friends-inline-pulse-dot ${f.isOnline ? 'active-on' : 'active-off'}`} />
                    </div>
                    <div className="card-room-meta-details">
                      <h4>{f.username}</h4>
                      <p className="friends-status-desc-text">
                        {f.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                  <button className="grid-join-action-btn" onClick={() => navigate('/Home')}>
                    INVITE
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Suggested Players Grid Block */}
        <section className="active-rooms-grid-wrapper" style={{ marginTop: '1rem' }}>
          <div className="rooms-section-headline">
            <h3>Suggested Players</h3>
          </div>
          <div className="two-column-rooms-grid">
            {suggestions.length === 0 ? (
              <div className="empty-friends-card-notice">
                <p>No new user suggestions right now.</p>
              </div>
            ) : (
              suggestions.map(u => (
                <div key={u._id} className="grid-room-card-cell">
                  <div className="card-left-identity-group">
                    <div className="friends-avatar-status-wrapper">
                      <img src={avatarUrl(u)} alt={u.username} className="friends-grid-avatar-img" />
                      {u.isOnline && <span className="friends-inline-pulse-dot active-on" />}
                    </div>
                    <div className="card-room-meta-details">
                      <h4>{u.username}</h4>
                      <p>{u.isOnline ? 'Online' : 'Offline'}</p>
                    </div>
                  </div>
                  <button
                    className="grid-join-action-btn"
                    onClick={() => sendRequest(u._id)}
                    disabled={requestingIds.has(u._id)}
                  >
                    {requestingIds.has(u._id) ? 'SENDING...' : 'ADD'}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default FriendsPage;