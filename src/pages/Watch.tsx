import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Play, Share2, Download, Star, LayoutGrid, Settings, Maximize, Pause, RotateCcw, RotateCw, SkipBack, SkipForward, Volume2, Info, Eye, EyeOff, Copy, Users, Send, Smile, MessageCircle, Reply, Trash2, MoreVertical, Zap, Loader2, Server, Globe, Cloud, HardDrive, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { userService, UserSettings, Comment, getLevelFromExp } from '../services/userService';
import { animeService } from '../services/animeService';
import { getImageUrl, handleImageError } from '../lib/imageUtils';
import { auth } from '../lib/firebase';
import Swal from 'sweetalert2';

import { roomService, RoomState } from '../services/roomService';
import { useLocation } from 'react-router-dom';

const EPISODES_PER_PAGE = 40;

const LottieLoading = ({ size = "w-64 h-64" }: { size?: string }) => (
  <div className={`${size} flex items-center justify-center`}>
    <DotLottieReact
      src="https://lottie.host/be99b40a-b368-4a47-8462-6ea7a05d8a4d/07QOTO7jEJ.lottie"
      loop
      autoplay
    />
  </div>
);

const WatchSkeleton = () => (
  <div className="w-full">
    <div className="w-full aspect-video bg-[#16161a] rounded-2xl relative overflow-hidden mb-6 flex flex-col items-center justify-center border border-white/5 shadow-3xl">
      <LottieLoading size="w-64 h-64 md:w-80 md:h-80" />
      <p className="text-[#EF4444] text-sm font-black uppercase tracking-[0.3em] relative z-20 animate-pulse text-center px-6 mt-[-40px]">Menyiapkan Player terbaik untukmu...</p>
    </div>
    <div className="h-64 bg-[#16161a]/50 rounded-[32px] mb-10 w-full border border-white/5"></div>
  </div>
);

