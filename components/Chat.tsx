import React, { useState, useEffect, useRef } from 'react';
import type { ChatChannel, ChatMessage, MgmtUser, Department } from '../types';
import { MessageSquare, X, Mic, Square, Phone, Trash2, Edit2, Check, Headset } from 'lucide-react';
import { Modal } from './Shared';

interface ChatProps {
    currentUser: MgmtUser;
    departments: Department[];
    chatMessages: ChatMessage[];
    setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    isSupportMode?: boolean;
}

const Chat: React.FC<ChatProps> = ({ currentUser, departments, chatMessages, setChatMessages, isSupportMode = false }) => {
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
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

    const resetInactivityTimer = () => {
        if (!isSupportMode) return;
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
        inactivityTimerRef.current = setTimeout(() => {
            setChatMessages(prev => {
                const safePrev = Array.isArray(prev) ? prev : [];
                return safePrev.filter(m => m.channelId !== 'support');
            });
        }, 30 * 60 * 1000); // 30 minutes
    };

    useEffect(() => {
        return () => {
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const safeMessages = Array.isArray(chatMessages) ? chatMessages : [];
        if (safeMessages.length > previousMessagesLength.current) {
            const newMsgs = safeMessages.slice(previousMessagesLength.current);
            const hasNewFromOthers = newMsgs.some(m => m && m.senderId !== currentUser.id && m.senderId !== -1);
            if (hasNewFromOthers && !isOpen) {
                setUnreadMessages(true);
                audioRef.current?.play().catch(e => console.log('Audio play blocked:', e));
            }
        }
        previousMessagesLength.current = safeMessages.length;
    }, [chatMessages, isOpen, currentUser.id]);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, isOpen, activeChannelId]);

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
        if (isSupportMode) {
            setChannels([{ id: 'support', name: 'الدعم الفني' }]);
            setActiveChannelId('support');
        } else {
            const safeDepartments = Array.isArray(departments) ? departments : [];
            const initialChannels: ChatChannel[] = [
                { id: 'general', name: 'عام' },
                { id: 'support', name: 'الدعم الفني' },
                { id: 'transactions', name: 'النظام' },
                ...safeDepartments.map(d => ({ id: `department_${d.id}`, name: d.name }))
            ];
            setChannels(initialChannels);
        }
    }, [departments, isSupportMode]);

    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setUnreadMessages(false);
        }
    };

    const triggerAutoReply = (userMessageText: string) => {
        if (!isSupportMode || activeChannelId !== 'support') return;

        const userText = userMessageText.toLowerCase();
        let replyText = '';

        if (userText.includes('السلام عليكم') || userText.includes('مرحبا') || userText.includes('مرحباً') || userText.includes('اهلا')) {
            replyText = 'وعليكم السلام ورحمة الله وبركاته، أهلاً بك في المساعد الذكي لنظام إدارة المبيعات. كيف يمكنني مساعدتك اليوم؟ يمكنك سؤالي عن كيفية استخدام أي شاشة في البرنامج.';
        } else if (userText.includes('خدمة العملاء') || userText.includes('دعم فني') || userText.includes('تحدث مع') || userText.includes('موظف') || userText.includes('مساعدة') || userText.includes('اتصال') || userText.includes('رقم')) {
            replyText = 'للتحدث مع خدمة العملاء أو الدعم الفني، يرجى التواصل معنا عبر الهاتف أو الواتساب على الرقم: 01007608603 وسيقوم أحد ممثلينا بمساعدتك فوراً.';
        } else if (userText.includes('مبيعات') && (userText.includes('فاتورة') || userText.includes('فواتير') || userText.includes('اصدار'))) {
            replyText = 'لإصدار فاتورة مبيعات، يرجى التوجه إلى قسم "المبيعات" من القائمة الجانبية، ثم الضغط على "فاتورة مبيعات جديدة". قم باختيار العميل وإضافة الأصناف ثم احفظ الفاتورة.';
        } else if (userText.includes('مشتريات') && (userText.includes('فاتورة') || userText.includes('فواتير') || userText.includes('اصدار'))) {
            replyText = 'لإصدار فاتورة مشتريات، يرجى التوجه إلى قسم "المشتريات" من القائمة الجانبية، ثم الضغط على "فاتورة مشتريات جديدة". قم باختيار المورد وإضافة الأصناف ثم احفظ الفاتورة.';
        } else if (userText.includes('مرتجع') && userText.includes('مبيعات')) {
            replyText = 'لإصدار مرتجع مبيعات، توجه إلى قسم "المبيعات" ثم "مرتجع مبيعات". يمكنك إنشاء المرتجع بناءً على فاتورة سابقة أو كمرتجع حر.';
        } else if (userText.includes('مرتجع') && userText.includes('مشتريات')) {
            replyText = 'لإصدار مرتجع مشتريات، توجه إلى قسم "المشتريات" ثم "مرتجع مشتريات". يمكنك إنشاء المرتجع بناءً على فاتورة سابقة أو كمرتجع حر.';
        } else if (userText.includes('فاتورة') || userText.includes('فواتير') || userText.includes('اصدار')) {
            replyText = 'هل تقصد فاتورة مبيعات أم فاتورة مشتريات؟ يرجى التوضيح لأتمكن من مساعدتك بشكل أفضل.';
        } else if (userText.includes('تكويد') || userText.includes('صنف') || userText.includes('اصناف') || userText.includes('اضافة')) {
            replyText = 'لإضافة أو تكويد صنف جديد، يمكنك الذهاب إلى "إدارة الأصناف" والضغط على "إضافة صنف جديد". قم بتعبئة بيانات الصنف مثل الاسم، الباركود، وسعر البيع.';
        } else if (userText.includes('عميل') || userText.includes('عملاء')) {
            replyText = 'لإدارة العملاء أو إضافة عميل جديد، توجه إلى "إدارة العملاء" من القائمة الرئيسية واضغط على "إضافة عميل جديد".';
        } else if (userText.includes('مورد') || userText.includes('موردين')) {
            replyText = 'لإدارة الموردين، يمكنك الدخول إلى "إدارة الموردين" من القائمة الرئيسية واضغط على "إضافة مورد جديد".';
        } else if (userText.includes('خزينة') || userText.includes('مصروف') || userText.includes('مصروفات') || userText.includes('سند')) {
            replyText = 'لإدارة الخزينة والمصروفات، يمكنك زيارة قسم "الخزينة" أو "المصروفات" لتسجيل حركات الدفع والقبض.';
        } else if (userText.includes('كيف') || userText.includes('استخدام') || userText.includes('طريقة') || userText.includes('شرح') || userText.includes('عمل')) {
            replyText = 'يمكنني مساعدتك في شرح أجزاء البرنامج مثل (الفواتير، الأصناف، العملاء). فقط اكتب ما تريد السؤال عنه. وإذا كنت تفضل التحدث مع موظف خدمة العملاء، يرجى كتابة "أريد التحدث مع خدمة العملاء".';
        } else if (userText.includes('رسالة صوتية') || userText.includes('مكالمة')) {
            replyText = 'عذراً، الرد الآلي لا يمكنه الاستماع للرسائل الصوتية أو المكالمات. يرجى التواصل معنا عبر الهاتف أو الواتساب على الرقم: 01007608603';
        } else {
            replyText = 'عفواً، لم أفهم طلبك بدقة. أنا المساعد الذكي للنظام، يمكنك سؤالي عن كيفية استخدام البرنامج (مثل: كيف أعمل فاتورة مبيعات؟). وإذا كنت تواجه مشكلة معقدة، يرجى كتابة "أريد التحدث مع خدمة العملاء".';
        }

        setTimeout(() => {
            const replyMessage: ChatMessage = {
                id: Date.now().toString(),
                channelId: activeChannelId,
                senderId: -1, // -1 for system/bot
                senderName: 'الرد الآلي - الدعم الفني',
                text: replyText,
                timestamp: Date.now(),
            };
            setChatMessages(prev => {
                const safePrev = Array.isArray(prev) ? prev : [];
                return [...safePrev, replyMessage];
            });
            resetInactivityTimer();
        }, 1000);
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

        const messageText = newMessage.trim();
        const message: ChatMessage = {
            id: Date.now().toString(),
            channelId: activeChannelId,
            senderId: currentUser.id,
            senderName: currentUser.fullName,
            text: messageText,
            timestamp: Date.now(),
        };

        setChatMessages(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return [...safePrev, message];
        });

        setNewMessage('');
        resetInactivityTimer();
        triggerAutoReply(messageText);
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
        const message: ChatMessage = {
            id: Date.now().toString(),
            channelId: activeChannelId,
            senderId: currentUser.id,
            senderName: currentUser.fullName,
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
        const message: ChatMessage = {
            id: Date.now().toString(),
            channelId: activeChannelId,
            senderId: currentUser.id,
            senderName: currentUser.fullName,
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

    const renderMessageText = (text: string, senderId: number) => {
        // Obfuscate sensitive data for non-admin users (assuming admin has ID 1)
        // Pattern: [SENSITIVE:12345] -> 12345 for admin, ***** for others
        const isAdmin = currentUser.id === 1 || (currentUser.permissions && currentUser.permissions.includes('admin'));
        
        // If it's the current user's message, they should see it clearly (optional, but usually good UX)
        // But the requirement says "Show encrypted to others", implying only managers see it.
        // Let's stick to: Admin/Manager sees all, others see encrypted.
        
        return text.split(/(\[SENSITIVE:.*?\])/g).map((part, index) => {
            const match = part.match(/\[SENSITIVE:(.*?)\]/);
            if (match) {
                if (isAdmin) {
                    return <span key={index} className="font-bold text-red-600 dark:text-red-400">{match[1]}</span>;
                } else {
                    return <span key={index} className="font-mono text-gray-500">******</span>;
                }
            }
            return part;
        });
    };

    const handleDeleteMessage = (msgId: string) => {
        if (confirm('هل أنت متأكد من حذف هذه الرسالة؟')) {
            setChatMessages(prev => {
                const safePrev = Array.isArray(prev) ? prev : [];
                return safePrev.filter(m => m.id !== msgId);
            });
        }
    };

    return (
        <>
            <audio ref={audioRef} src="/notification.mp3" preload="auto"></audio>
            <div className="fixed bottom-8 right-8 z-[9999] flex flex-col items-center gap-2">
                {isSupportMode && !isOpen && (
                    <div className="bg-white text-emerald-700 px-3 py-1.5 rounded-full shadow-lg text-sm font-bold animate-bounce whitespace-nowrap border border-emerald-100">
                        الدعم الفني
                    </div>
                )}
                <button 
                    onClick={toggleChat}
                    className={`${isSupportMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-full p-4 shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 transform hover:scale-110`}>
                    {isOpen ? <X size={28} /> : (isSupportMode ? <Headset size={28} /> : <MessageSquare size={28} />)}
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
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                                {isSupportMode ? 'الدعم الفني' : 'المحادثات'}
                            </h2>
                            <button onClick={handleCall} className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors" title="اتصال صوتي">
                                <Phone size={18} />
                            </button>
                            {currentUser.id === 1 && (
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
                                    return (
                                    <div key={msg.id || Math.random()} className={`mb-3 flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'} group`}>
                                        <div className={`inline-block p-2 rounded-lg max-w-sm relative ${msg.senderId === currentUser.id ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                                            <div className="font-bold text-sm flex justify-between items-center gap-4">
                                                <span>{msg.senderName || 'مستخدم'}</span>
                                                <div className="flex gap-1">
                                                    {msg.senderId === currentUser.id && !msg.audioData && !msg.isCall && (Date.now() - msg.timestamp <= 120000) && (
                                                        <button onClick={() => startEditing(msg)} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/80 hover:text-white" title="تعديل (متاح لمدة دقيقتين)">
                                                            <Edit2 size={14} />
                                                        </button>
                                                    )}
                                                    {isSupportMode && (
                                                        <button onClick={() => handleDeleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700" title="حذف">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
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
                                                <p className="text-sm">{renderMessageText(msg.text || '', msg.senderId)}</p>
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
                                        هذه القناة مخصصة لسجل النظام ولا يمكن إرسال رسائل بها.
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
