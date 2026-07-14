import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Eraser, RotateCcw, RotateCw, Trash2, MoreVertical, Send, Trophy } from 'lucide-react';
import './GamePlay.css';

const GameBoard = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#ef4444');
  const [timeLeft, setTimeLeft] = useState(80); // 01:20 in seconds
  const [guessText, setGuessText] = useState('');

  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', 
    '#10b981', '#06b6d4', '#6366f1', '#a855f7'
  ];

  // Simple Timer Effect
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Basic HTML5 Drawing Setup handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = tool === 'eraser' ? '#f5f0e6' : color;
    ctx.lineWidth = tool === 'eraser' ? 24 : 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="gameplay-page-wrapper">
      <div className="gameplay-container">
        
        {/* Left Side: Game Status Header & Drawing Engine Area */}
        <div className="canvas-column-section">
          
          <header className="game-top-bar">
            <div className="round-indicator">Round 2 / 5</div>
            <div className="word-to-draw">Draw: <span>BALLOON</span></div>
            <div className="game-timer-clock">{formatTime(timeLeft)}</div>
          </header>

          <div className="interactive-canvas-wrapper">
            <canvas 
              ref={canvasRef}
              width={750}
              height={500}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="game-drawing-surface"
            />
          </div>

          {/* Canvas Styling Options Toolbar Box */}
          <div className="canvas-control-dock">
            <div className="tool-selectors-group">
              <button 
                className={`dock-btn action ${tool === 'pencil' ? 'active' : ''}`}
                onClick={() => setTool('pencil')}
              >
                <Pencil size={20} />
              </button>
              <button 
                className={`dock-btn action ${tool === 'eraser' ? 'active' : ''}`}
                onClick={() => setTool('eraser')}
              >
                <Eraser size={20} />
              </button>
              <button className="dock-btn action"><RotateCcw size={20} /></button>
              <button className="dock-btn action"><RotateCw size={20} /></button>
              <button className="dock-btn action" onClick={clearCanvas}>
                <Trash2 size={20} />
              </button>
              <button className="dock-btn action"><MoreVertical size={20} /></button>
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
                />
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Interactive Guess Feed & Scoreboard Status */}
        <div className="interaction-sidebar-section">
          <div className="sidebar-tab-header">
            <h3>Live Guesses</h3>
          </div>

          <div className="chats-display-scroller">
            <div className="chat-msg system"><strong>Sketchy</strong> joined the lobby</div>
            <div className="chat-msg"><strong>DoodleQueen:</strong> Is it a lollipop?</div>
            <div className="chat-msg correct">🎉 <strong>ColourKing</strong> guessed the word!</div>
            <div className="chat-msg"><strong>FunnyGuy:</strong> Apple?</div>
            <div className="chat-msg"><strong>StarGazer:</strong> cherry?</div>
          </div>

          <form className="guess-input-container" onSubmit={(e) => e.preventDefault()}>
            <input 
              type="text" 
              placeholder="Type your guess here..."
              value={guessText}
              onChange={(e) => setGuessText(e.target.value)}
            />
            <button type="submit" className="send-guess-btn">
              <Send size={18} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default GameBoard;