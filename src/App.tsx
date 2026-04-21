import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import Login from './pages/Login';
import Home from './pages/Home';
import Reels from './pages/Reels';
import Search from './pages/Search';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import BottomNav from './components/BottomNav';
import UploadModal from './components/UploadModal';
import TrendingRightPanel from './components/TrendingRightPanel';
import { TimerProvider } from './contexts/TimerContext';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false); // false | 'thread' | 'reel' | 'story'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Check if user exists in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        let userData = {
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'Anonymous',
          avatarURL: currentUser.photoURL || '',
        };

        if (userSnap.exists()) {
          userData = { ...userData, ...userSnap.data() };
        } else {
          // New user
          const defaultUsername = (currentUser.displayName || 'user').replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
          userData.username = defaultUsername;
          userData.followers = [];
          userData.following = [];
          userData.bio = '';
          userData.vibeTag = 'newbie';
          userData.createdAt = new Date().getTime();
          
          await setDoc(userRef, userData);
        }
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full bg-bg flex items-center justify-center">
        <div className="animate-pulse text-pop font-display text-2xl font-bold tracking-widest">UNIGRAM</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <TimerProvider>
      <Router>
        <div className="bg-bg text-accent md:h-screen md:overflow-hidden flex md:justify-center">
          <div className="flex flex-col md:flex-row w-full lg:w-[1024px] relative bg-bg min-h-screen md:min-h-0">
            {/* pass a type so users arriving through post it go to thread */}
            <BottomNav onOpenUpload={() => setIsUploadOpen('thread')} user={user} />
            
            <main className="flex-1 w-full bg-bg md:border-r border-border flex flex-col md:overflow-hidden relative pb-16 md:pb-0">
              <div className="flex-1 md:overflow-y-auto hidden-scroll relative z-0">
                <Routes>
                  <Route path="/" element={<Home user={user} onOpenUpload={(type) => setIsUploadOpen(type)} />} />
                  <Route path="/reels" element={<Reels user={user} />} />
                  <Route path="/search" element={<Search user={user} />} />
                  <Route path="/notifications" element={<Notifications user={user} />} />
                  <Route path="/profile/:username" element={<Profile user={user} />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </main>
            
            <div className="hidden lg:block w-[320px] shrink-0 border-r-0 border-border md:h-screen overflow-y-auto hidden-scroll">
              <TrendingRightPanel />
            </div>
          </div>
          {isUploadOpen && <UploadModal user={user} onClose={() => setIsUploadOpen(false)} initialType={typeof isUploadOpen === 'string' ? isUploadOpen : 'thread'} />}
        </div>
      </Router>
    </TimerProvider>
  );
}
