/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Users, Clock, BarChart3, Play, Square, Send, MessageCircle, X } from 'lucide-react';
import CreateQuestionModal from './CreateQuestionModal';
import PollResults from './PollResults';
import { setStudents } from '../store/appSlice';

const TeacherDashboard = ({ socket }) => {
  const dispatch = useDispatch();
  const { students } = useSelector(state => state.app);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [sessionResults, setSessionResults] = useState(null);
  const [questionProgress, setQuestionProgress] = useState({ answered: 0, total: 0 });
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    // Register as teacher
    socket.emit('teacher-join');

    socket.on('session-status', (status) => {
      setSessionActive(status.isActive);
      setCurrentQuestion(status.currentQuestion);
    });

    socket.on('question-sent', (data) => {
      setCurrentQuestion(data.question);
      setShowQuestionModal(false);
    });

    socket.on('question-ended', (results) => {
      setCurrentQuestion(null);
    });

    socket.on('students-update', (studentsList) => {
      dispatch(setStudents(studentsList));
    });

    socket.on('question-progress', (progress) => {
      setQuestionProgress(progress);
    });

    socket.on('poll-session-ended', (results) => {
      setSessionResults(results);
      setSessionActive(false);
      setCurrentQuestion(null);
    });

    // Chat functionality
    socket.on('new-chat-message', (message) => {
      setChatMessages(prev => [...prev, message]);
    });

    socket.on('chat-history', (history) => {
      setChatMessages(history);
    });

    socket.on('error', (error) => {
      alert(`Error: ${error}`);
    });

    // Request chat history when component mounts
    socket.emit('get-chat-history');

    return () => {
      socket.off('session-status');
      socket.off('question-sent');
      socket.off('question-ended');
      socket.off('students-update');
      socket.off('question-progress');
      socket.off('poll-session-ended');
      socket.off('new-chat-message');
      socket.off('chat-history');
      socket.off('error');
    };
  }, [socket, dispatch]);

  const handleStartSession = () => {
    socket.emit('start-poll-session');
  };

  const handleSendQuestion = (questionData) => {
    socket.emit('send-question', questionData);
  };

  const handleEndSession = () => {
    if (window.confirm('Are you sure you want to end the poll session?')) {
      socket.emit('end-poll-session');
    }
  };

  const handleRemoveStudent = (studentId) => {
    socket.emit('remove-student', studentId);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      socket.emit('send-chat-message', {
        message: newMessage.trim(),
        senderName: 'Teacher',
        senderType: 'teacher'
      });
      setNewMessage('');
    }
  };

  return (
    <div className="teacher-dashboard">
      <header className="dashboard-header">
        <h1>Teacher Dashboard</h1>
        <div className="header-actions">
          <button 
            className="btn btn-secondary chat-toggle"
            onClick={() => setShowChat(!showChat)}
          >
            <MessageCircle size={16} />
            Chat
          </button>
          {!sessionActive ? (
            <button 
              className="btn btn-primary"
              onClick={handleStartSession}
              disabled={students.length === 0}
              title={students.length === 0 ? "Wait for students to join" : "Start poll session"}
            >
              <Play size={20} />
              Start Poll Session
            </button>
          ) : (
            <>
              <button 
                className="btn btn-primary"
                onClick={() => setShowQuestionModal(true)}
                disabled={currentQuestion && currentQuestion.isActive}
                title={currentQuestion && currentQuestion.isActive ? "Wait for current question to end" : "Send new question"}
              >
                <Send size={20} />
                Send Question
              </button>
              <button 
                className="btn btn-secondary"
                onClick={handleEndSession}
              >
                <Square size={20} />
                End Session
              </button>
            </>
          )}
        </div>
      </header>

      <div className="dashboard-content-teacher">
        {/* Main Content Grid - Top Section */}
        <div className="teacher-main-grid">
          {/* Session Status Panel */}
          <div className="panel">
            <h3>Session Status</h3>
            <div className="session-info">
              <div className="status-item">
                <span className="label">Session:</span>
                <span className={`status ${sessionActive ? 'active' : 'inactive'}`}>
                  {sessionActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="status-item">
                <span className="label">Connected Students:</span>
                <span className="value">{students.length}</span>
              </div>
              {currentQuestion && (
                <div className="status-item">
                  <span className="label">Current Question:</span>
                  <span className="value">Active</span>
                </div>
              )}
              {sessionActive && (
                <div className="status-item">
                  <span className="label">Progress:</span>
                  <span className="value">{questionProgress.answered}/{questionProgress.total} answered</span>
                </div>
              )}
            </div>
          </div>

          {/* Students Panel */}
          <div className="panel">
            <h3><Users size={20} /> Students ({students.length})</h3>
            <div className="students-list">
              {students.map(student => (
                <div key={student.id} className="student-item">
                  <span>{student.name}</span>
                  <div className="student-status">
                    {currentQuestion && (
                      <span className={`status ${student.hasAnswered ? 'answered' : 'pending'}`}>
                        {student.hasAnswered ? 'Answered' : 'Pending'}
                      </span>
                    )}
                    <button 
                      className="btn-remove"
                      onClick={() => handleRemoveStudent(student.id)}
                      title="Remove student"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              {students.length === 0 && (
                <p className="no-students">
                  {sessionActive ? 'No students connected' : 'Students will appear here when they join'}
                </p>
              )}
            </div>
          </div>

          {/* Current Question Panel - Full Width */}
          {currentQuestion && (
            <div className="panel current-question-panel">
              <h3><Clock size={20} /> Current Question</h3>
              <div className="current-question">
                <h4>{currentQuestion.question}</h4>
                <div className="question-options">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="option-preview">
                      {String.fromCharCode(65 + index)}. {option.text}
                    </div>
                  ))}
                </div>
                <div className="question-stats">
                  <span>Time Limit: {currentQuestion.timeLimit}s</span>
                  <span>Responses: {questionProgress.answered}/{questionProgress.total}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Session Results - Bottom Section - Full Width */}
        {sessionResults && (
          <div className="session-results-container">
            <div className="panel session-results-panel">
              <h3><BarChart3 size={20} /> Session Results</h3>
              
              <div className="session-summary">
                <div className="summary-item">
                  <span className="summary-label">Total Questions:</span>
                  <span className="summary-value">{sessionResults.totalQuestions}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Students:</span>
                  <span className="summary-value">{sessionResults.totalStudents}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Session Duration:</span>
                  <span className="summary-value">
                    {Math.floor(sessionResults.sessionDuration / 60)}m {sessionResults.sessionDuration % 60}s
                  </span>
                </div>
              </div>
              
              <div className="questions-results-grid">
                {sessionResults.results.map((questionResult, index) => (
                  <div key={index} className="question-result-card">
                    <div className="question-result-header">
                      <h4>Question {questionResult.questionNumber}</h4>
                      <div className="question-meta">
                        Duration: {questionResult.duration}s | Responses: {questionResult.totalResponses}
                      </div>
                    </div>
                    
                    <div className="question-title">
                      <p>{questionResult.question}</p>
                    </div>
                    
                    <PollResults 
                      results={questionResult.options}
                      totalVotes={questionResult.totalResponses}
                      showPercentages={true}
                      compact={true}
                    />
                  </div>
                ))}
              </div>
              
              <div className="results-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setSessionResults(null)}
                >
                  Close Results
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showQuestionModal && (
        <CreateQuestionModal 
          onSubmit={handleSendQuestion}
          onClose={() => setShowQuestionModal(false)}
        />
      )}

      {/* Chat Modal */}
      {showChat && (
        <div className="chat-modal">
          <div className="chat-header">
            <h3>
              <MessageCircle size={20} />
              Live Chat
              <span className="online-status"></span>
            </h3>
            <button 
              className="close-chat"
              onClick={() => setShowChat(false)}
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="chat-messages">
            {chatMessages.map(message => {
              const isMyMessage = message.senderType === 'teacher';
              
              return (
                <div 
                  key={message.id} 
                  className={`chat-message-wrapper ${isMyMessage ? 'my-message' : 'other-message'}`}
                >
                  <div className={`chat-message ${isMyMessage ? 'sent' : 'received'} ${message.senderType}`}>
                    {!isMyMessage && (
                      <div className="message-sender">
                        <span className="sender-name">{message.senderName}</span>
                        <span className="sender-type">
                          {message.senderType === 'teacher' ? '👨‍🏫' : '👨‍🎓'}
                        </span>
                      </div>
                    )}
                    <div className="message-content">
                      <div className="message-text">{message.message}</div>
                      <div className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {chatMessages.length === 0 && (
              <div className="no-messages">
                <MessageCircle size={32} />
                <p>No messages yet<br />Start the conversation!</p>
              </div>
            )}
          </div>
          
          <form onSubmit={handleSendMessage} className="chat-input-form">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="chat-input"
              maxLength={500}
            />
            <button 
              type="submit" 
              className="send-btn"
              disabled={!newMessage.trim()}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
