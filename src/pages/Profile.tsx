import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Bookmark, Download, Settings, LogOut, ChevronRight, 
  Edit3, Camera, Clock, Play, Trash2, History as HistoryIcon, 
  Loader2, Save, Lock, Shield, Trash, Info, Check, X, HelpCircle,
  Monitor, Smartphone, Bell, Eye, EyeOff, Key, Users, MessageCircle,
  Server
} from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { auth } from '../lib/firebase';
import { getImageUrl, handleImageError } from '../lib/imageUtils';
import { 
  userService, UserProfile, UserStats, Bookmark as BookmarkType, 
  DownloadItem, HistoryItem, UserSettings,
  getLevelFromExp, getExpForNextLevel, getProgressToNextLevel, EXP_PER_LEVEL
} from '../services/userService';
import { animeService } from '../services/animeService';
import { 
  Star, Zap, Trophy, Target, Award, Flame, 
  ChevronDown, ChevronUp, Sparkles, Medal,
  Coins, Instagram, Facebook, MessageCircle as WhatsApp, Link as LinkIcon, Twitter, 
  Plus, ExternalLink
} from 'lucide-react';

const MySwal = withReactContent(Swal);

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({ animeWatched: 0, animeSaved: 0, hoursWatched: 0 });
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'menu' | 'watchlist' | 'downloads' | 'history' | 'settings'>('menu');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', username: '', bio: '' });
  const [links, setLinks] = useState<{platform: any, url: string}[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>({ autoNext: true, autoSkipOpEd: false, showContinueWatching: true });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      if (!userService.isAuthenticated()) {
        navigate('/login', { state: { from: location }, replace: true });
        return;
      }

      setLoading(true);
      try {
        const [prof, st, bms, dls, hist] = await Promise.all([
          userService.getProfile(),
          userService.getStats(),
          userService.getBookmarks(),
          userService.getDownloads(),
          userService.getHistory()
        ]);
        setProfile(prof);
        setStats(st);
        setBookmarks(bms);
        setDownloads(dls);
        setHistory(hist);
        setEditData({ 
          name: prof.name, 
          username: prof.username, 
          bio: prof.bio || '' 
        });
        setLinks(prof.links || []);
        setRecommendations(prof.recommendations || []);
        if (prof.settings) setUserSettings(prof.settings);
      } catch (err) {
        console.error('Error fetching profile data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    window.addEventListener('profile-update', fetchData);
    
    // Real-time online users subscription
    const unsubscribeOnline = userService.subscribeToOnlineUsers((online) => {
      setOnlineUsers(online);
    });

    return () => {
      unsubscribeOnline();
      window.removeEventListener('profile-update', fetchData);
    };
  }, [navigate]);

  const handleLogout = async () => {
    const result = await MySwal.fire({
      title: 'Keluar Akun?',
      text: 'Kamu akan keluar dari sesi ini.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal',
      background: '#16161a',
      color: '#fff',
      confirmButtonColor: '#F6CF80',
      cancelButtonColor: '#333'
    });

    if (result.isConfirmed) {
      await userService.testConnection(); // wake up firebase if needed
      await userService.logout();
      navigate('/');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(type);
    try {
      const url = await userService.uploadImage(file);
      const updatedProfile = { ...profile, [type]: url };
      await userService.saveProfile({ [type]: url });
      setProfile(updatedProfile);
      
      MySwal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `${type === 'avatar' ? 'Avatar' : 'Banner'} berhasil diperbarui`,
        showConfirmButton: false,
        timer: 3000,
        background: '#16161a',
        color: '#fff'
      });
    } catch (err) {
      MySwal.fire({
        icon: 'error',
        title: 'Gagal upload',
        text: 'Silakan coba lagi nanti.',
        background: '#16161a',
        color: '#fff',
        confirmButtonColor: '#F6CF80'
      });
    } finally {
      setUploading(null);
    }
  };

  const saveProfileChanges = async () => {
    if (!profile || !editData.name.trim() || !editData.username.trim()) return;
    try {
      const username = editData.username.replace('@', '');
      const update = { 
        name: editData.name, 
        username, 
        bio: editData.bio,
        links,
        recommendations
      };
      await userService.updateProfileFields(update);
      setProfile({ ...profile, ...update });
      setIsEditing(false);
      
      MySwal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Profil diperbarui',
        showConfirmButton: false,
        timer: 3000,
        background: '#16161a',
        color: '#fff'
      });
    } catch (err) {
      alert('Gagal menyimpan perubahan.');
    }
  };

  const clearAllHistory = async () => {
    const result = await MySwal.fire({
      title: 'Hapus Semua Riwayat?',
      text: 'Tindakan ini tidak bisa dibatalkan!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus Semua',
      cancelButtonText: 'Batal',
      background: '#16161a',
      color: '#fff',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#333'
    });

    if (result.isConfirmed) {
      await userService.clearHistory();
      setHistory([]);
      const updatedStats = await userService.getStats();
      setStats(updatedStats);
      MySwal.fire({
        icon: 'success',
        title: 'Dibersihkan',
        text: 'Semua riwayat telah dihapus.',
        background: '#16161a',
        color: '#fff',
        confirmButtonColor: '#F6CF80'
      });
    }
  };

  const clearAllBookmarks = async () => {
    const result = await MySwal.fire({
      title: 'Hapus Semua Bookmark?',
      text: 'Semua anime yang kamu simpan akan hilang!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus Semua',
      cancelButtonText: 'Batal',
      background: '#16161a',
      color: '#fff',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#333'
    });

    if (result.isConfirmed) {
      await userService.clearBookmarks();
      setBookmarks([]);
      const updatedStats = await userService.getStats();
      setStats(updatedStats);
      MySwal.fire({
        icon: 'success',
        title: 'Dibersihkan',
        text: 'Semua bookmark telah dihapus.',
        background: '#16161a',
        color: '#fff',
        confirmButtonColor: '#F6CF80'
      });
    }
  };

  const handleDeleteAccount = async () => {
    const result = await MySwal.fire({
      title: 'Hapus Akun Permanen?',
      text: 'Semua data kamu akan dihapus selamanya!',
      icon: 'error',
      showCancelButton: true,
      confirmButtonText: 'YA, HAPUS AKUN SAYA',
      cancelButtonText: 'BATAL',
      background: '#16161a',
      color: '#fff',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#333'
    });

    if (result.isConfirmed) {
      try {
        await userService.deleteAccount();
        navigate('/');
      } catch (err: any) {
        MySwal.fire({
          icon: 'error',
          title: 'Gagal Menghapus',
          text: 'Kamu mungkin perlu login ulang sebelum menghapus akun karena ini tindakan sensitif.',
          background: '#16161a',
          color: '#fff',
          confirmButtonColor: '#F6CF80'
        });
      }
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = await userService.updateSettings(newSettings);
    if (updated) {
       setUserSettings(updated);
       window.dispatchEvent(new CustomEvent('profile-update'));
       MySwal.fire({
         toast: true,
         position: 'top-end',
         icon: 'success',
         title: 'Pengaturan disimpan',
         showConfirmButton: false,
         timer: 2000,
         background: '#16161a',
         color: '#fff'
       });
    }
  };

  const handleChangePassword = async () => {
    // Firebase simple way is sending reset email
    const email = auth.currentUser?.email;
    if (!email) return;

    const result = await MySwal.fire({
      title: 'Ganti Kata Sandi?',
      text: `Kami akan mengirimkan email instruksi ke ${email}`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Kirim Email',
      background: '#16161a',
      color: '#fff',
      confirmButtonColor: '#F6CF80'
    });

    if (result.isConfirmed) {
      // In real app, call firebase sendPasswordResetEmail
      MySwal.fire({
        icon: 'success',
        title: 'Email Terkirim',
        text: 'Cek kotak masuk email kamu.',
        background: '#16161a',
        color: '#fff'
      });
    }
  };

  const handleBookmarkClick = async (anime: BookmarkType) => {
    const currentServer = userSettings.apiServer || 'main';
    const animeServer = anime.server || 'main';

    if (currentServer === animeServer) {
        const sankaParam = currentServer === 'sanka' ? '?src=sanka' : '';
        navigate(`/anime/${anime.slug}${sankaParam}`);
        return;
    }

    // Cross-server logic
    MySwal.fire({
        title: `Mencari di Server ${currentServer === 'sanka' ? '2' : 'Utama'}...`,
        didOpen: () => { MySwal.showLoading(); },
        background: '#16161a',
        color: '#fff',
        allowOutsideClick: false,
        showConfirmButton: false
    });
    
    try {
        const res = await animeService.searchAnime(anime.title, currentServer === 'sanka' ? 1 : 0);
        const searchResults: any[] = (currentServer === 'sanka' && (res as any).data) ? (res as any).data : (Array.isArray(res) ? res : []);
        
        if (searchResults && searchResults.length > 0) {
            // Priority matching by title
            const bestMatch = searchResults.find(a => a.title?.toLowerCase() === anime.title?.toLowerCase()) || searchResults[0];
            MySwal.close();
            const sankaParam = currentServer === 'sanka' ? '?src=sanka' : '';
            navigate(`/anime/${bestMatch.slug || bestMatch.id}${sankaParam}`);
        } else {
            MySwal.fire({
                icon: 'error',
                title: 'Tidak Ditemukan',
                text: `Anime ini tidak tersedia di Server ${currentServer === 'sanka' ? '2' : 'Utama'}.`,
                background: '#16161a',
                color: '#fff'
            });
        }
    } catch (e) {
        MySwal.fire({
          icon: 'error',
          title: 'Kesalahan Sistem',
          text: 'Gagal menghubungkan ke server.',
          background: '#16161a',
          color: '#fff'
        });
    }
  };

  const removeBookmark = async (slug: string) => {
    await userService.toggleBookmark({ slug } as any);
    const updated = await userService.getBookmarks();
    setBookmarks(updated);
    const updatedStats = await userService.getStats();
    setStats(updatedStats);
  };

  const handleAddRecommendation = async () => {
    const { value: title } = await MySwal.fire({
      title: 'Cari Anime Favorit',
      input: 'text',
      inputPlaceholder: 'Ketik judul anime...',
      background: '#16161a',
      color: '#fff',
      confirmButtonColor: '#F6CF80',
      showCancelButton: true,
      cancelButtonText: 'Batal',
      confirmButtonText: 'Cari',
    });

    if (!title) return;

    MySwal.fire({
      title: 'Mencari...',
      didOpen: () => { MySwal.showLoading(); },
      background: '#16161a',
      color: '#fff',
      allowOutsideClick: false,
      showConfirmButton: false
    });

    try {
      const isSanka = location.search.includes('src=sanka');
      const apiServer = isSanka ? 'sanka' : (profile?.settings?.apiServer || 'main');
      const res = await animeService.searchAnime(title, apiServer === 'sanka' ? 1 : 0);
      const searchResults: any[] = (apiServer === 'sanka' && (res as any).data) ? (res as any).data : (Array.isArray(res) ? res : []);
      
      MySwal.close();

      if (searchResults && searchResults.length > 0) {
        const { value: selectedIdx } = await MySwal.fire({
          title: 'Pilih Anime',
          input: 'select',
          inputOptions: Object.fromEntries(searchResults.slice(0, 5).map((a, i) => [i, a.title])),
          inputPlaceholder: 'Pilih salah satu',
          background: '#16161a',
          color: '#fff',
          confirmButtonColor: '#F6CF80',
          showCancelButton: true,
          confirmButtonText: 'Tambah'
        });

        if (selectedIdx !== undefined && selectedIdx !== '') {
          const match = searchResults[parseInt(selectedIdx)];
          const newRec = {
            id: match.slug || match.id,
            slug: match.slug || match.id,
            title: match.title,
            image: match.image || match.poster || match.cover,
            addedAt: new Date().toISOString()
          };
          
          if (recommendations.some(r => r.id === newRec.id)) {
            MySwal.fire({
              icon: 'info',
              title: 'Oops!',
              text: 'Anime ini sudah ada di rekomendasi kamu.',
              background: '#16161a',
              color: '#fff'
            });
            return;
          }

          setRecommendations(prev => [...prev, newRec]);
          MySwal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Rekomendasi ditambahkan',
            showConfirmButton: false,
            timer: 2000,
            background: '#16161a',
            color: '#fff'
          });
        }
      } else {
        MySwal.fire({
          icon: 'error',
          title: 'Tidak Ditemukan',
          text: 'Maaf, anime tersebut tidak ditemukan.',
          background: '#16161a',
          color: '#fff'
        });
      }
    } catch (e) {
      console.error(e);
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Terjadi kesalahan saat mencari anime.',
        background: '#16161a',
        color: '#fff'
      });
    }
  };

  const removeRecommendation = (id: string) => {
    setRecommendations(prev => prev.filter(r => r.id !== id));
  };

  const addSocialLink = async () => {
    const { value: formValues } = await MySwal.fire({
      title: 'Tambah Media Sosial',
      html:
        '<select id="swal-platform" class="swal2-input bg-[#16161a] border-white/10 text-white rounded-xl">' +
        '<option value="whatsapp">WhatsApp</option>' +
        '<option value="instagram">Instagram</option>' +
        '<option value="tiktok">TikTok</option>' +
        '<option value="facebook">Facebook</option>' +
        '<option value="x">X / Twitter</option>' +
        '<option value="other">Lainnya</option>' +
        '</select>' +
        '<input id="swal-url" class="swal2-input bg-[#16161a] border-white/10 text-white rounded-xl" placeholder="https://...">',
      focusConfirm: false,
      background: '#16161a',
      color: '#fff',
      confirmButtonColor: '#F6CF80',
      preConfirm: () => {
        return {
          platform: (document.getElementById('swal-platform') as HTMLSelectElement).value,
          url: (document.getElementById('swal-url') as HTMLInputElement).value
        }
      }
    });

    if (formValues && formValues.url) {
      setLinks(prev => [...prev, formValues]);
    }
  };

  const removeSocialLink = (index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'whatsapp': return <WhatsApp size={16} />;
      case 'instagram': return <Instagram size={16} />;
      case 'tiktok': return <Sparkles size={16} />; // No TikTok icon in lucide yet, using sparkles as vibe
      case 'facebook': return <Facebook size={16} />;
      case 'x': return <Twitter size={16} />;
      default: return <LinkIcon size={16} />;
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="text-[#F6CF80] animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-[#F6CF80] selection:text-black [will-change:transform,opacity]">
      <Navbar />
      
      <main className="pt-24 pb-32 px-4 md:px-8 max-w-4xl mx-auto [transform:translateZ(0)]">
        <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'avatar')} />
        <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'banner')} />

        <AnimatePresence>
          {activeTab === 'menu' && (
            <motion.div 
               key="menu"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               className="space-y-6"
            >
              {/* Profile Card */}
              <div className="bg-[#16161a] rounded-[48px] overflow-hidden border border-white/5 shadow-2xl relative">
                {/* Gear Icon / Edit Trigger */}
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={`absolute top-6 left-6 z-20 p-2.5 rounded-2xl border transition-all hover:scale-110 active:scale-95 ${isEditing ? 'bg-[#F6CF80] text-black border-[#F6CF80]' : 'bg-black/40 backdrop-blur-xl text-white border-white/10'}`}
                >
                  <Settings size={22} className={isEditing ? 'animate-spin-slow' : ''} />
                </button>

                  {/* Banner */}
                <div className="h-44 md:h-64 relative overflow-hidden group">
                  <img 
                    src={getImageUrl(profile.banner)} 
                    onError={(e) => handleImageError(e, profile.banner)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[3s]" 
                    alt="Banner" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#16161a] via-[#16161a]/20 to-transparent" />
                  
                  {uploading === 'banner' && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-30 flex flex-col items-center justify-center animate-in fade-in duration-300">
                      <div className="relative">
                        <div className="w-20 h-20 border-[3px] border-white/10 border-t-[#F6CF80] rounded-full animate-spin" />
                        <Camera className="absolute inset-0 m-auto text-[#F6CF80]" size={24} />
                      </div>
                      <p className="mt-4 text-[#F6CF80] font-black uppercase text-[10px] tracking-[0.3em] animate-pulse">Memproses Banner...</p>
                    </div>
                  )}

                  {isEditing && !uploading && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-100 transition-opacity z-20">
                      <button 
                        onClick={() => bannerInputRef.current?.click()}
                        className="p-4 bg-[#F6CF80] text-black rounded-[24px] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-2xl hover:scale-105 active:scale-95 transition-all"
                      >
                        <Camera size={18} />
                        Ganti Banner
                      </button>
                    </div>
                  )}
                </div>

                {/* Profile Info */}
                <div className="relative px-6 md:px-10 pb-10">
                  <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-20 md:-mt-24 relative z-10">
                    <div className="relative group shrink-0">
                      <div className="w-36 h-36 md:w-44 md:h-44 rounded-[48px] border-[6px] border-[#16161a] overflow-hidden bg-[#1a1a1e] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative">
                        <img 
                          src={getImageUrl(profile.avatar)} 
                          onError={(e) => handleImageError(e, profile.avatar)}
                          className="w-full h-full object-cover" 
                          alt="Avatar" 
                        />
                        
                        {uploading === 'avatar' && (
                          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-40">
                            <Loader2 size={32} className="animate-spin text-[#F6CF80]" />
                            <span className="text-[8px] font-black text-[#F6CF80] uppercase mt-2">Loading</span>
                          </div>
                        )}

                        {isEditing && !uploading && (
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-100 transition-opacity">
                            <button 
                              onClick={() => avatarInputRef.current?.click()}
                              className="p-3.5 bg-[#F6CF80] text-black rounded-2xl shadow-xl hover:scale-110 transition-transform"
                            >
                               <Camera size={22} strokeWidth={3} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 pb-2">
                       {isEditing ? (
                         <div className="space-y-3 animate-in fade-in slide-in-from-left-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#F6CF80] flex items-center gap-2">
                               <span className="w-1.5 h-1.5 bg-[#F6CF80] rounded-full animate-pulse" />
                               Mode Edit Aktif - Ubah profilmu di bawah
                            </p>
                            <div className="flex flex-col gap-2">
                              <input 
                                value={editData.name}
                                onChange={(e) => setEditData({...editData, name: e.target.value})}
                                placeholder="Nama Lengkap"
                                className="bg-white/5 border border-white/10 p-3 rounded-2xl text-xl font-black outline-none focus:border-[#F6CF80]/50 w-full md:max-w-md text-white"
                              />
                              <input 
                                value={editData.username.startsWith('@') ? editData.username : `@${editData.username}`}
                                onChange={(e) => setEditData({...editData, username: e.target.value})}
                                placeholder="@username"
                                className="bg-white/5 border border-white/10 p-3 rounded-2xl text-sm font-black outline-none focus:border-[#F6CF80]/50 w-full md:max-w-xs text-white/50"
                              />
                              <textarea 
                                value={editData.bio}
                                onChange={(e) => setEditData({...editData, bio: e.target.value})}
                                placeholder="Tulis bio singkat kamu..."
                                rows={2}
                                className="bg-white/5 border border-white/10 p-3 rounded-2xl text-xs font-medium outline-none focus:border-[#F6CF80]/50 w-full md:max-w-lg text-white/80 resize-none"
                              />
                            </div>
                            
                            {/* Links Edit */}
                            <div className="space-y-2 mt-4">
                              <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Media Sosial</p>
                              <div className="flex flex-wrap gap-2">
                                {links.map((link, idx) => (
                                  <div key={idx} className="flex items-center gap-2 bg-white/5 border border-white/10 py-1.5 px-3 rounded-xl">
                                    {getPlatformIcon(link.platform)}
                                    <span className="text-[10px] font-bold truncate max-w-[100px]">{link.url}</span>
                                    <button onClick={() => removeSocialLink(idx)} className="text-white/20 hover:text-red-500">
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}
                                <button onClick={addSocialLink} className="flex items-center gap-2 bg-[#F6CF80]/10 border border-[#F6CF80]/20 text-[#F6CF80] py-1.5 px-3 rounded-xl hover:bg-[#F6CF80]/20 transition-all">
                                  <Plus size={14} />
                                  <span className="text-[10px] font-black uppercase">Tambah Link</span>
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                               <button onClick={saveProfileChanges} className="px-6 py-2.5 bg-[#F6CF80] text-black rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#F6CF80]/20">
                                  <Save size={14} /> Simpan
                               </button>
                               <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all text-white/50 hover:text-white">
                                  Batal
                               </button>
                            </div>
                         </div>
                       ) : (
                         <>
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                               <h1 className="text-3xl md:text-4xl font-black tracking-tight">{profile.name}</h1>
                               <div className="px-3 py-1 bg-[#F6CF80] text-black rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#F6CF80]/20">
                                  LVL {profile.levelInfo?.level || 1}
                               </div>
                            </div>
                             <div className="flex items-center gap-3 mt-1">
                                <p className="text-white/30 font-black text-sm uppercase tracking-widest">@{profile.username}</p>
                                {profile.isOnline && (
                                   <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">
                                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                      <span className="text-[8px] font-black uppercase text-green-500">Online</span>
                                   </div>
                                )}
                             </div>

                             {profile.bio && (
                                <p className="mt-4 text-xs font-medium text-white/60 leading-relaxed max-w-xl italic">
                                   "{profile.bio}"
                                </p>
                             )}

                             {/* Social Links View */}
                             {profile.links && profile.links.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                   {profile.links.map((link, idx) => (
                                      <a 
                                        key={idx} 
                                        href={link.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 bg-white/5 border border-white/5 py-1.5 px-3 rounded-2xl hover:bg-[#F6CF80]/10 hover:border-[#F6CF80]/20 hover:text-[#F6CF80] transition-all"
                                      >
                                         {getPlatformIcon(link.platform)}
                                         <span className="text-[10px] font-black uppercase tracking-tight">{link.platform}</span>
                                      </a>
                                   ))}
                                </div>
                             )}
                            
                            {/* EXP Bar */}
                            <div className="mt-4 w-full md:max-w-sm">
                               <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">EXP Progress</span>
                                  <span className="text-[9px] font-black text-[#F6CF80] uppercase tracking-widest">
                                     {profile.levelInfo?.exp || 0} / {getExpForNextLevel(profile.levelInfo?.level || 1)}
                                  </span>
                               </div>
                               <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                                  <motion.div 
                                     initial={{ width: 0 }}
                                     animate={{ width: `${getProgressToNextLevel(profile.levelInfo?.exp || 0)}%` }}
                                     className="h-full bg-gradient-to-r from-[#F6CF80] to-[#fceabb] rounded-full shadow-[0_0_10px_rgba(246,207,128,0.3)]"
                                  />
                               </div>
                               <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-1.5">
                                  Butuh {getExpForNextLevel(profile.levelInfo?.level || 1) - (profile.levelInfo?.exp || 0)} EXP lagi untuk naik level!
                                </p>
                            </div>
                            <p className="text-[#F6CF80]/40 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mt-4 flex items-center gap-2">
                               <span className="w-1.5 h-1.5 bg-[#F6CF80] rounded-full" />
                               Bergabung <span className="text-[#F6CF80]">{profile.joinDate}</span>
                            </p>
                         </>
                       )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3 md:gap-6">
                {[
                  { label: 'Ditonton', value: stats.animeWatched, icon: Play },
                  { label: 'Disimpan', value: stats.animeSaved, icon: Bookmark },
                  { label: 'Waktu', value: stats.hoursWatched, icon: Clock },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-[#16161a] p-5 md:p-8 rounded-[40px] border border-white/5 flex flex-col items-center text-center group hover:bg-[#F6CF80]/5 hover:border-[#F6CF80]/20 transition-all">
                    <div className="w-10 h-10 md:w-16 md:h-16 bg-white/5 rounded-2xl md:rounded-3xl flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 group-hover:bg-[#F6CF80]/10 transition-all">
                      <stat.icon className="text-[#F6CF80]" size={20} />
                    </div>
                    <span className="text-xl md:text-3xl font-black text-white">{stat.value}</span>
                    <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] text-white/20 mt-0.5 md:mt-1">{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* Install App Banner */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#F6CF80]/20 to-[#16161a] p-6 md:p-8 rounded-[40px] border border-[#F6CF80]/30 shadow-[0_0_40px_rgba(246,207,128,0.1)] group">
                 <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
                    <Smartphone size={120} className="text-[#F6CF80] rotate-12" />
                 </div>
                 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                       <div className="flex items-center gap-3 mb-2">
                          <div className="bg-[#F6CF80] text-black p-2 rounded-xl">
                             <Download size={20} />
                          </div>
                          <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">Download Aplikasi</h3>
                       </div>
                       <p className="text-sm text-white/60 font-medium max-w-md">Install ChisaStream ke layar utama perangkatmu untuk pengalaman menonton yang lebih cepat dan lancar tanpa harus membuka browser lagi!</p>
                    </div>
                    <button 
                       onClick={async () => {
                          const promptEvent = (window as any).deferredPrompt;
                          if (promptEvent) {
                              promptEvent.prompt();
                              const { outcome } = await promptEvent.userChoice;
                              if (outcome === 'accepted') {
                                  (window as any).deferredPrompt = null;
                              }
                          } else {
                              MySwal.fire({
                                  title: 'Tidak Didukung',
                                  text: 'Perangkat/Browser ini mungkin belum mendukung instalasi PWA, atau aplikasi mungkin sudah terpasang.',
                                  icon: 'info'
                              });
                          }
                       }}
                       className="bg-[#F6CF80] text-black hover:bg-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all text-center"
                    >
                       Install Sekarang
                    </button>
                 </div>
              </div>

              {/* Recommendations Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#F6CF80]/10 rounded-xl text-[#F6CF80]">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.3em]">Rekomendasi Anime</h3>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Anime pilihan dari user ini</p>
                    </div>
                  </div>
                  {activeTab === 'menu' && !loading && profile.uid === auth.currentUser?.uid && (
                    <button 
                      onClick={() => handleAddRecommendation()}
                      className="p-2 bg-white/5 hover:bg-[#F6CF80]/20 border border-white/5 hover:border-[#F6CF80]/30 rounded-xl text-white/40 hover:text-[#F6CF80] transition-all"
                    >
                      <Plus size={18} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {recommendations.length > 0 ? (
                    recommendations.map((rec, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        key={rec.id + idx}
                        className="group relative"
                      >
                        <div 
                          onClick={() => navigate(`/anime/${rec.slug}`)}
                          className="aspect-[3/4] rounded-3xl overflow-hidden bg-[#16161a] border border-white/5 cursor-pointer"
                        >
                          <img 
                            src={getImageUrl(rec.image)} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                            alt={rec.title} 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform opacity-0 group-hover:opacity-100">
                             <p className="text-[10px] font-black uppercase tracking-tight text-white line-clamp-2">{rec.title}</p>
                          </div>
                        </div>
                        {isEditing && (
                          <button 
                            onClick={() => removeRecommendation(rec.id)}
                            className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all z-10"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 bg-white/[0.02] border border-dashed border-white/10 rounded-[40px] flex flex-col items-center justify-center text-center">
                       <HelpCircle className="text-white/10 mb-4" size={48} />
                       <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Belum ada rekomendasi anime</p>
                    </div>
                  )}
                </div>
              </div>


              {/* Online Users List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40">User Online Saat Ini</h3>
                  </div>
                  <span className="text-[10px] font-black text-[#F6CF80] bg-[#F6CF80]/10 px-3 py-1 rounded-full">{onlineUsers.length} Online</span>
                </div>
                
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2 mask-linear-fade">
                  {onlineUsers.length > 0 ? (
                    onlineUsers.map((user, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        key={user.username + idx} 
                        className="flex flex-col items-center gap-2 shrink-0 group relative cursor-pointer"
                        onClick={() => navigate('/u/' + user.username)}
                      >
                        <div className="relative">
                          <div className="w-16 h-16 rounded-2xl border-2 border-white/5 p-1 group-hover:border-[#F6CF80]/50 transition-all overflow-hidden bg-[#16161a]">
                            <img 
                              src={getImageUrl(user.avatar)} 
                              onError={(e) => handleImageError(e, user.avatar)}
                              className="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform" 
                              alt={user.name} 
                            />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0a0a0c] rounded-lg flex items-center justify-center p-0.5">
                            <div className="w-full h-full bg-green-500 rounded-md shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                          </div>
                        </div>
                        <span className="text-[10px] font-black tracking-tight text-white/40 group-hover:text-white transition-colors truncate w-20 text-center">
                          {user.name?.split(' ')[0] || 'User'}
                        </span>
                      </motion.div>
                    ))
                  ) : (
                    <div className="w-full py-8 flex flex-center justify-center border border-dashed border-white/10 rounded-[32px]">
                       <p className="text-[10px] font-black text-white/10 uppercase tracking-widest text-center">Menunggu user lain online...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Menu */}
              <div className="bg-[#16161a] rounded-[48px] p-8 border border-white/5 mb-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#F6CF80]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#F6CF80]/10 transition-all" />
                <div className="flex items-center gap-4 mb-8">
                   <div className="w-12 h-12 bg-[#F6CF80]/10 rounded-2xl flex items-center justify-center border border-[#F6CF80]/20 text-[#F6CF80] shadow-inner"><Zap size={24} fill="currentColor" /></div>
                   <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Daily Quests</h3>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Selesaikan misi harian untuk EXP ekstra</p>
                   </div>
                </div>
                <div className="space-y-4">
                   {profile.dailyQuests?.filter(q => q.current < q.target).length === 0 ? (
                      <div className="py-12 bg-white/[0.02] border border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center text-center">
                         <div className="w-16 h-16 bg-[#F6CF80]/10 rounded-full flex items-center justify-center text-[#F6CF80] mb-4">
                            <Trophy size={32} />
                         </div>
                         <h4 className="font-black text-white uppercase tracking-widest">Semua Misi Selesai!</h4>
                         <p className="text-[10px] font-medium text-white/30 uppercase mt-1">Luar biasa! Kamu telah menyelesaikan semua tantangan hari ini.</p>
                      </div>
                   ) : (
                     profile.dailyQuests?.filter(q => q.current < q.target).map((q, i) => (
                       <div key={i} className="flex items-center justify-between p-5 rounded-3xl border bg-white/[0.02] border-white/5 hover:border-[#F6CF80]/30 hover:bg-white/[0.04] transition-all">
                          <div className="flex items-center gap-5">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${q.current >= q.target ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-white/20'}`}>
                                {q.type === 'comment' ? <MessageCircle size={20} /> : q.type === 'watch' ? <Play size={20} /> : <Bookmark size={20} />}
                             </div>
                             <div className="flex flex-col">
                                <span className={`text-[12px] font-black uppercase tracking-tighter ${q.current >= q.target ? 'text-green-500 line-through' : 'text-white'}`}>{q.title}</span>
                                <span className="text-[10px] font-bold text-white/20 uppercase mt-0.5 tracking-tight">{q.description}</span>
                             </div>
                          </div>
                          <div className="flex items-center gap-6">
                             <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                   <span className={`text-[10px] font-black ${q.current >= q.target ? 'text-green-500' : 'text-[#F6CF80]'}`}>{q.current}</span>
                                   <span className="text-[10px] font-black text-white/10">/</span>
                                   <span className="text-[10px] font-black text-white/40">{q.target}</span>
                                </div>
                                <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                   <div 
                                      className={`h-full transition-all duration-700 ${q.current >= q.target ? 'bg-green-500' : 'bg-[#F6CF80]'}`} 
                                      style={{ width: `${(q.current / q.target) * 100}%` }} 
                                   />
                                </div>
                             </div>
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${q.current >= q.target ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-white/10'}`}>
                                {q.current >= q.target ? <Check size={20} strokeWidth={3} /> : <ChevronRight size={16} />}
                             </div>
                          </div>
                       </div>
                     ))
                   )}
                </div>
              </div>

              {/* Navigation Menu */}
              <div className="bg-[#16161a] rounded-[48px] border border-white/5 overflow-hidden p-2">
                {[
                  { id: 'watchlist', label: 'Daftar Tontonan', icon: Bookmark, count: bookmarks.length },
                  { id: 'history', label: 'Riwayat Menonton', icon: HistoryIcon, count: history.length },
                  { id: 'downloads', label: 'Download Saya', icon: Download, count: downloads.length },
                  { id: 'help', label: 'Bantuan & Feedback', icon: HelpCircle, count: null },
                  { id: 'settings', label: 'Pengaturan & Akun', icon: Settings, count: null },
                  { id: 'nobar', label: 'Nobar (Watch Together)', icon: Users, count: null },
                ].map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'help') navigate('/help');
                      else if (item.id === 'nobar') navigate('/nobar');
                      else setActiveTab(item.id as any);
                    }}
                    className="w-full flex items-center justify-between p-6 hover:bg-white/[0.04] transition-all group rounded-[32px]"
                  >
                    <div className="flex items-center gap-5">
                      <div className="p-3 rounded-2xl bg-white/5 text-[#F6CF80] group-hover:scale-110 transition-transform">
                         <item.icon size={22} />
                      </div>
                      <div className="text-left">
                        <span className="font-black text-base md:text-lg block tracking-tight text-white/80 group-hover:text-white">{item.label}</span>
                        {item.count !== null && <span className="text-[10px] font-black uppercase tracking-widest text-white/20">{item.count} items</span>}
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-white/10 group-hover:text-[#F6CF80] transform group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
                
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-6 hover:bg-red-500/10 transition-all group rounded-[32px]"
                >
                  <div className="flex items-center gap-5 text-red-500">
                    <div className="p-3 rounded-2xl bg-red-500/10">
                       <LogOut size={22} />
                    </div>
                    <span className="font-black text-base md:text-lg tracking-tight">Keluar Akun</span>
                  </div>
                  <ChevronRight size={20} className="text-red-500/10 group-hover:text-red-500 transform group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </motion.div>
          )}

          {(activeTab === 'watchlist' || activeTab === 'history' || activeTab === 'downloads' || activeTab === 'settings') && (
            <motion.div 
               key={activeTab}
               initial={{ opacity: 0, x: 10 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -10 }}
               className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <button onClick={() => setActiveTab('menu')} className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all group">
                  <Play className="rotate-180 group-hover:-translate-x-1 transition-transform" size={18} />
                  <span className="font-black uppercase text-[10px] tracking-[0.2em]">Kembali</span>
                </button>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
                   {activeTab === 'watchlist' ? 'Watchlist' : activeTab === 'history' ? 'Riwayat' : activeTab === 'downloads' ? 'Downloads' : 'Pengaturan'}
                </h2>
                <div className="w-20 hidden md:block" />
              </div>

              {activeTab === 'settings' ? (
                <div className="space-y-6">
                  {/* Account Information Section */}
                  <div className="bg-[#16161a] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-6 md:p-8 border-b border-white/5 flex items-center gap-4 bg-white/[0.02]">
                       <div className="w-12 h-12 bg-[#F6CF80]/10 rounded-[20px] flex items-center justify-center">
                          <Info className="text-[#F6CF80]" size={24} />
                       </div>
                       <div>
                          <h3 className="text-lg md:text-xl font-black uppercase tracking-tight">Informasi Akun</h3>
                          <p className="text-xs font-black text-white/20 uppercase tracking-widest">Detail data identitas kamu</p>
                       </div>
                    </div>
                    <div className="p-6 md:p-8 space-y-5">
                       <div className="flex items-center justify-between group">
                          <div>
                             <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">User ID</p>
                             <p className="text-sm font-bold text-white/60 font-mono mt-1">{auth.currentUser?.uid}</p>
                          </div>
                          <div className="p-2 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                             <Check size={14} className="text-green-500" />
                          </div>
                       </div>
                       <div className="flex items-center justify-between group">
                          <div>
                             <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Email Terdaftar</p>
                             <p className="text-sm font-bold text-white/60 mt-1">{auth.currentUser?.email}</p>
                          </div>
                          <div className="px-3 py-1 bg-green-500/10 text-green-500 rounded-lg text-[8px] font-black uppercase tracking-widest">Terverifikasi</div>
                       </div>
                       <div className="flex items-center justify-between group">
                          <div>
                             <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Metode Login</p>
                             <p className="text-sm font-bold text-white/60 uppercase mt-1">{auth.currentUser?.providerData[0]?.providerId || 'Unknown'}</p>
                          </div>
                          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                       </div>
                    </div>
                  </div>

                  {/* Playback Settings Section */}
                  <div className="bg-[#16161a] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-6 md:p-8 border-b border-white/5 flex items-center gap-4 bg-white/[0.02]">
                       <div className="w-12 h-12 bg-blue-500/10 rounded-[20px] flex items-center justify-center">
                          <Play className="text-blue-500" size={24} />
                       </div>
                       <div>
                          <h3 className="text-lg md:text-xl font-black uppercase tracking-tight">Preferensi Pemutar</h3>
                          <p className="text-xs font-black text-white/20 uppercase tracking-widest">Kustomisasi pengalaman nonton</p>
                       </div>
                    </div>
                    <div className="p-6 md:p-8 space-y-6">
                       <button 
                        onClick={() => handleUpdateSettings({ autoNext: !userSettings.autoNext })}
                        className="w-full flex items-center justify-between group p-2 -m-2 rounded-2xl hover:bg-white/[0.02] transition-all"
                       >
                          <div className="text-left">
                             <p className="text-sm font-black text-white/80 group-hover:text-white transition-colors">Auto Next Episode</p>
                             <p className="text-[10px] font-bold text-white/20 mt-1 uppercase tracking-widest">Lanjut episode otomatis saat selesai</p>
                          </div>
                          <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${userSettings.autoNext ? 'bg-[#F6CF80]' : 'bg-white/10'}`}>
                             <div className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-all duration-300 ${userSettings.autoNext ? 'left-7' : 'left-1'}`} />
                          </div>
                       </button>
                       
                       <button 
                        onClick={() => handleUpdateSettings({ autoSkipOpEd: !userSettings.autoSkipOpEd })}
                        className="w-full flex items-center justify-between group p-2 -m-2 rounded-2xl hover:bg-white/[0.02] transition-all"
                       >
                          <div className="text-left">
                             <p className="text-sm font-black text-white/80 group-hover:text-white transition-colors">Skip Opening & Ending</p>
                             <p className="text-[10px] font-bold text-white/20 mt-1 uppercase tracking-widest">Lompati OP/ED otomatis (jika ada data)</p>
                          </div>
                          <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${userSettings.autoSkipOpEd ? 'bg-[#F6CF80]' : 'bg-white/10'}`}>
                             <div className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-all duration-300 ${userSettings.autoSkipOpEd ? 'left-7' : 'left-1'}`} />
                          </div>
                       </button>

                       <button 
                        onClick={() => handleUpdateSettings({ showContinueWatching: !userSettings.showContinueWatching })}
                        className="w-full flex items-center justify-between group p-2 -m-2 rounded-2xl hover:bg-white/[0.02] transition-all"
                       >
                          <div className="text-left">
                             <p className="text-sm font-black text-white/80 group-hover:text-white transition-colors">Lanjutkan Menonton</p>
                             <p className="text-[10px] font-bold text-white/20 mt-1 uppercase tracking-widest">Tampilkan daftar tontonan terakhir di Home</p>
                          </div>
                          <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${userSettings.showContinueWatching ? 'bg-[#F6CF80]' : 'bg-white/10'}`}>
                             <div className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-all duration-300 ${userSettings.showContinueWatching ? 'left-7' : 'left-1'}`} />
                          </div>
                       </button>

                       <div className="h-px bg-white/5 w-full !my-4" />

                       <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-[#F6CF80]/10 flex items-center justify-center text-[#F6CF80]">
                                <Server size={20} />
                             </div>
                             <div>
                                <h4 className="text-sm font-black text-white leading-tight uppercase tracking-tight">Server API</h4>
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Switch ke server cadangan jika error</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                             <button 
                               onClick={() => handleUpdateSettings({ apiServer: 'main' })}
                               className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${userSettings.apiServer === 'main' ? 'bg-[#F6CF80] text-black shadow-lg shadow-[#F6CF80]/20' : 'text-white/30 hover:text-white'}`}
                             >
                               Utama
                             </button>
                             <button 
                               onClick={() => handleUpdateSettings({ apiServer: 'backup' })}
                               className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${userSettings.apiServer === 'backup' ? 'bg-[#F6CF80] text-black shadow-lg shadow-[#F6CF80]/20' : 'text-white/30 hover:text-white'}`}
                             >
                               Cadangan
                             </button>
                             <button 
                               onClick={() => handleUpdateSettings({ apiServer: 'sanka' })}
                               className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${userSettings.apiServer === 'sanka' ? 'bg-[#F6CF80] text-black shadow-lg shadow-[#F6CF80]/20' : 'text-white/30 hover:text-white'}`}
                             >
                               Server 2
                             </button>
                          </div>
                       </div>

                       <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-[#F6CF80]/10 flex items-center justify-center text-[#F6CF80]">
                                <Zap size={20} />
                             </div>
                             <div>
                                <h4 className="text-sm font-black text-white leading-tight uppercase tracking-tight">Sistem Fallback Streaming</h4>
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Otomatis mencari source cadangan di Dev API</p>
                             </div>
                          </div>
                          <button 
                            onClick={() => handleUpdateSettings({ fallbackStream: !userSettings.fallbackStream })}
                            className={`w-12 h-6 rounded-full transition-all duration-300 relative border border-white/10 ${userSettings.fallbackStream ? 'bg-[#F6CF80]' : 'bg-white/5'}`}
                          >
                             <div className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-all duration-300 ${userSettings.fallbackStream ? 'left-7' : 'left-1'}`} />
                          </button>
                       </div>
                    </div>
                  </div>

                  {/* Security Section */}
                  <div className="bg-[#16161a] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-6 md:p-8 border-b border-white/5 flex items-center gap-4 bg-white/[0.02]">
                       <div className="w-12 h-12 bg-purple-500/10 rounded-[20px] flex items-center justify-center">
                          <Shield className="text-purple-500" size={24} />
                       </div>
                       <div>
                          <h3 className="text-lg md:text-xl font-black uppercase tracking-tight">Keamanan</h3>
                          <p className="text-xs font-black text-white/20 uppercase tracking-widest">Kelola akses dan kata sandi kamu</p>
                       </div>
                    </div>
                    <div className="p-6 md:p-8 space-y-4">
                       <button 
                        onClick={handleChangePassword}
                        className="w-full flex items-center justify-between p-5 rounded-[24px] bg-white/5 border border-white/5 hover:border-[#F6CF80]/30 hover:bg-white/[0.08] transition-all group"
                       >
                          <div className="flex items-center gap-4">
                             <Key size={18} className="text-white/40 group-hover:text-[#F6CF80] transition-colors" />
                             <span className="font-black text-sm uppercase tracking-tight">Ganti Kata Sandi</span>
                          </div>
                          <ChevronRight size={16} className="text-white/20 group-hover:translate-x-1 transition-all" />
                       </button>
                    </div>
                  </div>

                  {/* Data Management Section */}
                  <div className="bg-[#16161a] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-6 md:p-8 border-b border-white/5 flex items-center gap-4 bg-white/[0.02]">
                       <div className="w-12 h-12 bg-red-500/10 rounded-[20px] flex items-center justify-center">
                          <Trash2 className="text-red-500" size={24} />
                       </div>
                       <div>
                          <h3 className="text-lg md:text-xl font-black uppercase tracking-tight">Manajemen Data</h3>
                          <p className="text-xs font-black text-white/20 uppercase tracking-widest">Hapus koleksi data tertentu</p>
                       </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                       <button 
                        onClick={clearAllHistory}
                        className="flex flex-col items-center justify-center p-8 rounded-[32px] bg-white/[0.02] border border-white/5 hover:bg-red-500/5 hover:border-red-500/20 transition-all group"
                       >
                          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                             <HistoryIcon size={22} className="group-hover:text-red-500 transition-colors" />
                          </div>
                          <span className="font-black text-xs uppercase tracking-widest">Hapus Semua Riwayat</span>
                       </button>
                       <button 
                        onClick={clearAllBookmarks}
                        className="flex flex-col items-center justify-center p-8 rounded-[32px] bg-white/[0.02] border border-white/5 hover:bg-red-500/5 hover:border-red-500/20 transition-all group"
                       >
                          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                             <Bookmark size={22} className="group-hover:text-red-500 transition-colors" />
                          </div>
                          <span className="font-black text-xs uppercase tracking-widest">Hapus Semua Simpanan</span>
                       </button>
                    </div>
                    <div className="p-4 md:p-6 bg-red-500/5 pt-0">
                       <button 
                        onClick={handleDeleteAccount}
                        className="w-full py-5 rounded-[24px] bg-red-500 text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                       >
                          Hapus Akun Selamanya
                       </button>
                    </div>
                  </div>
                </div>
              ) : activeTab === 'watchlist' ? (
                bookmarks.length === 0 ? (
                  <EmptyState icon={<Bookmark size={48} />} text="Belum ada anime yang disimpan" />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {bookmarks.map((anime) => (
                      <div key={anime.slug} className="group bg-[#16161a] rounded-[40px] overflow-hidden border border-white/5 hover:border-[#F6CF80]/30 transition-all flex flex-col shadow-xl">
                        <div className="relative aspect-[3/4] overflow-hidden">
                          <img 
                            src={getImageUrl(anime.image)} 
                            onError={(e) => handleImageError(e, anime.image)}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                            alt={anime.title} 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#16161a] via-transparent to-transparent opacity-80" />
                          <button 
                            onClick={() => removeBookmark(anime.slug)}
                            className="absolute top-4 right-4 p-2.5 bg-black/60 backdrop-blur-xl rounded-2xl text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="p-4 md:p-6 flex-1 flex flex-col">
                          <h3 className="font-black text-sm md:text-base line-clamp-2 mb-4 group-hover:text-[#F6CF80] transition-colors h-10 md:h-12">{anime.title}</h3>
                          <button 
                            onClick={() => handleBookmarkClick(anime)}
                            className="mt-auto w-full py-3 bg-white/5 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#F6CF80] hover:text-black transition-all shadow-lg active:scale-95"
                          >
                            Tonton Sekarang
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : activeTab === 'history' ? (
                history.length === 0 ? (
                  <EmptyState 
                    icon={
                      <div className="w-24 h-24 md:w-32 md:h-32 mb-4">
                        <img src="https://url.dinzid.my.id/VkxIztf" className="w-full h-full object-contain opacity-50" alt="Empty History" />
                      </div>
                    } 
                    text="Belum ada riwayat menonton" 
                  />
                ) : (
                  <div className="space-y-6">
                     {history.map((item) => (
                       <div 
                        key={item.id}
                        className="relative group bg-[#16161a] border border-white/5 rounded-[32px] md:rounded-[40px] overflow-hidden hover:bg-white/[0.04] transition-all shadow-xl"
                       >
                          {/* Banner Backdrop */}
                          <div className="absolute right-0 top-0 bottom-0 w-2/3 z-0">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#16161a] via-[#16161a]/80 to-transparent z-10"></div>
                            <img 
                              src={getImageUrl(item.cover || item.image)} 
                              onError={(e) => handleImageError(e, item.cover || item.image)}
                              className="w-full h-full object-cover opacity-10 group-hover:opacity-30 transition-all duration-700" 
                              alt="" 
                            />
                          </div>

                          <div className="relative z-10 p-4 md:p-6 flex items-center gap-4 md:gap-8">
                            <div 
                              className="w-16 h-24 md:w-24 md:h-32 rounded-2xl overflow-hidden shrink-0 shadow-lg border border-white/5 cursor-pointer"
                              onClick={() => navigate(`/anime/${item.slug}/${item.episode}${item.server === 'sanka' ? '?src=sanka' : ''}`)}
                            >
                               <img 
                                 src={getImageUrl(item.image)} 
                                 onError={(e) => handleImageError(e, item.image)}
                                 className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                 alt="" 
                               />
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2 mb-2">
                                  <span className="bg-[#F6CF80] text-black text-[8px] md:text-[10px] font-black px-2 py-0.5 rounded-lg uppercase">EP {item.episode}</span>
                               </div>
                               <h4 
                                className="font-black text-sm md:text-xl truncate group-hover:text-[#F6CF80] transition-colors cursor-pointer"
                                onClick={() => navigate(`/anime/${item.slug}/${item.episode}${item.server === 'sanka' ? '?src=sanka' : ''}`)}
                               >
                                {item.title}
                               </h4>
                               
                               <div className="flex items-center gap-4 mt-3 md:mt-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/20">
                                  <div className="flex items-center gap-1.5"><Clock size={12} className="text-[#F6CF80]" /> {Math.floor(item.timestamp/60)}m / {Math.floor(item.duration/60)}m</div>
                               </div>

                               <div className="mt-3 md:mt-4 h-1 bg-white/5 rounded-full overflow-hidden w-full max-w-[120px]">
                                  <div className="h-full bg-[#F6CF80]" style={{ width: `${(item.timestamp/item.duration)*100}%` }} />
                               </div>
                            </div>
                            <button onClick={() => navigate(`/anime/${item.slug}/${item.episode}${item.server === 'sanka' ? '?src=sanka' : ''}`)} className="h-12 w-12 md:h-14 md:w-14 bg-white/5 rounded-[20px] text-white/20 hover:text-[#F6CF80] hover:bg-[#F6CF80]/10 transition-all active:scale-90 shrink-0">
                               <Play size={20} fill="currentColor" className="ml-0.5" />
                            </button>
                          </div>
                       </div>
                     ))}
                  </div>
                )
              ) : (
                downloads.length === 0 ? (
                  <EmptyState icon={<Download size={48} />} text="Belum ada histori download" />
                ) : (
                  <div className="space-y-4">
                    {downloads.map((item) => (
                      <div key={item.id} className="bg-[#16161a] p-5 rounded-[32px] border border-white/5 flex items-center justify-between group hover:border-[#F6CF80]/20 transition-all">
                         <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-[#F6CF80]/10 rounded-2xl flex items-center justify-center shrink-0">
                               <Download size={22} className="text-[#F6CF80]" />
                            </div>
                            <div className="min-w-0">
                               <h4 className="font-black text-base line-clamp-1">{item.title}</h4>
                               <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">Episode {item.episode} • {item.downloadedAt?.toDate ? item.downloadedAt.toDate().toLocaleDateString('id-ID') : '-'}</p>
                            </div>
                         </div>
                         <button onClick={() => navigate(`/anime/${item.slug}`)} className="p-3 bg-white/5 rounded-2xl text-white/20 hover:text-[#F6CF80] hover:bg-[#F6CF80]/10 transition-all group-hover:scale-110">
                            <Play size={20} fill="currentColor" />
                         </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
      <Footer />
    </div>
  );
};

const EmptyState = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
  <div className="py-24 text-center bg-[#16161a] rounded-[48px] border border-white/5 shadow-inner">
    <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 text-white/10">
       {icon}
    </div>
    <p className="text-white/40 font-black uppercase tracking-widest text-xs">{text}</p>
  </div>
);

export default Profile;
