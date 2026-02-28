import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, Database, ArrowLeftRight, Sparkles, ShieldCheck, Zap, ArrowRight } from 'lucide-react';

interface InitialSetupProps {
    onChoice: (choice: 'cloud' | 'local') => void;
}

const InitialSetup: React.FC<InitialSetupProps> = ({ onChoice }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#fdfdfd] font-sans rtl">
            {/* Animated Background Elements - Subtle & Light */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-100/50 blur-[120px] animate-pulse"></div>
                <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-emerald-100/50 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]"></div>
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full max-w-5xl px-6"
            >
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-semibold mb-8 shadow-sm"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>مرحباً بك في مستقبل المحاسبة الذكية</span>
                    </motion.div>
                    
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                        لنقم بتهيئة <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">نظامك الجديد</span>
                    </h1>
                    
                    <p className="text-slate-600 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium">
                        خطوة واحدة تفصلك عن إدارة أعمالك باحترافية. اختر الطريقة التي تناسب احتياجاتك للبدء.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Cloud Option */}
                    <motion.div
                        whileHover={{ y: -10, transition: { duration: 0.3 } }}
                        className="group relative p-10 rounded-[2.5rem] bg-white border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-200/40 transition-all duration-500 cursor-pointer overflow-hidden"
                        onClick={() => onChoice('cloud')}
                    >
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 -z-0"></div>
                        
                        <div className="relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-8 shadow-lg shadow-indigo-200 group-hover:rotate-6 transition-transform duration-500">
                                <Cloud className="w-9 h-9 text-white" />
                            </div>
                            
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">الربط السحابي</h2>
                            <p className="text-slate-500 mb-10 leading-relaxed text-lg">
                                قم بربط جهازك بقاعدة بياناتك السحابية الحالية لمزامنة المبيعات والمخازن لحظياً مع جميع فروعك.
                            </p>
                            
                            <div className="space-y-4 mb-10">
                                <div className="flex items-center gap-4 text-slate-700 font-bold">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <span>تشفير بيانات عالي المستوى</span>
                                </div>
                                <div className="flex items-center gap-4 text-slate-700 font-bold">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <span>مزامنة فورية عبر الأجهزة</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between group-hover:translate-x-[-5px] transition-transform">
                                <span className="text-indigo-600 font-black text-xl">نعم، لدي بيانات سحابية</span>
                                <ArrowRight className="w-6 h-6 text-indigo-600" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Local Option */}
                    <motion.div
                        whileHover={{ y: -10, transition: { duration: 0.3 } }}
                        className="group relative p-10 rounded-[2.5rem] bg-white border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-200/40 transition-all duration-500 cursor-pointer overflow-hidden"
                        onClick={() => onChoice('local')}
                    >
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 -z-0"></div>

                        <div className="relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-8 shadow-lg shadow-slate-200 group-hover:rotate-6 transition-transform duration-500">
                                <Database className="w-9 h-9 text-white" />
                            </div>
                            
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">قاعدة بيانات محلية</h2>
                            <p className="text-slate-500 mb-10 leading-relaxed text-lg">
                                ابدأ رحلتك الآن بإنشاء قاعدة بيانات جديدة تماماً على هذا الجهاز. سرعة فائقة وخصوصية مطلقة.
                            </p>

                            <div className="space-y-4 mb-10">
                                <div className="flex items-center gap-4 text-slate-700 font-bold">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <span>تحكم كامل في بياناتك</span>
                                </div>
                                <div className="flex items-center gap-4 text-slate-700 font-bold">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <span>يعمل بكفاءة بدون إنترنت</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between group-hover:translate-x-[-5px] transition-transform">
                                <span className="text-slate-800 font-black text-xl">لا، ابدأ كبرنامج جديد</span>
                                <ArrowRight className="w-6 h-6 text-slate-800" />
                            </div>
                        </div>
                    </motion.div>
                </div>

                <div className="mt-20 text-center">
                    <div className="inline-flex items-center gap-6 px-8 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 text-sm font-bold">
                        <div className="flex items-center gap-2">
                            <ArrowLeftRight className="w-4 h-4" />
                            <span>يمكنك التغيير لاحقاً من الإعدادات</span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                        <span>الإصدار 1.2.7</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                        <span>بواسطة ETQAN Solutions</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default InitialSetup;
