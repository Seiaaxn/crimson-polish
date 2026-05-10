import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Loading from '../components/Loading';
import { getImageUrl, handleImageError } from '../lib/imageUtils';
import { Play, ChevronRight } from 'lucide-react';
import { comicService, ComicItem } from '../services/comicService';

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

const ComicHome = () => {
  const navigate = useNavigate();
  const [latest, setLatest] = useState<ComicItem[]>([]);
  const [popular, setPopular] = useState<ComicItem[]>([]);
  const [trending, setTrending] = useState<ComicItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [heroIndex, setHeroIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  
  const latestCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const popularCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  useEffect(() => {
    window.scrollTo(0, 0);
    
    let isMounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [lData, pData, tData] = await Promise.all([
          comicService.getLatest(),
          comicService.getPopular(),
          comicService.getTrending()
        ]);
        if (!isMounted) return;
        setLatest(lData);
        setPopular(pData);
        setTrending(tData);
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, []);

  const displaySlider = trending.length > 0 ? trending.slice(0, 5) : latest.slice(0, 5);
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
    latestCardRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    popularCardRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, [latest, popular, isLoading]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col font-sans mb-16 md:mb-0">
      <Navbar />
      
      <div className="flex-1 w-full max-w-[1920px] mx-auto pb-24">
        {/* HERO CAROUSEL */}
        <header className="relative w-full aspect-[16/10] md:aspect-video min-h-[300px] md:max-h-[550px] overflow-hidden bg-[#0a0a0c]">
          {isLoading ? <HeroSkeleton /> : (
            <div className={`flex h-full ${isTransitioning ? 'transition-transform duration-700' : ''}`} style={{ transform: `translate3d(-${heroIndex * 100}%, 0, 0)` }}>
              {carouselItems.map((a, i) => (
                <div key={i} className="min-w-full h-full relative">
                  <img 
                    src={getImageUrl(a.image)} 
                    onError={(e) => handleImageError(e, a.image)}
                    className="w-full h-full object-cover opacity-50 blur-sm" 
                    alt="" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c] via-transparent to-transparent opacity-80"></div>
                  
                  <div className="absolute bottom-0 left-0 right-0 px-4 md:px-12 pb-6 md:pb-12 flex items-end gap-4 flex-col md:flex-row md:items-end">
                    <div className="flex md:items-end gap-4 w-full cursor-pointer" onClick={() => navigate(`/comic/${a.slug}`)}>
                      <img 
                        src={getImageUrl(a.image)} 
                        onError={(e) => handleImageError(e, a.image)}
                        className="w-24 md:w-32 md:w-40 aspect-[3/4.2] object-cover border border-white/10 rounded-xl shadow-2xl shrink-0" 
                        alt="" 
                      />
                      <div className="flex flex-col text-left mb-1 md:mb-4 flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {a.type && <span className="px-2 py-0.5 bg-white/10 text-white/60 text-[8px] font-black rounded tracking-widest">{a.type}</span>}
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight line-clamp-2 uppercase">{a.title}</h2>
                        
                        <div className="flex items-center gap-4 mt-2">
                          <button 
                            className="bg-[#F6CF80] text-black px-4 md:px-6 py-2 rounded-xl flex items-center gap-2 font-black text-xs md:text-sm shadow-xl active:scale-95 transition-transform truncate"
                          >
                            <Play fill="black" size={14} className="shrink-0" />
                            <span className="truncate">BACA SEKARANG</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20 hidden md:flex">
             {displaySlider.map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    setIsTransitioning(true);
                    setHeroIndex(i);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${heroIndex === i || (heroIndex === displaySlider.length && i === 0) ? 'w-8 bg-[#F6CF80]' : 'w-2 bg-white/20 hover:bg-white/40'}`} 
                />
             ))}
          </div>
        </header>

        {/* LATEST COMICS */}
        <section className="px-4 md:px-12 mt-8 md:mt-12 overflow-hidden">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase relative pl-4 md:pl-6 leading-none">
              <span className="absolute left-0 top-0 bottom-0 w-1 md:w-2 bg-[#F6CF80] rounded-r-full"></span>
               Terbaru
            </h2>
          </div>

          <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar snap-x">
            {isLoading ? [...Array(8)].map((_, i) => <CardSkeleton key={i} />) : 
              latest.map((a, i) => (
                <div 
                  key={`${a.link || 'latest'}-${i}`} 
                  ref={el => { if (el) latestCardRefs.current[i] = el; }} 
                  onClick={() => navigate(`/comic/${a.slug}`)} 
                  className="min-w-[128px] w-[128px] group cursor-pointer snap-start transition-all duration-700 opacity-0 blur-xl translate-y-4 active:scale-95 flex flex-col"
                >
                  <div className="relative aspect-[3/4.5] overflow-hidden bg-white/5 rounded-xl shadow-lg mb-2">
                    <img 
                      src={getImageUrl(a.image)} 
                      onError={(e) => handleImageError(e, a.image)}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      alt="" 
                    />
                    <div className="absolute top-2 left-2 bg-[#F6CF80] text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg z-20">
                      {a.type || 'Comic'}
                    </div>
                  </div>
                  <h3 className="text-[11px] md:text-xs font-bold text-white line-clamp-2 uppercase group-hover:text-[#F6CF80] transition-colors">{a.title}</h3>
                  <div className="text-[9px] text-[#F6CF80] md:text-[10px] font-black uppercase mt-1">
                    {a.chapters}
                  </div>
                </div>
              ))
            }
          </div>
        </section>

        {/* POPULAR COMICS */}
        <section className="px-4 md:px-12 mt-8 overflow-hidden">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase relative pl-4 md:pl-6 leading-none">
              <span className="absolute left-0 top-0 bottom-0 w-1 md:w-2 bg-[#F6CF80] rounded-r-full"></span>
               Populer
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {isLoading ? [...Array(6)].map((_, i) => <CardSkeleton key={i} />) : 
              popular.slice(0, 12).map((a, i) => (
                <div 
                  key={`${a.link || 'pop'}-${i}`} 
                  ref={el => { if (el) popularCardRefs.current[i] = el; }} 
                  onClick={() => navigate(`/comic/${a.slug}`)} 
                  className="group cursor-pointer transition-all duration-700 opacity-0 blur-xl translate-y-4 active:scale-95 flex flex-col"
                >
                  <div className="relative aspect-[3/4.5] overflow-hidden bg-white/5 rounded-xl shadow-lg mb-2">
                    <img 
                      src={getImageUrl(a.image)} 
                      onError={(e) => handleImageError(e, a.image)}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      alt="" 
                    />
                  </div>
                  <h3 className="text-[11px] md:text-xs font-bold text-white line-clamp-2 uppercase group-hover:text-[#F6CF80] transition-colors">{a.title}</h3>
                </div>
              ))
            }
          </div>
        </section>

      </div>
      
      <Footer />
    </div>
  );
};

export default ComicHome;
