import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login/Login';
import Home from './pages/Login/Home';
import CreateRoom from './pages/Login/CreateRoom';
import GameRoom from './pages/Login/GameRoom';
import Register from './pages/Login/Register';
import GamePlay from './pages/Login/GamePlay';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/create-room" element={<CreateRoom />} />
        <Route path="/room/:roomSlug" element={<GameRoom />} /> 
        <Route path="/game" element={<GamePlay />} />
      </Routes>
    </Router>
  );
}

export default App;