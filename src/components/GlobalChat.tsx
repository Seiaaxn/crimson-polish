import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { 
  X, 
  Send, 
  Smile, 
  Reply, 
  Trash2, 
  AtSign, 
  ChevronLeft,
  Loader2,
  Volume2,
  Pin,
  Users,
  Settings,
  Bell,
  Globe,
  CornerDownRight,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { Link, useNavigate } from 'react-router-dom';
import { chatService, ChatMessage } from '../services/chatService';
import { auth } from '../lib/firebase';
import { userService, UserProfile } from '../services/userService';
import { getImageUrl, handleImageError } from '../lib/imageUtils';
import Swal from 'sweetalert2';

interface GlobalChatProps {
  onClose: () => void;
}

interface ChatMessageItemProps {
  msg: ChatMessage;
  isMe: boolean;
  showAvatar: boolean;
  getTimeLabel: (createdAt: any) => string;
  formatMessageText: (text: string) => React.ReactNode;
  scrollToMessage: (msgId: string) => void;
  setReplyTo: (msg: ChatMessage) => void;
  handleDeleteMessage: (msgId: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  onUserClick: (username: string) => void;
}

const ChatMessageItem = memo(({ 
  msg, isMe, showAvatar, getTimeLabel, formatMessageText, 
  scrollToMessage, setReplyTo, handleDeleteMessage, inputRef,
  onUserClick
}: ChatMessageItemProps) => {
  return (
    <motion.div 
      id={`msg-${msg.id}`}
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex items-start gap-3 w-full group/msg relative transition-all duration-300 [will-change:transform,opacity] [content-visibility:auto] [contain-intrinsic-size:0_100px] ${isMe ? 'flex-row-reverse' : 'flex-row'} ${showAvatar ? 'mt-4' : 'mt-1'}`}
    >
      {/* Avatar Container */}
      <div className="w-10 flex shrink-0 justify-center">
        {showAvatar && (
          <div 
            onClick={() => onUserClick(msg.username)}
            className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-[#16161a] border-2 border-transparent hover:border-[#EF4444] shadow-xl transition-all cursor-pointer relative"
          >
            <img 
              src={getImageUrl(msg.avatar)} 
              onError={(e) => handleImageError(e, msg.avatar)} 
              className="w-full h-full object-cover"
              alt=""
            />
            {msg.isOnline && (
              <div className={`absolute bottom-0 ${isMe ? 'left-0' : 'right-0'} w-2.5 h-2.5 bg-green-500 rounded-full border border-[rgb(12,12,14)]`} />
            )}
          </div>
        )}
      </div>

      <div className={`flex flex-col min-w-0 max-w-[78%] ${isMe ? 'items-end' : 'items-start'}`}>
        {/* Username & Level */}
        {showAvatar && (
           <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              <span 
                onClick={() => onUserClick(msg.username)}
                className="text-[13px] font-bold text-white hover:text-[#EF4444] hover:underline cursor-pointer transition-colors tracking-tight line-clamp-1"
              >
                {msg.username}
              </span>
              {isMe && <span className="text-[9px] font-black uppercase tracking-wider bg-[#EF4444] text-black px-1.5 py-0.5 rounded-md leading-none">YOU</span>}
              {msg.level && msg.level > 50 && <ShieldCheck size={12} className="text-[#EF4444] shrink-0" />}
              <div className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 bg-white/5 rounded-md border border-white/5">
                 <span className="text-[9px] font-black uppercase tracking-wider text-white/50 leading-none">LV.{msg.level || 1} • {msg.level && msg.level >= 20 ? 'VETERAN' : 'NEWBIE'}</span>
              </div>
           </div>
        )}

        {/* Reply Bubble */}
        {msg.replyTo && (
           <div 
             onClick={() => scrollToMessage(msg.replyTo!.id)}
             className={`relative flex items-end gap-2 mb-1.5 cursor-pointer group/reply ${isMe ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}
           >
              {/* Connected Line Effect */}
              <div className={`w-6 h-4 border-t-2 opacity-30 group-hover/reply:opacity-80 transition-opacity ${isMe ? 'border-r-2 rounded-tr-lg mr-1' : 'border-l-2 rounded-tl-lg ml-1'} border-[#EF4444]/50 shrink-0`} />
              <div className="flex flex-col">
                <div className={`flex items-center gap-1 mb-0.5 opacity-60 group-hover/reply:opacity-100 transition-opacity ${isMe ? 'justify-end' : ''}`}>
                   <Reply size={10} className="text-[#EF4444]" />
                   <span className="text-[10px] font-black uppercase tracking-wider text-[#EF4444]">Reply to {msg.replyTo.username}</span>
                </div>
                <div className={`px-3 py-1.5 rounded-[12px] bg-white/5 border border-white/5 max-w-[200px] overflow-hidden ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                   <p className="text-[11px] text-white/60 line-clamp-1 font-medium truncate">{msg.replyTo.text}</p>
                </div>
              </div>
           </div>
        )}

        {/* Main Bubble */}
        <div className="relative group/bubble flex items-center">
          <motion.div 
            layout="position"
            onPointerDown={(e) => {
              if (!isMe) return;
              const target = e.currentTarget as HTMLElement;
              target.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
              target.style.transform = 'scale(0.96) translateY(2px) translateZ(0)';
              target.style.filter = 'brightness(0.9)';
              
              const timer = setTimeout(() => {
                 handleDeleteMessage(msg.id!);
                 if (navigator.vibrate) navigator.vibrate(50);
                 target.style.transform = '';
                 target.style.filter = '';
              }, 500);
              (e.currentTarget as any)._deleteTimer = timer;
            }}
            onPointerUp={(e) => {
              const target = e.currentTarget as HTMLElement;
              target.style.transform = '';
              target.style.filter = '';
              clearTimeout((e.currentTarget as any)._deleteTimer);
            }}
            onPointerLeave={(e) => {
              const target = e.currentTarget as HTMLElement;
              target.style.transform = '';
              target.style.filter = '';
              clearTimeout((e.currentTarget as any)._deleteTimer);
            }}
            drag="x"
            dragConstraints={{ left: isMe ? -100 : 0, right: isMe ? 0 : 100 }}
            dragSnapToOrigin={true}
            onDragEnd={(_, info) => {
              const threshold = isMe ? -50 : 50;
              const isTriggered = isMe ? info.offset.x < threshold : info.offset.x > threshold;
              if (isTriggered) {
                setReplyTo(msg);
                inputRef.current?.focus();
                if (navigator.vibrate) navigator.vibrate(50);
              }
            }}
            className={`px-4 py-2.5 rounded-[20px] shadow-sm backdrop-blur-md transition-all duration-300 [transform:translateZ(0)] ${
            isMe 
            ? 'bg-gradient-to-br from-[#EF4444] via-[#DC2626] to-[#DC2626] text-black rounded-tr-sm hover:shadow-[#EF4444]/20' 
            : 'bg-[#2a2a32]/80 text-white border border-white/[0.05] rounded-tl-sm hover:bg-[#32323a]'
          }`}>
            <p className={`text-[14px] leading-[1.5] font-medium break-words whitespace-pre-wrap ${isMe ? 'font-semibold tracking-tight' : 'tracking-wide'}`}>
              {formatMessageText(msg.text)}
            </p>
            
            <div className={`flex items-center gap-1 mt-1 opacity-60 ${isMe ? 'justify-end' : 'justify-start'}`}>
               <span className={`text-[9px] font-bold ${isMe ? 'text-black/60' : 'text-white/40'}`}>
                 {getTimeLabel(msg.createdAt)}
               </span>
            </div>
          </motion.div>

          {/* Floating Interaction Icons - Side */}
          <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover/bubble:opacity-100 transition-all duration-300 z-10 ${isMe ? 'right-full mr-3' : 'left-full ml-3'}`}>
             {!isMe && (
               <button 
                  onClick={() => {
                    setReplyTo(msg);
                    inputRef.current?.focus();
                  }}
                  className="w-8 h-8 rounded-full bg-[#32323a] border border-white/10 flex items-center justify-center hover:bg-[#EF4444] hover:text-black hover:scale-110 active:scale-90 transition-all shadow-xl"
               >
                  <Reply size={14} />
               </button>
             )}
             {isMe && (
               <button 
                  onClick={() => handleDeleteMessage(msg.id!)}
                  className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white hover:scale-110 active:scale-90 transition-all shadow-xl"
               >
                  <Trash2 size={14} />
               </button>
             )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}, (prev, next) => {
  return prev.msg.id === next.msg.id && 
         prev.isMe === next.isMe && 
         prev.showAvatar === next.showAvatar &&
         prev.msg.text === next.msg.text &&
         prev.msg.createdAt === next.msg.createdAt;
});

const GlobalChat: React.FC<GlobalChatProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    const unsubscribe = userService.subscribeToOnlineUsers((users) => {
      setOnlineCount(users.length || 1);
    });
    return () => unsubscribe();
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [userSuggestions, setUserSuggestions] = useState<UserProfile[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Record read timestamp when opening chat
    userService.updateLastChatRead();
    
    const unsubscribe = chatService.subscribeToMessages((msgs) => {
      setMessages(msgs);
      setIsLoading(false);
      
      const container = messagesContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 400;
        if (isNearBottom) {
          setTimeout(scrollToBottom, 50);
        } else {
          setShowScrollDown(true);
        }
      } else {
        setTimeout(scrollToBottom, 50);
      }
    });

    return () => unsubscribe();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollDown(false);
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a high-intensity pulse effect
      el.classList.add('ring-2', 'ring-[#EF4444]', 'ring-offset-4', 'ring-offset-[#0c0c0e]', 'rounded-3xl');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#EF4444]', 'ring-offset-4', 'ring-offset-[#0c0c0e]');
      }, 2000);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      const textToSend = inputText.trim();
      const replyData = replyTo ? {
        id: replyTo.id!,
        text: replyTo.text,
        username: replyTo.username
      } : undefined;

      setInputText('');
      setReplyTo(null);
      setIsEmojiOpen(false);
      setShowSuggestions(false);
      
      await chatService.sendMessage(textToSend, replyData);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement> | string) => {
    const value = typeof e === 'string' ? e : e.target.value;
    setInputText(value);

    // Check for @ mention
    const words = value.split(/\s/);
    const lastWord = words[words.length - 1] || '';
    
    if (lastWord.startsWith('@')) {
      const query = lastWord.slice(1);
      const suggestions = await chatService.searchUsers(query);
      setUserSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const insertMention = (username: string) => {
    const words = inputText.split(/\s/);
    // Find the last word that started with @
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i].startsWith('@')) {
        words[i] = `@${username} `;
        break;
      }
    }
    setInputText(words.join(' '));
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const onEmojiClick = (emojiData: any) => {
    setInputText(prev => prev + emojiData.emoji);
    setIsEmojiOpen(false);
  };

  const formatMessageText = useCallback((text: string) => {
    const mentionRegex = /@(\w+)/g;
    const linkRegex = /(https?:\/\/[^\s]+)/g;

    const parts = text.split(/(@\w+|https?:\/\/[^\s]+)/g);

    return parts.map((part, i) => {
      if (part.match(mentionRegex)) {
        return <span key={i} className="text-[#60a5fa] font-bold cursor-pointer hover:underline transition-colors">{part}</span>;
      }
      if (part.match(linkRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-yellow-400 underline hover:text-yellow-300 transition-colors uppercase font-black text-[10px]">{part}</a>;
      }
      return part;
    });
  }, []);

  const handleDeleteMessage = async (msgId: string) => {
    const result = await Swal.fire({
      title: 'Hapus Pesan?',
      text: "Pesan ini akan hilang selamanya bocil!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#303030',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      background: '#16161a',
      color: '#fff'
    });

    if (result.isConfirmed) {
      await chatService.deleteMessage(msgId);
    }
  };

  const getTimeLabel = (createdAt: any) => {
    if (!createdAt) return 'Baru saja';
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds
    
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return `${Math.floor(diff / 86400)}d lalu`;
  };

  const handleUserClick = (username: string) => {
    navigate(`/u/${username}`);
    onClose();
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
      className="fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[550px] bg-[#0a0a0c] z-[120] border-l border-white/5 flex flex-col shadow-2xl overflow-hidden font-sans [will-change:transform]"
    >
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img 
          src="https://files.catbox.moe/53dr3h.jpg" 
          className="w-full h-full object-cover opacity-20 brightness-[0.3]" 
          alt="" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c0e] via-[#0c0c0e]/80 to-[#0c0c0e]" />
      </div>

      {/* Community Header */}
      <div className="bg-[#1a1a20]/80 backdrop-blur-xl p-4 flex items-center justify-between border-b border-white/5 relative z-10">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-[#EF4444]">
              <Globe size={24} />
           </div>
           <div>
              <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Live Chat</h2>
              <div className="flex items-center gap-2 mt-0.5">
                 <div className="flex items-center gap-1 bg-green-500/20 px-2 py-0.5 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-black text-green-500 uppercase">{onlineCount} ONLINE</span>
                 </div>
                 <div className="w-1 h-1 rounded-full bg-white/10" />
                 <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Global Room</span>
              </div>
           </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => Swal.fire({
               title: 'CHAT RULES',
               html: `<div class="text-left text-xs space-y-2 opacity-80 leading-relaxed">
                 <p>• Dilarang SPAM dalam bentuk apapun.</p>
                 <p>• Hormati sesama member ChisaStream.</p>
                 <p>• Tidak diperbolehkan menyebar konten Sara/Pornografi.</p>
                 <p>• Gunakan bahasa yang sopan dan santun.</p>
                 <p>• Melanggar aturan = Banned Permanent!</p>
               </div>`,
               icon: 'info',
               confirmButtonText: 'Oke!',
               confirmButtonColor: '#EF4444',
               background: '#16161a',
               color: '#fff'
             })}
             className="px-3 py-1.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-[9px] font-black uppercase tracking-widest hover:bg-[#EF4444] hover:text-black transition-all mr-2"
           >
             Rules
           </button>
           <button onClick={onClose} className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all ml-1"><X size={18} /></button>
        </div>
      </div>

      {/* Pinned Message */}
      <div className="bg-[#EF4444] p-3 px-6 flex items-center justify-between text-black relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-transparent pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
           <Pin size={14} fill="black" className="shrink-0" />
           <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Pesan Tersemat</span>
              <p className="text-[10px] font-black leading-tight line-clamp-1">ChisaStream Community: Ikuti Aturan Ya Brosis, No SARA JANGAN SPAM!</p>
           </div>
        </div>
        <button className="w-6 h-6 rounded-lg bg-black/10 flex items-center justify-center relative z-10"><ChevronDown size={14} /></button>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide bg-gradient-to-b from-transparent to-black/20 [transform:translateZ(0)]"
      >
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-[#EF4444]" size={32} />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Syncing Messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
             <div className="w-20 h-20 rounded-[32px] bg-white/5 flex items-center justify-center mb-6">
                <Smile size={32} className="text-[#EF4444]" />
             </div>
             <p className="text-sm font-black uppercase tracking-[0.2em] text-white">Sepi amat nih!</p>
             <p className="text-xs font-bold text-white/20 mt-1">Jadilah yang pertama untuk meramaikan room!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.userId === auth.currentUser?.uid;
            const showAvatar = index === 0 || messages[index - 1].userId !== msg.userId;

            return (
              <ChatMessageItem 
                key={msg.id}
                msg={msg}
                isMe={isMe}
                showAvatar={showAvatar}
                getTimeLabel={getTimeLabel}
                formatMessageText={formatMessageText}
                scrollToMessage={scrollToMessage}
                setReplyTo={setReplyTo}
                handleDeleteMessage={handleDeleteMessage}
                inputRef={inputRef}
                onUserClick={handleUserClick}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion HUD */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div 
             ref={suggestionsRef}
             initial={{ opacity: 0, y: 30, scale: 0.95 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: 30, scale: 0.95 }}
             className="absolute bottom-24 left-6 right-6 bg-[#1a1a20]/95 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] z-[150]"
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
               <div className="flex items-center gap-2">
                  <AtSign size={14} className="text-[#EF4444]" />
                  <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Siapa yang mau di mention?</span>
               </div>
               <button onClick={() => setShowSuggestions(false)} className="text-white/20 hover:text-white"><X size={16} /></button>
            </div>
            <div className="max-h-[250px] overflow-y-auto p-2 space-y-1">
               {userSuggestions.length > 0 ? userSuggestions.map(user => (
                 <button 
                   key={user.username}
                   onClick={() => insertMention(user.username)}
                   className="w-full p-3 flex items-center gap-4 hover:bg-white/5 rounded-2xl transition-all text-left group"
                 >
                   <div className="relative">
                      <img src={getImageUrl(user.avatar)} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10 group-hover:border-[#EF4444] transition-colors" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#1a1a20]" />
                   </div>
                   <div>
                      <p className="text-sm font-black text-white group-hover:text-[#EF4444] transition-colors">{user.name}</p>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">@{user.username}</p>
                   </div>
                 </button>
               )) : (
                 <div className="py-8 text-center opacity-20 flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-[10px] font-black uppercase">Mencari User...</span>
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Scroll Bottom */}
      {showScrollDown && (
        <button 
          onClick={scrollToBottom}
          className="absolute bottom-28 right-6 w-12 h-12 bg-[#EF4444] text-black rounded-full shadow-2xl flex items-center justify-center animate-bounce z-50 hover:scale-110 active:scale-95 transition-all"
        >
          <ChevronDown size={24} />
        </button>
      )}

      {/* Input Module */}
      <div className="p-6 bg-[#16161a] border-t border-white/5 relative z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
        <AnimatePresence>
          {replyTo && (
            <motion.div 
               initial={{ height: 0, opacity: 0, y: 10 }}
               animate={{ height: 'auto', opacity: 1, y: 0 }}
               exit={{ height: 0, opacity: 0, y: 10 }}
               className="mb-4 bg-white/5 p-4 rounded-[24px] flex items-center justify-between border-l-4 border-[#EF4444] backdrop-blur-xl"
            >
               <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                     <Reply size={14} className="text-[#EF4444]" />
                     <span className="text-[10px] font-black text-[#EF4444] uppercase tracking-[0.2em]">Membalas @{replyTo.username}</span>
                  </div>
                  <p className="text-xs text-white/50 line-clamp-1 italic font-medium italic">{replyTo.text}</p>
               </div>
               <button 
                 onClick={() => setReplyTo(null)}
                 className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 hover:rotate-90 transition-all"
               >
                 <X size={16} />
               </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-4">
           <div className="flex-1 flex flex-col gap-3">
              <div className="relative bg-[#0d0d0f] rounded-[28px] border border-white/5 focus-within:border-[#EF4444]/40 transition-all p-1.5 shadow-inner">
                 <textarea
                   ref={inputRef}
                   placeholder={`Bicara sebagai ${auth.currentUser?.displayName?.split(' ')[0] || 'Anon'}`}
                   className="w-full bg-transparent border-none focus:ring-0 text-[13px] font-semibold resize-none min-h-[48px] max-h-[150px] py-3.5 px-4 scrollbar-hide text-white placeholder:text-white/10"
                   value={inputText}
                   onChange={handleTextChange}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       handleSendMessage();
                     }
                   }}
                 />
                 
                 <div className="flex items-center justify-between px-3 pb-2">
                    <div className="flex items-center gap-1">
                       <button 
                         onClick={() => setIsEmojiOpen(!isEmojiOpen)}
                         className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${isEmojiOpen ? 'bg-[#EF4444] text-black shadow-lg shadow-[#EF4444]/20' : 'hover:bg-white/5 text-white/30'}`}
                       >
                         <Smile size={20} />
                       </button>
                       <button 
                         onClick={() => {
                            const newText = inputText.endsWith(' ') || inputText === '' ? inputText + '@' : inputText + ' @';
                            handleTextChange(newText);
                            inputRef.current?.focus();
                         }}
                         className="w-9 h-9 rounded-2xl flex items-center justify-center hover:bg-white/5 text-white/30 transition-all"
                       >
                         <AtSign size={18} />
                       </button>
                    </div>
                    <div className="flex items-center gap-2 opacity-20 pointer-events-none">
                       <span className="text-[10px] font-black uppercase tracking-[0.3em]">Collective</span>
                    </div>
                 </div>

                 <AnimatePresence>
                    {isEmojiOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-0 mb-4 z-[200] shadow-3xl"
                      >
                        <EmojiPicker 
                          onEmojiClick={onEmojiClick}
                          theme={Theme.DARK}
                          width={320}
                          height={400}
                        />
                      </motion.div>
                    )}
                 </AnimatePresence>
              </div>
           </div>

           <button 
             disabled={!inputText.trim()}
             onClick={handleSendMessage}
             className={`w-14 h-14 rounded-3xl flex items-center justify-center transition-all shadow-2xl relative overflow-hidden group ${
               inputText.trim() 
               ? 'bg-[#EF4444] text-black hover:scale-105 active:scale-95 shadow-[#EF4444]/20' 
               : 'bg-white/5 text-white/10 cursor-not-allowed opacity-50'
             }`}
           >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Send size={24} className="relative z-10" />
           </button>
        </div>
      </div>
    </motion.div>
  );
};

export default GlobalChat;
