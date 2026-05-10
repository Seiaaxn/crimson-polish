import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History as HistoryIcon, Trash2, Play, ChevronRight, Clock, Calendar, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { userService, HistoryItem } from '../services/userService';
import { getImageUrl, handleImageError } from '../lib/imageUtils';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const HistoryPage = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(auth.currentUser);
  const [authInitialized, setAuthInitialized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!authInitialized) return;
    
    if (user) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const hist = await userService.getHistory();
          setHistory(hist);
        } catch (err) {
          console.error('Error fetching history:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else {
      setLoading(false);
    }
  }, [authInitialized, user]);

  const formatTime = (time: number) => {
    if (!time) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: any) => {
    if (!date) return '-';
    // Handle Firestore Timestamp or Date
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  if (!authInitialized || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="text-[#F6CF80] animate-spin" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-[#F6CF80] selection:text-black">
        <Navbar />
        <div className="pt-28 pb-32 max-w-6xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-[#F6CF80]/10 rounded-[28px] flex items-center justify-center border border-[#F6CF80]/20 shadow-[0_0_20px_rgba(246,207,128,0.1)]">
                <HistoryIcon className="text-[#F6CF80]" size={32} />
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">Riwayat Tontonan</h1>
                <p className="text-white/30 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] mt-2">Lanjutkan petualangan anime-mu</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-40 text-center bg-[#16161a]/50 rounded-[64px] border border-white/5 mx-auto max-w-4xl px-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#F6CF80]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="w-[280px] h-[280px] md:w-[500px] md:h-[500px] flex items-center justify-center mb-12 transform group-hover:rotate-6 group-hover:scale-110 transition-all duration-700">
               <img src="https://url.dinzid.my.id/aAn6ydj" alt="Login Required" className="w-full h-full object-contain drop-shadow-[0_0_80px_rgba(246,207,128,0.4)] opacity-80 group-hover:opacity-100 transition-all" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-[0.2em] mb-6 text-white/90">Login Diperlukan</h2>
            <p className="text-white/30 text-sm md:text-base max-w-md font-bold leading-relaxed mb-12 uppercase tracking-widest">Kamu harus login dulu untuk mengakses riwayat tontonanmu.</p>
            <button 
              onClick={() => navigate('/login')} 
              className="px-14 py-6 bg-[#F6CF80] text-black rounded-[32px] font-black uppercase text-sm tracking-[0.4em] shadow-[0_20px_60px_rgba(246,207,128,0.3)] active:scale-95 transition-all hover:bg-white hover:text-black z-10"
            >
              Login Sekarang
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-[#F6CF80] selection:text-black">
      <Navbar />
      
      <div className="pt-28 pb-32 max-w-6xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-[#F6CF80]/10 rounded-[28px] flex items-center justify-center border border-[#F6CF80]/20 shadow-[0_0_20px_rgba(246,207,128,0.1)]">
              <HistoryIcon className="text-[#F6CF80]" size={32} />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">Riwayat Tontonan</h1>
              <p className="text-white/30 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] mt-2">Lanjutkan petualangan anime-mu</p>
            </div>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 text-center bg-[#16161a]/50 rounded-[64px] border border-white/5 mx-auto max-w-4xl px-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#F6CF80]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="w-[280px] h-[280px] md:w-[500px] md:h-[500px] flex items-center justify-center mb-12 transform group-hover:rotate-6 group-hover:scale-110 transition-all duration-700">
               <img src="https://url.dinzid.my.id/VkxIztf" alt="Empty History" className="w-full h-full object-contain drop-shadow-[0_0_80px_rgba(246,207,128,0.4)] opacity-80 group-hover:opacity-100 transition-all" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-[0.2em] mb-6 text-white/90">Kosong Melompong</h2>
            <p className="text-white/30 text-sm md:text-base max-w-md font-bold leading-relaxed mb-12 uppercase tracking-widest">Kamu belum menonton anime apapun. Ayo mulai cari anime favoritmu!</p>
            <button 
              onClick={() => navigate('/')} 
              className="px-14 py-6 bg-[#F6CF80] text-black rounded-[32px] font-black uppercase text-sm tracking-[0.4em] shadow-[0_20px_60px_rgba(246,207,128,0.3)] active:scale-95 transition-all hover:bg-white hover:text-black z-10"
            >
              Cari Anime
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {history.map((item, index) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative group bg-[#16161a] border border-white/5 rounded-[32px] md:rounded-[40px] overflow-hidden hover:bg-white/[0.08] transition-all shadow-2xl"
                >
                  {/* Banner Backdrop */}
                  <div className="absolute right-0 top-0 bottom-0 w-2/3 z-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#16161a] via-[#16161a]/60 to-transparent z-10"></div>
                    <img 
                      src={getImageUrl(item.cover || item.image)} 
                      onError={(e) => handleImageError(e, item.cover || item.image)}
                      className="w-full h-full object-cover opacity-[0.08] group-hover:opacity-20 transition-all duration-700 group-hover:scale-110" 
                      alt="" 
                    />
                  </div>

                  <div className="relative z-20 min-h-[140px] md:min-h-[160px] p-4 md:p-6 flex items-center gap-4 md:gap-10">
                    {/* Poster */}
                    <div 
                      className="relative w-20 h-28 md:w-28 md:h-40 shrink-0 rounded-2xl md:rounded-[32px] overflow-hidden shadow-2xl border border-white/10 cursor-pointer"
                      onClick={() => navigate(`/anime/${item.slug}/${item.episode}${item.server === 'sanka' ? '?src=sanka' : ''}`)}
                    >
                        <img 
                          src={getImageUrl(item.image)} 
                          onError={(e) => handleImageError(e, item.image)}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                          alt="" 
                        />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={24} fill="currentColor" className="text-[#F6CF80]" />
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2 md:mb-3">
                         <span className="bg-[#F6CF80] text-black text-[8px] md:text-[10px] font-black px-2.5 py-1 md:py-1.5 rounded-lg uppercase tracking-widest shadow-lg">EP {item.episode}</span>
                         <div className="flex items-center gap-1.5 md:gap-2 text-white/40 text-[8px] md:text-[10px] font-bold uppercase tracking-widest bg-white/5 border border-white/5 px-2 py-1 md:px-3 md:py-1.5 rounded-lg">
                            <Clock size={10} />
                            {formatTime(item.timestamp)} / {formatTime(item.duration)}
                         </div>
                      </div>

                      <h2 
                        className="text-base md:text-2xl font-black text-white uppercase tracking-tight truncate group-hover:text-[#F6CF80] transition-colors cursor-pointer mb-2 md:mb-4"
                        onClick={() => navigate(`/anime/${item.slug}/${item.episode}${item.server === 'sanka' ? '?src=sanka' : ''}`)}
                      >
                        {item.title}
                      </h2>

                      <div className="flex items-center gap-4 text-white/30 text-[8px] md:text-[10px] font-black uppercase tracking-widest">
                         <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-[#F6CF80]/50" />
                            {formatDate(item.watchedAt)}
                         </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4 md:mt-6 relative h-1 md:h-1.5 bg-white/5 rounded-full overflow-hidden w-full max-w-xs">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${item.duration ? (item.timestamp / item.duration) * 100 : 0}%` }}
                           className="absolute inset-y-0 left-0 bg-[#F6CF80] rounded-full shadow-[0_0_10px_rgba(246,207,128,0.3)]"
                         ></motion.div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="hidden md:flex items-center gap-2 md:gap-4 ml-auto">
                       <button 
                         onClick={() => navigate(`/anime/${item.slug}/${item.episode}${item.server ? `?src=${item.server}` : ''}`)}
                         className="h-10 w-10 md:h-14 md:w-14 bg-[#F6CF80] text-black rounded-xl md:rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all shrink-0"
                       >
                          <Play size={20} fill="currentColor" className="ml-1" />
                       </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default HistoryPage;
