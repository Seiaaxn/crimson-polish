import { auth, db } from '../lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  deleteDoc,
  where,
  serverTimestamp,
  Timestamp,
  getDocFromServer,
  onSnapshot
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export interface UserSettings {
  autoNext: boolean;
  autoSkipOpEd: boolean;
  showContinueWatching: boolean;
  apiServer?: 'main' | 'backup' | 'sanka';
  fallbackStream?: boolean;
}

export interface UserLevelInfo {
  level: number;
  exp: number;
  unlockedBadges: string[];
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  rewardExp: number;
  type: 'watch' | 'comment' | 'bookmark' | 'login';
}

export interface UserProfile {
  name: string;
  username: string;
  avatar: string;
  banner: string;
  joinDate: string;
  isOnline?: boolean;
  lastSeen?: any;
  lastChatReadAt?: any;
  settings?: UserSettings;
  levelInfo?: UserLevelInfo;
  dailyQuests?: DailyQuest[];
  lastQuestUpdate?: any;
  bio?: string;
  links?: {
    platform: 'whatsapp' | 'instagram' | 'tiktok' | 'facebook' | 'x' | 'other';
    url: string;
  }[];
  recommendations?: {
    id: string;
    slug: string;
    title: string;
    image: string;
    addedAt: any;
  }[];
}

export interface UserStats {
  animeWatched: number;
  animeSaved: number;
  hoursWatched: number;
}

export interface Bookmark {
  id?: string;
  title: string;
  image: string;
  cover?: string;
  slug: string;
  type?: string;
  status?: string;
  server?: 'main' | 'backup' | 'sanka';
  addedAt: any;
}

export interface DownloadItem {
  id?: string;
  title: string;
  episode: string;
  slug: string;
  downloadedAt: any;
}

export interface HistoryItem {
  id?: string;
  title: string;
  image: string;
  cover?: string;
  slug: string;
  episode: string;
  timestamp: number;
  duration: number;
  watchedAt: any;
  server?: 'main' | 'backup' | 'sanka';
}

export interface Comment {
  id?: string;
  animeSlug: string;
  episodeIndex: number;
  userId: string;
  userName: string;
  userUsername: string;
  userAvatar: string;
  userExp?: number;
  content: string;
  parentId?: string;
  createdAt: any;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoSkipOpEd: false,
  showContinueWatching: true,
  apiServer: 'sanka',
  fallbackStream: false,
};

const DEFAULT_PROFILE: UserProfile = {
  name: 'DinzStream User',
  username: 'user',
  avatar: 'https://url.dinzid.my.id/buzJJc8',
  banner: 'https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=800&auto=format&fit=crop&q=60',
  joinDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
  settings: DEFAULT_SETTINGS,
};

export const EXP_PER_LEVEL = 1000;
export const EXP_SOURCES = {
  COMMENT: 50,
  WATCH_5MIN: 100,
  BOOKMARK: 30,
  DAILY_LOGIN: 200,
  QUEST_BONUS: 500
};

const DEFAULT_QUESTS: DailyQuest[] = [
  { id: 'q1', title: 'Pecinta Komentar', description: 'Kirim 3 komentar di anime apa saja', target: 3, current: 0, rewardExp: 150, type: 'comment' },
  { id: 'q2', title: 'Maraton Sejati', description: 'Tonton anime selama 15 menit', target: 3, current: 0, rewardExp: 300, type: 'watch' }, // 3 intervals of 5 mins
  { id: 'q3', title: 'Kolektor Digital', description: 'Simpan 1 anime baru ke bookmark', target: 1, current: 0, rewardExp: 100, type: 'bookmark' }
];

export const getLevelFromExp = (exp: number) => Math.floor(exp / EXP_PER_LEVEL) + 1;
export const getExpForNextLevel = (level: number) => level * EXP_PER_LEVEL;
export const getProgressToNextLevel = (exp: number) => {
  const level = getLevelFromExp(exp);
  const currentLevelExp = (level - 1) * EXP_PER_LEVEL;
  const progress = exp - currentLevelExp;
  return (progress / EXP_PER_LEVEL) * 100;
};

