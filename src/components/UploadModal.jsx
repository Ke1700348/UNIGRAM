import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';
import { FiX, FiImage, FiVideo, FiZap, FiCheck } from 'react-icons/fi';
import { generateCaption, suggestHashtags, classifyVibe } from '../gemini';
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export default function UploadModal({ user, onClose, initialType = 'thread' }) {
  const [type, setType] = useState(initialType); // 'thread' | 'reel' | 'story'
  const [text, setText] = useState('');
  const [media, setMedia] = useState(null); // base64 string
  const [mediaType, setMediaType] = useState(''); // mime type
  const [hashtags, setHashtags] = useState([]);
  const [vibe, setVibe] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const fileInputRef = useRef(null);
  const maxChars = 500;

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'thread' && !file.type.startsWith('image/')) {
      alert("Please select an image for a thread.");
      return;
    }
    if (type === 'reel' && !file.type.startsWith('video/')) {
      alert("Please select a video for a reel.");
      return;
    }

    setMediaType(file.type);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMedia(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateCaption = async () => {
    if (!media || !mediaType.startsWith('image/')) return;
    setAiLoading(true);
    // Remove data:image/*;base64, prefix
    const base64Data = media.split(',')[1];
    const caption = await generateCaption(base64Data, mediaType);
    if (caption) setText(caption);
    setAiLoading(false);
  };

  const handleSuggestHashtags = async () => {
    if (!text.trim()) return;
    setAiLoading(true);
    const tags = await suggestHashtags(text);
    if (tags && tags.length > 0) {
      setHashtags(prev => [...new Set([...prev, ...tags])]);
    }
    setAiLoading(false);
  };

  const handlePickVibe = async () => {
    if (!text.trim()) return;
    setAiLoading(true);
    const tag = await classifyVibe(text);
    if (tag) setVibe(tag);
    setAiLoading(false);
  };

  const handleHashtagInput = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const val = e.target.value.trim();
      if (val.startsWith('#') && val.length > 1) {
        const tag = val.substring(1).toLowerCase();
        if (!hashtags.includes(tag)) {
          setHashtags([...hashtags, tag]);
        }
        e.target.value = '';
      }
    }
  };

  const removeHashtag = (tagToRemove) => {
    setHashtags(hashtags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (type === 'thread' && !text.trim() && !media) return;
    if ((type === 'reel' || type === 'story') && !media && !text.trim()) return;
    if (type === 'reel' && !media) {
      alert("Please select a video for your reel.");
      return;
    }
    if (type === 'story' && !media) {
        alert("Please select an image or video for your story.");
        return;
    }
    
    setIsLoading(true);

    try {
      let mediaURL = null;
      let mediaPathStr = null;

      // Ensure vibe is set
      let finalVibe = vibe;
      if (!finalVibe && text.trim()) {
        finalVibe = await classifyVibe(text);
      }

      if (media) {
        mediaPathStr = `posts/${user.uid}/${Date.now()}_${fileInputRef.current?.files?.[0]?.name || type}`;
        const fileRef = ref(storage, mediaPathStr);
        await uploadString(fileRef, media, 'data_url');
        mediaURL = await getDownloadURL(fileRef);
      }

      // Calculate Expiry Data (48 hours for standard, 24 for story)
      const expiryHours = type === 'story' ? 24 : 48;
      const expiresAtDate = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

      const postData = {
        userId: user.uid,
        username: user.username,
        displayName: user.displayName,
        avatarURL: user.avatarURL,
        text: text.trim(),
        imageURL: (type === 'thread' || type === 'story') && mediaURL && mediaType.startsWith('image/') ? mediaURL : null,
        videoURL: (type === 'reel' || type === 'story') && mediaURL && mediaType.startsWith('video/') ? mediaURL : null,
        mediaPath: mediaPathStr,
        type: type,
        hashtags: hashtags,
        likes: [],
        commentCount: 0,
        repostCount: 0,
        vibeLabel: finalVibe || '',
        createdAt: serverTimestamp(),
        expiresAt: expiresAtDate
      };

      await addDoc(collection(db, 'posts'), postData);

      // Update hashtag counts
      hashtags.forEach(async (tag) => {
        const tagRef = doc(db, 'hashtags', tag);
        await setDoc(tagRef, { count: increment(1), lastUsed: serverTimestamp() }, { merge: true });
      });

      onClose();
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to post. " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    if (type === 'thread') return text.trim() || media;
    if (type === 'reel') return media;
    if (type === 'story') return media;
    return false;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm flex justify-center items-end sm:items-center"
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className="bg-surface w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-border h-[85vh] sm:h-auto overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display font-bold text-xl uppercase tracking-wider">Create</h2>
            <button onClick={onClose} className="p-2 bg-border rounded-full hover:bg-muted text-accent">
              <FiX size={20} />
            </button>
          </div>

          {/* Type Selector */}
          <div className="flex bg-bg p-1 rounded-full mb-6 relative">
            <button
              onClick={() => {setType('thread'); setMedia(null); setMediaType('');}}
              className={`flex-1 py-3 rounded-full font-bold uppercase tracking-wide text-xs transition-colors z-10 ${type === 'thread' ? 'text-bg' : 'text-muted'}`}
            >
              📝 Thread
            </button>
            <button
              onClick={() => {setType('reel'); setMedia(null); setMediaType('');}}
              className={`flex-1 py-3 rounded-full font-bold uppercase tracking-wide text-xs transition-colors z-10 ${type === 'reel' ? 'text-bg' : 'text-muted'}`}
            >
              🎬 Reel
            </button>
            <button
              onClick={() => {setType('story'); setMedia(null); setMediaType('');}}
              className={`flex-1 py-3 rounded-full font-bold uppercase tracking-wide text-xs transition-colors z-10 ${type === 'story' ? 'text-bg' : 'text-muted'}`}
            >
               🕰️ Story
            </button>
            
            <div className={`absolute top-1 bottom-1 w-[calc(33.33%-4px)] bg-accent rounded-full transition-transform duration-300 ease-in-out`}
                 style={{ 
                   transform: `translateX(${type === 'thread' ? '2px' : type === 'reel' ? 'calc(100% + 4px)' : 'calc(200% + 6px)'})` 
                 }} 
            />
          </div>

          {/* Composer */}
          <div className="flex gap-3 mb-4">
            <img src={user.avatarURL || `https://ui-avatars.com/api/?name=${user.username}&background=random`} alt="" className="w-10 h-10 rounded-full shrink-0" />
            <div className="w-full">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.substring(0, maxChars))}
                placeholder={type === 'story' ? "Add a caption to your story..." : "what's raw rn?"}
                className="w-full bg-transparent resize-none outline-none text-lg min-h-[100px] placeholder:text-muted"
                autoFocus
              />
              <div className="flex justify-between items-center mt-2">
                <span className={`text-xs font-mono ${text.length > maxChars - 20 ? 'text-red-500' : 'text-muted'}`}>
                  {text.length}/{maxChars}
                </span>
                <input
                  type="file"
                  accept={type === 'thread' ? "image/*" : type === 'reel' ? "video/*" : "image/*,video/*"}
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleMediaUpload}
                />
                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="p-2 rounded-full hover:bg-bg text-pop"
                >
                  {(type === 'thread' || (type === 'story' && (!mediaType || mediaType.startsWith('image/')))) ? <FiImage size={24} /> : <FiVideo size={24} />}
                </button>
              </div>
            </div>
          </div>

          {/* Tags Input area - hidden for stories */}
          {type !== 'story' && (
            <div className="mb-4 bg-bg border border-border p-3 rounded-xl flex flex-wrap gap-2 items-center">
              {hashtags.map(tag => (
                <span key={tag} className="text-xs bg-surface border border-border px-2 py-1 rounded-md flex items-center gap-1 font-mono">
                  #{tag}
                  <button onClick={() => removeHashtag(tag)}><FiX size={12}/></button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Add #tags (space to apply)"
                className="bg-transparent text-sm outline-none flex-1 min-w-[150px] font-mono placeholder:text-muted"
                onKeyDown={handleHashtagInput}
              />
            </div>
          )}

          {/* Media Preview */}
          {media && (
            <div className="relative mb-6 rounded-2xl overflow-hidden bg-bg border border-border aspect-video flex items-center justify-center">
              <button onClick={() => setMedia(null)} className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur rounded-full z-10 text-white">
                <FiX size={18} />
              </button>
              {mediaType.startsWith('image/') ? (
                <img src={media} alt="preview" className="max-h-[300px] object-contain" />
              ) : (
                <video src={media} className="max-h-[300px] object-contain" autoPlay loop muted />
              )}
            </div>
          )}

          {/* Vibe Label Display */}
          {vibe && type !== 'story' && (
            <div className="mb-4 inline-block">
              <span className="px-3 py-1 bg-pop/20 text-pop border border-pop/30 rounded-full text-xs font-bold uppercase tracking-wider">
                Vibe: {vibe}
              </span>
            </div>
          )}

          {/* AI Features */}
          <div className="space-y-2 mb-8 border-t border-border pt-4">
            {(type === 'thread' || type === 'story') && media && mediaType.startsWith('image/') && (
              <button 
                onClick={handleGenerateCaption}
                disabled={aiLoading}
                className="w-full flex items-center gap-3 p-3 bg-bg rounded-xl text-left hover:bg-border transition-colors disabled:opacity-50"
              >
              <FiZap className="text-pop2" size={18} />
                <span className="text-sm font-semibold flex-1 tracking-wide">Generate Caption</span>
              </button>
            )}
            {type !== 'story' && (
              <>
                <button 
                  onClick={handleSuggestHashtags}
                  disabled={aiLoading || !text.trim()}
                  className="w-full flex items-center gap-3 p-3 bg-bg rounded-xl text-left hover:bg-border transition-colors disabled:opacity-50"
                >
                  <FiZap className="text-pop2" size={18} />
                  <span className="text-sm font-semibold flex-1 tracking-wide">Suggest Hashtags</span>
                </button>
                 <button 
                  onClick={handlePickVibe}
                  disabled={aiLoading || !text.trim()}
                  className="w-full flex items-center gap-3 p-3 bg-bg rounded-xl text-left hover:bg-border transition-colors disabled:opacity-50"
                >
                  <FiZap className="text-pop2" size={18} />
                  <span className="text-sm font-semibold flex-1 tracking-wide">Determine Vibe</span>
                </button>
              </>
            )}
          </div>

          {/* Submit */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={isLoading || !isFormValid()}
            className="w-full py-4 bg-accent text-bg font-bold uppercase tracking-widest rounded-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
           {isLoading ? 'Posting...' : (
             <>
               <span className="mt-px">POST IT</span>
               <FiCheck size={20} />
             </>
           )}
          </motion.button>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
