import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Play, ChevronRight, ChevronLeft, Star, Calendar, Clock, Search, LayoutGrid, Heart, Share2, Info, Eye, Languages, Shield, Tv, ChevronDown, ArrowLeft, MoreVertical, Bookmark, BookmarkCheck, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Loading from '../components/Loading';
import { userService } from '../services/userService';
import { animeService } from '../services/animeService';
import { getImageUrl, handleImageError } from '../lib/imageUtils';

const EPISODES_PER_PAGE = 24;

const Detail = () => {
  const { slug } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const searchSource = searchParams.get('src') || 'sanka';
  const devImg = searchParams.get('img');
  const devTitle = searchParams.get('title');
  const devUrl = searchParams.get('url');

  const id = useMemo(() => {
    if (!slug) return null;
    if (searchSource === 'sanka') return slug;
    if (searchSource === 'dev') return devUrl || (slug.startsWith('dev-') ? slug.replace('dev-', '') : slug);
    return slug.split('-')[0];
  }, [slug, searchSource, devUrl]);
  const navigate = useNavigate();
  const [anime, setAnime] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);
  const [showFullEpisodes, setShowFullEpisodes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [expFloating, setExpFloating] = useState<{ id: number, amount: number }[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!id) return;

    const checkBookmark = async () => {
      if (slug) {
        const bookmarked = await userService.isBookmarked(slug);
        setIsBookmarked(bookmarked);
      }
    };
    checkBookmark();

    const fetchAll = async () => {
      setIsLoading(true);
      try {
        let detailData = null;
        const queryTitle = devTitle || (slug?.includes('-') ? slug.split('-').slice(1).join(' ') : null);
        
        if (searchSource === 'sanka' && id) {
           detailData = await animeService.getAnimeDetail(id);
        } else if (searchSource === 'dev' && id) {
           detailData = await animeService.getDevDetail(id);
        } else {
           detailData = await animeService.getAnimeDetail(id);
        }

        if (detailData && searchSource === 'dev' && devImg) {
           // Override with Dev API images as requested
           detailData.image_poster = devImg;
           detailData.image_cover = devImg;
        }

        // Recommendations always stay on main API
        const popularRes = await animeService.getPopular(Math.floor(Math.random() * 5) + 1);
        const popularData = (popularRes as any).data || popularRes;
        
        if (detailData) {
          setAnime(detailData);
        }
        if (Array.isArray(popularData)) setRecommendations(popularData.slice(0, 10));
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [id, slug]);

  const toggleBookmark = async () => {
    if (!anime || !slug) return;
    const added = await userService.toggleBookmark({
      id: id!,
      title: anime.title,
      image: anime.image_poster,
      cover: anime.image_cover,
      slug: slug,
      type: anime.type,
      status: anime.status
    });
    
    if (added) {
      const expId = Date.now();
      setExpFloating(prev => [...prev, { id: expId, amount: 30 }]); // 30 is bookmark EXP
      setTimeout(() => setExpFloating(prev => prev.filter(f => f.id !== expId)), 3000);
    }
    
    setIsBookmarked(added);
  };

  const episodes = useMemo(() => {
    if (!anime?.episode_list) return [];
    const reversed = [...anime.episode_list].reverse();
    if (!searchQuery) return reversed;
    return reversed.filter(ep => ep.index.toString().includes(searchQuery));
  }, [anime, searchQuery]);

  const latestEpisodes = useMemo(() => episodes.slice(0, 5), [episodes]);
  const totalPages = Math.ceil(episodes.length / EPISODES_PER_PAGE);
  const paginatedEpisodes = useMemo(() => {
    const start = currentPage * EPISODES_PER_PAGE;
    return episodes.slice(start, start + EPISODES_PER_PAGE);
  }, [episodes, currentPage]);

  if (isLoading) return <Loading />;
  if (!anime) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0c] font-sans selection:bg-[#EF4444] selection:text-black text-white pb-32">
      {/* Floating EXP Indicators */}
      <div className="fixed top-24 right-10 z-[200] pointer-events-none space-y-2">
        <AnimatePresence>
          {expFloating.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, x: 50, scale: 0.5 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 1.2 }}
              className="bg-[#EF4444] text-black px-4 py-2 rounded-full font-black text-xs flex items-center gap-2 shadow-2xl"
            >
              <Zap size={14} fill="currentColor" />
              +{f.amount} EXP
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top Header - Improved Positioning */}
      <div className="absolute top-0 left-0 right-0 z-[100] px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white hover:text-[#EF4444] transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 overflow-hidden">
               <img src="https://url.dinzid.my.id/buzJJc8" className="w-full h-full object-contain" alt="Logo" />
            </div>
            <span className="font-black text-xl tracking-tight hidden sm:block text-white">ChisaStream</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/search')} className="w-10 h-10 bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:text-[#EF4444] transition-colors"><Search size={20} /></button>
          <button onClick={toggleBookmark} className={`w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center transition-all ${isBookmarked ? 'bg-[#EF4444] text-black scale-110 shadow-[0_0_20px_rgba(246,207,128,0.4)]' : 'bg-white/5 text-white hover:text-[#EF4444]'}`}>
             {isBookmarked ? <BookmarkCheck size={20} weight="fill" /> : <Bookmark size={20} />}
          </button>
        </div>
      </div>

      {/* Cinematic Hero - Matched to Reference */}
      <section className="relative w-full h-[55vh] md:h-[70vh] overflow-hidden">
        <div className="absolute inset-0 z-0">
          {(anime.image_cover || anime.image_poster) ? (
            <>
              {anime?.isDevEntry && <div className="absolute top-6 right-6 bg-red-600/90 text-white text-[12px] font-black px-2 py-1 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
              <img 
                src={getImageUrl(anime.image_cover || anime.image_poster)} 
                onError={(e) => handleImageError(e, anime.image_cover || anime.image_poster)}
                className="w-full h-full object-cover opacity-60" 
                alt="" 
              />
            </>
          ) : (
            <div className="w-full h-full bg-[#1a1a20]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent"></div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-6 md:px-12 pb-8 flex items-end gap-6 md:gap-10 z-10">
          {/* Focal Poster - Visible on Mobile now */}
          <div 
            onClick={() => {
              if (episodes[0]) {
                const devImgPart = devImg ? `&img=${encodeURIComponent(devImg)}` : '';
                const devTitlePart = devTitle ? `&title=${encodeURIComponent(devTitle)}` : '';
                const devUrlPart = devUrl ? `&url=${encodeURIComponent(devUrl)}` : '';
                const devSuffix = searchSource === 'dev' ? `?src=dev${devImgPart}${devTitlePart}${devUrlPart}` : '';
                navigate(`/anime/${slug}/${episodes[0].index}${devSuffix}`);
              }
            }}
            className="w-32 sm:w-44 md:w-56 lg:w-64 aspect-[3/4.2] rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl relative group shrink-0 cursor-pointer border border-white/10"
          >
            {anime?.isDevEntry && <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
                <img 
              src={getImageUrl(anime.image_poster)} 
              onError={(e) => handleImageError(e, anime.image_poster)}
              className="w-full h-full object-cover" 
              alt="" 
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                <Play fill="white" size={24} className="ml-1" />
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 pb-2">
             <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="bg-[#EF4444] text-black text-[9px] font-black px-3 py-1 rounded-md uppercase tracking-widest">{anime.type || 'SERIES'}</span>
                <span className="bg-white/10 text-white/80 text-[9px] font-black px-3 py-1 rounded-md uppercase tracking-widest border border-white/5">{anime.status}</span>
             </div>
             <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter uppercase leading-[1.1] mb-2 drop-shadow-2xl">{anime.title}</h1>
             
             <div className="flex items-center gap-4 mb-4">
                <p className="text-white/40 font-bold text-xs md:text-sm tracking-tight">{anime.alternative_title || 'ワンピース'}</p>
                <button 
                  onClick={toggleBookmark}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isBookmarked ? 'bg-[#EF4444] text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                >
                  {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                  {isBookmarked ? 'Tersimpan' : 'Simpan'}
                </button>
             </div>
             
             <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] md:text-xs font-bold text-white/50">
                <div className="flex items-center gap-1.5"><Star size={14} className="text-[#EF4444] fill-[#EF4444]" /> <span>{anime.favorites || '8.82'}</span></div>
                <span className="text-white/20">|</span>
                <div>{anime.year || '1999'}</div>
                <span className="text-white/20">|</span>
                <div>{anime.views || '24M+'} Views</div>
                <span className="text-white/20">|</span>
                <div>{anime.rating || 'PG-13'}</div>
             </div>

             <div className="hidden md:flex flex-wrap items-center gap-2 pt-6">
               {(anime.genres_list || anime.genre?.split(',').slice(0, 5)).map((g: any, i: number) => {
                 const gname = typeof g === 'string' ? g.trim() : g.name;
                 const gslug = typeof g === 'string' ? g.trim().toLowerCase().replace(/\s+/g, '-') : g.slug;
                 return (
                   <button 
                    key={i} 
                    onClick={() => navigate(`/genre/${gslug}`)}
                    className="bg-white/5 border border-white/10 px-5 py-2 rounded-2xl text-[10px] font-black uppercase text-white/50 hover:text-[#EF4444] hover:bg-white/10 transition-all cursor-pointer"
                   >
                    {gname}
                   </button>
                 );
               })}
               {anime.genre?.split(',').length > 5 && (
                 <span className="text-[10px] font-black uppercase text-white/20 tracking-widest ml-2">... DLL</span>
               )}
               <button className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 hover:text-white ml-2"><ChevronDown size={18} /></button>
             </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-12 mt-8">
        
        {/* Mobile Genres - Clean Row */}
        <div className="md:hidden flex flex-wrap items-center justify-center gap-2 px-4">
           {(anime.genres_list || anime.genre?.split(',').slice(0, 5)).map((g: any, i: number) => {
             const gname = typeof g === 'string' ? g.trim() : g.name;
             const gslug = typeof g === 'string' ? g.trim().toLowerCase().replace(/\s+/g, '-') : g.slug;
             return (
               <button 
                key={i} 
                onClick={() => navigate(`/genre/${gslug}`)}
                className="bg-white/5 border border-white/5 px-4 py-2 rounded-xl text-[9px] font-black uppercase text-white/40 hover:text-[#EF4444] transition-colors"
               >
                {gname}
               </button>
             );
           })}
           {anime.genre?.split(',').length > 5 && (
             <span className="text-[9px] font-black uppercase text-white/20 tracking-widest">... DLL</span>
           )}
           <button className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/20 ml-1"><ChevronDown size={14} /></button>
        </div>

        {/* Synopsis */}
        <section className="relative">
           <p className={`text-white/60 text-sm md:text-base leading-relaxed font-medium transition-all ${showFullSynopsis ? '' : 'line-clamp-3'}`}>
             {anime.synopsis}
           </p>
           <button onClick={() => setShowFullSynopsis(!showFullSynopsis)} className="w-full flex items-center justify-center py-4 text-white/20 hover:text-white transition-colors">
              <ChevronDown className={`transition-transform duration-300 ${showFullSynopsis ? 'rotate-180' : ''}`} />
           </button>
        </section>

        {/* Dynamic info Grid - Exactly like image */}
        <section className="bg-white/[0.03] border border-white/5 p-8 md:p-10 rounded-[32px] grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-2">
           <InfoItem icon={<Info className="text-[#EF4444]" />} label="STUDIO" value={anime.studio || 'Toei Animation'} />
           <InfoItem icon={<LayoutGrid className="text-[#EF4444]" />} label="EPISODE" value={(anime.episode_list?.length || '1102') + '+'} />
           <InfoItem icon={<Calendar className="text-[#EF4444]" />} label="TAHUN" value={(anime.year || '1999') + ' - Sekarang'} />
           <InfoItem icon={<Clock className="text-[#EF4444]" />} label="DURASI" value={(anime.duration || '24 min') + ' / eps'} />
           <InfoItem icon={<Play className="text-[#EF4444]" />} label="STATUS" value={anime.status || 'Ongoing'} />
           <InfoItem icon={<Star className="text-[#EF4444]" />} label="SKOR" value={(anime.favorites || '8.82') + ' (33161)'} />
           <InfoItem icon={<Shield className="text-[#EF4444]" />} label="RATING" value={anime.rating || 'PG-13'} />
           <InfoItem icon={<Languages className="text-[#EF4444]" />} label="BAHASA" value="Jepang (Sub Indo)" />
        </section>

        {/* Episodes Terbaru (List Mode) */}
        <section className="space-y-6">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                 <div className="w-1.5 h-6 bg-[#EF4444] rounded-full"></div>
                 <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Episode</h2>
              </div>
              
              <div className="flex items-center gap-4">
                 {showFullEpisodes && (
                   <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#EF4444] transition-colors" size={16} />
                      <input 
                        type="text" 
                        placeholder="Cari eps..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
                        className="bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold text-white focus:outline-none focus:border-[#EF4444]/50 focus:bg-white/10 transition-all w-full md:w-48 placeholder:text-white/10"
                      />
                   </div>
                 )}
                 <button 
                   onClick={() => { setShowFullEpisodes(!showFullEpisodes); setSearchQuery(''); }}
                   className="shrink-0 flex items-center gap-1.5 text-xs font-black text-[#EF4444] uppercase tracking-wider hover:opacity-70"
                 >
                   {showFullEpisodes ? 'Ciutkan' : 'Lihat Semua'} <ChevronRight size={14} className={showFullEpisodes ? 'rotate-90' : ''} />
                 </button>
              </div>
           </div>

           <div className="space-y-4">
              <AnimatePresence mode="wait">
                 {(showFullEpisodes ? paginatedEpisodes : latestEpisodes).map((ep, idx) => (
                    <motion.div 
                      key={ep.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => {
                        const devImgPart = devImg ? `&img=${encodeURIComponent(devImg)}` : '';
                        const devTitlePart = devTitle ? `&title=${encodeURIComponent(devTitle)}` : '';
                        const devUrlPart = devUrl ? `&url=${encodeURIComponent(devUrl)}` : '';
                        const devSuffix = searchSource === 'dev' ? `?src=dev${devImgPart}${devTitlePart}${devUrlPart}` : (searchSource === 'sanka' ? '?src=sanka' : '');
                        navigate(`/anime/${slug}/${ep.index}${devSuffix}`);
                      }}
                      className="bg-white/[0.03] hover:bg-white/[0.08] border-b border-white/5 p-4 md:p-6 flex items-center justify-between group cursor-pointer transition-colors"
                    >
                       <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${idx === 0 && !showFullEpisodes ? 'bg-[#EF4444] text-black' : 'bg-white/5 text-white/20 group-hover:text-white'}`}>
                             {idx === 0 && !showFullEpisodes ? <Play size={20} fill="black" /> : <span className="font-black text-sm">{ep.index}</span>}
                          </div>
                          <div>
                             <h4 className="text-white font-black text-sm md:text-base uppercase tracking-tight">EPS {ep.index}</h4>
                             <p className="text-white/20 text-[10px] md:text-xs font-medium uppercase tracking-widest">{anime.title} - Episode {ep.index}</p>
                          </div>
                       </div>
                       {idx === 0 && !showFullEpisodes && (
                         <span className="bg-[#EF4444]/10 text-[#EF4444] text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-[#EF4444]/20">TERBARU</span>
                       )}
                    </motion.div>
                 ))}
              </AnimatePresence>
           </div>
        </section>

        {/* Full Episodes Grid (Hidden unless searching) */}
        {showFullEpisodes && totalPages > 1 && (
           <div className="flex items-center justify-center gap-4 py-8">
              <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white disabled:opacity-20"><ChevronLeft size={24} /></button>
              <div className="px-6 py-3 bg-white/5 rounded-2xl font-black text-xs tracking-widest">{currentPage + 1} / {totalPages}</div>
              <button disabled={currentPage === totalPages - 1} onClick={() => setCurrentPage(p => p + 1)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white disabled:opacity-20"><ChevronRight size={24} /></button>
           </div>
        )}

        {/* Recommendations Grid - Wide Banner Mode (Ref Image 1) */}
        <section className="space-y-10 pt-6">
           <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Rekomendasi</h2>
              <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-xs font-black text-[#EF4444] uppercase tracking-wider hover:opacity-70">Lihat Semua <ChevronRight size={14} /></button>
           </div>
           
           <div className="space-y-5">
              {recommendations.map(a => (
                <div 
                  key={a.id} 
                  onClick={() => navigate(animeService.getAnimePath(a))}
                  className="relative h-24 md:h-32 bg-[#16161a] border border-white/5 rounded-xl overflow-hidden cursor-pointer group hover:bg-white/[0.08] transition-all shadow-xl flex items-center px-4 md:px-8 gap-6 active:scale-[0.98]"
                >
                   <div className="absolute right-0 top-0 bottom-0 w-2/3 z-0">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#16161a] via-[#16161a]/60 to-transparent z-10"></div>
                      {a?.isDevEntry && <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
                <img 
                        src={getImageUrl(a.image_cover || a.image_poster)} 
                        onError={(e) => handleImageError(e, a.image_cover || a.image_poster)}
                        className="w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-all duration-700 group-hover:scale-110" 
                        alt="" 
                      />
                   </div>
                   
                   <div className="relative z-10 w-16 h-22 md:w-20 md:h-28 shrink-0 rounded-xl overflow-hidden shadow-2xl border border-white/10">
                      {a?.isDevEntry && <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
                <img 
                        src={getImageUrl(a.image_poster)} 
                        onError={(e) => handleImageError(e, a.image_poster)}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        alt="" 
                      />
                   </div>
                   
                   <div className="relative z-10 flex-1 min-w-0">
                      <h4 className="text-white font-black text-sm md:text-2xl truncate group-hover:text-[#EF4444] transition-colors uppercase tracking-tight mb-3">{a.title}</h4>
                      <div className="flex items-center gap-3">
                         <span className="bg-[#EF4444] text-black text-[8px] md:text-[10px] font-black px-4 py-1.5 rounded-lg uppercase tracking-widest leading-none shadow-lg">SERIES</span>
                         <span className="bg-white/10 text-white/40 text-[8px] md:text-[10px] font-black px-4 py-1.5 rounded-lg uppercase tracking-widest leading-none border border-white/5">FINISHED</span>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

const InfoItem = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
  <div className="flex items-center gap-4 px-2">
     <div className="w-10 h-10 shrink-0 flex items-center justify-center">
        {React.cloneElement(icon as React.ReactElement, { size: 20 } as any)}
     </div>
     <div className="min-w-0">
        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-0.5">{label}</p>
        <p className="text-xs md:text-sm font-black text-white/80 truncate uppercase tracking-tight">{value}</p>
     </div>
  </div>
);

export default Detail;