const formatTime = (timeInSeconds: number) => {
  if (isNaN(timeInSeconds)) return "00:00";
  const m = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const Watch = () => {
  const { slug, episode } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const roomId = searchParams.get('room');
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
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<RoomState | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [currentEpId, setCurrentEpId] = useState<string | null>(null);
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEpLoading, setIsEpLoading] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showResolutions, setShowResolutions] = useState(false);
  const [showSpeeds, setShowSpeeds] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [seekPopup, setSeekPopup] = useState<any>(null);
  const [isTogglingPlay, setIsTogglingPlay] = useState<null | 'play' | 'pause'>(null);
  const [isPureMode, setIsPureMode] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [levelUpData, setLevelUpData] = useState<{ show: boolean, level: number } | null>(null);
  const [expFloating, setExpFloating] = useState<{ id: number, amount: number }[]>([]);
  const [isServerSectionOpen, setIsServerSectionOpen] = useState(false);

  useEffect(() => {
    if (auth.currentUser && isPlaying && videoRef.current) {
      const interval = setInterval(async () => {
        const result = await userService.addExp(userService.EXP_SOURCES.WATCH_5MIN, 'Nonton 5 Menit');
        await userService.updateQuestProgress('watch', 1);
        
        if (result) {
          const id = Date.now();
          setExpFloating(prev => [...prev, { id, amount: userService.EXP_SOURCES.WATCH_5MIN }]);
          setTimeout(() => setExpFloating(prev => prev.filter(f => f.id !== id)), 3000);
          
          if (result.leveledUp) {
            setLevelUpData({ show: true, level: result.newLevel });
            setTimeout(() => setLevelUpData(null), 5000);
          }
        }
      }, 5 * 60 * 1000); // 5 minutes
      
      return () => clearInterval(interval);
    }
  }, [isPlaying, auth.currentUser]);

  const toggleThread = (commentId: string) => {
    setExpandedThreads(prev => 
      prev.includes(commentId) ? prev.filter(id => id !== commentId) : [...prev, commentId]
    );
  };

  const controlsTimeoutRef = useRef<any>(null);
  const skipBuffer = useRef(0);
  const skipTimeout = useRef<any>(null);

  useEffect(() => {
    if (auth.currentUser) {
      userService.getProfile().then(setUserProfile);
    }
  }, []);

  const showSwal = (icon: 'success' | 'error' | 'warning' | 'info', title: string, text: string) => {
    Swal.fire({
      icon,
      title,
      text,
      background: '#16161a',
      color: '#fff',
      confirmButtonColor: '#EF4444'
    });
  };

  // Orientation and Fullscreen Logic
  const handleFullscreenChange = async () => {
    try {
      if (document.fullscreenElement) {
        // Entering fullscreen
        if (window.innerWidth < 768) { // Only for mobile/tablet
          if (screen.orientation && (screen.orientation as any).lock) {
            await (screen.orientation as any).lock('landscape');
          }
        }
      } else {
        // Exiting fullscreen
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      }
    } catch (e) {
      console.log('Orientation lock/unlock error:', e);
    }
  };

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Clean up orientation lock when leaving the page
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        try { document.exitFullscreen(); } catch(e){}
      }
      if (screen.orientation && (screen.orientation as any).unlock) {
        try { (screen.orientation as any).unlock(); } catch(e){}
      }
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!id) return;
    
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        let detailData = null;
        let profile = null;
        const queryTitle = devTitle || slug?.split('-').slice(1).join(' ');

        if (searchSource === 'sanka') {
           [detailData, profile] = await Promise.all([
              animeService.getAnimeDetail(id!),
              userService.getProfile()
           ]);
        } else if (searchSource === 'dev') {
           [detailData, profile] = await Promise.all([
              animeService.getDevDetail(id!),
              userService.getProfile()
           ]);
        } else {
           [detailData, profile] = await Promise.all([
              animeService.getAnimeDetail(id!),
              userService.getProfile()
           ]);
        }

        if (profile?.settings) {
          setUserSettings(profile.settings);
        }

        if (detailData) {
          if (searchSource === 'dev' && devImg) {
            detailData.image_poster = devImg;
            detailData.image_cover = devImg;
          }
          setAnime(detailData);
          setEpisodes(detailData.episodes || []);
          
          const recRes = await animeService.getPopular(Math.floor(Math.random() * 5) + 1);
          const recData = (recRes as any).data || recRes;
          setRecommendations(Array.isArray(recData) ? recData.slice(0, 10) : []);
        }
      } catch (e) {}
      setIsLoading(false);
    };
    fetchDetail();
  }, [id]);

  useEffect(() => {
    if (episodes.length > 0) {
      let targetEp = episodes.find(e => e.index.toString() === episode);
      if (targetEp) setCurrentEpId(targetEp.id);
      else setCurrentEpId(episodes[0].id);
    }
  }, [episode, episodes]);

  const [isFallbackLoading, setIsFallbackLoading] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const fetchFallbackStream = async (title: string, index: number, specificEpId?: string) => {
    setIsFallbackLoading(true);
    try {
      let fallbackData = null;
      
      // If we have a specific episode ID (URL) and it's from a Dev Entry, use it directly
      if (specificEpId && (searchSource === 'dev' || anime?.isDevEntry)) {
        fallbackData = await animeService.getDevStream(specificEpId);
      } else {
        // Otherwise, fallback to title search
        fallbackData = await animeService.getFallbackEpisodeStream(title, index);
      }

      if (fallbackData && fallbackData.server?.length > 0) {
        setServers(fallbackData.server);
        
        // Find priority server first (Blogger/FileDon)
        const priorityServer = fallbackData.server.find((s: any) => {
          const name = s.name?.toLowerCase() || '';
          const link = s.link?.toLowerCase() || '';
          return name.includes('blogger') || name.includes('filedon') || link.includes('blogger.com') || link.includes('filedon.co');
        });
        
        setSelectedServer(priorityServer || fallbackData.server[0]);
        setIsUsingFallback(true);
        // Only show success toast if we just switched or it's requested
        if (!isUsingFallback) {
           showSwal('success', 'Fallback Aktif', 'Berhasil menemukan source dari Dev API.');
        }
      } else {
        showSwal('error', 'Fallback Gagal', 'Tidak dapat menemukan anime/episode ini di source cadangan.');
      }
    } catch (e) {
      showSwal('error', 'Error', 'Terjadi kesalahan saat memproses fallback.');
    } finally {
      setIsFallbackLoading(false);
    }
  };

  useEffect(() => {
    if (!currentEpId) return;
    const fetchEpisode = async () => {
      setIsEpLoading(true);
      setIsVideoReady(false);
      setIsPlaying(false);
      setProgress(0);
      setIsUsingFallback(false);
      try {
        // Jika setting fallback aktif ATAU datang dari search dev, langsung coba ambil dari Dev API
        if ((userSettings?.fallbackStream || searchSource === 'dev') && (anime?.title || currentEpId)) {
          await fetchFallbackStream(anime?.title || '', parseInt(currentEpNum), currentEpId);
          setIsEpLoading(false);
          return;
        }

        let epData;
        if (searchSource === 'dev') {
            epData = await animeService.getDevStream(currentEpId!);
            if (epData && epData.server) {
                // Ensure the naming formatting aligns
                epData.server = epData.server.map((s: any) => ({
                    ...s,
                    // Dev provides standard links
                    type: 'iframe' 
                }));
            }
        } else {
            epData = await animeService.getEpisode(currentEpId!);
        }

        if (epData && epData.server?.length > 0) {
          const isSanka = searchSource === 'sanka' || searchSource === 'dev' || userSettings?.apiServer === 'sanka';
          const validServers = (epData.server || []).filter((s: any) => s.link && (isSanka || s.type === 'direct' || searchSource === 'dev'));
          const uniqueServers = Array.from(new Map(validServers.map((s: any) => [s.quality + s.name, s])).values());
          setServers(uniqueServers);
          if (uniqueServers.length > 0) {
             // Find priority server first (Blogger/FileDon)
             const priorityServer = uniqueServers.find((s: any) => {
               const name = s.name.toLowerCase();
               const link = s.link.toLowerCase();
               return name.includes('blogger') || name.includes('filedon') || link.includes('blogger.com') || link.includes('filedon.co');
             });
             
             setSelectedServer(priorityServer || uniqueServers.find((s: any) => s.quality === '720p') || uniqueServers[0]);
          } else {
             // If no mp4 servers found, try fallback automatically if setting is enabled
             if (userSettings?.fallbackStream && anime?.title) {
                fetchFallbackStream(anime.title, parseInt(currentEpNum), currentEpId);
             }
          }
        } else {
           // No episode data found, try fallback if enabled
           if (userSettings?.fallbackStream && anime?.title) {
              fetchFallbackStream(anime.title, parseInt(currentEpNum), currentEpId);
           }
        }
      } catch (e) {}
      setIsEpLoading(false);
    };
    fetchEpisode();
  }, [currentEpId]);

  const allEpisodes = useMemo(() => {
    if (!episodes) return [];
    const reversed = [...episodes].reverse();
    if (!searchQuery) return reversed;
    return reversed.filter(ep => ep.index.toString().includes(searchQuery));
  }, [episodes, searchQuery]);

  const totalPages = Math.ceil(allEpisodes.length / EPISODES_PER_PAGE);
  const paginatedEps = useMemo(() => {
    const start = currentPage * EPISODES_PER_PAGE;
    return allEpisodes.slice(start, start + EPISODES_PER_PAGE);
  }, [allEpisodes, currentPage]);

  useEffect(() => { setCurrentPage(0); }, [searchQuery]);

  const resetControlsTimeout = () => {
    if (isPureMode) {
      if (showControls) setShowControls(false);
      return;
    }
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!isDraggingRef.current && isPlaying) {
        setShowControls(false);
        setShowResolutions(false);
        setShowSpeeds(false);
      }
    }, 4000);
  };

  const currentEpNum = useMemo(() => {
    return episodes.find(e => e.id === currentEpId)?.index || '0';
  }, [episodes, currentEpId]);

  const epIndex = useMemo(() => {
    return episodes.findIndex(e => e.id === currentEpId);
  }, [episodes, currentEpId]);

  useEffect(() => {
    if (!currentEpId || !videoRef.current || !isVideoReady) return;
    
    // Check for saved progress
    const checkProgress = async () => {
      const history = await userService.getHistory();
      const savedProgress = history.find((h: any) => h.slug === slug && h.episode === currentEpNum);
      
      if (savedProgress && savedProgress.timestamp > 5 && videoRef.current) {
        // Seek to saved position if more than 5 seconds
        videoRef.current.currentTime = savedProgress.timestamp;
        setCurrentTime(savedProgress.timestamp);
        const prog = (savedProgress.timestamp / videoRef.current.duration) * 100;
        setProgress(prog);
      }
    };
    checkProgress();
  }, [isVideoReady, currentEpId, slug, currentEpNum]);

  const lastSavedTimeRef = useRef<number>(0);

  const saveHistory = async (time: number) => {
    if (!anime || !currentEpId) return;
    
    // For normal video, check if we moved enough to save
    if (videoRef.current && Math.abs(time - lastSavedTimeRef.current) < 5 && time !== videoRef.current.currentTime) {
      return;
    }
    
    lastSavedTimeRef.current = time;
    const currentServerParam = (searchSource || 'sanka') as 'main' | 'backup' | 'sanka';
    
    await userService.addHistory({
      title: anime.title,
      image: anime.image_poster,
      cover: anime.image_cover,
      slug: slug || '',
      episode: currentEpNum,
      timestamp: time,
      duration: duration
    }, currentServerParam);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      setProgress((time / videoRef.current.duration) * 100);
      
      // Save progress every 15 seconds to be more efficient
      if (Math.floor(time) % 15 === 0 && Math.abs(time - lastSavedTimeRef.current) > 10) {
        saveHistory(time);
      }
    }
  };

  const toggleControls = (e: React.MouseEvent) => {
    // If clicking on specific ui elements, don't toggle
    if ((e.target as HTMLElement).closest('.player-ui-element')) return;
    
    if (showControls) {
      setShowControls(false);
      setShowResolutions(false);
      setShowSpeeds(false);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      resetControlsTimeout();
    }
  };

  // Nobar Synchronization Logic
  useEffect(() => {
    if (activeRoom && videoRef.current && !isHost) {
      const roomPlay = activeRoom.playbackState.isPlaying;
      const roomTime = activeRoom.playbackState.currentTime;
      
      // Sync Play/Pause
      if (roomPlay !== isPlaying) {
        if (roomPlay) {
          videoRef.current.play().catch(() => {});
          setIsPlaying(true);
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }
      
      // Sync Time (if diff > 5s)
      const diff = Math.abs(videoRef.current.currentTime - roomTime);
      if (diff > 5) {
        videoRef.current.currentTime = roomTime;
        setCurrentTime(roomTime);
      }
    }
  }, [activeRoom?.playbackState.isPlaying, activeRoom?.playbackState.currentTime]);

  useEffect(() => {
    if (roomId) {
      const unsubscribe = roomService.subscribeToRoom(roomId, (room) => {
        setActiveRoom(room);
        if (room.hostId === auth.currentUser?.uid) {
           setIsHost(true);
        } else if (room.currentPath) {
           // Guest follows host navigation
           const currentFullPath = window.location.pathname + window.location.search;
           if (room.currentPath !== currentFullPath) {
              navigate(room.currentPath);
           }
        }
      });
      return () => unsubscribe();
    }
  }, [roomId]);

  // Host regular updates
  useEffect(() => {
    if (isHost && roomId && isPlaying && videoRef.current) {
      const interval = setInterval(() => {
        if (videoRef.current) {
          roomService.updatePlayback(roomId, isPlaying, videoRef.current.currentTime);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isHost, roomId, isPlaying]);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      const nextPlay = videoRef.current.paused;
      if (nextPlay) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          setIsTogglingPlay('play');
          setTimeout(() => setIsTogglingPlay(null), 800);
        }).catch(() => {});
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
        setIsTogglingPlay('pause');
        setTimeout(() => setIsTogglingPlay(null), 800);
        saveHistory(videoRef.current.currentTime);
      }

      if (isHost && roomId) {
        roomService.updatePlayback(roomId, nextPlay, videoRef.current.currentTime);
      }
      resetControlsTimeout();
    }
  };

  const handleSkip = (amount: number) => {
    skipBuffer.current += amount;
    setSeekPopup({ amount: skipBuffer.current, id: Date.now() });
    if (skipTimeout.current) clearTimeout(skipTimeout.current);
    skipTimeout.current = setTimeout(() => {
      if (videoRef.current) videoRef.current.currentTime += skipBuffer.current;
      skipBuffer.current = 0;
      setSeekPopup(null);
      resetControlsTimeout();
    }, 600);
  };

  const toggleFullScreen = async () => {
    if (!document.fullscreenElement) {
      await playerContainerRef.current?.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
    resetControlsTimeout();
  };

  const setServerAndQuality = (s: any) => {
    // Save current progress before switching
    if (videoRef.current) {
        const time = videoRef.current.currentTime;
        saveHistory(time);
        
        setSelectedServer(s);
        setShowResolutions(false);
        // Video source will update, let it load then seek back
        const handler = () => {
            if (videoRef.current) {
                try {
                  videoRef.current.currentTime = time;
                  videoRef.current.play().catch(() => {});
                } catch (err) {
                  console.error("Error seeking after resolution change:", err);
                }
                videoRef.current.removeEventListener('canplay', handler);
            }
        };
        videoRef.current.addEventListener('canplay', handler);
        // Fallback for handler
        setTimeout(() => {
          if (videoRef.current) videoRef.current.removeEventListener('canplay', handler);
        }, 5000);
    } else {
        setSelectedServer(s);
        setShowResolutions(false);
    }
  };

  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const text = `Ayo marathon ${anime?.title || 'Anime'} di ChisaStream!`;
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);

    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(`${text} \n${url}`);
        setCopyToast(true);
        setTimeout(() => setCopyToast(false), 2000);
      } catch(e) {}
      return;
    }
    if (platform === 'fb') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
    if (platform === 'tg') window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
  };

  const getProxyUrl = (url: string) => url ? `https://cf.elainaa.workers.dev/${url}` : null;

  useEffect(() => {
    if (!slug || !episode) return;
    const unsubscribe = userService.subscribeToComments(slug, parseInt(episode || '0'), (data) => {
      setComments(data);
    });
    return () => unsubscribe();
  }, [slug, episode]);

  const handlePostComment = async () => {
    if (!commentInput.trim() || isPosting || !slug || !episode) return;
    
    if (!userService.isAuthenticated()) {
      showSwal('warning', 'Login Diperlukan', 'Silahkan login untuk dapat memberikan komentar.');
      return;
    }

    setIsPosting(true);
    try {
      // Ensure we have profile to get names and avatar
      const profile = userProfile || await userService.getProfile();
      if (!userProfile) setUserProfile(profile);

      const commentData: any = {
        animeSlug: slug,
        episodeIndex: parseInt(episode || '0'),
        content: commentInput.trim(),
        userId: auth.currentUser?.uid || '',
        userName: profile.name,
        userUsername: profile.username,
        userAvatar: profile.avatar,
        userExp: profile.levelInfo?.exp || 0
      };

      if (replyTo?.id) {
        commentData.parentId = replyTo.id;
      }

      await userService.addComment(commentData);
      
      // Floating EXP gain
      const expId = Date.now();
      setExpFloating(prev => [...prev, { id: expId, amount: userService.EXP_SOURCES.COMMENT }]);
      setTimeout(() => setExpFloating(prev => prev.filter(f => f.id !== expId)), 3000);
      
      setCommentInput('');
      setReplyTo(null);
      setShowEmojiPicker(false);
      
      // Refresh profile to update UI level if needed
      userService.getProfile().then(setUserProfile);
    } catch (e: any) {
      showSwal('error', 'Gagal Mengirim', 'Komentar tidak dapat dikirim saat ini.');
    } finally {
      setIsPosting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.currentTime > 5) {
        saveHistory(videoRef.current.currentTime);
      } else if (selectedServer?.type === 'iframe') {
        // Save iframe progress at least once
        saveHistory(0);
      }
    };
  }, [anime, currentEpId, selectedServer]);

  // Handle iframe history saving since we can't track time
  useEffect(() => {
    if (selectedServer?.type === 'iframe' && isVideoReady) {
      // Save after 10 seconds of "watching" an iframe
      const timer = setTimeout(() => {
        saveHistory(0);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [selectedServer, isVideoReady, currentEpId]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] font-sans text-white relative">
      <style>{`
        @keyframes shimmer { 0% { transform: translate3d(-100%, 0, 0) skewX(-20deg); } 100% { transform: translate3d(200%, 0, 0) skewX(-20deg); } }
        @keyframes popSeek { 0% { opacity: 0; transform: translateY(15px) scale(0.8); } 20% { opacity: 1; transform: translateY(0) scale(1.1); } 100% { opacity: 0; transform: translateY(-5px) scale(1); } }
        @keyframes midPop { 0% { opacity: 0; transform: scale(0.5); } 30% { opacity: 1; transform: scale(1.4); } 100% { opacity: 0; transform: scale(1.2); } }
        input[type=range] { -webkit-appearance: none; background: transparent; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: #EF4444; cursor: pointer; border: 3px solid #16161a; box-shadow: 0 0 15px rgba(246,207,128,0.4); }
      `}</style>
      
      <Navbar />

      {/* Level Up Toast */}
      <AnimatePresence>
        {levelUpData && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-10 left-10 z-[200] bg-[#16161a] border-2 border-[#EF4444] p-6 rounded-[32px] shadow-2xl flex items-center gap-6 overflow-hidden"
          >
            <div className="absolute inset-0 bg-[#EF4444]/5 animate-pulse" />
            <div className="relative z-10 w-16 h-16 bg-[#EF4444] rounded-2xl flex items-center justify-center text-black">
              <Star size={32} fill="currentColor" />
            </div>
            <div className="relative z-10">
              <h4 className="text-[#EF4444] text-xs font-black uppercase tracking-[0.3em] mb-1">LEVEL UP!</h4>
              <p className="text-white text-xl font-black">Mencapai Level {levelUpData.level}</p>
              <p className="text-white/40 text-[10px] font-medium mt-1">Kamu semakin kuat di ChisaStream!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
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

      <div className="pt-24 max-w-6xl mx-auto px-4 md:px-8 relative z-10 pb-20">
        {isLoading || isEpLoading ? <WatchSkeleton /> : (
          <>
            {/* High-End Video Player Section */}
            <div className={`bg-[#16161a] p-2 md:p-3 rounded-3xl border border-white/5 mb-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9)] relative overflow-hidden group/player ${selectedServer?.type === 'iframe' ? 'cursor-default' : ''}`}>
              <div 
                ref={playerContainerRef} 
                className={`relative w-full aspect-video bg-black overflow-hidden flex flex-col group rounded-[20px] transition-all ${selectedServer?.type === 'iframe' ? '' : 'cursor-pointer select-none'}`} 
                onMouseMove={() => selectedServer?.type !== 'iframe' && !showControls && resetControlsTimeout()} 
                onClick={(e) => selectedServer?.type !== 'iframe' && toggleControls(e)}
              >
                {!isVideoReady && selectedServer?.type !== 'iframe' && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0c] z-[60]">
                      <LottieLoading size="w-48 h-48 md:w-64 md:h-64" />
                      <div className="flex flex-col items-center gap-1.5 mt-[-20px]">
                         <p className="text-[#EF4444] text-sm font-black uppercase tracking-[0.3em] animate-pulse">Menyiapkan Streaming...</p>
                         <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.1em]">Kualitas {selectedServer?.quality || 'Auto'}</p>
                      </div>
                   </div>
                )}
                
                {selectedServer?.type === 'iframe' ? (
                  <iframe 
                    src={selectedServer.link} 
                    className="w-full h-full relative z-50 border-none opacity-100 bg-black"
                    onLoad={() => setIsVideoReady(true)}
                    allowFullScreen
                    {...({ scrolling: selectedServer.link?.includes('vidhidepro.com') ? "no" : "yes" } as any)}
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  />
                ) : (
                  <video 
                    ref={videoRef} 
                    src={getProxyUrl(selectedServer?.link) || undefined} 
                    className={`w-full h-full object-contain relative z-10 transition-opacity duration-1000 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`} 
                    onCanPlay={() => setIsVideoReady(true)}
                    onTimeUpdate={handleTimeUpdate} 
                    onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)} 
                    onWaiting={() => setIsBuffering(true)} 
                    onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
                    onEnded={() => { 
                      setIsPlaying(false); 
                      setShowControls(true);
                      if (userSettings?.autoNext && epIndex > 0) {
                        const devImgPart = devImg ? `&img=${encodeURIComponent(devImg)}` : '';
                        const devTitlePart = devTitle ? `&title=${encodeURIComponent(devTitle)}` : '';
                        const devUrlPart = devUrl ? `&url=${encodeURIComponent(devUrl)}` : '';
                        const devSuffix = searchSource === 'sanka' ? '?src=sanka' : (searchSource === 'dev' ? `?src=dev${devImgPart}${devTitlePart}${devUrlPart}` : '');
                        navigate(`/anime/${slug}/${episodes[epIndex-1].index}${devSuffix}`);
                      }
                    }}
                  />
                )}
                
                {/* Pure Mode Toggle Back */}
                <AnimatePresence>
                  {isPureMode && (
                    <motion.div 
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: 20 }}
                       className="absolute top-6 right-6 z-[100]"
                    >
                       <button 
                         onClick={(e) => { e.stopPropagation(); setIsPureMode(false); resetControlsTimeout(); }}
                         className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center text-white/40 hover:text-[#EF4444] hover:bg-black/60 transition-all shadow-2xl group"
                       >
                          <Eye size={20} className="group-hover:scale-110 transition-transform" />
                       </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Visual Feedback Overlays - Only for direct video */}
                {selectedServer?.type !== 'iframe' && (
                  <div className="absolute inset-0 z-20 flex" onClick={(e) => e.stopPropagation()}>
                    <div className="w-1/2 h-full" onDoubleClick={() => handleSkip(-10)} onClick={toggleControls}></div>
                    <div className="w-1/2 h-full" onDoubleClick={() => handleSkip(10)} onClick={toggleControls}></div>
                  </div>
                )}

                {/* Middle Action Indicator */}
                <AnimatePresence>
                  {isTogglingPlay && (
                    <motion.div initial={{opacity:0, scale:0.5}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:1.5}} className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                       <div className="bg-black/40 backdrop-blur-md p-6 md:p-10 rounded-full border border-white/10 text-[#EF4444]">
                          {isTogglingPlay === 'play' ? <Play size={32} fill="currentColor" /> : <Pause size={32} fill="currentColor" />}
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {roomId && activeRoom && (
                    <div className="absolute top-6 left-6 z-[60] flex items-center gap-2 bg-[#EF4444] text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-2xl">
                       <Users size={14} />
                       NOBAR AKTIF ({activeRoom.members.length})
                    </div>
                 )}

                {isBuffering && isVideoReady && <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-[2px]"><div className="w-16 h-16 border-4 border-[#EF4444]/20 border-t-[#EF4444] rounded-full animate-spin shadow-[0_0_30px_rgba(246,207,128,0.2)]"></div></div>}

                {seekPopup && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
                     <div className="bg-black/60 backdrop-blur-2xl p-6 md:p-8 rounded-full border border-white/10 shadow-3xl animate-[popSeek_0.5s_ease-out_forwards]">
                        <span className="text-[#EF4444] font-black text-2xl md:text-4xl italic tracking-tighter">{seekPopup.amount > 0 ? `+${seekPopup.amount}` : seekPopup.amount}s</span>
                     </div>
                  </div>
                )}

                {/* Player Interface Overlay (Header/Footer info) */}
                <div className={`absolute inset-0 z-[70] flex flex-col justify-between transition-all duration-300 pointer-events-none ${(showControls || selectedServer?.type === 'iframe') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                   {/* Header Area - Styled to match reference photo */}
                   <div className="p-4 md:p-8 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center gap-4 player-ui-element pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => navigate(-1)} 
                        className="w-12 h-12 md:w-14 md:h-14 bg-black/50 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 hover:bg-[#EF4444] hover:text-black transition-all active:scale-90 shadow-2xl"
                      >
                        <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
                      </button>
                      
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="bg-[#EF4444] text-black text-[10px] md:text-[11px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                            {anime?.type || 'SERIAL TV'}
                          </span>
                          <span className="text-white/40 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] border-l border-white/10 pl-3">
                            EPISODE {currentEpNum}
                          </span>
                        </div>
                        <h3 className="text-base md:text-3xl font-black text-white drop-shadow-2xl truncate tracking-tight uppercase">
                          {anime?.title} SUB INDO
                        </h3>
                      </div>
                   </div>

                   {/* Center Controls - Only for direct video */}
                   {selectedServer?.type !== 'iframe' && (
                    <div className="flex items-center justify-center gap-10 md:gap-24 lg:gap-32 player-ui-element pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleSkip(-10)} className="hover:text-[#EF4444] transition-all hover:scale-110 active:scale-90"><RotateCcw size={28} className="opacity-40 hover:opacity-100"/></button>
                        <button onClick={togglePlay} className="text-white transition-all transform active:scale-95">
                           {isPlaying ? <div className="p-5 md:p-8 bg-white/10 backdrop-blur-md rounded-full border border-white/10"><Pause className="w-6 h-6 md:w-10 md:h-10 fill-current" /></div> : <div className="p-5 md:p-8 bg-white/10 backdrop-blur-md rounded-full border border-white/10"><Play className="w-6 h-6 md:w-10 md:h-10 fill-current ml-1"/></div>}
                        </button>
                        <button onClick={() => handleSkip(10)} className="hover:text-[#EF4444] transition-all hover:scale-110 active:scale-90"><RotateCw size={28} className="opacity-40 hover:opacity-100"/></button>
                     </div>
                   )}

                   {/* Main Bottom Controls */}
                   {selectedServer?.type !== 'iframe' && (
                     <div className={`${selectedServer?.type === 'iframe' ? '' : 'bg-gradient-to-t from-black/80 to-transparent'} p-4 md:p-8 space-y-4 player-ui-element pointer-events-auto`} onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-2">
                           <div className="flex flex-col gap-1">
                              {selectedServer?.type !== 'iframe' ? (
                                <div className="text-[10px] md:text-sm font-black tabular-nums tracking-widest flex items-center">
                                   <span className="text-white text-base md:text-xl font-black">{formatTime(currentTime)}</span>
                                   <span className="text-white/20 mx-2 text-sm md:text-lg font-normal">/</span>
                                   <span className="text-white/40 md:text-base font-bold">{formatTime(duration)}</span>
                                </div>
                              ) : (
                                 <div className="text-[9px] font-black uppercase text-[#EF4444] tracking-widest bg-[#EF4444]/10 px-2 py-1 rounded">
                                    Server Streaming Eksternal
                                 </div>
                              )}
                           </div>
                           <div className="flex items-center gap-4 md:gap-8">
                              {/* Speed Selector - Only for direct video */}
                              {selectedServer?.type !== 'iframe' && (
                                <div className="relative">
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); setShowSpeeds(!showSpeeds); setShowResolutions(false); }} 
                                     className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${showSpeeds ? 'bg-[#EF4444] text-black' : 'text-white/60 hover:text-white bg-white/5 border border-white/5'}`}
                                   >
                                      {playbackSpeed}x
                                   </button>
                                   <AnimatePresence>
                                   {showSpeeds && (
                                     <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:10}} className="absolute bottom-full right-0 mb-3 bg-[#0a0a0c]/90 border border-white/10 rounded-xl overflow-hidden shadow-xl min-w-[90px] backdrop-blur-md z-[70] pointer-events-auto">
                                        {[0.5, 1, 1.25, 1.5, 2].map(s => (
                                          <button key={s} onClick={(e) => { e.stopPropagation(); if(videoRef.current) {videoRef.current.playbackRate = s; setPlaybackSpeed(s); setShowSpeeds(false);}}} className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${playbackSpeed === s ? 'text-[#EF4444] bg-white/5' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>{s}x</button>
                                        ))}
                                     </motion.div>
                                   )}
                                   </AnimatePresence>
                                </div>
                              )}

                              {/* Resolution Selector */}
                              <div className="relative">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); setShowResolutions(!showResolutions); setShowSpeeds(false); }} 
                                   className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${showResolutions ? 'bg-[#EF4444] text-black' : 'text-white/60 hover:text-white bg-white/5 border border-white/5'}`}
                                 >
                                    <Settings size={12} className={showResolutions ? 'animate-spin' : ''} />
                                    {selectedServer?.quality || '720p'}
                                 </button>
                                 <AnimatePresence>
                                 {showResolutions && (
                                   <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:10}} className="absolute bottom-full right-0 mb-3 bg-[#0a0a0c]/90 border border-white/10 rounded-xl overflow-hidden shadow-xl min-w-[130px] backdrop-blur-md z-[70] pointer-events-auto">
                                      {servers.map(s => (
                                        <button key={s.quality + s.name} onClick={(e) => { e.stopPropagation(); setServerAndQuality(s); }} className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-between gap-4 ${selectedServer?.quality === s.quality && selectedServer?.name === s.name ? 'text-[#EF4444] bg-white/5' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                                           {s.name}
                                           {selectedServer?.quality === s.quality && selectedServer?.name === s.name && <div className="w-1.5 h-1.5 bg-[#EF4444] rounded-full"></div>}
                                        </button>
                                      ))}
                                   </motion.div>
                                 )}
                                 </AnimatePresence>
                              </div>

                              <button onClick={toggleFullScreen} className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-[#EF4444] hover:bg-white/10 transition-all"><Maximize size={16}/></button>
                              <button 
                                 onClick={() => setIsPureMode(true)} 
                                 className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-[#EF4444] hover:bg-white/10 transition-all"
                                 title="Sembunyikan UI"
                              >
                                 <EyeOff size={16}/>
                              </button>
                              <button 
                                 onClick={() => {
                                   if (anime) {
                                     userService.addDownload({
                                       id: currentEpId || '',
                                       title: anime.title,
                                       episode: currentEpNum,
                                       slug: slug || ''
                                     });
                                     alert('Mulai mengunduh episode ' + currentEpNum + '...');
                                   }
                                 }} 
                                 className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-[#EF4444] hover:bg-white/10 transition-all"
                               >
                                 <Download size={16}/>
                               </button>

                               {!isUsingFallback && (
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     if (anime) fetchFallbackStream(anime.title, parseInt(currentEpNum));
                                   }}
                                   disabled={isFallbackLoading}
                                   className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[#EF4444] hover:bg-[#EF4444]/10 transition-all disabled:opacity-50 player-ui-element shadow-lg"
                                 >
                                    {isFallbackLoading ? <Loader2 className="animate-spin" size={12} /> : <Zap size={12} fill="currentColor" />}
                                    Try Fallback
                                 </button>
                               )}
                           </div>
                        </div>

                        {/* Video Seek Bar - Only for direct video */}
                        {selectedServer?.type !== 'iframe' ? (
                          <div className="relative h-1 md:h-1.5 w-full bg-white/10 rounded-full group/progress mx-2">
                           <div className="absolute inset-y-0 left-0 bg-[#EF4444] rounded-full shadow-[0_0_15px_rgba(246,207,128,0.5)] z-10 transition-all pointer-events-none" style={{ width: `${progress}%` }}>
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 bg-white border-[2px] border-[#16161a] rounded-full shadow-2xl scale-0 group-hover/progress:scale-100 transition-transform"></div>
                           </div>
                           <input type="range" min="0" max="100" step="0.01" value={progress || 0} onChange={(e) => { if(videoRef.current) { const time = (parseFloat(e.target.value) / 100) * duration; videoRef.current.currentTime = time; setProgress(parseFloat(e.target.value)); } }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 m-0" />
                        </div>
                        ) : null}
                     </div>
                   )}
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-4 md:gap-6 mb-12">
               <button 
                  onClick={() => {
                    if (epIndex < episodes.length-1) {
                      const ep = episodes[epIndex+1];
                      const devImgPart = devImg ? `&img=${encodeURIComponent(devImg)}` : '';
                      const devTitlePart = devTitle ? `&title=${encodeURIComponent(devTitle)}` : '';
                      const devUrlPart = devUrl ? `&url=${encodeURIComponent(devUrl)}` : '';
                      const devSuffix = searchSource === 'dev' ? `?src=dev${devImgPart}${devTitlePart}${devUrlPart}` : '';
                      navigate(`/anime/${slug}/${ep.index}${devSuffix}`);
                    }
                  }} 
                  disabled={epIndex >= episodes.length-1} 
                  className="flex-1 h-14 md:h-16 bg-[#16161a] border border-white/5 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs tracking-[0.2em] text-white/50 hover:text-white transition-all disabled:opacity-20 active:scale-95 group shadow-lg"
               >
                  <SkipBack className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Prev
               </button>
               
               <button 
                  onClick={() => {
                    if (epIndex > 0) {
                      const ep = episodes[epIndex-1];
                      const devImgPart = devImg ? `&img=${encodeURIComponent(devImg)}` : '';
                      const devTitlePart = devTitle ? `&title=${encodeURIComponent(devTitle)}` : '';
                      const devUrlPart = devUrl ? `&url=${encodeURIComponent(devUrl)}` : '';
                      const devSuffix = searchSource === 'dev' ? `?src=dev${devImgPart}${devTitlePart}${devUrlPart}` : '';
                      navigate(`/anime/${slug}/${ep.index}${devSuffix}`);
                    }
                  }} 
                  disabled={epIndex <= 0} 
                  className="flex-1 h-14 md:h-16 bg-[#EF4444] text-black rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs tracking-[0.2em] transition-all disabled:opacity-20 active:scale-95 shadow-2xl group border-b-4 border-black/10"
               >
                  Next EP <SkipForward className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
             
             {/* PILIH SERVER STREAMING (Pilihan Server/Provider) */}
             <section className="mb-12 relative z-20">
                <div 
                    className="flex items-center gap-4 mb-4 cursor-pointer group/header"
                    onClick={() => setIsServerSectionOpen(!isServerSectionOpen)}
                >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-200 ${isServerSectionOpen ? 'bg-[#EF4444]/10 border-[#EF4444]/20' : 'bg-white/5 border-white/5'}`}>
                        <Server className={`w-6 h-6 ${isServerSectionOpen ? 'text-[#EF4444]' : 'text-white/40'}`} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">PILIH SERVER</h3>
                            <div className={`p-1 rounded-lg transition-all duration-200 ${isServerSectionOpen ? 'rotate-180 bg-[#EF4444]/10 text-[#EF4444]' : 'rotate-0 bg-white/5 text-white/20'}`}>
                                <ChevronDown size={18} />
                            </div>
                        </div>
                        <p className="text-[10px] md:text-xs font-bold text-white/20 uppercase tracking-[0.2em] leading-none mt-1">
                            {isServerSectionOpen ? 'Klik untuk menutup pilihan server' : 'Klik untuk memunculkan pilihan server'}
                        </p>
                    </div>
                    <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5 hidden md:flex items-center gap-3">
                       <Activity className={`w-3 h-3 animate-pulse transition-colors ${isServerSectionOpen ? 'text-[#EF4444]' : 'text-white/10'}`} />
                       <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{servers.length} Server Aktif</span>
                    </div>
                </div>
                
                {isServerSectionOpen && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 py-4">
                        {servers.map((s, idx) => {
                            const isSelected = selectedServer?.quality === s.quality && selectedServer?.name === s.name;
                            const nameLower = s.name.toLowerCase();
                            
                            return (
                                <button
                                    key={`${s.quality}-${s.name}-${idx}`}
                                    onClick={() => setServerAndQuality(s)}
                                    className={`relative p-4 rounded-[20px] border transition-none flex flex-col items-start gap-3 active:scale-95 overflow-hidden ${isSelected ? 'bg-[#EF4444] border-[#EF4444]' : 'bg-[#16161a] border-white/5 hover:bg-[#1a1a1f]'}`}
                                >
                                    <div className="flex items-center justify-between w-full relative z-10">
                                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-black/10 text-black' : 'text-[#EF4444]'}`}>
                                            {nameLower.includes('blogger') ? <Globe size={18} /> : 
                                            nameLower.includes('filedon') ? <Cloud size={18} /> : 
                                            <Server size={18} />}
                                        </div>
                                        <div className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full ${isSelected ? 'bg-black/10 text-black' : 'bg-white/5 text-white/40'}`}>
                                            {s.quality}
                                        </div>
                                    </div>
                                    
                                    <div className="relative z-10 text-left">
                                        <p className={`text-xs font-black uppercase tracking-tight ${isSelected ? 'text-black' : 'text-white/90'}`}>{s.name || 'Default'}</p>
                                        <p className={`text-[8px] font-bold uppercase tracking-[0.1em] mt-0.5 ${isSelected ? 'text-black/60' : 'text-white/20'}`}>
                                            {s.type === 'iframe' ? 'Iframe Stream' : 'Direct Player'}
                                        </p>
                                    </div>

                                    {isSelected && (
                                        <div className="absolute top-3 right-3">
                                            <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
             </section>


            {/* SEBARKAN KESERUAN INI (Refined Alignment & Background) */}
            <section className="relative mb-12 max-w-6xl mx-auto z-20 px-4 md:px-0">
               <div className="relative bg-[#16161a] p-6 md:p-10 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                  {/* Background Cover with Left-to-Right Dark Gradient */}
                  <div className="absolute inset-0 z-0">
                     <img 
                       src={getImageUrl(anime?.image_cover || anime?.image_poster)} 
                       onError={(e) => handleImageError(e, anime?.image_cover || anime?.image_poster)}
                       className="w-full h-full object-cover opacity-30 scale-105" 
                       alt="" 
                     />
                     {/* Gradient: Dark on left, transparent on right */}
                     <div className="absolute inset-0 bg-gradient-to-r from-[#16161a] via-[#16161a]/80 to-transparent"></div>
                  </div>
                  
                  <div className="relative z-10 flex flex-col items-start gap-8">
                     <div className="text-left">
                        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mb-1">SEBARKAN KESERUAN INI!</h2>
                        <p className="text-white/40 text-[11px] md:text-xs font-medium">Ajak teman-temanmu marathon anime favorit bareng di ChisaStream.</p>
                     </div>

                     <div className="flex flex-wrap items-center justify-start gap-4">
                        <button 
                          onClick={() => handleShare('copy')}
                          className="h-11 px-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center gap-3 text-white hover:bg-white/10 transition-all font-bold text-xs shadow-xl active:scale-95"
                        >
                           <Copy size={16} className="text-[#EF4444]" />
                           <span>Salin Link</span>
                        </button>

                        <div className="flex items-center gap-3">
                           <button onClick={() => handleShare('fb')} className="w-11 h-11 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-all shadow-xl active:scale-90">
                              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                           </button>

                           <button onClick={() => handleShare('tg')} className="w-11 h-11 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center text-[#229ED9] hover:bg-[#229ED9] hover:text-white transition-all shadow-xl active:scale-90">
                              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M11.944 0C5.346 0 0 5.346 0 11.944s5.346 11.944 11.944 11.944 11.944-5.346 11.944-11.944S18.542 0 11.944 0zm5.831 7.422l-1.93 9.098c-.145.656-.534.819-1.084.512l-2.941-2.167-1.42 1.366c-.156.156-.289.289-.59.289l.211-2.99 5.442-4.913c.236-.211-.051-.328-.367-.12l-6.726 4.237-2.9-.906c-.633-.197-.645-.633.131-.937l11.332-4.37c.524-.191.982.122.842.941z"/></svg>
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </section>

            {/* List Episode (Refined Grid) */}
            <div className="bg-[#16161a]/40 backdrop-blur-md p-6 md:p-8 rounded-[32px] border border-white/5 mb-20 shadow-2xl relative z-10">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-white/5 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#EF4444]/10 rounded-xl flex items-center justify-center border border-[#EF4444]/20"><LayoutGrid className="w-5 h-5 text-[#EF4444]" /></div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight">SEMUA EPISODE</h3>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Total {episodes.length} Tersedia</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                      <div className="relative group flex-1 md:flex-none">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#EF4444] transition-colors" />
                         <input 
                           type="text" 
                           placeholder="Cari episode.." 
                           value={searchQuery} 
                           onChange={(e) => setSearchQuery(e.target.value)} 
                           className="bg-black/40 border border-white/5 rounded-xl pl-10 pr-6 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#EF4444]/40 w-full md:w-48 transition-all shadow-inner" 
                         />
                      </div>
                      {totalPages > 1 && (
                         <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner">
                            <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-white disabled:opacity-0 transition-colors"><ChevronLeft size={16}/></button>
                            <span className="text-[10px] font-black text-white/30 tracking-widest px-1">{currentPage + 1} / {totalPages}</span>
                            <button disabled={currentPage === totalPages - 1} onClick={() => setCurrentPage(p => p + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-white disabled:opacity-0 transition-colors"><ChevronRight size={16}/></button>
                         </div>
                      )}
                  </div>
               </div>
               
               <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                  {paginatedEps.map(ep => (
                    <button 
                      key={ep.id} 
                      onClick={() => {
                        const devImgPart = devImg ? `&img=${encodeURIComponent(devImg)}` : '';
                        const devTitlePart = devTitle ? `&title=${encodeURIComponent(devTitle)}` : '';
                        const devUrlPart = devUrl ? `&url=${encodeURIComponent(devUrl)}` : '';
                        const devSuffix = searchSource === 'dev' ? `?src=dev${devImgPart}${devTitlePart}${devUrlPart}` : '';
                        navigate(`/anime/${slug}/${ep.index}${devSuffix}`);
                      }} 
                      className={`h-10 rounded-lg flex items-center justify-center font-black text-[11px] transition-all transform active:scale-90 relative overflow-hidden ${episode === ep.index.toString() ? 'bg-[#EF4444] text-black shadow-[0_10px_20px_rgba(246,207,128,0.2)]' : 'bg-black/30 text-white/20 border border-white/5 hover:text-[#EF4444] hover:bg-white/5'}`}
                    >
                      {ep.index}
                    </button>
                  ))}
               </div>
            </div>

            {/* Centered Details Section (Ref Image 1: Black Clover Style) */}
            {anime && (
               <div className="relative mt-20 mb-24 flex flex-col items-center">
                  {/* Poster (Ref Image Style) */}
                  <div className="relative w-48 md:w-56 aspect-[3/4.2] rounded-[24px] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.8)] border border-white/10 mb-10 group">
                    {anime.image_poster ? (
                      <img 
                        src={getImageUrl(anime.image_poster)} 
                        onError={(e) => handleImageError(e, anime.image_poster)}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        alt="" 
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5" />
                    )}
                  </div>

                  <div className="text-center max-w-4xl px-4">
                    <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-2 leading-none">
                      {anime.title}
                    </h2>
                    <p className="text-white/20 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] mb-10">
                       {anime.alternative_title || anime.title?.split(' ').join(', ')}
                    </p>

                    <div className="flex flex-wrap justify-center gap-3 mb-12">
                       <span className="bg-[#EF4444] text-black text-[9px] font-black px-5 py-2 rounded-lg uppercase tracking-widest leading-none flex items-center">{anime.type || 'SERIES'}</span>
                       <span className="bg-white/5 text-white/60 text-[9px] font-black px-5 py-2 rounded-lg uppercase tracking-widest border border-white/5 leading-none flex items-center">{anime.status || 'FINISHED'}</span>
                       <span className="bg-white/5 text-white/60 text-[9px] font-black px-5 py-2 rounded-lg uppercase tracking-widest border border-white/5 leading-none flex items-center">{anime.year || '2017-10-03'}</span>
                       <div className="flex items-center gap-2 text-[#EF4444] font-black text-[9px] px-5 py-2 bg-[#EF4444]/5 rounded-lg border border-[#EF4444]/10 tracking-widest leading-none">
                         <Star size={12} fill="currentColor"/> {anime.favorites || '23650'}
                       </div>
                    </div>

                    <p className="text-white/60 text-sm md:text-base leading-relaxed font-medium text-center balance mb-16">
                       {anime.synopsis}
                    </p>

                    {/* Metadata Table (Refined) */}
                    <div className="w-full max-w-3xl mx-auto space-y-6 border-t border-white/5 pt-10">
                       <div className="flex justify-between items-center text-left group">
                          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">STUDIO</span>
                          <span className="text-xs md:text-sm font-bold text-white group-hover:text-[#EF4444] transition-colors uppercase">{anime.studio || 'Studio Pierrot'}</span>
                       </div>
                       <div className="flex justify-between items-center text-left group border-t border-white/5 pt-6">
                          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">TAHUN</span>
                          <span className="text-xs md:text-sm font-bold text-white group-hover:text-[#EF4444] transition-colors">{anime.year || '2021'}</span>
                       </div>
                       <div className="flex flex-col md:flex-row md:items-start justify-between text-left md:text-right group border-t border-white/5 pt-6 gap-4 md:gap-8">
                          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] shrink-0 text-left pt-0.5">GENRE</span>
                          <div className="flex flex-wrap md:justify-end gap-x-2 gap-y-1">
                             {anime.genre?.split(',').map((g: string, idx: number) => (
                                <span key={idx} className="text-xs md:text-sm font-bold text-[#EF4444] hover:text-white transition-colors">
                                   {g.trim()}{idx !== (anime.genre?.split(',').length - 1) ? ',' : ''}
                                </span>
                             )) || 'Action, Adventure, Fantasy, Shounen'}
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
            )}

            {/* Recommended Section - Improved robustness */}
            <div className="space-y-8 mt-20">
               <div className="flex flex-col text-left mb-8">
                  <h3 className="text-[#EF4444] font-black uppercase text-[10px] tracking-[0.4em] mb-2 flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-[#EF4444]"></div>
                    Smart AI Pick
                  </h3>
                  <h3 className="text-white font-black uppercase text-xl md:text-3xl tracking-tight">Mungkin Kamu Suka</h3>
               </div>

               {recommendations.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    {recommendations.map((a, i) => (
                      <motion.div 
                        key={a.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => navigate(animeService.getAnimePath(a))} 
                        className="w-full group cursor-pointer relative bg-[#16161a] border border-white/5 rounded-xl overflow-hidden hover:bg-white/[0.04] transition-all shadow-xl h-28 md:h-36"
                      >
                         {/* Banner Backdrop */}
                         <div className="absolute right-0 top-0 bottom-0 w-3/4 z-0">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#16161a] via-[#16161a]/40 to-transparent z-10"></div>
                            <img 
                              src={getImageUrl(a.image_cover || a.image_poster)} 
                              onError={(e) => handleImageError(e, a.image_cover || a.image_poster)}
                              className="w-full h-full object-cover opacity-10 group-hover:opacity-30 transition-all duration-700 group-hover:scale-110" 
                              alt="" 
                            />
                         </div>

                         <div className="relative z-10 p-3 md:p-5 h-full flex items-center gap-4 md:gap-6">
                            {/* Poster */}
                            <div className="w-14 h-20 md:w-18 md:h-26 rounded-xl overflow-hidden shrink-0 shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-500">
                               <img 
                                 src={getImageUrl(a.image_poster)} 
                                 onError={(e) => handleImageError(e, a.image_poster)}
                                 className="w-full h-full object-cover" 
                                 alt="" 
                               />
                            </div>

                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2 mb-1">
                                  <Star size={10} className="text-[#EF4444] fill-[#EF4444]" />
                                  <span className="text-[9px] font-black text-[#EF4444] uppercase tracking-widest">{a.favorites || '8.5'}</span>
                               </div>
                               <h4 className="text-xs md:text-base font-black text-white uppercase tracking-tight line-clamp-1 group-hover:text-[#EF4444] transition-colors">{a.title}</h4>
                               <p className="text-[8px] md:text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mt-1 group-hover:text-white/40 transition-colors truncate">{a.genre?.split(',').slice(0, 2).join(', ') || 'Action'}</p>
                            </div>
                            
                            <div className="ml-auto pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <div className="w-8 h-8 rounded-full bg-[#EF4444] flex items-center justify-center text-black">
                                  <Play size={14} fill="currentColor" />
                               </div>
                            </div>
                         </div>
                      </motion.div>
                    ))}
                  </div>
               ) : (
                  <div className="flex items-center justify-center py-10 opacity-20 text-xs font-black uppercase tracking-widest">
                     Mencari rekomendasi spesial untukmu...
                  </div>
               )}
            </div>

            {/* Comment Section */}
            <section className="mb-32 mt-32">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-[#EF4444]/10 rounded-2xl flex items-center justify-center border border-[#EF4444]/20">
                  <MessageCircle className="w-6 h-6 text-[#EF4444]" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">DISKUSI STREAM</h3>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em]">{comments.length} Komentar Realtime</p>
                </div>
              </div>

              {/* Comment Form */}
              <div className="bg-[#16161a] rounded-[32px] p-6 mb-12 border border-white/5 relative group">
                <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-[#EF4444]/40 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
                
                {replyTo && (
                  <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 mb-4 border border-white/5">
                    <div className="flex items-center gap-3">
                      <Reply size={14} className="text-[#EF4444]" />
                      <span className="text-[10px] font-bold text-white/40">Membalas <span className="text-[#EF4444]">@{replyTo.userUsername}</span></span>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="text-[10px] font-black uppercase text-red-500/60 hover:text-red-500">Batal</button>
                  </div>
                )}

                <div className="flex gap-4">
                  <div className="hidden md:block w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/5 bg-[#16161a] shrink-0">
                    <img 
                      src={getImageUrl(auth.currentUser?.photoURL || 'https://repgyetdcodkynrbxocg.supabase.co/storage/v1/object/public/images/telegram-1778401091005-146ffc5f.jpg')} 
                      onError={(e) => handleImageError(e, auth.currentUser?.photoURL || 'https://repgyetdcodkynrbxocg.supabase.co/storage/v1/object/public/images/telegram-1778401091005-146ffc5f.jpg')}
                      className="w-full h-full object-cover" 
                      alt="" 
                    />
                  </div>
                  <div className="flex-1 relative">
                    <textarea 
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="Bagikan pendapatmu tentang episode ini..."
                      className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm font-medium text-white/90 focus:outline-none focus:border-[#EF4444]/30 min-h-[100px] transition-all scrollbar-hide resize-none"
                    />
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showEmojiPicker ? 'bg-[#EF4444] text-black shadow-lg shadow-[#EF4444]/20' : 'bg-white/5 text-white/30 hover:text-[#EF4444] hover:bg-white/10'}`}
                        >
                          <Smile size={18} />
                        </button>
                        
                        {showEmojiPicker && (
                          <div className="absolute bottom-12 left-0 z-50 bg-[#16161a] p-3 rounded-2xl border border-white/10 shadow-3xl grid grid-cols-6 gap-2">
                            {['🔥', '😍', '✨', '😱', '😂', '😭', '🙌', '💯', '❤️', '👍', '💪', '🍿'].map(emoji => (
                              <button 
                                key={emoji} 
                                onClick={() => { setCommentInput(prev => prev + emoji); setShowEmojiPicker(false); }}
                                className="w-8 h-8 flex items-center justify-center text-lg hover:scale-125 transition-transform"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={handlePostComment}
                        disabled={!commentInput.trim() || isPosting}
                        className={`h-11 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 ${commentInput.trim() ? 'bg-[#EF4444] text-black shadow-xl shadow-[#EF4444]/20' : 'bg-white/5 text-white/10 cursor-not-allowed'}`}
                      >
                        {isPosting ? 'Mengirim...' : 'Kirim Komentar'}
                        <Send size={14} className={isPosting ? 'animate-pulse' : ''} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-6">
                {comments.length > 0 ? (
                  comments.filter(c => !c.parentId).map((comment, idx) => (
                    <motion.div 
                      key={comment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="group/comment"
                    >
                      <div className="flex gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-[16px] md:rounded-[20px] overflow-hidden border-2 border-white/5 bg-[#16161a] shrink-0 mt-1 ring-offset-[#0a0a0c] ring-offset-2 ring-transparent group-hover/comment:ring-[#EF4444]/20 transition-all">
                          <img src={getImageUrl(comment.userAvatar)} onError={(e) => handleImageError(e, comment.userAvatar)} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-white hover:text-[#EF4444] transition-colors cursor-pointer">{comment.userName}</span>
                                <span className="text-[10px] font-bold text-white/20 tracking-tighter">@{comment.userUsername}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <div className="px-1.5 py-0.5 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded text-[7px] font-black text-[#EF4444] uppercase tracking-widest">
                                  LVL {getLevelFromExp(comment.userExp || 0)}
                                </div>
                                <span className="w-1 h-1 bg-white/10 rounded-full" />
                                <span className="text-[10px] font-bold text-white/20 uppercase">
                                  {comment.createdAt?.toDate ? new Date(comment.createdAt.toDate()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Baru aja'}
                                </span>
                              </div>
                            </div>
                            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/10 hover:text-white transition-all">
                              <MoreVertical size={14} />
                            </button>
                          </div>
                          
                          <p className="text-xs md:text-sm font-medium text-white/60 leading-relaxed max-w-2xl">{comment.content}</p>
                          
                          <div className="flex items-center gap-6 pt-1">
                             <button 
                               onClick={() => { 
                                 setReplyTo(comment);
                                 const textarea = document.querySelector('textarea');
                                 textarea?.focus();
                               }}
                               className="text-[10px] font-black uppercase tracking-widest text-[#EF4444]/40 hover:text-[#EF4444] transition-colors flex items-center gap-2"
                             >
                                <Reply size={12} />
                                Balas
                             </button>
                             {/* Only show delete if owner */}
                             {auth.currentUser?.uid === comment.userId && (
                               <button 
                                 onClick={async () => {
                                   const result = await Swal.fire({
                                     title: 'Hapus Komentar?',
                                     text: 'Komentar yang dihapus tidak dapat dikembalikan.',
                                     icon: 'warning',
                                     showCancelButton: true,
                                     confirmButtonColor: '#EF4444',
                                     cancelButtonColor: '#d33',
                                     confirmButtonText: 'Ya, Hapus!',
                                     cancelButtonText: 'Batal',
                                     background: '#16161a',
                                     color: '#fff'
                                   });
                                   if (result.isConfirmed) {
                                     await userService.deleteComment(comment.id!);
                                   }
                                 }}
                                 className="text-[10px] font-black uppercase tracking-widest text-red-500/20 hover:text-red-500 transition-colors flex items-center gap-2"
                               >
                                  <Trash2 size={12} />
                                  Hapus
                               </button>
                             )}
                          </div>

                          {/* Replies */}
                          {comments.some(r => r.parentId === comment.id) && (
                            <div className="space-y-4 pt-4 ml-2 pl-6 border-l border-white/5 relative">
                              <div className="absolute left-0 top-0 bottom-8 w-px bg-gradient-to-b from-[#EF4444]/20 via-white/5 to-transparent" />
                              
                              {(() => {
                                const threadReplies = comments.filter(r => r.parentId === comment.id);
                                const isExpanded = expandedThreads.includes(comment.id!);
                                const displayedReplies = isExpanded ? threadReplies : threadReplies.slice(0, 2);

                                return (
                                  <>
                                    {displayedReplies.map(reply => (
                                      <div key={reply.id} className="flex gap-4 group/reply animate-in fade-in slide-in-from-left-4 duration-300">
                                        <div className="w-8 h-8 rounded-xl overflow-hidden border-2 border-white/5 bg-[#16161a] shrink-0 group-hover/reply:border-[#EF4444]/20 transition-all">
                                          <img src={getImageUrl(reply.userAvatar)} onError={(e) => handleImageError(e, reply.userAvatar)} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[12px] font-black text-white/80">{reply.userName}</span>
                                            <span className="text-[9px] font-bold text-white/20">@{reply.userUsername}</span>
                                            <span className="w-1 h-1 bg-white/10 rounded-full" />
                                            <span className="text-[9px] font-bold text-white/20 uppercase text-right">
                                              {reply.createdAt?.toDate ? new Date(reply.createdAt.toDate()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Baru saja'}
                                            </span>
                                          </div>
                                          <p className="text-[12px] font-medium text-white/50 leading-relaxed">{reply.content}</p>
                                          <div className="flex items-center gap-4">
                                            <button 
                                              onClick={() => {
                                                setReplyTo(comment);
                                                setCommentInput(`@${reply.userUsername} `);
                                                const textarea = document.querySelector('textarea');
                                                textarea?.focus();
                                              }}
                                              className="text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-[#EF4444] transition-colors flex items-center gap-1.5"
                                            >
                                               <Reply size={10} />
                                               Balas
                                            </button>
                                            
                                            {auth.currentUser?.uid === reply.userId && (
                                              <button 
                                                onClick={async () => {
                                                  const result = await Swal.fire({
                                                    title: 'Hapus Balasan?',
                                                    text: 'Balasan yang dihapus tidak dapat dikembalikan.',
                                                    icon: 'warning',
                                                    showCancelButton: true,
                                                    confirmButtonColor: '#EF4444',
                                                    cancelButtonColor: '#d33',
                                                    confirmButtonText: 'Ya, Hapus!',
                                                    cancelButtonText: 'Batal',
                                                    background: '#16161a',
                                                    color: '#fff'
                                                  });
                                                  if (result.isConfirmed) {
                                                    await userService.deleteComment(reply.id!);
                                                  }
                                                }}
                                                className="text-[9px] font-black uppercase tracking-widest text-red-500/20 hover:text-red-500 transition-colors"
                                              >
                                                 Hapus
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}

                                    {threadReplies.length > 2 && (
                                      <button 
                                        onClick={() => toggleThread(comment.id!)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-[#EF4444]/10 hover:text-[#EF4444] rounded-xl text-[10px] font-black uppercase tracking-widest text-white/30 transition-all group/expand"
                                      >
                                        <MessageCircle size={12} className="group-hover/expand:scale-110 transition-transform" />
                                        {isExpanded ? 'Tampilkan Lebih Sedikit' : `Lihat ${threadReplies.length - 2} Balasan Lainnya`}
                                      </button>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-6 bg-white/[0.02] rounded-[48px] border border-dashed border-white/10">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/10">
                      <MessageCircle size={32} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white/30 uppercase tracking-[0.2em]">Belum ada Diskusi</h4>
                      <p className="text-[10px] font-bold text-white/10 uppercase tracking-widest">Jadilah yang pertama untuk memulai percakapan!</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <div className="relative z-10">
        {/* Copy Toast Notification */}
        <AnimatePresence>
          {copyToast && (
            <motion.div initial={{y:100, opacity:0, x:'-50%'}} animate={{y:0, opacity:1, x:'-50%'}} exit={{y:100, opacity:0, x:'-50%'}} className="fixed bottom-32 left-1/2 bg-[#EF4444] text-black px-10 py-4 rounded-[28px] font-black text-sm z-[9999] shadow-[0_20px_50px_rgba(246,207,128,0.4)] flex items-center gap-4">
               <Share2 size={18} />
               Tautan Episode Berhasil Disalin!
            </motion.div>
          )}
        </AnimatePresence>
        <Footer />
      </div>
    </div>
  );
};

const DetailRow = ({ label, value, isGenre }: { label: string, value: string, isGenre?: boolean }) => (
  <div className="flex items-center justify-between py-4 border-b border-white/5">
     <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] shrink-0">{label}</span>
     <span className={`text-[10px] md:text-xs font-black uppercase text-right truncate pl-10 ${isGenre ? 'text-[#EF4444]' : 'text-white'}`}>{value}</span>
  </div>
);

export default Watch;
