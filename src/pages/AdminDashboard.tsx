import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Shield, 
  ShieldOff, 
  Trash2, 
  TrendingUp, 
  Activity, 
  Search, 
  Filter, 
  MoreVertical,
  ChevronRight,
  Zap,
  Award,
  ArrowLeft,
  Loader2,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Crown,
  Plus,
  Upload,
  Film
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userService, UserProfile } from '../services/userService';
import Navbar from '../components/Navbar';

interface AdminStats {
  totalUsers: number;
  loggedInToday: number;
  activeNow: number;
}

const AdminDashboard: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<(UserProfile & { uid: string, isAdmin?: boolean })[]>([]);
  const [customAnime, setCustomAnime] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', image_poster: '', image_cover: '', synopsis: '', type: 'TV', year: '', genre: '', episode: '', videoUrl: '', category: 'anime' as 'anime' | 'comic' | 'donghua' });
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    // Give it a small delay to ensure auth is fully ready
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let adminStatus = await userService.isAdmin();
    
    // If not admin, try to bootstrap first if they are the owner
    if (!adminStatus) {
      await userService.bootstrapAdmin();
      adminStatus = await userService.isAdmin();
    }

    setIsAdmin(adminStatus);
    if (!adminStatus) {
      navigate('/');
      return;
    }
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allUsers, adminStats, animes] = await Promise.all([
        userService.getAllUsers(),
        userService.getAdminStats(),
        userService.getCustomAnime()
      ]);
      setUsers(allUsers);
      setStats(adminStats);
      setCustomAnime(animes);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (uid: string, action: () => Promise<void>) => {
    setActionLoading(uid);
    setFeedback(null);
    try {
      await action();
      setFeedback({ type: 'success', message: 'Action completed successfully' });
      await fetchData();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Action failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const toggleAdmin = (uid: string, currentStatus: boolean) => {
    handleAction(uid, () => userService.updateUserAdminStatus(uid, !currentStatus));
  };

  const deleteUser = (uid: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action is irreversible.')) {
      handleAction(uid, () => userService.adminDeleteUser(uid));
    }
  };

  const updateExp = (uid: string, currentExp: number) => {
    const amountStr = window.prompt('Enter new total EXP:', currentExp.toString());
    if (amountStr !== null) {
      const amount = parseInt(amountStr);
      if (!isNaN(amount)) {
        handleAction(uid, () => userService.adminUpdateUserLevel(uid, amount));
      }
    }
  };

  const togglePremium = (uid: string, currentlyPremium: boolean) => {
    if (currentlyPremium) {
      if (!window.confirm('Cabut Premium dari user ini?')) return;
      handleAction(uid, () => userService.adminRevokePremium(uid));
    } else {
      const daysStr = window.prompt('Berikan Premium berapa hari? (7 = mingguan, 30 = bulanan, 365 = tahunan)', '7');
      if (!daysStr) return;
      const days = parseInt(daysStr);
      if (isNaN(days) || days <= 0) return;
      handleAction(uid, () => userService.adminGrantPremium(uid, days));
    }
  };

  const submitAnime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.image_poster) {
      setFeedback({ type: 'error', message: 'Title dan poster wajib diisi' });
      return;
    }
    setSubmitting(true);
    try {
      await userService.adminAddCustomAnime(form);
      setFeedback({ type: 'success', message: 'Anime berhasil diupload!' });
      setForm({ title: '', image_poster: '', image_cover: '', synopsis: '', type: 'TV', year: '', genre: '', episode: '', videoUrl: '', category: 'anime' });
      const animes = await userService.getCustomAnime();
      setCustomAnime(animes);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Upload gagal' });
    } finally {
      setSubmitting(false);
    }
  };

  const removeCustomAnime = async (id: string) => {
    if (!window.confirm('Hapus anime ini?')) return;
    try {
      await userService.adminDeleteCustomAnime(id);
      setCustomAnime(prev => prev.filter(a => a.id !== id));
      setFeedback({ type: 'success', message: 'Anime dihapus' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isAdmin === null || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#EF4444] animate-spin" />
          <p className="text-white/40 font-black uppercase tracking-widest text-xs">Loading Security...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-[#EF4444]/30">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 pt-24 pb-20">
        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2 mb-2 text-[#EF4444]">
              <Shield size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Administrator Command Center</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">System <span className="text-[#EF4444]">Dashboard</span></h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3"
          >
            <button 
              onClick={fetchData}
              className="p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-95 text-white/60"
            >
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="bg-[#16161a] border border-white/5 rounded-2xl p-1 flex">
              <button className="px-6 py-2.5 bg-[#EF4444] text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_10px_20px_rgba(246,207,128,0.2)]">Overview</button>
              <button className="px-6 py-2.5 text-white/40 font-black text-xs uppercase tracking-widest rounded-xl hover:text-white transition-all">Logs</button>
            </div>
          </motion.div>
        </header>

        {/* Feedback Alert */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className={`overflow-hidden`}
            >
              <div className={`p-4 rounded-2xl border flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <p className="text-sm font-bold uppercase tracking-tight">{feedback.message}</p>
                <button onClick={() => setFeedback(null)} className="ml-auto text-white/20 hover:text-white">✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { label: 'Total Registrations', value: stats?.totalUsers || 0, icon: Users, color: '#EF4444' },
            { label: 'Active Today', value: stats?.loggedInToday || 0, icon: TrendingUp, color: '#4ADE80' },
            { label: 'Live Now', value: stats?.activeNow || 0, icon: Activity, color: '#FCA5A5', pulse: true }
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#16161a] border border-white/5 rounded-[32px] p-8 relative overflow-hidden group hover:border-[#EF4444]/20 transition-colors"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-white/5 text-white/40 group-hover:bg-[#EF4444]/10 group-hover:text-[#EF4444] transition-all">
                    <card.icon size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{card.label}</span>
                </div>
                <div className="flex items-end gap-3">
                  <h2 className="text-5xl font-black tracking-tighter">{card.value}</h2>
                  {card.pulse && <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mb-2"></div>}
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <card.icon size={120} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* User Management Section */}
        <section className="bg-[#16161a] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl relative">
          <div className="p-8 md:p-10 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.02]">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-1">User Management</h3>
              <p className="text-xs font-bold text-white/20 uppercase tracking-widest leading-none">Manage access and profile stats for all users</p>
            </div>

            <div className="relative group w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-[#EF4444] transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="SEARCH BY NAME, USERNAME OR ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-[#EF4444]/40 focus:bg-white/10 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">User Profile</th>
                  <th className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Access Role</th>
                  <th className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Engagement Level</th>
                  <th className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Last Active</th>
                  <th className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <motion.tr 
                    key={user.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          <img src={user.avatar} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white/5" alt={user.name} />
                          {user.isOnline && (
                             <div className="absolute -right-1 -bottom-1 w-4 h-4 bg-green-500 border-4 border-[#16161a] rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <p className="font-black text-sm uppercase tracking-tight">{user.name}</p>
                          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${user.isAdmin ? 'bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]' : 'bg-white/5 border-white/5 text-white/20'}`}>
                        {user.isAdmin ? <Shield size={12} /> : <Users size={12} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{user.isAdmin ? 'Sys Admin' : 'Member'}</span>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                          <span className="text-[#EF4444]">LVL {user.levelInfo?.level || 1}</span>
                          <span className="text-white/20">{user.levelInfo?.exp || 0} EXP</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden w-32">
                          <div 
                            className="h-full bg-linear-to-r from-[#EF4444] to-[#DC2626]" 
                            style={{ width: `${( (user.levelInfo?.exp || 0) % 1000 ) / 10}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                        {user.lastSeen?.toDate ? user.lastSeen.toDate().toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex items-center justify-end gap-2">
                        {actionLoading === user.uid ? (
                          <Loader2 className="w-5 h-5 text-[#EF4444] animate-spin" />
                        ) : (
                          <>
                            <button 
                              onClick={() => updateExp(user.uid, user.levelInfo?.exp || 0)}
                              title="Update EXP"
                              className="p-2.5 bg-white/5 border border-white/5 rounded-xl hover:bg-[#EF4444]/10 hover:border-[#EF4444]/20 hover:text-[#EF4444] transition-all"
                            >
                              <Award size={18} />
                            </button>
                            <button
                              onClick={() => togglePremium(user.uid, !!user.isPremium)}
                              title={user.isPremium ? 'Cabut Premium' : 'Beri Premium'}
                              className={`p-2.5 border rounded-xl transition-all ${user.isPremium ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20' : 'bg-white/5 border-white/5 hover:bg-yellow-500/10 hover:border-yellow-500/20 hover:text-yellow-400'}`}
                            >
                              <Crown size={18} />
                            </button>
                            <button 
                              onClick={() => toggleAdmin(user.uid, !!user.isAdmin)}
                              title={user.isAdmin ? "Revoke Admin" : "Make Admin"}
                              className={`p-2.5 border rounded-xl transition-all ${user.isAdmin ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20' : 'bg-white/5 border-white/5 hover:bg-[#EF4444]/10 hover:border-[#EF4444]/20 hover:text-[#EF4444]'}`}
                            >
                              {user.isAdmin ? <ShieldOff size={18} /> : <Shield size={18} />}
                            </button>
                            <button 
                              onClick={() => deleteUser(user.uid)}
                              title="Delete User"
                              className="p-2.5 bg-white/5 border border-white/5 rounded-xl hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500 transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-4 text-white/20">
                        <Search size={48} />
                        <p className="font-black uppercase tracking-[0.3em] text-xs">No users found matching your query</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Custom Anime Upload */}
        <section className="mt-12 bg-[#16161a] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
          <div className="p-8 md:p-10 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-1">
              <Film className="text-[#EF4444]" size={20} />
              <h3 className="text-xl font-black uppercase tracking-tight">Upload Anime / Comic / Donghua</h3>
            </div>
            <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Konten yang diupload akan tampil di halaman Home dan section terkait</p>
          </div>
          <form onSubmit={submitAnime} className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-2">
              {(['anime', 'comic', 'donghua'] as const).map(c => (
                <button type="button" key={c} onClick={() => setForm({ ...form, category: c })}
                  className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${form.category === c ? 'bg-[#EF4444] text-black border-[#EF4444]' : 'bg-white/5 text-white/40 border-white/5 hover:border-white/10'}`}>
                  {c}
                </button>
              ))}
            </div>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Judul *" className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EF4444]/40" />
            <input value={form.episode} onChange={e => setForm({ ...form, episode: e.target.value })} placeholder="Episode (mis. Ep 12)" className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EF4444]/40" />
            <input required value={form.image_poster} onChange={e => setForm({ ...form, image_poster: e.target.value })} placeholder="URL Poster *" className="md:col-span-2 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EF4444]/40" />
            <input value={form.image_cover} onChange={e => setForm({ ...form, image_cover: e.target.value })} placeholder="URL Cover (opsional)" className="md:col-span-2 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EF4444]/40" />
            <input value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="Type (TV/Movie/OVA)" className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EF4444]/40" />
            <input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} placeholder="Tahun" className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EF4444]/40" />
            <input value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} placeholder="Genre (Action, Romance, ...)" className="md:col-span-2 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EF4444]/40" />
            <input value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} placeholder="Video URL (link nonton/embed)" className="md:col-span-2 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EF4444]/40" />
            <textarea value={form.synopsis} onChange={e => setForm({ ...form, synopsis: e.target.value })} placeholder="Sinopsis" rows={3} className="md:col-span-2 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EF4444]/40" />
            <button disabled={submitting} type="submit" className="md:col-span-2 flex items-center justify-center gap-2 py-3 bg-[#EF4444] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#DC2626] transition-all disabled:opacity-50">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {submitting ? 'Mengupload...' : 'Upload Konten'}
            </button>
          </form>

          {customAnime.length > 0 && (
            <div className="px-8 md:px-10 pb-10">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-4">Konten Tersimpan ({customAnime.length})</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {customAnime.map(a => (
                  <div key={a.id} className="relative group">
                    <div className="aspect-[3/4.2] rounded-xl overflow-hidden bg-white/5 border border-white/5">
                      <img src={a.image_poster} alt={a.title} className="w-full h-full object-cover" />
                    </div>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-tight line-clamp-1">{a.title}</p>
                    <p className="text-[9px] text-white/30 uppercase tracking-widest">{a.category}</p>
                    <button onClick={() => removeCustomAnime(a.id)} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
