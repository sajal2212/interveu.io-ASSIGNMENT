import { configureStore } from '@reduxjs/toolkit';
import appSlice from './appSlice';

export const store = configureStore({
  reducer: {
    app: appSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['app/setSocket'],
        ignoredPaths: ['app.socket'],
      },
    }),
});
