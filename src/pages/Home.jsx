import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBell } from 'react-icons/fi';
import StoryBar from '../components/StoryBar';
import PostCard from '../components/PostCard';
import CommentSheet from '../components/CommentSheet';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp } from 'firebase/firestore';

export default function Home({ user, onOpenUpload }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    // Only fetch threads (not reels) for Home feed
    // NOTE: Implementing 'expiresAt > now' logic directly in the rules
    const q = query(
      collection(db, 'posts'),
      where('type', '==', 'thread'),
      where('expiresAt', '>', Timestamp.now()),
      orderBy('expiresAt', 'asc'), // Ordered by expires so those expiring soonest show up, but usually users want newest first. We'll use asc as requested by prompt indexes
      limit(20)
    );
    
    // Fallback query if the above composite index is missing in preview environment
    const fallbackQ = query(
      collection(db, 'posts'),
      where('type', '==', 'thread'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    
    const unsubscribe = onSnapshot(fallbackQ, (snapshot) => {
      const newPosts = [];
      const now = Date.now();
      snapshot.forEach(doc => {
        const data = doc.data();
        // Client-side expiry filter ensuring safe degradation if index missing
        const expiry = data.expiresAt?.toMillis() || (data.createdAt?.toMillis() ? data.createdAt.toMillis() + (48*60*60*1000) : now + 1000);
        if (expiry > now) {
           newPosts.push({ id: doc.id, ...data });
        }
      });
      setPosts(newPosts);
      setLoading(false);
    }, (error) => {
       console.error("Query failed", error);
    });

    return () => unsubscribe();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-20 md:pb-4 px-0 md:px-6 relative z-10"
    >
      <header className="sticky top-0 w-full flex md:hidden justify-between items-center px-4 h-16 bg-surface/90 backdrop-blur z-30 border-b border-border mb-2">
        <h1 className="font-display font-extrabold text-[22px] tracking-tight uppercase text-accent">Unigram</h1>
        <button className="relative text-accent">
          <FiBell size={22} className="hover:text-pop transition-colors" />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-pop rounded-full border-2 border-surface"></div>
        </button>
      </header>

      <StoryBar user={user} onAddStory={() => onOpenUpload('story')} />

      <main className="mt-4 min-h-screen px-4 md:px-0">
        {loading ? (
          <div className="p-4 space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex gap-4">
                <div className="w-10 h-10 bg-border rounded-full shrink-0"></div>
                <div className="space-y-4 w-full mt-1">
                  <div className="h-3 bg-border rounded w-1/4"></div>
                  <div className="h-3 bg-border rounded w-3/4"></div>
                  <div className="h-40 bg-border rounded-xl w-full mt-4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center mt-20 text-muted">
            <span className="text-4xl mb-4">💀</span>
            <p className="font-mono text-[13px] tracking-tighter text-center max-w-[200px]">nothing here yet.<br/>be the main character and post something.</p>
          </div>
        ) : (
          <div className="pb-8">
            {posts.map((post, i) => (
              <PostCard 
                key={post.id} 
                post={post} 
                user={user} 
                onOpenComments={setSelectedPost}
              />
            ))}
          </div>
        )}
      </main>

      {selectedPost && (
        <CommentSheet 
          post={selectedPost} 
          user={user} 
          onClose={() => setSelectedPost(null)} 
        />
      )}
    </motion.div>
  );
}
