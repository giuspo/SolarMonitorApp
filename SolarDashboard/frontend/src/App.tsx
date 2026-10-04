import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LoginPage from './pages/LoginPage';
import TodayView from './pages/TodayView';
import SimulatorView from './pages/SimulatorView';
import HistoryView from './pages/HistoryView';
import DiagnosticsView from './pages/DiagnosticsView';
import SettingsView from './pages/SettingsView';
import BottomNav from './components/BottomNav';

const GOOGLE_CLIENT_ID = "982771788913-gdv77dso6p1k82araami072472b57h8v.apps.googleusercontent.com";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex-grow overflow-y-auto pb-20">
        {children}
      </div>
      <BottomNav />
    </>
  );
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('apiToken'));

  const handleLogin = (newToken: string) => {
    localStorage.setItem('apiToken', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('apiToken');
    setToken(null);
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <div className="h-screen w-full bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
          <Routes>
            <Route path="/login" element={
              token ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} />
            } />
            
            <Route path="/" element={
              token ? <ProtectedLayout><TodayView onLogout={handleLogout} /></ProtectedLayout> : <Navigate to="/login" />
            } />

            <Route path="/history" element={
              token ? <ProtectedLayout><HistoryView /></ProtectedLayout> : <Navigate to="/login" />
            } />

            <Route path="/simulator" element={
              token ? <ProtectedLayout><SimulatorView /></ProtectedLayout> : <Navigate to="/login" />
            } />

            <Route path="/diagnostics" element={
              token ? <ProtectedLayout><DiagnosticsView /></ProtectedLayout> : <Navigate to="/login" />
            } />

            <Route path="/settings" element={
              token ? <ProtectedLayout><SettingsView /></ProtectedLayout> : <Navigate to="/login" />
            } />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;


