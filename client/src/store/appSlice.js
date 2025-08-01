import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  socket: null,
  userType: null,
  studentName: '',
  currentPoll: null,
  pollResults: null,
  students: [],
  pollHistory: [],
  timeRemaining: 0,
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setSocket: (state, action) => {
      state.socket = action.payload;
    },
    setUserType: (state, action) => {
      state.userType = action.payload;
    },
    setStudentName: (state, action) => {
      state.studentName = action.payload;
    },
    setCurrentPoll: (state, action) => {
      state.currentPoll = action.payload;
      state.timeRemaining = action.payload?.timeLimit || 0;
    },
    setPollResults: (state, action) => {
      state.pollResults = action.payload;
    },
    setStudents: (state, action) => {
      state.students = action.payload;
    },
    setPollHistory: (state, action) => {
      state.pollHistory = action.payload;
    },
    setTimeRemaining: (state, action) => {
      state.timeRemaining = action.payload;
    },
    resetPoll: (state) => {
      state.currentPoll = null;
      state.pollResults = null;
      state.timeRemaining = 0;
    },
  },
});

export const {
  setSocket,
  setUserType,
  setStudentName,
  setCurrentPoll,
  setPollResults,
  setStudents,
  setPollHistory,
  setTimeRemaining,
  resetPoll,
} = appSlice.actions;

export default appSlice.reducer;
