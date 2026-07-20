import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Pencil, Eraser, Trash2, Send, Trophy, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import './GamePlay.css';

const GameBoard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();
  
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#ef4444');
  const [timeLeft, setTimeLeft] = useState(80);
  const [guessText, setGuessText] = useState('');
  const [players, setPlayers] = useState([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(5);
  const [isSolo, setIsSolo] = useState(true);
  const [wordToDraw, setWordToDraw] = useState('');
  const [currentArtist, setCurrentArtist] = useState(null);
  const [isArtist, setIsArtist] = useState(true);
  const [scores, setScores] = useState({});
  const [guesses, setGuesses] = useState([]);
  const [gameState, setGameState] = useState('playing'); // 'playing' | 'roundEnd' | 'gameOver'
  const [roundEndMessage, setRoundEndMessage] = useState('');
  const [artistIndex, setArtistIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const API_URL = 'http://localhost:5000/api';

  const wordList = [
    'BALLOON', 'DOG', 'CAT', 'SUN', 'HOUSE', 'FLOWER', 'TREE', 'CAR', 'BIRD',
    'FISH', 'STAR', 'MOON', 'APPLE', 'BANANA', 'PIZZA', 'HAPPY', 'SAD', 'ANGRY',
    'RUN', 'SWIM', 'FLY', 'JUMP', 'DANCE', 'SING', 'LAUGH', 'CRY', 'THINK',
    'LOVE', 'HOPE', 'DREAM', 'BRAVE', 'STRONG', 'SMART', 'KIND', 'FAST', 'SLOW',
    'BIG', 'SMALL', 'TALL', 'SHORT', 'WIDE', 'NARROW', 'DEEP', 'SHALLOW'
  ];

  const getRandomWord = () => wordList[Math.floor(Math.random() * wordList.length)];

  const updateGameStats = async (won) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await axios.post(`${API_URL}/game/stats`, {
        gamesPlayed: 1,
        gamesWon: won ? 1 : 0
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  };

  useEffect(() => {
    const loadGameData = async () => {
      try {
        setLoading(true);
        const state = location.state || {};
        const roomData = JSON.parse(localStorage.getItem('currentRoom') || 'null');
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        
        let playerList = state.players || roomData?.players || [];
        
        if (playerList.length === 0) {
          const userId = userData.id || userData._id || 'user_1';
          playerList = [{
            id: userId,
            name: userData.username || 'You',
            isHost: true,
            isYou: true,
            isReady: true
          }];
        }

        const currentUserId = userData.id || userData._id;
        playerList = playerList.map(p => ({
          ...p,
          isYou: p.id === currentUserId || p._id === currentUserId
        }));

        const rounds = state.rounds || roomData?.rounds || 5;
        const solo = state.isSolo || playerList.length === 1;

        setPlayers(playerList);
        setTotalRounds(rounds);
        setIsSolo(solo);

        const initialScores = {};
        playerList.forEach(p => { initialScores[p.id] = 0; });
        setScores(initialScores);

        const firstArtist = playerList[0] || { id: 'artist_1', name: 'Artist' };
        setArtistIndex(0);
        setCurrentArtist(firstArtist);
        setIsArtist(firstArtist.isYou || false);

        const word = getRandomWord();
        setWordToDraw(word);
      } catch (error) {
        console.error('Error loading game:', error);
      } finally {
        setLoading(false);
      }
    };
    loadGameData();
  }, [location.state, roomId]);

  useEffect(() => {
    if (timeLeft <= 0 || gameState !== 'playing') {
      if (timeLeft <= 0 && gameState === 'playing') handleRoundEnd('timeout');
      return;
    }
    const interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft, gameState]);

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#06b6d4', '#6366f1', '#a855f7', '#ffffff'];

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startDrawing = (e) => {
    if (!isArtist && !isSolo) return;
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
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guessText.trim() || (isArtist && !isSolo)) return;

    const guess = guessText.trim().toUpperCase();
    setGuessText('');

    if (guess === wordToDraw) {
      const points = Math.max(10, Math.ceil(timeLeft / 5) * 2);
      const guesserId = players.find(p => p.isYou)?.id;
      
      setScores(prev => ({
        ...prev,
        [guesserId]: (prev[guesserId] || 0) + points,
        [currentArtist?.id]: (prev[currentArtist?.id] || 0) + 5
      }));

      setGuesses(prev => [{ player: 'You', guess: guess, isCorrect: true, points }, ...prev]);
      setRoundEndMessage(`🎉 You guessed it! +${points} points!`);
      handleRoundEnd('correct');
    } else {
      const guesser = players.find(p => p.isYou);
      setGuesses(prev => [{ player: guesser?.name || 'Player', guess: guess, isCorrect: false }, ...prev]);
    }
  };

  const handleRoundEnd = (reason) => {
    if (gameState === 'roundEnd' || gameState === 'gameOver') return;
    setGameState('roundEnd');
    if (reason === 'timeout') setRoundEndMessage(`⏰ Time is up!`);
  };

  const startNewRound = () => {
    setCurrentRound(prev => prev + 1);
    setTimeLeft(80);
    setGuesses([]);
    setRoundEndMessage('');
    setGameState('playing');
    clearCanvas();
    
    const nextArtistIndex = (artistIndex + 1) % players.length;
    setArtistIndex(nextArtistIndex);
    const newArtist = players[nextArtistIndex] || players[0];
    setCurrentArtist(newArtist);
    setIsArtist(newArtist?.isYou || false);
    setWordToDraw(getRandomWord());
  };

  const handleNextRound = () => {
    if (currentRound >= totalRounds) {
      setGameState('gameOver');
      const player = players.find(p => p.isYou);
      updateGameStats(player && scores[player.id] > 0);
    } else {
      startNewRound();
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
        <div className="loading-state">Loading game...</div>
      </div>
    );
  }

  const isCurrentArtist = isArtist || isSolo;

  /* --- GAME OVER STATE --- */
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
                <span>{idx + 1}. {p.name} {p.isYou && '(You)'}</span>
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

  /* --- CORE ACTIVE PLAYING SCREEN LAYOUT --- */
  return (
    <div className="gameplay-page-wrapper">
      <div className="gameplay-container dashboard-layout">
        
        {/* Top bar headers */}
        <header className="game-top-bar">
          <button className="leave-game-btn" onClick={handleLeaveGame}>
            <ArrowLeft size={18} />
            <span>Leave</span>
          </button>
          <div className="round-indicator">Round {currentRound} / {totalRounds}</div>
          <div className="game-timer-clock">{formatTime(timeLeft)}</div>
        </header>

        {/* ---------------- SCREEN 3: ROUND RESULTS STATE (Full Screen Panel) ---------------- */}
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
                    <span className="player-display-name">{p.name} {p.isYou && '(You)'}</span>
                  </div>
                  <span className="points-display">{scores[p.id] || 0} pts</span>
                </div>
              ))}
            </div>

            <button className="main-action-btn" onClick={handleNextRound}>
              NEXT ROUND
            </button>
          </div>
        ) : (
          /* ---------------- ACTIVE PLAY COHESIVE GRID ---------------- */
          <div className="gameplay-workspace-split">
            
            {/* LEFT SIDE: Canvas and Artist Tools */}
            <div className="left-workspace-panel">
              <div className="game-prompt-header">
                {isCurrentArtist ? (
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
                  className={`game-drawing-surface ${!isCurrentArtist ? 'view-only' : ''}`}
                />
              </div>

              {/* Tools display under canvas only if current user is the drawer */}
              {isCurrentArtist && (
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

            {/* RIGHT SIDE: Dedicated Guessing Side-Panel Container */}
            <div className="right-sidebar-panel">
              <div className="sidebar-chat-header">
                <span className="chat-title-label">Live Guessing Arena</span>
              </div>

              {/* Show text input field to guessers; show text indicator to drawer */}
              {!isCurrentArtist ? (
                <form className="guess-input-wrapper-row" onSubmit={handleGuess}>
                  <input 
                    type="text" 
                    placeholder="Type your guess..."
                    value={guessText}
                    onChange={(e) => setGuessText(e.target.value)}
                  />
                  <button type="submit" className="submit-guess-round-btn">
                    <Send size={18} />
                  </button>
                </form>
              ) : (
                <div className="artist-chat-restriction-message">
                  You are drawing! Watch their guesses stream in.
                </div>
              )}

              {/* Interactive running log stack */}
              <div className="live-guesses-stack">
                {guesses.length === 0 ? (
                  <p className="no-guesses-fallback">Waiting for guesses...</p>
                ) : (
                  guesses.map((g, idx) => (
                    <div key={idx} className={`live-guess-card ${g.isCorrect ? 'correct-match' : ''}`}>
                      <div className="guess-text-content">
                        <strong>{g.player}: </strong>
                        <span>{g.guess}</span>
                      </div>
                      {g.isCorrect && <span className="checkmark">✓ Match</span>}
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

export default GameBoard;