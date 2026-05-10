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
  AlertCircle
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
      const [allUsers, adminStats] = await Promise.all([
        userService.getAllUsers(),
        userService.getAdminStats()
      ]);
      setUsers(allUsers);
      setStats(adminStats);
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

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isAdmin === null || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#F6CF80] animate-spin" />
          <p className="text-white/40 font-black uppercase tracking-widest text-xs">Loading Security...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-[#F6CF80]/30">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 pt-24 pb-20">
        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2 mb-2 text-[#F6CF80]">
              <Shield size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Administrator Command Center</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">System <span className="text-[#F6CF80]">Dashboard</span></h1>
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
              <button className="px-6 py-2.5 bg-[#F6CF80] text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_10px_20px_rgba(246,207,128,0.2)]">Overview</button>
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
            { label: 'Total Registrations', value: stats?.totalUsers || 0, icon: Users, color: '#F6CF80' },
            { label: 'Active Today', value: stats?.loggedInToday || 0, icon: TrendingUp, color: '#4ADE80' },
            { label: 'Live Now', value: stats?.activeNow || 0, icon: Activity, color: '#F87171', pulse: true }
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#16161a] border border-white/5 rounded-[32px] p-8 relative overflow-hidden group hover:border-[#F6CF80]/20 transition-colors"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-white/5 text-white/40 group-hover:bg-[#F6CF80]/10 group-hover:text-[#F6CF80] transition-all">
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-[#F6CF80] transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="SEARCH BY NAME, USERNAME OR ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-[#F6CF80]/40 focus:bg-white/10 transition-all"
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
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${user.isAdmin ? 'bg-[#F6CF80]/10 border-[#F6CF80]/20 text-[#F6CF80]' : 'bg-white/5 border-white/5 text-white/20'}`}>
                        {user.isAdmin ? <Shield size={12} /> : <Users size={12} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{user.isAdmin ? 'Sys Admin' : 'Member'}</span>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                          <span className="text-[#F6CF80]">LVL {user.levelInfo?.level || 1}</span>
                          <span className="text-white/20">{user.levelInfo?.exp || 0} EXP</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden w-32">
                          <div 
                            className="h-full bg-linear-to-r from-[#F6CF80] to-[#E5B14B]" 
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
                          <Loader2 className="w-5 h-5 text-[#F6CF80] animate-spin" />
                        ) : (
                          <>
                            <button 
                              onClick={() => updateExp(user.uid, user.levelInfo?.exp || 0)}
                              title="Update EXP"
                              className="p-2.5 bg-white/5 border border-white/5 rounded-xl hover:bg-[#F6CF80]/10 hover:border-[#F6CF80]/20 hover:text-[#F6CF80] transition-all"
                            >
                              <Award size={18} />
                            </button>
                            <button 
                              onClick={() => toggleAdmin(user.uid, !!user.isAdmin)}
                              title={user.isAdmin ? "Revoke Admin" : "Make Admin"}
                              className={`p-2.5 border rounded-xl transition-all ${user.isAdmin ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20' : 'bg-white/5 border-white/5 hover:bg-[#F6CF80]/10 hover:border-[#F6CF80]/20 hover:text-[#F6CF80]'}`}
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
      </main>
    </div>
  );
};

export default AdminDashboard;
