import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { FiHeart, FiMessageCircle, FiRepeat, FiShare, FiSpeaker, FiVolumeX, FiMoreHorizontal } from 'react-icons/fi';
import { db } from '../firebase';
import { doc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { useSharedTimer } from '../contexts/TimerContext';

export default function ReelCard({ reel, user, isActive, onOpenComments }) {
  const [isLiked, setIsLiked] = useState(reel.likes?.includes(user?.uid));
  const [likesCount, setLikesCount] = useState(reel.likes?.length || 0);
  const [isMuted, setIsMuted] = useState(true);
  const [showHeart, setShowHeart] = useState(false);
  const videoRef = useRef(null);

  const now = useSharedTimer();
  
  // Calculate Time logic
  const expiryTime = reel.expiresAt?.toMillis() || (reel.createdAt?.toMillis() ? reel.createdAt.toMillis() + 48 * 60 * 60 * 1000 : Date.now() + 10000);
  const timeLeftMs = expiryTime - now;

  // Render nothing if expired (enforces front-end safety even if Cloud Function hasn't cleaned up yet)
  if (timeLeftMs <= 0) return null;

  const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));
  const minsLeft = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));

  let timeColor = "text-white bg-black/40 border border-white/20"; // default normal
  if (hoursLeft < 12 && hoursLeft >= 3) timeColor = "text-yellow-400 bg-black/40 border border-yellow-400/30"; // warning
  if (hoursLeft < 3) timeColor = "text-red-400 border-red-400/30 bg-black/40 animate-pulse"; // urgent

  const timeDisplay = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m left` : `${minsLeft}m left`;

  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.play().catch(e => console.warn("Autoplay blocked:", e));
    } else if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isActive]);

  const handleLike = async () => {
    if (!user) return;
    const currentlyLiked = isLiked;
    setIsLiked(!currentlyLiked);
    setLikesCount(prev => currentlyLiked ? prev - 1 : prev + 1);

    const postRef = doc(db, 'posts', reel.id);
    try {
      await updateDoc(postRef, {
        likes: currentlyLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch(e) {
      setIsLiked(currentlyLiked);
      setLikesCount(prev => currentlyLiked ? prev + 1 : prev - 1);
    }
  };

  const handleDoubleTap = () => {
    if (!isLiked) handleLike();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
  };

  return (
    <div className="relative w-full h-[100dvh] bg-reel-bg snap-center overflow-hidden flex justify-center bg-black">
      {/* Video Content */}
      <video
        ref={videoRef}
        src={reel.videoURL}
        className="w-full h-full object-cover max-w-[600px]"
        loop
        muted={isMuted}
        playsInline
        onClick={() => setIsMuted(m => !m)}
        onDoubleClick={handleDoubleTap}
      />

      <AnimatePresence>
        {showHeart && (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0, y: 0 }}
            animate={{ scale: 1.5, opacity: 1, y: -50 }}
            exit={{ scale: 2, opacity: 0, y: -100 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <FiHeart size={100} className="text-pop fill-pop drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Overlay */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 text-white">
        <button onClick={() => setIsMuted(m => !m)} className="p-2 bg-black/30 rounded-full backdrop-blur">
          {isMuted ? <FiVolumeX size={20} /> : <FiSpeaker size={20} />}
        </button>
      </div>
      
      {/* Expiration Timer badge */}
      <div className="absolute top-4 left-4 z-20">
         <div className={`text-[10px] font-mono px-2 py-1 rounded backdrop-blur tracking-tight ${timeColor}`}>
            ⏳ {timeDisplay}
          </div>
      </div>

      {/* Bottom Overlay Info */}
      <div className="absolute bottom-16 lg:bottom-4 left-0 w-full pl-4 pr-16 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20 pb-4 z-10 pointer-events-none">
        <div className="flex items-center gap-2 mb-2 pointer-events-auto">
          <img src={reel.avatarURL || `https://ui-avatars.com/api/?name=${reel.username}&background=random`} alt="" className="w-10 h-10 rounded-full border border-white/20" />
          <span className="font-bold text-white drop-shadow-md">@{reel.username}</span>
          <button className="text-xs font-bold px-3 py-1 bg-transparent border border-white rounded-full text-white hover:bg-white hover:text-black transition-colors ml-2">
            Follow
          </button>
        </div>
        <div className="pointer-events-auto pr-4">
          <p className="text-sm text-white line-clamp-2 drop-shadow-md">{reel.text}</p>
          <div className="flex gap-2 mt-1">
            {reel.hashtags?.map(tag => (
              <span key={tag} className="text-xs font-bold text-white drop-shadow-md">#{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column Actions */}
      <div className="absolute bottom-20 lg:bottom-8 right-4 z-20 flex flex-col items-center gap-6">
        <button onClick={handleLike} className="flex flex-col items-center group">
          <motion.div whileTap={{ scale: 1.5 }} className="bg-black/20 p-3 rounded-full backdrop-blur text-white">
            <FiHeart size={26} className={isLiked ? "fill-pop text-pop" : ""} />
          </motion.div>
          <span className="text-white text-xs font-bold mt-1 drop-shadow-md">{likesCount}</span>
        </button>
        
        <button onClick={() => onOpenComments(reel)} className="flex flex-col items-center">
          <div className="bg-black/20 p-3 rounded-full backdrop-blur text-white active:scale-95 transition-transform">
            <FiMessageCircle size={26} />
          </div>
          <span className="text-white text-xs font-bold mt-1 drop-shadow-md">{reel.commentCount || 0}</span>
        </button>

        <button className="flex flex-col items-center">
          <div className="bg-black/20 p-3 rounded-full backdrop-blur text-white active:scale-95 transition-transform">
            <FiRepeat size={26} />
          </div>
          <span className="text-white text-xs font-bold mt-1 drop-shadow-md">{reel.repostCount || 0}</span>
        </button>

        <button onClick={() => alert('Link copied')} className="flex flex-col items-center">
          <div className="bg-black/20 p-3 rounded-full backdrop-blur text-white active:scale-95 transition-transform">
            <FiShare size={26} />
          </div>
        </button>
        
        <button className="bg-black/20 p-3 rounded-full backdrop-blur text-white active:scale-95 transition-transform">
            <FiMoreHorizontal size={24} />
        </button>
      </div>
    </div>
  );
}
