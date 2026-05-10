import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Loading from '../components/Loading';
import { getImageUrl, handleImageError } from '../lib/imageUtils';
import { userService, HistoryItem } from '../services/userService';
import { Play, ChevronRight, Clock, Smartphone, Download } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

// Use the explicit API base URL
const API_BASE = '/api/proxy';

const Shimmer = () => (
  <div className="absolute top-0 bottom-0 left-0 w-[150%] animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent z-10" style={{ transform: 'translate3d(-100%, 0, 0) skewX(-20deg)' }} />
);

const HeroSkeleton = () => (
  <div className="w-full h-full bg-[#16161a] relative overflow-hidden flex items-end p-6 md:p-12 gap-4 md:gap-6">
    <div className="w-24 md:w-40 aspect-[3/4.2] bg-white/5 relative overflow-hidden rounded-md shrink-0"><Shimmer /></div>
    <div className="flex flex-col gap-1 md:gap-1.5 flex-1 pb-1 md:pb-2 min-w-0">
      <div className="w-24 h-2 md:h-3 bg-white/5 relative overflow-hidden rounded-sm"><Shimmer /></div>
      <div className="w-1/2 h-6 md:h-8 bg-white/5 relative overflow-hidden rounded-sm"><Shimmer /></div>
      <div className="w-1/3 h-3 md:h-4 bg-white/5 relative overflow-hidden rounded-sm"><Shimmer /></div>
    </div>
  </div>
);

const CardSkeleton = () => (
  <div className="min-w-[105px] flex flex-col gap-2 relative">
    <div className="aspect-[3/4.5] bg-[#16161a] rounded-sm relative overflow-hidden shadow-xl"><Shimmer /></div>
    <div className="w-3/4 h-2.5 bg-[#16161a] rounded-sm relative overflow-hidden"><Shimmer /></div>
  </div>
);

// Add typings to window variable to prevent ts errors
declare global {
  interface Window {
    __NEFUSOFT_CACHE__?: any;
  }
}

import { animeService } from '../services/animeService';

