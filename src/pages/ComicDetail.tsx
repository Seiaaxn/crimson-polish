import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Loading from '../components/Loading';
import { Play } from 'lucide-react';
import { getImageUrl, handleImageError } from '../lib/imageUtils';
import { comicService, ComicDetailData } from '../services/comicService';

const ComicDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [comic, setComic] = useState<ComicDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        if (slug) {
          const data = await comicService.getDetail(slug);
          setComic(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [slug]);

  if (isLoading) return <Loading />;
  if (!comic) return <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center pt-20"><div className="text-center"><h2 className="text-2xl font-black mb-2">Comic Tidak Ditemukan</h2></div></div>;

  const chapters = comic.chapter_list || [];
  const displayChapters = sortAsc ? [...chapters].reverse() : chapters;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans flex flex-col mb-16 md:mb-0">
      <Navbar />

      <div className="flex-1 w-full max-w-[1920px] mx-auto pb-24">
        {/* Cinematic Hero */}
        <section className="relative w-full h-[55vh] md:h-[70vh] overflow-hidden">
          <div className="absolute inset-0 z-0">
            {comic.image ? (
              <>
                <img 
                  src={getImageUrl(comic.image)} 
                  onError={(e) => handleImageError(e, comic.image)}
                  className="w-full h-full object-cover opacity-60 blur-sm" 
                  alt="" 
                />
              </>
            ) : (
              <div className="w-full h-full bg-[#1a1a20]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent"></div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 px-6 md:px-12 pb-8 flex items-end gap-6 md:gap-10 z-10 w-full max-w-7xl mx-auto">
            <div 
              onClick={() => {
                if (displayChapters.length > 0) {
                  const firstCh = sortAsc ? displayChapters[0] : displayChapters[displayChapters.length - 1];
                  // url could be the chapter slug
                  const chSlug = firstCh.url.split('/').pop() || firstCh.url;
                  navigate(`/comic-read/${chSlug}`);
                }
              }}
              className="relative w-28 md:w-48 lg:w-56 shrink-0 aspect-[3/4.2] rounded-xl overflow-hidden shadow-2xl border border-white/20 group cursor-pointer"
            >
              <img 
                src={getImageUrl(comic.image)} 
                onError={(e) => handleImageError(e, comic.image)}
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
                  <span className="bg-[#EF4444] text-black text-[9px] font-black px-3 py-1 rounded-md uppercase tracking-widest">{comic.type || 'COMIC'}</span>
                  <span className="bg-white/10 text-white/80 text-[9px] font-black px-3 py-1 rounded-md uppercase tracking-widest border border-white/5">{comic.status}</span>
               </div>
               <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter uppercase leading-[1.1] mb-2 drop-shadow-2xl">{comic.title}</h1>
               
               <div className="flex items-center gap-4 mb-4">
                  <p className="text-white/40 font-bold text-xs md:text-sm tracking-tight">{comic.author || 'Manga Author'}</p>
               </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="px-6 md:px-12 py-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
           <div className="flex-1 min-w-0 flex flex-col gap-8">
              <div>
                <h3 className="text-xl font-black mb-4 uppercase tracking-tighter text-[#EF4444]">Sinopsis</h3>
                <p className="text-white/70 text-sm md:text-base leading-relaxed font-medium">{comic.synopsis || "Belum ada sinopsis."}</p>
              </div>

              <div>
                <h3 className="text-xl font-black mb-4 uppercase tracking-tighter text-[#EF4444]">Genre</h3>
                <div className="flex flex-wrap gap-2">
                   {comic.genres.map((g: any, i) => (
                      <span key={i} className="bg-white/5 border border-white/10 text-white/80 text-xs font-black px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-[#EF4444] hover:text-black hover:border-transparent transition-colors cursor-pointer">{g.name || g}</span>
                   ))}
                </div>
              </div>

              {/* Chapter List */}
              <div className="bg-[#16161a] border border-white/5 rounded-3xl p-6 md:p-8 mt-4">
                 <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Daftar Chapter <span className="text-[#EF4444]">({chapters.length})</span></h3>
                    <button 
                      onClick={() => setSortAsc(!sortAsc)}
                      className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                    >
                      {sortAsc ? 'A-Z' : 'Z-A'}
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {displayChapters.map((ep, i) => {
                      const chSlug = ep.url.split('/').pop() || ep.url;
                      return (
                      <button 
                        key={i}
                        onClick={() => navigate(`/comic-read/${chSlug}`)}
                        className="flex items-center text-left bg-white/5 hover:bg-[#EF4444] border border-white/5 hover:border-transparent rounded-2xl p-4 transition-all group overflow-hidden relative"
                      >
                         <div className="relative z-10 flex-1 min-w-0 pr-4">
                            <span className="text-[10px] font-black text-white/40 group-hover:text-black/60 block mb-1 tracking-widest uppercase">{ep.date || 'New'}</span>
                            <span className="font-bold text-sm text-white group-hover:text-black truncate block">{ep.chapter}</span>
                         </div>
                         <div className="relative w-8 h-8 rounded-full bg-white/10 group-hover:bg-black/10 flex items-center justify-center shrink-0">
                            <Play fill="currentColor" size={12} className="text-white group-hover:text-black ml-0.5" />
                         </div>
                      </button>
                    )})}
                 </div>
              </div>
           </div>
        </section>

      </div>
      <Footer />
    </div>
  );
};

export default ComicDetail;
