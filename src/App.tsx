import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { CreateVideo } from './components/CreateVideo';
import { VideoGeneration } from './components/VideoGeneration';
import { VideoPreview } from './components/VideoPreview';
import { Settings } from './components/Settings';
import { Subscription } from './components/Subscription';
import { useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        Loading your workspace...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute><CreateVideo /></ProtectedRoute>} />
        <Route path="/generating" element={<ProtectedRoute><VideoGeneration /></ProtectedRoute>} />
        <Route path="/preview/:id" element={<ProtectedRoute><VideoPreview /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
