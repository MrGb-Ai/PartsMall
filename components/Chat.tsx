import React, { useState, useEffect, useRef } from 'react';
import type { ChatChannel, ChatMessage, MgmtUser, Department } from '../types';
import { MessageSquare, X, Mic, Phone, Trash2, Edit2, Check, CheckCheck, Headset, MoreVertical, Search, Paperclip, Smile, Send, ArrowLeft, FileText, Image as ImageIcon } from 'lucide-react';
import { Modal } from './Shared';
import { GoogleGenAI } from "@google/genai";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface ChatProps {
    currentUser: MgmtUser | null;
    departments: Department[];
    chatMessages: ChatMessage[];
    setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    isLoginScreen?: boolean;
}

const Chat: React.FC<ChatProps> = ({ currentUser, departments, chatMessages, setChatMessages, isLoginScreen }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [channels, setChannels] = useState<ChatChannel[]>([]);
    const [activeChannelId, setActiveChannelId] = useState<string>('general');
    const [newMessage, setNewMessage] = useState('');
    const [unreadMessages, setUnreadMessages] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const previousMessagesLength = useRef(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    // WhatsApp-like colors
    const colors = {
        primary: '#008069', // WhatsApp Teal
        header: '#008069',
        chatBg: '#efe7dd', // Beige doodle background
        sentBubble: '#d9fdd3', // Light green
        receivedBubble: '#ffffff',
        inputBg: '#f0f2f5',
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const safeMessages = Array.isArray(chatMessages) ? chatMessages : [];
        if (safeMessages.length > previousMessagesLength.current) {
            const newMsgs = safeMessages.slice(previousMessagesLength.current);
            const hasNewFromOthers = newMsgs.some(m => m && m.senderId !== (currentUser?.id || -1));
            if (hasNewFromOthers && !isOpen) {
                setUnreadMessages(true);
                audioRef.current?.play().catch(e => console.log('Audio play blocked:', e));
            }
        }
        previousMessagesLength.current = safeMessages.length;
    }, [chatMessages, isOpen, currentUser?.id]);

    const messagesByChannel = React.useMemo(() => {
        const safeMessages = Array.isArray(chatMessages) ? chatMessages : [];
        return safeMessages.reduce((acc, msg) => {
            if (!msg || !msg.channelId) return acc;
            if (!acc[msg.channelId]) acc[msg.channelId] = [];
            acc[msg.channelId].push(msg);
            return acc;
        }, {} as Record<string, ChatMessage[]>);
    }, [chatMessages]);

    useEffect(() => {
        if (isLoginScreen) {
            setChannels([{ id: 'support', name: 'الدعم الفني' }]);
            setActiveChannelId('support');
            return;
        }
        const safeDepartments = Array.isArray(departments) ? departments : [];
        const initialChannels: ChatChannel[] = [
            { id: 'general', name: 'عام' },
            { id: 'transactions', name: 'النظام' },
            { id: 'support', name: 'الدعم الفني' },
            ...safeDepartments.map(d => ({ id: `department_${d.id}`, name: d.name }))
        ];
        setChannels(initialChannels);
    }, [departments, isLoginScreen]);

    const handleAIResponse = async (userMessage: string) => {
        try {
            const apiKey = (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined) || import.meta.env.VITE_GEMINI_API_KEY || '';
            const ai = new GoogleGenAI({ apiKey });
            
            const systemInstruction = `أنت مساعد ذكي للدعم الفني لبرنامج محاسبي.
مهمتك هي الإجابة عن كيفية العمل على البرنامج مثل إصدار الفواتير، التكويد بجميع أنواعه، المصروفات، التقارير، وسندات القبض والدفع.
إذا واجهت أي سؤال لا يمكنك الإجابة عليه، أو إذا طلب المستخدم أو الزائر التحدث مع الدعم الفني البشري، يجب عليك الرد حصراً بهذه العبارة: "للتواصل معانا والتحدث مع احد ممثلي الدعم الفني برجاء الاتصال او ارسال واتساب علي الرقم 01007608603".
أجب باللغة العربية وبشكل احترافي ومختصر.`;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: userMessage,
                config: {
                    systemInstruction: systemInstruction,
                }
            });

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                channelId: 'support',
                senderId: -2,
                senderName: 'الدعم الفني الذكي',
                text: response.text || "عذراً، حدث خطأ أثناء معالجة طلبك.",
                timestamp: Date.now(),
            };

            setChatMessages(prev => {
                const safePrev = Array.isArray(prev) ? prev : [];
                return [...safePrev, aiMessage];
            });
        } catch (error) {
            console.error("AI Error:", error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                channelId: 'support',
                senderId: -2,
                senderName: 'الدعم الفني الذكي',
                text: "بالتواصل عن طريق الواتساب او المكالمات علي الرقم 01007608603",
                timestamp: Date.now(),
            };
            setChatMessages(prev => {
                const safePrev = Array.isArray(prev) ? prev : [];
                return [...safePrev, errorMessage];
            });
        }
    };

    const handleSendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim()) return;

        if (editingMessageId) {
            setChatMessages(prev => {
                const safePrev = Array.isArray(prev) ? prev : [];
                return safePrev.map(msg => 
                    msg.id === editingMessageId 
                        ? { ...msg, text: newMessage.trim(), isEdited: true } 
                        : msg
                );
            });
            setEditingMessageId(null);
            setNewMessage('');
            return;
        }

        const senderId = currentUser?.id || -1;
        const senderName = currentUser?.fullName || 'زائر';

        const message: ChatMessage = {
            id: Date.now().toString(),
            channelId: activeChannelId,
            senderId: senderId,
            senderName: senderName,
            text: newMessage.trim(),
            timestamp: Date.now(),
        };

        setChatMessages(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return [...safePrev, message];
        });

        setNewMessage('');
        setShowEmojiPicker(false);

        if (activeChannelId === 'support') {
            handleAIResponse(message.text);
        }
    };

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        setNewMessage(prev => prev + emojiData.emoji);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            const senderId = currentUser?.id || -1;
            const senderName = currentUser?.fullName || 'زائر';
            
            const message: ChatMessage = {
                id: Date.now().toString(),
                channelId: activeChannelId,
                senderId: senderId,
                senderName: senderName,
                text: file.type.startsWith('image/') ? '📷 صورة' : '📎 ملف',
                timestamp: Date.now(),
                attachment: {
                    type: file.type.startsWith('image/') ? 'image' : 'file',
                    url: result,
                    name: file.name
                }
            };

            setChatMessages(prev => {
                const safePrev = Array.isArray(prev) ? prev : [];
                return [...safePrev, message];
            });
        };
        reader.readAsDataURL(file);
        
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const startRecording = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("متصفحك لا يدعم تسجيل الصوت.");
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64AudioMessage = reader.result as string;
                    sendAudioMessage(base64AudioMessage);
                };
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err: any) {
            // Log error for debugging but keep it clean
            console.warn("Microphone access error:", err.name, err.message);
            
            if (err.name === 'NotFoundError' || err.message.includes('Requested device not found')) {
                alert("لم يتم العثور على ميكروفون. يرجى التأكد من توصيل ميكروفون بجهازك أو التحقق من إعدادات المتصفح.");
            } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                alert("تم رفض الوصول إلى الميكروفون. يرجى السماح للمتصفح باستخدام الميكروفون من شريط العنوان.");
            } else {
                alert("تعذر الوصول إلى الميكروفون. يرجى التحقق من الصلاحيات وإعادة المحاولة.");
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const sendAudioMessage = (audioData: string) => {
        const senderId = currentUser?.id || -1;
        const senderName = currentUser?.fullName || 'زائر';

        const message: ChatMessage = {
            id: Date.now().toString(),
            channelId: activeChannelId,
            senderId: senderId,
            senderName: senderName,
            text: 'رسالة صوتية 🎤',
            timestamp: Date.now(),
            audioData: audioData
        };

        setChatMessages(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return [...safePrev, message];
        });
    };

    const handleCall = () => {
        const senderId = currentUser?.id || -1;
        const senderName = currentUser?.fullName || 'زائر';

        const message: ChatMessage = {
            id: Date.now().toString(),
            channelId: activeChannelId,
            senderId: senderId,
            senderName: senderName,
            text: '📞 بدأ مكالمة صوتية...',
            timestamp: Date.now(),
            isCall: true
        };

        setChatMessages(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return [...safePrev, message];
        });
        
        alert("ميزة المكالمات الصوتية المباشرة (WebRTC) قيد التطوير. تم إرسال إشعار للفرع الآخر.");
    };

    const clearChat = () => {
        setIsClearModalOpen(true);
    };

    const confirmClearChat = () => {
        setChatMessages(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return safePrev.filter(m => m.channelId !== activeChannelId);
        });
        setIsClearModalOpen(false);
    };

    const startEditing = (msg: ChatMessage) => {
        setEditingMessageId(msg.id);
        setNewMessage(msg.text);
        setShowEmojiPicker(false);
    };

    const cancelEditing = () => {
        setEditingMessageId(null);
        setNewMessage('');
        setShowEmojiPicker(false);
    };

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messagesByChannel, isOpen, activeChannelId]);

    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setUnreadMessages(false);
        }
    }

    // Helper to format time like WhatsApp (12:30 PM)
    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    return (
        <>
            <audio ref={audioRef} src="/notification.mp3" preload="auto"></audio>
            
            {/* Floating Action Button */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-center">
                {isLoginScreen && !isOpen && (
                    <div className="relative mb-3 bg-[#25D366] text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg whitespace-nowrap animate-bounce flex items-center gap-2">
                        نحن هنا لمساعدتك
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-[#25D366] rotate-45"></div>
                    </div>
                )}
                <button 
                    onClick={toggleChat}
                    className={`bg-[#25D366] text-white rounded-full shadow-xl hover:bg-[#128C7E] focus:outline-none transition-all duration-300 transform hover:scale-105 flex items-center justify-center ${isLoginScreen && !isOpen ? 'px-6 py-3 gap-3' : 'p-4'}`}>
                    {isOpen ? <X size={28} /> : (
                        isLoginScreen ? (
                            <>
                                <Headset size={28} />
                                <span className="font-bold text-lg">الدعم الفني</span>
                            </>
                        ) : (
                            <MessageSquare size={28} fill="currentColor" />
                        )
                    )}
                    {unreadMessages && !isOpen && (
                        <span className="absolute -top-1 -right-1 block h-5 w-5 rounded-full bg-red-500 border-2 border-white text-[10px] flex items-center justify-center font-bold">1</span>
                    )}
                </button>
            </div>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-[380px] h-[650px] max-h-[80vh] bg-[#efe7dd] rounded-[20px] shadow-2xl overflow-hidden flex flex-col animate-fade-in-up z-[9999] font-sans border border-gray-200">
                    
                    {/* Header */}
                    <div className="bg-[#008069] p-3 flex items-center justify-between text-white shadow-md z-10">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <button onClick={toggleChat} className="md:hidden">
                                    <ArrowLeft size={24} />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden border border-white/20">
                                    {/* Avatar Placeholder */}
                                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                                        <MessageSquare size={20} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-base font-bold leading-tight">
                                    {channels.find(c => c.id === activeChannelId)?.name || 'Chat'}
                                </h2>
                                <span className="text-xs text-white/80">متصل الآن</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={handleCall} title="اتصال">
                                <Phone size={20} />
                            </button>
                            <button title="بحث">
                                <Search size={20} />
                            </button>
                            {currentUser?.id === 1 && (
                                <button onClick={clearChat} title="مسح المحادثة">
                                    <Trash2 size={20} />
                                </button>
                            )}
                            <button title="المزيد">
                                <MoreVertical size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-1 overflow-hidden relative">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                            backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
                            backgroundRepeat: 'repeat',
                            backgroundSize: '400px'
                        }}></div>

                        {/* Sidebar (Channel List) - Hidden on mobile view if inside chat, but here we show it as a dropdown or separate view if needed. 
                           For this widget, we'll use a simple top bar selector or just list them if 'back' is pressed. 
                           To keep it simple and WhatsApp-like, let's assume we are IN a chat. 
                           We can add a channel switcher in the header or a drawer. 
                           Let's put channels in a drawer for now or a top horizontal scroll.
                        */}
                        
                        {/* Channel Switcher (Horizontal Scroll) */}
                        <div className="absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-sm z-10 border-b border-gray-200 overflow-x-auto flex p-2 gap-2 no-scrollbar shadow-sm">
                            {channels.map(channel => (
                                <button 
                                    key={channel.id}
                                    onClick={() => setActiveChannelId(channel.id)}
                                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeChannelId === channel.id ? 'bg-[#008069] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                    {channel.name}
                                </button>
                            ))}
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 pt-14 space-y-2">
                            {(messagesByChannel[activeChannelId] || []).map((msg, index) => {
                                if (!msg) return null;
                                const isCurrentUser = msg.senderId === (currentUser?.id || -1);
                                const isSystem = msg.channelId === 'transactions';
                                
                                if (isSystem) {
                                    return (
                                        <div key={msg.id || index} className="flex justify-center my-2">
                                            <span className="bg-[#e1f3fb] text-gray-600 text-[10px] px-3 py-1 rounded-lg shadow-sm">
                                                {msg.text}
                                            </span>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={msg.id || index} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group mb-1`}>
                                        <div 
                                            className={`relative max-w-[80%] px-3 py-1.5 rounded-lg shadow-sm text-sm ${
                                                isCurrentUser 
                                                    ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none' 
                                                    : 'bg-white text-gray-800 rounded-tl-none'
                                            }`}
                                            style={{
                                                boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)'
                                            }}
                                        >
                                            {/* Tail SVG */}
                                            {isCurrentUser ? (
                                                <svg viewBox="0 0 8 13" height="13" width="8" className="absolute -right-2 top-0 text-[#d9fdd3] fill-current">
                                                    <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                                                </svg>
                                            ) : (
                                                <svg viewBox="0 0 8 13" height="13" width="8" className="absolute -left-2 top-0 text-white fill-current transform scale-x-[-1]">
                                                    <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                                                </svg>
                                            )}

                                            {/* Sender Name (Group Chat style) */}
                                            {!isCurrentUser && (
                                                <div className="text-[#e542a3] text-xs font-bold mb-0.5">
                                                    {msg.senderName}
                                                </div>
                                            )}

                                            {/* Message Content */}
                                            <div className="px-1 pt-1 pb-0 relative">
                                                {msg.isCall ? (
                                                    <div className="flex items-center gap-2 text-gray-800 font-medium pb-2">
                                                        <Phone size={16} className="text-red-500" />
                                                        <span>{msg.text}</span>
                                                    </div>
                                                ) : msg.audioData ? (
                                                    <div className="flex items-center gap-2 min-w-[200px] pb-2">
                                                        <audio controls src={msg.audioData} className="w-full h-8" />
                                                    </div>
                                                ) : msg.attachment ? (
                                                    <div className="pb-2">
                                                        {msg.attachment.type === 'image' ? (
                                                            <div className="mb-1 rounded-lg overflow-hidden border border-gray-200">
                                                                <img src={msg.attachment.url} alt="Attachment" className="max-w-full max-h-[200px] object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg border border-gray-200">
                                                                <FileText size={24} className="text-gray-500" />
                                                                <span className="text-xs truncate max-w-[150px]">{msg.attachment.name}</span>
                                                            </div>
                                                        )}
                                                        <p className="whitespace-pre-wrap leading-relaxed text-[14px] pb-1 mt-1">
                                                            {msg.text}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="whitespace-pre-wrap leading-relaxed text-[14px] pb-1">
                                                        {msg.text}
                                                    </p>
                                                )}
                                                
                                                {/* Edit Button */}
                                                {isCurrentUser && !msg.audioData && !msg.isCall && !msg.attachment && (Date.now() - msg.timestamp <= 120000) && (
                                                    <button 
                                                        onClick={() => startEditing(msg)} 
                                                        className="absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-gray-700"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Metadata (Time & Status) - Moved to bottom right (flex-end) to avoid overlap */}
                                            <div className="flex items-center justify-end gap-1 px-1 pb-1 mt-[-2px]">
                                                {msg.isEdited && <span className="text-[9px] text-gray-500 italic">معدلة</span>}
                                                <span className="text-[10px] text-gray-500 min-w-[45px] text-right">
                                                    {formatTime(msg.timestamp)}
                                                </span>
                                                {isCurrentUser && (
                                                    <span className="text-[#53bdeb]">
                                                        <CheckCheck size={16} className="inline" />
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Footer Input */}
                    <div className="bg-[#f0f2f5] p-2 flex items-end gap-2 z-20 relative">
                        {showEmojiPicker && (
                            <div ref={emojiPickerRef} className="absolute bottom-16 left-2 z-50 shadow-2xl rounded-lg overflow-hidden">
                                <EmojiPicker 
                                    onEmojiClick={handleEmojiClick}
                                    width={300}
                                    height={400}
                                    searchDisabled
                                    skinTonesDisabled
                                />
                            </div>
                        )}
                        
                        {activeChannelId === 'transactions' ? (
                            <div className="w-full text-center text-xs text-gray-500 py-3 bg-white rounded-lg shadow-sm">
                                🚫 للقراءة فقط
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 bg-white rounded-[24px] flex items-center px-4 py-2 shadow-sm border border-white focus-within:border-white">
                                    <button 
                                        type="button"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className={`text-gray-500 hover:text-gray-700 ml-2 transition-colors ${showEmojiPicker ? 'text-[#008069]' : ''}`}
                                    >
                                        <Smile size={24} />
                                    </button>
                                    <input 
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={editingMessageId ? "تعديل الرسالة..." : "رسالة"}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-500 text-sm h-6"
                                        disabled={isRecording}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                    />
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        onChange={handleFileSelect}
                                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-gray-500 hover:text-gray-700 mr-2 rotate-45"
                                    >
                                        <Paperclip size={22} />
                                    </button>
                                    {editingMessageId && (
                                        <button onClick={cancelEditing} className="text-red-500 hover:text-red-700 mr-2">
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>
                                
                                {newMessage.trim() || editingMessageId ? (
                                    <button 
                                        onClick={() => handleSendMessage()}
                                        className="bg-[#008069] text-white p-3 rounded-full shadow-md hover:bg-[#006d59] transition-all transform hover:scale-105 flex items-center justify-center w-12 h-12"
                                    >
                                        {editingMessageId ? <Check size={20} /> : <Send size={20} className="ml-1" />}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={isRecording ? stopRecording : startRecording}
                                        className={`${isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#008069]'} text-white p-3 rounded-full shadow-md hover:opacity-90 transition-all transform hover:scale-105 flex items-center justify-center w-12 h-12`}
                                    >
                                        {isRecording ? <div className="w-4 h-4 bg-white rounded-sm" /> : <Mic size={20} />}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {isClearModalOpen && (
                <Modal show={isClearModalOpen} onClose={() => setIsClearModalOpen(false)} title="مسح الدردشة">
                    <div className="p-6 text-center">
                        <Trash2 className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">مسح محتوى الدردشة؟</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">سيتم حذف جميع الرسائل في هذه القناة. هذا الإجراء لا يمكن التراجع عنه.</p>
                        <div className="flex justify-center space-x-4 space-x-reverse">
                            <button onClick={confirmClearChat} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-bold shadow-md">
                                مسح
                            </button>
                            <button onClick={() => setIsClearModalOpen(false)} className="bg-gray-100 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors font-bold shadow-md border border-gray-300">
                                إلغاء
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default Chat;
