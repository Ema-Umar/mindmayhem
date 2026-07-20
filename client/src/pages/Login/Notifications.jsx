import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Bell, UserPlus, UserCheck, Gamepad2, Check, X, CheckCheck } from 'lucide-react';
import { connectSocket, getSocket } from '../../socket';
import './Notifications.css';

const API_URL = 'http://localhost:5000/api';

const timeAgo = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const iconFor = (type) => {
  if (type === 'friend_request') return <UserPlus size={20} />;
  if (type === 'friend_accept') return <UserCheck size={20} />;
  if (type === 'room_invite') return <Gamepad2 size={20} />;
  return <Bell size={20} />;
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [handledRequestIds, setHandledRequestIds] = useState(new Set());

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/notifications`, authHeaders());
      if (res.data.success) {
        let notifications = res.data.notifications || [];
        
        // Filter out notifications for requests that no longer exist
        const filteredNotifications = [];
        for (const notification of notifications) {
          if (notification.type === 'friend_request' && notification.data?.requestId) {
            try {
              const checkRes = await axios.get(`${API_URL}/friends/request/${notification.data.requestId}`, authHeaders());
              if (checkRes.data.exists) {
                filteredNotifications.push(notification);
              }
            } catch (error) {
              // Request doesn't exist, skip
              console.log('Skipping notification for non-existent request');
            }
          } else {
            filteredNotifications.push(notification);
          }
        }
        
        setNotifications(filteredNotifications);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadNotifications();
      setLoading(false);
    };
    init();

    const socket = connectSocket();
    if (socket) {
      socket.on('notification', (n) => {
        setNotifications(prev => [n, ...prev]);
      });
    }

    return () => {
      const s = getSocket();
      if (s) s.off('notification');
    };
  }, [loadNotifications]);

  // Mark notification as read - SINGLE DEFINITION
  const markRead = async (id) => {
    try {
      await axios.post(`${API_URL}/notifications/${id}/read`, {}, authHeaders());
      
      // Find the notification
      const notification = notifications.find(n => (n._id || n.id) === id);
      if (notification && notification.type === 'friend_request') {
        const requestId = notification.data?.requestId;
        if (requestId) {
          try {
            const response = await axios.get(`${API_URL}/friends/request/${requestId}`, authHeaders());
            if (!response.data.exists) {
              // Request no longer exists, delete notification
              await axios.delete(`${API_URL}/notifications/${id}`, authHeaders());
              setNotifications(prev => prev.filter(n => (n._id || n.id) !== id));
              return;
            }
          } catch (error) {
            setNotifications(prev => prev.filter(n => (n._id || n.id) !== id));
            return;
          }
        }
      }
      
      setNotifications(prev => prev.map(n => (n._id || n.id) === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  // Mark all as read
  const markAllRead = async () => {
    try {
      await axios.post(`${API_URL}/notifications/read-all`, {}, authHeaders());
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  // Respond to friend request
  const respondToFriendRequest = async (notification, accept) => {
    const requestId = notification.data?.requestId;
    if (!requestId) return;
    
    try {
      await axios.post(`${API_URL}/friends/${accept ? 'accept' : 'reject'}/${requestId}`, {}, authHeaders());
      setHandledRequestIds(prev => new Set(prev).add(requestId));
      
      // Remove the notification from the list
      setNotifications(prev => prev.filter(n => (n._id || n.id) !== (notification._id || notification.id)));
      
      // Refresh notifications to get updated list
      await loadNotifications();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to respond to request');
    }
  };

  // Join room from notification
  const joinRoom = (notification) => {
    markRead(notification._id || notification.id);
    navigate(`/room/${notification.data.roomId}`);
  };

  if (loading) {
    return (
      <div className="notifications-page-wrapper loading">
        <div className="loader">Loading notifications...</div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="notifications-page-wrapper">
      <div className="notifications-container">
        <header className="notifications-header">
          <button className="back-btn" onClick={() => navigate('/Home')}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1>Notifications</h1>
          {unreadCount > 0 && (
            <button className="mark-all-btn" onClick={markAllRead}>
              <CheckCheck size={16} /> Mark all read
            </button>
          )}
        </header>

        {notifications.length === 0 ? (
          <div className="empty-notifications">
            <Bell size={40} />
            <p>No notifications yet</p>
            <p className="muted-line">Friend requests and room invites will show up here.</p>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map((n) => {
              const id = n._id || n.id;
              const isHandledRequest = n.type === 'friend_request' && handledRequestIds.has(n.data?.requestId);

              return (
                <div
                  key={id}
                  className={`notification-row ${n.isRead ? '' : 'unread'}`}
                  onClick={() => !n.isRead && markRead(id)}
                >
                  <div className={`notification-icon type-${n.type}`}>{iconFor(n.type)}</div>
                  <div className="notification-body">
                    <p className="notification-message">{n.message}</p>
                    <span className="notification-time">{timeAgo(n.createdAt)}</span>

                    {n.type === 'friend_request' && !isHandledRequest && (
                      <div className="notification-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="accept-btn" onClick={() => respondToFriendRequest(n, true)}>
                          <Check size={14} /> Accept
                        </button>
                        <button className="decline-btn" onClick={() => respondToFriendRequest(n, false)}>
                          <X size={14} /> Decline
                        </button>
                      </div>
                    )}

                    {n.type === 'room_invite' && (
                      <div className="notification-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="join-btn" onClick={() => joinRoom(n)}>
                          <Gamepad2 size={14} /> Join Room
                        </button>
                      </div>
                    )}
                  </div>
                  {!n.isRead && <span className="unread-dot" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;