export const userService = {
  EXP_SOURCES,
  testConnection: async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if(error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  },

  getProfile: async (userId?: string, initialData?: Partial<UserProfile>): Promise<UserProfile> => {
    const uid = userId || auth.currentUser?.uid;
    if (!uid) return DEFAULT_PROFILE;
    
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, path);
      const docSnap = await getDoc(docRef);
      let profile: UserProfile;

      if (docSnap.exists()) {
        profile = docSnap.data() as UserProfile;
        
        // If we have initialData and the current profile has a placeholder avatar, update it
        if (initialData?.avatar && (profile.avatar === DEFAULT_PROFILE.avatar || !profile.avatar)) {
          await updateDoc(docRef, { avatar: initialData.avatar });
          profile.avatar = initialData.avatar;
        }
      } else {
        // Create initial profile if not exists
        profile = { 
          ...DEFAULT_PROFILE,
          ...initialData,
          username: initialData?.username || `user_${uid.slice(0, 5)}`,
          levelInfo: { level: 1, exp: 0, unlockedBadges: [] },
          dailyQuests: DEFAULT_QUESTS,
          lastQuestUpdate: serverTimestamp()
        };
        await setDoc(docRef, profile);
      }

      // Check for daily quest reset and reward login exp
      const now = new Date();
      const lastUpdate = profile.lastQuestUpdate?.toDate ? profile.lastQuestUpdate.toDate() : new Date(profile.lastQuestUpdate || 0);
      
      if (now.getDate() !== lastUpdate.getDate() || now.getMonth() !== lastUpdate.getMonth() || now.getFullYear() !== lastUpdate.getFullYear()) {
        profile.dailyQuests = DEFAULT_QUESTS;
        profile.lastQuestUpdate = serverTimestamp();
        
        // Add Daily Login EXP locally to the profile we return
        const currentExp = profile.levelInfo?.exp || 0;
        const newExp = currentExp + EXP_SOURCES.DAILY_LOGIN;
        const newLevel = getLevelFromExp(newExp);
        
        profile.levelInfo = {
          ...(profile.levelInfo || { level: 1, exp: 0, unlockedBadges: [] }),
          exp: newExp,
          level: newLevel
        };

        await updateDoc(docRef, { 
          dailyQuests: DEFAULT_QUESTS, 
          lastQuestUpdate: serverTimestamp(),
          'levelInfo.exp': newExp,
          'levelInfo.level': newLevel
        });
      }

      return profile;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return DEFAULT_PROFILE;
    }
  },

  addExp: async (amount: number, reason?: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    
    const path = `users/${uid}`;
    try {
      const profile = await userService.getProfile();
      const currentInfo = profile.levelInfo || { level: 1, exp: 0, unlockedBadges: [] };
      const newExp = currentInfo.exp + amount;
      const newLevel = getLevelFromExp(newExp);
      
      const updates: any = {
        'levelInfo.exp': newExp,
        'levelInfo.level': newLevel
      };

      // Check level-up and unlock badges
      if (newLevel > currentInfo.level) {
        // Simple badge system: badge for level 5, 10, 20...
        const badges = [...(currentInfo.unlockedBadges || [])];
        if (newLevel >= 5 && !badges.includes('Elite V')) badges.push('Elite V');
        if (newLevel >= 10 && !badges.includes('Master X')) badges.push('Master X');
        if (newLevel >= 20 && !badges.includes('Legend XX')) badges.push('Legend XX');
        
        updates['levelInfo.unlockedBadges'] = badges;
      }

      await updateDoc(doc(db, path), updates);
      window.dispatchEvent(new CustomEvent('profile-update'));
      return { leveledUp: newLevel > currentInfo.level, newLevel };
    } catch (error) {
      console.error('Error adding EXP:', error);
    }
  },

  updateQuestProgress: async (type: DailyQuest['type'], increment: number = 1) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      const profile = await userService.getProfile();
      const quests = [...(profile.dailyQuests || [])];
      let changed = false;
      let expGained = 0;

      const updatedQuests = quests.map(q => {
        if (q.type === type && q.current < q.target) {
          const newCurrent = Math.min(q.target, q.current + increment);
          if (newCurrent !== q.current) {
            changed = true;
            if (newCurrent === q.target) {
              expGained += q.rewardExp;
            }
            return { ...q, current: newCurrent };
          }
        }
        return q;
      });

      if (changed) {
        await updateDoc(doc(db, `users/${uid}`), { dailyQuests: updatedQuests });
        if (expGained > 0) {
          await userService.addExp(expGained, 'Daily Quest Completed');
        }
      }
    } catch (error) {
      console.error('Error updating quest progress:', error);
    }
  },
  
  saveProfile: async (profile: Partial<UserProfile>) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const path = `users/${uid}`;
    try {
      await setDoc(doc(db, path), profile, { merge: true });
      window.dispatchEvent(new CustomEvent('profile-update'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  getBookmarks: async (): Promise<Bookmark[]> => {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    const path = `users/${uid}/bookmarks`;
    try {
      const q = query(collection(db, path), orderBy('addedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bookmark));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  toggleBookmark: async (anime: Omit<Bookmark, 'addedAt' | 'server'>) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;
    
    const profile = await userService.getProfile();
    const currentServer = profile?.settings?.apiServer || 'sanka';
    
    const path = `users/${uid}/bookmarks`;
    try {
      const existing = await userService.getBookmarks();
      const existingItem = existing.find(b => b.slug === anime.slug && (b.server || 'sanka') === currentServer);
      
      if (existingItem) {
        await deleteDoc(doc(db, path, existingItem.id!));
        return false;
      } else {
        await addDoc(collection(db, path), {
          ...anime,
          server: currentServer,
          addedAt: serverTimestamp()
        });
        
        // Add EXP for bookmarking
        await userService.addExp(EXP_SOURCES.BOOKMARK);
        await userService.updateQuestProgress('bookmark');
        
        return true;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return false;
    }
  },

  isBookmarked: async (slug: string): Promise<boolean> => {
    const bookmarks = await userService.getBookmarks();
    return bookmarks.some(b => b.slug === slug);
  },

  getDownloads: async (): Promise<DownloadItem[]> => {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    const path = `users/${uid}/downloads`;
    try {
      const q = query(collection(db, path), orderBy('downloadedAt', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DownloadItem));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  addDownload: async (item: Omit<DownloadItem, 'downloadedAt'>) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const path = `users/${uid}/downloads`;
    try {
      await addDoc(collection(db, path), {
        ...item,
        downloadedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  getHistory: async (server?: 'main' | 'backup' | 'sanka'): Promise<HistoryItem[]> => {
    const uid = auth.currentUser?.uid;
    const profile = await userService.getProfile();
    // Only filter by server if explicitly requested
    const filterServer = server;

    if (!uid) {
      const local = localStorage.getItem('guest_history');
      const history: HistoryItem[] = local ? JSON.parse(local) : [];
      if (filterServer) {
        return history.filter(h => (h.server || 'sanka') === filterServer);
      }
      return history;
    }
    const path = `users/${uid}/history`;
    try {
      let q;
      if (filterServer) {
        q = query(
          collection(db, path), 
          where('server', '==', filterServer),
          orderBy('watchedAt', 'desc'), 
          limit(50)
        );
      } else {
        q = query(
          collection(db, path),
          orderBy('watchedAt', 'desc'), 
          limit(50)
        );
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as HistoryItem));
    } catch (error) {
      const fallbackQ = query(collection(db, path), orderBy('watchedAt', 'desc'), limit(50));
      const fallbackSnap = await getDocs(fallbackQ);
      let items = fallbackSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as HistoryItem));
      if (filterServer) {
        items = items.filter(h => (h.server || 'sanka') === filterServer);
      }
      return items;
    }
  },

  addHistory: async (item: Omit<HistoryItem, 'watchedAt' | 'server'>, server?: 'main' | 'backup' | 'sanka') => {
    const uid = auth.currentUser?.uid;
    const profile = await userService.getProfile();
    const currentServer = server || profile?.settings?.apiServer || 'sanka';

    if (!uid) {
      const local = localStorage.getItem('guest_history');
      let history: HistoryItem[] = local ? JSON.parse(local) : [];
      
      const existingIdx = history.findIndex(h => h.slug === item.slug && h.episode === item.episode && (h.server || 'sanka') === currentServer);
      const newItem: HistoryItem = { 
        ...item, 
        server: currentServer,
        watchedAt: new Date().toISOString() 
      };

      if (existingIdx !== -1) {
        history[existingIdx] = newItem;
      } else {
        history.unshift(newItem);
      }
      
      // Sort by watchedAt desc
      history.sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime());
      
      // Limit to 50
      history = history.slice(0, 50);
      localStorage.setItem('guest_history', JSON.stringify(history));
      return;
    }
    const path = `users/${uid}/history`;
    try {
      // Find if already exists for this episode to update instead of add new
      const q = query(
        collection(db, path), 
        where('slug', '==', item.slug), 
        where('episode', '==', item.episode),
        where('server', '==', currentServer)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, { 
          timestamp: item.timestamp,
          duration: item.duration,
          watchedAt: serverTimestamp() 
        });
      } else {
        await addDoc(collection(db, path), {
          ...item,
          server: currentServer,
          watchedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  getContinueWatching: async (server?: 'main' | 'backup' | 'sanka'): Promise<HistoryItem[]> => {
    const history = await userService.getHistory(server);
    const uniqueBySlug = new Map<string, HistoryItem>();
    
    history.forEach(item => {
      // Use slug + server as unique key to avoid conflicts but prioritize most recent
      const key = `${item.slug}-${item.server || 'sanka'}`;
      if (!uniqueBySlug.has(key)) {
        uniqueBySlug.set(key, item);
      }
    });
    
    return Array.from(uniqueBySlug.values()).slice(0, 10);
  },

  getStats: async (): Promise<UserStats> => {
    const uid = auth.currentUser?.uid;
    if (!uid) return { animeWatched: 0, animeSaved: 0, hoursWatched: 0 };
    
    try {
      const bookmarks = await userService.getBookmarks();
      const history = await userService.getHistory();
      
      const uniqueSlugs = new Set(history.map(h => h.slug));
      
      return {
        animeWatched: uniqueSlugs.size,
        animeSaved: bookmarks.length,
        hoursWatched: Math.floor(history.length * 0.4),
      };
    } catch (error) {
      return { animeWatched: 0, animeSaved: 0, hoursWatched: 0 };
    }
  },

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/proxy-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      const result = await response.json();
      
      if (result.success && result.data?.length > 0) {
        return result.data[0].result.url;
      }
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Upload Error:', error);
      throw error;
    }
  },

  updateLastChatRead: async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await updateDoc(doc(db, `users/${uid}`), {
        lastChatReadAt: serverTimestamp()
      });
      window.dispatchEvent(new CustomEvent('profile-update'));
    } catch (e) {}
  },

  isAuthenticated: (): boolean => {
    return !!auth.currentUser;
  },

  logout: async () => {
    await auth.signOut();
  },

  clearHistory: async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const path = `users/${uid}/history`;
    try {
      const q = query(collection(db, path));
      const snap = await getDocs(q);
      const batchSize = snap.size;
      if (batchSize === 0) return;
      
      // Firestore doesn't have bulk delete in JS SDK without looping or callable functions
      // We'll loop for simplicity in this prototype context but mention it's better via functions
      const promises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(promises);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  clearBookmarks: async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const path = `users/${uid}/bookmarks`;
    try {
      const q = query(collection(db, path));
      const snap = await getDocs(q);
      if (snap.empty) return;
      const promises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(promises);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  deleteAccount: async () => {
    const user = auth.currentUser;
    if (!user) return;
    // Note: Re-authentication might be required for this sensitive operation
    try {
      // 1. Delete user data in Firestore
      const uid = user.uid;
      // We keep it simple: delete the profile doc
      await deleteDoc(doc(db, `users/${uid}`));
      // 2. Delete Auth Account
      await user.delete();
    } catch (error: any) {
      console.error('Delete Account Error:', error);
      throw error;
    }
  },

  updateSettings: async (settings: Partial<UserSettings>) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const path = `users/${uid}`;
    try {
      const profile = await userService.getProfile();
      const updatedSettings = { ...(profile.settings || DEFAULT_SETTINGS), ...settings };
      await updateDoc(doc(db, path), { settings: updatedSettings });
      return updatedSettings;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  
  updatePresence: async (isOnline: boolean) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, path), {
        isOnline,
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      // Fail silently for presence as it's a heartbeat/background task
      console.warn('Presence update failed:', error);
    }
  },

  subscribeToOnlineUsers: (callback: (users: UserProfile[]) => void) => {
    const path = 'users';
    // Users are online if isOnline is true AND lastSeen is within last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const q = query(
      collection(db, path), 
      where('isOnline', '==', true),
      orderBy('lastSeen', 'desc'),
      limit(50)
    );
    
    return onSnapshot(q, (snap) => {
      const users = snap.docs
        .map(doc => doc.data() as UserProfile)
        .filter(user => {
          if (!user.lastSeen) return false;
          const lastSeenDate = user.lastSeen.toDate ? user.lastSeen.toDate() : new Date(user.lastSeen);
          return lastSeenDate > tenMinutesAgo;
        });
      callback(users);
    });
  },

  getOnlineUsers: async (): Promise<UserProfile[]> => {
    const path = 'users';
    try {
      // Users are online if isOnline is true AND lastSeen is within last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const q = query(
        collection(db, path), 
        where('isOnline', '==', true),
        orderBy('lastSeen', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      return snap.docs
        .map(doc => doc.data() as UserProfile)
        .filter(user => {
          if (!user.lastSeen) return false;
          // Converting Firestore timestamp or serverTimestamp to Date
          const lastSeenDate = user.lastSeen.toDate ? user.lastSeen.toDate() : new Date(user.lastSeen);
          return lastSeenDate > tenMinutesAgo;
        });
    } catch (error) {
      console.error('Error fetching online users:', error);
      return [];
    }
  },

  subscribeToComments: (animeSlug: string, episodeIndex: number, callback: (comments: Comment[]) => void) => {
    const path = 'comments';
    const q = query(
      collection(db, path),
      where('animeSlug', '==', animeSlug),
      where('episodeIndex', '==', episodeIndex),
      orderBy('createdAt', 'asc')
    );
    
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      callback(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  addComment: async (comment: Omit<Comment, 'id' | 'createdAt'>) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in to comment');
    
    const path = 'comments';
    try {
      // Clean undefined values
      const cleanedComment = Object.fromEntries(
        Object.entries(comment).filter(([_, v]) => v !== undefined)
      );

      await addDoc(collection(db, path), {
        ...cleanedComment,
        createdAt: serverTimestamp()
      });

      // Add EXP for commenting
      await userService.addExp(EXP_SOURCES.COMMENT);
      await userService.updateQuestProgress('comment');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  deleteComment: async (commentId: string) => {
    const path = `comments/${commentId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // --- ADMIN SERVICES ---
  isAdmin: async (): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
      const adminDoc = await getDoc(doc(db, `admins/${user.uid}`));
      if (adminDoc.exists()) return true;
      
      // Fallback for owner: if they are the designated owner but doc doesn't exist, 
      // they should be allowed to view (bootstrap will catch up)
      const ownerEmail = 'gadingkencana04@gmail.com';
      return user.email === ownerEmail;
    } catch (e) {
      // Even if fetch fails, if email matches owner, we allow access 
      // (the subsequent data fetches will still be protected by rules)
      const ownerEmail = 'gadingkencana04@gmail.com';
      return user.email === ownerEmail;
    }
  },

  getAllUsers: async (): Promise<(UserProfile & { uid: string, isAdmin?: boolean })[]> => {
    if (!(await userService.isAdmin())) return [];
    
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const adminsSnap = await getDocs(collection(db, 'admins'));
      const adminIds = new Set(adminsSnap.docs.map(d => d.id));
      
      return usersSnap.docs.map(d => ({
        ...(d.data() as UserProfile),
        uid: d.id,
        isAdmin: adminIds.has(d.id)
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  updateUserAdminStatus: async (targetUid: string, shouldBeAdmin: boolean) => {
    if (!(await userService.isAdmin())) throw new Error('Unauthorized');
    
    try {
      if (shouldBeAdmin) {
        await setDoc(doc(db, `admins/${targetUid}`), {
          addedBy: auth.currentUser?.uid,
          addedAt: serverTimestamp()
        });
      } else {
        // Prevent self-demotion to avoid being locked out if they are the only admin
        if (targetUid === auth.currentUser?.uid) {
          throw new Error('You cannot remove yourself from admins');
        }
        await deleteDoc(doc(db, `admins/${targetUid}`));
      }
    } catch (error) {
      console.error('Error updating admin status:', error);
      throw error;
    }
  },

  adminUpdateUserLevel: async (targetUid: string, newExp: number) => {
    if (!(await userService.isAdmin())) throw new Error('Unauthorized');
    
    try {
      const newLevel = getLevelFromExp(newExp);
      await updateDoc(doc(db, `users/${targetUid}`), {
        'levelInfo.exp': newExp,
        'levelInfo.level': newLevel
      });
    } catch (error) {
      console.error('Error updating user level:', error);
      throw error;
    }
  },

  adminDeleteUser: async (targetUid: string) => {
    if (!(await userService.isAdmin())) throw new Error('Unauthorized');
    if (targetUid === auth.currentUser?.uid) throw new Error('Cannot delete yourself');

    try {
      await deleteDoc(doc(db, `users/${targetUid}`));
      // Also remove from admins if they were one
      await deleteDoc(doc(db, `admins/${targetUid}`));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  getAdminStats: async () => {
    if (!(await userService.isAdmin())) return null;
    
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs.map(d => d.data() as UserProfile);
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      
      const loggedInToday = allUsers.filter(u => {
        if (!u.lastSeen) return false;
        const lastSeenDate = u.lastSeen.toDate ? u.lastSeen.toDate().getTime() : new Date(u.lastSeen).getTime();
        return lastSeenDate >= today;
      }).length;

      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      const activeNow = allUsers.filter(u => {
        if (!u.lastSeen) return false;
        const lastSeenDate = u.lastSeen.toDate ? u.lastSeen.toDate().getTime() : new Date(u.lastSeen).getTime();
        return u.isOnline && lastSeenDate >= tenMinutesAgo;
      }).length;

      return {
        totalUsers: allUsers.length,
        loggedInToday,
        activeNow
      };
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      return null;
    }
  },

  // Initial setup function to bootstrap the first admin
  bootstrapAdmin: async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    // We only allow bootstrapping if the user is the one specified in the metadata or the first one ever
    const ownerEmail = 'gadingkencana04@gmail.com'; 
    if (user.email === ownerEmail) {
      try {
        const adminRef = doc(db, `admins/${user.uid}`);
        const snap = await getDoc(adminRef);
        if (!snap.exists()) {
          await setDoc(adminRef, {
            role: 'owner',
            email: user.email,
            addedAt: serverTimestamp()
          });
          console.log('Admin bootstrapped successfully');
        }
      } catch (e) {
        console.error('Bootstrap failed:', e);
      }
    }
  },

  getProfileByUsername: async (username: string): Promise<(UserProfile & { uid: string }) | null> => {
    try {
      const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { ...(snap.docs[0].data() as UserProfile), uid: snap.docs[0].id };
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  updateProfileFields: async (fields: Partial<UserProfile>) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await updateDoc(doc(db, `users/${uid}`), fields);
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  }
};

