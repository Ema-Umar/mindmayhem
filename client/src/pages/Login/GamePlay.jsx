import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Pencil, Eraser, Trash2, Send, Trophy, ArrowLeft, Eye, EyeOff } from 'lucide-react';
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
  const [showWord, setShowWord] = useState(true);
  const [scores, setScores] = useState({});
  const [guesses, setGuesses] = useState([]);
  const [gameState, setGameState] = useState('playing');
  const [roundEndMessage, setRoundEndMessage] = useState('');
  const [artistIndex, setArtistIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Word list
  const wordList = [
    'BALLOON', 'DOG', 'CAT', 'SUN', 'HOUSE', 'FLOWER', 'TREE', 'CAR', 'BIRD',
    'FISH', 'STAR', 'MOON', 'APPLE', 'BANANA', 'PIZZA', 'HAPPY', 'SAD', 'ANGRY',
    'RUN', 'SWIM', 'FLY', 'JUMP', 'DANCE', 'SING', 'LAUGH', 'CRY', 'THINK',
    'LOVE', 'HOPE', 'DREAM', 'BRAVE', 'STRONG', 'SMART', 'KIND', 'FAST', 'SLOW',
    'BIG', 'SMALL', 'TALL', 'SHORT', 'WIDE', 'NARROW', 'DEEP', 'SHALLOW'
  ];

  const getRandomWord = () => {
    return wordList[Math.floor(Math.random() * wordList.length)];
  };

  // Get data from navigation state or localStorage
  useEffect(() => {
    const loadGameData = async () => {
      try {
        setLoading(true);
        
        // Try to get state from navigation
        const state = location.state || {};
        const roomData = JSON.parse(localStorage.getItem('currentRoom') || 'null');
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        
        console.log('Location state:', state);
        console.log('Room data:', roomData);
        console.log('User data:', userData);

        // Get players from state or room data
        let playerList = state.players || roomData?.players || [];
        
        // If no players, create a default player (solo mode)
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

        // Mark current user
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

        // Initialize scores
        const initialScores = {};
        playerList.forEach(p => {
          initialScores[p.id] = 0;
        });
        setScores(initialScores);

        // Set first artist (player 0)
        const firstArtist = playerList[0] || { id: 'artist_1', name: 'Artist' };
        setArtistIndex(0);
        setCurrentArtist(firstArtist);
        setIsArtist(firstArtist.isYou || false);

        // Set first word
        const word = getRandomWord();
        setWordToDraw(word);
        
        // In solo mode, show word by default
        setShowWord(solo);

        console.log('Game loaded with:', { playerList, rounds, solo, word });

        // Set canvas size
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.parentElement.getBoundingClientRect();
          canvas.width = canvas.parentElement.clientWidth || 750;
          canvas.height = 460;
        }

      } catch (error) {
        console.error('Error loading game:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGameData();
  }, [location.state, roomId]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 || gameState !== 'playing') {
      if (timeLeft <= 0 && gameState === 'playing') {
        handleRoundEnd('⏰ Time is up!');
      }
      return;
    }
    const interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft, gameState]);

  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', 
    '#10b981', '#06b6d4', '#6366f1', '#a855f7'
  ];

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Drawing handlers
  const startDrawing = (e) => {
    if (!isArtist && !isSolo) {
      alert('Only the artist can draw!');
      return;
    }
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
    ctx.strokeStyle = tool === 'eraser' ? '#f5f0e6' : color;
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

  // Handle guess
  const handleGuess = (e) => {
    e.preventDefault();
    if (!guessText.trim()) return;
    if (isArtist && !isSolo) {
      alert('You are the artist! You cannot guess your own word.');
      setGuessText('');
      return;
    }

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

      setGuesses(prev => [...prev, { 
        player: 'You', 
        guess: guess, 
        isCorrect: true,
        points: points 
      }]);

      setRoundEndMessage(`🎉 You guessed it! +${points} points!`);
      handleRoundEnd('correct');
    } else {
      const guesser = players.find(p => p.isYou);
      setGuesses(prev => [...prev, { 
        player: guesser?.name || 'Player', 
        guess: guess, 
        isCorrect: false 
      }]);
    }
  };

  // Handle round end
  const handleRoundEnd = (reason) => {
    if (gameState === 'roundEnd' || gameState === 'gameOver') return;
    
    setGameState('roundEnd');
    
    if (reason === 'timeout') {
      setRoundEndMessage(`⏰ Time is up! The word was "${wordToDraw}"`);
    }
    
    setTimeout(() => {
      if (currentRound >= totalRounds) {
        setGameState('gameOver');
      } else {
        startNewRound();
      }
    }, 3000);
  };

  // Start new round
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
    
    const newWord = getRandomWord();
    setWordToDraw(newWord);
    setShowWord(isSolo || newArtist?.isYou || false);
  };

  // Handle next round
  const handleNextRound = () => {
    if (gameState === 'gameOver') return;
    if (gameState === 'roundEnd') {
      if (currentRound >= totalRounds) {
        setGameState('gameOver');
      } else {
        startNewRound();
      }
    }
  };

  // Toggle word visibility
  const toggleWordVisibility = () => {
    setShowWord(!showWord);
  };

  // Handle leave
  const handleLeaveGame = () => {
    if (window.confirm('Are you sure you want to leave the game?')) {
      localStorage.removeItem('currentRoom');
      navigate('/Home');
    }
  };

  // Get winner
  const getWinner = () => {
    if (players.length === 0) return null;
    let maxScore = 0;
    let winner = players[0];
    players.forEach(p => {
      const score = scores[p.id] || 0;
      if (score > maxScore) {
        maxScore = score;
        winner = p;
      }
    });
    return winner;
  };

  if (loading) {
    return (
      <div className="gameplay-page-wrapper">
        <div className="gameplay-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
          <div style={{ color: '#fff', fontSize: '18px' }}>Loading game...</div>
        </div>
      </div>
    );
  }

  // Game Over
  if (gameState === 'gameOver') {
    const winner = getWinner();
    const sortedPlayers = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
    
    return (
      <div className="gameplay-page-wrapper">
        <div className="gameplay-container game-over">
          <div className="game-over-content">
            <div className="game-over-header">
              <Trophy size={64} className="trophy-icon" />
              <h1>Game Over!</h1>
            </div>
            
            <div className="game-over-winner">
              <h2>🏆 Winner: {winner?.name || 'No winner'}</h2>
              <p>Score: {scores[winner?.id] || 0}</p>
            </div>
            
            <div className="final-scores">
              <h3>Final Scores</h3>
              {sortedPlayers.map((p, idx) => (
                <div key={p.id} className={`final-score-item ${idx === 0 ? 'winner' : ''}`}>
                  <span className="player-name">
                    {idx === 0 && '🏆 '}
                    {p.name}
                    {p.isYou && ' (You)'}
                  </span>
                  <span className="player-score">{scores[p.id] || 0}</span>
                </div>
              ))}
            </div>
            
            <div className="gameplay-actions">
              <button className="play-again-btn" onClick={() => window.location.reload()}>
                <Trophy size={18} />
                Play Again
              </button>
              <button className="lobby-btn" onClick={handleLeaveGame}>
                <ArrowLeft size={18} />
                Return to Lobby
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalPlayers = players.length;
  const isCurrentArtist = isArtist || isSolo;

  return (
    <div className="gameplay-page-wrapper">
      <div className="gameplay-container">
        
        {/* Left Column */}
        <div className="canvas-column-section">
          
          <header className="game-top-bar">
            <button className="leave-game-btn" onClick={handleLeaveGame}>
              <ArrowLeft size={18} />
              <span>Leave</span>
            </button>
            <div className="round-indicator">Round {currentRound} / {totalRounds}</div>
            <div className="game-timer-clock">{formatTime(timeLeft)}</div>
            {isSolo && <span className="solo-badge-small">🧪 SOLO</span>}
          </header>

          {/* Artist Info */}
          <div className="artist-info-bar">
            <div className="artist-info">
              <span className="artist-label">🎨 Artist:</span>
              <span className="artist-name">
                {currentArtist?.name || 'Unknown'}
                {currentArtist?.isYou && ' (You)'}
                {isCurrentArtist && !isSolo && ' 👑'}
              </span>
            </div>
            {isCurrentArtist && !isSolo && (
              <div className="word-reveal-container">
                <button 
                  className={`word-reveal-btn ${showWord ? 'showing' : ''}`}
                  onClick={toggleWordVisibility}
                >
                  {showWord ? <EyeOff size={16} /> : <Eye size={16} />}
                  <span>{showWord ? 'Hide Word' : 'Show Word'}</span>
                </button>
                {showWord && (
                  <span className="secret-word">{wordToDraw}</span>
                )}
              </div>
            )}
            {isSolo && (
              <div className="word-display">
                <span className="word-label">Draw:</span>
                <span className="word-value">{wordToDraw}</span>
              </div>
            )}
          </div>

          <div className="interactive-canvas-wrapper">
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
            {!isCurrentArtist && (
              <div className="view-only-overlay">
                <Eye size={32} />
                <p>Waiting for the artist to draw...</p>
              </div>
            )}
            {gameState === 'roundEnd' && (
              <div className="round-end-overlay">
                <div className="round-end-content">
                  <Trophy size={32} />
                  <p>{roundEndMessage}</p>
                  <span className="word-reveal">The word was: <strong>{wordToDraw}</strong></span>
                  <button className="dock-btn next-btn" onClick={handleNextRound} style={{ marginTop: '15px' }}>
                    Next Round
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="canvas-control-dock">
            <div className="tool-selectors-group">
              <button 
                className={`dock-btn action ${tool === 'pencil' ? 'active' : ''}`}
                onClick={() => setTool('pencil')}
                disabled={!isCurrentArtist}
              >
                <Pencil size={20} />
              </button>
              <button 
                className={`dock-btn action ${tool === 'eraser' ? 'active' : ''}`}
                onClick={() => setTool('eraser')}
                disabled={!isCurrentArtist}
              >
                <Eraser size={20} />
              </button>
              <button 
                className="dock-btn action" 
                onClick={clearCanvas}
                disabled={!isCurrentArtist}
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="palette-vertical-divider"></div>

            <div className="color-palette-tray">
              {colors.map((c, i) => (
                <button 
                  key={i} 
                  className={`palette-color-swatch ${color === c && tool !== 'eraser' ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setColor(c);
                    setTool('pencil');
                  }}
                  disabled={!isCurrentArtist}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="interaction-sidebar-section">
          <div className="sidebar-tab-header">
            <h3>Live Guesses</h3>
            <div className="player-count">
              <span>{totalPlayers} players</span>
            </div>
          </div>

          <div className="chats-display-scroller">
            <div className="chat-msg system">🎮 Game started!</div>
            <div className="chat-msg system">
              🎨 <strong>{currentArtist?.name}</strong> is drawing...
              {isCurrentArtist && !isSolo && ' (You are the artist!)'}
            </div>
            {guesses.map((g, idx) => (
              <div key={idx} className={`chat-msg ${g.isCorrect ? 'correct' : ''}`}>
                <strong>{g.player}:</strong> {g.guess}
                {g.isCorrect && ` 🎉 +${g.points}pts`}
              </div>
            ))}
          </div>

          <form className="guess-input-container" onSubmit={handleGuess}>
            <input 
              type="text" 
              placeholder={isCurrentArtist && !isSolo ? "You're the artist! Can't guess." : "Type your guess here..."}
              value={guessText}
              onChange={(e) => setGuessText(e.target.value)}
              disabled={isCurrentArtist && !isSolo || gameState === 'roundEnd'}
            />
            <button 
              type="submit" 
              className="send-guess-btn"
              disabled={isCurrentArtist && !isSolo || gameState === 'roundEnd'}
            >
              <Send size={18} />
            </button>
          </form>

          {/* Scores */}
          <div className="scores-panel">
            <h4>📊 Scores</h4>
            {players.map(p => (
              <div key={p.id} className="score-item">
                <span className="score-name">
                  {p.name}
                  {p.isYou && ' (You)'}
                  {p.id === currentArtist?.id && ' 🎨'}
                </span>
                <span className="score-value">{scores[p.id] || 0}</span>
              </div>
            ))}
          </div>
          
          {isSolo && (
            <div className="solo-hint-bar">
              💡 Solo mode - Practice drawing! Use the tools above.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default GameBoard;
