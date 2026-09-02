import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Pencil, Eraser, Trash2, Send, Trophy, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { connectSocket, getSocket } from '../../socket';
import TruthDareScreen from './TruthDareScreen';
import './GamePlay.css';

const ROUND_DURATION = 60; // MUST match ROUND_DURATION in Server.js
const MIN_GUESS_SCORE = 100;
const FIRST_GUESS_BONUS = 200;
const FAST_GUESS_WINDOW = 10;
const FAST_GUESS_BONUS = 150;

const WORDS_BY_DIFFICULTY = {
  easy: ['CAT', 'DOG', 'HOUSE', 'CAR', 'APPLE', 'TREE', 'SUN', 'BOOK', 'PHONE', 'BALLOON', 'FISH', 'STAR']
};
const getWordChoices = (count = 3) => {
  const pool = [...WORDS_BY_DIFFICULTY.easy];
  const choices = [];
  while (choices.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    choices.push(pool.splice(idx, 1)[0]);
  }
  return choices;
};

const normalizeGuess = (text) =>
  text.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
const guessMatches = (guess, answer) => {
  const g = normalizeGuess(guess);
  const a = normalizeGuess(answer);
  if (g === a) return true;
  if (g === a + 's' || g + 's' === a) return true;
  return false;
};

const API_URL = 'http://localhost:5000/api';

