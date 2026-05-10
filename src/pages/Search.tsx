import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { Search as SearchIcon, X, SlidersHorizontal, ChevronLeft, ChevronRight, Star, Clock, Filter, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getImageUrl, handleImageError } from '../lib/imageUtils';

const Shimmer = () => <div className="absolute top-0 bottom-0 left-0 w-[150%] animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent z-10" style={{ transform: 'translate3d(-100%, 0, 0) skewX(-20deg)' }} />;

const CardSkeleton = () => (
  <div className="w-full flex flex-col gap-3 relative">
    <div className="aspect-[3/4.2] bg-white/5 rounded-2xl relative overflow-hidden shadow-xl border border-white/5"><Shimmer /></div>
    <div className="w-3/4 h-3 bg-white/5 rounded-full relative overflow-hidden"><Shimmer /></div>
    <div className="w-1/2 h-2.5 bg-white/5 rounded-full relative overflow-hidden"><Shimmer /></div>
  </div>
);

interface AnimeCardProps {
  a: any;
  onClick: () => void;
  index: number;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ a, onClick, index }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), (index % 15) * 50);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      onClick={onClick} 
      className="w-full flex flex-col gap-3 group cursor-pointer active:scale-95 transition-all"
    >
      <div className="relative aspect-[3/4.2] w-full overflow-hidden bg-white/5 rounded-[24px] shadow-2xl border border-white/5 group-hover:border-[#EF4444]/30 transition-all duration-500">
        {a?.isDevEntry && <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
                <img 
          src={getImageUrl(a.image_poster)} 
          onError={(e) => handleImageError(e, a.image_poster)}
          alt={a.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
          loading="lazy" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
           <div className="flex items-center gap-2">
              <Star size={12} className="text-[#EF4444] fill-[#EF4444]" />
              <span className="text-[10px] font-black text-white uppercase tracking-wider">{a.favorites || 'N/A'}</span>
           </div>
        </div>
      </div>
      <div className="px-1 space-y-1">
        <h3 className="text-xs md:text-sm font-black text-white/80 line-clamp-1 uppercase tracking-tight group-hover:text-[#EF4444] transition-colors">{a.title}</h3>
        <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
           <span>{a.isDevEntry ? 'DEV API' : (a.status || 'Series')}</span>
           <div className="w-1 h-1 bg-white/10 rounded-full"></div>
           <span>{a.type || 'Sub'}</span>
        </div>
      </div>
    </motion.div>
  );
};

