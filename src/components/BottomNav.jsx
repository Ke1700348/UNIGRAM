import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome, FiVideo, FiSearch, FiBell, FiUser, FiPlus } from 'react-icons/fi';

export default function BottomNav({ onOpenUpload, user }) {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: FiHome, label: 'Home' },
    { path: '/reels', icon: FiVideo, label: 'Reels' },
    { path: '/search', icon: FiSearch, label: 'Search' },
    { path: '/notifications', icon: FiBell, label: 'Notifications' },
    { path: '/profile/me', icon: FiUser, label: 'Profile' },
  ];

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full border-t border-border bg-surface/90 backdrop-blur pb-safe z-40">
        <ul className="flex items-center justify-around h-16 px-2 relative">
          {navItems.map((item, index) => {
            const isActive = item.path === location.pathname;
            
            // Re-map upload action for mobile specifically where reels was 3rd previously, we just show upload in center, but let's insert it 
            if (index === 2) {
              return (
                <li key="upload" className="flex-1 flex justify-center">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onOpenUpload}
                    className="bg-accent text-bg w-10 h-10 rounded-full flex items-center justify-center shadow-lg -mt-2"
                  >
                    <FiPlus size={24} />
                  </motion.button>
                </li>
              );
            }

            return (
              <li key={item.path} className="flex-1 flex justify-center relative">
                <NavLink
                  to={item.path}
                  className={({ isActive }) => 
                    `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                      isActive ? 'text-accent' : 'text-muted hover:text-accent/70'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <motion.div
                        animate={isActive ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                        transition={isActive ? { duration: 0.3 } : {}}
                      >
                        <item.icon size={22} className={isActive ? "stroke-[2.5px]" : ""} />
                      </motion.div>
                      <span className="text-[10px] font-mono tracking-tighter hidden">
                        {item.label}
                      </span>
                      {isActive && (
                        <motion.div 
                          layoutId="nav-indicator"
                          className="absolute bottom-1 w-1 h-1 bg-accent rounded-full"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col w-[240px] h-screen border-r border-border p-6 shrink-0 bg-bg sticky top-0">
        <div className="font-display text-[26px] tracking-tight mb-10 text-accent uppercase">Unigram</div>
        <div className="flex flex-col gap-2">
          {navItems.map(item => {
             const isActive = item.path === location.pathname;
             return (
               <NavLink key={item.path} to={item.path} className={`flex items-center gap-4 py-3 text-[18px] transition-colors ${isActive ? 'font-bold text-accent' : 'font-medium text-muted hover:text-pop'}`}>
                  <item.icon size={22} className={isActive ? "stroke-[2.5px]" : ""} />
                  {item.label}
               </NavLink>
             );
          })}
        </div>
        
        <button 
          onClick={onOpenUpload}
          className="bg-accent text-bg py-3.5 rounded-full text-center font-extrabold mt-8 hover:bg-pop hover:text-accent transition-colors"
        >
          POST IT
        </button>

        {user && (
          <div className="mt-auto flex gap-3 pt-6 items-center">
            <img src={user.avatarURL || `https://ui-avatars.com/api/?name=${user.username}&background=random`} className="w-10 h-10 rounded-full bg-muted object-cover" alt="user" />
            <div className="overflow-hidden leading-tight">
              <div className="font-bold text-sm text-accent truncate">{user.displayName || user.username}</div>
              <div className="font-mono text-[13px] text-muted truncate">@{user.username}</div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
