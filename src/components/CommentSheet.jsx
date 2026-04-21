import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { FiX, FiSend } from 'react-icons/fi';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

export default function CommentSheet({ post, user, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!post) return;
    const q = query(
      collection(db, 'comments'),
      where('postId', '==', post.id),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const comms = [];
      snapshot.forEach(doc => {
        comms.push({ id: doc.id, ...doc.data() });
      });
      setComments(comms);
    });

    return () => unsubscribe();
  }, [post]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || !user || !post) return;
    setSending(true);
    
    try {
      await addDoc(collection(db, 'comments'), {
        postId: post.id,
        userId: user.uid,
        username: user.username,
        avatarURL: user.avatarURL,
        text: text.trim(),
        likes: [],
        createdAt: serverTimestamp()
      });

      // Update post comment count
      await updateDoc(doc(db, 'posts', post.id), {
        commentCount: increment(1)
      });
      
      setText('');
    } catch (e) {
      console.error(e);
      alert("failed to comment");
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm flex items-end justify-center"
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className="bg-surface w-full max-w-lg rounded-t-3xl border-t border-x border-border h-[80vh] flex flex-col pt-2"
        >
          {/* Handle */}
          <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-4 cursor-pointer" onClick={onClose} />
          
          <div className="flex justify-between items-center px-6 mb-4">
            <h3 className="font-display font-bold uppercase tracking-widest text-sm">Comments</h3>
            <button onClick={onClose} className="p-1 text-muted hover:text-accent"><FiX size={20}/></button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 no-scrollbar">
            {comments.length === 0 ? (
              <div className="text-center text-muted font-mono text-xs mt-10">
                no comments yet. be the first 💀
              </div>
            ) : (
              comments.map(c => (
                <div key={c.id} className="flex gap-3 mb-4 animate-fade-in">
                  <img src={c.avatarURL || `https://ui-avatars.com/api/?name=${c.username}&background=random`} alt="" className="w-8 h-8 rounded-full shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm tracking-tight">{c.username}</span>
                      <span className="text-muted text-[10px] font-mono">
                         {c.createdAt?.toDate ? formatDistanceToNow(c.createdAt.toDate()) : 'now'}
                      </span>
                    </div>
                    <p className="text-sm">{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Composer */}
          <div className="p-4 border-t border-border bg-surface relative sm:mb-0 mb-safe">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <img src={user?.avatarURL || `https://ui-avatars.com/api/?name=${user?.username}&background=random`} alt="" className="w-10 h-10 rounded-full" />
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={`Reply as @${user?.username}...`}
                  className="w-full bg-bg rounded-full px-4 py-2 border border-border outline-none focus:border-muted pr-10 text-sm"
                />
                <button 
                  type="submit" 
                  disabled={!text.trim() || sending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-pop disabled:text-muted p-1"
                >
                  <FiSend size={18} />
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
