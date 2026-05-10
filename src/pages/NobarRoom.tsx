import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, Play, Pause, RotateCcw, RotateCw, MessageSquare, 
  Send, X, ChevronLeft, Info, Copy, Share2, Star, LayoutGrid, Layout, Maximize2, Settings2, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { auth } from '../lib/firebase';
import { roomService, RoomState, ChatMessage } from '../services/roomService';
import { animeService } from '../services/animeService';
import { userService, UserProfile } from '../services/userService';
import { getImageUrl, handleImageError } from '../lib/imageUtils';

const NobarRoom = () => {
  const { slug, episode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const roomIdFromUrl = searchParams.get('room');

  const [activeRoom, setActiveRoom] = useState<RoomState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [anime, setAnime] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showGuestControls, setShowGuestControls] = useState(true);
  const [activeRooms, setActiveRooms] = useState<RoomState[]>([]);
  const isLeaving = useRef(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getProxyUrl = (url: string) => url ? `https://cf.elainaa.workers.dev/${url}` : null;

  // Get Profile
  useEffect(() => {
    userService.getProfile().then(setProfile);
  }, []);

  // Navigation Guard for Navbar
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Catch clicks on anything that might trigger navigation (links, buttons, or elements with onClick behavior)
      const trigger = target.closest('a, button, [role="button"]');
      
      if (trigger) {
        const href = trigger.getAttribute('href');
        const isInternal = href && (href.startsWith('/') || href.startsWith(window.location.origin) || !href.includes('://'));
        const isExitBtn = trigger.classList.contains('exit-nobar-btn') || trigger.textContent?.toLowerCase().includes('keluar');
        const isRoomMenu = href?.includes('/nobar/') && (href?.includes('stay=true') || !href?.includes('/anime/'));
        const isPlayerControl = trigger.closest('.player-controls');

        // If it's a navigation attempt that isn't explicitly allowed in Nobar Mode
        if (!isExitBtn && !isRoomMenu && !isPlayerControl) {
          const isNavbarFooter = trigger.closest('nav') || trigger.closest('footer');
          const isLink = trigger.tagName === 'A';
          const isNavButton = trigger.tagName === 'BUTTON' && isNavbarFooter;

          if (isNavbarFooter || isLink) {
             // Block access to home, search, profile, etc.
             e.preventDefault();
             e.stopPropagation();
             
             Swal.fire({
               title: 'NoBar Sedang Aktif!',
               text: 'Kamu harus keluar dari sesi nonton bareng sebelum berpindah halaman. Lanjut keluar?',
               icon: 'warning',
               showCancelButton: true,
               confirmButtonText: 'Ya, Keluar',
               cancelButtonText: 'Batal',
               background: '#16161a',
               color: '#fff',
               confirmButtonColor: '#F6CF80',
               cancelButtonColor: 'rgba(255,255,255,0.1)'
             }).then((result) => {
               if (result.isConfirmed) {
                 handleLeave().then(() => {
                   if (href) navigate(href);
                   else if (trigger.tagName === 'BUTTON') {
                     // If it was a button without href, we might need other logic
                     // but usually navbar buttons are <a> or have paths
                   }
                 });
               }
             });
          }
        }
      }
    };

    // Beforeunload for refresh/tab close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('click', handleGlobalClick, true);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomIdFromUrl, slug, isHost]);

  // Sync with Room
  useEffect(() => {
    if (roomIdFromUrl) {
      const unsubscribe = roomService.subscribeToRoom(roomIdFromUrl, (room) => {
        setActiveRoom(room);
        const hostStatus = room.hostId === auth.currentUser?.uid;
        setIsHost(hostStatus);
        
        if (room.currentPath && !hostStatus && !isLeaving.current) {
           const normalizePath = (p: string) => p.replace(/\/$/, '').toLowerCase();
           const currentFullPath = normalizePath(window.location.pathname + window.location.search);
           const targetPath = normalizePath(room.currentPath);
           
           if (targetPath && targetPath !== currentFullPath && !window.location.search.includes('stay=true')) {
              navigate(room.currentPath);
           }
        }
      });
      
      const unsubscribeChat = roomService.subscribeToMessages(roomIdFromUrl, (msgs) => {
        setMessages(msgs);
      });

      return () => {
        unsubscribe();
        unsubscribeChat();
      };
    }
  }, [roomIdFromUrl, navigate]); 

  // Fetch Anime Data
  useEffect(() => {
    if (slug && episode) {
      const fetchAnime = async () => {
        setIsLoading(true);
        try {
          // Detect if we should use sanka server logic either from search param or by trying it
          const isSanka = (profile?.settings?.apiServer || 'sanka') === 'sanka' || searchParams.get('src') === 'sanka' || (slug && slug.includes('sanka'));
          
          const id = (isSanka || searchParams.get('src') === 'sanka') ? (slug || '') : (slug?.split('-')[0] || '');
          const detailData = await animeService.getAnimeDetail(id);
          if (detailData) {
            setAnime(detailData);
            const eps = detailData.episode_list || detailData.episodes || [];
            setEpisodes(eps);
            
            const targetEp = eps.find((e: any) => e.index.toString() === episode);
            if (targetEp) {
               const epData = await animeService.getEpisode(targetEp.id);
               if (epData && epData.server) {
                  // Standardize server selection
                  let validServers = (epData.server || []).filter((s: any) => s.link);
                  
                  // For sanka, we usually have direct links (mp4/m3u8) or iframes
                  const uniqueServers = Array.from(new Map(validServers.map((s: any) => [s.quality || s.name, s])).values());
                  setServers(uniqueServers);
                  if (uniqueServers.length > 0) {
                     setSelectedServer(uniqueServers.find((s: any) => s.quality === '720p' || s.quality === 'Normal') || uniqueServers[0]);
                  }
               }
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchAnime();
    }
  }, [slug, episode]);

   // Recommendations
  useEffect(() => {
    if (isHost && anime) {
      const fetchRecommendations = async () => {
         try {
           const recRes = await animeService.getPopular(Math.floor(Math.random() * 5) + 1);
           const isSankaPreference = (profile?.settings?.apiServer || 'sanka') === 'sanka';
           const data = (isSankaPreference && recRes?.data) ? recRes.data : recRes;
           if (Array.isArray(data)) {
             setRecommendations(data.slice(0, 10));
           }
         } catch (e) {}
      };
      fetchRecommendations();
    }
  }, [isHost, anime, profile]);

  // Sync Video
  useEffect(() => {
    if (activeRoom && videoRef.current && !isHost) {
      const roomPlay = activeRoom.playbackState.isPlaying;
      const roomTime = activeRoom.playbackState.currentTime;

      if (roomPlay !== isPlaying) {
        if (roomPlay) videoRef.current.play().catch(() => setIsPlaying(false));
        else videoRef.current.pause();
        setIsPlaying(roomPlay);
      }

      const diff = Math.abs(videoRef.current.currentTime - roomTime);
      if (diff > 5) videoRef.current.currentTime = roomTime;
    }
  }, [activeRoom?.playbackState.isPlaying, activeRoom?.playbackState.currentTime, isHost]);

  useEffect(() => {
    if (isHost && roomIdFromUrl && videoRef.current) {
      const interval = setInterval(() => {
        if (videoRef.current && roomIdFromUrl) {
          roomService.updatePlayback(roomIdFromUrl, isPlaying, videoRef.current.currentTime);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isHost, roomIdFromUrl, isPlaying]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (showGuestControls && !isHost) {
      const timer = setTimeout(() => setShowGuestControls(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showGuestControls, isHost]);

  useEffect(() => {
    const unsubscribeActive = roomService.subscribeToActiveRooms((rooms) => {
      setActiveRooms(rooms);
    });
    return () => unsubscribeActive();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() || !roomIdFromUrl) return;
    await roomService.sendMessage(roomIdFromUrl, chatText.trim());
    setChatText('');
  };

  const togglePlay = () => {
    if (!isHost || !videoRef.current) return;
    const nextPlay = videoRef.current.paused;
    if (nextPlay) videoRef.current.play();
    else videoRef.current.pause();
    setIsPlaying(nextPlay);
    if (roomIdFromUrl) roomService.updatePlayback(roomIdFromUrl, nextPlay, videoRef.current.currentTime);
  };

  const skipTime = (amount: number) => {
    if (!isHost || !videoRef.current) return;
    videoRef.current.currentTime += amount;
    if (roomIdFromUrl) roomService.updatePlayback(roomIdFromUrl, isPlaying, videoRef.current.currentTime);
  };

  const changeSpeed = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const manualSync = () => {
    if (videoRef.current && activeRoom) {
      videoRef.current.currentTime = activeRoom.playbackState.currentTime;
      if (activeRoom.playbackState.isPlaying) {
        videoRef.current.play().catch(e => console.error(e));
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleFullScreen = async () => {
    if (containerRef.current) {
      try {
        if (!document.fullscreenElement) {
          await containerRef.current.requestFullscreen();
          // Lock orientation to landscape on mobile if possible
          const orientation = window.screen?.orientation as any;
          if (orientation?.lock) {
            await orientation.lock('landscape').catch(() => {});
          }
        } else {
          if (window.screen?.orientation?.unlock) {
            window.screen.orientation.unlock();
          }
          await document.exitFullscreen();
        }
      } catch (err) {
        console.error("Fullscreen error:", err);
      }
    }
  };

  const handleLeave = async () => {
    const result = await Swal.fire({
      title: 'Keluar Nobar?',
      text: isHost ? 'Sebagai HOST, Room akan ditutup untuk semua orang!' : 'Kamu akan meninggalkan sesi nonton bareng ini.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal',
      background: '#16161a',
      color: '#fff',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: 'rgba(255,255,255,0.1)'
    });

    if (result.isConfirmed && roomIdFromUrl) {
      isLeaving.current = true;
      await roomService.leaveRoom(roomIdFromUrl);
      navigate('/nobar');
    }
  };

  if (isLoading) return <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center shrink-0">
    <div className="flex flex-col items-center gap-6">
      <div className="w-16 h-16 border-4 border-[#F6CF80]/20 border-t-[#F6CF80] rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Menyiapkan Streaming...</p>
    </div>
  </div>;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      <Helmet>
        <title>{activeRoom?.animeTitle ? `${activeRoom.animeTitle} - Episode ${episode} | ChisaStream` : 'ChisaStream - Nobar Anime'}</title>
        <meta property="og:title" content={activeRoom ? `Nobar ${activeRoom.animeTitle} - ChisaStream` : 'ChisaStream - Nobar Anime'} />
        <meta property="og:description" content={activeRoom ? `Ayo nonton ${activeRoom.animeTitle} bareng ${activeRoom.hostName} di ChisaStream!` : 'Nonton anime bareng teman secara real-time!'} />
        {activeRoom?.animeImage && (
          <meta property="og:image" content={activeRoom.animeImage} />
        )}
      </Helmet>
      <Navbar />

      <main className="pt-24 pb-32 px-4 md:px-8 max-w-[1600px] mx-auto">
         <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-[#16161a] p-4 px-6 rounded-3xl border border-white/5 shadow-2xl relative z-10">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 bg-[#F6CF80] text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(246,207,128,0.2)]">
                  <Users size={14} /> {activeRoom?.members.length || 0} NOBAR AKTIF
               </div>
               <div className="hidden md:flex items-center gap-3">
                  <div className="w-0.5 h-6 bg-white/10" />
                  <div>
                    <h1 className="font-black text-xs uppercase tracking-widest line-clamp-1">{anime?.title || activeRoom?.animeTitle}</h1>
                    <p className="text-[9px] text-white/40 font-black uppercase tracking-widest mt-0.5">Episode {episode}</p>
                  </div>
               </div>
            </div>
            
            <div className="flex items-center gap-3">
               <button 
                 onClick={() => navigate(`/nobar/${roomIdFromUrl}?stay=true`)}
                 className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-5 py-3 rounded-xl border border-white/5 transition-all text-white/40 uppercase text-[10px] font-black tracking-widest"
               >
                  <Layout size={16} /> Room Menu
               </button>
               <button 
                 onClick={handleLeave}
                 className="exit-nobar-btn flex items-center gap-2 bg-white/5 hover:bg-red-500/10 hover:text-red-500 px-5 py-3 rounded-xl border border-white/5 transition-all text-white/40 uppercase text-[10px] font-black tracking-widest"
               >
                  <X size={16} /> Keluar
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-16">
            <div className="lg:col-span-3 space-y-6">
               <div 
                  ref={containerRef} 
                  onClick={() => !isHost && setShowGuestControls(prev => !prev)}
                  className="relative aspect-video bg-black rounded-[2.5rem] overflow-hidden border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.5)] group cursor-pointer"
               >
                  <video 
                     ref={videoRef}
                     src={getProxyUrl(selectedServer?.link) || undefined} 
                     className="w-full h-full object-contain"
                     onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                     onDurationChange={(e) => setDuration(e.currentTarget.duration)}
                     playsInline
                  />

                  {/* Fullscreen Button for Guest (Visible on hover or tap) */}
                  {!isHost && (
                     <div 
                        className={`absolute inset-0 pointer-events-none transition-all duration-300 z-40 ${showGuestControls ? 'bg-gradient-to-t from-black/60 via-transparent to-transparent' : ''}`}
                     >
                        <div className={`absolute bottom-6 right-6 pointer-events-auto transition-opacity duration-300 player-controls ${showGuestControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                           <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFullScreen();
                              }}
                              className="w-14 h-14 bg-[#F6CF80] text-black rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl"
                              title="Layar Penuh"
                           >
                              <Maximize2 size={28} />
                           </button>
                        </div>
                     </div>
                  )}

                  {!isHost && !isPlaying && (
                     <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30">
                        <button onClick={manualSync} className="flex flex-col items-center gap-6 group">
                           <div className="w-24 h-24 bg-[#F6CF80] text-black rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                              <Play size={40} fill="black" className="ml-1" />
                           </div>
                           <p className="font-black text-[10px] uppercase tracking-[0.3em] text-[#F6CF80] animate-pulse">Klik Untuk Gabung Nobar</p>
                        </button>
                     </div>
                  )}

                  {isHost && (
                     <div className={`player-controls absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60 transition-opacity duration-300 flex flex-col justify-between p-10 ${!isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                              <h3 className="font-black text-[10px] tracking-[0.2em] text-[#F6CF80] uppercase">Host Control Panel</h3>
                           </div>
                           <div className="flex items-center gap-4 relative">
                              <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="flex items-center gap-2 hover:text-[#F6CF80] transition-colors">
                                <Zap size={16} /> <span className="font-mono text-[10px] font-black">{playbackSpeed}x</span>
                              </button>
                              <AnimatePresence>
                                {showSpeedMenu && (
                                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-8 right-12 bg-black/80 backdrop-blur-xl border border-white/10 p-2 rounded-xl z-50 min-w-[80px]">
                                    {[0.5, 1, 1.5, 2].map(s => (
                                      <button key={s} onClick={() => changeSpeed(s)} className={`w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-black transition-colors ${playbackSpeed === s ? 'text-[#F6CF80]' : 'text-white/40 hover:text-white'}`}>
                                        {s}x
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              <button onClick={toggleFullScreen} className="hover:text-[#F6CF80]"><Maximize2 size={18} /></button>
                           </div>
                        </div>

                        <div className="flex flex-col gap-8">
                           <div className="flex items-center justify-center gap-12">
                              <button onClick={() => skipTime(-10)} className="text-white/60 hover:text-[#F6CF80] transition-colors"><RotateCcw size={36} /></button>
                              <button onClick={togglePlay} className="w-24 h-24 bg-[#F6CF80] text-black rounded-[32px] flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl">
                                 {isPlaying ? <Pause size={44} fill="black" /> : <Play size={44} fill="black" className="ml-1" />}
                              </button>
                              <button onClick={() => skipTime(10)} className="text-white/60 hover:text-[#F6CF80] transition-colors"><RotateCw size={36} /></button>
                           </div>
                           <div className="p-1 px-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 flex items-center gap-4">
                              <span className="text-[10px] font-black font-mono text-white/40 w-12">{Math.floor(currentTime/60)}:{Math.floor(currentTime%60).toString().padStart(2,'0')}</span>
                              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer relative" onClick={(e) => {
                                 const rect = e.currentTarget.getBoundingClientRect();
                                 const pos = (e.clientX - rect.left) / rect.width;
                                 if (videoRef.current) videoRef.current.currentTime = pos * duration;
                                 if (roomIdFromUrl) roomService.updatePlayback(roomIdFromUrl, isPlaying, videoRef.current!.currentTime);
                              }}>
                                 <div className="absolute top-0 left-0 h-full bg-[#F6CF80]" style={{ width: `${(currentTime/duration)*100}%` }}></div>
                              </div>
                              <span className="text-[10px] font-black font-mono text-white/40 w-12">{Math.floor(duration/60)}:{Math.floor(duration%60).toString().padStart(2,'0')}</span>
                           </div>
                        </div>
                     </div>
                  )}
               </div>

               {isHost && (
                  <div className="bg-[#16161a] p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                     <div className="relative z-10 space-y-6">
                        <div className="flex items-center justify-between">
                           <h3 className="font-black text-xs uppercase tracking-widest text-[#F6CF80]">EPISODE LAINNYA</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           {episodes.map((ep: any) => (
                              <button 
                                key={ep.id}
                                onClick={async () => {
                                  const newPath = `/nobar/${slug}/${ep.index}?room=${roomIdFromUrl}`;
                                  await roomService.startWatching(roomIdFromUrl!, newPath);
                                  navigate(newPath);
                                }}
                                className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xs transition-all ${ep.index.toString() === episode ? 'bg-[#F6CF80] text-black' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}
                              >
                                 {ep.index}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>
               )}
            </div>

            <div className="flex flex-col gap-8">
               <div className="bg-[#111114] rounded-[2.5rem] border border-white/5 p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Users size={18} className="text-[#F6CF80]" />
                      <h4 className="font-black text-[10px] uppercase tracking-[0.2em]">Penonton ({activeRoom?.members.length || 0})</h4>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {activeRoom?.members.map((member) => (
                      <div key={member.uid} className="flex flex-col items-center gap-2">
                        <div className={`w-12 h-12 rounded-2xl overflow-hidden border-2 ${member.uid === activeRoom.hostId ? 'border-[#F6CF80]' : 'border-white/5'}`}>
                          <img 
                            src={getImageUrl(member.avatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} 
                            onError={(e) => handleImageError(e, member.avatar || '')}
                            className="w-full h-full object-cover" 
                            alt="" 
                          />
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${member.uid === activeRoom.hostId ? 'text-[#F6CF80]' : 'text-white/40'}`}>
                          {member.uid === activeRoom.hostId ? 'HOST' : (member.name?.split(' ')[0] || 'User')}
                        </span>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="bg-[#111114] rounded-[3rem] border border-white/5 flex flex-col h-[500px] shadow-2xl relative overflow-hidden">
                  <div className="p-6 border-b border-white/5 bg-black/20 flex items-center justify-between">
                     <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-[#F6CF80]">Chat Nobar</h4>
                     <div className="flex items-center gap-2">
                       <span className="text-[9px] font-black text-green-500 uppercase">Live</span>
                       <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                     </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                     {messages.map((msg) => (
                       <div key={msg.id} className={`flex flex-col ${msg.senderId === auth.currentUser?.uid ? 'items-end' : 'items-start'}`}>
                           <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1 px-1">{msg.senderName}</span>
                           <div className={`max-w-[90%] px-4 py-3 rounded-2xl text-[11px] font-medium ${msg.senderId === auth.currentUser?.uid ? 'bg-[#F6CF80] text-black rounded-tr-none' : 'bg-white/5 text-white/80 rounded-tl-none border border-white/5'}`}>
                             {msg.text}
                           </div>
                       </div>
                     ))}
                     <div ref={chatEndRef} />
                  </div>
                  <div className="p-6 bg-[#16161a] border-t border-white/5">
                     <form onSubmit={handleSendMessage} className="relative">
                        <input 
                          type="text" 
                          placeholder="Tulis pesan..." 
                          value={chatText}
                          onChange={(e) => setChatText(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-xs font-medium outline-none"
                        />
                        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#F6CF80] text-black rounded-xl flex items-center justify-center">
                           <Send size={16} />
                        </button>
                     </form>
                  </div>
               </div>
            </div>
         </div>

         {anime && (
            <div className="mt-20 flex flex-col items-center">
               <div className="relative w-48 md:w-56 aspect-[3/4.2] rounded-[24px] overflow-hidden shadow-2xl border border-white/10 mb-10 group">
                 <img src={getImageUrl(anime.image_poster)} onError={(e) => handleImageError(e, anime.image_poster)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
               </div>
               <div className="text-center max-w-4xl">
                 <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-2 leading-none">{anime.title}</h2>
                 <p className="text-white/20 text-[10px] uppercase tracking-[0.4em] mb-10">{anime.alternative_title || anime.title}</p>
                 <div className="flex flex-wrap justify-center gap-3 mb-10">
                    <span className="bg-[#F6CF80] text-black text-[9px] font-black px-5 py-2 rounded-lg uppercase tracking-widest">{anime.type || 'SERIES'}</span>
                    <span className="bg-white/5 text-white/60 text-[9px] font-black px-5 py-2 rounded-lg uppercase tracking-widest border border-white/5">{anime.status || 'FINISHED'}</span>
                    <span className="bg-white/5 text-white/60 text-[9px] font-black px-5 py-2 rounded-lg uppercase tracking-widest border border-white/5">{anime.year || '2024'}</span>
                    <div className="flex items-center gap-2 text-[#F6CF80] font-black text-[9px] px-5 py-2 bg-[#F6CF80]/5 rounded-lg border border-[#F6CF80]/10 tracking-widest">
                      <Star size={12} fill="currentColor"/> {anime.favorites || '0'}
                    </div>
                 </div>
                 <p className="text-white/60 text-sm md:text-base leading-relaxed font-medium text-center balance mb-16 px-4">
                    {anime.synopsis}
                 </p>
                 
                 <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 text-left border-t border-white/5 pt-12 items-start">
                    <div className="space-y-2">
                       <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">STATION / STUDIO</p>
                       <p className="text-sm font-black text-white uppercase">{anime.studio || '-'}</p>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">RELEASE DATE</p>
                       <p className="text-sm font-black text-white uppercase">{anime.year || anime.status || '-'}</p>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">GENRE & THEMES</p>
                       <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {anime.genre?.split(',').map((g: any, i: any) => (
                             <span key={i} className="text-sm font-black text-[#F6CF80] uppercase tracking-tight">{g.trim()}</span>
                          ))}
                       </div>
                    </div>
                 </div>
               </div>
            </div>
         )}

         {/* Active Rooms Section - Global Visibility */}
         <div className="mt-32 w-full space-y-10">
            <div className="flex flex-col text-left">
               <h3 className="text-[#F6CF80] font-black uppercase text-[10px] tracking-[0.4em] mb-2 flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-[#F6CF80]"></div>
                  Sedang Berlangsung
               </h3>
               <h3 className="text-white font-black uppercase text-xl md:text-3xl tracking-tight">Pindah Nobar Lain</h3>
            </div>

            <AnimatePresence mode="wait">
               {activeRooms.filter(r => r.id !== roomIdFromUrl).length > 0 ? (
                  <motion.div 
                     key="rooms-list"
                     initial={{ opacity: 0, y: 20 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     className="w-full"
                  >
                     <div className="flex overflow-x-auto pb-8 gap-6 scrollbar-hide -mx-4 px-4 snap-x">
                        {activeRooms.filter(r => r.id !== roomIdFromUrl).map((room) => (
                           <div 
                              key={room.id}
                              onClick={() => navigate(`/nobar/${room.id}`)}
                              className="snap-start shrink-0 w-[260px] md:w-[320px] h-[360px] md:h-[420px] relative rounded-[40px] overflow-hidden group cursor-pointer border border-white/5 shadow-2xl shadow-black/40 hover:scale-[1.02] transition-all bg-[#16161a]"
                           >
                              {/* Backdrop Image */}
                              <img 
                                 src={getImageUrl(room.animeImage || room.animeBanner)} 
                                 onError={(e) => handleImageError(e, room.animeImage || '')}
                                 className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-100"
                                 alt=""
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent" />
                              
                              {/* Room Status Badges */}
                              <div className="absolute top-6 inset-x-6 flex justify-between items-start z-10">
                                 <div className="flex items-center gap-2 bg-[#F6CF80] px-4 py-2 rounded-2xl border border-white/20 shadow-xl shadow-[#F6CF80]/20 scale-100 group-hover:scale-110 transition-transform">
                                    <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
                                    <span className="text-[10px] font-black uppercase text-black tracking-[0.2em]">LIHAT LIVE • {room.members?.length || 1}</span>
                                 </div>
                              </div>

                              {/* Content */}
                              <div className="absolute inset-0 p-8 flex flex-col justify-end translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                 <div className="mb-6">
                                    <div className="flex items-center gap-3 mb-3">
                                       <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10">
                                          <img 
                                             src={getImageUrl(room.hostAvatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${room.hostName}`} 
                                             onError={(e) => handleImageError(e, room.hostAvatar || '')}
                                             className="w-full h-full object-cover" 
                                             alt=""
                                          />
                                       </div>
                                       <span className="text-[10px] font-black text-[#F6CF80] uppercase tracking-widest">{room.hostName}</span>
                                    </div>
                                    <h4 className="text-xl md:text-2xl font-black text-white leading-tight mb-2 group-hover:text-[#F6CF80] transition-colors line-clamp-2 drop-shadow-lg">{room.animeTitle}</h4>
                                    <p className="text-xs text-white/40 font-black uppercase tracking-[0.3em]">EPISODE {room.episodeIndex + 1}</p>
                                 </div>
                                 
                                 <div className="flex items-center gap-2 w-full translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                                    <button className="flex-1 py-4 bg-[#F6CF80] text-black rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#F6CF80]/20 flex items-center justify-center gap-2">
                                       <Zap size={16} fill="currentColor" /> PINDAH NOBAR
                                    </button>
                                 </div>
                              </div>
                              
                              {/* Hover Overlay Light */}
                              <div className="absolute inset-0 bg-[#F6CF80]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                           </div>
                        ))}
                     </div>
                  </motion.div>
               ) : (
                 <motion.div 
                   key="rooms-empty"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="bg-[#16161a] border border-white/5 rounded-[40px] p-20 text-center space-y-6"
                 >
                    <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto text-white/20">
                       <Users size={40} />
                    </div>
                    <div className="space-y-2">
                       <p className="text-white font-black uppercase text-sm tracking-widest">Tidak Ada Nobar Lain</p>
                       <p className="text-white/40 text-xs font-medium max-w-xs mx-auto">Saat ini belum ada teman lain yang sedang nobar. Ajak temanmu buat room!</p>
                    </div>
                 </motion.div>
               )}
            </AnimatePresence>
         </div>

         {isHost && recommendations.length > 0 && (
            <div className="mt-32 space-y-10">
               <div className="flex flex-col text-left">
                  <h3 className="text-[#F6CF80] font-black uppercase text-[10px] tracking-[0.4em] mb-2 flex items-center gap-2"><div className="w-6 h-0.5 bg-[#F6CF80]"></div>Host Smart Pick</h3>
                  <h3 className="text-white font-black uppercase text-xl md:text-3xl tracking-tight">Mungkin Kamu Suka</h3>
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {recommendations.map((a, i) => (
                    <motion.div key={`${a.id || a.slug || 'item'}-${i}`} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} onClick={() => navigate(`/anime/${a.slug || a.id}${(profile?.settings?.apiServer || 'sanka') === 'sanka' ? '?src=sanka' : ''}`)} className="group cursor-pointer relative bg-[#16161a] border border-white/5 rounded-xl overflow-hidden hover:bg-white/[0.04] transition-all shadow-xl h-28 md:h-36">
                       <div className="absolute right-0 top-0 bottom-0 w-3/4 z-0"><div className="absolute inset-0 bg-gradient-to-r from-[#16161a] via-[#16161a]/40 to-transparent z-10" /><img src={getImageUrl(a.image_cover || a.image_poster)} onError={(e) => handleImageError(e, a.image_cover)} className="w-full h-full object-cover opacity-10 group-hover:opacity-30 transition-all duration-700" alt="" /></div>
                       <div className="relative z-10 p-3 md:p-5 h-full flex items-center gap-4">
                          <div className="w-14 h-20 md:w-18 md:h-26 rounded-xl overflow-hidden shrink-0 shadow-2xl border border-white/10 group-hover:scale-105 transition-transform">
                             <img src={getImageUrl(a.image_poster)} onError={(e) => handleImageError(e, a.image_poster)} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 mb-1"><Star size={10} className="text-[#F6CF80] fill-[#F6CF80]" /><span className="text-[9px] font-black text-[#F6CF80] uppercase tracking-widest">{a.favorites || '8.5'}</span></div>
                             <h4 className="text-xs md:text-base font-black text-white uppercase tracking-tight truncate group-hover:text-[#F6CF80] transition-colors">{a.title}</h4>
                             <p className="text-[8px] md:text-[9px] font-black text-white/20 uppercase tracking-widest mt-1 truncate">{a.genre?.split(',').slice(0, 2).join(', ')}</p>
                          </div>
                          <div className="ml-auto pr-2 opacity-0 group-hover:opacity-100 transition-opacity"><div className="w-8 h-8 rounded-full bg-[#F6CF80] flex items-center justify-center text-black shadow-lg"><Play size={14} fill="currentColor" /></div></div>
                       </div>
                    </motion.div>
                  ))}
               </div>
            </div>
         )}
      </main>
      <Footer />
    </div>
  );
};

export default NobarRoom;
