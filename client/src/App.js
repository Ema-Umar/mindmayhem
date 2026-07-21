import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login/Login';
import Home from './pages/Login/Home';
import CreateRoom from './pages/Login/CreateRoom';
import GameRoom from './pages/Login/GameRoom';
import Register from './pages/Login/Register';
import GamePlay from './pages/Login/GamePlay';
import Friends from './pages/Login/Friends';
import Notifications from './pages/Login/Notifications';
import Profile from './pages/Login/Profile';
import GameHistory from './pages/Login/GameHistory'; // 1. Import History component

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/create-room" element={<CreateRoom />} />
        <Route path="/room/:roomId" element={<GameRoom />} />
        <Route path="/gameplay/:roomId" element={<GamePlay />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/history" element={<GameHistory />} />
      </Routes>
    </Router>
  );
}

export default App;