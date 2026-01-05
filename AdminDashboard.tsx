import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Video, VideoType } from './types';
import { db, ensureAuth } from './firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { SYSTEM_CONFIG } from './TechSpecs';

const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

// CHANGED: Using values from TechSpecs to ensure consistency
const R2_WORKER_URL = SYSTEM_CONFIG.cloudflare.workerUrl;
const R2_PUBLIC_URL = SYSTEM_CONFIG.cloudflare.publicUrl;

// --- Helpers ---
const getDeterministicStats = (seed: string) => {
  let hash = 0;
  if (!seed) return { views: 0, likes: 0, quality: 0 };
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const baseViews = Math.abs(hash % 900000) + 500000; 
  const views = baseViews * (Math.abs(hash % 5) + 2); 
  const likes = Math.abs(Math.floor(views * (0.12 + (Math.abs(hash % 15) / 100)))); 
  const quality = 85 + (Math.abs(hash % 15)); 
  return { views, likes, quality };
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
};

// --- Sub-components ---

const SystemBlueprintViewer: React.FC = () => {
    return (
        <div className="p-4 sm:p-8 animate-in fade-in duration-500 pb-32">
            <div className="bg-neutral-900 border border-blue-500/30 p-6 rounded-[2.5rem] shadow-[0_0_30px_rgba(59,130,246,0.1)] mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <h2 className="text-2xl font-black text-white italic mb-2 relative z-10">مخطط النظام (System Blueprint)</h2>
                <p className="text-xs text-gray-400 font-bold relative z-10">بيانات التكوين الحساسة والإعدادات المحفوظة.</p>
            </div>

            <div className="space-y-6">
                {/* Active Config */}
                <div className="bg-black border border-green-500/30 rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-4 left-4 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-black border border-green-500/50">ACTIVE</div>
                    <h3 className="text-lg font-black text-white mb-4">إعدادات Firebase (Active)</h3>
                    <pre className="text-[10px] font-mono text-green-300 overflow-x-auto bg-black/50 p-4 rounded-xl border border-white/5" dir="ltr">
                        {JSON.stringify(SYSTEM_CONFIG.firebase, null, 2)}
                    </pre>
                </div>

                {/* Cloudflare Config */}
                <div className="bg-black border border-orange-500/30 rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-4 left-4 bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-[10px] font-black border border-orange-500/50">STORAGE</div>
                    <h3 className="text-lg font-black text-white mb-4">إعدادات Cloudflare R2</h3>
                    <pre className="text-[10px] font-mono text-orange-300 overflow-x-auto bg-black/50 p-4 rounded-xl border border-white/5" dir="ltr">
                        {JSON.stringify(SYSTEM_CONFIG.cloudflare, null, 2)}
                    </pre>
                </div>

                {/* Smart Code Logic */}
                <div className="bg-neutral-800 border border-purple-500/30 rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-4 left-4 bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-[10px] font-black border border-purple-500/50">LOGIC</div>
                    <h3 className="text-lg font-black text-white mb-4">كود الرفع الذكي (Smart Upload)</h3>
                    <div className="bg-black p-4 rounded-xl border border-white/10 overflow-x-auto">
                        <code className="text-[10px] font-mono text-purple-300 whitespace-pre block" dir="ltr">
                            {SYSTEM_CONFIG.smartUploadLogic}
                        </code>
                    </div>
                </div>

                {/* Legacy Config */}
                <div className="bg-red-950/20 border border-red-500/20 rounded-3xl p-6 relative overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                    <div className="absolute top-4 left-4 bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-[10px] font-black border border-red-500/50">LEGACY</div>
                    <h3 className="text-lg font-black text-white mb-4">الإعدادات القديمة (Legacy)</h3>
                    <pre className="text-[10px] font-mono text-red-300 overflow-x-auto bg-black/50 p-4 rounded-xl border border-white/5" dir="ltr">
                        {JSON.stringify(SYSTEM_CONFIG.legacyConfig, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
};

const AppAnalytics: React.FC<{ videos: Video[] }> = ({ videos }) => {
    const sortedVideos = useMemo(() => {
        return [...videos].sort((a, b) => {
            const statsA = getDeterministicStats(a.video_url);
            const statsB = getDeterministicStats(b.video_url);
            return statsB.views - statsA.views;
        });
    }, [videos]);

    const totalViews = sortedVideos.reduce((acc, v) => acc + getDeterministicStats(v.video_url).views, 0);
    const avgQuality = Math.round(sortedVideos.reduce((acc, v) => acc + getDeterministicStats(v.video_url).quality, 0) / (sortedVideos.length || 1));

    return (
        <div className="p-4 sm:p-8 animate-in fade-in duration-500">
            <div className="bg-neutral-900 border border-cyan-500/30 p-6 rounded-[2.5rem] shadow-[0_0_30px_rgba(6,182,212,0.1)] mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <h2 className="text-2xl font-black text-white italic mb-2 relative z-10">تحليل الذكاء الاصطناعي (AI Analytics)</h2>
                <div className="grid grid-cols-3 gap-4 mt-6 relative z-10">
                    <div className="bg-black/50 p-4 rounded-2xl border border-white/10 text-center">
                        <span className="text-[10px] text-gray-400 font-bold block mb-1">إجمالي المشاهدات</span>
                        <span className="text-xl font-black text-cyan-400 font-mono">{formatNumber(totalViews)}</span>
                    </div>
                    <div className="bg-black/50 p-4 rounded-2xl border border-white/10 text-center">
                        <span className="text-[10px] text-gray-400 font-bold block mb-1">جودة المحتوى</span>
                        <span className="text-xl font-black text-green-400 font-mono">{avgQuality}%</span>
                    </div>
                    <div className="bg-black/50 p-4 rounded-2xl border border-white/10 text-center">
                        <span className="text-[10px] text-gray-400 font-bold block mb-1">عدد الفيديوهات</span>
                        <span className="text-xl font-black text-white font-mono">{videos.length}</span>
                    </div>
                </div>
            </div>

            <div className="bg-black border border-white/10 rounded-[2rem] overflow-hidden">
                <div className="grid grid-cols-12 bg-white/5 p-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-white/10">
                    <div className="col-span-5 pr-4">تفاصيل الفيديو</div>
                    <div className="col-span-2 text-center">القسم</div>
                    <div className="col-span-2 text-center">المشاهدات</div>
                    <div className="col-span-2 text-center">اللايكات</div>
                    <div className="col-span-1 text-center">الجودة</div>
                </div>
                <div className="divide-y divide-white/5">
                    {sortedVideos.map((v, idx) => {
                        const stats = getDeterministicStats(v.video_url);
                        return (
                            <div key={v.id} className="grid grid-cols-12 p-2 items-center hover:bg-white/5 transition-colors group">
                                <div className="col-span-5 flex items-center gap-3">
                                    <span className="text-[8px] text-gray-600 font-mono w-4">{idx + 1}</span>
                                    <div className="w-8 h-8 rounded-lg bg-white/10 overflow-hidden shrink-0 border border-white/10">
                                        <video src={v.video_url} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-[10px] font-bold text-white line-clamp-1 group-hover:text-cyan-400 transition-colors">{v.title}</span>
                                </div>
                                <div className="col-span-2 flex justify-center">
                                    <span className="bg-white/10 px-2 py-0.5 rounded text-[8px] text-gray-300">{v.category}</span>
                                </div>
                                <div className="col-span-2 text-center font-mono text-[10px] text-cyan-500 font-bold">
                                    {formatNumber(stats.views)}
                                </div>
                                <div className="col-span-2 text-center font-mono text-[10px] text-pink-500 font-bold">
                                    {formatNumber(stats.likes)}
                                </div>
                                <div className="col-span-1 flex justify-center">
                                    <div className={`w-8 py-0.5 rounded text-[8px] font-black text-center ${stats.quality > 90 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                        {stats.quality}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const AIAvatarManager: React.FC = () => {
  const [silentUrl, setSilentUrl] = useState('');
  const [talkingUrl, setTalkingUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingSilent, setUploadingSilent] = useState(false);
  const [uploadingTalking, setUploadingTalking] = useState(false);

  const silentInputRef = useRef<HTMLInputElement>(null);
  const talkingInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        await ensureAuth();
        const d = await getDoc(doc(db, 'settings', 'ai_avatar'));
        if (d.exists()) {
          const data = d.data();
          setSilentUrl(data.silent_url || '');
          setTalkingUrl(data.talking_url || '');
        }
      } catch(e) { console.error(e); }
    };
    fetch();
  }, []);

  const handleUpload = async (file: File, type: 'silent' | 'talking') => {
    if (!file) return;
    
    const setUploading = type === 'silent' ? setUploadingSilent : setUploadingTalking;
    const setUrl = type === 'silent' ? setSilentUrl : setTalkingUrl;

    setUploading(true);
    try {
        const cleanName = file.name.replace(/[^\w.-]/g, '');
        const fileName = `avatar_${type}_${Date.now()}_${cleanName}`;
        
        await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const targetUrl = `${R2_WORKER_URL}/${encodeURIComponent(fileName)}`;
            
            xhr.open('PUT', targetUrl, true);
            xhr.withCredentials = false; 
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) resolve();
                else reject(new Error(`Upload failed (Status ${xhr.status}): ${xhr.statusText}`));
            };
            xhr.onerror = () => reject(new Error('Network error: Connection refused or CORS failed'));
            xhr.send(file);
        });

        const finalUrl = `${R2_PUBLIC_URL}/${fileName}`;
        setUrl(finalUrl);
        alert(`تم رفع فيديو ${type === 'silent' ? 'الصمت' : 'التحدث'} بنجاح!`);
    } catch (e: any) {
        console.error(e);
        alert("فشل الرفع: " + (e.message || "خطأ غير معروف"));
    } finally {
        setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await ensureAuth();
      await setDoc(doc(db, 'settings', 'ai_avatar'), {
        silent_url: silentUrl,
        talking_url: talkingUrl
      }, { merge: true });
      alert('تم تحديث الأفاتار بنجاح');
    } catch(e) {
      alert('فشل التحديث');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 text-white bg-neutral-900 rounded-[2.5rem] border border-white/5 max-w-2xl mx-auto mt-10 animate-in zoom-in-95 duration-500">
      <h2 className="text-xl font-bold mb-6 text-purple-500">إعدادات الأفاتار (AI Avatar)</h2>
      <div className="space-y-8">
        
        {/* Silent Video Section */}
        <div>
          <label className="block text-xs mb-2 text-gray-400 font-bold">فيديو وضع الصامت (Idle)</label>
          <div className="flex gap-4 items-start">
             <div 
               onClick={() => !uploadingSilent && silentInputRef.current?.click()}
               className={`w-32 h-32 shrink-0 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${uploadingSilent ? 'border-purple-500 bg-purple-500/10' : 'border-white/20 hover:border-purple-500 hover:bg-white/5'}`}
             >
                <input 
                    type="file" 
                    ref={silentInputRef} 
                    hidden 
                    accept="video/*" 
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'silent')}
                />
                {uploadingSilent ? (
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <>
                        <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                        <span className="text-[9px] text-gray-400">رفع فيديو</span>
                    </>
                )}
             </div>
             
             <div className="flex-1 space-y-2">
                <input className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-mono text-purple-300" value={silentUrl} onChange={e => setSilentUrl(e.target.value)} placeholder="أو ضع الرابط هنا..." />
                {silentUrl && (
                    <div className="aspect-video w-32 rounded-lg overflow-hidden border border-white/10 bg-black">
                        <video src={silentUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                    </div>
                )}
             </div>
          </div>
        </div>

        {/* Talking Video Section */}
        <div>
          <label className="block text-xs mb-2 text-gray-400 font-bold">فيديو وضع التحدث (Talking)</label>
          <div className="flex gap-4 items-start">
             <div 
               onClick={() => !uploadingTalking && talkingInputRef.current?.click()}
               className={`w-32 h-32 shrink-0 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${uploadingTalking ? 'border-green-500 bg-green-500/10' : 'border-white/20 hover:border-green-500 hover:bg-white/5'}`}
             >
                <input 
                    type="file" 
                    ref={talkingInputRef} 
                    hidden 
                    accept="video/*" 
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'talking')}
                />
                {uploadingTalking ? (
                    <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <>
                        <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                        <span className="text-[9px] text-gray-400">رفع فيديو</span>
                    </>
                )}
             </div>
             
             <div className="flex-1 space-y-2">
                <input className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-mono text-green-300" value={talkingUrl} onChange={e => setTalkingUrl(e.target.value)} placeholder="أو ضع الرابط هنا..." />
                {talkingUrl && (
                    <div className="aspect-video w-32 rounded-lg overflow-hidden border border-white/10 bg-black">
                        <video src={talkingUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                    </div>
                )}
             </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={loading} className="w-full bg-purple-600 py-4 rounded-xl font-bold mt-4 shadow-lg hover:bg-purple-500 transition-colors">
          {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  );
};

const CentralKeyManager: React.FC = () => {
  const [geminiKey, setGeminiKey] = useState('');
  const [elevenKeys, setElevenKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        await ensureAuth();
        const d = await getDoc(doc(db, 'settings', 'api_config'));
        if (d.exists()) {
          const data = d.data();
          setGeminiKey(data.gemini_key || '');
          setElevenKeys(data.elevenlabs_keys || []);
        }
      } catch(e) { console.error(e); }
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await ensureAuth();
      await setDoc(doc(db, 'settings', 'api_config'), {
        gemini_key: geminiKey,
        elevenlabs_keys: elevenKeys
      }, { merge: true });
      alert('تم تحديث المفاتيح بنجاح');
    } catch(e) {
      alert('فشل التحديث');
    } finally {
      setLoading(false);
    }
  };

  const addElevenKey = () => {
    if (newKey) {
      setElevenKeys([...elevenKeys, newKey]);
      setNewKey('');
    }
  };

  const removeElevenKey = (idx: number) => {
    setElevenKeys(elevenKeys.filter((_, i) => i !== idx));
  };

  return (
    <div className="p-8 text-white bg-neutral-900 rounded-[2.5rem] border border-white/5 max-w-2xl mx-auto mt-10 animate-in zoom-in-95 duration-500">
      <h2 className="text-xl font-bold mb-6 text-green-500">إدارة المفاتيح (API Keys)</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-xs mb-1 text-gray-400">Gemini API Key</label>
          <input className="w-full bg-black border border-white/10 p-3 rounded-xl font-mono text-sm" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} />
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-400">ElevenLabs Keys Pool</label>
          <div className="space-y-2 mb-2">
            {elevenKeys.map((k, i) => (
              <div key={i} className="flex gap-2">
                <input readOnly className="flex-1 bg-black/50 border border-white/5 p-2 rounded-lg font-mono text-xs text-gray-300" value={k} />
                <button onClick={() => removeElevenKey(i)} className="bg-red-600/20 text-red-500 p-2 rounded-lg text-xs">حذف</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="flex-1 bg-black border border-white/10 p-3 rounded-xl font-mono text-sm" placeholder="مفتاح جديد..." value={newKey} onChange={e => setNewKey(e.target.value)} />
            <button onClick={addElevenKey} className="bg-white/10 px-4 rounded-xl font-bold">+</button>
          </div>
        </div>

        <button onClick={handleSave} disabled={loading} className="w-full bg-green-600 py-3 rounded-xl font-bold mt-4">
          {loading ? 'جاري الحفظ...' : 'حفظ الكل'}
        </button>
      </div>
    </div>
  );
};

interface AdminDashboardProps {
  onClose: () => void;
  categories: string[];
  initialVideos: Video[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onClose, categories, initialVideos 
}) => {
  const [currentPasscode] = useState('5030775');
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('الكل');
  
  // EDITING STATE
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // State for Delete Confirmation Modal
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View Mode
  const [viewMode, setViewMode] = useState<'videos' | 'keys' | 'ai_setup' | 'analytics' | 'blueprint'>('videos'); 
  
  // Security State
  const [failedAttempts, setFailedAttempts] = useState(() => {
    return parseInt(localStorage.getItem('admin_failed_attempts') || '0');
  });
  const [lockoutUntil, setLockoutUntil] = useState(() => {
    return parseInt(localStorage.getItem('admin_lockout_until') || '0');
  });

  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    category: categories[0] || 'هجمات مرعبة',
    video_type: 'Shorts' as VideoType,
    is_trending: false,
    read_narrative: false,
    redirect_url: '' 
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Helper to get persistent device ID for Firebase logging
  const getDeviceId = () => {
    let id = localStorage.getItem('device_security_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('device_security_id', id);
    }
    return id;
  };

  const handleAuth = async () => {
    if (Date.now() < lockoutUntil) return;

    if (passcode === currentPasscode) {
      setIsAuthenticated(true);
      setFailedAttempts(0);
      localStorage.setItem('admin_failed_attempts', '0');
    } else { 
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('admin_failed_attempts', newAttempts.toString());
      setPasscode('');
      
      if (newAttempts >= 5) {
        const lockoutTime = Date.now() + (60 * 60 * 1000); // 1 Hour
        setLockoutUntil(lockoutTime);
        localStorage.setItem('admin_lockout_until', lockoutTime.toString());
        try {
          await ensureAuth();
          await addDoc(collection(db, "security_lockouts"), {
            device_id: getDeviceId(),
            timestamp: serverTimestamp(),
            reason: "5_failed_attempts",
            lockout_until: new Date(lockoutTime).toISOString(),
            user_agent: navigator.userAgent
          });
        } catch (e) {
          console.error("Failed to log security event", e);
        }
      } else {
        alert(`الرمز خاطئ! المحاولة ${newAttempts} من 5.`);
      }
    }
  };

  const isLockedOut = Date.now() < lockoutUntil;

  // Handle File Select & Preview
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // Populate form with video data for editing
  const handleEditClick = (v: Video) => {
    setEditingId(v.id);
    setNewVideo({
        title: v.title,
        description: v.description,
        category: v.category,
        video_type: v.video_type,
        is_trending: v.is_trending,
        read_narrative: v.read_narrative || false,
        redirect_url: v.redirect_url || ''
    });
    setPreviewUrl(v.video_url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    clearFileSelection();
    setNewVideo({
        title: '',
        description: '',
        category: categories[0] || 'هجمات مرعبة',
        video_type: 'Shorts',
        is_trending: false,
        read_narrative: false,
        redirect_url: ''
    });
  };

  const clearFileSelection = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (previewUrl && !previewUrl.startsWith('http')) {
        URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ----------------------------------------------------
  // CORE LOGIC: R2 Upload + Firebase Metadata
  // ----------------------------------------------------
  const handlePublish = async () => {
    const file = fileInputRef.current?.files?.[0];
    
    // Manual Validation
    if (!editingId && !file && !newVideo.redirect_url) {
      alert("الرجاء اختيار ملف فيديو (من المربع العلوي) أو وضع رابط خارجي!");
      return;
    }
    
    if (editingId && !previewUrl && !file && !newVideo.redirect_url) {
        alert("لا يمكن حفظ التعديل بدون فيديو.");
        return;
    }

    const defaultTitle = "فيديوهات الحديقة المرعبة";
    const defaultDesc = "الحديقة المرعبة رعب حقيقي ما بيتنسيش";
    const finalTitle = newVideo.title.trim() === "" ? defaultTitle : newVideo.title;
    const finalDesc = newVideo.description.trim() === "" ? defaultDesc : newVideo.description;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await ensureAuth();
      let finalVideoUrl = editingId ? previewUrl : "";

      // 1. Upload Video to R2 (if new file selected)
      if (file) {
        const cleanName = file.name.replace(/[^\w.-]/g, '');
        const safeFileName = `vid_${Date.now()}_${cleanName}`;
        
        await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const targetUrl = `${R2_WORKER_URL}/${encodeURIComponent(safeFileName)}`;
            
            xhr.open('PUT', targetUrl, true);
            xhr.withCredentials = false;
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = (e.loaded / e.total) * 100;
                    setUploadProgress(percent);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    reject(new Error(`R2 Upload Failed (Status ${xhr.status}): ${xhr.statusText}`));
                }
            };

            xhr.onerror = () => {
                reject(new Error('Network Error: CORS failed or Worker URL unreachable.'));
            };
            xhr.send(file);
        });

        finalVideoUrl = `${R2_PUBLIC_URL}/${safeFileName}`;
      } else if (!editingId) {
         finalVideoUrl = newVideo.redirect_url || "";
      }
      
      // 2. Save Metadata to Firebase Firestore
      const videoData = {
        ...newVideo,
        title: finalTitle,
        description: finalDesc,
        video_url: finalVideoUrl,
        redirect_url: newVideo.redirect_url || null,
        created_at: serverTimestamp(),
      };

      if (editingId) {
          await updateDoc(doc(db, "videos", editingId), videoData);
          alert("تم تحديث الفيديو بنجاح!");
      } else {
          await addDoc(collection(db, "videos"), { ...videoData, views: 0, likes: 0 });
          alert("تم الرفع بنجاح والكابوس الآن متاح للجميع!");
      }
      
      cancelEdit(); 

    } catch (e: any) {
      console.error("Upload/Save Error:", e);
      alert("فشل النشر: " + (e.message || "خطأ غير معروف"));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const toggleTrending = async (v: Video) => {
    try {
      await ensureAuth();
      await updateDoc(doc(db, "videos", v.id), { is_trending: !v.is_trending });
    } catch (e) { alert("فشل تحديث الترند"); }
  };

  const requestDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await ensureAuth();
      await deleteDoc(doc(db, "videos", deleteTargetId));
      if (editingId === deleteTargetId) {
          cancelEdit();
      }
      setDeleteTargetId(null);
    } catch (e) {
      alert("فشل الحذف من قاعدة البيانات.");
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteTargetId(null);
  };

  const filteredVideos = useMemo(() => {
    return initialVideos.filter(v => {
      const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'الكل' || v.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [initialVideos, searchQuery, filterCategory]);

  if (!isAuthenticated) {
    if (isLockedOut) {
      return (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-6 text-center" dir="rtl">
           <div className="w-24 h-24 rounded-full border-4 border-red-900 flex items-center justify-center mb-6 animate-pulse">
             <svg className="w-12 h-12 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
           </div>
           <h2 className="text-3xl font-black text-red-800 italic">نظام مغلق أمنياً</h2>
           <p className="text-gray-500 mt-4 font-bold text-sm">تم استنفاذ محاولات الدخول. <br/> يرجى العودة لاحقاً.</p>
           <button onClick={onClose} className="mt-10 px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold">خروج</button>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="flex flex-col items-center mb-10 animate-in zoom-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-red-600 blur-xl opacity-20 animate-pulse rounded-full"></div>
            <img src={LOGO_URL} className="w-24 h-24 rounded-full border-4 border-red-600 relative z-10 shadow-[0_0_30px_red]" />
          </div>
          <h2 className="text-2xl font-black text-red-600 mt-6 italic tracking-wider drop-shadow-lg">لوحة التحكم السيادية</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-bold mt-2">Restricted Access Area</p>
        </div>

        <div className="flex gap-3 mb-10" dir="ltr">
          {[...Array(7)].map((_, i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                passcode.length > i 
                ? 'bg-red-600 border-red-600 shadow-[0_0_10px_red] scale-110' 
                : 'border-red-900/50 bg-transparent'
              }`}
            ></div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-[320px]" dir="ltr">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => passcode.length < 7 && setPasscode(p => p + num)}
              className="h-20 w-full bg-neutral-900/50 backdrop-blur-md rounded-2xl text-3xl font-black text-white border border-white/10 hover:border-red-600/50 active:bg-red-600 active:border-red-500 active:scale-95 transition-all shadow-lg flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          
          <button
            onClick={() => setPasscode('')}
            className="h-20 w-full bg-red-950/20 rounded-2xl flex items-center justify-center text-red-500 border border-red-900/30 active:bg-red-900/40 active:scale-95 transition-all hover:bg-red-900/20"
          >
            <span className="text-sm font-black">مسح</span>
          </button>

          <button
            onClick={() => passcode.length < 7 && setPasscode(p => p + '0')}
            className="h-20 w-full bg-neutral-900/50 backdrop-blur-md rounded-2xl text-3xl font-black text-white border border-white/10 hover:border-red-600/50 active:bg-red-600 active:border-red-500 active:scale-95 transition-all shadow-lg flex items-center justify-center"
          >
            0
          </button>

          <button
            onClick={handleAuth}
            className="h-20 w-full bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center text-white border border-red-500 shadow-[0_0_25px_rgba(220,38,38,0.4)] hover:shadow-[0_0_35px_rgba(220,38,38,0.6)] active:scale-95 transition-all"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[900] bg-black overflow-hidden flex flex-col font-sans" dir="rtl">
      {/* NEW ELEGANT HEADER (2 LEFT, 2 RIGHT, LOGO CLOSE) */}
      <div className="h-24 border-b border-white/10 relative flex items-center justify-between px-4 sm:px-8 bg-black/90 backdrop-blur-3xl shrink-0 z-50 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
        
        {/* Left Buttons Group */}
        <div className="flex items-center gap-4 relative z-10 w-1/3 justify-start">
            <button 
              onClick={() => setViewMode('videos')} 
              className={`relative px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all duration-500 border overflow-hidden group w-full sm:w-auto ${viewMode === 'videos' ? 'bg-red-600/10 border-red-500 text-red-500 shadow-[0_0_30px_rgba(220,38,38,0.4)]' : 'bg-black/40 border-white/5 text-gray-400 hover:border-white/20 hover:text-white'}`}
            >
                <span className="relative z-10">المكتبة</span>
                {viewMode === 'videos' && <div className="absolute inset-0 bg-red-600/10 blur-xl"></div>}
            </button>
            <button 
              onClick={() => setViewMode('analytics')} 
              className={`relative px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all duration-500 border overflow-hidden group w-full sm:w-auto ${viewMode === 'analytics' ? 'bg-cyan-600/10 border-cyan-500 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.4)]' : 'bg-black/40 border-white/5 text-gray-400 hover:border-white/20 hover:text-white'}`}
            >
                <span className="relative z-10">الجودة</span>
                {viewMode === 'analytics' && <div className="absolute inset-0 bg-cyan-600/10 blur-xl"></div>}
            </button>
        </div>

        {/* Center Logo (Acts as Close Button) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer" onClick={onClose} title="إغلاق لوحة التحكم">
           <div className="absolute inset-0 bg-red-600/30 rounded-full blur-[40px] animate-pulse group-hover:bg-red-600/60 transition-all duration-500"></div>
           <div className="relative w-16 h-16 rounded-full border-2 border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.4)] overflow-hidden group-hover:scale-110 group-hover:border-red-500 transition-all duration-300">
              <img src={LOGO_URL} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 backdrop-blur-sm">
                 <svg className="w-8 h-8 text-white drop-shadow-[0_0_10px_white]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </div>
           </div>
        </div>

        {/* Right Buttons Group */}
        <div className="flex items-center gap-4 relative z-10 w-1/3 justify-end">
            <button 
              onClick={() => setViewMode('ai_setup')} 
              className={`relative px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all duration-500 border overflow-hidden group w-full sm:w-auto ${viewMode === 'ai_setup' ? 'bg-purple-600/10 border-purple-500 text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.4)]' : 'bg-black/40 border-white/5 text-gray-400 hover:border-white/20 hover:text-white'}`}
            >
                <span className="relative z-10">AI Avatar</span>
                {viewMode === 'ai_setup' && <div className="absolute inset-0 bg-purple-600/10 blur-xl"></div>}
            </button>
            <button 
              onClick={() => setViewMode('keys')} 
              className={`relative px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all duration-500 border overflow-hidden group w-full sm:w-auto ${viewMode === 'keys' ? 'bg-green-600/10 border-green-500 text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.4)]' : 'bg-black/40 border-white/5 text-gray-400 hover:border-white/20 hover:text-white'}`}
            >
                <span className="relative z-10">المفاتيح</span>
                {viewMode === 'keys' && <div className="absolute inset-0 bg-green-600/10 blur-xl"></div>}
            </button>
            <button 
                onClick={() => setViewMode('blueprint')} 
                className={`relative px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all duration-500 border overflow-hidden group w-full sm:w-auto ${viewMode === 'blueprint' ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.4)]' : 'bg-black/40 border-white/5 text-gray-400 hover:border-white/20 hover:text-white'}`}
            >
                <span className="relative z-10">النظام</span>
                {viewMode === 'blueprint' && <div className="absolute inset-0 bg-blue-600/10 blur-xl"></div>}
            </button>
        </div>
      </div>

      {viewMode === 'ai_setup' ? (
          <AIAvatarManager />
      ) : viewMode === 'keys' ? (
          <CentralKeyManager />
      ) : viewMode === 'analytics' ? (
          <AppAnalytics videos={initialVideos} />
      ) : viewMode === 'blueprint' ? (
          <SystemBlueprintViewer />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-32 space-y-8">
            {/* NEW LAYOUT: Upload Section */}
            <div className={`bg-neutral-900/30 border p-6 rounded-[2.5rem] shadow-2xl flex flex-col gap-6 ${editingId ? 'border-blue-600/50 shadow-[0_0_30px_rgba(37,99,235,0.2)]' : 'border-white/5'}`}>
                {editingId && (
                    <div className="bg-blue-600/20 text-blue-400 px-4 py-2 rounded-xl text-center font-bold text-sm border border-blue-600/50 animate-pulse">
                        أنت الآن تقوم بتعديل فيديو موجود
                    </div>
                )}

                {/* 1. TOP: Video Upload / Preview Box */}
                <div 
                  onClick={() => !isUploading && !previewUrl && fileInputRef.current?.click()} 
                  className={`w-full aspect-video border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center overflow-hidden relative transition-all cursor-pointer bg-black/50 ${isUploading ? 'border-red-600 bg-red-600/5' : 'border-white/10 hover:border-red-600'}`}
                >
                  <input type="file" ref={fileInputRef} accept="video/*" className="hidden" onChange={handleFileSelect} />
                  
                  {previewUrl ? (
                    <div className="relative w-full h-full bg-black flex items-center justify-center group">
                       <video 
                         ref={videoPreviewRef}
                         src={previewUrl} 
                         controls 
                         className="h-full w-full object-contain" 
                       />
                       <button 
                         onClick={clearFileSelection}
                         className="absolute top-4 right-4 bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-50 hover:bg-red-700 active:scale-90"
                         title="إزالة الفيديو / تغيير الملف"
                       >
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                       </button>
                    </div>
                  ) : isUploading ? (
                    <div className="text-center p-8">
                        <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                            <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black text-white">{Math.round(uploadProgress)}%</span>
                        </div>
                        <span className="text-xl font-black text-white animate-pulse">جاري الرفع إلى الخزنة (R2)...</span>
                    </div>
                  ) : (
                    <div className="text-center p-8">
                        <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                        <p className="text-white font-black text-sm">{editingId ? 'اضغط لتغيير ملف الفيديو' : 'اضغط لاختيار فيديو من الجهاز'}</p>
                    </div>
                  )}
                </div>

                {/* 2. MIDDLE: Action Buttons Row */}
                <div className="flex gap-4 justify-center">
                    {/* Narrative Toggle */}
                    <button 
                        onClick={() => setNewVideo({...newVideo, read_narrative: !newVideo.read_narrative})}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold border transition-all active:scale-95 flex-1 justify-center ${newVideo.read_narrative ? 'bg-green-600 border-green-400 text-white shadow-[0_0_10px_green]' : 'bg-black border-white/10 text-gray-400'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        سرد صوتي
                    </button>

                    {/* Trend Toggle */}
                    <button 
                        onClick={() => setNewVideo({...newVideo, is_trending: !newVideo.is_trending})}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold border transition-all active:scale-95 flex-1 justify-center ${newVideo.is_trending ? 'bg-red-600 border-red-400 text-white shadow-[0_0_10px_red]' : 'bg-black border-white/10 text-gray-400'}`}
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.557 12c0 3.071-2.488 5.557-5.557 5.557s-5.557-2.486-5.557-5.557c0-1.538.625-2.93 1.63-3.935L12 4l3.929 4.065c1.005 1.005 1.628 2.397 1.628 3.935z"/></svg>
                        علامة ترند
                    </button>
                </div>

                {/* 3. BOTTOM: Inputs */}
                <div className="space-y-4">
                    <input 
                        type="text" 
                        placeholder="عنوان الفيديو..." 
                        value={newVideo.title} 
                        onChange={e => setNewVideo({...newVideo, title: e.target.value})} 
                        className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-red-600 transition-colors" 
                    />
                    
                    {/* Description showing formatted logic */}
                    <div className="relative">
                        <textarea 
                            placeholder="السرد المرعب (4 كلمات في كل سطر)..." 
                            value={newVideo.description} 
                            onChange={e => setNewVideo({...newVideo, description: e.target.value})} 
                            className="w-full bg-black border border-white/10 rounded-xl p-4 text-white min-h-[120px] outline-none font-mono text-sm leading-relaxed whitespace-pre" 
                        />
                        <div className="absolute top-2 left-2 text-[8px] text-gray-500 font-bold bg-black/80 px-2 py-1 rounded">
                            FORMAT: 4 Words/Line
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <select value={newVideo.category} onChange={e => setNewVideo({...newVideo, category: e.target.value})} className="bg-black border border-white/10 rounded-xl p-4 text-red-500 font-bold outline-none">
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={newVideo.video_type} onChange={e => setNewVideo({...newVideo, video_type: e.target.value as VideoType})} className="bg-black border border-white/10 rounded-xl p-4 text-white outline-none">
                        <option value="Shorts">Shorts</option>
                        <option value="Long Video">Long Video</option>
                        </select>
                    </div>

                    <input 
                        type="text" 
                        placeholder="رابط خارجي (External Link / Redirect)..." 
                        value={newVideo.redirect_url} 
                        onChange={e => setNewVideo({...newVideo, redirect_url: e.target.value})} 
                        className="w-full bg-black border border-white/10 rounded-xl p-4 text-white outline-none placeholder:text-gray-600" 
                    />
                </div>

                <div className="flex gap-2 mt-2">
                    {editingId && (
                        <button onClick={cancelEdit} className="bg-white/10 hover:bg-white/20 px-6 rounded-xl font-bold text-white transition-colors border border-white/10">
                            إلغاء التعديل
                        </button>
                    )}
                    <button disabled={isUploading} onClick={handlePublish} className={`flex-1 py-4 rounded-xl font-black text-white shadow-xl active:scale-95 disabled:opacity-50 transition-colors ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>
                        {isUploading ? `جاري الرفع... ${Math.round(uploadProgress)}%` : (editingId ? 'حفظ التغييرات 💾' : 'نشر الآن 🔥')}
                    </button>
                </div>
            </div>

            {/* Video Library Section */}
            <div>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                 <input type="text" placeholder="ابحث في المكتبة..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 bg-neutral-900 border border-white/5 rounded-xl p-4 text-sm outline-none focus:border-red-600" />
                 <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-neutral-900 border border-white/5 rounded-xl p-4 text-xs font-bold text-red-500 outline-none w-full md:w-auto">
                    <option value="الكل">كل الأقسام</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map(v => (
                    <div key={v.id} className={`bg-neutral-900/30 border border-white/5 p-4 rounded-[2rem] flex flex-col gap-4 ${v.is_trending ? 'border-red-600 shadow-[0_0_10px_red]' : ''} ${editingId === v.id ? 'border-blue-600/50 ring-2 ring-blue-600/20' : ''}`}>
                    <div className="aspect-video bg-black rounded-xl overflow-hidden relative group">
                        {/* Enhanced Video Player in Admin */}
                        <video 
                          src={v.video_url} 
                          className="w-full h-full object-cover" 
                          controls
                          preload="metadata"
                          crossOrigin="anonymous"
                          playsInline
                          onError={(e) => (e.currentTarget.style.display = 'none')} 
                        />
                        {v.is_trending && <div className="absolute top-2 right-2 bg-red-600 text-[8px] font-black px-2 py-0.5 rounded pointer-events-none">TREND</div>}
                        {v.read_narrative && <div className="absolute top-2 left-2 bg-green-600 text-[8px] font-black px-2 py-0.5 rounded shadow-[0_0_10px_green] pointer-events-none">TTS</div>}
                        {editingId === v.id && (
                            <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center backdrop-blur-sm">
                                <span className="font-bold text-white drop-shadow-md">قيد التعديل...</span>
                            </div>
                        )}
                    </div>
                    <h3 className="text-xs font-black text-white truncate px-1">{v.title}</h3>
                    <div className="flex gap-2">
                        <button onClick={() => handleEditClick(v)} className="flex-1 bg-blue-600/20 text-blue-500 py-2 rounded-lg text-[10px] font-black hover:bg-blue-600/40 transition-colors">
                            {editingId === v.id ? 'يتم التعديل' : 'تعديل'}
                        </button>
                        <button onClick={() => toggleTrending(v)} className="flex-1 bg-orange-600/20 text-orange-500 py-2 rounded-lg text-[10px] font-black hover:bg-orange-600/40 transition-colors">رائج</button>
                        <button onClick={() => requestDelete(v.id)} className="flex-1 bg-red-600/20 text-red-500 py-2 rounded-lg text-[10px] font-black hover:bg-red-600/40 transition-colors">حذف</button>
                    </div>
                    </div>
                ))}
              </div>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-[1200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border-2 border-red-600/50 w-full max-w-sm p-8 rounded-[2.5rem] text-center shadow-[0_0_50px_rgba(220,38,38,0.3)] animate-in zoom-in duration-200 relative overflow-hidden">
             
             <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
             </div>

             <h3 className="text-xl font-black text-white mb-2">تأكيد الحذف النهائي</h3>
             <p className="text-red-400 text-xs mb-8 font-bold">هل تريد حذف هذا الفيديو من السيرفر نهائياً؟<br/>لا يمكن التراجع عن هذا القرار.</p>

             <div className="flex flex-col gap-3">
               <button 
                 onClick={confirmDelete} 
                 disabled={isDeleting}
                 className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-black shadow-[0_0_20px_red] active:scale-95 transition-all"
               >
                 {isDeleting ? 'جاري الحذف...' : 'نعم، احذفه للأبد 💀'}
               </button>
               <button 
                 onClick={cancelDelete} 
                 disabled={isDeleting}
                 className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-xl font-bold border border-white/10 active:scale-95 transition-all"
               >
                 تراجع
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;