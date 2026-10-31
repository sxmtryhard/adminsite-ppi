import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { AppUpdatePrompt } from './components/pwa/AppUpdatePrompt';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <AppUpdatePrompt />
    </AuthProvider>
  );
};

export default App;