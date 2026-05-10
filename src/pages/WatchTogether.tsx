import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Users, Plus, LogIn, ChevronLeft, Play, Pause, 
  MessageSquare, Send, X, Copy, Check, LogOut, Loader2, Search, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { roomService, RoomState, ChatMessage } from '../services/roomService';
import { animeService } from '../services/animeService';
import { getImageUrl, handleImageError } from '../lib/imageUtils';

const MySwal = withReactContent(Swal);

const WatchTogether = () => {
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams();
  const [roomId, setRoomId] = useState(urlRoomId || '');
  const [activeRoom, setActiveRoom] = useState<RoomState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [animeData, setAnimeData] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAnimeSearch, setShowAnimeSearch] = useState(false);
  const [activeRooms, setActiveRooms] = useState<RoomState[]>([]);
  const isLeaving = useRef(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribeActive = roomService.subscribeToActiveRooms((rooms) => {
      setActiveRooms(rooms);
    });
    return () => unsubscribeActive();
  }, []);

  useEffect(() => {
    if (urlRoomId) {
      handleJoinRoom(urlRoomId);
    }
  }, [urlRoomId]);

  useEffect(() => {
    if (activeRoom) {
      const unsubscribeRoom = roomService.subscribeToRoom(activeRoom.id, (room) => {
        if (room.status === 'closed') {
          MySwal.fire({
            title: 'Room Ditutup',
            text: 'Host telah menutup room ini.',
            icon: 'info',
            background: '#16161a',
            color: '#fff',
            confirmButtonColor: '#EF4444'
          });
          setActiveRoom(null);
          navigate('/nobar');
        } else {
          // Sync Redirection - Fixed loop by comparing full path including search
          const normalizePath = (p: string) => p.replace(/\/$/, '').toLowerCase();
          const currentFullPath = normalizePath(window.location.pathname + window.location.search);
          const targetPath = normalizePath(room.currentPath || '');
          
          if (targetPath && targetPath !== currentFullPath && !window.location.search.includes('stay=true') && !isLeaving.current) {
             console.log('Synchronizing navigation to:', targetPath);
             navigate(room.currentPath!);
          }
          setActiveRoom(room);
        }
      });

      const unsubscribeMessages = roomService.subscribeToMessages(activeRoom.id, (msgs) => {
        setMessages(msgs);
      });

      return () => {
        unsubscribeRoom();
        unsubscribeMessages();
      };
    }
  }, [activeRoom?.id]);

  useEffect(() => {
    if (activeRoom?.animeSlug) {
      fetchAnimeDetails(activeRoom.animeSlug);
    }
  }, [activeRoom?.animeSlug]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Navigation Guard for Room Menu
  useEffect(() => {
    if (!activeRoom) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const trigger = target.closest('a, button, [role="button"]');
      
      if (trigger) {
        const href = trigger.getAttribute('href');
        const isExitBtn = trigger.textContent?.toLowerCase().includes('keluar') || 
                          trigger.classList.contains('exit-btn');
        const isRoomRelative = (href?.includes('/nobar/') && href?.includes(activeRoom.id)) || 
                               href?.includes(activeRoom.animeSlug);

        if (!isExitBtn && !isRoomRelative) {
           const isNavbarFooter = trigger.closest('nav') || trigger.closest('footer');
           const isLink = trigger.tagName === 'A';

           if (isNavbarFooter || isLink) {
              e.preventDefault();
              e.stopPropagation();
              
              MySwal.fire({
                title: 'Room Masih Aktif!',
                text: 'Kamu sedang berada di dalam room. Kamu harus keluar dahulu sebelum pindah halaman.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Ya, Keluar',
                cancelButtonText: 'Batal',
                background: '#16161a',
                color: '#fff',
                confirmButtonColor: '#EF4444',
                cancelButtonColor: 'rgba(255,255,255,0.1)'
              }).then((result) => {
                if (result.isConfirmed) {
                   handleLeaveRoom().then(() => {
                      if (href) navigate(href);
                   });
                }
              });
           }
        }
      }
    };

    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, [activeRoom?.id, navigate]);

  const fetchAnimeDetails = async (slug: string) => {
    try {
      const data = await animeService.getAnimeDetail(slug);
      if (data) {
        setAnimeData(data);
        if (data.episodes) {
          setEpisodes(data.episodes);
        }
      }
    } catch (err) {
      console.error('Error fetching anime details:', err);
    }
  };

  const handleCreateRoom = async (anime: any) => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    const { value: password } = await MySwal.fire({
      title: 'Setup Room',
      text: 'Ingin memakai password? (Kosongkan jika publik)',
      input: 'password',
      inputPlaceholder: 'Enter password...',
      background: '#16161a',
      color: '#fff',
      confirmButtonColor: '#EF4444',
      showCancelButton: true,
      cancelButtonText: 'Batal',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      }
    });

    // If user cancelled the SWAL, result.isDismissed will be true, but result.value will be undefined
    if (password === undefined) return;

    setLoading(true);
    try {
      const id = await roomService.createRoom(anime, 0, password);
      navigate(`/nobar/${id}`);
      setLoading(false);
    } catch (err: any) {
      MySwal.fire('Gagal', err.message, 'error');
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await animeService.searchAnime(searchQuery);
      if (res) {
        setSearchResults(res);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const startStreaming = async () => {
     if (!activeRoom || !animeData) return;
     const path = activeRoom.currentPath || `/nobar/${activeRoom.animeSlug}/${activeRoom.episodeIndex + 1}?room=${activeRoom.id}`;
     await roomService.startWatching(activeRoom.id, path);
     navigate(path);
  };

  const handleUpdateAnime = async (anime: any) => {
    if (!activeRoom || activeRoom.hostId !== auth.currentUser?.uid) return;
    
    setLoading(true);
    try {
      await roomService.updateRoomAnime(activeRoom.id, anime);
      
      // Notify via chat
      await roomService.sendMessage(activeRoom.id, `📢 Host mengganti anime ke: ${anime.title}`);
      
      setShowAnimeSearch(false);
      setSearchResults([]);
      setSearchQuery('');
      setLoading(false);
    } catch (err: any) {
      MySwal.fire('Gagal', err.message, 'error');
      setLoading(false);
    }
  };

  const handleJoinRoom = async (idToJoin?: string) => {
    const id = idToJoin || roomId;
    if (!id) return;

    setJoining(true);
    try {
      // First check if room exists and if it has a password
      const roomRef = doc(db, 'rooms', id);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        throw new Error('Room tidak ditemukan');
      }

      const roomData = roomSnap.data() as RoomState;
      
      if (roomData.password && roomData.password !== '') {
        const { value: inputPass } = await MySwal.fire({
          title: 'Room Private',
          text: 'Masukkan password untuk bergabung',
          input: 'password',
          inputPlaceholder: 'Password...',
          background: '#16161a',
          color: '#fff',
          confirmButtonColor: '#EF4444',
          showCancelButton: true,
          cancelButtonText: 'Batal'
        });

        if (inputPass === undefined) {
          setJoining(false);
          return;
        }

        if (inputPass !== roomData.password) {
          throw new Error('Password salah!');
        }
      }

      await roomService.joinRoom(id);
      setActiveRoom({ id: roomSnap.id, ...roomData } as RoomState);
      setJoining(false);
      if (!idToJoin) navigate(`/nobar/${id}`);
    } catch (err: any) {
      MySwal.fire({
        title: 'Gagal Join',
        text: err.message,
        icon: 'error',
        background: '#16161a',
        color: '#fff'
      });
      setJoining(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!activeRoom) return;

    const result = await MySwal.fire({
      title: activeRoom.hostId === auth.currentUser?.uid ? 'Tutup Room?' : 'Tinggalkan Room?',
      text: activeRoom.hostId === auth.currentUser?.uid ? 'Semua anggota akan dikeluarkan.' : 'Kamu akan keluar dari nobar ini.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya',
      background: '#16161a',
      color: '#fff',
      confirmButtonColor: '#ef4444'
    });

    if (result.isConfirmed) {
      isLeaving.current = true;
      await roomService.leaveRoom(activeRoom.id);
      setActiveRoom(null);
      navigate('/nobar');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() || !activeRoom) return;

    await roomService.sendMessage(activeRoom.id, chatText.trim());
    setChatText('');
  };

  const copyRoomId = () => {
    if (!activeRoom) return;
    navigator.clipboard.writeText(activeRoom.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || joining) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center">
        <Loader2 className="text-[#EF4444] animate-spin mb-4" size={48} />
        <p className="text-white/40 font-black uppercase text-xs tracking-widest animate-pulse">
          {loading ? 'Menyiapkan Ruangan...' : 'Mencoba Masuk...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-[#EF4444] selection:text-black">
      <Helmet>
        <title>{activeRoom ? `${activeRoom.animeTitle} - Nobar Bareng ${activeRoom.hostName}` : 'ChisaStream - Nonton Anime Bareng'}</title>
        <meta property="og:title" content={activeRoom ? `Nobar ${activeRoom.animeTitle} - ChisaStream` : 'ChisaStream - Nobar Anime Seru'} />
        <meta property="og:description" content={activeRoom ? `Ayo nonton bareng ${activeRoom.hostName} di ChisaStream!` : 'Nonton anime bareng teman secara real-time!'} />
        {activeRoom && (
          <meta property="og:image" content={activeRoom.animeImage || activeRoom.animeBanner} />
        )}
      </Helmet>
      <Navbar />

      <main className="pt-24 pb-32 px-4 md:px-8 max-w-6xl mx-auto">
        {!activeRoom ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="text-center space-y-4"
            >
              <div className="inline-flex p-6 bg-[#EF4444]/10 rounded-[40px] text-[#EF4444] mb-4">
                 <Users size={48} />
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight">NOBAR SERU!</h1>
              <p className="text-white/40 max-w-md mx-auto font-medium">Nonton anime bareng teman-teman secara real-time. Pilih anime dan cari partner nobar kamu!</p>
            </motion.div>

            <div className="flex flex-col md:flex-row gap-8 w-full">
               {/* Left: Create Room Search */}
               <div className="flex-1 bg-[#16161a] p-8 md:p-10 rounded-[48px] border border-white/5 shadow-2xl space-y-8">
                  <div>
                    <h3 className="text-2xl font-black text-white mb-2">Create Room</h3>
                    <p className="text-xs text-white/40 font-medium">Cari anime yang ingin kamu tonton</p>
                  </div>

                  <form onSubmit={handleSearch} className="relative">
                     <input 
                       type="text" 
                       placeholder="Cari anime..." 
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-6 pr-14 text-sm font-black focus:border-[#EF4444]/50 outline-none transition-all"
                     />
                     <button className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-[#EF4444] text-black rounded-xl flex items-center justify-center">
                        <Search size={20} />
                     </button>
                  </form>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                     {isSearching && (
                        <div className="flex items-center justify-center py-8">
                           <Loader2 className="animate-spin text-[#EF4444]" />
                        </div>
                     )}
                     
                      {searchResults.map((anime, idx) => (
                        <div 
                          key={`${anime.id || anime.slug || 'search'}-${idx}`}
                          className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5 hover:border-[#EF4444]/30 transition-all group cursor-pointer"
                          onClick={() => handleCreateRoom(anime)}
                        >
                           <img 
                             src={getImageUrl(anime.image || anime.image_poster)} 
                             onError={(e) => handleImageError(e, anime.image || anime.image_poster)}
                             className="w-16 h-24 object-cover rounded-xl shadow-lg" 
                             alt="" 
                           />
                           <div className="flex-1">
                              <h4 className="font-black text-sm text-white group-hover:text-[#EF4444] transition-colors line-clamp-1">{anime.title}</h4>
                              <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1">{anime.type || 'Series'} • {anime.status || 'Unknown'}</p>
                              <button className="mt-3 px-4 py-2 bg-white/5 group-hover:bg-[#EF4444] group-hover:text-black text-white/40 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all">SELECT ANIME</button>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Right: Join Room */}
               <div className="w-full md:w-[350px] bg-[#16161a] p-8 md:p-10 rounded-[48px] border border-white/5 shadow-2xl h-fit">
                  <div className="w-12 h-12 bg-white/5 text-white/40 rounded-2xl flex items-center justify-center mb-6">
                     <LogIn size={24} />
                  </div>
                  <h3 className="text-xl font-black mb-1">Join Room</h3>
                  <p className="text-xs text-white/40 font-medium mb-6">Masukkan kode rahasia dari temanmu</p>
                  
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="ROOM ID..." 
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 font-black uppercase text-xs tracking-[0.2em] focus:border-[#EF4444]/50 outline-none"
                    />
                    <button 
                      onClick={() => handleJoinRoom()}
                      className="w-full py-4 bg-[#EF4444] text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                       <LogIn size={18} /> JOIN NOW
                    </button>
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left side: Video Info & Members */}
            <div className="lg:col-span-2 space-y-8">
               <div className="bg-[#16161a] rounded-[48px] overflow-hidden border border-white/5 shadow-2xl">
                  <div className="p-8 pb-4">
                     <div className="flex items-center justify-between mb-6">
                        <button onClick={handleLeaveRoom} className="flex items-center gap-2 text-white/40 hover:text-red-500 transition-colors uppercase text-[10px] font-black tracking-widest">
                           <X size={16} /> Keluar
                        </button>
                        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                           <span className="text-[10px] font-black text-white/40 uppercase">Room ID:</span>
                           <span className="text-xs font-black text-[#EF4444]">{activeRoom.id}</span>
                           <button onClick={copyRoomId} className="text-white/20 hover:text-white transition-colors ml-2">
                              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                           </button>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-6">
                        <div className="w-24 h-36 rounded-2xl overflow-hidden shrink-0 border border-white/5 shadow-2xl">
                           <img 
                             src={getImageUrl(animeData?.image_poster)} 
                             onError={(e) => handleImageError(e, animeData?.image_poster)}
                             className="w-full h-full object-cover" 
                             alt="" 
                           />
                        </div>
                        <div>
                           <h2 className="text-2xl font-black text-white mb-2">{animeData?.title || activeRoom.animeTitle}</h2>
                           <p className="text-xs text-white/40 font-black uppercase tracking-widest mb-4">Episode {activeRoom.episodeIndex + 1}</p>
                           
                           <div className="flex flex-wrap gap-3">
                              {activeRoom.hostId === auth.currentUser?.uid ? (
                                <>
                                  <button 
                                    onClick={startStreaming}
                                    className="px-6 py-3 bg-[#EF4444] text-black rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#EF4444]/20"
                                  >
                                     <Play size={16} fill="black" /> {activeRoom.currentPath ? 'RESUME WATCHING' : 'START WATCHING'}
                                  </button>
                                  <button 
                                    onClick={() => setShowAnimeSearch(!showAnimeSearch)}
                                    className="px-6 py-3 bg-white/5 text-white/40 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 border border-white/10 hover:bg-white/10 transition-all"
                                  >
                                     <Search size={16} /> {showAnimeSearch ? 'BATAL GANTI' : 'GANTI ANIME'}
                                  </button>
                                </>
                              ) : (
                                <button 
                                  onClick={() => activeRoom.currentPath && navigate(activeRoom.currentPath)}
                                  disabled={!activeRoom.currentPath}
                                  className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 border transition-all ${activeRoom.currentPath ? 'bg-[#EF4444] text-black border-[#EF4444] hover:scale-105' : 'bg-white/5 text-white/20 border-white/10'}`}
                                >
                                   {activeRoom.currentPath ? (
                                     <><Play size={16} fill="black" /> JOIN SESSION</>
                                   ) : (
                                     <><Loader2 size={16} className="animate-spin" /> MENUNGGU HOST...</>
                                   )}
                                </button>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Host Anime Search */}
                  <AnimatePresence>
                    {showAnimeSearch && activeRoom.hostId === auth.currentUser?.uid && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="p-8 border-t border-white/5 space-y-6 overflow-hidden"
                      >
                         <div className="flex items-center justify-between">
                            <h3 className="font-black text-xs uppercase tracking-widest text-[#EF4444]">Cari Anime Baru</h3>
                         </div>
                         <form onSubmit={handleSearch} className="relative">
                            <input 
                              type="text" 
                              placeholder="Ketik judul anime..." 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-xs font-black focus:border-[#EF4444]/50 outline-none"
                            />
                            <button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#EF4444] text-black rounded-xl flex items-center justify-center">
                               <Search size={18} />
                            </button>
                         </form>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto scrollbar-hide">
                            {searchResults.map((anime, idx) => (
                              <div 
                                key={`${anime.slug || anime.id || 'host-search'}-${idx}`}
                                onClick={() => handleUpdateAnime(anime)}
                                className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-[#EF4444]/30 transition-all cursor-pointer group"
                              >
                                 <img 
                                   src={getImageUrl(anime.image || anime.image_poster)} 
                                   className="w-12 h-16 object-cover rounded-lg"
                                   alt=""
                                 />
                                 <div className="flex-1 min-w-0">
                                    <p className="font-black text-[10px] text-white uppercase truncate group-hover:text-[#EF4444]">{anime.title}</p>
                                    <p className="text-[8px] text-white/40 font-black uppercase mt-1">Pilih Anime Ini</p>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="p-8 bg-black/20">
                     <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-6">ANGGOTA ({activeRoom.members.length})</p>
                     <div className="flex flex-wrap gap-8">
                        {activeRoom.members.map((member) => (
                           <div key={member.uid} className="flex flex-col items-center gap-3 group">
                              <div className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all group-hover:scale-110 ${member.uid === activeRoom.hostId ? 'border-[#EF4444]' : 'border-white/5'}`}>
                                 <img 
                                   src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} 
                                   className="w-full h-full object-cover" 
                                   alt="" 
                                 />
                              </div>
                              <div className="text-center">
                                 <p className="text-[10px] font-black text-white truncate max-w-[90px] uppercase tracking-widest">{member.name?.split(' ')[0] || 'User'}</p>
                                 {member.uid === activeRoom.hostId && <p className="text-[8px] font-black text-[#EF4444] uppercase tracking-widest mt-0.5">HOST</p>}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
               
               <div className="bg-[#16161a] p-8 rounded-[48px] border border-white/5 shadow-2xl">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                     <Play size={20} className="text-[#EF4444]" />
                     CARA NOBAR
                  </h3>
                  <div className="space-y-4 text-white/40 text-sm font-medium leading-relaxed">
                     <p><span className="text-[#EF4444] font-black mr-2">1.</span> Host memilih anime yang ingin ditonton.</p>
                     <p><span className="text-[#EF4444] font-black mr-2">2.</span> Host membagikan link atau <span className="text-white font-bold">Room ID</span> ke teman-teman.</p>
                     <p><span className="text-[#EF4444] font-black mr-2">3.</span> Teman-teman bergabung menggunakan ID tersebut.</p>
                     <p><span className="text-[#EF4444] font-black mr-2">4.</span> Klik tombol <span className="text-[#EF4444] font-bold">"GO TO VIDEO"</span> untuk masuk ke halaman pemutar.</p>
                     <p><span className="text-[#EF4444] font-black mr-2">5.</span> Jika kamu host, kontrol putar/jeda akan tersinkronisasi (Coming Soon Full Sync).</p>
                  </div>
               </div>
            </div>

            {/* Right side: Chat */}
            <div className="bg-[#111114] rounded-[48px] border border-white/5 shadow-2xl flex flex-col h-[700px] relative overflow-hidden">
               <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <MessageSquare size={20} className="text-[#EF4444]" />
                     <h4 className="font-black text-sm uppercase tracking-widest">Chat Room</h4>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                  {messages.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
                        <MessageSquare size={48} className="mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest">Belum ada pesan</p>
                     </div>
                  ) : (
                     messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.senderId === auth.currentUser?.uid ? 'items-end' : 'items-start'}`}>
                           <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1 mx-1">{msg.senderName}</p>
                           <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs font-medium ${msg.senderId === auth.currentUser?.uid ? 'bg-[#EF4444] text-black rounded-tr-none' : 'bg-white/5 text-white/80 rounded-tl-none border border-white/5'}`}>
                              {msg.text}
                           </div>
                        </div>
                     ))
                  )}
                  <div ref={chatEndRef} />
               </div>

               <div className="p-4 bg-[#16161a] border-t border-white/5">
                  <form onSubmit={handleSendMessage} className="relative">
                     <input 
                       type="text" 
                       placeholder="Tulis pesan..." 
                       value={chatText}
                       onChange={(e) => setChatText(e.target.value)}
                       className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-sm font-medium focus:border-[#EF4444]/50 outline-none transition-all"
                     />
                     <button 
                       type="submit"
                       className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#EF4444] text-black rounded-xl flex items-center justify-center hover:scale-105 active:scale-90 transition-all shadow-lg shadow-[#EF4444]/20"
                     >
                        <Send size={18} />
                     </button>
                  </form>
               </div>
            </div>
          </div>
        )}

        {/* Active Rooms Section - Global Visibility */}
        <div className="mt-32 max-w-6xl mx-auto px-4 md:px-8">
           <div className="flex flex-col text-left mb-10">
              <h3 className="text-[#EF4444] font-black uppercase text-[10px] tracking-[0.4em] mb-2 flex items-center gap-2">
                 <div className="w-6 h-0.5 bg-[#EF4444]"></div>
                 Sedang Berlangsung
              </h3>
              <h3 className="text-white font-black uppercase text-xl md:text-3xl tracking-tight">Cek Room Nobar Lain</h3>
           </div>

           <AnimatePresence mode="wait">
              {activeRooms.filter(r => r.id !== activeRoom?.id).length > 0 ? (
                 <motion.div 
                    key="rooms-list"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="w-full"
                 >
                    <div className="flex overflow-x-auto pb-8 gap-6 scrollbar-hide -mx-4 px-4 snap-x">
                       {activeRooms.filter(r => r.id !== activeRoom?.id).map((room) => (
                          <div 
                             key={room.id}
                             onClick={() => handleJoinRoom(room.id)}
                             className="snap-start shrink-0 w-[260px] md:w-[320px] h-[360px] md:h-[420px] relative rounded-[40px] overflow-hidden group cursor-pointer border border-white/5 shadow-2xl shadow-black/60 hover:scale-[1.02] transition-all bg-[#16161a]"
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
                                <div className="flex items-center gap-2 bg-[#EF4444] px-4 py-2 rounded-2xl border border-white/20 shadow-xl shadow-[#EF4444]/20 scale-100 group-hover:scale-110 transition-transform">
                                   <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
                                   <span className="text-[10px] font-black uppercase text-black tracking-[0.2em]">LIHAT LIVE • {room.members?.length || 1}</span>
                                </div>
                                {room.password && room.password !== '' && (
                                   <div className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 text-[#EF4444]">
                                      <LogIn size={18} />
                                   </div>
                                )}
                             </div>

                             {/* Content */}
                             <div className="absolute inset-0 p-8 flex flex-col justify-end translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                <div className="mb-6">
                                   <div className="flex items-center gap-3 mb-3">
                                      <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10">
                                         <img 
                                            src={room.hostAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${room.hostName}`} 
                                            className="w-full h-full object-cover" 
                                            alt=""
                                         />
                                      </div>
                                      <span className="text-[10px] font-black text-[#EF4444] uppercase tracking-widest">{room.hostName}</span>
                                   </div>
                                   <h4 className="text-xl md:text-2xl font-black text-white leading-tight mb-2 group-hover:text-[#EF4444] transition-colors line-clamp-2 drop-shadow-lg">{room.animeTitle}</h4>
                                   <p className="text-xs text-white/40 font-black uppercase tracking-[0.3em]">EPISODE {room.episodeIndex + 1}</p>
                                </div>
                                
                                <div className="flex items-center gap-2 w-full translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                                   <button className="flex-1 py-4 bg-[#EF4444] text-black rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#EF4444]/20 flex items-center justify-center gap-2">
                                      <Zap size={16} fill="currentColor" /> GABUNG SEKARANG
                                   </button>
                                </div>
                             </div>
                             
                             {/* Hover Overlay Light */}
                             <div className="absolute inset-0 bg-[#EF4444]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          </div>
                       ))}
                    </div>
                 </motion.div>
              ) : (
                <motion.div 
                  key="rooms-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-[#16161a] border border-white/5 rounded-[40px] p-16 text-center space-y-4"
                >
                   <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto text-white/20">
                      <Users size={32} />
                   </div>
                   <div className="space-y-1">
                      <p className="text-white font-black uppercase text-xs tracking-widest">Room Kosong</p>
                      <p className="text-white/40 text-[10px] font-medium">Belum ada nobar yang sedang berlangsung saat ini.</p>
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WatchTogether;
