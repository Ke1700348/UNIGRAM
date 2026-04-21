import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSettings, FiArrowLeft } from 'react-icons/fi';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, query, where, orderBy, getDocs, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import PostCard from '../components/PostCard';

export default function Profile({ user: currentUser }) {
  const { username } = useParams(); // wait, we don't naturally route by username unless parameter is username, actually I used /profile/me in BottomNav, let's just use params or assume 'me' means currentUser
  const isMe = username === 'me' || username === currentUser?.username;
  const targetUsername = isMe ? currentUser?.username : username;

  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('threads'); // threads, reels, likes
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    let currentProfile = null;
    const fetchProfile = async () => {
      // Find user by username
      const usersRef = collection(db, 'users');
      const qUser = query(usersRef, where('username', '==', targetUsername));
      const userSnap = await getDocs(qUser);
      
      if (!userSnap.empty) {
        currentProfile = { id: userSnap.docs[0].id, ...userSnap.docs[0].data() };
        setProfileUser(currentProfile);
        setIsFollowing(currentProfile.followers?.includes(currentUser?.uid));
      } else if (isMe) {
        // Fallback for demo
        currentProfile = currentUser;
        setProfileUser(currentProfile);
      }

      if (currentProfile) {
        // Fetch their posts
        const postsQ = query(collection(db, 'posts'), where('userId', '==', currentProfile.uid), orderBy('createdAt', 'desc'));
        const postsSnap = await getDocs(postsQ);
        const pList = [], rList = [];
        postsSnap.forEach(d => {
           const data = { id: d.id, ...d.data() };
           if (data.type === 'thread') pList.push(data);
           else rList.push(data);
        });
        setPosts(pList);
        setReels(rList);

        // Fetch likes
        const likesQ = query(collection(db, 'posts'), where('likes', 'array-contains', currentProfile.uid), orderBy('createdAt', 'desc'));
        const lSnap = await getDocs(likesQ);
        const lList = [];
        lSnap.forEach(d => lList.push({ id: d.id, ...d.data() }));
        setLikedPosts(lList);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [targetUsername, currentUser, isMe]);

  const handleFollow = async () => {
    if (!profileUser || !currentUser) return;
    const currentlyFollowing = isFollowing;
    setIsFollowing(!currentlyFollowing);

    try {
      const myRef = doc(db, 'users', currentUser.uid);
      const theirRef = doc(db, 'users', profileUser.uid);

      if (currentlyFollowing) {
        await updateDoc(myRef, { following: arrayRemove(profileUser.uid) });
        await updateDoc(theirRef, { followers: arrayRemove(currentUser.uid) });
      } else {
        await updateDoc(myRef, { following: arrayUnion(profileUser.uid) });
        await updateDoc(theirRef, { followers: arrayUnion(currentUser.uid) });
        
        await addDoc(collection(db, 'notifications'), {
          toUserId: profileUser.uid,
          fromUserId: currentUser.uid,
          fromUsername: currentUser.username,
          fromAvatarURL: currentUser.avatarURL,
          type: 'follow',
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch(e) {
      setIsFollowing(currentlyFollowing);
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  if (loading) return <div className="h-screen bg-bg flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-t-pop border-border rounded-full"></div></div>;
  if (!profileUser) return <div className="p-8 text-center text-muted">User not found</div>;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-20 md:pb-0 min-h-screen bg-bg"
    >
      {/* Cover / Header */}
      <div className="h-40 bg-gradient-to-b from-[#222] to-bg relative border-b border-border">
        {isMe ? (
          <div className="absolute top-4 right-4 flex gap-4">
             <button onClick={handleLogout} className="p-2 bg-black/40 rounded-full backdrop-blur text-white text-xs uppercase font-bold">Logout</button>
             <button className="p-2 bg-black/40 rounded-full backdrop-blur text-white"><FiSettings size={20}/></button>
          </div>
        ) : (
          <button onClick={() => window.history.back()} className="absolute top-4 left-4 p-2 bg-black/40 rounded-full backdrop-blur text-white">
            <FiArrowLeft size={20} />
          </button>
        )}
      </div>

      <div className="px-4 relative -mt-12 mb-6">
        <div className="flex justify-between items-end mb-4">
          <div className="relative">
             <img src={profileUser.avatarURL || `https://ui-avatars.com/api/?name=${profileUser.username}&background=random`} alt="" className="w-24 h-24 rounded-full border-4 border-bg bg-surface object-cover" />
             {profileUser.verified && <div className="absolute bottom-1 right-1 w-6 h-6 bg-pop2 rounded-full border-2 border-bg flex flex-items justify-center items-center text-black text-xs">✦</div>}
          </div>
          {isMe ? (
            <button className="px-5 py-1.5 border border-border rounded-full font-bold text-sm hover:bg-surface transition-colors">
              Edit Profile
            </button>
          ) : (
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={handleFollow}
              className={`px-6 py-2 rounded-full font-bold text-sm transition-colors ${isFollowing ? 'bg-surface border border-border text-accent' : 'bg-accent text-bg'}`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </motion.button>
          )}
        </div>

        <div>
          <h2 className="font-display font-bold text-2xl tracking-tighter">{profileUser.displayName}</h2>
          <div className="flex items-center gap-2 mb-3">
             <span className="font-mono text-muted text-sm tracking-tight">@{profileUser.username}</span>
             {profileUser.vibeTag && <span className="bg-pop/10 text-pop px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest">{profileUser.vibeTag}</span>}
          </div>
          <p className="text-sm mb-4 leading-relaxed">{profileUser.bio || 'just existing on the internet rn 💀'}</p>
          
          <div className="flex gap-6 font-mono text-sm border-t border-border/50 pt-4">
             <div className="flex flex-col">
                <span className="font-bold text-lg text-accent">{posts.length + reels.length}</span>
                <span className="text-muted text-[10px] uppercase tracking-wider">Posts</span>
             </div>
             <div className="flex flex-col">
                <span className="font-bold text-lg text-accent">{profileUser.followers?.length || 0}</span>
                <span className="text-muted text-[10px] uppercase tracking-wider">Followers</span>
             </div>
             <div className="flex flex-col">
                <span className="font-bold text-lg text-accent">{profileUser.following?.length || 0}</span>
                <span className="text-muted text-[10px] uppercase tracking-wider">Following</span>
             </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-border/50 sticky top-0 bg-bg z-10">
        {['threads', 'reels', 'liked'].map(tab => (
           <button 
             key={tab} 
             onClick={() => setActiveTab(tab)}
             className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors relative ${activeTab === tab ? 'text-accent' : 'text-muted'}`}
           >
             {tab}
             {activeTab === tab && <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
           </button>
        ))}
      </div>

      <div className="min-h-[50vh]">
         {activeTab === 'threads' && (
           <div className="divide-y divide-border">
              {posts.map(post => <PostCard key={post.id} post={post} user={currentUser} onOpenComments={() => {}} />)}
              {posts.length === 0 && <div className="text-center p-8 text-muted font-mono text-xs">no threads yet.</div>}
           </div>
         )}
         {activeTab === 'reels' && (
           <div className="grid grid-cols-3 gap-1">
              {reels.map(reel => (
                <div key={reel.id} className="aspect-[9/16] bg-surface relative cursor-pointer group">
                   {reel.videoURL ? <video src={reel.videoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-border" />}
                   <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-bold font-mono">▶ {reel.likes?.length || 0}</span>
                   </div>
                </div>
              ))}
              {reels.length === 0 && <div className="col-span-3 text-center p-8 text-muted font-mono text-xs">no reels yet.</div>}
           </div>
         )}
         {activeTab === 'liked' && (
           <div className="divide-y divide-border">
              {likedPosts.map(post => <PostCard key={post.id} post={post} user={currentUser} onOpenComments={() => {}} />)}
              {likedPosts.length === 0 && <div className="text-center p-8 text-muted font-mono text-xs">nothing liked yet.</div>}
           </div>
         )}
      </div>

    </motion.div>
  );
}
