import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { animeService } from '../services/animeService';
import { getImageUrl, handleImageError } from '../lib/imageUtils';

const Welcome = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [isLiveLoading, setIsLiveLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  },[]);

  useEffect(() => {
    if (searchQuery.length < 3) { 
      setLiveResults([]); 
      return; 
    }
    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsLiveLoading(true);
      try {
        const res = await animeService.searchAnime(searchQuery, 1);
        if (isMounted) setLiveResults(res || []);
      } catch (e) { 
        if (isMounted) setLiveResults([]); 
      } finally {
        if (isMounted) setIsLiveLoading(false);
      }
    }, 350);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const navLinks = useMemo(() =>[
    { label: 'Home', path: '/', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/> },
    { label: 'Explore', path: '/search', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/> },
    { label: 'Ongoing', path: '/ongoing', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/> },
    { label: 'Schedule', path: '/schedule', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/> }
  ],[]);

  const handleEnterHome = () => {
    sessionStorage.setItem('welcomeShown', 'true');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col text-white">
      <nav className="w-full h-24 px-6 md:px-12 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center cursor-pointer gap-3" onClick={handleEnterHome}>
          <div className="w-12 h-12 md:w-16 md:h-16 overflow-hidden relative z-10 transition-transform hover:scale-105">
            <img src="https://repgyetdcodkynrbxocg.supabase.co/storage/v1/object/public/images/telegram-1778401091005-146ffc5f.jpg" className="w-full h-full object-contain drop-shadow-md" alt="ChisaStream Logo" />
          </div>
          <span className="font-black text-2xl tracking-tight hidden sm:block text-white mt-0.5">ChisaStream</span>
        </div>
        <div className="flex gap-4 md:gap-6 bg-[#16161a]/60 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-full shadow-lg">
          {navLinks.map((link, i) => (
            <button key={i} aria-label={link.label} onClick={() => { sessionStorage.setItem('welcomeShown', 'true'); navigate(link.path); }} className="text-white hover:text-[#F6CF80] transition-colors p-1">
              <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">{link.icon}</svg>
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center px-4 pt-2">
        <div className="relative w-full max-w-5xl rounded-[2.5rem] overflow-hidden border border-[#F6CF80]/20 shadow-[0_0_50px_rgba(246,207,128,0.1)] bg-[#0f0f12]">
          <div className="w-full h-full aspect-square md:aspect-video bg-[#16161a] relative overflow-hidden flex items-center justify-center">
             <div className="absolute inset-0 bg-gradient-to-br from-[#F6CF80]/10 to-transparent"></div>
             <img src="https://repgyetdcodkynrbxocg.supabase.co/storage/v1/object/public/images/telegram-1778401701564-0883fad5.jpg" alt="Hero Banner" className="w-full h-full object-cover opacity-40 mix-blend-screen" />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/50">
            <div className="w-full max-w-lg relative z-20">
              <div className="flex items-center bg-white border border-gray-200 rounded-full px-5 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all focus-within:ring-2 focus-within:ring-[#F6CF80] group">
                <svg className="w-5 h-5 text-gray-400 group-focus-within:text-[#F6CF80] mr-3 shrink-0 transition-colors" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input 
                  type="text" 
                  className="w-full bg-transparent text-black text-sm outline-none font-bold placeholder-gray-400" 
                  placeholder="Ketik anime yang ingin kamu tonton..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        sessionStorage.setItem('welcomeShown', 'true');
                        navigate(searchQuery ? `/search?q=${searchQuery}` : '/search');
                    }
                  }} 
                />
                <button 
                  onClick={() => { sessionStorage.setItem('welcomeShown', 'true'); navigate('/search'); }} 
                  className="text-gray-500 font-black text-[10px] ml-2 border-l border-gray-200 pl-3 hover:text-black uppercase tracking-widest flex items-center gap-1 shrink-0 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                  FILTER
                </button>
              </div>
              
              {/* Dropdown Live Search */}
              {liveResults.length > 0 && searchQuery.length >= 3 && (
                <div className="absolute top-[65px] inset-x-0 bg-[#16161a] border border-white/10 rounded-2xl overflow-hidden z-[100] max-h-64 shadow-2xl overflow-y-auto custom-scrollbar">
                  {liveResults.map(r => (
                    <div 
                        key={r.id || r.slug} 
                        onClick={() => {
                            sessionStorage.setItem('welcomeShown', 'true');
                            navigate(animeService.getAnimePath(r));
                        }} 
                        className="flex items-center gap-4 p-3 hover:bg-white/5 border-b border-white/5 cursor-pointer text-left transition-colors group relative"
                    >
                      {r.isDevEntry && <div className="absolute top-1 left-1 bg-red-600/90 text-white text-[8px] font-black px-1 rounded z-10 border border-white/10">ND</div>}
                      <img src={getImageUrl(r.image_cover || r.image_poster)} onError={(e) => handleImageError(e, r.image_cover || r.image_poster)} alt={r.title} className="w-10 rounded-md shadow-sm aspect-[3/4.5] object-cover bg-black/50" />
                      <div className="flex flex-col flex-1 min-w-0">
                         <span className="text-white font-black text-xs line-clamp-1 group-hover:text-[#F6CF80] transition-colors">{r.title || r.devTitle}</span>
                         <span className="text-white/40 font-bold text-[9px] uppercase mt-1 tracking-wider">{r.type || 'TV'} • {r.status || 'Unknown'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="absolute bottom-10 left-0 right-0 flex justify-center z-10">
             <button onClick={handleEnterHome} className="bg-[#F6CF80] hover:bg-white text-black font-black px-14 py-4 rounded-full active:scale-95 transition-all shadow-[0_10px_30px_rgba(246,207,128,0.3)] tracking-widest text-xs uppercase hover:-translate-y-1">Masuk Beranda</button>
          </div>
        </div>

        <div className="mt-16 mb-24 flex flex-col items-center text-center px-6">
          <div className="w-56 h-56 md:w-72 md:h-72 mb-6 drop-shadow-2xl transform hover:scale-110 transition-transform duration-500">
             <img src="https://files.catbox.moe/clnzrt.png" alt="ChisaStream Mascot" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-5 text-white drop-shadow-lg">Chisa<span className="text-[#F6CF80]">Stream</span></h2>
          <p className="text-white/60 text-sm md:text-base font-medium leading-relaxed max-w-2xl drop-shadow-md">ChisaStream menyediakan akses menonton ribuan judul anime secara gratis tanpa gangguan iklan. Nikmati nonton anime subtitle indonesia dengan kualitas 360p hingga 1080p secara gratis dan nyaman!!</p>
        </div>
      </main>

      <footer className="w-full py-8 px-6 border-t border-white/5 flex flex-col items-center">
        <p className="text-[10px] md:text-[11px] text-white/30 font-bold leading-relaxed max-w-2xl text-center tracking-wide">ChisaStream adalah platform streaming anime pihak ketiga. Kami tidak mengunggah atau menyimpan file video apa pun di server kami. Semua konten disediakan oleh pihak ketiga yang tidak terafiliasi dengan kami.</p>
      </footer>
    </div>
  );
};

export default Welcome;
            
