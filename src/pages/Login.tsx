import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Github, ArrowLeft, Home, Mail, Lock, User as UserIcon, ShieldCheck, ChevronRight, Eye, EyeOff, Loader2, Camera, Zap, Check } from 'lucide-react';
import { userService } from '../services/userService';
import { auth } from '../lib/firebase';
import Swal from 'sweetalert2';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  GithubAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';

import { getImageUrl, handleImageError } from '../lib/imageUtils';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<'login' | 'register' | 'email'>('login');
  const [formData, setFormData] = useState({
    name: '',
    username: '@',
    email: '',
    password: '',
    confirmPassword: '',
    avatar: 'https://url.dinzid.my.id/mIXA9UR' // Default avatar
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const from = (location.state as any)?.from?.pathname || "/profile";

  const isValidEmail = (email: string) => {
    const allowedDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'protonmail.com'];
    const domain = email.split('@')[1];
    return allowedDomains.includes(domain?.toLowerCase());
  };

  const isStrongPassword = (pass: string) => {
    const commonPasswords = ['12345678', 'password', '123456789', 'admin123', 'qwertyuiop'];
    return pass.length >= 8 && !commonPasswords.includes(pass.toLowerCase());
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const url = await userService.uploadImage(file);
      setFormData(prev => ({ ...prev, avatar: url }));
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Foto profil terpilih!',
        showConfirmButton: false,
        timer: 2000,
        background: '#16161a',
        color: '#fff'
      });
    } catch (err) {
      showSwal('error', 'Gagal Upload', 'Gagal mengunggah foto profil.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const showSwal = (icon: 'success' | 'error' | 'warning' | 'info', title: string, text: string) => {
    Swal.fire({
      icon,
      title,
      text,
      background: '#16161a',
      color: '#fff',
      confirmButtonColor: '#EF4444',
      customClass: {
        popup: 'rounded-[32px] border border-white/10 shadow-2xl backdrop-blur-xl',
        title: 'font-black uppercase tracking-tight',
        confirmButton: 'rounded-xl font-bold px-8 py-3'
      }
    });
  };

  const saveSession = (profile: any, method: string) => {
    localStorage.setItem('last_login_session', JSON.stringify({
      name: profile.name,
      avatar: profile.avatar,
      email: profile.email,
      method: method
    }));
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const socialProfile = {
        name: result.user.displayName || 'Google User',
        avatar: result.user.photoURL || 'https://files.catbox.moe/5xj62b.jpg'
      };
      const profile = await userService.getProfile(result.user.uid, socialProfile);
      saveSession(profile, 'google');
      navigate(from, { replace: true });
    } catch (err: any) {
      showSwal('error', 'Login Gagal', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    const provider = new GithubAuthProvider();
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const socialProfile = {
        name: result.user.displayName || result.user.email?.split('@')[0] || 'GitHub User',
        avatar: result.user.photoURL || 'https://url.dinzid.my.id/mIXA9UR'
      };
      const profile = await userService.getProfile(result.user.uid, socialProfile);
      saveSession(profile, 'github');
      navigate(from, { replace: true });
    } catch (err: any) {
      showSwal('error', 'Login Gagal', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (view === 'register') {
      if (!formData.name || !formData.email || !formData.password || !formData.username) {
        return showSwal('warning', 'Data Belum Lengkap', 'Silahkan isi semua kolom pendaftaran.');
      }
      if (!isValidEmail(formData.email)) {
        return showSwal('error', 'Email Tidak Valid', 'Gunakan email resmi (Gmail, Yahoo, dll) dan bukan domain terlarang.');
      }
      if (!isStrongPassword(formData.password)) {
        return showSwal('error', 'Password Lemah', 'Password minimal 8 karakter dan tidak boleh terlalu simpel!');
      }
      if (formData.password !== formData.confirmPassword) {
        return showSwal('error', 'Password Beda', 'Konfirmasi password tidak cocok!');
      }
      if (!isVerified) {
        return showSwal('warning', 'Verifikasi Dulu', 'Silahkan geser slider untuk verifikasi bot.');
      }
    }

    setIsLoading(true);
    try {
      if (view === 'register') {
        const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await updateProfile(userCred.user, { 
          displayName: formData.name,
          photoURL: formData.avatar
        });
        await userCred.user.reload();
        await userService.saveProfile({ 
          name: formData.name,
          username: formData.username.replace('@', ''),
          avatar: formData.avatar,
          joinDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        });
        
        Swal.fire({
          icon: 'success',
          title: 'Daftar Berhasil!',
          text: `Halo ${formData.name}, akunmu sudah siap!`,
          background: '#16161a',
          color: '#fff',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        const userCred = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        const profile = await userService.getProfile(userCred.user.uid);
        saveSession(profile, 'email');
        
        Swal.fire({
          icon: 'success',
          title: 'Selamat Datang',
          text: `Senang melihatmu kembali, ${profile.name || userCred.user.displayName || 'Brosis'}!`,
          background: '#16161a',
          color: '#fff',
          timer: 1500,
          showConfirmButton: false
        });
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      showSwal('error', 'Terjadi Kesalahan', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center font-sans selection:bg-[#EF4444] selection:text-black overflow-hidden">
      {/* Background Image - Fixed and Immersive */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://files.catbox.moe/53dr3h.jpg" 
          className="w-full h-full object-cover Scale-hover" 
          alt="Background" 
        />
        {/* Cinematic darkened vignette */}
        <div className="absolute inset-0 bg-black/60 md:bg-black/40 xl:bg-black/30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />
      </div>

      {/* Top Controls */}
      <div className="absolute top-8 left-8 z-50">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-3 bg-black/40 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl hover:bg-white/10 transition-all group active:scale-95"
        >
          <Home size={20} className="text-[#EF4444]" />
          <span className="text-white text-xs font-black uppercase tracking-[0.2em]">Beranda</span>
        </button>
      </div>

      <div className="w-full max-w-sm relative z-10 px-6 overflow-y-auto max-h-[90vh] no-scrollbar py-12">
        
        <AnimatePresence mode="wait">
          {view === 'login' && (
            <motion.div 
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center text-center w-full"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-4"
              >
                <p className="text-[#EF4444] text-[11px] font-black uppercase tracking-[0.5em] mb-2">HI THERE,</p>
                <h2 className="text-white text-4xl font-black italic tracking-tighter mb-1 mt-[-8px] select-none">Welcome Back</h2>
              </motion.div>

              {/* Logo Section - Design Matched to Screenshot */}
              <div className="mb-10 flex flex-col items-center">
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                    delay: 0.2 
                  }}
                  className="w-48 h-48 md:w-56 md:h-56 drop-shadow-[0_0_60px_rgba(246,207,128,0.2)]"
                >
                  <img 
                    src="https://repgyetdcodkynrbxocg.supabase.co/storage/v1/object/public/images/telegram-1778401091005-146ffc5f.jpg" 
                    className="w-full h-full object-contain filter brightness-110 drop-shadow-2xl" 
                    alt="Logo" 
                  />
                </motion.div>
                
                <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter mt-[-20px] select-none flex">
                  <span className="text-[#EF4444]">Chisa</span>
                  <span className="text-white">Stream</span>
                </h1>

                <div className="w-full max-w-[280px] mt-6">
                  <p className="text-white/60 text-[13px] font-bold leading-relaxed">
                    Masuk kembali ke akun Anda untuk melanjutkan pengalaman menonton anime terbaik tanpa iklan.
                  </p>
                </div>
              </div>

              <div className="w-full space-y-3.5 pt-2">
                {/* Button Providers - Solid, Sharp, High Octane Design */}
                <motion.button 
                  whileHover={{ scale: 1.02, backgroundColor: '#ffffff' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGoogleLogin} 
                  disabled={isLoading}
                  className="w-full h-[64px] bg-white rounded-2xl flex items-center justify-center gap-4 transition-all shadow-[0_15px_30px_rgba(0,0,0,0.6)] group"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-7 h-7" alt="Google" />
                  <span className="text-black font-black text-xs uppercase tracking-[0.15em]">Sign in with Google</span>
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.02, borderColor: 'rgba(246,207,128,0.5)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGithubLogin} 
                  disabled={isLoading}
                  className="w-full h-[64px] bg-[#121214] border-2 border-white/10 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-2xl"
                >
                  <Github className="text-white w-6 h-6" />
                  <span className="text-white font-black text-xs uppercase tracking-[0.15em]">Sign in with GitHub</span>
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.02, borderColor: 'rgba(246,207,128,0.5)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView('email')}
                  disabled={isLoading}
                  className="w-full h-[64px] bg-[#121214] border-2 border-white/10 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-2xl"
                >
                  <Mail className="text-white w-6 h-6" />
                  <span className="text-white font-black text-xs uppercase tracking-[0.15em]">Sign in with Email</span>
                </motion.button>

                <div className="pt-8">
                  <p className="text-white/40 text-[13px] font-medium">
                    Belum punya akun? <button onClick={() => setView('register')} className="text-[#EF4444] font-black hover:underline transition-all uppercase tracking-wider ml-1">Daftar Sekarang <ChevronRight className="inline w-3 h-3 ml-1" /></button>
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'email' && (
            <motion.div 
              key="email"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center w-full"
            >
               <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 text-center"
              >
                <h2 className="text-white text-3xl font-black uppercase tracking-tight mb-1">Hi User!</h2>
                <p className="text-[#EF4444] text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Please authenticate to continue</p>
              </motion.div>

              <div className="w-32 h-32 mb-10 drop-shadow-[0_0_50px_rgba(246,207,128,0.3)]">
                <img src="https://repgyetdcodkynrbxocg.supabase.co/storage/v1/object/public/images/telegram-1778401091005-146ffc5f.jpg" className="w-full h-full object-contain transition-transform hover:scale-110 contrast-125" alt="Logo" />
              </div>

              <div className="w-full space-y-4">
                <div className="space-y-3">
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#EF4444] transition-colors"><Mail size={18} /></div>
                    <input 
                      type="email" 
                      placeholder="EMAIL ADDRESS" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full h-[64px] bg-[#0c0c0e] border-2 border-white/5 rounded-2xl pl-14 pr-6 text-white outline-none focus:border-[#EF4444]/40 transition-all font-black text-[11px] uppercase tracking-widest shadow-xl"
                    />
                  </div>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#EF4444] transition-colors"><Lock size={18} /></div>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="PASSWORD" 
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full h-[64px] bg-[#0c0c0e] border-2 border-white/5 rounded-2xl pl-14 pr-14 text-white outline-none focus:border-[#EF4444]/40 transition-all font-black text-[11px] uppercase tracking-widest shadow-xl"
                    />
                    <button 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEmailAuth}
                  disabled={isLoading}
                  className="w-full h-[64px] bg-[#EF4444] text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-[0_20px_40px_rgba(246,207,128,0.3)] active:scale-95 transition-all mt-4"
                >
                  {isLoading ? 'Processing...' : 'Authentication'}
                </motion.button>

                <button onClick={() => setView('login')} className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 hover:text-white transition-colors pt-4">
                  <ArrowLeft size={12} /> Back to Providers
                </button>
              </div>
            </motion.div>
          )}

          {view === 'register' && (
            <motion.div 
              key="register"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center w-full"
            >
              <div className="flex flex-col items-center mb-8 relative">
                <div onClick={() => fileInputRef.current?.click()} className="w-32 h-32 rounded-[32px] overflow-hidden bg-[#0c0c0e] border-2 border-white/5 hover:border-[#EF4444]/50 transition-all cursor-pointer group shadow-2xl relative">
                  <img src={formData.avatar} className="w-full h-full object-cover group-hover:scale-110 transition-all" alt="Avatar" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingAvatar ? <Loader2 className="text-[#EF4444] animate-spin" /> : <Camera className="text-white" />}
                  </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                <h2 className="text-white text-2xl font-black uppercase tracking-tight mt-6 mb-1">Create Account</h2>
                <p className="text-[#EF4444] text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Setup your premium identity</p>
              </div>

              <div className="w-full space-y-3">
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#EF4444] transition-colors"><UserIcon size={18} /></div>
                  <input 
                    type="text" 
                    placeholder="FULL NAME" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full h-[60px] bg-[#0c0c0e] border-2 border-white/5 rounded-2xl pl-14 pr-6 text-white outline-none focus:border-[#EF4444]/40 transition-all font-black text-[11px] uppercase tracking-widest shadow-xl"
                  />
                </div>
                <div className="relative group">
                   <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#EF4444] transition-colors"><Zap size={18} /></div>
                   <input 
                     type="text" 
                     placeholder="USERNAME (EX: @USER)" 
                     value={formData.username}
                     onChange={(e) => {
                       let val = e.target.value;
                       if (!val.startsWith('@')) val = '@' + val;
                       setFormData({...formData, username: val});
                     }}
                     className="w-full h-[60px] bg-[#0c0c0e] border-2 border-white/5 rounded-2xl pl-14 pr-6 text-white outline-none focus:border-[#EF4444]/40 transition-all font-black text-[11px] uppercase tracking-widest shadow-xl"
                   />
                </div>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#EF4444] transition-colors"><Mail size={18} /></div>
                  <input 
                    type="email" 
                    placeholder="EMAIL ADDRESS" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full h-[60px] bg-[#0c0c0e] border-2 border-white/5 rounded-2xl pl-14 pr-6 text-white outline-none focus:border-[#EF4444]/40 transition-all font-black text-[11px] uppercase tracking-widest shadow-xl"
                  />
                </div>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#EF4444] transition-colors"><Lock size={18} /></div>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="PASSWORD" 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full h-[60px] bg-[#0c0c0e] border-2 border-white/5 rounded-2xl pl-14 pr-14 text-white outline-none focus:border-[#EF4444]/40 transition-all font-black text-[11px] uppercase tracking-widest shadow-xl"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#EF4444] transition-colors"><ShieldCheck size={18} /></div>
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    placeholder="CONFIRM PASSWORD" 
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className="w-full h-[60px] bg-[#0c0c0e] border-2 border-white/5 rounded-2xl pl-14 pr-14 text-white outline-none focus:border-[#EF4444]/40 transition-all font-black text-[11px] uppercase tracking-widest shadow-xl"
                  />
                  <button 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Verification Slider */}
                <div className="pt-4 pb-2">
                  <div className="relative h-14 bg-white/5 rounded-2xl overflow-hidden group border border-white/5">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 select-none">
                        {isVerified ? 'VERIFIED' : 'Slide to Verify'}
                      </span>
                    </div>
                    <motion.div 
                      className={`absolute top-0 left-0 h-full bg-[#EF4444]/20 flex items-center justify-end pr-4 transition-colors ${isVerified ? 'bg-green-500/20' : ''}`}
                      style={{ width: `${Math.max(sliderValue, 60)}px` }}
                    >
                       {isVerified && <Check size={20} className="text-green-500 animate-in zoom-in" />}
                    </motion.div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={sliderValue}
                      disabled={isVerified}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setSliderValue(val);
                        if (val >= 95) {
                          setSliderValue(100);
                          setIsVerified(true);
                        }
                      }}
                      onMouseUp={() => { if(!isVerified) setSliderValue(0); }}
                      onTouchEnd={() => { if(!isVerified) setSliderValue(0); }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <motion.div 
                      className={`absolute top-1 bottom-1 w-12 rounded-xl flex items-center justify-center shadow-2xl transition-colors ${isVerified ? 'bg-green-500' : 'bg-[#EF4444]'}`}
                      style={{ left: `calc(${sliderValue}% * 0.85 + 4px)` }}
                    >
                      <Zap size={18} className={isVerified ? 'text-white' : 'text-black'} />
                    </motion.div>
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEmailAuth}
                  disabled={isLoading}
                  className="w-full h-[60px] bg-[#EF4444] text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-[0_20px_40_rgba(246,207,128,0.3)] active:scale-95 transition-all mt-4"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Register Now'}
                </motion.button>

                <div className="pt-6 text-center">
                  <p className="text-white/40 text-[13px] font-medium">
                    Sudah punya akun? <button onClick={() => setView('login')} className="text-[#EF4444] font-black uppercase tracking-wider ml-1 hover:underline">Masuk</button>
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes scaleHover {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .Scale-hover {
          animation: scaleHover 30s ease-in-out infinite;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 50px;
          height: 100%;
        }
      `}</style>
    </div>
  );
};

export default Login;


