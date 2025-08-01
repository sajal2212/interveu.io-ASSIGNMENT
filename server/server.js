import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", 
      "http://127.0.0.1:5173",
      "https://interveu.io-backend.onrender.com" // Replace with your actual Render domain
    ],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["my-custom-header"]
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors({
  origin: [
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "https://your-app-name.onrender.com"
  ],
  credentials: true
}));
app.use(express.json());

// Serve static files from client build
app.use(express.static(join(__dirname, '../client/dist')));

// Store poll data in memory
let currentQuestion = null;
let pollSession = {
  isActive: false,
  questions: [],
  currentQuestionIndex: -1
};
let students = new Map();
let teachers = new Set();
let questionTimer = null;
let chatMessages = [];

app.get('/', (req, res) => {
  res.json({ 
    message: 'Live Polling Server is running!',
    timestamp: new Date().toISOString(),
    connectedStudents: students.size,
    connectedTeachers: teachers.size,
    activeQuestion: currentQuestion ? currentQuestion.question : 'None',
    sessionActive: pollSession.isActive
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', server: 'Live Polling System' });
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id, 'at', new Date().toISOString());

  socket.emit('connection-confirmed', { 
    id: socket.id, 
    timestamp: new Date().toISOString() 
  });

  // Teacher joins
  socket.on('teacher-join', () => {
    console.log('Teacher registered:', socket.id);
    teachers.add(socket.id);
    
    // Join teacher room for targeted broadcasting
    socket.join('teachers');
    
    // Send current session status to teacher
    socket.emit('session-status', {
      isActive: pollSession.isActive,
      currentQuestion: currentQuestion,
      studentsCount: students.size,
      questionsCount: pollSession.questions.length
    });
    
    // Send current student list to the teacher
    socket.emit('students-update', Array.from(students.values()));
    
    console.log('Total teachers:', teachers.size);
  });

  // Student joins
  socket.on('student-join', (studentName) => {
    console.log('Student joining:', studentName, 'with ID:', socket.id);
    
    // Join student room for targeted broadcasting
    socket.join('students');
    
    students.set(socket.id, {
      id: socket.id,
      name: studentName,
      hasAnswered: false,
      joinedAt: new Date()
    });
    
    socket.emit('student-joined', { 
      id: socket.id, 
      name: studentName,
      message: 'Successfully joined the polling session'
    });
    
    // Send participant list to the new student
    socket.emit('participants-update', {
      students: Array.from(students.values()),
      totalCount: students.size
    });
    
    // Send current question if exists and is active
    if (currentQuestion && currentQuestion.isActive) {
      const student = students.get(socket.id);
      if (!student.hasAnswered) {
        console.log('Sending active question to new student:', currentQuestion.question);
        socket.emit('new-question', {
          id: currentQuestion.id,
          question: currentQuestion.question,
          options: currentQuestion.options.map(opt => ({ text: opt.text })),
          timeLimit: currentQuestion.timeLimit,
          timeRemaining: currentQuestion.timeRemaining || currentQuestion.timeLimit
        });
      }
    } else {
      // Send waiting state
      socket.emit('waiting-for-question', {
        message: pollSession.isActive ? 'Waiting for next question...' : 'Waiting for teacher to start the poll...'
      });
    }
    
    // IMPORTANT FIX: Emit to teachers room specifically
    io.to('teachers').emit('students-update', Array.from(students.values()));
    
    // Also emit participant update to all users
    io.emit('participants-update', {
      students: Array.from(students.values()),
      totalCount: students.size
    });
    
    console.log('Total students connected:', students.size);
  });

  // Teacher starts a new poll session
  socket.on('start-poll-session', () => {
    if (!teachers.has(socket.id)) {
      socket.emit('error', 'Only teachers can start poll sessions');
      return;
    }

    pollSession = {
      isActive: true,
      questions: [],
      currentQuestionIndex: -1,
      startedAt: new Date()
    };

    console.log('Poll session started by teacher:', socket.id);
    
    // Notify all users that session started
    io.emit('poll-session-started', {
      message: 'Poll session has started!'
    });

    // Update teachers specifically
    io.to('teachers').emit('session-status', {
      isActive: pollSession.isActive,
      currentQuestion: null,
      studentsCount: students.size,
      questionsCount: 0
    });
  });

  // Teacher sends a question
  socket.on('send-question', (questionData) => {
    console.log('Question sending attempt by:', socket.id);
    
    if (!teachers.has(socket.id)) {
      socket.emit('error', 'Only teachers can send questions');
      return;
    }

    if (!pollSession.isActive) {
      socket.emit('error', 'Please start a poll session first');
      return;
    }
    
    const { question, options, timeLimit = 60 } = questionData;
    
    if (!question || !options || options.length < 2) {
      socket.emit('error', 'Invalid question data. Question and at least 2 options required.');
      return;
    }

    // Clear existing timer
    if (questionTimer) {
      clearTimeout(questionTimer);
      questionTimer = null;
    }

    // Reset students' answered status
    students.forEach(student => {
      student.hasAnswered = false;
    });

    // Create new question
    currentQuestion = {
      id: uuidv4(),
      question,
      options: options.map(option => ({ text: option, votes: 0 })),
      timeLimit,
      timeRemaining: timeLimit,
      createdAt: new Date(),
      isActive: true,
      responses: new Map()
    };

    // Add to session questions
    pollSession.questions.push(currentQuestion);
    pollSession.currentQuestionIndex = pollSession.questions.length - 1;

    console.log('Broadcasting question to students. Total students:', students.size);
    
    // Send question to ALL STUDENTS using room
    io.to('students').emit('new-question', {
      id: currentQuestion.id,
      question: currentQuestion.question,
      options: currentQuestion.options.map(opt => ({ text: opt.text })),
      timeLimit: currentQuestion.timeLimit,
      timeRemaining: currentQuestion.timeLimit,
      questionNumber: pollSession.questions.length
    });
    
    // Send confirmation to TEACHER
    socket.emit('question-sent', {
      question: currentQuestion,
      questionNumber: pollSession.questions.length
    });
    
    // Update teachers with student status
    io.to('teachers').emit('students-update', Array.from(students.values()));
    
    // Start countdown timer
    startQuestionTimer(currentQuestion.timeLimit);

    console.log('Question sent successfully:', currentQuestion.id);
  });

  // Student submits answer
  socket.on('submit-answer', (data) => {
    const { questionId, optionIndex } = data;
    const student = students.get(socket.id);
    
    console.log('Answer submission:', {
      studentId: socket.id,
      studentName: student?.name,
      questionId,
      optionIndex
    });
    
    if (!student) {
      socket.emit('error', 'Student not found');
      return;
    }
    
    if (!currentQuestion || currentQuestion.id !== questionId) {
      socket.emit('error', 'Question not found or expired');
      return;
    }
    
    if (student.hasAnswered) {
      socket.emit('error', 'You have already answered this question');
      return;
    }

    if (!currentQuestion.isActive) {
      socket.emit('error', 'Question is no longer active');
      return;
    }

    if (optionIndex < 0 || optionIndex >= currentQuestion.options.length) {
      socket.emit('error', 'Invalid option selected');
      return;
    }

    // Record the answer
    currentQuestion.responses.set(socket.id, optionIndex);
    currentQuestion.options[optionIndex].votes++;
    student.hasAnswered = true;

    console.log('Answer recorded:', {
      student: student.name,
      option: currentQuestion.options[optionIndex].text,
      totalResponses: currentQuestion.responses.size
    });

    // Calculate current percentages for immediate display
    const totalResponses = currentQuestion.responses.size;
    const currentResults = currentQuestion.options.map(option => ({
      text: option.text,
      votes: option.votes,
      percentage: totalResponses > 0 ? ((option.votes / totalResponses) * 100).toFixed(1) : 0
    }));

    // Send immediate results to the student who just answered
    socket.emit('answer-submitted-with-results', {
      message: 'Your answer has been recorded!',
      results: currentResults,
      totalVotes: totalResponses,
      isPartialResults: true
    });

    // Update teachers and all users with participant status
    io.emit('participants-update', {
      students: Array.from(students.values()),
      totalCount: students.size
    });
    
    // IMPORTANT: Send updates to teachers room
    io.to('teachers').emit('students-update', Array.from(students.values()));
    io.to('teachers').emit('question-progress', {
      answered: Array.from(students.values()).filter(s => s.hasAnswered).length,
      total: students.size,
      questionId: currentQuestion.id
    });

    // Check if all students have answered
    const allAnswered = Array.from(students.values()).every(s => s.hasAnswered);
    if (allAnswered && students.size > 0) {
      console.log('All students have answered, ending question early');
      endCurrentQuestion();
    }
  });

  // Chat message handling
  socket.on('send-chat-message', (data) => {
    const { message, senderName, senderType } = data;
    
    if (!message || !message.trim()) return;
    
    const chatMessage = {
      id: uuidv4(),
      message: message.trim(),
      senderName,
      senderType, // 'student' or 'teacher'
      senderId: socket.id,
      timestamp: new Date()
    };
    
    chatMessages.push(chatMessage);
    
    // Broadcast to all users
    io.emit('new-chat-message', chatMessage);
    
    console.log('Chat message from', senderName, ':', message);
  });

  // Get chat history
  socket.on('get-chat-history', () => {
    socket.emit('chat-history', chatMessages);
  });

  // Teacher ends the poll session
  socket.on('end-poll-session', () => {
    if (!teachers.has(socket.id)) {
      socket.emit('error', 'Only teachers can end poll sessions');
      return;
    }

    if (!pollSession.isActive) {
      socket.emit('error', 'No active poll session to end');
      return;
    }

    // End current question if active
    if (currentQuestion && currentQuestion.isActive) {
      endCurrentQuestion();
    }

    // End session
    pollSession.isActive = false;
    pollSession.endedAt = new Date();

    // Calculate final results
    const finalResults = pollSession.questions.map((q, index) => {
      const totalResponses = q.responses.size;
      return {
        questionNumber: index + 1,
        question: q.question,
        options: q.options.map(opt => ({
          text: opt.text,
          votes: opt.votes,
          percentage: totalResponses > 0 ? ((opt.votes / totalResponses) * 100).toFixed(1) : 0
        })),
        totalResponses,
        duration: q.endedAt ? Math.round((q.endedAt - q.createdAt) / 1000) : q.timeLimit
      };
    });

    // Send final results to teacher
    socket.emit('poll-session-ended', {
      totalQuestions: pollSession.questions.length,
      totalStudents: students.size,
      results: finalResults,
      sessionDuration: Math.round((new Date() - pollSession.startedAt) / 1000)
    });

    // Notify all students
    io.to('students').emit('session-ended', {
      message: 'Poll session has ended. Thank you for participating!'
    });

    console.log('Poll session ended with', pollSession.questions.length, 'questions');
  });

  // Teacher removes student
  socket.on('remove-student', (studentId) => {
    if (!teachers.has(socket.id)) return;
    
    const student = students.get(studentId);
    if (student) {
      console.log('Removing student:', student.name);
      students.delete(studentId);
      
      // Send specific removal message to the student
      io.to(studentId).emit('removed-by-teacher', {
        message: `You have been removed from the session by the teacher.`,
        studentName: student.name
      });
      
      // Update participant list for all remaining users
      io.emit('participants-update', {
        students: Array.from(students.values()),
        totalCount: students.size
      });
      
      // IMPORTANT: Update teachers specifically
      io.to('teachers').emit('students-update', Array.from(students.values()));
    }
  });

  // Handle disconnection - FIXED
  socket.on('disconnect', (reason) => {
    console.log('User disconnected:', socket.id, 'Reason:', reason);
    
    // Remove from teachers and students
    const wasTeacher = teachers.has(socket.id);
    teachers.delete(socket.id);
    
    const student = students.get(socket.id);
    if (student) {
      console.log('Student left:', student.name);
      students.delete(socket.id);
      
      // Update participant list for all remaining users
      io.emit('participants-update', {
        students: Array.from(students.values()),
        totalCount: students.size
      });
      
      // IMPORTANT: Update teachers specifically
      io.to('teachers').emit('students-update', Array.from(students.values()));
    }
    
    console.log('Remaining - Teachers:', teachers.size, 'Students:', students.size);
  });
});

// Function to start question timer
function startQuestionTimer(timeLimit) {
  let timeRemaining = timeLimit;
  
  const countdown = setInterval(() => {
    timeRemaining--;
    
    // Update time remaining for all users
    io.emit('time-update', { timeRemaining });
    
    if (timeRemaining <= 0) {
      clearInterval(countdown);
      endCurrentQuestion();
    }
  }, 1000);
  
  questionTimer = countdown;
}

// Function to end current question
function endCurrentQuestion() {
  if (currentQuestion && currentQuestion.isActive) {
    currentQuestion.isActive = false;
    currentQuestion.endedAt = new Date();
    
    console.log('Ending question:', currentQuestion.question, 'Total votes:', currentQuestion.responses.size);
    
    // Calculate percentages
    const totalResponses = currentQuestion.responses.size;
    const resultsWithPercentages = currentQuestion.options.map(option => ({
      text: option.text,
      votes: option.votes,
      percentage: totalResponses > 0 ? ((option.votes / totalResponses) * 100).toFixed(1) : 0
    }));
    
    // Send results to ALL users immediately
    io.emit('question-ended', {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      results: resultsWithPercentages,
      totalVotes: totalResponses,
      questionNumber: pollSession.questions.length
    });
    
    // Clear timer
    if (questionTimer) {
      clearInterval(questionTimer);
      questionTimer = null;
    }
    
    // Reset current question but DON'T end the session
    currentQuestion = null;
    
    console.log('Question ended successfully, session continues...');
  }
}

// Catch all handler for client-side routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Live Polling Server is running on port ${PORT}`);
  console.log(`📊 Server started at: ${new Date().toISOString()}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});
