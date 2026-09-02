import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Share2,
  Settings,
  Copy,
  Check,
  Crown,
  UserPlus
} from 'lucide-react';
import { connectSocket, getSocket } from '../../socket';
import './GameRoom.css';

const API_URL = 'http://localhost:5000/api';

const GameRoom = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [user, setUser] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [readyStatus, setReadyStatus] = useState({});
  const [gameStarting, setGameStarting] = useState(false);
  const [startError, setStartError] = useState('');

  const [showInviteDrawer, setShowInviteDrawer] = useState(false);
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [invitedIds, setInvitedIds] = useState(new Set());
  const [invitingId, setInvitingId] = useState(null);
  const [inviteError, setInviteError] = useState('');

  // Used to prevent the room-leave request when intentionally
  // navigating to the gameplay screen (or when we've already left
  // explicitly via the back button).
  const leavingIntentionally = useRef(false);

  const authHeaders = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });

  // ============================================
  // FETCH THE REAL ROOM FROM THE SERVER
  // ============================================
  useEffect(() => {
    // isInitial controls the full-page loading state. The 3s background
    // poll must NOT flip loading back to true, or the whole player list
    // flashes to "Loading Room Pipeline..." every 3 seconds.
    const fetchRoomData = async (isInitial = false) => {
      try {
        if (isInitial) {
          setLoading(true);
          setError('');
        }

        const token = localStorage.getItem('token');

        if (!token) {
          navigate('/login');
          return;
        }

        const storedUser = JSON.parse(
          localStorage.getItem('user') || '{}'
        );

        setUser(storedUser);

        const res = await axios.get(
          `${API_URL}/rooms/${roomId}`,
          authHeaders()
        );

        if (!res.data.success) {
          setError('Room not found.');
          return;
        }

        const foundRoom = res.data.room;

        setRoom(foundRoom);
        localStorage.setItem(
          'currentRoom',
          JSON.stringify(foundRoom)
        );

        // Server's players[].id may be populated as:
        // {_id, username, avatar}
        const storedUserId =
          storedUser.id || storedUser._id;

        const formattedPlayers = (foundRoom.players || []).map((p) => {
          const playerId = p.id?._id || p.id;

          return {
            id: String(playerId),
            name:
              p.username ||
              p.id?.username ||
              'Player',
            avatarSeed:
              p.username ||
              p.id?.username ||
              'Player',
            isHost: p.isHost || false,
            isReady:
              p.isReady !== undefined
                ? p.isReady
                : false,
            isYou:
              String(playerId) === String(storedUserId)
          };
        });

        setPlayers(formattedPlayers);

        const hostId =
          foundRoom.host?._id ||
          foundRoom.host;

        setIsHost(
          !!hostId &&
          !!storedUserId &&
          String(hostId) === String(storedUserId)
        );

        const readyMap = {};

        formattedPlayers.forEach((p) => {
          readyMap[p.id] = p.isReady;
        });

        setReadyStatus(readyMap);
      } catch (err) {
        console.error('Error fetching room:', err);

        // Only surface a full-page error on the initial load. If a
        // background poll fails transiently, don't nuke the UI the
        // player is currently looking at.
        if (isInitial) {
          setError(
            err.response?.data?.message ||
            'Failed to load room data.'
          );
        }
      } finally {
        if (isInitial) setLoading(false);
      }
    };

    fetchRoomData(true);

    // Re-poll every 3 seconds so players joining from
    // another browser appear automatically.
    const interval = setInterval(
      () => fetchRoomData(false),
      3000
    );

    return () => clearInterval(interval);
  }, [roomId, navigate]);

  // ============================================
  // LOAD ONLINE FRIENDS
  // ============================================
  useEffect(() => {
    const loadOnlineFriends = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/friends`,
          authHeaders()
        );

        if (res.data.success) {
          setOnlineFriends(
            (res.data.friends || []).filter(
              (f) => f.isOnline
            )
          );
        }
      } catch (err) {
        console.error(
          'Failed to load friends:',
          err
        );
      }
    };

    loadOnlineFriends();

    const socket = connectSocket();

    if (socket) {
      socket.on(
        'friend-online',
        loadOnlineFriends
      );

      socket.on(
        'friend-offline',
        loadOnlineFriends
      );
    }

    return () => {
      const s = getSocket();

      if (s) {
        s.off(
          'friend-online',
          loadOnlineFriends
        );

        s.off(
          'friend-offline',
          loadOnlineFriends
        );
      }
    };
  }, []);

  // ============================================
  // INVITE FRIEND
  // ============================================
  const handleInviteFriend = async (friendId) => {
    setInvitingId(friendId);
    setInviteError('');

    try {
      await axios.post(
        `${API_URL}/rooms/${roomId}/invite/${friendId}`,
        {},
        authHeaders()
      );

      setInvitedIds(
        (prev) => new Set(prev).add(friendId)
      );
    } catch (err) {
      console.error(
        'Invite error:',
        err
      );

      setInviteError(
        err.response?.data?.message ||
        'Failed to send invite.'
      );
    } finally {
      setInvitingId(null);
    }
  };

  // ============================================
  // PLAYER READY HELPERS
  // ============================================
  const allPlayersReady = () =>
    players.length > 0 &&
    players.every((p) => p.isReady);

  const hasMinimumPlayers = () =>
    players.length >= 2;

  // ============================================
  // START GAME
  // ============================================
  const handleStartGame = async () => {
    if (
      !allPlayersReady() ||
      !hasMinimumPlayers()
    ) {
      return;
    }

    setGameStarting(true);
    setStartError('');

    try {
      await axios.post(
        `${API_URL}/rooms/${roomId}/start`,
        {},
        authHeaders()
      );

      // We are intentionally leaving the room
      // and entering the gameplay screen.
      leavingIntentionally.current = true;

      navigate(
        `/gameplay/${roomId}`,
        {
          state: {
            roomId,
            players
          }
        }
      );
    } catch (err) {
      console.error(
        'Start game error:',
        err
      );

      setStartError(
        err.response?.data?.message ||
        'Failed to start game.'
      );

      setGameStarting(false);
    }
  };

  // ============================================
  // LEAVE ROOM (explicit only — see handleLeaveRoom below)
  // ============================================
  // IMPORTANT: We intentionally do NOT call POST /leave from this
  // effect's cleanup function. In React 18 StrictMode (dev mode),
  // every component is mounted, unmounted, and re-mounted once as a
  // safety check. That means an unmount-triggered "leave" call fires
  // immediately after the room is created/joined, deleting it before
  // the player ever sees it. Leaving must only happen from an
  // explicit user action (back button) or on real tab close (beacon).
  useEffect(() => {
    const leaveRoomOnUnload = () => {
      const token = localStorage.getItem('token');

      if (!token || !roomId) {
        return;
      }

      // Handles browser/tab closing. sendBeacon fires reliably during
      // unload without blocking navigation, and doesn't support custom
      // headers, so the token is sent in the body instead.
      navigator.sendBeacon(
        `${API_URL}/rooms/${roomId}/leave-beacon`,
        new Blob(
          [
            JSON.stringify({
              token
            })
          ],
          {
            type: 'application/json'
          }
        )
      );
    };

    window.addEventListener(
      'beforeunload',
      leaveRoomOnUnload
    );

    return () => {
      window.removeEventListener(
        'beforeunload',
        leaveRoomOnUnload
      );
    };
  }, [roomId]);

  // Explicit leave — called from the back button. This is the only
  // path (besides tab close) that should ever hit POST /leave.
  const handleLeaveRoom = async () => {
    if (!leavingIntentionally.current) {
      leavingIntentionally.current = true;

      try {
        await axios.post(
          `${API_URL}/rooms/${roomId}/leave`,
          {},
          authHeaders()
        );
      } catch (err) {
        console.error('Leave room error:', err);
      }
    }

    navigate('/Home');
  };

  // ============================================
  // COPY ROOM CODE
  // ============================================
  const handleCopyCode = () => {
    const code =
      room?.roomCode || 'XXXXXX';

    navigator.clipboard.writeText(code);

    setCopied(true);

    setTimeout(
      () => setCopied(false),
      2000
    );
  };

  // ============================================
  // SHARE ROOM
  // ============================================
  const handleShareRoom = async () => {
    const roomLink =
      `${window.location.origin}/room/${roomId}`;

    const code =
      room?.roomCode || 'XXXXXX';

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join my room',
          text: `Join with code: ${code}`,
          url: roomLink
        });
      } else {
        await navigator.clipboard.writeText(
          `Join: ${roomLink}\nCode: ${code}`
        );

        setCopied(true);

        setTimeout(
          () => setCopied(false),
          2000
        );
      }
    } catch (err) {
      console.log('Share error');
    }
  };

  // ============================================
  // READY TOGGLE
  // ============================================
  const handleToggleReady = async () => {
    const userId =
      user?.id || user?._id;

    if (!userId) {
      return;
    }

    const newReadyStatus =
      !readyStatus[userId];

    // Optimistically update UI.
    setReadyStatus((prev) => ({
      ...prev,
      [userId]: newReadyStatus
    }));

    setPlayers((prev) =>
      prev.map((p) =>
        p.id === String(userId)
          ? {
              ...p,
              isReady: newReadyStatus
            }
          : p
      )
    );

    try {
      await axios.post(
        `${API_URL}/rooms/${roomId}/ready`,
        {
          isReady: newReadyStatus
        },
        authHeaders()
      );
    } catch (err) {
      console.error(
        'Toggle ready error:',
        err
      );

      // Roll back if request fails.
      setReadyStatus((prev) => ({
        ...prev,
        [userId]: !newReadyStatus
      }));

      setPlayers((prev) =>
        prev.map((p) =>
          p.id === String(userId)
            ? {
                ...p,
                isReady: !newReadyStatus
              }
            : p
        )
      );
    }
  };

  // ============================================
  // LOADING / ERROR STATES
  // ============================================
  if (loading) {
    return (
      <div className="std-lobby-container central-status">
        Loading Room Pipeline...
      </div>
    );
  }

  if (error) {
    return (
      <div className="std-lobby-container central-status">
        {error}
      </div>
    );
  }

  // ============================================
  // MAIN UI
  // ============================================
  return (
    <div className="std-lobby-container">

      {/* NAVBAR */}
      <header className="std-lobby-navbar">
        <button
          className="std-nav-icon-btn"
          onClick={handleLeaveRoom}
        >
          <ArrowLeft size={24} />
        </button>

        <div className="std-nav-right-actions">

          <button
            className="std-nav-icon-btn"
            onClick={() =>
              setShowInviteDrawer(true)
            }
          >
            <UserPlus size={22} />
          </button>

          <button
            className="std-nav-icon-btn"
            onClick={handleShareRoom}
          >
            <Share2 size={22} />
          </button>

          <button
            className="std-nav-icon-btn"
            onClick={() =>
              alert('Settings coming soon!')
            }
          >
            <Settings size={22} />
          </button>

        </div>
      </header>

      <div className="std-lobby-centered-content">

        {/* ROOM TITLE */}
        <div className="std-lobby-identity-block">
          <Crown
            size={28}
            className="std-brand-crown"
          />

          <h1 className="std-room-heading-title">
            {room?.roomName || 'FUN ROOM'}
          </h1>
        </div>

        {/* ROOM CODE */}
        <div className="std-code-wrapper-stack">
          <span className="std-code-subheading-label">
            ROOM CODE
          </span>

          <div
            className="std-code-interactive-pill"
            onClick={handleCopyCode}
          >
            <span className="std-code-chars">
              {room?.roomCode || 'XXXXXX'}
            </span>

            {copied ? (
              <Check
                size={16}
                className="cyan-tick"
              />
            ) : (
              <Copy size={16} />
            )}
          </div>
        </div>

        {/* PLAYERS COUNT */}
        <div className="std-players-count-row">
          <h3>
            Players{' '}
            <span className="count-muted">
              (
              {players.length}/
              {room?.maxPlayers || 10}
              )
            </span>
          </h3>
        </div>

        {/* PLAYERS LIST */}
        <div className="std-players-vertical-list">

          {players.map((player) => {
            const isReady =
              readyStatus[player.id] ||
              false;

            return (
              <div
                key={player.id}
                className={`std-player-row-card ${
                  player.isYou
                    ? 'self-identity'
                    : ''
                }`}
              >

                <div className="std-player-row-left">

                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${
                      player.avatarSeed ||
                      player.name
                    }`}
                    alt={player.name}
                    className="std-player-circle-avatar"
                  />

                  <span className="std-player-label-name">
                    {player.name}{' '}
                    {player.isYou &&
                      '(You)'}
                  </span>

                </div>

                {/*
                  FIX: previously this showed "ROOM OWNER" instead of
                  the ready state whenever player.isHost was true, so
                  the host's row could never show READY/NOT READY.
                  Now the crown is a small badge alongside the real
                  ready state, for every player including the host.
                */}
                <div className="std-player-row-right">

                  {player.isHost && (
                    <Crown
                      size={14}
                      className="std-host-crown-icon"
                      title="Room Owner"
                    />
                  )}

                  {isReady ? (
                    <span className="std-row-status-text ready-tag">
                      READY
                    </span>
                  ) : (
                    <span className="std-row-status-text waiting-tag">
                      NOT READY
                    </span>
                  )}

                </div>

              </div>
            );
          })}

        </div>

        {/* BOTTOM ACTIONS */}
        <div className="std-lobby-lower-footer-trigger-block">

          <p className="std-waiting-ticker-message">
            {room?.status === 'playing'
              ? 'Game in progress...'
              : allPlayersReady()
              ? 'Ready to launch sequence!'
              : 'Waiting for players...'}
          </p>

          {startError && (
            <p className="drawer-fallback">
              {startError}
            </p>
          )}

          {/* READY BUTTON */}
          <button
            className={`std-bottom-action-btn action-active ${
              readyStatus[
                user?.id || user?._id
              ]
                ? 'user-ready-state'
                : ''
            }`}
            onClick={handleToggleReady}
            style={{
              marginBottom: '0.75rem'
            }}
          >
            {readyStatus[
              user?.id || user?._id
            ]
              ? 'NOT READY'
              : 'READY TO PLAY'}
          </button>

          {/* START GAME BUTTON */}
          <button
            className={`std-bottom-action-btn ${
              allPlayersReady()
                ? 'action-active'
                : ''
            }`}
            onClick={handleStartGame}
            disabled={
              !allPlayersReady() ||
              players.length < 2 ||
              gameStarting
            }
          >
            {gameStarting
              ? 'STARTING...'
              : 'START GAME'}
          </button>

        </div>

      </div>

      {/* ============================================
          INVITE DRAWER
          ============================================ */}
      {showInviteDrawer && (
        <div
          className="std-drawer-back-blur"
          onClick={() =>
            setShowInviteDrawer(false)
          }
        >

          <div
            className="std-drawer-panel-surface"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="std-drawer-header-row">

              <h3>
                Invite Online Networks
              </h3>

              <button
                className="std-drawer-close"
                onClick={() =>
                  setShowInviteDrawer(false)
                }
              >
                ×
              </button>

            </div>

            {inviteError && (
              <p className="drawer-fallback">
                {inviteError}
              </p>
            )}

            <div className="std-drawer-list-scroller">

              {onlineFriends.length === 0 ? (
                <p className="drawer-fallback">
                  All connections offline.
                </p>
              ) : (
                onlineFriends.map((f) => (
                  <div
                    key={f._id}
                    className="std-drawer-invite-row"
                  >

                    <span>
                      {f.username}
                    </span>

                    <button
                      className="std-drawer-send-btn"
                      onClick={() =>
                        handleInviteFriend(
                          f._id
                        )
                      }
                      disabled={
                        invitedIds.has(
                          f._id
                        ) ||
                        invitingId === f._id
                      }
                    >
                      {invitedIds.has(f._id)
                        ? 'Sent'
                        : invitingId === f._id
                        ? 'Sending...'
                        : 'Invite'}
                    </button>

                  </div>
                ))
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default GameRoom;
