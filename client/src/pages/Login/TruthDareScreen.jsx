import React, { useState, useEffect } from 'react';
import { Sparkles, PartyPopper, Send } from 'lucide-react';
import './TruthDareScreen.css';

// Shown once, after the FINAL round of a multiplayer game, to the
// overall winner (highest total score). They pick a player + truth or
// dare + a short prompt; it's broadcast to everyone via the
// 'challenge-sent' socket event that already existed server-side.
// Non-winners just watch and wait, then everyone continues to the
// final results screen together.
const TruthDareScreen = ({ winner, players, tokens, isWinner, onSendChallenge, onContinue, socket }) => {
  const [targetId, setTargetId] = useState('');
  const [type, setType] = useState('dare');
  const [text, setText] = useState('');
  const [challenge, setChallenge] = useState(null);

  const otherPlayers = (players || []).filter((p) => p.id !== winner?.id);

  // Everyone (including the winner, since the server broadcasts back to
  // the sender too) picks this up once a challenge is sent.
  useEffect(() => {
    if (!socket) return;
    const handleChallenge = (data) => setChallenge(data);
    socket.on('challenge-sent', handleChallenge);
    return () => socket.off('challenge-sent', handleChallenge);
  }, [socket]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!targetId || !text.trim()) return;
    onSendChallenge(targetId, type, text.trim());
  };

  const targetName = challenge
    ? players.find((p) => p.id === challenge.targetId)?.name || 'a player'
    : null;

  return (
    <div className="td-container">
      <PartyPopper size={48} className="td-trophy-icon" />
      <h1 className="td-title">🏆 {winner?.name || 'Someone'} won the game!</h1>
      <p className="td-subtitle">
        {isWinner
          ? 'You get to hand out one Truth or Dare before we see the final results.'
          : `Waiting for ${winner?.name || 'the winner'} to pick a Truth or Dare...`}
      </p>

      {challenge ? (
        <div className="td-challenge-card">
          <Sparkles size={20} />
          <p>
            <strong>{challenge.type === 'truth' ? 'Truth' : 'Dare'}</strong> for{' '}
            <strong>{targetName}</strong>:
          </p>
          <p className="td-challenge-text">"{challenge.text}"</p>
        </div>
      ) : isWinner ? (
        <form className="td-challenge-form" onSubmit={handleSend}>
          <div className="td-form-row">
            <label>Choose a player</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select a player...
              </option>
              {otherPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="td-type-toggle">
            <button
              type="button"
              className={`td-type-btn ${type === 'truth' ? 'active' : ''}`}
              onClick={() => setType('truth')}
            >
              Truth
            </button>
            <button
              type="button"
              className={`td-type-btn ${type === 'dare' ? 'active' : ''}`}
              onClick={() => setType('dare')}
            >
              Dare
            </button>
          </div>

          <textarea
            placeholder={type === 'truth' ? "What's your question?" : "What's the dare?"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={150}
            required
          />

          <button type="submit" className="td-send-btn">
            <Send size={16} /> Send {type === 'truth' ? 'Truth' : 'Dare'}
          </button>
        </form>
      ) : null}

      <button className="td-continue-btn" onClick={onContinue}>
        Continue to Final Results
      </button>
    </div>
  );
};

export default TruthDareScreen;
