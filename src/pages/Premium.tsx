import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Crown, Check, MessageCircle, Sparkles, Zap, Shield, Star } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { userService } from '../services/userService';

const WA_NUMBER = '6285863756942';
const buildWaLink = (plan: string) =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
    `Halo Admin, saya mau membeli Premium ${plan} di Chisastream.`
  )}`;

const PLANS = [
  { id: 'weekly', label: 'Mingguan', price: 'Rp 5.000', period: '/ minggu', highlight: true, features: ['EXP 5x lebih cepat', 'Tanpa iklan', 'Akses semua episode', 'Badge Premium', 'Prioritas dukungan'] },
  { id: 'monthly', label: 'Bulanan', price: 'Rp 18.000', period: '/ bulan', highlight: false, features: ['EXP 5x lebih cepat', 'Semua fitur Mingguan', 'Hemat 10%', 'Download offline'] },
  { id: 'yearly', label: 'Tahunan', price: 'Rp 180.000', period: '/ tahun', highlight: false, features: ['EXP 5x lebih cepat', 'Semua fitur Bulanan', 'Hemat 25%', 'Akses early release'] },
];

const Premium: React.FC = () => {
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    userService.isPremium().then(setIsPremium);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pt-24 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-full mb-6">
            <Crown size={14} className="text-[#EF4444]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#EF4444]">Chisastream Premium</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
            Tonton Tanpa <span className="text-[#EF4444]">Batas</span>
          </h1>
          <p className="text-white/50 text-sm md:text-base max-w-xl mx-auto">
            Nikmati anime, comic, dan donghua tanpa iklan dengan akses penuh ke semua fitur premium.
          </p>
          {isPremium && (
            <div className="inline-flex items-center gap-2 mt-6 px-5 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
              <Sparkles size={16} className="text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Kamu sudah Premium aktif</span>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          {PLANS.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative rounded-3xl p-7 border transition-all ${
                p.highlight
                  ? 'bg-gradient-to-br from-[#EF4444]/20 via-[#16161a] to-[#16161a] border-[#EF4444]/40 shadow-[0_20px_60px_-20px_rgba(239,68,68,0.5)]'
                  : 'bg-[#16161a] border-white/5 hover:border-white/10'
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#EF4444] text-black text-[9px] font-black uppercase tracking-widest rounded-full">
                  Paling Populer
                </div>
              )}
              <div className="mb-5">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">{p.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tighter">{p.price}</span>
                  <span className="text-xs text-white/40 font-bold">{p.period}</span>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                    <Check size={16} className="text-[#EF4444] mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={buildWaLink(p.label)}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  p.highlight
                    ? 'bg-[#EF4444] text-black hover:bg-[#DC2626]'
                    : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                <MessageCircle size={14} /> Beli via WhatsApp
              </a>
            </motion.div>
          ))}
        </div>

        <div className="bg-[#16161a] border border-white/5 rounded-3xl p-6 md:p-8">
          <h3 className="text-lg font-black uppercase tracking-tight mb-5">Mengapa Premium?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { i: Zap, t: 'Tanpa Iklan', d: 'Streaming langsung, tanpa interupsi.' },
              { i: Shield, t: 'Kualitas HD', d: 'Akses kualitas tertinggi tersedia.' },
              { i: Star, t: 'Badge Eksklusif', d: 'Tampil dengan badge Premium di chat & profil.' },
            ].map(({ i: Icon, t, d }) => (
              <div key={t} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                <Icon className="text-[#EF4444] mb-3" size={22} />
                <p className="font-black text-sm mb-1">{t}</p>
                <p className="text-xs text-white/50">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-3">
            <MessageCircle size={16} />
            <span>Hubungi admin <strong className="text-emerald-200">+62 858-6375-6942</strong> untuk aktivasi setelah pembayaran.</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Premium;