const GamePlay = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#ef4444');
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [guessText, setGuessText] = useState('');
  const [players, setPlayers] = useState([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(5);
  const [isSolo, setIsSolo] = useState(true);
  const [wordToDraw, setWordToDraw] = useState('');
  const [wordChoices, setWordChoices] = useState([]);
  const [currentArtistId, setCurrentArtistId] = useState(null);
  const [scores, setScores] = useState({});
  const [roundScores, setRoundScores] = useState({});
  const [correctGuessers, setCorrectGuessers] = useState([]);
  const [tokens, setTokens] = useState({});
  const [guesses, setGuesses] = useState([]);
  // gameState: 'connecting' | 'wordSelect' | 'playing' | 'roundEnd' | 'reward' | 'gameOver'
  const [gameState, setGameState] = useState('connecting');
  const [roundEndMessage, setRoundEndMessage] = useState('');
  const [roundWinnerId, setRoundWinnerId] = useState(null);
  // Overall game winner (highest total score once ALL rounds are done) —
  // this is who gets to hand out the truth-or-dare, NOT the per-round winner.
  const [gameWinnerId, setGameWinnerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const myUserRef = useRef(JSON.parse(localStorage.getItem('user') || '{}'));
  const myId = myUserRef.current.id || myUserRef.current._id;
  const artistIndexRef = useRef(0); // solo-only bookkeeping

  const isArtist = currentArtistId === myId;
  const me = players.find(p => (p.id === myId));
  const alreadyGuessed = correctGuessers.includes(myId);

  // ============================================
  // SOCKET SETUP
  // ============================================
  useEffect(() => {
    const socketInstance = connectSocket();
    setSocket(socketInstance);
    if (!socketInstance) { setLoading(false); return; }

    socketInstance.on('connect', () => setIsConnected(true));
    socketInstance.on('disconnect', () => setIsConnected(false));

    // Full state sync — sent once when we join, also covers mid-game joins
    socketInstance.on('game-state-sync', (state) => {
      applyServerState(state);
      if (state.wordChoices) setWordChoices(state.wordChoices);
      if (state.word) setWordToDraw(state.word);
      setLoading(false);
    });

    socketInstance.on('round-started', (state) => {
      applyServerState(state);
      setGuesses([]);
      setRoundEndMessage('');
      clearCanvas();
    });

    socketInstance.on('guess-result', (g) => {
      setGuesses(prev => [{ player: g.playerName, guess: g.isCorrect ? g.guess : g.guess, isCorrect: g.isCorrect, points: g.points }, ...prev]);
      if (g.isCorrect) {
        setCorrectGuessers(prev => prev.includes(g.playerId) ? prev : [...prev, g.playerId]);
        setRoundEndMessage(`🎉 ${g.playerName} guessed it! +${g.points} points!`);
      }
    });

    socketInstance.on('chat-message', (data) => {
      setGuesses(prev => [{ player: data.playerName, guess: data.message, isCorrect: false, isChat: true }, ...prev]);
    });

    socketInstance.on('drawing-data', (data) => drawOnCanvas(data));

    socketInstance.on('round-ended', (state) => {
      applyServerState(state);
      setWordToDraw(state.word);
      setRoundWinnerId(state.roundWinnerId);
      if (state.reason === 'timeout') setRoundEndMessage(`⏰ Time is up! The word was ${state.word}`);
      setGameState('roundEnd');
    });

    socketInstance.on('next-round-ready', (state) => {
      applyServerState(state);
      setWordToDraw('');
      if (state.wordChoices) setWordChoices(state.wordChoices);
      setGuesses([]);
      setRoundEndMessage('');
      setRoundWinnerId(null);
      clearCanvas();
    });

    // The FINAL round just ended and the server has already deleted its
    // in-memory state for this room. Figure out the overall winner from
    // the final scores in this payload (NOT the per-round roundWinnerId),
    // then — for multiplayer games with 2+ players — let them do one
    // truth-or-dare before showing the final results. Solo games and
    // games that somehow only have 1 player skip straight to results.
    socketInstance.on('game-over', (state) => {
      applyServerState(state);

      const finalScores = state.scores || {};
      let winnerId = null;
      let winnerScore = -1;
      Object.entries(finalScores).forEach(([pid, pts]) => {
        if (pts > winnerScore) {
          winnerScore = pts;
          winnerId = pid;
        }
      });
      setGameWinnerId(winnerId);

      updateGameStats((finalScores[myId] || 0) > 0);

      if ((state.players?.length || 0) >= 2) {
        setGameState('reward');
      } else {
        setGameState('gameOver');
      }
    });

    socketInstance.on('player-joined-game', () => {
      // Lightweight — a full roster refresh isn't critical mid-round;
      // players list already came from game-state-sync.
    });

    return () => {
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      socketInstance.off('game-state-sync');
      socketInstance.off('round-started');
      socketInstance.off('guess-result');
      socketInstance.off('chat-message');
      socketInstance.off('drawing-data');
      socketInstance.off('round-ended');
      socketInstance.off('next-round-ready');
      socketInstance.off('game-over');
      socketInstance.off('player-joined-game');
    };
  }, []);

  // Maps the server's `phase` field onto our local gameState, and pulls in
  // every shared field in one place so every event handler stays tiny.
  const applyServerState = (state) => {
    setPlayers(prev => {
      // keep any locally-known extra fields (isYou) merged with server's list
      return (state.players || []).map(p => ({ ...p, isYou: p.id === myId }));
    });
    setTotalRounds(state.totalRounds);
    setCurrentRound(state.currentRound);
    setCurrentArtistId(state.currentArtistId);
    setScores(state.scores || {});
    setRoundScores(state.roundScores || {});
    setCorrectGuessers(state.correctGuessers || []);
    setTokens(state.tokens || {});
    if (state.roundStartAt) {
      const elapsed = Math.floor((Date.now() - state.roundStartAt) / 1000);
      setTimeLeft(Math.max(ROUND_DURATION - elapsed, 0));
    } else {
      setTimeLeft(ROUND_DURATION);
    }
    if (state.phase === 'wordSelect') setGameState('wordSelect');
    else if (state.phase === 'playing') setGameState('playing');
  };

  // ============================================
  // LOAD GAME DATA / JOIN
  // ============================================
  useEffect(() => {
    const state = location.state || {};
    const roomData = JSON.parse(localStorage.getItem('currentRoom') || 'null');
    let playerList = state.players || roomData?.players || [];

    if (playerList.length === 0) {
      playerList = [{ id: myId || 'user_1', name: myUserRef.current.username || 'You', isYou: true }];
    }
    const solo = state.isSolo || playerList.length === 1;
    setIsSolo(solo);

    if (solo) {
      // ---- SOLO: everything stays local, exactly like single-player testing ----
      const normalized = playerList.map(p => ({ ...p, id: p.id || p._id, isYou: true }));
      setPlayers(normalized);
      setTotalRounds(Number(state.rounds || roomData?.rounds || 5));
      const initialScores = {}; const initialTokens = {};
      normalized.forEach(p => { initialScores[p.id] = 0; initialTokens[p.id] = 0; });
      setScores(initialScores);
      setTokens(initialTokens);
      setCurrentArtistId(normalized[0]?.id);
      setWordChoices(getWordChoices());
      setGameState('wordSelect');
      setLoading(false);
    } else {
      // ---- MULTIPLAYER: ask the server for the authoritative state ----
      const s = getSocket() || connectSocket();
      if (s) {
        if (s.connected) s.emit('join-game-room', { roomId });
        else s.once('connect', () => s.emit('join-game-room', { roomId }));
      }
      // loading is cleared once 'game-state-sync' arrives
    }
  }, [location.state, roomId]);

  // ============================================
  // TIMER (client-side ticking only; server enforces the real timeout)
  // ============================================
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (timeLeft <= 0) {
      if (isSolo) handleSoloRoundEnd('timeout');
      return; // in multiplayer, the server's own timer will emit 'round-ended'
    }
    const interval = setInterval(() => setTimeLeft(prev => Math.max(prev - 1, 0)), 1000);
    return () => clearInterval(interval);
  }, [timeLeft, gameState, isSolo]);

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#06b6d4', '#6366f1', '#a855f7', '#ffffff'];
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================
  // WORD SELECTION
  // ============================================
  const handleWordChosen = (word) => {
    setWordToDraw(word);
    if (isSolo) {
      setTimeLeft(ROUND_DURATION);
      setGameState('playing');
    } else if (socket) {
      socket.emit('select-word', { roomId, word });
      // gameState flips to 'playing' once 'round-started' comes back
    }
  };

  // ============================================
  // DRAWING
  // ============================================
  const startDrawing = (e) => {
    if (!isArtist && !isSolo) { alert('Only the artist can draw!'); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || (!isArtist && !isSolo)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineTo(x, y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? 24 : 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    if (socket && !isSolo && isArtist) {
      socket.emit('drawing-data', {
        roomId, x, y, color: ctx.strokeStyle, width: ctx.lineWidth, isEraser: tool === 'eraser'
      });
    }
  };

  const drawOnCanvas = (data) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(data.x, data.y);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(data.x, data.y);
  };

  const stopDrawing = () => setIsDrawing(false);
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  // ============================================
  // GUESS / CHAT
  // ============================================
  const handleGuess = (e) => {
    e.preventDefault();
    if (!guessText.trim()) return;
    const rawText = guessText.trim();
    setGuessText('');

    // Artist chats — never scored. Only skip this for a real multiplayer artist;
    // in solo mode you ARE the artist but still need to be able to guess yourself.
    if (isArtist && !isSolo) {
      socket.emit('drawer-chat', { roomId, message: rawText });
      return;
    }

    if (alreadyGuessed) return;

    if (isSolo) {
      handleSoloGuess(rawText);
    } else if (socket) {
      socket.emit('submit-guess', { roomId, guess: rawText });
    }
  };

  // ---- SOLO-ONLY scoring path (server handles this for multiplayer) ----
  const handleSoloGuess = (rawText) => {
    if (guessMatches(rawText, wordToDraw)) {
      const elapsed = ROUND_DURATION - timeLeft;
      let base = Math.max(Math.round((1000 * timeLeft) / ROUND_DURATION), MIN_GUESS_SCORE);
      let bonus = 0;
      if (correctGuessers.length === 0) bonus += FIRST_GUESS_BONUS;
      if (elapsed <= FAST_GUESS_WINDOW) bonus += FAST_GUESS_BONUS;
      const total = base + bonus;

      setScores(prev => ({ ...prev, [myId]: (prev[myId] || 0) + total }));
      setRoundScores(prev => ({ ...prev, [myId]: (prev[myId] || 0) + total }));
      setCorrectGuessers(prev => [...prev, myId]);
      setGuesses(prev => [{ player: 'You', guess: wordToDraw, isCorrect: true, points: total }, ...prev]);
      setRoundEndMessage(`🎉 You guessed it! +${total} points!`);
      handleSoloRoundEnd('correct');
    } else {
      setGuesses(prev => [{ player: 'You', guess: rawText, isCorrect: false }, ...prev]);
    }
  };

  const handleSoloRoundEnd = (reason) => {
    if (gameState === 'roundEnd' || gameState === 'reward' || gameState === 'gameOver') return;

    const guesserScores = correctGuessers.map(id => roundScores[id] || 0);
    let drawerPts = guesserScores.length > 0
      ? Math.min(Math.round(guesserScores.reduce((a, b) => a + b, 0) / guesserScores.length), 800)
      : MIN_GUESS_SCORE;
    setScores(prev => ({ ...prev, [myId]: (prev[myId] || 0) + drawerPts }));
    setRoundScores(prev => ({ ...prev, [myId]: (prev[myId] || 0) + drawerPts }));

    setGameState('roundEnd');
    if (reason === 'timeout') setRoundEndMessage(`⏰ Time is up! The word was ${wordToDraw}`);
  };

  // ============================================
  // ROUND / GAME PROGRESSION
  // ============================================
  const startSoloNewRound = () => {
    setCurrentRound(prev => prev + 1);
    setWordToDraw('');
    setWordChoices(getWordChoices());
    setTimeLeft(ROUND_DURATION);
    setGuesses([]);
    setCorrectGuessers([]);
    setRoundScores({});
    setRoundEndMessage('');
    setRoundWinnerId(null);
    setGameState('wordSelect');
    clearCanvas();
  };

  // Called by the "NEXT ROUND / SEE FINAL RESULTS" button after every
  // single round (not just the last one). For multiplayer this always
  // just asks the server to advance — the server itself decides whether
  // to send back 'next-round-ready' (more rounds left) or 'game-over'
  // (that was the last round). The truth-or-dare screen is triggered
  // ONLY from the 'game-over' handler above, never from here.
  const handleNextRound = () => {
    if (isSolo) {
      if (Number(currentRound) + 1 > Number(totalRounds)) {
        setGameState('gameOver');
        updateGameStats((scores[myId] || 0) > 0);
        return;
      }
      startSoloNewRound();
    } else if (socket) {
      socket.emit('request-next-round', { roomId });
      // server replies with either 'next-round-ready' or 'game-over'
    }
  };

  const updateGameStats = async (won) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await axios.post(`${API_URL}/game/stats`, { gamesPlayed: 1, gamesWon: won ? 1 : 0 }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  };

  const handleLeaveGame = () => {
    if (window.confirm('Are you sure you want to leave the game?')) {
      localStorage.removeItem('currentRoom');
      navigate('/Home');
    }
  };

  if (loading) {
    return (
      <div className="gameplay-page-wrapper">
        <div className="loading-state">
          {isSolo ? 'Loading game...' : (isConnected ? 'Joining room...' : 'Connecting...')}
        </div>
      </div>
    );
  }

  // ============================================
  // GAME OVER
  // ============================================
  if (gameState === 'gameOver') {
    const sortedPlayers = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
    return (
      <div className="gameplay-page-wrapper">
        <div className="gameplay-container game-over-panel">
          <Trophy size={64} className="trophy-icon" />
          <h1>Game Over!</h1>
          <div className="winner-announcement">
            <h2>🏆 Winner: {sortedPlayers[0]?.name || 'No winner'}</h2>
            <p>Score: {scores[sortedPlayers[0]?.id] || 0}</p>
          </div>
          <div className="final-scores-list">
            {sortedPlayers.map((p, idx) => (
              <div key={p.id} className={`final-score-row ${idx === 0 ? 'top-winner' : ''}`}>
                <span>{idx + 1}. {p.name} {p.id === myId && '(You)'} {tokens[p.id] ? '🪙'.repeat(Math.min(tokens[p.id], 5)) : ''}</span>
                <span>{scores[p.id] || 0} pts</span>
              </div>
            ))}
          </div>
          <div className="end-actions">
            <button className="action-btn primary" onClick={() => window.location.reload()}>Play Again</button>
            <button className="action-btn secondary" onClick={handleLeaveGame}>Return to Lobby</button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // WORD SELECTION
  // ============================================
  if (gameState === 'wordSelect') {
    return (
      <div className="gameplay-page-wrapper">
        <div className="gameplay-container">
          <header className="game-top-bar">
            <button className="leave-game-btn" onClick={handleLeaveGame}><ArrowLeft size={18} /><span>Leave</span></button>
            <div className="round-indicator">Round {currentRound} / {totalRounds}</div>
          </header>
          {(isArtist || isSolo) ? (
            <div className="round-results-view">
              <h1 className="result-status-title">Choose a word to draw</h1>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1.5rem' }}>
                {wordChoices.map((w) => (
                  <button key={w} className="action-btn primary" onClick={() => handleWordChosen(w)}>{w}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="round-results-view">
              <h1 className="result-status-title">
                ✏️ {players.find(p => p.id === currentArtistId)?.name || 'Someone'} is choosing a word...
              </h1>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // REWARD SCREEN — shown ONCE, after the final round, to let the
  // overall winner hand out a truth or dare before final results.
  // ============================================
  if (gameState === 'reward') {
    const winner = players.find(p => p.id === gameWinnerId);
    return (
      <div className="gameplay-page-wrapper">
        <TruthDareScreen
          winner={winner}
          players={players}
          tokens={tokens}
          isWinner={gameWinnerId === myId}
          onSendChallenge={(targetId, type, text) => {
            if (socket) socket.emit('challenge-sent', { roomId, targetId, type, text });
          }}
          onContinue={() => setGameState('gameOver')}
          socket={socket}
        />
      </div>
    );
  }

  // ============================================
  // ACTIVE PLAY / ROUND END
  // ============================================
  return (
    <div className="gameplay-page-wrapper">
      <div className="gameplay-container dashboard-layout">

        <header className="game-top-bar">
          <button className="leave-game-btn" onClick={handleLeaveGame}>
            <ArrowLeft size={18} /><span>Leave</span>
          </button>
          <div className="round-indicator">Round {currentRound} / {totalRounds}</div>
          <div className="game-timer-clock">{formatTime(timeLeft)}</div>
          {!isSolo && <span className="online-status">{isConnected ? '🟢 Live' : '🔴 Connecting...'}</span>}
        </header>

        {gameState === 'roundEnd' ? (
          <div className="round-results-view">
            <h1 className="result-status-title">{roundEndMessage || 'Round Ended!'}</h1>
            <p className="result-sub">The word was</p>
            <div className="result-word-badge">{wordToDraw}</div>

            <div className="results-score-list">
              {players.map((p, idx) => (
                <div key={p.id} className="result-score-item">
                  <div className="player-info-meta">
                    <span className="rank-num">{idx + 1}</span>
                    <span className="player-display-name">
                      {p.name} {p.id === myId && '(You)'} {tokens[p.id] ? '🪙'.repeat(Math.min(tokens[p.id], 5)) : ''}
                    </span>
                  </div>
                  <span className="points-display">
                    {roundScores[p.id] ? `+${roundScores[p.id]} · ` : ''}{scores[p.id] || 0} pts
                  </span>
                </div>
              ))}
            </div>

            <button className="main-action-btn" onClick={handleNextRound}>
              {currentRound >= totalRounds ? 'SEE FINAL RESULTS' : 'NEXT ROUND'}
            </button>
          </div>
        ) : (
          <div className="gameplay-workspace-split">

            <div className="left-workspace-panel">
              <div className="game-prompt-header">
                {(isArtist || isSolo) ? (
                  <>
                    <span className="prompt-label">Draw:</span>
                    <span className="prompt-word">{wordToDraw}</span>
                  </>
                ) : (
                  <span className="prompt-label-guess">Guess the drawing!</span>
                )}
              </div>

              <div className="interactive-canvas-container">
                <canvas
                  ref={canvasRef}
                  width={750}
                  height={460}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className={`game-drawing-surface ${(!isArtist && !isSolo) ? 'view-only' : ''}`}
                />
                {!isArtist && !isSolo && (
                  <div className="view-only-overlay">
                    <span>🎨 {players.find(p => p.id === currentArtistId)?.name || 'Someone'} is drawing...</span>
                  </div>
                )}
              </div>

              {(isArtist || isSolo) && (
                <div className="artist-controls-footer">
                  <div className="drawing-tools-row">
                    <button className={`tool-btn ${tool === 'pencil' ? 'active' : ''}`} onClick={() => setTool('pencil')}>
                      <Pencil size={20} />
                    </button>
                    <button className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')}>
                      <Eraser size={20} />
                    </button>
                    <div className="color-palette-tray-inline">
                      {colors.map((c, i) => (
                        <button
                          key={i}
                          className={`color-swatch-circle ${color === c && tool !== 'eraser' ? 'selected' : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => { setColor(c); setTool('pencil'); }}
                        />
                      ))}
                    </div>
                    <button className="tool-btn action-trash" onClick={clearCanvas}>
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="right-sidebar-panel">
              <div className="sidebar-chat-header">
                <span className="chat-title-label">Live Guessing Arena</span>
              </div>

              <form className="guess-input-wrapper-row" onSubmit={handleGuess}>
                <input
                  type="text"
                  placeholder={
                    (isArtist && !isSolo) ? "Chat with players..." :
                    (alreadyGuessed ? "You already guessed it!" : "Type your guess...")
                  }
                  value={guessText}
                  onChange={(e) => setGuessText(e.target.value)}
                  disabled={!(isArtist || isSolo) && alreadyGuessed}
                />
                <button
                  type="submit"
                  className="submit-guess-round-btn"
                  disabled={!(isArtist || isSolo) && alreadyGuessed}
                >
                  <Send size={18} />
                </button>
              </form>
              {isArtist && !isSolo && (
                <p className="artist-chat-restriction-message" style={{ fontSize: '0.8rem', opacity: 0.75 }}>
                  You're drawing — you can chat, but it won't count as a guess.
                </p>
              )}
              {!(isArtist || isSolo) && alreadyGuessed && (
                <p className="artist-chat-restriction-message" style={{ fontSize: '0.8rem', opacity: 0.75 }}>
                  ✓ Guessed correctly — waiting for the round to end.
                </p>
              )}

              <div className="live-guesses-stack">
                {guesses.length === 0 ? (
                  <p className="no-guesses-fallback">Waiting for guesses...</p>
                ) : (
                  guesses.map((g, idx) => (
                    <div key={idx} className={`live-guess-card ${g.isCorrect ? 'correct-match' : ''} ${g.isChat ? 'chat-only' : ''}`}>
                      <div className="guess-text-content">
                        <strong>{g.player}: </strong>
                        <span>{g.isCorrect ? '✓ guessed the word!' : g.guess}</span>
                      </div>
                      {g.isCorrect && <span className="checkmark">✓ +{g.points}</span>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePlay;
