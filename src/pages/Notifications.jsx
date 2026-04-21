import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

export default function Notifications({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, follows, posts
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = [];
      snapshot.forEach(doc => {
        notifs.push({ id: doc.id, ...doc.data() });
      });
      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAllRead = () => {
    notifications.filter(n => !n.read).forEach(async (n) => {
      await updateDoc(doc(db, 'notifications', n.id), { read: true });
    });
  };

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'follows') return n.type === 'follow';
    return n.type === 'like' || n.type === 'comment' || n.type === 'repost';
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-20 md:pb-0 min-h-screen"
    >
      <header className="sticky top-0 bg-surface/90 backdrop-blur z-20 px-4 pt-4 pb-2 border-b border-border flex justify-between items-end">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-widest uppercase mb-4">Activity</h1>
          <div className="flex gap-4">
            {['all', 'follows', 'posts'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`pb-2 text-sm font-bold uppercase tracking-wider relative transition-colors ${filter === tab ? 'text-accent' : 'text-muted hover:text-accent/70'}`}
              >
                {tab}
                {filter === tab && (
                  <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
        <button onClick={markAllRead} className="text-xs font-mono text-muted hover:text-accent pb-2">mark all read</button>
      </header>

      <div className="divide-y divide-border/50">
        {loading ? (
          <div className="p-4 space-y-4">
             {[1,2,3,4].map(i => <div key={i} className="h-12 bg-surface animate-pulse rounded" />)}
          </div>
        ) : filteredNotifs.length === 0 ? (
          <div className="flex flex-col items-center mt-20 text-muted">
            <span className="text-4xl mb-4">🔕</span>
            <p className="font-mono text-sm tracking-tight text-center">no activity matching this filter.</p>
          </div>
        ) : (
          filteredNotifs.map((n, i) => (
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              key={n.id} 
              className={`p-4 flex gap-3 items-center hover:bg-surface/50 cursor-pointer transition-colors ${!n.read ? 'border-l-2 border-l-pop bg-pop/5' : ''}`}
            >
              <img src={n.fromAvatarURL || `https://ui-avatars.com/api/?name=${n.fromUsername}&background=random`} alt="" className="w-10 h-10 rounded-full shrink-0" />
              
              <div className="flex-1 text-sm">
                <span className="font-bold">{n.fromUsername}</span>
                <span className="text-muted ml-1">
                  {n.type === 'like' && 'liked your post'}
                  {n.type === 'comment' && 'commented on your post'}
                  {n.type === 'follow' && 'started following you'}
                  {n.type === 'repost' && 'reposted your post'}
                </span>
                <div className="text-[10px] font-mono text-muted mt-0.5">
                  {n.createdAt?.toDate ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : 'now'}
                </div>
              </div>

              {n.postThumbURL && (
                <img src={n.postThumbURL} alt="post thumb" className="w-10 h-10 object-cover rounded aspect-square shrink-0 border border-border" />
              )}
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
