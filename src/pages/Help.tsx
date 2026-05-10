import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  HelpCircle, 
  MessageSquare, 
  Send, 
  AlertCircle, 
  ShieldCheck, 
  Zap, 
  Search,
  ChevronDown,
  Mail,
  Instagram,
  Twitter,
  Github
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Help = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'faq' | 'feedback'>('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Kenapa video tidak bisa di putar?",
      a: "Masalah ini biasanya terjadi karena koneksi internet yang tidak stabil atau server video sedang mengalami gangguan. Cobalah untuk mengganti Server di pojok kanan bawah player Video. Jika masih bermasalah, hapus cache browser anda atau coba lagi beberapa saat kemudian.",
      category: "Streaming"
    },
    {
      q: "Cara mengatur kualitas video?",
      a: "Anda dapat mengatur kualitas video (360p, 480p, 720p, 1080p) melalui ikon Settings (Gigi Roda) pada player video. Harap dicatat bahwa ketersediaan kualitas tergantung pada server yang dipilih.",
      category: "Streaming"
    },
    {
      q: "Apakah ChisaStream gratis selamanya?",
      a: "Ya! ChisaStream berkomitmen untuk memberikan akses anime berkualitas secara gratis tanpa biaya langganan apapun. Kami hanya mengandalkan donasi dan dukungan komunitas untuk biaya server.",
      category: "Akun"
    },
    {
      q: "Bagaimana cara menyimpan koleksi anime?",
      a: "Cukup klik ikon Bookmark (Simpan) di halaman detail anime. Semua anime yang anda simpan akan muncul di menu Koleksi pada profil anda.",
      category: "Fitur"
    },
    {
      q: "Data saya aman di ChisaStream?",
      a: "Tentu. Kami menggunakan Firebase Cloud Security yang terenkripsi untuk menyimpan preferensi dan riwayat tontonan anda. Kami tidak menyebarkan data pribadi anda ke pihak ketiga.",
      category: "Keamanan"
    },
    {
      q: "Ingin request anime yang belum ada?",
      a: "Anda bisa memberikan feedback melalui tab Feedback di halaman ini. Sertakan judul anime yang diinginkan, dan tim kami akan segera memprosesnya jika tersedia di database global.",
      category: "Fitur"
    }
  ];

  const filteredFaqs = faqs.filter(f => 
    f.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-[#EF4444] selection:text-black pb-32">
      <Navbar />

      <main className="pt-32 max-w-4xl mx-auto px-6">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-16">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-[#EF4444] text-black rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(246,207,128,0.3)] mb-6"
          >
            <HelpCircle size={32} />
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4"
          >
            Bantuan & <span className="text-[#EF4444]">Feedback</span>
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/40 text-sm md:text-base max-w-xl font-medium"
          >
            Punya kendala saat streaming atau ingin memberi saran untuk ChisaStream?
            Kami di sini untuk mendengarkan dan membantu setiap langkah anda.
          </motion.p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 bg-white/5 backdrop-blur-xl rounded-[28px] border border-white/5 mb-12 shadow-2xl max-w-sm mx-auto">
          <button 
            onClick={() => setActiveTab('faq')}
            className={`flex-1 py-4 px-6 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'faq' ? 'bg-[#EF4444] text-black' : 'text-white/40 hover:text-white'}`}
          >
            Pusat FAQ
          </button>
          <button 
            onClick={() => setActiveTab('feedback')}
            className={`flex-1 py-4 px-6 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'feedback' ? 'bg-[#EF4444] text-black' : 'text-white/40 hover:text-white'}`}
          >
             Kirim Saran
          </button>
        </div>

        <AnimatePresence>
          {activeTab === 'faq' ? (
            <motion.div 
              key="faq"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* FAQ Search */}
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#EF4444] transition-colors" />
                <input 
                  type="text" 
                  placeholder="Cari solusi kendala anda..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#16161a] border border-white/5 rounded-[32px] py-6 pl-16 pr-8 text-sm font-bold text-white focus:outline-none focus:border-[#EF4444]/40 transition-all placeholder:text-white/10 shadow-2xl"
                />
              </div>

              {/* FAQ List */}
              <div className="space-y-4">
                {filteredFaqs.map((faq, idx) => (
                  <div 
                    key={idx}
                    className="bg-[#16161a] border border-white/5 rounded-[28px] overflow-hidden group hover:border-[#EF4444]/20 transition-all shadow-xl"
                  >
                    <button 
                      onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                      className="w-full p-6 md:p-8 flex items-center justify-between text-left gap-4"
                    >
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-black uppercase text-[#EF4444] tracking-[0.3em]">{faq.category}</span>
                        <h3 className="text-sm md:text-lg font-black text-white group-hover:translate-x-2 transition-transform">{faq.q}</h3>
                      </div>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 text-white/20 transition-all ${expandedFaq === idx ? 'rotate-180 bg-[#EF4444] text-black shadow-lg shadow-[#EF4444]/20' : ''}`}>
                        <ChevronDown size={20} />
                      </div>
                    </button>
                    <AnimatePresence>
                      {expandedFaq === idx && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-6 md:px-8 pb-8"
                        >
                          <div className="h-px bg-white/5 mb-6"></div>
                          <p className="text-white/60 text-xs md:text-sm leading-relaxed font-medium">
                            {faq.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Still Need Help? */}
              <div className="bg-[#16161a] rounded-[40px] p-8 md:p-12 border border-[#EF4444]/10 flex flex-col md:flex-row items-center justify-between gap-8 mt-20">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-[#EF4444]/10 rounded-3xl flex items-center justify-center text-[#EF4444] border border-[#EF4444]/20">
                       <MessageSquare size={32} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-white">Masih butuh bantuan?</h3>
                       <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Kami Online 24/7 di Social Media</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <SocialBtn icon={<Instagram size={20} />} href="#" />
                    <SocialBtn icon={<Twitter size={20} />} href="#" />
                    <SocialBtn icon={<Github size={20} />} href="#" />
                 </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="feedback"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-[#16161a] rounded-[48px] p-8 md:p-12 border border-white/5 shadow-3xl"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-4">Saran Anda, <br/> Masa Depan Kami.</h2>
                    <p className="text-white/40 text-xs leading-relaxed font-medium">
                      ChisaStream di kembangkan oleh komunitas. Jika anda menemukan bug, ingin request fitur baru, 
                      atau merasa performa video lambat, beri tahu kami. Kami membaca setiap baris feedback yang masuk.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <FeedbackInfo icon={<Mail className="text-[#EF4444]"/>} text="ryu694602@gmail.com" />
                    <FeedbackInfo icon={<ShieldCheck className="text-[#EF4444]"/>} text="Data Anonim & Aman" />
                    <FeedbackInfo icon={<Zap className="text-[#EF4444]"/>} text="Fast Response System" />
                  </div>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-4">Judul Kendala</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: Bug di Player..." 
                        className="w-full bg-black/40 border border-white/5 rounded-[24px] py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-[#EF4444]/40 transition-all placeholder:text-white/5"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-4">Detail Pesan</label>
                      <textarea 
                        rows={5}
                        placeholder="Ceritakan detail masalah atau saran fitur yang anda inginkan..." 
                        className="w-full bg-black/40 border border-white/5 rounded-[24px] py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-[#EF4444]/40 transition-all placeholder:text-white/5 resize-none"
                      ></textarea>
                   </div>
                   <button className="w-full bg-[#EF4444] text-black h-16 rounded-[24px] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(246,207,128,0.2)]">
                      Kirim Feedback <Send size={16} />
                   </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

const SocialBtn = ({ icon, href }: { icon: any, href: string }) => (
  <a href={href} className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-white/40 hover:bg-[#EF4444] hover:text-black transition-all border border-white/5">
    {icon}
  </a>
);

const FeedbackInfo = ({ icon, text }: { icon: any, text: string }) => (
  <div className="flex items-center gap-4">
     <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
     </div>
     <span className="text-xs font-black text-white/60 tracking-wider uppercase">{text}</span>
  </div>
);

export default Help;
                                                                                                                                        
