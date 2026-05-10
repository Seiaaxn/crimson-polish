import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Grid } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Loading from '../components/Loading';
import { getImageUrl, handleImageError } from '../lib/imageUtils';
import { animeService } from '../services/animeService';

const Shimmer = () => <div className="absolute top-0 bottom-0 left-0 w-[150%] animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent z-10" style={{ transform: 'translate3d(-100%, 0, 0) skewX(-20deg)' }} />;

const CardSkeleton = () => (
  <div className="w-full flex flex-col gap-2 relative">
    <div className="aspect-[16/10] bg-[#16161a] rounded-2xl relative overflow-hidden shadow-xl border border-white/5">
      <Shimmer />
    </div>
    <div className="w-3/4 h-3 bg-[#16161a] rounded-sm relative overflow-hidden">
      <Shimmer />
    </div>
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
    const timer = setTimeout(() => setIsVisible(true), (index % 12) * 50);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div 
      onClick={onClick} 
      className={`group cursor-pointer transition-all duration-700 active:scale-95 ${isVisible ? 'opacity-100 blur-none translate-y-0' : 'opacity-0 blur-xl translate-y-4'}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#16161a] rounded-2xl shadow-lg border border-white/5 mb-3">
        {a?.isDevEntry && <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
                <img 
          src={getImageUrl(a.image_poster)} 
          onError={(e) => handleImageError(e, a.image_poster)}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
        <div className="absolute bottom-3 left-3 flex flex-col">
          <span className="text-[10px] font-black text-[#F6CF80] uppercase tracking-widest">{a.episode || a.type}</span>
        </div>
      </div>
      <h3 className="text-sm font-black text-white/90 line-clamp-1 group-hover:text-[#F6CF80] transition-colors uppercase tracking-tight">{a.title}</h3>
      <p className="text-[10px] text-white/40 font-bold uppercase mt-1 tracking-widest">{a.status_or_day || 'Server 2'}</p>
    </div>
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
    <div className="flex justify-center items-center gap-3 mt-12 mb-8 flex-wrap">
      <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 text-white rounded-xl disabled:opacity-20 hover:bg-[#F6CF80] hover:text-black transition-all active:scale-90"><ChevronLeft size={18} /></button>
      {pages.map((p) => (
        <button key={p} onClick={() => setPage(p)} className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-xs transition-all shadow-xl active:scale-90 ${p === page ? 'bg-[#F6CF80] text-black shadow-[0_0_20px_rgba(246,207,128,0.3)]' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10'}`}>{p}</button>
      ))}
      <button onClick={() => setPage(page + 1)} disabled={!hasMore} className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 text-white rounded-xl disabled:opacity-20 hover:bg-[#F6CF80] hover:text-black transition-all active:scale-90"><ChevronRight size={18} /></button>
    </div>
  );
};

const Browse = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchData = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    try {
      const res = await animeService.getHomeCategory(pageNum);
      if (res.data) {
        setResults(res.data);
        setHasMore(res.pagination?.hasNext || false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] font-sans selection:bg-[#F6CF80] selection:text-black pb-32 text-white">
      {isLoading && <Loading />}
      <Navbar />

      <div className="pt-24 max-w-7xl mx-auto px-6">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col">
            <h2 className="text-white font-black uppercase text-2xl md:text-3xl tracking-tighter">Home Collection</h2>
            <div className="flex items-center gap-2 mt-1">
              <Grid size={12} className="text-[#F6CF80]" />
              <span className="text-[10px] md:text-xs text-white/50 font-black uppercase tracking-widest">Kurasi Terbaik Hari Ini</span>
            </div>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent hidden md:block mb-3 ml-4"></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-16">
          {isLoading ? (
            [...Array(12)].map((_, i) => <CardSkeleton key={`skeleton-${i}`} />)
          ) : (
            results.map((a, index) => (
              <AnimeCard 
                key={`${a.id || a.slug || 'item'}-${index}`} 
                a={a} 
                index={index} 
                onClick={() => navigate(animeService.getAnimePath(a))} 
              />
            ))
          )}
        </div>

        {results.length > 0 && <Pagination page={page} setPage={setPage} hasMore={hasMore} />}
      </div>

      <Footer />
    </div>
  );
};

export default Browse;
