/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Clock, CheckCircle, User, AlertCircle, Hourglass, Users, MessageCircle, Send, X } from 'lucide-react';
import PollResults from './PollResults';
import { setStudentName } from '../store/appSlice';

const StudentDashboard = ({ socket }) => {
  const dispatch = useDispatch();
  const { studentName } = useSelector(state => state.app);
  const [nameInput, setNameInput] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [questionResults, setQuestionResults] = useState(null);
  const [waitingMessage, setWaitingMessage] = useState('');
  const [error, setError] = useState('');
  const [sessionEnded, setSessionEnded] = useState(false);
  const [isInSession, setIsInSession] = useState(false);
  
  // New states for participants and chat
  const [participants, setParticipants] = useState([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showRemovalMessage, setShowRemovalMessage] = useState(false);
  const [removalMessage, setRemovalMessage] = useState('');

  useEffect(() => {
    socket.on('student-joined', (data) => {
      dispatch(setStudentName(data.name));
    });

    socket.on('waiting-for-question', (data) => {
      setWaitingMessage(data.message);
      setCurrentQuestion(null);
      setQuestionResults(null);
      setHasSubmitted(false);
      setSessionEnded(false);
      setIsInSession(false);
    });

    socket.on('poll-session-started', (data) => {
      setWaitingMessage('Poll session started! Waiting for first question...');
      setIsInSession(true);
      setSessionEnded(false);
      setQuestionResults(null);
    });

    socket.on('new-question', (question) => {
      console.log('New question received:', question);
      setCurrentQuestion(question);
      setSelectedOption(null);
      setHasSubmitted(false);
      setQuestionResults(null);
      setTimeRemaining(question.timeRemaining);
      setWaitingMessage('');
      setError('');
      setIsInSession(true);
    });

    socket.on('time-update', (data) => {
      setTimeRemaining(data.timeRemaining);
    });

    // Handle immediate results after submission
    socket.on('answer-submitted-with-results', (response) => {
      setHasSubmitted(true);
      setQuestionResults({
        results: response.results,
        totalVotes: response.totalVotes,
        isPartialResults: response.isPartialResults
      });
    });

    socket.on('question-ended', (results) => {
      console.log('Question ended, showing final results:', results);
      setQuestionResults({
        results: results.results,
        totalVotes: results.totalVotes,
        isPartialResults: false
      });
      setCurrentQuestion(null);
      setHasSubmitted(false);
      setTimeRemaining(0);
      
      // After showing results, wait for next question
      setTimeout(() => {
        if (isInSession && !sessionEnded) {
          setWaitingMessage('Waiting for next question...');
        }
      }, 5000); // Show results for 5 seconds
    });

    socket.on('session-ended', (data) => {
      console.log('Session ended:', data);
      setSessionEnded(true);
      setIsInSession(false);
      setCurrentQuestion(null);
      setQuestionResults(null);
      setHasSubmitted(false);
      setTimeRemaining(0);
      setWaitingMessage('');
    });

    // Participants update
    socket.on('participants-update', (data) => {
      setParticipants(data.students);
      setTotalParticipants(data.totalCount);
    });

    // Chat functionality
    socket.on('new-chat-message', (message) => {
      setChatMessages(prev => [...prev, message]);
    });

    socket.on('chat-history', (history) => {
      setChatMessages(history);
    });

    // Enhanced removal handling
    socket.on('removed-by-teacher', (data) => {
      setRemovalMessage(data.message || 'You have been removed from the session by the teacher.');
      setShowRemovalMessage(true);
    });

    socket.on('error', (errorMessage) => {
      setError(errorMessage);
    });

    // Request chat history when component mounts
    if (studentName) {
      socket.emit('get-chat-history');
    }

    return () => {
      socket.off('student-joined');
      socket.off('waiting-for-question');
      socket.off('poll-session-started');
      socket.off('new-question');
      socket.off('time-update');
      socket.off('answer-submitted-with-results');
      socket.off('question-ended');
      socket.off('session-ended');
      socket.off('participants-update');
      socket.off('new-chat-message');
      socket.off('chat-history');
      socket.off('removed-by-teacher');
      socket.off('error');
    };
  }, [socket, dispatch, isInSession, sessionEnded, studentName]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (nameInput.trim()) {
      socket.emit('student-join', nameInput.trim());
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedOption !== null && currentQuestion) {
      setError('');
      socket.emit('submit-answer', {
        questionId: currentQuestion.id,
        optionIndex: selectedOption
      });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      socket.emit('send-chat-message', {
        message: newMessage.trim(),
        senderName: studentName,
        senderType: 'student'
      });
      setNewMessage('');
    }
  };

  const handleLeaveSession = () => {
    window.location.reload();
  };

  // Name entry screen
  if (!studentName) {
    return (
      <div className="student-join">
        <div className="join-container">
          <h1>Join Live Poll</h1>
          <form onSubmit={handleJoin}>
            <div className="input-group">
              <User size={20} />
              <input
                type="text"
                placeholder="Enter your name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Join Session
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Show removal message
  if (showRemovalMessage) {
    return (
      <div className="removal-message-screen">
        <div className="removal-content">
          <AlertCircle size={48} color="#dc2626" />
          <h2>Removed from Session</h2>
          <p className="removal-text">{removalMessage}</p>
          <button 
            onClick={handleLeaveSession}
            className="btn btn-primary leave-btn"
          >
            Leave Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      <header className="dashboard-header">
        <h1>Student Dashboard</h1>
        <div className="header-info">
          <div className="student-info">
            Welcome, {studentName}
          </div>
          <div className="participants-info">
            <Users size={16} />
            <span>{totalParticipants} participants</span>
          </div>
          <button 
            className="btn btn-secondary chat-toggle"
            onClick={() => setShowChat(!showChat)}
          >
            <MessageCircle size={16} />
            Chat
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="main-content">
          {error && (
            <div className="error-message">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {sessionEnded ? (
            // Session ended by teacher
            <div className="session-ended">
              <div className="session-ended-content">
                <CheckCircle size={48} color="#22c55e" />
                <h2>Session Completed</h2>
                <p className="end-message">Teacher has ended the session. You may leave.</p>
                <p className="thank-you">Thank you for participating!</p>
                <button 
                  onClick={handleLeaveSession}
                  className="btn btn-primary leave-btn"
                >
                  Leave Session
                </button>
              </div>
            </div>
          ) : currentQuestion && !hasSubmitted && timeRemaining > 0 ? (
            // Active Question - Student can answer
            <div className="active-question">
              <div className="question-header">
                <div className="question-timer">
                  <Clock size={20} />
                  <span>{timeRemaining}s remaining</span>
                </div>
                <div className="question-number">
                  Question #{currentQuestion.questionNumber}
                </div>
              </div>
              
              <div className="question-content">
                <h2>{currentQuestion.question}</h2>
              </div>

              <div className="question-options">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    className={`option-button ${selectedOption === index ? 'selected' : ''}`}
                    onClick={() => setSelectedOption(index)}
                  >
                    <span className="option-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="option-text">
                      {option.text}
                    </span>
                  </button>
                ))}
              </div>

              <button 
                className="btn btn-primary submit-btn"
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
              >
                Submit Answer
              </button>
            </div>
          ) : questionResults ? (
            // Show Results immediately after answering or final results
            <div className="question-results-container">
              <div className="results-header">
                <CheckCircle size={24} color="#22c55e" />
                <h2>
                  {questionResults.isPartialResults ? 'Current Results' : 'Final Results'}
                </h2>
              </div>
              <div className="question-title">
                <h3>Question Results</h3>
              </div>
              <PollResults 
                results={questionResults.results}
                totalVotes={questionResults.totalVotes}
                showPercentages={true}
              />
              {questionResults.isPartialResults ? (
                <div className="waiting-final">
                  <Hourglass size={20} />
                  <p>Waiting for all participants to answer...</p>
                </div>
              ) : (
                <div className="waiting-next">
                  <Hourglass size={20} />
                  <p>Waiting for next question...</p>
                </div>
              )}
            </div>
          ) : (
            // Waiting state
            <div className="waiting-state">
              <div className="waiting-content">
                <h2>Waiting</h2>
                <p>{waitingMessage || 'Waiting for teacher to start the poll...'}</p>
                <div className="loading-spinner"></div>
                {isInSession && (
                  <div className="session-indicator">
                    <div className="session-badge">
                      <div className="session-dot"></div>
                      <span>In Session</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Participants Sidebar */}
        <div className="participants-sidebar">
          <h3>
            <Users size={20} />
            Participants ({totalParticipants})
          </h3>
          <div className="participants-list">
            {participants.map(participant => (
              <div key={participant.id} className="participant-item">
                <span className="participant-name">{participant.name}</span>
                {currentQuestion && (
                  <span className={`participant-status ${participant.hasAnswered ? 'answered' : 'pending'}`}>
                    {participant.hasAnswered ? '✓' : '⏳'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

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
              <X size={20} />
            </button>
          </div>
          
          <div className="chat-messages">
            {chatMessages.map(message => {
              const isMyMessage = message.senderId === socket.id || message.senderName === studentName;
              
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
                <MessageCircle size={24} color="#a0aec0" />
                <p>No messages yet. Start the conversation!</p>
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
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
