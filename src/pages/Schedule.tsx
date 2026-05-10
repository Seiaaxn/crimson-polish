import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Loading from '../components/Loading';
import { getImageUrl, handleImageError } from '../lib/imageUtils';

import { animeService } from '../services/animeService';

const Shimmer = () => <div className="absolute top-0 bottom-0 left-0 w-[150%] animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent z-10" style={{ transform: 'translate3d(-100%, 0, 0) skewX(-20deg)' }} />;

const ScheduleSkeleton = () => (
  <div className="flex flex-col gap-6">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex items-stretch gap-4 md:gap-8 relative w-full group">
        <div className="w-12 md:w-20 shrink-0 py-6 flex flex-col items-end gap-2">
          <div className="w-10 h-3 bg-[#16161a] rounded-sm relative overflow-hidden"><Shimmer /></div>
        </div>
        <div className="relative flex flex-col items-center justify-start py-6 shrink-0 w-px bg-white/5">
          <div className="absolute top-8 w-3 h-3 bg-[#16161a] border-2 border-white/10 rounded-full z-10 -left-[6px]"></div>
        </div>
        <div className="flex-1 py-4 w-full">
          <div className="bg-[#16161a] border border-white/5 p-4 rounded-2xl flex gap-5 overflow-hidden relative shadow-lg">
            <Shimmer />
            <div className="w-20 md:w-32 aspect-[3/4.2] bg-white/5 rounded-xl shrink-0 z-10"></div>
            <div className="flex flex-col flex-1 gap-3 pt-2 z-10">
              <div className="w-24 h-4 bg-white/10 rounded-md"></div>
              <div className="w-full h-6 bg-white/10 rounded-md"></div>
              <div className="w-3/4 h-6 bg-white/10 rounded-md"></div>
              <div className="mt-auto flex gap-2">
                <div className="w-16 h-6 bg-white/5 rounded-full"></div>
                <div className="w-16 h-6 bg-white/5 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

interface ScheduleCardProps {
  a: any;
  onClick: () => void;
  index: number;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({ a, onClick, index }) => {
  const [data, setData] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Sanka uses status_or_day, main uses key_time
  const timeDisplay = a.isSanka ? (a.status || "--:--") : (a.key_time ? (a.key_time.includes(' ') ? a.key_time.split(' ')[1].substring(0, 5) : a.key_time) : "--:--");

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 50);
    return () => clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    // Only call detail if not Sanka or if Sanka data is very sparse
    if (a.isSanka) return;
    
    let mounted = true;
    animeService.getAnimeDetail(a.id)
      .then(d => {
        if (mounted && d) {
          setData(d);
        }
      }).catch(() => null);
    return () => { mounted = false; };
  }, [a.id, a.isSanka]);

  const lastEp = a.isSanka ? (a.episode || 'Release') : (data?.episode_list?.[0]?.index || '?');

  return (
    <div 
      id={`schedule-row-${a.id}`}
      className={`flex items-start gap-4 md:gap-8 relative w-full transition-all duration-700 ease-out ${isVisible ? 'opacity-100 blur-none translate-y-0' : 'opacity-0 blur-xl translate-y-8'}`}
    >
      {/* Time Label / Status */}
      <div className="w-12 md:w-16 shrink-0 flex justify-end pt-4">
        <span className="text-[#EF4444] font-black text-[10px] md:text-xs tracking-tighter text-right leading-tight">{timeDisplay}</span>
      </div>

      {/* Timeline Indicator */}
      <div className="relative flex flex-col items-center shrink-0 w-px self-stretch bg-white/5">
        <div className="absolute top-5 w-2.5 h-2.5 rounded-full bg-[#16161a] border-2 border-white/20 z-10 -left-[5px] group-hover:border-[#EF4444] transition-colors"></div>
      </div>

      {/* Card Content */}
      <div className="flex-1 pb-8 min-w-0 group">
        <div 
          onClick={onClick}
          className="bg-[#16161a] border border-white/5 rounded-2xl p-3 md:p-5 flex gap-4 md:gap-6 cursor-pointer hover:border-[#EF4444]/40 transition-all active:scale-[0.98] shadow-2xl overflow-hidden relative w-full"
        >
          {/* Poster */}
          <div className="w-20 md:w-28 aspect-[3/4.2] overflow-hidden rounded-xl shadow-xl shrink-0">
            {a?.isDevEntry && <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20 tracking-wider border border-white/10">ND</div>}
                <img 
              src={getImageUrl(a.image_poster)} 
              onError={(e) => handleImageError(e, a.image_poster)}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
              alt={a.title} 
            />
          </div>

          {/* Details */}
          <div className="flex flex-col flex-1 min-w-0 py-1">
            <div className="mb-3 flex gap-2 items-center">
              <div className="bg-[#EF4444] text-black text-[9px] md:text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-[0_4px_12px_rgba(246,207,128,0.2)]">
                {a.isSanka ? 'Server 2' : 'Utama'}: {lastEp}
              </div>
              {a.type && <span className="text-[8px] font-black bg-white/5 text-white/40 px-2 py-0.5 rounded uppercase">{a.type}</span>}
            </div>

            <h3 className="font-black text-sm md:text-xl text-white mb-4 line-clamp-2 leading-tight group-hover:text-[#EF4444] transition-colors break-words">
              {a.title}
            </h3>

            <div className="flex flex-col gap-2 min-w-0">
              <div className="flex items-center text-[10px] md:text-xs min-w-0 w-full">
                <span className="w-16 md:w-24 shrink-0 font-black text-white/30 uppercase tracking-[0.1em]">Genre</span>
                <div className="flex-1 text-white/70 font-semibold truncate pr-4">{a.isSanka ? (a.genre || '-') : (data?.genres ? data.genres.map(g => g.title).join(', ') : (a.genre || '-'))}</div>
              </div>
              <div className="flex items-center text-[10px] md:text-xs min-w-0 w-full">
                <span className="w-16 md:w-24 shrink-0 font-black text-white/30 uppercase tracking-[0.1em]">Aired</span>
                <div className="flex-1 text-white/70 font-semibold truncate pr-4">{a.isSanka ? (a.status_or_day || '-') : (data?.aired || (a.aired_start || '-'))}</div>
              </div>
              <div className="flex items-start text-[10px] md:text-xs min-w-0 w-full">
                <span className="w-16 md:w-24 shrink-0 font-black text-white/30 uppercase tracking-[0.1em]">Info</span>
                <span className="flex-1 text-[#EF4444] font-black italic tracking-widest text-[11px] md:text-[13px] uppercase">{a.isSanka ? 'Update Baru' : 'New !!'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Schedule = () => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const dayNamesShort = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const dayKeys = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
  
  const [weekDates, setWeekDates] = useState([]);
  const [selectedDay, setSelectedDay] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    const today = new Date();
    const currentDayIndex = today.getDay();
    
    const dates = dayNamesShort.map((name, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - currentDayIndex + i);
      return {
        name,
        fullName: dayNames[i],
        date: d.getDate(),
        key: dayKeys[i],
        isToday: i === currentDayIndex
      };
    });
    
    setWeekDates(dates);
    setSelectedDay(dayKeys[currentDayIndex]);
  }, []);

  useEffect(() => {
    if (selectedDay) {
      fetchSchedule();
    }
  }, [selectedDay]);

  const fetchSchedule = async () => {
    setIsLoading(true);
    try {
      const data = await animeService.getSchedule(selectedDay);
      setSchedule(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getAnimeList = () => schedule[selectedDay] || [];

  return (
    <div className="min-h-screen bg-[#0a0a0c] font-sans selection:bg-[#EF4444] selection:text-black pb-32">
      {isLoading && <Loading />}
      <style>{`
        @keyframes shimmer { 0% { transform: translate3d(-100%, 0, 0) skewX(-20deg); } 100% { transform: translate3d(200%, 0, 0) skewX(-20deg); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      <Navbar />

      <div className="pt-28 max-w-4xl mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-12">
            <h2 className="text-white font-black text-3xl md:text-5xl uppercase tracking-tighter mb-2 italic">Jadwal Tayang</h2>
            <p className="text-white/40 text-[10px] md:text-xs font-black uppercase tracking-[0.3em]">Jangan Lewatkan Episode Terbaru</p>
        </div>
        
        {/* Day Picker */}
        <div className="bg-[#16161a]/60 backdrop-blur-xl rounded-[28px] border border-white/5 p-2 mb-12 shadow-2xl sticky top-20 z-30">
          <div className="flex justify-between items-center px-1">
            {weekDates.map(w => (
              <button 
                key={w.key} 
                onClick={() => setSelectedDay(w.key)} 
                className="flex flex-col items-center gap-2 cursor-pointer outline-none relative group h-20 md:h-24 justify-center flex-1 rounded-2xl group transition-all"
              >
                <span className={`text-[9px] md:text-[10px] font-black transition-colors z-10 ${selectedDay === w.key ? 'text-black' : 'text-white/30 group-hover:text-white/60'}`}>{w.name}</span>
                <span className={`text-base md:text-xl font-black transition-all z-10 ${selectedDay === w.key ? 'text-black scale-110' : 'text-white/80'}`}>{w.date}</span>
                
                {selectedDay === w.key && (
                  <div id={`selected-day-${w.key}`} className="absolute inset-x-1 inset-y-1 bg-[#EF4444] rounded-[20px] shadow-[0_8px_20px_rgba(246,207,128,0.4)] transition-all duration-500 ease-out z-0"></div>
                )}
                
                {w.isToday && selectedDay !== w.key && (
                   <div className="absolute bottom-2 w-1.5 h-1.5 bg-[#EF4444] rounded-full shadow-[0_0_8px_rgba(246,207,128,0.8)]"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Anime List Feed */}
        <div className="flex flex-col mb-10">
           <div className="flex items-center gap-4 mb-8">
             <span className="text-lg md:text-2xl font-black text-white italic tracking-tight">{weekDates.find(w => w.key === selectedDay)?.fullName}</span>
             <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
           </div>

          {isLoading ? <ScheduleSkeleton /> : (
            getAnimeList().length > 0 ? getAnimeList().map((a, index) => (
              <ScheduleCard 
                key={`${a.id || a.slug || 'item'}-${index}`} 
                a={a} 
                index={index}
                onClick={() => {
                  navigate(animeService.getAnimePath(a));
                }} 
              />
            )) : (
              <div className="py-32 flex flex-col items-center justify-center text-center bg-[#16161a]/30 rounded-[32px] border border-dashed border-white/5">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/5">
                  <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] italic">Belum Ada Jadwal Tayang</p>
                <p className="text-white/20 text-[9px] mt-2">Cek kembali nanti untuk pembaruan</p>
              </div>
            )
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Schedule;
