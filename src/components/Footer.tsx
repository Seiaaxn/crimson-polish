import React, { useEffect, useState } from 'react';
import { Home, Search, Clock, PlayCircle, Calendar, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Footer = () => {
  const location = useLocation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: PlayCircle, label: 'Ongoing', path: '/ongoing' },
    { icon: Clock, label: 'History', path: '/history' },
    { icon: Calendar, label: 'Schedule', path: '/schedule' },
  ];

  useEffect(() => {
    const handleChatToggle = (e: any) => {
      setChatOpen(e.detail.isOpen);
    };
    window.addEventListener('chat-toggle', handleChatToggle);
    return () => window.removeEventListener('chat-toggle', handleChatToggle);
  }, []);

  useEffect(() => {
    const index = navItems.findIndex(item => item.path === location.pathname);
    if (index !== -1) setActiveIndex(index);
  }, [location.pathname]);

  return (
    <>
      {/* Brand Footer Section */}
      <footer className="w-full bg-[#0a0a0c] pt-20 pb-20 md:pb-32 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          {/* Main Logo */}
          <div className="w-24 h-24 mb-10 overflow-hidden">
            <img src="https://repgyetdcodkynrbxocg.supabase.co/storage/v1/object/public/images/telegram-1778401091005-146ffc5f.jpg" className="w-full h-full object-contain" alt="ChisaStream Logo" />
          </div>

          {/* About Section */}
          <h2 className="text-xl md:text-2xl font-black text-white mb-6 tracking-tight">Tentang ChisaStream</h2>
          <p className="text-white/40 text-xs md:text-sm leading-loose max-w-2xl mb-16">
            ChisaStream adalah platform streaming anime pihak ketiga. Kami tidak mengunggah atau menyimpan file video apa pun di server kami. Semua konten disediakan oleh pihak ketiga yang tidak terafiliasi dengan kami.
          </p>

          {/* Credits Section */}
          <h3 className="text-lg md:text-xl font-black text-white mb-10 tracking-tight">Terima Kasih Kepada</h3>
          
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 mb-20">
            <img referrerPolicy="no-referrer" src="https://url.dinzid.my.id/rs9VFwi" alt="Source" className="h-6 md:h-8 object-contain opacity-60 hover:opacity-100 transition-opacity" />
            <img referrerPolicy="no-referrer" src="https://url.dinzid.my.id/I8tAeqc" alt="Source" className="h-6 md:h-8 object-contain opacity-60 hover:opacity-100 transition-opacity" />
            <img referrerPolicy="no-referrer" src="https://url.dinzid.my.id/dlwKP5N" alt="Source" className="h-6 md:h-8 object-contain opacity-60 hover:opacity-100 transition-opacity" />
            <img referrerPolicy="no-referrer" src="https://url.dinzid.my.id/FuBCYl4" alt="Source" className="h-6 md:h-8 object-contain opacity-60 hover:opacity-100 transition-opacity" />
            <img referrerPolicy="no-referrer" src="https://url.dinzid.my.id/IAQcBwC" alt="Source" className="h-6 md:h-8 object-contain opacity-60 hover:opacity-100 transition-opacity" />
            <img referrerPolicy="no-referrer" src="https://url.dinzid.my.id/RCExzdT" alt="Source" className="h-6 md:h-8 object-contain opacity-60 hover:opacity-100 transition-opacity" />
            <img referrerPolicy="no-referrer" src="https://url.dinzid.my.id/dUA1il1" alt="Source" className="h-6 md:h-8 object-contain opacity-60 hover:opacity-100 transition-opacity" />
            <img referrerPolicy="no-referrer" src="https://url.dinzid.my.id/pbt4XPh" alt="Source" className="h-6 md:h-8 object-contain opacity-60 hover:opacity-100 transition-opacity" />
          </div>

          {/* Bottom Copyright */}
          <div className="w-full h-[1px] bg-white/5 mb-8"></div>
          <p className="text-[10px] md:text-xs font-black text-white/20 uppercase tracking-[0.3em]">
            © 2026 ChisaStream. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>

      <div className={`h-[105px] md:hidden transition-all duration-300 ${chatOpen ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-[105px]'}`} />
      
      <div className={`md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] h-[75px] z-[100] transition-all duration-300 ${chatOpen ? 'opacity-0 translate-y-20 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
        {/* Background SVG with Perfect "Curve Outside" Notch */}
        <div className="absolute inset-0 z-0 drop-shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
          <svg width="100%" height="100%" viewBox="0 0 400 85" preserveAspectRatio="none" className="fill-[#16161a]/80 backdrop-blur-3xl">
            <path d="M0 25 C0 11.1929 11.1929 0 25 0 H135 
                     C155 0 158 50 200 50 
                     C242 50 245 0 265 0 
                     H375 C388.807 0 400 11.1929 400 25 
                     V55 C400 68.8071 388.807 80 375 80 
                     H25 C11.1929 80 0 68.8071 0 55 
                     V25 Z" />
          </svg>
          {/* Subtle Border Definition */}
          <svg width="100%" height="100%" viewBox="0 0 400 85" preserveAspectRatio="none" className="absolute inset-0 fill-none stroke-white/[0.08] stroke-[1px] pointer-events-none">
             <path d="M0 25 C0 11.1929 11.1929 0 25 0 H135 
                     C155 0 158 50 200 50 
                     C242 50 245 0 265 0 
                     H375 C388.807 0 400 11.1929 400 25 
                     V55 C400 68.8071 388.807 80 375 80 
                     H25 C11.1929 80 0 68.8071 0 55 
                     V25 Z" />
          </svg>
        </div>

        {/* The Elevated Center Button (SEARCH) */}
        <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none">
          <div className="relative">
             {/* Glow for Center Button */}
             <div className={`absolute inset-0 blur-2xl rounded-full scale-150 transition-all duration-500 ${location.pathname === '/search' ? 'bg-[#F6CF80]/40' : 'bg-[#F6CF80]/10'}`}></div>
             
             <Link 
              to="/search" 
              className={`w-[74px] h-[74px] rounded-full flex items-center justify-center border-[6px] border-[#0a0a0c] transition-all duration-300 active:scale-90 pointer-events-auto shadow-2xl ${location.pathname === '/search' ? 'bg-[#F6CF80] text-black scale-105' : 'bg-[#1a1a1e] text-white/40 hover:text-white'}`}
             >
                <Search className="w-8 h-8" strokeWidth={3} />
             </Link>
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest mt-2 transition-all duration-500 ${location.pathname === '/search' ? 'text-[#F6CF80] opacity-100 translate-y-0' : 'text-white/20 opacity-0 translate-y-2'}`}>SEARCH</span>
        </div>

        {/* Sidebar Actions */}
        <div className="relative z-10 flex w-full h-full px-6">
          <div className="flex-1 flex items-center justify-between pr-8">
            <Link to="/" className="flex flex-col items-center gap-1 group transition-all active:scale-95">
              <Home className={`w-5 h-5 transition-all duration-300 ${location.pathname === '/' ? 'text-[#F6CF80] -translate-y-1' : 'text-white/30 group-hover:text-white/60'}`} strokeWidth={location.pathname === '/' ? 2.5 : 2} />
              <span className={`text-[8px] font-black uppercase tracking-tighter transition-all duration-500 ${location.pathname === '/' ? 'text-[#F6CF80] opacity-100 translate-y-0 scale-110' : 'text-white/10 opacity-0 translate-y-2'}`}>Home</span>
            </Link>
            <Link to="/schedule" className="flex flex-col items-center gap-1 group transition-all active:scale-95">
              <Calendar className={`w-5 h-5 transition-all duration-300 ${location.pathname === '/schedule' ? 'text-[#F6CF80] -translate-y-1' : 'text-white/30 group-hover:text-white/60'}`} strokeWidth={location.pathname === '/schedule' ? 2.5 : 2} />
              <span className={`text-[8px] font-black uppercase tracking-tighter transition-all duration-500 ${location.pathname === '/schedule' ? 'text-[#F6CF80] opacity-100 translate-y-0 scale-110' : 'text-white/10 opacity-0 translate-y-2'}`}>Schedule</span>
            </Link>
          </div>

          {/* Width spacer for the center button bulge */}
          <div className="w-20 shrink-0" />

          <div className="flex-1 flex items-center justify-between pl-8">
            <Link to="/history" className="flex flex-col items-center gap-1 group transition-all active:scale-95">
              <Clock className={`w-5 h-5 transition-all duration-300 ${location.pathname === '/history' ? 'text-[#F6CF80] -translate-y-1' : 'text-white/30 group-hover:text-white/60'}`} strokeWidth={location.pathname === '/history' ? 2.5 : 2} />
              <span className={`text-[8px] font-black uppercase tracking-tighter transition-all duration-500 ${location.pathname === '/history' ? 'text-[#F6CF80] opacity-100 translate-y-0 scale-110' : 'text-white/10 opacity-0 translate-y-2'}`}>History</span>
            </Link>
            <Link to="/profile" className="flex flex-col items-center gap-1 group transition-all active:scale-95">
              <User className={`w-5 h-5 transition-all duration-300 ${location.pathname === '/profile' ? 'text-[#F6CF80] -translate-y-1' : 'text-white/30 group-hover:text-white/60'}`} strokeWidth={location.pathname === '/profile' ? 2.5 : 2} />
              <span className={`text-[8px] font-black uppercase tracking-tighter transition-all duration-500 ${location.pathname === '/profile' ? 'text-[#F6CF80] opacity-100 translate-y-0 scale-110' : 'text-white/10 opacity-0 translate-y-2'}`}>Account</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Footer;
