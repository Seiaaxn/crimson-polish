import React, { useState, useEffect, useRef } from 'react';
import { Search, User, History, X, Play, Star, Loader2, Home, Users, Calendar, ChevronRight, LayoutGrid, Zap, MessageSquare, Film, CheckCircle2, Shield, BookOpen, Crown } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getImageUrl, handleImageError } from '../lib/imageUtils';
import { auth } from '../lib/firebase';
import { userService, UserProfile, getProgressToNextLevel } from '../services/userService';
import { animeService } from '../services/animeService';
import { comicService } from '../services/comicService';
import GlobalChat from './GlobalChat';
import Swal from 'sweetalert2';
import { chatService } from '../services/chatService';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mentions, setMentions] = useState(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchSource, setSearchSource] = useState<'main' | 'backup' | 'sanka' | 'comic'>('sanka');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (profile?.settings?.apiServer) {
      setSearchSource(profile.settings.apiServer);
    }
    checkAdmin();
  }, [profile]);

  const checkAdmin = async () => {
    const status = await userService.isAdmin();
    setIsAdmin(status);
    const premium = await userService.isPremium();
    setIsPremium(premium);
  };

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('chat-toggle', { detail: { isOpen: chatOpen } }));
    if (chatOpen) setMentions(0); // Clear on open
  }, [chatOpen]);

  useEffect(() => {
    if (profile?.username) {
      const unsubscribe = chatService.checkUnreadMentions(profile.username, profile.lastChatReadAt, (count) => {
        // Only update if chat is not currently open
        if (!chatOpen) setMentions(count);
      });
      return () => unsubscribe();
    }
  }, [profile?.username, profile?.lastChatReadAt, chatOpen]);

  const refreshProfile = async () => {
    if (auth.currentUser) {
      const up = await userService.getProfile();
      setProfile(up);
    }
  };

  useEffect(() => {
    refreshProfile();
    
    window.addEventListener('profile-update', refreshProfile);

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        refreshProfile();
      } else {
        setProfile(null);
      }
    });

    const interval = setInterval(refreshProfile, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener('profile-update', refreshProfile);
    };
  }, [location.pathname]);

  useEffect(() => {
    setSearchOpen(false);
    setQuery('');
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        if (searchSource === 'main') {
          const r = await fetch(`/api/proxy/search?q=${encodeURIComponent(query)}`);
          if (r.ok) {
            const text = await r.text();
            try {
              const res = JSON.parse(text);
              if (res.status) setResults(res.data.slice(0, 6)); // Show top 6 results
            } catch(e) {}
          }
        } else if (searchSource === 'sanka') {
          const res = await animeService.searchAnime(query, 1);
          const data = (res as any).data || [];
          setResults(data.slice(0, 6));
        } else if (searchSource === 'comic') {
          const comicResults = await comicService.search(query);
          setResults(comicResults.slice(0, 6));
        } else {
          const devResults = await animeService.searchDev(query);
          setResults(devResults.slice(0, 6));
        }
      } catch (err) {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <nav className="fixed top-0 left-0 w-full h-16 md:h-20 flex items-center justify-between px-4 md:px-12 bg-transparent z-[100]">
      <div className={`flex items-center gap-4 transition-all duration-300 ${chatOpen ? 'opacity-0 pointer-events-none -translate-x-4' : 'opacity-100 translate-x-0'}`}>
        {/* Logo as Hamburger Button */}
        <button 
          onClick={() => setMenuOpen(true)}
          className="flex items-center gap-3 group relative z-10 cursor-pointer outline-none"
        >
          <div className="w-8 h-8 md:w-10 md:h-10 overflow-hidden group-hover:scale-110 transition-transform relative">
            <div className="absolute inset-0 bg-[#EF4444]/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <img src={getImageUrl("https://repgyetdcodkynrbxocg.supabase.co/storage/v1/object/public/images/telegram-1778401091005-146ffc5f.jpg")} className="w-full h-full object-contain relative z-10" alt="Logo" />
          </div>
          <span className="text-lg md:text-2xl font-black tracking-tighter text-white group-hover:text-[#EF4444] transition-colors">ChisaStream</span>
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120]"
            />
            {/* Side Menu Drawer */}
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -400 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[260px] md:w-[320px] bg-[#16161a] border-r border-white/5 z-[130] p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg overflow-hidden bg-[#EF4444]/10 p-1">
                    <img src={getImageUrl("https://repgyetdcodkynrbxocg.supabase.co/storage/v1/object/public/images/telegram-1778401091005-146ffc5f.jpg")} className="w-full h-full object-contain" alt="" />
                  </div>
                  <span className="text-xs font-black tracking-[0.2em] text-white/40 uppercase">Navigasi</span>
                </div>
                <button 
                  onClick={() => setMenuOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 text-white/40 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 flex-1">
                {[
                  { name: 'Dashboard', icon: Home, path: '/' },
                  { name: 'Welcome Banner', icon: Zap, path: '/welcome' },
                  ...(isAdmin ? [{ name: 'Admin Panel', icon: Shield, path: '/admin', badge: 'System' }] : []),
                  { name: isPremium ? 'Premium Aktif' : 'Upgrade Premium', icon: Crown, path: '/premium', badge: isPremium ? 'Active' : 'Pro' },
                  { name: 'Baca Manga', icon: BookOpen, path: '/comic', badge: 'New' },
                  { name: 'Terbaru', icon: Zap, path: '/latest?src=sanka', badge: 'Hot' },
                  { name: 'Sedang Berjalan', icon: Calendar, path: '/ongoing' },
                  { name: 'Nonton Bareng', icon: Users, path: '/nobar' },
                  { name: 'Movie', icon: Film, path: '/movies?src=sanka' },
                  { name: 'Anime Tamat', icon: CheckCircle2, path: '/completed?src=sanka' },
                  { name: 'Global Chat', icon: MessageSquare, onClick: () => {
                    if (auth.currentUser) setChatOpen(true);
                    else Swal.fire({ 
                      title: 'Wajib Login', 
                      text: 'Silahkan login terlebih dahulu untuk mengakses Chat Global!', 
                      icon: 'warning',
                      confirmButtonColor: '#EF4444'
                    });
                  }},
                  { name: 'Timeline Rilis', icon: LayoutGrid, path: '/schedule' },
                  { name: 'Profil Saya', icon: User, path: '/profile' },
                ].map((item: any, idx) => {
                  const content = (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/5 hover:bg-[#EF4444]/5 hover:border-[#EF4444]/20 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[#EF4444] group-hover:text-black transition-all relative">
                          <item.icon size={14} />
                          {item.name === 'Global Chat' && mentions > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-black text-white border-2 border-[#16161a]">
                              {mentions > 9 ? '9+' : mentions}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-white/60 group-hover:text-white uppercase tracking-wider transition-colors">{item.name}</span>
                          {item.badge && <span className="text-[7px] font-black uppercase tracking-widest text-[#EF4444]">{item.badge}</span>}
                        </div>
                      </div>
                      <ChevronRight size={12} className="text-white/10 group-hover:text-[#EF4444] transition-all transform translate-x-0 group-hover:translate-x-1" />
                    </div>
                  );

                  return item.path ? (
                    <Link 
                      key={item.path}
                      to={item.path}
                      onClick={() => setMenuOpen(false)}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      key={item.name}
                      onClick={() => {
                        setMenuOpen(false);
                        item.onClick();
                      }}
                      className="w-full"
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className={`flex items-center gap-2 md:gap-6 relative transition-all duration-300 ${chatOpen ? 'opacity-0 pointer-events-none translate-x-4' : 'opacity-100 translate-x-0'}`}>
        {/* Search Container */}
        <div ref={searchRef} className="relative">
          <button 
            onClick={() => setSearchOpen(!searchOpen)}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${searchOpen ? 'bg-[#EF4444] text-black shadow-lg shadow-[#EF4444]/20' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
          >
            {searchOpen ? <X size={20} /> : <Search size={20} />}
          </button>

          <AnimatePresence>
            {searchOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="fixed md:absolute top-16 md:top-14 left-4 right-4 md:left-auto md:right-0 md:w-[450px] bg-[#16161a] border border-white/5 rounded-[32px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden z-[110]"
              >
                  <div className="p-4 md:p-6 pb-2">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      <input 
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search Anime Title..."
                        className="w-full bg-white/5 border border-white/5 rounded-[20px] py-4 pl-12 pr-6 text-sm font-black text-white focus:outline-none focus:border-[#EF4444]/40 transition-all placeholder:text-white/10 uppercase tracking-widest"
                      />
                    </div>
                    {/* Search Mode Toggle */}
                    <div className="flex items-center gap-2 mt-4 px-1">
                      <button 
                        onClick={() => setSearchSource('main')}
                        className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border ${searchSource === 'main' ? 'bg-[#EF4444] text-black border-[#EF4444]' : 'bg-white/5 text-white/30 border-white/5 hover:border-white/10'}`}
                      >
                         Server 1
                      </button>
                      <button 
                        onClick={() => setSearchSource('backup')}
                        className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border ${searchSource === 'backup' ? 'bg-[#EF4444] text-black border-[#EF4444]' : 'bg-white/5 text-white/30 border-white/5 hover:border-white/10'}`}
                      >
                         Server Alternatif
                      </button>
                      <button 
                        onClick={() => setSearchSource('sanka')}
                        className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border ${searchSource === 'sanka' ? 'bg-[#EF4444] text-black border-[#EF4444]' : 'bg-white/5 text-white/30 border-white/5 hover:border-white/10'}`}
                      >
                         Server 2
                      </button>
                      <button 
                        onClick={() => { setSearchSource('comic'); setResults([]); setQuery(''); }}
                        className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border ${searchSource === 'comic' ? 'bg-[#EF4444] text-black border-[#EF4444]' : 'bg-white/5 text-white/30 border-white/5 hover:border-white/10'}`}
                      >
                         Manga
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                    {isLoading ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-4">
                         <Loader2 className="text-[#EF4444] animate-spin" size={32} />
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#EF4444] animate-pulse">Searching Database...</span>
                      </div>
                    ) : results.length > 0 ? (
                      <div className="space-y-1">
                        {results.map((anime, idx) => (
                          <button 
                            key={`${anime.id || anime.slug || idx}-${searchSource}`}
                            onClick={() => {
                              if (searchSource === 'comic') {
                                navigate(`/comic/${anime.slug}`);
                                setSearchOpen(false);
                                return;
                              }
                              const isSanka = searchSource === 'sanka';
                              const idParam = isSanka ? anime.slug : (anime.isDevEntry ? 'dev' : anime.id);
                              const sankaParam = isSanka ? '?src=sanka' : (anime.isDevEntry ? `?src=dev&img=${encodeURIComponent(anime.image_poster || anime.image)}&title=${encodeURIComponent(anime.title)}` : '');
                              
                              navigate(`/anime/${idParam}-${(anime.title||'').toLowerCase().replace(/[^a-z0-9]+/g, '-')}${sankaParam}`);
                              setSearchOpen(false);
                            }}
                            className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all group text-left"
                          >
                             <div className="w-14 aspect-[3/4.2] rounded-lg overflow-hidden shrink-0 border border-white/5 shadow-lg group-hover:scale-105 transition-transform">
                                {anime?.isDevEntry && <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
                <img 
                                  src={getImageUrl(anime.image_poster || anime.image)} 
                                  onError={(e) => handleImageError(e, anime.image_poster || anime.image)}
                                  className="w-full h-full object-cover" 
                                  alt="" 
                                />
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                   <Star size={10} className="text-[#EF4444] fill-[#EF4444]" />
                                   <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{anime.isDevEntry ? 'DEV API' : (anime.type || 'Series')} • {anime.favorites || 'N/A'}</span>
                                </div>
                                <h4 className="text-sm font-black text-white/80 line-clamp-1 group-hover:text-[#EF4444] transition-colors uppercase tracking-tight">{anime.title}</h4>
                                <p className="text-[10px] font-black text-white/20 truncate uppercase tracking-widest mt-1">{anime.genre || '-'}</p>
                             </div>
                             <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all group-hover:bg-[#EF4444] group-hover:text-black">
                                <Play size={16} fill="currentColor" className="ml-0.5" />
                             </div>
                          </button>
                        ))}
                        <Link 
                          to={`/search?q=${encodeURIComponent(query)}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-center py-4 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-[#EF4444] transition-colors mt-2"
                        >
                           View Full Results
                        </Link>
                      </div>
                    ) : query.trim() ? (
                      <div className="py-12 flex flex-col items-center text-center px-8">
                         <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-4">
                            <Search className="text-white/10" size={32} />
                         </div>
                         <p className="text-xs font-black text-white/40 uppercase tracking-widest">No anime found for "{query}"</p>
                      </div>
                    ) : (
                      <div className="py-12 flex flex-col items-center text-center px-8">
                         <Play className="text-[#EF4444] mb-4 opacity-20" size={48} />
                         <p className="text-xs font-black text-white/40 uppercase tracking-widest">Type to search thousands of anime</p>
                      </div>
                    )}
                  </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={() => {
            if (auth.currentUser) {
              setChatOpen(true);
              setMentions(0);
            } else {
              Swal.fire({
                title: 'Wajib Login',
                text: 'Silahkan login terlebih dahulu untuk mengakses Chat Global!',
                icon: 'warning',
                confirmButtonColor: '#EF4444'
              });
            }
          }}
          className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-[#EF4444] hover:text-black transition-all group relative"
        >
          <MessageSquare size={18} className="group-hover:scale-110 transition-transform" />
          {mentions > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-black text-white border-2 border-[#16161a] animate-bounce">
              {mentions > 9 ? '9+' : mentions}
            </span>
          )}
        </button>
        
        {profile ? (
          <Link to="/profile" className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl pl-1 pr-3 py-1 hover:bg-white/10 transition-all group">
             <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#EF4444]">
                {profile?.isDevEntry && <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
                <img 
                  src={getImageUrl(profile.avatar)} 
                  onError={(e) => handleImageError(e, profile.avatar)}
                  className="w-full h-full object-cover" 
                  alt="" 
                />
             </div>
             <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                   <span className="text-[10px] font-black text-white group-hover:text-[#EF4444] transition-colors">LVL {profile.levelInfo?.level || 1}</span>
                   <Zap size={8} fill="currentColor" className="text-[#EF4444]" />
                   {isAdmin && <span title="Admin" className="px-1 py-0.5 rounded bg-[#EF4444] text-black text-[7px] font-black uppercase tracking-widest">Admin</span>}
                   {isPremium && !isAdmin && <Crown size={8} className="text-yellow-400 fill-yellow-400" />}
                </div>
                <div className="w-10 h-1 bg-white/10 rounded-full mt-0.5 overflow-hidden">
                   <div 
                      className="h-full bg-[#EF4444]" 
                      style={{ width: `${getProgressToNextLevel(profile.levelInfo?.exp || 0)}%` }} 
                   />
                </div>
             </div>
          </Link>
        ) : (
          <Link to="/profile" className="w-10 h-10 rounded-full border-2 border-white/10 p-0.5 hover:border-[#EF4444] transition-all overflow-hidden group">
            <div className="w-full h-full rounded-full overflow-hidden bg-white/5 flex items-center justify-center relative">
                <User size={16} className="text-white/40 group-hover:text-[#EF4444] transition-colors" />
            </div>
          </Link>
        )}
      </div>

      <AnimatePresence>
        {chatOpen && (
          <GlobalChat onClose={() => setChatOpen(false)} />
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(246, 207, 128, 0.2); }
      `}</style>
    </nav>
  );
};

export default Navbar;
