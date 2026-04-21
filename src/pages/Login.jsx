import { motion } from 'framer-motion';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../firebase';

export default function Login() {
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      alert("we're tweaking rn, try again 😭");
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 text-center">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="font-display font-bold text-4xl mb-2 text-accent tracking-widest uppercase"
      >
        UNIGRAM
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="font-mono text-muted mb-12"
      >
        say it raw.
      </motion.p>
      
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleGoogleLogin}
        className="w-full max-w-sm bg-accent text-bg font-bold py-4 rounded-full text-lg mb-4 hover:opacity-90 transition-opacity"
      >
        Continue with Google
      </motion.button>
      
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="text-muted text-sm border-b border-muted pb-1 hover:text-accent transition-colors"
      >
        Browse anonymously
      </motion.button>
    </div>
  );
}
