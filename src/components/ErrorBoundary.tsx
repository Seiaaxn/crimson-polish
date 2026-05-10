import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-6 text-center">
          <motion.img 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            src="https://files.catbox.moe/b5adcf.png" 
            alt="Error Mascot" 
            className="w-48 h-48 md:w-64 md:h-64 object-contain mb-8 filter drop-shadow-2xl"
          />
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-md"
          >
            <h1 className="text-3xl md:text-4xl font-black mb-4 uppercase tracking-tighter text-[#F6CF80]">Waduh, Ada Yang Salah!</h1>
            <p className="text-white/60 mb-8 font-medium">Bisa jadi karena koneksi internet lagi jelek atau sistem sedang bermasalah. Coba muat ulang halamannya ya!</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-[#F6CF80] text-black font-black uppercase tracking-widest px-8 py-4 rounded-2xl hover:bg-white hover:scale-105 active:scale-95 transition-all outline-none flex items-center justify-center gap-2 mx-auto"
            >
              <RefreshCw size={20} />
              <span>Muat Ulang</span>
            </button>
          </motion.div>
        </div>
      );
    }

    return (this.props as any).children;
  }
}
