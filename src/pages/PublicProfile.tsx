import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Play, Bookmark, Clock, 
  Settings, Camera, Save, X, Loader2, 
  Trash2, Plus, LogOut, ChevronRight, 
  Image as ImageIcon, User, Shield, 
  History, Download, MessageSquare, 
  Star, Zap, Trophy, Target, Award, Flame, 
  ChevronDown, ChevronUp, Sparkles, Medal,
  Coins, Instagram, Facebook, MessageCircle as WhatsApp, Link as LinkIcon, Twitter,
  HelpCircle, ExternalLink
} from 'lucide-react';
import { userService } from '../services/userService';
import { animeService } from '../services/animeService';
import { getImageUrl, handleImageError } from '../lib/imageUtils';

const PublicProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    if (!username) return;
    setLoading(true);
    try {
      const prof = await userService.getProfileByUsername(username);
      if (prof) {
        setProfile(prof);
        setError(null);
      } else {
        setError('User tidak ditemukan');
      }
    } catch (err) {
      console.error(err);
      setError('Gagal memuat profil');
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'whatsapp': return <WhatsApp size={16} />;
      case 'instagram': return <Instagram size={16} />;
      case 'tiktok': return <Sparkles size={16} />;
      case 'facebook': return <Facebook size={16} />;
      case 'x': return <Twitter size={16} />;
      default: return <LinkIcon size={16} />;
    }
  };

  const getExpForNextLevel = (level: number) => level * 1000;
  const getProgressToNextLevel = (exp: number) => {
    const level = Math.floor(exp / 1000) + 1;
    const currentLevelExp = (level - 1) * 1000;
    const nextLevelThreshold = level * 1000;
    const progress = ((exp - currentLevelExp) / (nextLevelThreshold - currentLevelExp)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f13] pt-24 px-6 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#EF4444] animate-spin" />
        <p className="mt-4 text-white/50 font-black uppercase text-xs tracking-widest">Memuat Profil...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#0f0f13] pt-24 px-6 flex flex-col items-center justify-center text-center">
        <HelpCircle className="w-16 h-16 text-red-500 mb-4 opacity-50" />
        <h1 className="text-2xl font-black text-white mb-2">{error || 'Gagal memuat profil'}</h1>
        <button 
          onClick={() => navigate('/')} 
          className="mt-6 px-10 py-3 bg-[#EF4444] text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all"
        >
          Kembali ke Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] pt-24 pb-20 px-4 md:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Profile Card */}
        <div className="bg-[#16161a] rounded-[48px] overflow-hidden border border-white/5 shadow-2xl relative">
          {/* Banner */}
          <div className="h-44 md:h-64 relative overflow-hidden">
            <img 
              src={getImageUrl(profile.banner)} 
              onError={(e) => handleImageError(e, profile.banner)}
              className="w-full h-full object-cover" 
              alt="Banner" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#16161a] via-[#16161a]/20 to-transparent" />
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
                </div>
              </div>

              <div className="flex-1 min-w-0 pb-2">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight">{profile.name}</h1>
                  <div className="px-3 py-1 bg-[#EF4444] text-black rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#EF4444]/20">
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

                {profile.links && profile.links.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {profile.links.map((link: any, idx: number) => (
                      <a 
                        key={idx} 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-white/5 border border-white/5 py-1.5 px-3 rounded-2xl hover:bg-[#EF4444]/10 hover:border-[#EF4444]/20 hover:text-[#EF4444] transition-all"
                      >
                        {getPlatformIcon(link.platform)}
                        <span className="text-[10px] font-black uppercase tracking-tight">{link.platform}</span>
                      </a>
                    ))}
                  </div>
                )}
                
                {/* EXP Bar */}
                <div className="mt-6 w-full md:max-w-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">EXP Level Progress</span>
                    <span className="text-[9px] font-black text-[#EF4444] uppercase tracking-widest">
                      {profile.levelInfo?.exp || 0} / {getExpForNextLevel(profile.levelInfo?.level || 1)}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${getProgressToNextLevel(profile.levelInfo?.exp || 0)}%` }}
                      className="h-full bg-gradient-to-r from-[#EF4444] to-[#FCA5A5] rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats & Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info Column */}
          <div className="md:col-span-2 space-y-6">
            {/* Recommendations */}
            <div className="bg-[#16161a] p-8 rounded-[40px] border border-white/5 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#EF4444]/10 rounded-xl text-[#EF4444]">
                  <Sparkles size={18} />
                </div>
                <div>
                   <h3 className="text-sm font-black uppercase tracking-[0.2em]">Rekomendasi Anime</h3>
                   <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Anime favorit @{profile.username}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {profile.recommendations && profile.recommendations.length > 0 ? (
                  profile.recommendations.map((rec: any, idx: number) => (
                    <motion.div 
                      key={rec.id + idx}
                      onClick={() => navigate(`/anime/${rec.slug}`)}
                      className="group cursor-pointer"
                    >
                      <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-[#0f0f13] border border-white/5 relative">
                        <img 
                          src={getImageUrl(rec.image)} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" 
                          alt={rec.title} 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                           <p className="text-[10px] font-black uppercase leading-tight text-white line-clamp-2">{rec.title}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
                     <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Belum ada rekomendasi</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Achivements / Vibe */}
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-[#16161a] p-6 rounded-[32px] border border-white/5 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-[#EF4444]/10 rounded-2xl flex items-center justify-center mb-3 text-[#EF4444]">
                     <Award size={24} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Anime Master</span>
                  <span className="text-[9px] font-bold text-white/20 uppercase mt-1">Level {profile.levelInfo?.level || 1} User</span>
               </div>
               <div className="bg-[#16161a] p-6 rounded-[32px] border border-white/5 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-3 text-blue-500">
                     <Flame size={24} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Top Supporter</span>
                  <span className="text-[9px] font-bold text-white/20 uppercase mt-1">Active Community Member</span>
               </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-[#16161a] p-8 rounded-[40px] border border-white/5">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-6">User Stats</h3>
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Bergabung</span>
                      <span className="text-[10px] font-black text-[#EF4444] uppercase tracking-widest">{profile.joinDate}</span>
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Status</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${profile.isOnline ? 'text-green-500' : 'text-white/20'}`}>
                         {profile.isOnline ? 'Online' : 'Offline'}
                      </span>
                   </div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-[#EF4444]/20 to-transparent p-8 rounded-[40px] border border-[#EF4444]/10">
               <h3 className="text-sm font-black uppercase tracking-widest text-[#EF4444] mb-2">Support User</h3>
               <p className="text-[10px] font-bold text-white/40 uppercase leading-relaxed mb-4">
                  Beri apresiasi pada profile ini dengan mengikuti mereka!
               </p>
               <button className="w-full py-3 bg-[#EF4444] text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#EF4444]/20">
                  Follow @{profile.username}
               </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PublicProfile;
