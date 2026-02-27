import React, { useState, useEffect, useRef } from 'react';
import type { ChatChannel, ChatMessage, MgmtUser, Department } from '../types';
import { MessageSquare, X, Mic, Square, Phone, Trash2, Edit2, Check, Headset } from 'lucide-react';
import { Modal } from './Shared';
import { GoogleGenAI } from "@google/genai";

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
    const [editMessageText, setEditMessageText] = useState('');
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const previousMessagesLength = useRef(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

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

        if (activeChannelId === 'support') {
            handleAIResponse(message.text);
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
            console.error("Error accessing microphone:", err);
            if (err.name === 'NotFoundError' || err.message.includes('Requested device not found')) {
                alert("لم يتم العثور على ميكروفون. يرجى التأكد من توصيل ميكروفون بجهازك.");
            } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                alert("تم رفض الوصول إلى الميكروفون. يرجى السماح للمتصفح باستخدام الميكروفون.");
            } else {
                alert("تعذر الوصول إلى الميكروفون. يرجى التحقق من الصلاحيات.");
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
    };

    const cancelEditing = () => {
        setEditingMessageId(null);
        setNewMessage('');
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

    return (
        <>
            <audio ref={audioRef} src="/notification.mp3" preload="auto"></audio>
            <div className="fixed bottom-8 right-8 z-[9999] flex flex-col items-center">
                {isLoginScreen && !isOpen && (
                    <div className="relative mb-3 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg whitespace-nowrap animate-bounce">
                        نحن هنا لمساعدتك
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-600 rotate-45"></div>
                    </div>
                )}
                <button 
                    onClick={toggleChat}
                    className={`bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 transform hover:scale-105 flex items-center justify-center ${isLoginScreen && !isOpen ? 'gap-2' : ''}`}>
                    {isOpen ? <X size={28} /> : (
                        isLoginScreen ? (
                            <>
                                <Headset size={28} />
                                <span className="font-bold text-lg px-2">الدعم الفني</span>
                            </>
                        ) : (
                            <MessageSquare size={28} />
                        )
                    )}
                    {unreadMessages && !isOpen && (
                        <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 border-2 border-white"></span>
                    )}
                </button>
            </div>

            {isOpen && (
                <div className="fixed bottom-24 right-8 w-[500px] h-[600px] bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 dark:border-white/20 overflow-hidden flex flex-col animate-fade-in-up z-[9999]">
                    {/* Header */}
                    <div className="p-4 bg-black/5 dark:bg-white/5 border-b border-white/20 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">المحادثات</h2>
                            <button onClick={handleCall} className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors" title="اتصال صوتي">
                                <Phone size={18} />
                            </button>
                            {currentUser?.id === 1 && (
                                <button onClick={clearChat} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors" title="مسح محادثات القناة">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                        <button onClick={toggleChat} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="flex flex-1 overflow-hidden">
                        {/* Channels Sidebar */}
                        <div className="w-1/3 bg-black/5 dark:bg-white/5 p-4 border-r border-white/20 dark:border-gray-700 overflow-y-auto">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">القنوات</h3>
                            <ul>
                                {channels.map(channel => (
                                    <li key={channel.id}>
                                        <button 
                                            onClick={() => setActiveChannelId(channel.id)}
                                            className={`w-full text-right px-3 py-2 text-sm rounded-md transition-colors duration-200 ${activeChannelId === channel.id ? 'bg-blue-500 text-white' : 'hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'}`}>
                                            # {channel.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 flex flex-col">
                            {/* Message Display */}
                            <div className="flex-1 p-4 overflow-y-auto">
                                {(messagesByChannel[activeChannelId] || []).map(msg => {
                                    if (!msg) return null;
                                    const isCurrentUser = msg.senderId === (currentUser?.id || -1);
                                    return (
                                    <div key={msg.id || Math.random()} className={`mb-3 flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group`}>
                                        <div className={`inline-block p-2 rounded-lg max-w-sm relative ${isCurrentUser ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                                            <div className="font-bold text-sm flex justify-between items-center gap-4">
                                                <span>{msg.senderName || 'مستخدم'}</span>
                                                {isCurrentUser && !msg.audioData && !msg.isCall && (Date.now() - msg.timestamp <= 120000) && (
                                                    <button onClick={() => startEditing(msg)} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/80 hover:text-white" title="تعديل (متاح لمدة دقيقتين)">
                                                        <Edit2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            {msg.isCall ? (
                                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold my-2">
                                                    <Phone size={16} />
                                                    <span>{msg.text}</span>
                                                </div>
                                            ) : msg.audioData ? (
                                                <div className="mt-2">
                                                    <audio controls src={msg.audioData} className="max-w-[200px] h-8" />
                                                </div>
                                            ) : (
                                                <p className="text-sm">{msg.text || ''}</p>
                                            )}
                                            <div className="text-xs opacity-70 mt-1 text-right flex justify-end gap-1 items-center">
                                                {msg.isEdited && <span className="text-[10px] italic">(معدلة)</span>}
                                                {new Date(msg.timestamp || Date.now()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                )})}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <div className="p-3 bg-black/5 dark:bg-white/5 border-t border-white/20 dark:border-gray-700">
                                {activeChannelId === 'transactions' ? (
                                    <div className="text-center text-sm text-gray-500 py-2">
                                        هذه القناة مخصصة لسجل النظام فقط ولا يمكن إرسال رسائل بها.
                                    </div>
                                ) : (
                                    <form onSubmit={handleSendMessage} className="flex space-x-2 space-x-reverse items-center">
                                        {editingMessageId && (
                                            <button type="button" onClick={cancelEditing} className="text-red-500 hover:text-red-700 p-2" title="إلغاء التعديل">
                                                <X size={20} />
                                            </button>
                                        )}
                                        <input 
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder={editingMessageId ? "تعديل الرسالة..." : `...رسالة في #${channels.find(c => c.id === activeChannelId)?.name}`}
                                            className="flex-1 h-10 px-3 py-2 text-sm bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                                            disabled={isRecording}
                                        />
                                        {!editingMessageId && isRecording ? (
                                            <button type="button" onClick={stopRecording} className="bg-red-500 text-white p-2 rounded-lg shadow-md hover:bg-red-600 transition-all duration-300 flex items-center justify-center animate-pulse">
                                                <Square size={20} />
                                            </button>
                                        ) : !editingMessageId && (
                                            <button type="button" onClick={startRecording} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-2 rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 flex items-center justify-center">
                                                <Mic size={20} />
                                            </button>
                                        )}
                                        <button type="submit" disabled={isRecording || !newMessage.trim()} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                            {editingMessageId ? <Check size={20} /> : 'إرسال'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isClearModalOpen && (
                <Modal show={isClearModalOpen} onClose={() => setIsClearModalOpen(false)} title="تأكيد مسح المحادثات">
                    <div className="p-6 text-center">
                        <Trash2 className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">هل أنت متأكد؟</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">هل أنت متأكد من مسح جميع رسائل هذه القناة؟ لا يمكن التراجع عن هذا الإجراء.</p>
                        <div className="flex justify-center space-x-4 space-x-reverse">
                            <button onClick={confirmClearChat} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-bold shadow-md">
                                نعم، امسح الرسائل
                            </button>
                            <button onClick={() => setIsClearModalOpen(false)} className="bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors font-bold shadow-md">
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
