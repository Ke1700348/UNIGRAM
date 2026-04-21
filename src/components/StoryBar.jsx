import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export default function StoryBar({ user, onAddStory }) {
  const [stories, setStories] = useState([]);

  useEffect(() => {
    // Fetch stories from Firestore
    const q = query(
      collection(db, 'posts'),
      where('type', '==', 'story'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const uniqueUsers = new Map();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const expiry = data.expiresAt?.toMillis() || (data.createdAt?.toMillis() ? data.createdAt.toMillis() + (24*60*60*1000) : now - 1000);
        
        if (expiry > now && !uniqueUsers.has(data.userId)) {
          uniqueUsers.set(data.userId, { 
            id: doc.id,
            userId: data.userId,
            username: data.username,
            avatar: data.avatarURL,
            unseen: true // Real unseen logic would require viewedby tracking
          });
        }
      });
      
      setStories(Array.from(uniqueUsers.values()));
    });

    return () => unsubscribe();
  }, []);

  return (
    <motion.div 
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="py-6 px-4 flex gap-4 overflow-x-auto hidden-scroll border-b border-border"
    >
      {/* Current user 'Add Story' button */}
      <div onClick={onAddStory} className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0">
        <div className="w-16 h-16 rounded-full border-2 border-muted p-0.5 relative">
          <div className="w-full h-full rounded-full overflow-hidden bg-muted">
            <img 
              src={user?.avatarURL || `https://ui-avatars.com/api/?name=${user?.username}&background=random`} 
              alt="Your Story" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-accent border-2 border-surface rounded-full w-6 h-6 flex items-center justify-center text-bg text-[10px] font-bold z-10">
            +
          </div>
        </div>
        <span className="text-[11px] font-mono text-muted truncate w-full text-center max-w-[64px]">
          Story
        </span>
      </div>

      {/* Render actual active stories */}
      {stories.map((story) => (
        <div key={story.id} className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0">
          <div className={`w-16 h-16 rounded-full border-2 ${story.unseen ? 'border-pop2' : 'border-muted'} p-0.5 relative`}>
            <div className="w-full h-full rounded-full overflow-hidden bg-muted">
              <img 
                src={story.avatar || `https://ui-avatars.com/api/?name=${story.username}&background=random`} 
                alt={story.username} 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <span className="text-[11px] font-mono text-muted truncate w-full text-center max-w-[64px]">
            {story.username}
          </span>
        </div>
      ))}
    </motion.div>
  );
}

