import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { FiHeart, FiMessageCircle, FiRepeat, FiShare, FiMoreHorizontal } from 'react-icons/fi';
import { db } from '../firebase';
import { doc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useSharedTimer } from '../contexts/TimerContext';

export default function PostCard({ post, user, onOpenComments }) {
  const [isLiked, setIsLiked] = useState(post.likes?.includes(user?.uid));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [showHeartPopup, setShowHeartPopup] = useState(false);

  const now = useSharedTimer();
  
  // Calculate Time logic
  // Fallback to legacy +48h if expiresAt is missing from older posts, or set 10s valid if no date
  const expiryTime = post.expiresAt?.toMillis() || (post.createdAt?.toMillis() ? post.createdAt.toMillis() + 48 * 60 * 60 * 1000 : Date.now() + 10000);
  const timeLeftMs = expiryTime - now;

  // Render nothing if expired (enforces front-end safety even if Cloud Function hasn't cleaned up yet)
  if (timeLeftMs <= 0) return null;

  const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));
  const minsLeft = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));

  let timeColor = "text-muted border-border bg-transparent"; // default normal
  if (hoursLeft < 12 && hoursLeft >= 3) timeColor = "text-yellow-400 border-yellow-400/30 bg-yellow-400/5"; // warning
  if (hoursLeft < 3) timeColor = "text-red-500 border-red-500/30 bg-red-500/10 animate-pulse"; // urgent

  const timeDisplay = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m left` : `${minsLeft}m left`;

  const handleLike = async () => {
    if (!user) return;
    const postRef = doc(db, 'posts', post.id);
    const currentlyLiked = isLiked;
    
    setIsLiked(!currentlyLiked);
    setLikesCount(prev => currentlyLiked ? prev - 1 : prev + 1);

    try {
      await updateDoc(postRef, {
        likes: currentlyLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch(e) {
      console.error(e);
      // Revert if failed
      setIsLiked(currentlyLiked);
      setLikesCount(prev => currentlyLiked ? prev + 1 : prev - 1);
    }
  };

  const handleDoubleTap = (e) => {
    // Basic double tap detection is sometimes tricky in React without libs, but this is a simple check
    if (!isLiked) {
      handleLike();
    }
    setShowHeartPopup(true);
    setTimeout(() => setShowHeartPopup(false), 800);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    alert("link copied ✓");
  };

  const formattedTime = post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'just now';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-surface border border-border rounded-2xl mb-4 relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-3 relative z-10">
        <div className="flex gap-3">
          <img src={post.avatarURL || `https://ui-avatars.com/api/?name=${post.username}&background=random`} alt={post.username} className="w-10 h-10 rounded-full object-cover bg-muted" />
          <div className="leading-tight">
            <div className="flex items-center gap-1">
              <span className="font-bold text-[15px] font-body text-accent tracking-tighter">{post.displayName}</span>
              {post.verified && <span className="text-pop2 text-[12px]">✦</span>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-muted font-mono text-[13px] tracking-tight">@{post.username}</span>
              <span className="text-muted text-[10px]">&bull; {formattedTime.replace('about ', '')}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`text-[10px] font-mono px-2 py-1 rounded border tracking-tight ${timeColor}`}>
            ⏳ {timeDisplay}
          </div>
          {post.vibeLabel && (
            <span className="text-[10px] uppercase font-bold tracking-wider bg-pop/10 px-2 py-1 flex items-center rounded-full text-pop h-fit whitespace-nowrap">
              {post.vibeLabel}
            </span>
          )}
          {post.userId === user?.uid && (
            <button className="text-muted hover:text-accent"><FiMoreHorizontal /></button>
          )}
        </div>
      </div>

      <div onDoubleClick={handleDoubleTap}>
        <p className="text-[15px] leading-relaxed mb-3 break-words whitespace-pre-wrap text-accent/90">{post.text}</p>
        
        <AnimatePresence>
          {showHeartPopup && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            >
              <FiHeart size={80} className="text-pop fill-pop" />
            </motion.div>
          )}
        </AnimatePresence>

        {post.imageURL && (
          <div className="rounded-xl overflow-hidden bg-[#1a1a1a] flex items-center justify-center max-h-[400px] mb-4 border border-border">
            <img src={post.imageURL} alt="post" className="w-full h-full object-contain" />
          </div>
        )}
        
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {post.hashtags.map(t => (
              <span key={t} className="text-pop text-[13px] font-mono hover:underline cursor-pointer">#{t}</span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-6 mt-4 text-muted text-[13px]">
          <button onClick={handleLike} className="flex items-center gap-1.5 hover:text-pop transition-colors group">
            <motion.div whileTap={{ scale: 1.6 }} transition={{ type: "spring" }}>
              <FiHeart className={isLiked ? "fill-pop text-pop" : "text-muted group-hover:text-pop"} size={16} />
            </motion.div>
            <span className={`font-mono select-none ${isLiked ? 'text-pop font-bold' : ''}`}>{likesCount}</span>
          </button>
          
          <button onClick={() => onOpenComments(post)} className="flex items-center gap-1.5 hover:text-accent transition-colors">
            <FiMessageCircle size={16} />
            <span className="font-mono select-none">{post.commentCount || 0}</span>
          </button>
          
          <button className="flex items-center gap-1.5 hover:text-pop2 transition-colors">
            <FiRepeat size={16} />
            <span className="font-mono select-none">{post.repostCount || 0}</span>
          </button>
          
          <button onClick={handleShare} className="flex items-center gap-1.5 hover:text-accent transition-colors ml-auto mr-2">
            <FiShare size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
