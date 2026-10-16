import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  tone: 'success' | 'danger';
  text: string;
}

export const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: [] as Notification[],
  reducers: {
    notified: {
      // `prepare` keeps the reducer pure: the random id is created by the action creator.
      prepare: (tone: Notification['tone'], text: string) => ({
        payload: { id: nanoid(), tone, text },
      }),
      reducer: (state, action: PayloadAction<Notification>) => {
        state.unshift(action.payload);
      },
    },
    dismissed(state, action: PayloadAction<string>) {
      return state.filter((notification) => notification.id !== action.payload);
    },
  },
  selectors: {
    selectNotifications: (state) => state,
  },
});

export const { notified, dismissed } = notificationsSlice.actions;
export const { selectNotifications } = notificationsSlice.selectors;
