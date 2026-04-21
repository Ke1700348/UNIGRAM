import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiFilm, FiImage } from 'react-icons/fi';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { semanticSearch } from '../gemini';

export default function Search({ user }) {
  const [q, setQ] = useState('');
  const [trending, setTrending] = useState([]);
  const [explore, setExplore] = useState([]);
  const [loadingExplore, setLoadingExplore] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  useEffect(() => {
    const fetchTrending = async () => {
      const qRef = query(collection(db, 'hashtags'), orderBy('count', 'desc'), limit(10));
      const snap = await getDocs(qRef);
      const tags = [];
      snap.forEach(d => tags.push({ id: d.id, ...d.data() }));
      setTrending(tags);
    };
    
    const fetchExplore = async () => {
      // Just fetch recent posts with media for explore grid
      const qRef = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20));
      const snap = await getDocs(qRef);
      const posts = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.imageURL || data.videoURL) {
          posts.push({ id: d.id, ...data });
        }
      });
      setExplore(posts);
      setLoadingExplore(false);
    };

    fetchTrending();
    fetchExplore();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    
    // In a real app we'd query users or posts based on the query.
    // Let's use Gemini to suggest related hashtags instead as requested by the prompt for AI features.
    const suggestions = await semanticSearch(q);
    setAiSuggestions(suggestions);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-20 md:pb-0"
    >
      <div className="sticky top-0 bg-surface/90 backdrop-blur z-20 p-4 border-b border-border">
        <form onSubmit={handleSearch} className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <motion.input
            whileFocus={{ scale: 1.02 }}
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="search people, vibes, hashtags..."
            className="w-full bg-[#1a1a1a] rounded-full pl-10 pr-4 py-3 text-sm outline-none placeholder:text-muted focus:ring-1 ring-border transition-all"
          />
        </form>
      </div>

      {q && aiSuggestions.length > 0 && (
         <div className="p-4 border-b border-border bg-bg">
            <h3 className="text-xs font-mono text-muted uppercase mb-3">AI Suggestions</h3>
            <div className="flex flex-wrap gap-2">
              {aiSuggestions.map(tag => (
                <button 
                  key={tag} 
                  className="px-3 py-1 bg-surface border border-border rounded-full text-xs font-bold uppercase hover:bg-border transition-colors tracking-wide"
                >
                  #{tag}
                </button>
              ))}
            </div>
         </div>
      )}

      {!q && (
        <div className="p-4 border-b border-border no-scrollbar overflow-x-auto whitespace-nowrap">
          <h3 className="text-xs font-mono text-muted uppercase mb-3 px-1">Trending Vibes</h3>
          <div className="flex gap-2">
            {trending.length > 0 ? trending.map((t, idx) => (
              <div key={t.id} className="inline-flex items-center bg-surface border border-border rounded-full px-4 py-1.5 min-w-max cursor-pointer hover:bg-border transition-colors">
                <span className="text-xs text-muted mr-2">{(idx + 1).toString().padStart(2, '0')}</span>
                <span className="text-sm font-bold tracking-tight">#{t.id}</span>
                <span className="text-[10px] text-muted ml-2 font-mono">{t.count}</span>
              </div>
            )) : (
              <span className="text-xs font-mono text-muted py-2">no trends yet</span>
            )}
          </div>
        </div>
      )}

      {/* Explore Grid */}
      <div className="p-1">
        <div className="grid grid-cols-2 gap-1 md:grid-cols-3">
          {loadingExplore ? (
             [1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-border animate-pulse rounded-md" />)
          ) : explore.map(post => (
            <div key={post.id} className="aspect-square bg-surface rounded-md relative group cursor-pointer overflow-hidden border border-border/50">
              {post.imageURL ? (
                <img src={post.imageURL} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : post.videoURL ? (
                <>
                  <video src={post.videoURL} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 right-2 bg-black/50 p-1 rounded backdrop-blur">
                    <FiFilm size={14} className="text-white" />
                  </div>
                </>
              ) : null}
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pointer-events-none">
                 {post.vibeLabel && <span className="text-[10px] bg-pop/80 text-white w-max px-1.5 py-0.5 rounded leading-none uppercase font-bold tracking-wider mb-1">{post.vibeLabel}</span>}
                 <span className="text-xs font-bold text-white truncate">@{post.username}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
