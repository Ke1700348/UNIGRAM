import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import ReelCard from '../components/ReelCard';
import CommentSheet from '../components/CommentSheet';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function Reels({ user }) {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedReel, setSelectedReel] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Hidden body overflow to prevent standard scrolling competing with nice snap
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  useEffect(() => {
    // Fallback query to fetch recent reels to avoid composite index failure in preview
    const q = query(
      collection(db, 'posts'),
      where('type', '==', 'reel'),
      orderBy('createdAt', 'desc'), // Newest reels
      limit(20)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newReels = [];
      const now = Date.now();
      snapshot.forEach(doc => {
        const data = doc.data();
        const expiry = data.expiresAt?.toMillis() || (data.createdAt?.toMillis() ? data.createdAt.toMillis() + (48*60*60*1000) : now + 1000);
        if (expiry > now) {
          newReels.push({ id: doc.id, ...data });
        }
      });
      setReels(newReels);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const items = containerRef.current.children;
    let closestIndex = 0;
    let minDiff = Infinity;
    
    // Find which reel is closest to viewport center
    const center = window.innerHeight / 2;
    for (let i = 0; i < items.length - 1; i++) { // -1 to skip loading div if present
      const rect = items[i].getBoundingClientRect();
      const itemCenter = rect.top + rect.height / 2;
      const diff = Math.abs(center - itemCenter);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    
    if (closestIndex !== activeIndex) {
      setActiveIndex(closestIndex);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black min-h-screen w-full relative sm:pb-0"
    >
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[100dvh] md:h-full w-full max-w-3xl mx-auto overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-t-pop border-border rounded-full"></div>
          </div>
        ) : reels.length === 0 ? (
          <div className="h-full flex items-center justify-center flex-col text-white">
            <span className="text-4xl mb-4">🎬</span>
            <p className="font-mono text-sm tracking-tight text-center max-w-[200px]">no reels found.<br/>upload the first one.</p>
          </div>
        ) : (
          reels.map((reel, index) => (
            <ReelCard 
              key={reel.id} 
              reel={reel} 
              user={user} 
              isActive={index === activeIndex} 
              onOpenComments={setSelectedReel}
            />
          ))
        )}
        {/* Placeholder pad for bottom nav so last reel doesn't get covered, but actually reels are full screen height so it sits behind the transparent bottom nav */}
      </div>

      {selectedReel && (
        <div className="absolute inset-0 z-50 pointer-events-auto">
          <CommentSheet 
            post={selectedReel} 
            user={user} 
            onClose={() => setSelectedReel(null)} 
          />
        </div>
      )}
    </motion.div>
  );
}
