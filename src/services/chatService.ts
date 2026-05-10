import { db, auth } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  where,
  getDocs
} from 'firebase/firestore';
import { UserProfile, userService } from './userService';

export interface ChatMessage {
  id?: string;
  userId: string;
  name: string;
  username: string;
  avatar: string;
  level: number;
  text: string;
  createdAt: any;
  replyTo?: {
    id: string;
    text: string;
    username: string;
  };
  mentions?: string[]; // list of usernames mentioned
  isOnline?: boolean;
}

export const chatService = {
  subscribeToMessages: (callback: (messages: ChatMessage[]) => void) => {
    const chatRef = collection(db, 'global_chat');
    const q = query(chatRef, orderBy('createdAt', 'desc'), limit(100));

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage))
        .reverse(); // Show oldest at top, newest at bottom for chat
      callback(messages);
    }, (error) => {
      console.error('Chat subscription error:', error);
    });
  },

  sendMessage: async (text: string, replyTo?: ChatMessage['replyTo']) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in to chat');

    const profile = await userService.getProfile();
    
    // Extract mentions
    const mentions = text.match(/@(\w+)/g)?.map(m => m.slice(1)) || [];

    const messageData: Omit<ChatMessage, 'id'> = {
      userId: user.uid,
      name: profile.name,
      username: profile.username,
      avatar: profile.avatar,
      level: profile.levelInfo?.level || 1,
      text,
      createdAt: serverTimestamp(),
      mentions
    };

    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    await addDoc(collection(db, 'global_chat'), messageData);
  },

  deleteMessage: async (messageId: string) => {
    const user = auth.currentUser;
    if (!user) return;
    
    // In a real app, rules would handle permission. 
    // Here we just call the delete.
    await deleteDoc(doc(db, 'global_chat', messageId));
  },

  searchUsers: async (searchTerm: string): Promise<UserProfile[]> => {
    const usersRef = collection(db, 'users');
    let q;
    
    if (searchTerm === '' || searchTerm === '@') {
      // Get some recent users or just a few users if no search term
      q = query(usersRef, limit(10));
    } else {
      const cleanTerm = searchTerm.startsWith('@') ? searchTerm.slice(1) : searchTerm;
      q = query(
        usersRef, 
        where('username', '>=', cleanTerm), 
        where('username', '<=', cleanTerm + '\uf8ff'),
        limit(5)
      );
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
  },

  checkUnreadMentions: (username: string, lastReadAt: any, callback: (count: number) => void) => {
    if (!username) return () => {};
    
    const chatRef = collection(db, 'global_chat');
    let q;
    
    if (lastReadAt) {
      q = query(
        chatRef,
        where('mentions', 'array-contains', username.replace('@', '')),
        where('createdAt', '>', lastReadAt),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
    } else {
      q = query(
        chatRef,
        where('mentions', 'array-contains', username.replace('@', '')),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
    }

    return onSnapshot(q, (snapshot) => {
      callback(snapshot.size);
    });
  }
};