const Pagination = ({ page, setPage, hasMore }: { page: number, setPage: (p: number) => void, hasMore: boolean }) => {
  const pages = [];
  const startPage = Math.max(1, page - 2);
  const endPage = page + 2;

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex justify-center items-center gap-3 mt-16 mb-8 flex-wrap">
      <button 
        onClick={() => setPage(Math.max(1, page - 1))} 
        disabled={page === 1} 
        className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 text-white rounded-2xl disabled:opacity-20 hover:bg-[#EF4444] hover:text-black hover:border-transparent transition-all active:scale-90"
      >
        <ChevronLeft size={20} />
      </button>
      
      {pages.map((p) => (
        <button 
          key={p} 
          onClick={() => setPage(p)}
          className={`w-12 h-12 flex items-center justify-center rounded-2xl font-black text-sm transition-all shadow-xl active:scale-90 ${p === page ? 'bg-[#EF4444] text-black shadow-[0_0_20px_rgba(246,207,128,0.3)]' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10'}`}
        >
          {p}
        </button>
      ))}

      <button 
        onClick={() => setPage(page + 1)} 
        disabled={!hasMore}
        className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 text-white rounded-2xl disabled:opacity-20 hover:bg-[#EF4444] hover:text-black hover:border-transparent transition-all active:scale-90"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

import { animeService } from '../services/animeService';
import { userService, UserProfile } from '../services/userService';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { genreId } = useParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [genres, setGenres] = useState<any[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(genreId ? [genreId] : []);
  const [results, setResults] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const isSanka = (profile?.settings?.apiServer || 'sanka') === 'sanka';

  const refreshProfile = useCallback(async () => {
    const p = await userService.getProfile();
    setProfile(p);
  }, []);

  useEffect(() => {
    refreshProfile();
    window.addEventListener('profile-update', refreshProfile);
    return () => window.removeEventListener('profile-update', refreshProfile);
  }, [refreshProfile]);

  useEffect(() => {
    if (profile?.settings?.apiServer === 'main') {
      fetch('/api/proxy/genre')
        .then(r => r.ok ? r.text() : null)
        .then(text => {
           if (!text) return;
           try {
             const d = JSON.parse(text);
             if (d && d.status) setGenres(d.data || []);
           } catch(e) {}
        })
        .catch(() => setGenres([]));
    } else if (profile?.settings?.apiServer === 'sanka') {
      animeService.getGenres().then(setGenres);
    } else {
      setGenres([]);
    }
  }, [profile]);

  const fetchResults = useCallback(async (p: number, q: string, g: string[], isAppend = false) => {
    if (isAppend) setIsFetchingMore(true);
    else setIsLoading(true);
    
    try {
      let data: any[] = [];
      let pagination = null;
      
      const server = profile?.settings?.apiServer || 'main';

      let res;
      if (q) {
        res = await animeService.searchAnime(q, server === 'sanka' ? p : p - 1);
      } else if (g.length > 0 && g[0]) {
        if (server === 'sanka') {
          res = await animeService.getGenreAnimes(g[0], p);
        } else {
          try {
            const r = await fetch(`/api/proxy/genre/${g[0]}?page=${p-1}`);
            if (r.ok) {
              const text = await r.text();
              try {
                res = JSON.parse(text);
              } catch(e) {
                res = { data: [] };
              }
            } else {
              res = { data: [] };
            }
          } catch(e) {
            res = { data: [] };
          }
        }
      } else {
        res = await animeService.getPopular(server === 'sanka' ? p : p - 1);
      }

      if (server === 'sanka' && res?.data) {
        data = res.data;
        pagination = res.pagination;
      } else if (Array.isArray(res)) {
        data = res;
      } else if (res?.data) {
        data = res.data;
      }
      
      if (isAppend) {
        setResults(prev => [...prev, ...data]);
      } else {
        setResults(data);
        if (!isAppend) window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      const hasMoreData = server === 'sanka' 
        ? (pagination?.hasNext || false)
        : (data.length >= 10);
      
      setHasMore(hasMoreData);
    } catch (e) {
      if (!isAppend) setResults([]);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [profile]);

  useEffect(() => {
    const handleScroll = () => {
      // Only auto-scroll for Sanka SERVER and only when SEARCHING (query is not empty)
      if (!isSanka || !query || isLoading || isFetchingMore || !hasMore) return;
      
      const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500;
      if (isAtBottom) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchResults(nextPage, query, selectedGenres, true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isSanka, isLoading, isFetchingMore, hasMore, page, query, selectedGenres, fetchResults]);

  useEffect(() => {
    if (genreId) {
      setSelectedGenres([genreId]);
      setPage(1);
    }
  }, [genreId]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      setHasMore(true);
      fetchResults(1, query, selectedGenres, false);
      if (query) {
        setSearchParams({ q: query });
      } else {
        setSearchParams({});
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, selectedGenres, setSearchParams, fetchResults]);

  useEffect(() => {
    // Normal pagination for non-Sanka OR Sanka when not searching
    if ((!isSanka || !query) && page > 1) {
      fetchResults(page, query, selectedGenres, false);
    }
  }, [page, fetchResults, query, selectedGenres, isSanka]);

  const toggleGenre = (id: string) => {
    setSelectedGenres(prev => prev.includes(id) ? [] : [id]);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] font-sans selection:bg-[#EF4444] selection:text-black pb-32">
      <style>{`
        @keyframes shimmer { 0% { transform: translate3d(-100%, 0, 0) skewX(-20deg); } 100% { transform: translate3d(200%, 0, 0) skewX(-20deg); } }
      `}</style>
      <Navbar />

      <div className="pt-28 max-w-7xl mx-auto px-6">
        {/* Animated Search Bar */}
        <div className="relative mb-12">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <SearchIcon className="text-white/20" size={24} />
            </div>
            <input 
                type="text"
                placeholder={`Cari Anime di Server ${isSanka ? '2' : '1'}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-[32px] py-6 px-16 text-lg font-black text-white placeholder:text-white/10 focus:outline-none focus:border-[#EF4444]/50 focus:bg-white/[0.05] transition-all shadow-2xl"
            />
            {query && (
                <button 
                    onClick={() => setQuery('')}
                    className="absolute inset-y-0 right-6 flex items-center text-white/20 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>
            )}
        </div>

        {/* Filters and Genres */}
        {genres.length > 0 && (
          <div className="space-y-6 mb-12">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-[#EF4444] rounded-full"></div>
                      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Filter Genre</h2>
                  </div>
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${showFilters ? 'bg-[#EF4444] text-black border-transparent' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                  >
                      <SlidersHorizontal size={14} />
                      {showFilters ? 'Tutup' : 'Lainnya'}
                  </button>
              </div>

              <div className={`flex flex-wrap gap-2 transition-all duration-500 overflow-hidden ${showFilters ? 'max-h-[500px] opacity-100' : 'max-h-12 opacity-80'}`}>
                  {genres.map((g, i) => {
                      const gid = typeof g === 'string' ? g : (g.id || g.slug || i.toString());
                      const gname = typeof g === 'string' ? g : (g.name || g.title);
                      return (
                        <button 
                            key={gid} 
                            onClick={() => toggleGenre(gid)} 
                            className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border ${selectedGenres.includes(gid) ? 'bg-[#EF4444] text-black border-transparent shadow-[0_0_20px_rgba(246,207,128,0.2)] scale-105' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white hover:border-white/10'}`}
                        >
                            {gname}
                        </button>
                      );
                  })}
              </div>
          </div>
        )}
        
        {/* Results Info */}
        <div className="mb-10 flex items-end justify-between border-b border-white/5 pb-4">
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Hasil Pencarian</span>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    {query ? `"${query}"` : selectedGenres.length > 0 ? genres.find(g => g.id === selectedGenres[0])?.name : 'POPULAR ANIME'}
                </h3>
            </div>
            <span className="text-xs font-black text-[#EF4444] uppercase tracking-widest opacity-60">
                {results.length} Judul Ditemukan
            </span>
        </div>

        {/* Grid Results */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-5 gap-y-10">
          {isLoading ? (
             [...Array(18)].map((_, i) => <CardSkeleton key={`skeleton-${i}`} />)
          ) : (
            results.map((a, index) => (
                <AnimeCard 
                    key={`${a.id || a.slug || 'anime'}-${index}`} 
                    a={a} 
                    index={index} 
                    onClick={() => {
                        const idParam = a.isSanka ? a.slug : `${a.id}-${(a.title||'').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                        navigate(animeService.getAnimePath(a));
                    }} 
                />
            ))
          )}
          {isFetchingMore && (
            [...Array(6)].map((_, i) => <CardSkeleton key={`fetching-skeleton-${i}`} />)
          )}
        </div>
        
        {/* Empty State */}
        {!isLoading && results.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-64 h-64 md:w-80 md:h-80 relative mb-8">
              <img 
                src={getImageUrl("https://files.catbox.moe/bwznoo.png")} 
                onError={(e) => handleImageError(e, "https://files.catbox.moe/bwznoo.png")}
                alt="Not Found" 
                className="w-full h-full object-contain filter drop-shadow-[0_0_30px_rgba(246,207,128,0.1)]"
              />
            </div>
            <p className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white mb-2">Anime Tidak Ditemukan</p>
            <p className="max-w-md text-white/40 text-xs md:text-sm font-medium leading-relaxed">
              Duh, anime yang kamu cari nggak ada di database kami nih. Coba deh cari dengan kata kunci lain atau filter genre yang berbeda!
            </p>
            <button 
              onClick={() => { setQuery(''); setSelectedGenres([]); }}
              className="mt-8 px-8 py-3 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all active:scale-95"
            >
              Reset Pencarian
            </button>
          </motion.div>
        )}

        {/* Pagination Logic */}
        {results.length > 0 && (
          // Show pagination if:
          // 1. Not Server Sanka
          // OR
          // 2. Server Sanka BUT NOT searching (query is empty)
          (!isSanka || !query) ? (
            <Pagination page={page} setPage={setPage} hasMore={hasMore} />
          ) : null
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Search;
