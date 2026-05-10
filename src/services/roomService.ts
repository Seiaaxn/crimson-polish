import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp, 
  query, 
  where,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface RoomState {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  animeSlug: string;
  animeTitle: string;
  animeImage?: string;
  animeBanner?: string;
  episodeIndex: number;
  currentPath?: string;
  password?: string;
  playbackState: {
    isPlaying: boolean;
    currentTime: number;
    lastUpdated: any;
  };
  members: {
    uid: string;
    name: string;
    avatar?: string;
  }[];
  status: 'open' | 'closed';
  createdAt: any;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: any;
}

class RoomService {
  private collectionName = 'rooms';

  async createRoom(anime: any, episodeIndex: number, password?: string): Promise<string> {
    if (!auth.currentUser) throw new Error('User not authenticated');

    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomRef = doc(db, this.collectionName, roomId);

    const animeSlug = anime.slug || `${anime.id}-${anime.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    const newRoom: Omit<RoomState, 'id'> = {
      hostId: auth.currentUser.uid,
      hostName: auth.currentUser.displayName || 'Anonymous Host',
      hostAvatar: auth.currentUser.photoURL || '',
      animeSlug,
      animeTitle: anime.title || 'Untitled Anime',
      animeImage: anime.image || anime.image_poster || '',
      animeBanner: anime.image_cover || anime.banner || '',
      episodeIndex,
      password: password || '',
      playbackState: {
        isPlaying: false,
        currentTime: 0,
        lastUpdated: serverTimestamp(),
      },
      members: [
        {
          uid: auth.currentUser.uid,
          name: auth.currentUser.displayName || 'Anonymous Host',
          avatar: auth.currentUser.photoURL || '',
        }
      ],
      status: 'open',
      createdAt: serverTimestamp(),
    };

    await setDoc(roomRef, newRoom);
    return roomId;
  }

  async getActiveRooms(): Promise<RoomState[]> {
    const { getDocs } = await import('firebase/firestore');
    const q = query(
      collection(db, this.collectionName),
      where('status', '==', 'open')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoomState));
  }

  subscribeToActiveRooms(callback: (rooms: RoomState[]) => void) {
    const q = query(
      collection(db, this.collectionName),
      where('status', '==', 'open')
    );
    return onSnapshot(q, (snapshot) => {
      const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoomState));
      // filter out rooms with no members or that should be closed technically
      // Also ensure we dont show rooms that were just deleted/closed
      const activeOnes = rooms.filter(r => r.status === 'open' && Array.isArray(r.members) && r.members.length > 0);
      callback(activeOnes);
    }, (error) => {
      console.error('Active rooms subscription error:', error);
    });
  }

  async joinRoom(roomId: string): Promise<void> {
    if (!auth.currentUser) throw new Error('User not authenticated');

    const roomRef = doc(db, this.collectionName, roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      throw new Error('Room not found');
    }

    const roomData = roomSnap.data() as RoomState;
    if (roomData.status === 'closed') {
      throw new Error('Room is closed');
    }

    // Check if already a member
    const isMember = roomData.members.some(m => m.uid === auth.currentUser?.uid);
    if (!isMember) {
      await updateDoc(roomRef, {
        members: arrayUnion({
          uid: auth.currentUser.uid,
          name: auth.currentUser.displayName || 'Guest',
          avatar: auth.currentUser.photoURL || '',
        })
      });
    }
  }

  async leaveRoom(roomId: string): Promise<void> {
    if (!auth.currentUser) return;

    const roomRef = doc(db, this.collectionName, roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) return;

    const roomData = roomSnap.data() as RoomState;
    
    if (roomData.hostId === auth.currentUser.uid) {
      // If host leaves, close the room
      await updateDoc(roomRef, { status: 'closed' });
    } else {
      // If member leaves, remove from members array
      const memberToRemove = roomData.members.find(m => m.uid === auth.currentUser?.uid);
      if (memberToRemove) {
        await updateDoc(roomRef, {
          members: arrayRemove(memberToRemove)
        });
      }
    }
  }

  async updatePlayback(roomId: string, isPlaying: boolean, currentTime: number): Promise<void> {
    const roomRef = doc(db, this.collectionName, roomId);
    await updateDoc(roomRef, {
      'playbackState.isPlaying': isPlaying,
      'playbackState.currentTime': currentTime,
      'playbackState.lastUpdated': serverTimestamp(),
    });
  }

  async updateEpisode(roomId: string, episodeIndex: number): Promise<void> {
    const roomRef = doc(db, this.collectionName, roomId);
    await updateDoc(roomRef, {
      episodeIndex,
      'playbackState.currentTime': 0,
      'playbackState.lastUpdated': serverTimestamp(),
    });
  }

  async startWatching(roomId: string, path: string): Promise<void> {
    const roomRef = doc(db, this.collectionName, roomId);
    await updateDoc(roomRef, {
      currentPath: path,
    });
  }

  async updateRoomAnime(roomId: string, anime: any): Promise<void> {
    const roomRef = doc(db, this.collectionName, roomId);
    const animeSlug = anime.slug || `${anime.id}-${anime.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    
    await updateDoc(roomRef, {
      animeSlug,
      animeTitle: anime.title || 'Untitled Anime',
      animeImage: anime.image || anime.image_poster || '',
      animeBanner: anime.image_cover || anime.banner || '',
      episodeIndex: 0,
      currentPath: null,
      'playbackState.currentTime': 0,
      'playbackState.isPlaying': false,
      'playbackState.lastUpdated': serverTimestamp(),
    });
  }

  subscribeToRoom(roomId: string, callback: (room: RoomState) => void) {
    const roomRef = doc(db, this.collectionName, roomId);
    return onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as RoomState);
      }
    }, (error) => {
      console.error('Room subscription error:', error);
    });
  }

  async sendMessage(roomId: string, text: string): Promise<void> {
    if (!auth.currentUser) return;
    const messagesRef = collection(db, this.collectionName, roomId, 'messages');
    await setDoc(doc(messagesRef), {
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'User',
      text,
      timestamp: serverTimestamp(),
    });
  }

  subscribeToMessages(roomId: string, callback: (messages: ChatMessage[]) => void) {
    const messagesRef = collection(db, this.collectionName, roomId, 'messages');
    // Order by timestamp can be added later if needed, but for now just simple fetch
    return onSnapshot(messagesRef, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      // Sort by timestamp manually since we might not have index yet
      messages.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
      callback(messages);
    });
  }
}

export const roomService = new RoomService();
