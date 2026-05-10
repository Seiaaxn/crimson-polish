import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Loading from '../components/Loading';
import { getImageUrl, handleImageError } from '../lib/imageUtils';

const Shimmer = () => <div className="absolute top-0 bottom-0 left-0 w-[150%] animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent z-10" style={{ transform: 'translate3d(-100%, 0, 0) skewX(-20deg)' }} />;

const CardSkeleton = () => (
  <div className="w-full flex flex-col gap-2 relative">
    <div className="aspect-[3/4.5] bg-[#16161a] rounded-xl relative overflow-hidden shadow-xl border border-white/5">
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
    const timer = setTimeout(() => setIsVisible(true), (index % 15) * 40);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div 
      id={`anime-card-${a.id}`}
      onClick={onClick} 
      className={`w-full flex flex-col gap-2 group cursor-pointer active:scale-95 transition-all duration-700 ease-out ${isVisible ? 'opacity-100 blur-none translate-y-0' : 'opacity-0 blur-xl translate-y-4'}`}
    >
      <div className="relative aspect-[3/4.5] w-full overflow-hidden bg-[#16161a] rounded-xl shadow-xl border border-white/5 group-hover:border-[#F6CF80]/30 transition-colors">
        {a?.isDevEntry && <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
                <img 
          src={getImageUrl(a.image_poster)} 
          onError={(e) => handleImageError(e, a.image_poster)}
          alt={a.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
           <span className="text-[10px] font-black text-[#F6CF80] uppercase tracking-wider bg-black/40 backdrop-blur-md px-2 py-1 rounded-md">
             Detail
           </span>
        </div>
      </div>
      <h3 className="text-[11px] md:text-xs font-black text-white/80 line-clamp-2 leading-snug group-hover:text-[#F6CF80] transition-colors">{a.title}</h3>
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
      <button 
        onClick={() => setPage(Math.max(1, page - 1))} 
        disabled={page === 1} 
        className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white/5 border border-white/10 text-white rounded-xl md:rounded-2xl disabled:opacity-20 hover:bg-[#F6CF80] hover:text-black hover:border-transparent transition-all active:scale-90"
      >
        <ChevronLeft size={18} />
      </button>
      
      {pages.map((p) => (
        <button 
          key={p} 
          onClick={() => setPage(p)}
          className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all shadow-xl active:scale-90 ${p === page ? 'bg-[#F6CF80] text-black shadow-[0_0_20px_rgba(246,207,128,0.3)]' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10'}`}
        >
          {p}
        </button>
      ))}

      <button 
        onClick={() => setPage(page + 1)} 
        disabled={!hasMore}
        className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white/5 border border-white/10 text-white rounded-xl md:rounded-2xl disabled:opacity-20 hover:bg-[#F6CF80] hover:text-black hover:border-transparent transition-all active:scale-90"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

import { animeService } from '../services/animeService';
import { useLocation } from 'react-router-dom';

const Ongoing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const searchSource = query.get('src') || 'sanka';

  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchData = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    try {
      // Sanka uses 1-based pagination, Main uses 0-based
      const res = await animeService.getOngoing(searchSource === 'sanka' ? pageNum : pageNum - 1);
      
      if (searchSource === 'sanka' && res.data) {
        setResults(res.data);
        setHasMore(res.pagination?.has_next_page || false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (Array.isArray(res)) {
        setResults(res);
        setHasMore(res.length >= 10);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [searchSource]);

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] font-sans selection:bg-[#F6CF80] selection:text-black pb-32">
      {isLoading && <Loading />}
      <style>{`
        @keyframes shimmer { 0% { transform: translate3d(-100%, 0, 0) skewX(-20deg); } 100% { transform: translate3d(200%, 0, 0) skewX(-20deg); } }
      `}</style>
      <Navbar />

      <div className="pt-24 max-w-7xl mx-auto px-6">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col">
            <h2 className="text-white font-black uppercase text-2xl md:text-3xl tracking-tighter">Anime Ongoing</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-[#F6CF80] animate-pulse"></div>
              <span className="text-[10px] md:text-xs text-white/50 font-black uppercase tracking-widest">Update Seketika</span>
            </div>
          </div>
          
          <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent hidden md:block mb-3 ml-4"></div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-8 mb-16">
          {isLoading ? (
            [...Array(12)].map((_, i) => <CardSkeleton key={`skeleton-${i}`} />)
          ) : (
            results.map((a, index) => (
              <AnimeCard 
                key={`${a.id || a.slug || 'ongoing'}-${index}`} 
                a={a} 
                index={index} 
                onClick={() => {
                  navigate(animeService.getAnimePath(a));
                }} 
              />
            ))
          )}
        </div>

        {results.length > 0 && <Pagination page={page} setPage={setPage} hasMore={hasMore} />}
        
        {!hasMore && !isLoading && results.length > 0 && (
          <div id="no-more-data" className="text-center text-white/20 text-[10px] font-black uppercase tracking-widest mt-12 py-8 border-t border-white/5">
            Sudah mencapai batas akhir
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Ongoing;
