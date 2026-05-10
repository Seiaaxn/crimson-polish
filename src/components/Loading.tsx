import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const Loading = () => {
  return (
    <div className="fixed inset-0 z-[999] bg-[#0a0a0c] flex flex-col items-center justify-center">
      <div className="w-64 h-64 md:w-80 md:h-80 relative">
        <DotLottieReact
          src="https://lottie.host/be99b40a-b368-4a47-8462-6ea7a05d8a4d/07QOTO7jEJ.lottie"
          loop
          autoplay
        />
      </div>
      <div className="mt-[-20px] flex flex-col items-center gap-2">
        <p className="text-[#F6CF80] text-sm md:text-base font-black uppercase tracking-[0.4em] animate-pulse">Loading</p>
        <div className="w-12 h-[2px] bg-[#F6CF80]/20 rounded-full overflow-hidden">
          <div className="w-full h-full bg-[#F6CF80] origin-left animate-[loading-bar_1.5s_infinite_ease-in-out]"></div>
        </div>
      </div>

      <style>{`
        @keyframes loading-bar {
          0% { transform: scaleX(0); }
          50% { transform: scaleX(1); }
          100% { transform: scaleX(0); transform-origin: right; }
        }
      `}</style>
    </div>
  );
};

export default Loading;
