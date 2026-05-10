/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Ongoing from './pages/Ongoing';
import Movies from './pages/Movies';
import Completed from './pages/Completed';
import Latest from './pages/Latest';
import Browse from './pages/Browse';
import Schedule from './pages/Schedule';
import Search from './pages/Search';
import Detail from './pages/Detail';
import Watch from './pages/Watch';
import History from './pages/History';
import Profile from './pages/Profile';
import Help from './pages/Help';
import WatchTogether from './pages/WatchTogether';
import NobarRoom from './pages/NobarRoom';
import AdminDashboard from './pages/AdminDashboard';
import PublicProfile from './pages/PublicProfile';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import ComicHome from './pages/ComicHome';
import ComicDetail from './pages/ComicDetail';
import ComicRead from './pages/ComicRead';
import Welcome from './pages/Welcome';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { userService } from './services/userService';

import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setInitializing(false);
      
      if (user) {
        // Bootstrap admin if this is the owner email
        userService.bootstrapAdmin().then(() => {
          // Check if admin status changed after bootstrap
          window.dispatchEvent(new CustomEvent('admin-status-updated'));
        });
        
        // Initial presence update
        userService.updatePresence(true);
        
        // Presence Heartbeat every 2 minutes
        const interval = setInterval(() => {
          userService.updatePresence(true);
        }, 2 * 60 * 1000);
        
        return () => {
          clearInterval(interval);
          userService.updatePresence(false);
        };
      }
    });
    return () => unsubscribe();
  }, []);

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="text-[#EF4444] animate-spin" size={48} />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/ongoing" element={<Ongoing />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/completed" element={<Completed />} />
          <Route path="/latest" element={<Latest />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/search" element={<Search />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/help" element={<Help />} />
          <Route path="/nobar" element={<WatchTogether />} />
          <Route path="/nobar/:roomId" element={<WatchTogether />} />
          <Route path="/nobar/:slug/:episode" element={<NobarRoom />} />
          <Route path="/genre/:genreId" element={<Search />} />
          <Route path="/login" element={<Login />} />
          <Route path="/anime/:slug" element={<Detail />} />
          <Route path="/anime/:slug/:episode" element={<Watch />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/u/:username" element={<PublicProfile />} />
          <Route path="/comic" element={<ComicHome />} />
          <Route path="/comic/:slug" element={<ComicDetail />} />
          <Route path="/comic-read/:chapterSlug" element={<ComicRead />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
