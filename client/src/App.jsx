import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import PersonaSelection from './components/PersonaSelection';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import { setSocket } from './store/appSlice';
import config from './config';
import './App.css';

function App() {
  const dispatch = useDispatch();
  const [socket, setSocketState] = useState(null);
  const [currentView, setCurrentView] = useState('persona');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    console.log('Attempting to connect to:', config.apiUrl);
    
    const newSocket = io(config.apiUrl, {
      forceNew: true,
      reconnection: true,
      timeout: 60000,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to server successfully');
      setConnectionStatus('connected');
      setSocketState(newSocket);
      dispatch(setSocket(newSocket));
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔥 Connection failed:', error.message);
      setConnectionStatus('error');
    });

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [dispatch]);

  // Make sure this function is properly defined
  const handlePersonaSelection = (persona) => {
    console.log('App: Persona selected:', persona);
    if (persona === 'teacher' || persona === 'student') {
      setCurrentView(persona);
    } else {
      console.error('Invalid persona selected:', persona);
    }
  };

  if (connectionStatus === 'disconnected') {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <h2>Connecting to server...</h2>
        <p>Please wait while we establish connection</p>
      </div>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <div className="app-loading">
        <h2>Connection Error</h2>
        <p>Unable to connect to the server. Please check your internet connection and try again.</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!socket) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div className="app">
      {currentView === 'persona' && (
        <PersonaSelection onSelectPersona={handlePersonaSelection} />
      )}
      {currentView === 'student' && (
        <StudentDashboard socket={socket} />
      )}
      {currentView === 'teacher' && (
        <TeacherDashboard socket={socket} />
      )}
    </div>
  );
}

export default App;