const Home = () => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<any>(window.__NEFUSOFT_CACHE__?.schedule || {});
  const [ongoing, setOngoing] = useState<any[]>(window.__NEFUSOFT_CACHE__?.ongoing || []);
  const [popular, setPopular] = useState<any[]>(window.__NEFUSOFT_CACHE__?.popular || []);
  const [slider, setSlider] = useState<any[]>(window.__NEFUSOFT_CACHE__?.slider || []);
  const [movies, setMovies] = useState<any[]>(window.__NEFUSOFT_CACHE__?.movies || []);
  const [completed, setCompleted] = useState<any[]>(window.__NEFUSOFT_CACHE__?.completed || []);
  const [homeAnimes, setHomeAnimes] = useState<any[]>(window.__NEFUSOFT_CACHE__?.homeAnimes || []);
  const [pagination, setPagination] = useState<any>(window.__NEFUSOFT_CACHE__?.pagination || null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [continueWatching, setContinueWatching] = useState<HistoryItem[]>([]);
  const [showContinueWatching, setShowContinueWatching] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isLoading, setIsLoading] = useState(!window.__NEFUSOFT_CACHE__);
  const [copyToast, setCopyToast] = useState(false);
  
  const ongoingCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const todayCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const popularCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const movieCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const completedCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const homeCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const ongoingScrollRef = useRef<HTMLDivElement>(null);
  const todayScrollRef = useRef<HTMLDivElement>(null);
  const movieScrollRef = useRef<HTMLDivElement>(null);
  const completedScrollRef = useRef<HTMLDivElement>(null);
  const popularScrollRef = useRef<HTMLDivElement>(null);

  const shuffleArray = (array: any[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  useEffect(() => {
    if (!sessionStorage.getItem('welcomeShown')) {
      navigate('/welcome', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        userService.getProfile().then(prof => {
          if (prof.settings) {
            setShowContinueWatching(prof.settings.showContinueWatching);
          }
        });
      } else {
        setShowContinueWatching(true);
      }
      userService.getContinueWatching().then(data => setContinueWatching(data));
    });

    window.scrollTo(0, 0);
    if (window.__NEFUSOFT_CACHE__) return () => unsubscribe();
    
    let isMounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [homeData, continueData] = await Promise.all([
          animeService.getHomeData(),
          userService.getContinueWatching()
        ]);
        if (!isMounted) return;
        
        const { 
          schedule: schData, 
          ongoing: ongData, 
          popular: popData, 
          slider: sliderData, 
          pagination: pagData,
          movies: movData,
          completed: compData,
          homeAnimes: hAnimesData
        } = homeData;
        
        const shuffledOngoing = sliderData ? ongData : shuffleArray(ongData);

        setSchedule(schData);
        setOngoing(shuffledOngoing);
        setPopular(popData);
        setSlider(sliderData || []);
        setMovies(movData || []);
        setCompleted(compData || []);
        setHomeAnimes(hAnimesData || []);
        setPagination(pagData || null);
        setCurrentPage(1);
        setContinueWatching(continueData);
        window.__NEFUSOFT_CACHE__ = { 
          schedule: schData, 
          ongoing: shuffledOngoing, 
          popular: popData, 
          slider: sliderData, 
          pagination: pagData,
          movies: movData,
          completed: compData,
          homeAnimes: hAnimesData
        };
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, []);

  const days = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
  const todayAnime = (schedule[days[new Date().getDay()]] || []).filter((a: any) => a.status === "ONGOING" || a.status === "Sedang Tayang" || a.isSanka || a.isDevEntry);
  
  // Merge slider from API with today's ongoing schedule
  const combinedSlider = [...slider, ...todayAnime];
  const displaySlider = combinedSlider.filter((item, index, self) => 
    index === self.findIndex((t) => (
      (t.id && t.id === item.id) || (t.slug && t.slug === item.slug)
    ))
  );
  const carouselItems = displaySlider.length > 0 ? [...displaySlider, displaySlider[0]] : [];

  useEffect(() => {
    if (displaySlider.length > 0) {
      const itv = setInterval(() => setHeroIndex(p => p + 1), 6000);
      return () => clearInterval(itv);
    }
  }, [displaySlider]);

  useEffect(() => {
    if (displaySlider.length > 0 && heroIndex === displaySlider.length) {
      const tm = setTimeout(() => {
        setIsTransitioning(false);
        setHeroIndex(0);
      }, 750);
      return () => clearTimeout(tm);
    }
  }, [heroIndex, displaySlider.length]);

  useEffect(() => {
    if (!isTransitioning && heroIndex === 0) {
      const tm = setTimeout(() => {
        setIsTransitioning(true);
      }, 50);
      return () => clearTimeout(tm);
    }
  }, [isTransitioning, heroIndex]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('opacity-0', 'blur-xl', 'translate-y-4');
            entry.target.classList.add('opacity-100', 'blur-none', 'translate-y-0');
          }
        });
      },
      { threshold: 0.1 }
    );
    ongoingCardRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    todayCardRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    movieCardRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    completedCardRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    homeCardRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    popularCardRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, [ongoing, schedule, popular, movies, completed, homeAnimes, isLoading]);

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left'|'right') => {
    if (ref.current) {
      const scrollAmount = 300;
      ref.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const text = 'Ajak temanmu nonton anime favorit bareng di ChisaStream, gratis dan tanpa iklan!!';
    const encodedText = encodeURIComponent(text);
    
    if (platform === 'api') {
      if (navigator.share) {
        try { await navigator.share({ title: 'ChisaStream', text: text, url }); } catch (e) {}
      }
      return;
    }

    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(`${text} \n\n${url}`);
        setCopyToast(true);
        setTimeout(() => setCopyToast(false), 2000);
      } catch(e) {}
      return;
    }
    const encodedUrl = encodeURIComponent(url);
    if (platform === 'fb') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
    if (platform === 'x') window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`, '_blank');
    if (platform === 'tg') window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
  };

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    if (!pagination || isFetchingMore) return;
    
    const target = e.currentTarget;
    const isNearEnd = target.scrollLeft + target.clientWidth >= target.scrollWidth - 300;
    
    if (isNearEnd && (pagination.has_next_page || pagination.hasNext)) {
      setIsFetchingMore(true);
      try {
        const nextPage = currentPage + 1;
        const res = await animeService.getOngoing(nextPage);
        if (res.data && res.data.length > 0) {
          setOngoing(prev => [...prev, ...res.data]);
          setPagination(res.pagination);
          setCurrentPage(nextPage);
        } else {
          // If no data returned, prevent further attempts
          setPagination({ ...pagination, has_next_page: false, hasNext: false });
        }
      } catch (err) {
        console.error('Error fetching more ongoing:', err);
      } finally {
        setIsFetchingMore(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] font-sans selection:bg-[#EF4444] selection:text-black pb-24 text-white relative">
      {isLoading && <Loading />}
      <style>{`
        @keyframes shimmer { 0% { transform: translate3d(-100%, 0, 0) skewX(-20deg); } 100% { transform: translate3d(200%, 0, 0) skewX(-20deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px) translateX(-50%); } to { opacity: 1; transform: translateY(0) translateX(-50%); } }
        body, html { background-color: #0a0a0c !important; color: white; margin: 0; padding: 0; overscroll-behavior-y: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; cursor: pointer; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
      `}</style>
      
      {copyToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-[#EF4444] text-black px-6 py-3 rounded-full font-black text-sm z-[999] shadow-[0_10px_30px_rgba(246,207,128,0.3)] animate-[fadeIn_0.3s_ease-out_forwards]">
          Tautan berhasil disalin!
        </div>
      )}

      <Navbar />
      <header className="relative w-full aspect-[16/10] md:aspect-video min-h-[300px] md:max-h-[550px] overflow-hidden bg-[#0a0a0c]">
        {isLoading ? <HeroSkeleton /> : (
          <div className={`flex h-full ${isTransitioning ? 'transition-transform duration-700' : ''}`} style={{ transform: `translate3d(-${heroIndex * 100}%, 0, 0)` }}>
            {carouselItems.map((a, i) => (
              <div key={i} className="min-w-full h-full relative">
                {a?.isDevEntry && <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
                <img 
                src={getImageUrl(a.image_cover || a.image_poster)} 
                onError={(e) => handleImageError(e, a.image_cover || a.image_poster)}
                className="w-full h-full object-cover opacity-50" 
              />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, #0a0a0c 0%, rgba(10, 10, 12, 0.4) 60%, transparent 100%)' }}></div>
                <div className="absolute bottom-8 left-6 md:bottom-12 md:left-12 flex items-end gap-4 md:gap-8 z-10 w-[calc(100%-48px)] md:w-[calc(100%-96px)] max-w-7xl mx-auto pr-8 md:pr-0">
                  <img 
                  src={getImageUrl(a.image_poster || a.image_cover)} 
                  onError={(e) => handleImageError(e, a.image_poster || a.image_cover)}
                  className="w-24 md:w-32 md:w-40 aspect-[3/4.2] object-cover border border-white/10 rounded-xl shadow-2xl shrink-0" 
                />
                  <div className="flex flex-col text-left mb-1 md:mb-4 gap-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {a.type && <span className="px-2 py-0.5 bg-white/10 text-white/60 text-[8px] font-black rounded tracking-widest">{a.type}</span>}
                    </div>
                    <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight line-clamp-2 md:mb-2 uppercase">{a.title}</h2>
                    <p className="text-[11px] md:text-sm text-white/60 line-clamp-2 max-w-xl leading-relaxed md:mb-6">{a.synopsis || (a.isSanka ? 'Saksikan keseruan anime ini sekarang juga!' : '')}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <button 
                        onClick={() => {
                          navigate(animeService.getAnimePath(a));
                        }} 
                        className="px-6 md:px-8 py-2 md:py-3 bg-[#EF4444] text-black rounded-lg font-black tracking-wider text-[11px] md:text-sm flex items-center justify-center gap-2 shrink-0 transition-transform hover:scale-105"
                      >
                        <svg className="w-4 h-4 md:w-5 md:h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        <span className="leading-none pt-[2px]">TONTON SEKARANG</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && displaySlider.length > 0 && (
          <div className="absolute bottom-6 right-6 md:bottom-12 md:right-12 flex items-center gap-2 z-20">
            <span className="text-xs font-black text-white">{(heroIndex % displaySlider.length) + 1} / {displaySlider.length}</span>
            <div className="w-8 md:w-10 h-[2px] bg-white/20 rounded-full"></div>
            <button onClick={() => { if (isTransitioning && heroIndex < displaySlider.length) setHeroIndex(p => p + 1); }} className="text-white hover:text-[#EF4444] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        )}
      </header>

      {/* CONTINUE WATCHING */}
      {continueWatching.length > 0 && showContinueWatching && (
        <section className="max-w-7xl mx-auto px-4 mt-12 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-white leading-none tracking-tight flex items-center gap-2">
                LANJUTKAN MENONTON
                <div className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse"></div>
              </h2>
              <span className="text-[10px] text-white/40 mt-1 font-bold uppercase tracking-widest">Akses cepat tontonan terakhirmu</span>
            </div>
          </div>
          
          <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar snap-x">
            {continueWatching.map((item, idx) => (
              <div 
                key={`${item.id || item.slug || 'cw'}-${idx}`} 
                onClick={() => navigate(`/anime/${item.slug}/${item.episode}${item.server ? `?src=${item.server}` : ''}`)}
                className="min-w-[280px] md:min-w-[320px] group cursor-pointer snap-start relative h-28 bg-[#16161a] border border-white/5 rounded-2xl overflow-hidden hover:bg-white/[0.04] transition-all shadow-xl flex items-center p-3 gap-4"
              >
                {/* Backdrop Blur */}
                <div className="absolute right-0 top-0 bottom-0 w-2/3 z-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#16161a] via-[#16161a]/60 to-transparent z-10"></div>
                  {item?.isDevEntry && <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
                <img 
                    src={getImageUrl(item.cover || item.image)} 
                    onError={(e) => handleImageError(e, item.cover || item.image)}
                    className="w-full h-full object-cover opacity-10 group-hover:opacity-30 transition-all duration-700 group-hover:scale-110" 
                    alt="" 
                  />
                </div>

                <div className="relative z-10 w-16 h-22 md:w-20 md:h-22 rounded-xl overflow-hidden shrink-0 shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-500">
                  {item?.isDevEntry && <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
                <img 
                    src={getImageUrl(item.image)} 
                    onError={(e) => handleImageError(e, item.image)}
                    className="w-full h-full object-cover" 
                    alt="" 
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={20} fill="white" className="text-white" />
                  </div>
                </div>

                <div className="relative z-10 flex-1 min-w-0 pr-10">
                  <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-tight line-clamp-1 mb-1 group-hover:text-[#EF4444] transition-colors">{item.title}</h3>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-[#EF4444] uppercase tracking-widest">Episode {item.episode}</span>
                    {item.duration > 0 && (
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#EF4444]" 
                          style={{ width: `${Math.min(100, (item.timestamp / item.duration) * 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:bg-[#EF4444] group-hover:text-black transition-all">
                  <Play size={14} fill="currentColor" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* INSTALL APP BANNER */}
      <section className="max-w-7xl mx-auto px-4 mt-8 md:mt-10">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#EF4444]/20 to-[#16161a] p-6 md:p-8 rounded-[40px] border border-[#EF4444]/30 shadow-[0_0_40px_rgba(246,207,128,0.1)] group">
           <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
              <Smartphone size={120} className="text-[#EF4444] rotate-12" />
           </div>
           <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                 <div className="flex items-center gap-3 mb-2">
                    <div className="bg-[#EF4444] text-black p-2 rounded-xl">
                       <Download size={20} />
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">Download Aplikasi</h3>
                 </div>
                 <p className="text-sm text-white/60 font-medium max-w-md">Install ChisaStream ke layar utama perangkatmu untuk pengalaman menonton yang lebih cepat dan lancar tanpa harus membuka browser lagi!</p>
              </div>
              <button 
                 onClick={async () => {
                    const promptEvent = (window as any).deferredPrompt;
                    if (promptEvent) {
                        promptEvent.prompt();
                        const { outcome } = await promptEvent.userChoice;
                        if (outcome === 'accepted') {
                            (window as any).deferredPrompt = null;
                        }
                    } else {
                        import('sweetalert2').then(({ default: Swal }) => {
                          import('sweetalert2-react-content').then(({ default: withReactContent }) => {
                            const MySwal = withReactContent(Swal);
                            MySwal.fire({
                                title: 'Tidak Didukung',
                                text: 'Perangkat/Browser ini mungkin belum mendukung instalasi PWA, atau aplikasi mungkin sudah terpasang.',
                                icon: 'info'
                            });
                          });
                        });
                    }
                 }}
                 className="bg-[#EF4444] text-black hover:bg-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all text-center"
              >
                 Install Sekarang
              </button>
           </div>
        </div>
      </section>

      {/* SEBARKAN KESERUAN INI */}
      <section className="max-w-7xl mx-auto px-4 mt-8 md:mt-10">
        <div className="relative bg-[#16161a] h-auto min-h-[128px] p-6 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
          <div className="absolute inset-0 z-0">
                <img 
                src={getImageUrl("https://files.catbox.moe/yd5qpz.jpg")} 
                onError={(e) => handleImageError(e, "https://files.catbox.moe/yd5qpz.jpg")}
                className="w-full h-full object-cover opacity-60" 
                alt=""
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, #16161a 0%, rgba(22, 22, 26, 0.8) 50%, transparent 100%)' }}></div>
           </div>
           <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 h-full">
             <div className="flex flex-col">
               <h3 className="text-white font-black uppercase text-base md:text-lg mb-1 tracking-tight">Sebarkan Keseruan Ini!</h3>
               <p className="text-white/60 text-xs font-medium leading-relaxed">Ajak teman-temanmu marathon anime favorit bareng di ChisaStream.</p>
             </div>
             <div className="flex gap-3">
                <button onClick={() => handleShare('copy')} className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black cursor-pointer text-white">
                   <svg className="w-4 h-4 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                   Salin Link
                </button>
                <button onClick={() => handleShare('fb')} className="bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/20 p-2.5 rounded-xl cursor-pointer">
                   <svg className="w-5 h-5 fill-[#1877F2] transition-colors" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </button>
                <button onClick={() => handleShare('tg')} className="bg-[#229ED9]/10 hover:bg-[#229ED9]/20 border border-[#229ED9]/20 p-2.5 rounded-xl cursor-pointer">
                   <svg className="w-5 h-5 fill-[#229ED9] transition-colors" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 2.022-.963 6.925-1.36 9.194-.167.957-.5 1.28-.823 1.312-.738.073-1.303-.482-2.02-.953-1.121-.735-1.754-1.194-2.844-1.91-.122-.08-.266-.174-.407-.272-1.16-.807-.444-1.251.275-1.996.188-.195 3.461-3.17 3.523-3.44.008-.034.016-.159-.06-.225-.074-.066-.183-.043-.263-.025-.114.025-1.91 1.215-5.394 3.565-.51.35-1.02.522-1.479.513-.412-.008-1.206-.233-1.796-.425-2.008-.65-2.585-1.077-2.585-1.077-.286-.226.541-1.042 1.488-1.42 5.093-2.028 8.683-3.526 10.771-4.394 1.078-.445 1.583-.618 1.91-.62z"/></svg>
                </button>
             </div>
           </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 mt-12 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col cursor-pointer group" onClick={() => navigate(`/ongoing${slider.length > 0 ? '?src=sanka' : ''}`)}>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white leading-none group-hover:text-[#EF4444] transition-colors tracking-tight uppercase">ANIME ONGOING</h2>
              <svg className="w-5 h-5 text-white/40 group-hover:text-[#EF4444] transition-colors" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </div>
            <span className="text-[10px] text-white/40 mt-1 font-bold uppercase tracking-widest">Update anime terbaru hari ini</span>
          </div>
          <div className="flex gap-2">
             <button onClick={() => scroll(ongoingScrollRef, 'left')} className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-full group hover:bg-white/20 transition-colors"><svg className="w-4 h-4 text-white/50 group-hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 19l-7-7 7-7"/></svg></button>
             <button onClick={() => scroll(ongoingScrollRef, 'right')} className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-full group hover:bg-white/20 transition-colors"><svg className="w-4 h-4 text-white/50 group-hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 5l7 7-7 7"/></svg></button>
          </div>
        </div>
        <div 
          ref={ongoingScrollRef} 
          onScroll={handleScroll}
          className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar snap-x"
        >
          {isLoading ? [...Array(8)].map((_, i) => <CardSkeleton key={i} />) : 
            ongoing.map((a, i) => (
              <div 
                key={`${a.id || a.slug || 'ongoing'}-${i}`} 
                ref={el => { if (el) ongoingCardRefs.current[i] = el; }} 
                onClick={() => {
                  navigate(animeService.getAnimePath(a));
                }} 
                className="min-w-[128px] w-[128px] group cursor-pointer snap-start transition-all duration-700 opacity-0 blur-xl translate-y-4 active:scale-95 flex flex-col"
              >
                <div className="relative aspect-[3/4.5] overflow-hidden bg-white/5 rounded-xl shadow-lg mb-2">
                  {a?.isDevEntry && <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
                <img 
                    src={getImageUrl(a.image_poster)} 
                    onError={(e) => handleImageError(e, a.image_poster)}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  />
                  {(a.current_episode || a.episode) && (
                    <div className="absolute top-2 left-2 bg-[#EF4444] text-black px-2 py-0.5 rounded text-[10px] md:text-[8px] font-black uppercase">
                      {a.episode || `EP ${a.current_episode}`}
                    </div>
                  )}
                </div>
                <h3 className="text-[11px] font-bold text-white/80 line-clamp-1 group-hover:text-[#EF4444] transition-colors uppercase tracking-tight">{a.title}</h3>
              </div>
            ))
          }
          {isFetchingMore && (
            <div className="min-w-[128px] h-[192px] flex items-center justify-center bg-white/5 rounded-xl border border-dashed border-white/10 animate-pulse">
              <div className="w-8 h-8 border-2 border-[#EF4444] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 mt-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col cursor-pointer group" onClick={() => navigate('/schedule')}>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white leading-none group-hover:text-[#EF4444] transition-colors tracking-tight">TODAY</h2>
              <svg className="w-5 h-5 text-white/40 group-hover:text-[#EF4444] transition-colors" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </div>
            <span className="text-[10px] text-white/40 mt-1 font-bold uppercase tracking-widest">Anime hari ini</span>
          </div>
          <div className="flex gap-2">
             <button onClick={() => scroll(todayScrollRef, 'left')} className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-full group hover:bg-white/20 transition-colors"><svg className="w-4 h-4 text-white/50 group-hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 19l-7-7 7-7"/></svg></button>
             <button onClick={() => scroll(todayScrollRef, 'right')} className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-full group hover:bg-white/20 transition-colors"><svg className="w-4 h-4 text-white/50 group-hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 5l7 7-7 7"/></svg></button>
          </div>
        </div>
        <div ref={todayScrollRef} className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar snap-x">
          {isLoading ? [...Array(8)].map((_, i) => <CardSkeleton key={i} />) : 
            todayAnime.map((a, i) => (
              <div key={`${a.id || a.slug || 'today'}-${i}`} ref={el => { if (el) todayCardRefs.current[i] = el; }} onClick={() => navigate(animeService.getAnimePath(a))} className="min-w-[128px] w-[128px] group cursor-pointer snap-start transition-all duration-700 opacity-0 blur-xl translate-y-4 active:scale-95 flex flex-col">
                <div className="relative aspect-[3/4.5] overflow-hidden bg-white/5 rounded-xl shadow-lg mb-2">
                  {a?.isDevEntry && <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
                <img 
                    src={getImageUrl(a.image_poster)} 
                    onError={(e) => handleImageError(e, a.image_poster)}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  />
                </div>
                <h3 className="text-[11px] font-bold text-white/80 line-clamp-1 group-hover:text-[#EF4444] transition-colors">{a.title}</h3>
              </div>
            ))
          }
        </div>
      </section>

      {/* COMPLETED ANIME SLIDER */}
      {completed.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-12 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col cursor-pointer group" onClick={() => navigate('/completed?src=sanka')}>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white leading-none group-hover:text-[#EF4444] transition-colors tracking-tight uppercase">COMPLETED ANIME</h2>
                <svg className="w-5 h-5 text-white/40 group-hover:text-[#EF4444] transition-colors" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
              </div>
              <span className="text-[10px] text-white/40 mt-1 font-bold uppercase tracking-widest">Anime yang sudah tamat di Server 2</span>
            </div>
            <div className="flex gap-2">
               <button onClick={() => scroll(completedScrollRef, 'left')} className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-full group hover:bg-white/20 transition-colors"><svg className="w-4 h-4 text-white/50 group-hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 19l-7-7 7-7"/></svg></button>
               <button onClick={() => scroll(completedScrollRef, 'right')} className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-full group hover:bg-white/20 transition-colors"><svg className="w-4 h-4 text-white/50 group-hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 5l7 7-7 7"/></svg></button>
            </div>
          </div>
          <div ref={completedScrollRef} className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar snap-x">
            {completed.map((a, i) => (
              <div 
                key={`${a.id || a.slug || 'completed'}-${i}`} 
                ref={el => { if (el) completedCardRefs.current[i] = el; }} 
                onClick={() => navigate(animeService.getAnimePath(a))} 
                className="min-w-[128px] w-[128px] group cursor-pointer snap-start transition-all duration-700 opacity-0 blur-xl translate-y-4 active:scale-95 flex flex-col"
              >
                <div className="relative aspect-[3/4.5] overflow-hidden bg-white/5 rounded-xl shadow-lg mb-2">
                  {a?.isDevEntry && <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
                <img 
                    src={getImageUrl(a.image_poster)} 
                    onError={(e) => handleImageError(e, a.image_poster)}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  />
                  {a.episode && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">
                      TAMAT
                    </div>
                  )}
                </div>
                <h3 className="text-[11px] font-bold text-white/80 line-clamp-1 group-hover:text-[#EF4444] transition-colors">{a.title}</h3>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MOVIES SLIDER */}
      {movies.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-12 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col cursor-pointer group" onClick={() => navigate('/movies?src=sanka')}>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white leading-none group-hover:text-[#EF4444] transition-colors tracking-tight uppercase">ANIME MOVIES</h2>
                <svg className="w-5 h-5 text-white/40 group-hover:text-[#EF4444] transition-colors" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
              </div>
              <span className="text-[10px] text-white/40 mt-1 font-bold uppercase tracking-widest">Koleksi layar lebar di Server 2</span>
            </div>
            <div className="flex gap-2">
               <button onClick={() => scroll(movieScrollRef, 'left')} className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-full group hover:bg-white/20 transition-colors"><svg className="w-4 h-4 text-white/50 group-hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 19l-7-7 7-7"/></svg></button>
               <button onClick={() => scroll(movieScrollRef, 'right')} className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-full group hover:bg-white/20 transition-colors"><svg className="w-4 h-4 text-white/50 group-hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 5l7 7-7 7"/></svg></button>
            </div>
          </div>
          <div ref={movieScrollRef} className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar snap-x">
            {movies.map((a, i) => (
              <div 
                key={`${a.id || a.slug || 'movie'}-${i}`} 
                ref={el => { if (el) movieCardRefs.current[i] = el; }} 
                onClick={() => navigate(animeService.getAnimePath(a))} 
                className="min-w-[128px] w-[128px] group cursor-pointer snap-start transition-all duration-700 opacity-0 blur-xl translate-y-4 active:scale-95 flex flex-col"
              >
                <div className="relative aspect-[3/4.5] overflow-hidden bg-white/5 rounded-xl shadow-lg mb-2">
                  {a?.isDevEntry && <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
                <img 
                    src={getImageUrl(a.image_poster)} 
                    onError={(e) => handleImageError(e, a.image_poster)}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  />
                  <div className="absolute top-2 left-2 bg-[#EF4444] text-black px-2 py-0.5 rounded text-[8px] font-black uppercase">
                    MOVIE
                  </div>
                </div>
                <h3 className="text-[11px] font-bold text-white/80 line-clamp-1 group-hover:text-[#EF4444] transition-colors">{a.title}</h3>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* HOME ANIME GRID 3 */}
      {homeAnimes.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-12 relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col cursor-pointer group" onClick={() => navigate('/browse?src=sanka')}>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white leading-none group-hover:text-[#EF4444] transition-colors tracking-tight uppercase">HOME COLLECTION</h2>
                <svg className="w-5 h-5 text-white/40 group-hover:text-[#EF4444] transition-colors" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
              </div>
              <span className="text-[10px] text-white/40 mt-1 font-bold uppercase tracking-widest">Pilihan anime terbaik Server 2</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {homeAnimes.slice(0, 12).map((a, i) => (
              <div 
                key={`${a.id || a.slug || 'home'}-${i}`}
                ref={el => { if (el) homeCardRefs.current[i] = el; }}
                onClick={() => navigate(animeService.getAnimePath(a))}
                className="group cursor-pointer transition-all duration-700 opacity-0 blur-xl translate-y-4 active:scale-95"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-white/5 rounded-2xl shadow-lg border border-white/5 mb-3">
                  {a?.isDevEntry && <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
                <img 
                    src={getImageUrl(a.image_poster)} 
                    onError={(e) => handleImageError(e, a.image_poster)}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                  <div className="absolute bottom-3 left-3 flex flex-col">
                    <span className="text-[10px] font-black text-[#EF4444] uppercase tracking-widest">{a.episode || a.type}</span>
                  </div>
                </div>
                <h3 className="text-sm font-black text-white/90 line-clamp-1 group-hover:text-[#EF4444] transition-colors uppercase tracking-tight">{a.title}</h3>
                <p className="text-[10px] text-white/40 font-bold uppercase mt-1 tracking-widest">{a.status_or_day || 'Server 2'}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* POPULAR SECTION */}
      <section className="max-w-7xl mx-auto px-4 mt-12 pb-10 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col cursor-pointer group" onClick={() => navigate('/search')}>
             <div className="flex items-center gap-2">
               <h2 className="text-xl font-black text-white leading-none tracking-tight group-hover:text-[#EF4444] transition-colors uppercase">POPULAR TODAY</h2>
               <svg className="w-5 h-5 text-white/40 group-hover:text-[#EF4444] transition-colors" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
             </div>
             <span className="text-[10px] text-white/40 mt-1 font-bold uppercase tracking-widest">Anime terpopuler hari ini</span>
          </div>
          <button onClick={() => navigate('/search')} className="text-[10px] font-black text-[#EF4444] uppercase tracking-widest hover:opacity-70 transition-opacity">VIEW ALL</button>
        </div>
        
        <div className="flex flex-col gap-4">
          {isLoading ? [...Array(10)].map((_, i) => <div key={i} className="h-24 md:h-28 bg-[#16161a] rounded-xl relative overflow-hidden"><Shimmer /></div>) :
            popular.slice(0, 10).map((anime, index) => {
              const isTop3 = index < 3;
              const cardBg = isTop3 
                ? 'bg-linear-to-r from-[#1a1a1e] to-[#0d0d0f]' 
                : 'bg-linear-to-r from-[#141417] to-[#0a0a0c]';
              const borderStyle = isTop3 
                ? 'border-l-4 border-[#EF4444]' 
                : 'border border-white/5 hover:border-[#EF4444]/20';
                
              return (
                <div 
                  key={`${anime.id || anime.slug || 'pop'}-${index}`} 
                  ref={el => { if (el) popularCardRefs.current[index] = el; }}  
                  onClick={() => {
                    navigate(animeService.getAnimePath(anime));
                  }} 
                  className={`group cursor-pointer relative h-24 md:h-36 rounded-2xl flex items-center px-4 md:px-6 overflow-hidden transition-all duration-700 opacity-0 blur-xl translate-y-4 active:scale-95 shadow-2xl ${cardBg} ${borderStyle}`}
                >
                  {/* Seamless Background Image System */}
                  <div className="absolute inset-0 z-0 overflow-hidden">
                    <img 
                      src={getImageUrl(anime.image_cover || anime.image_poster)} 
                      onError={(e) => handleImageError(e, anime.image_cover || anime.image_poster)}
                      className={`absolute right-0 top-0 h-full w-2/3 md:w-1/2 object-cover transition-all duration-700 scale-110 group-hover:scale-100 ${isTop3 ? 'opacity-60 group-hover:opacity-100' : 'opacity-40 group-hover:opacity-80'}`} 
                      style={{ 
                        maskImage: 'linear-gradient(to left, black, rgba(0,0,0,0.8) 50%, transparent)',
                        WebkitMaskImage: 'linear-gradient(to left, black, rgba(0,0,0,0.8) 50%, transparent)'
                      }}
                      alt="" 
                    />
                    {/* Extra gradient overlay for perfect blending with card background */}
                    <div className={`absolute inset-0 bg-gradient-to-r from-[${isTop3 ? '#1a1a1e' : '#141417'}] via-[${isTop3 ? '#1a1a1e' : '#141417'}]/60 to-transparent z-10`}></div>
                  </div>

                  <div className="relative z-20 flex items-center gap-4 md:gap-10 w-full pr-[45%]">
                    <div className="relative shrink-0 w-12 md:w-20 text-center">
                       <span className={`text-5xl md:text-8xl font-black italic transition-all duration-500 block ${isTop3 ? 'text-[#EF4444] drop-shadow-[0_0_20px_rgba(246,207,128,0.5)]' : 'text-white/[0.03] group-hover:text-white/10'}`}>
                        {index + 1}
                      </span>
                      {!isTop3 && (
                         <span className="absolute inset-0 flex items-center justify-center text-xl md:text-3xl font-black text-white/10 group-hover:text-[#EF4444]/40 transition-colors">
                            {index + 1}
                         </span>
                      )}
                    </div>

                    <div className="flex flex-col pr-2 flex-1 min-w-0">
                      <h3 className="text-white font-black text-[13px] md:text-3xl line-clamp-1 group-hover:text-[#EF4444] transition-colors uppercase tracking-tight leading-tight">{anime.title}</h3>
                      <div className="flex items-center gap-2 mt-1 md:mt-2">
                        <div className="flex items-center gap-1.5">
                           <svg className="w-3 h-3 md:w-5 md:h-5 text-[#EF4444] fill-current drop-shadow-[0_0_8px_rgba(246,207,128,0.5)]" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                           <span className="text-[12px] md:text-lg text-[#EF4444] font-black uppercase tracking-widest">{anime.favorites || anime.rating || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute right-8 md:right-12 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 hidden lg:flex items-center justify-center z-30">
                    <div className="w-16 h-16 rounded-full bg-[#EF4444] flex items-center justify-center text-black shadow-[0_0_50px_rgba(246,207,128,0.6)] transform hover:scale-110 active:scale-90 transition-transform">
                      <Play size={32} fill="currentColor" className="ml-1" />
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Home;
