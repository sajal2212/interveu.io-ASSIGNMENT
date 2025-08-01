/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import io from 'socket.io-client';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import PersonaSelection from './components/PersonaSelection';
import { setSocket, setUserType } from './store/appSlice';
import './App.css';

// Try different connection methods
const SOCKET_URL = 'http://127.0.0.1:3001';

const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  timeout: 10000,
  forceNew: true,
  transports: ['polling', 'websocket'], // Try polling first
  upgrade: true
});

function App() {
  const dispatch = useDispatch();
  const { userType } = useSelector(state => state.app);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [debugInfo, setDebugInfo] = useState([]);

  const addDebugInfo = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev.slice(-4), `${timestamp}: ${message}`]);
    console.log(`[${timestamp}] ${message}`);
  };

  useEffect(() => {
    dispatch(setSocket(socket));
    
    addDebugInfo(`Attempting to connect to ${SOCKET_URL}`);

    socket.on('connect', () => {
      addDebugInfo(`✅ Connected! Socket ID: ${socket.id}`);
      setIsConnected(true);
      setConnectionError(null);
      setConnectionAttempts(0);
    });

    socket.on('disconnect', (reason) => {
      addDebugInfo(`❌ Disconnected: ${reason}`);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      const attempt = connectionAttempts + 1;
      setConnectionAttempts(attempt);
      addDebugInfo(`🔥 Connection failed (attempt ${attempt}): ${error.message}`);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      addDebugInfo(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    socket.on('reconnect', (attemptNumber) => {
      addDebugInfo(`🔄✅ Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('connection-confirmed', (data) => {
      addDebugInfo(`📡 Server confirmed connection`);
    });

    // Force connection attempt
    if (!socket.connected) {
      addDebugInfo('Forcing connection...');
      socket.connect();
    }

    return () => {
      socket.off();
      socket.disconnect();
    };
  }, [dispatch]);

  const handlePersonaSelect = (persona) => {
    dispatch(setUserType(persona));
  };

  const forceReconnect = () => {
    addDebugInfo('Manual reconnection triggered');
    setConnectionError(null);
    socket.disconnect();
    setTimeout(() => {
      socket.connect();
    }, 1000);
  };

  const testServerHealth = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3001/health');
      const data = await response.json();
      addDebugInfo(`Server health check: ${data.status}`);
      alert(`Server is reachable: ${JSON.stringify(data)}`);
    } catch (error) {
      addDebugInfo(`Server health check failed: ${error.message}`);
      alert(`Server is NOT reachable: ${error.message}`);
    }
  };

  if (!isConnected) {
    return (
      <div className="app-loading">
        <div className="connection-debug">
          <div className="loading-spinner"></div>
          <h2>Connecting to server...</h2>
          <p>Socket ID: {socket.id || 'Not connected'}</p>
          <p>URL: {SOCKET_URL}</p>
          <p>Attempts: {connectionAttempts}</p>
          
          {connectionError && (
            <div className="error-info">
              <p><strong>Error:</strong> {connectionError}</p>
            </div>
          )}
          
          <div className="debug-info">
            <h4>Debug Log:</h4>
            {debugInfo.map((info, index) => (
              <div key={index} className="debug-line">{info}</div>
            ))}
          </div>
          
          <div className="debug-actions">
            <button onClick={forceReconnect} className="btn btn-primary">
              Force Reconnect
            </button>
            <button onClick={testServerHealth} className="btn btn-secondary">
              Test Server
            </button>
            <button onClick={() => window.location.reload()} className="btn btn-secondary">
              Refresh Page
            </button>
          </div>
          
          <div className="troubleshooting">
            <h4>Troubleshooting:</h4>
            <ol>
              <li>Make sure server is running: <code>cd server && npm run dev</code></li>
              <li>Check server logs for errors</li>
              <li>Try the "Test Server" button above</li>
              <li>Check if port 3001 is available</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {!userType ? (
        <PersonaSelection onSelect={handlePersonaSelect} />
      ) : userType === 'teacher' ? (
        <TeacherDashboard socket={socket} />
      ) : (
        <StudentDashboard socket={socket} />
      )}
    </div>
  );
}

export default App;
