import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { getImageUrl } from '../lib/imageUtils';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <img 
          src={getImageUrl("https://files.catbox.moe/bwznoo.png")} 
          alt="404 Not Found" 
          className="w-full aspect-square object-contain mb-8 filter drop-shadow-[0_0_50px_rgba(246,207,128,0.2)]"
        />
        
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter">WAADUUHH!!</h1>
        <p className="text-white/40 text-sm md:text-base mb-10 leading-relaxed font-medium">
          Halaman yang kamu cari nggak ada nih, mungkin sudah dihapus atau alamatnya salah. Yuk balik lagi ke beranda!
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
          <button 
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all active:scale-95"
          >
            <ArrowLeft size={16} />
            Kembali
          </button>
          <button 
            onClick={() => navigate('/')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-[#EF4444] text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-[0_15px_30px_rgba(246,207,128,0.3)] hover:scale-105 transition-all active:scale-95"
          >
            <Home size={16} />
            Beranda
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
