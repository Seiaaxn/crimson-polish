import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Pause, Settings, ArrowLeft } from 'lucide-react';
import { getImageUrl, handleImageError } from '../lib/imageUtils';
import { comicService, ComicChapterData } from '../services/comicService';
import Loading from '../components/Loading';

const ComicRead = () => {
  const { chapterSlug } = useParams();
  const navigate = useNavigate();
  const [chapterData, setChapterData] = useState<ComicChapterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Auto-scroll state
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1); // 1 = normal, 1.5, 2.0, 2.5
  const scrollRef = useRef<number>();
  
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchChapter = async () => {
      setIsLoading(true);
      try {
        if (chapterSlug) {
          const data = await comicService.getChapter(chapterSlug);
          setChapterData(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChapter();
  }, [chapterSlug]);

  useEffect(() => {
    let lastTime = performance.now();
    
    const scrollStep = (time: number) => {
      if (isAutoScrolling) {
        const delta = time - lastTime;
        // Base pixels per second
        const basePixelsPerSecond = 50; 
        const pixelsToScroll = (basePixelsPerSecond * scrollSpeed * delta) / 1000;
        
        window.scrollBy(0, pixelsToScroll);
        
        // Check if reached bottom
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 5) {
          setIsAutoScrolling(false);
        }
      }
      lastTime = time;
      scrollRef.current = requestAnimationFrame(scrollStep);
    };

    if (isAutoScrolling) {
      scrollRef.current = requestAnimationFrame(scrollStep);
    } else if (scrollRef.current) {
      cancelAnimationFrame(scrollRef.current);
    }

    return () => {
      if (scrollRef.current) cancelAnimationFrame(scrollRef.current);
    };
  }, [isAutoScrolling, scrollSpeed]);

  // Hide controls on manual scroll
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleScroll = () => {
      if (!isAutoScrolling) {
        setShowControls(true);
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          if (window.scrollY > 100) {
            setShowControls(false);
          }
        }, 3000);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isAutoScrolling]);

  const toggleAutoScroll = () => setIsAutoScrolling(!isAutoScrolling);
  const cycleSpeed = () => {
    const speeds = [1, 1.5, 2.0, 2.5];
    const idx = speeds.indexOf(scrollSpeed);
    setScrollSpeed(speeds[(idx + 1) % speeds.length]);
  };

  if (isLoading) return <Loading />;
  if (!chapterData) return <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center pt-20"><div className="text-center"><h2 className="text-2xl font-black mb-2">Chapter Tidak Ditemukan</h2></div></div>;

  const getSlugFromUrl = (url: string) => {
    if(!url) return null;
    return url.split('/').filter(Boolean).pop();
  };

  const prevSlug = getSlugFromUrl(chapterData.navigation.previousChapter || "");
  const nextSlug = getSlugFromUrl(chapterData.navigation.nextChapter || "");

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans relative">
      {/* Top Bar Navigation */}
      <div 
        className={`fixed top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#0a0a0c] to-transparent z-50 flex items-center px-4 md:px-8 transition-transform duration-300 ${showControls || isAutoScrolling ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-[#EF4444] hover:text-black transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0 ml-4">
           <h1 className="text-sm md:text-base font-black truncate">{chapterData.manga_title}</h1>
           <span className="text-[10px] md:text-xs text-white/60 uppercase tracking-widest">{chapterData.chapter_title}</span>
        </div>
      </div>

      {/* Comic Images */}
      <div 
        className="max-w-3xl mx-auto w-full flex flex-col items-center min-h-screen"
        onClick={() => setShowControls(prev => !prev)}
      >
        {chapterData.images.map((src, idx) => (
           <img 
             key={idx}
             src={getImageUrl(src)}
             onError={(e) => handleImageError(e, src)}
             className="w-full h-auto object-contain block m-0 p-0"
             loading="lazy"
             alt={`Page ${idx + 1}`}
           />
        ))}
      </div>

      {/* Empty space at bottom to allow scrolling past last image */}
      <div className="h-[20vh]"></div>

      {/* Bottom Controls */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent pt-12 pb-6 px-4 z-50 transition-transform duration-300 ${showControls ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
           
           {/* Chapter Nav (Prev / Next) */}
           <div className="flex items-center gap-4 w-full md:w-auto justify-center">
              <button 
                onClick={() => prevSlug && navigate(`/comic-read/${prevSlug}`)}
                disabled={!prevSlug}
                className="flex items-center gap-2 bg-white/10 hover:bg-[#EF4444] hover:text-black border border-white/10 px-4 py-3 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft size={20} />
                <span className="text-xs font-black uppercase tracking-widest">Prev</span>
              </button>
              
              <button 
                onClick={() => nextSlug && navigate(`/comic-read/${nextSlug}`)}
                disabled={!nextSlug}
                className="flex items-center gap-2 bg-[#EF4444] text-black border border-transparent px-6 py-3 rounded-xl disabled:opacity-30 disabled:pointer-events-none hover:bg-white transition-colors"
              >
                <span className="text-xs font-black uppercase tracking-widest">Next</span>
                <ChevronRight size={20} />
              </button>
           </div>

           {/* Auto Scroll Controls */}
           <div className="flex items-center gap-2 bg-[#16161a] border border-white/10 rounded-2xl p-2 w-full md:w-auto justify-center">
              <button
                onClick={toggleAutoScroll}
                className={`w-12 h-10 rounded-xl flex items-center justify-center transition-colors ${isAutoScrolling ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}
              >
                {isAutoScrolling ? <Pause fill="currentColor" size={18} /> : <Play fill="currentColor" size={18} />}
              </button>
              
              <button
                onClick={cycleSpeed}
                className="px-4 h-10 rounded-xl bg-white/10 hover:bg-white/20 font-black text-xs tracking-widest transition-colors flex items-center gap-2"
              >
                <Settings size={14} />
                {scrollSpeed}x
              </button>
           </div>

        </div>
      </div>
    </div>
  );
};

export default ComicRead;
