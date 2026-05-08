import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType, auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { LessonPlan, Curriculum, TechToolInfo } from '../types';
import { SYLLABUS, UNIT_TOPICS } from '../constants';
import { 
  Download, 
  ChevronRight, 
  BookOpen, 
  Clock, 
  ExternalLink,
  GraduationCap,
  ArrowRightLeft,
  Zap,
  Monitor,
  CheckCircle2,
  Target,
  Check,
  Globe,
  BarChart3,
  Accessibility,
  Trash2,
  Archive,
  Lock,
  Unlock,
  X,
  PenTool,
  Youtube,
  Plus,
  RotateCcw,
  Sparkles,
  Folder,
  ChevronDown,
} from 'lucide-react';
import { downloadLessonPDF } from '../services/pdfService';
import { motion, AnimatePresence } from 'motion/react';


interface PublishedPlan {
  id: string;
  curriculum: Curriculum;
  subject: string;
  year: string;
  unit: string;
  topic: string;
  topicDescription?: string;
  lessons: LessonPlan[];
  updatedAt: any;
  isArchived?: boolean;
}

function getYoutubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function getGoogleSlidesId(url: string) {
  const match = url.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function getLinkType(url: string) {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();
  if (url.includes('docs.google.com/presentation')) return 'google-slides';
  if (url.includes('notebooklm.google.com')) return 'notebooklm';
  if (url.includes('canva.com')) return 'canva';
  if (lowerUrl.endsWith('.pptx') || lowerUrl.endsWith('.ppt') || lowerUrl.includes('download')) return 'ppt-file';
  return 'generic';
}

function SlidePreviewCard({ url }: { url: string }) {
  const type = getLinkType(url);
  const slidesId = getGoogleSlidesId(url);

  if (type === 'notebooklm') {
    return (
      <div className="space-y-3">
        <div className="w-full rounded-2xl p-8 bg-gradient-to-br from-slate-900 to-slate-800 border-4 border-white shadow-2xl relative overflow-hidden group">
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Sparkles className="text-blue-400" size={32} />
            </div>
            <h4 className="text-white font-bold text-lg mb-2">NotebookLM Interactive Guide</h4>
            <p className="text-slate-400 text-xs max-w-xs mb-6">Access AI-powered summaries, transcripts, and interactive study materials for this topic.</p>
            <a 
              href={url} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95"
            >
              <ExternalLink size={16} /> Open NotebookLM
            </a>
          </div>
          <div className="absolute top-0 right-0 p-4">
             <span className="text-[8px] font-black tracking-widest text-white/20 uppercase">Google AI Studio</span>
          </div>
          <Sparkles className="absolute -left-10 -bottom-10 text-white/5 w-40 h-40" />
        </div>
      </div>
    );
  }

  if (type === 'google-slides' && slidesId) {
    return (
      <div className="space-y-3">
        <div className="aspect-video w-full rounded-2xl overflow-hidden border-4 border-white shadow-2xl bg-slate-900 group/slides relative">
          <iframe 
            src={`https://docs.google.com/presentation/d/${slidesId}/embed?start=false&loop=false&delayms=3000`}
            frameBorder="0" 
            width="100%" 
            height="100%" 
            allowFullScreen={true}
            className="w-full h-full"
          />
        </div>
        <a 
          href={url} 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
        >
          <ExternalLink size={16} />
          Open Full Presentation
        </a>
      </div>
    );
  }

  const getIcon = () => {
    if (type === 'canva') return <PenTool size={32} className="text-blue-600" />;
    if (type === 'ppt-file') return <Monitor size={32} className="text-orange-600" />;
    return <Monitor size={32} className="text-blue-600" />;
  };

  const getLabel = () => {
    if (type === 'canva') return 'Canva Presentation';
    if (type === 'ppt-file') return 'PowerPoint Document';
    return 'External Slide Deck';
  };

  const getActionLabel = () => {
    if (type === 'ppt-file') return 'Download Slide Deck';
    return 'Launch Presentation';
  };

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noreferrer" 
      className={`block p-10 rounded-2xl border-4 border-white shadow-xl transition-all text-center group mt-4 relative overflow-hidden active:scale-[0.98] ${
        type === 'ppt-file' 
          ? 'bg-orange-50/80 hover:bg-orange-100/80' 
          : 'bg-blue-50/80 hover:bg-blue-100/80'
      }`}
    >
      <div className={`w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-sm group-hover:scale-110 transition-transform relative z-10 ${type === 'ppt-file' ? 'text-orange-600' : ''}`}>
        {getIcon()}
      </div>
      <p className={`text-lg font-black mb-1 relative z-10 ${type === 'ppt-file' ? 'text-orange-950' : 'text-blue-900'}`}>{getLabel()}</p>
      <div className="flex items-center justify-center gap-2 relative z-10">
        <p className={`text-xs font-bold uppercase tracking-wider ${type === 'ppt-file' ? 'text-orange-500' : 'text-blue-500'}`}>
          {getActionLabel()}
        </p>
        <ExternalLink size={14} className={type === 'ppt-file' ? 'text-orange-400' : 'text-blue-400'} />
      </div>
    </a>
  );
}

function getFakeDisplayDate(planId: string, timestamp: any) {
  if (!timestamp) return 'Recently';
  
  const date = timestamp.toDate?.() || new Date(timestamp);
  
  // If it's already from 2025 or earlier, just return it
  if (date.getFullYear() < 2026) return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // Generate a consistent but "fake" historical date based on the Plan ID
  // We want Oct, Nov, or Dec 2025
  const hash = planId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Months: 9 (Oct), 10 (Nov), 11 (Dec)
  const month = 9 + (hash % 3); 
  const day = 1 + (hash % 28);
  
  const fakeDate = new Date(2025, month, day);
  return fakeDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StudentDashboard() {
  const [publishedPlans, setPublishedPlans] = useState<PublishedPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PublishedPlan | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('teacher_auth') === 'true');
  const [showPassModal, setShowPassModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [curriculumFilter, setCurriculumFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [topicFilter, setTopicFilter] = useState<string>('');
  const [isTopicCardExpanded, setIsTopicCardExpanded] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'lessonPlans'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const plans = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PublishedPlan[];
      
      setPublishedPlans(plans);
      
      // Update selected plan if it exists
      setSelectedPlan(prev => {
        if (!prev) return null;
        const updated = plans.find(p => p.id === prev.id);
        return updated || null;
      });
      
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'lessonPlans');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      setIsAdmin(localStorage.getItem('teacher_auth') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleToggleAdmin = () => {
    if (isAdmin) {
      setIsAdmin(false);
      setShowArchived(false);
      localStorage.removeItem('teacher_auth');
    } else {
      setShowPassModal(true);
      setPassError(false);
      setPassword('');
    }
  };

  const verifyPassword = () => {
    const trimmedInput = password.trim().toLowerCase();
    if (trimmedInput === 'teacher123' || trimmedInput === 'skmmypbioresources@gmail.com') {
      setIsAdmin(true);
      setShowPassModal(false);
      localStorage.setItem('teacher_auth', 'true');
    } else {
      setPassError(true);
    }
  };

  const handleArchive = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!id) return;

    if (!window.confirm('Archive this lesson?')) return;

    try {
      const docRef = doc(db, 'lessonPlans', id);
      await updateDoc(docRef, { 
        isArchived: true,
        updatedAt: serverTimestamp()
      });
      if (selectedPlan?.id === id) setSelectedPlan(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `lessonPlans/${id}`);
    }
  };

  const handleUnarchive = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const docRef = doc(db, 'lessonPlans', id);
      await updateDoc(docRef, { 
        isArchived: false,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error(error);
    }
  };

  const updatePublishedPlan = async (lessonIndex: number, updatedFields: Partial<LessonPlan>) => {
    if (!selectedPlan || !isAdmin) return;
    
    setIsUpdating(true);
    try {
      const updatedLessons = [...selectedPlan.lessons];
      updatedLessons[lessonIndex] = { ...updatedLessons[lessonIndex], ...updatedFields };
      
      const docRef = doc(db, 'lessonPlans', selectedPlan.id);
      await updateDoc(docRef, {
        lessons: updatedLessons,
        updatedAt: serverTimestamp()
      });
      
      setSelectedPlan({ ...selectedPlan, lessons: updatedLessons });
    } catch (error: any) {
      console.error("Update failed:", error);
      alert("Failed to save changes: " + (error.message || 'Unknown error'));
      handleFirestoreError(error, OperationType.WRITE, `lessonPlans/${selectedPlan.id}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredPlans = publishedPlans.filter(p => !!p.isArchived === showArchived);

  // Auto-select filters from plans if none selected
  useEffect(() => {
    if (!loading && filteredPlans.length > 0) {
      setCurriculumFilter(prev => prev || (filteredPlans[0].curriculum as string));
      setYearFilter(prev => prev || filteredPlans[0].year);
      setSubjectFilter(prev => prev || filteredPlans[0].subject);
      setTopicFilter(prev => prev || filteredPlans[0].topic);
      
      // Auto-select the first plan if none selected
      if (!selectedPlan) {
        setSelectedPlan(filteredPlans[0]);
      }
    }
  }, [loading, filteredPlans.length, showArchived]);

  // Sync selected plan with updates from firestore
  useEffect(() => {
    if (selectedPlan) {
      const updated = publishedPlans.find(p => p.id === selectedPlan.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedPlan)) {
        setSelectedPlan(updated);
      }
    }
  }, [publishedPlans, selectedPlan?.id]);

  // Get available options for filters
  const availableCurricula = Array.from(new Set(publishedPlans.filter(p => !!p.isArchived === showArchived).map(p => p.curriculum as string))).sort();
  
  const syllabusYears = curriculumFilter ? (SYLLABUS[curriculumFilter as Curriculum]?.years || []) : [];
  const dbYears = publishedPlans.filter(p => !!p.isArchived === showArchived && p.curriculum === curriculumFilter).map(p => p.year);
  const availableYears = Array.from(new Set([...syllabusYears, ...dbYears])).filter(Boolean).sort();

  const syllabusSubjects = (curriculumFilter && SYLLABUS[curriculumFilter as Curriculum])
    ? (Array.isArray(SYLLABUS[curriculumFilter as Curriculum].subjects) 
        ? SYLLABUS[curriculumFilter as Curriculum].subjects as string[]
        : (SYLLABUS[curriculumFilter as Curriculum].subjects as Record<string, string[]>)[yearFilter] || [])
    : [];
  const dbSubjects = publishedPlans.filter(p => !!p.isArchived === showArchived && p.curriculum === curriculumFilter && p.year === yearFilter).map(p => p.subject);
  const availableSubjects = Array.from(new Set([...syllabusSubjects, ...dbSubjects])).filter(Boolean).sort();

  const syllabusUnits = (curriculumFilter && subjectFilter && SYLLABUS[curriculumFilter as Curriculum]) 
    ? (SYLLABUS[curriculumFilter as Curriculum].units[subjectFilter] || [])
    : [];
  const allSyllabusTopics = syllabusUnits.flatMap(unit => [unit, ...(UNIT_TOPICS[unit] || [])]);
  const dbTopics = publishedPlans.filter(p => !!p.isArchived === showArchived && p.curriculum === curriculumFilter && p.year === yearFilter && p.subject === subjectFilter).map(p => p.topic);
  const availableTopics = Array.from(new Set([...allSyllabusTopics, ...dbTopics])).filter(Boolean).sort();

  const handleLogout = () => {
    if (isAdmin) {
      localStorage.removeItem('teacher_auth');
      setIsAdmin(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-blue-900 selection:bg-blue-100">
      <header className="bg-white border-b border-blue-100 h-16 flex items-center px-8 sticky top-0 z-20 shadow-sm">
        <h1 className="font-serif text-2xl text-blue-600 tracking-tight flex items-center gap-2">
          EduPlan <span className="text-blue-300">Hub</span>
        </h1>
        <div className="ml-auto flex items-center gap-4">
          {isAdmin && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-200 text-[10px] font-bold animate-pulse">
              <Sparkles size={12} />
              EDIT MODE ACTIVE
            </div>
          )}
          <button 
            onClick={handleToggleAdmin}
            className={`p-2.5 rounded-full transition-all flex items-center justify-center ${isAdmin ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-100' : 'bg-slate-100 text-slate-400 hover:text-blue-400 hover:bg-white border border-transparent hover:border-blue-100'}`}
            title={isAdmin ? "Disable Admin Mode" : "Enable Admin Mode"}
          >
            {isAdmin ? <Unlock size={20} /> : <Lock size={20} />}
          </button>
          <Link 
            to="/teacher" 
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full border border-blue-100 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm"
          >
            <ArrowRightLeft size={14} />
            Teacher Portal
          </Link>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
            <GraduationCap size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Student View</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Modal for password */}
        <AnimatePresence>
          {showPassModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-blue-100"
              >
                <div className="flex justify-between items-center mb-6">
                   <h3 className="font-serif text-xl text-blue-900">Staff Verification</h3>
                   <button onClick={() => setShowPassModal(false)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                     <X size={20} />
                   </button>
                </div>
                <p className="text-sm text-blue-500 mb-6 italic">Enter teacher password or your staff email to enable administrative controls.</p>
                <div className="space-y-4">
                  <input 
                    type="text"
                    autoFocus
                    placeholder="Password or Email"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                    className="w-full bg-slate-50 border border-blue-100 rounded-xl px-4 py-3 text-blue-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {passError && <p className="text-xs text-red-500 font-bold text-center">Unauthorized access attempt.</p>}
                  <button 
                    onClick={verifyPassword}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                  >
                    Confirm Access
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left List - Sticky Container */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 lg:h-fit space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
                  <BookOpen size={18} /> Lesson Materials
                </h2>
                <p className="text-[10px] text-blue-500/70 italic">
                  Explore curriculum-aligned resources and session notes.
                </p>
              </div>
              
              {isAdmin && (
                <div className="flex p-1 bg-blue-50/50 rounded-xl border border-blue-100 self-start">
                  <button 
                    onClick={() => {
                      setShowArchived(false);
                      setSelectedPlan(null);
                    }}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-all ${
                      !showArchived 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-blue-400 hover:text-blue-600'
                    }`}
                  >
                    ACTIVE HUB
                  </button>
                  <button 
                    onClick={() => {
                      setShowArchived(true);
                      setSelectedPlan(null);
                    }}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-all ${
                      showArchived 
                      ? 'bg-amber-500 text-white shadow-sm' 
                      : 'text-amber-400 hover:text-amber-600'
                    }`}
                  >
                    ARCHIVE
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-200 animate-pulse rounded-2xl" />)
            ) : publishedPlans.filter(p => !!p.isArchived === showArchived).length === 0 ? (
              <div className="text-center py-12 bg-white border border-dashed border-slate-300 rounded-3xl">
                <p className="text-slate-400 text-sm">No {showArchived ? 'archived' : 'published'} lessons found.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Visual Selectors - Now Dropdowns */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest pl-2">1. Select Curriculum</label>
                    <div className="relative group">
                      <select 
                        value={curriculumFilter}
                        onChange={(e) => {
                          setCurriculumFilter(e.target.value);
                          setYearFilter('');
                          setSubjectFilter('');
                          setTopicFilter('');
                        }}
                        className="w-full appearance-none bg-white border border-blue-100 text-blue-900 rounded-2xl px-4 py-3.5 text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all cursor-pointer"
                      >
                        <option value="">Choose Curriculum...</option>
                        {availableCurricula.map(curr => (
                          <option key={curr} value={curr}>{curr}</option>
                        ))}
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none group-hover:text-blue-500 transition-colors" />
                    </div>
                  </div>

                  {curriculumFilter && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest pl-2">2. Academic Year</label>
                      <div className="relative group">
                        <select 
                          value={yearFilter}
                          onChange={(e) => {
                            setYearFilter(e.target.value);
                            setSubjectFilter('');
                            setTopicFilter('');
                          }}
                          className="w-full appearance-none bg-white border border-blue-100 text-blue-900 rounded-2xl px-4 py-3.5 text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all cursor-pointer"
                        >
                          <option value="">Choose Year...</option>
                          {availableYears.map(yr => (
                            <option key={yr} value={yr}>{yr}</option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  )}

                  {yearFilter && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest pl-2">3. Subject Area</label>
                      <div className="relative group">
                        <select 
                          value={subjectFilter}
                          onChange={(e) => {
                            setSubjectFilter(e.target.value);
                            setTopicFilter('');
                          }}
                          className="w-full appearance-none bg-white border border-blue-100 text-blue-900 rounded-2xl px-4 py-3.5 text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all cursor-pointer"
                        >
                          <option value="">Choose Subject...</option>
                          {availableSubjects.map(subj => (
                            <option key={subj} value={subj}>{subj}</option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  )}

                  {subjectFilter && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest pl-2">4. Learning Topic</label>
                      <div className="relative group">
                        <select 
                          value={topicFilter}
                          onChange={(e) => setTopicFilter(e.target.value)}
                          className="w-full appearance-none bg-white border border-blue-100 text-blue-900 rounded-2xl px-4 py-3.5 text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all cursor-pointer"
                        >
                          <option value="">Choose Topic...</option>
                          {availableTopics.map(topic => (
                            <option key={topic} value={topic}>{topic}</option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-px bg-blue-100 my-2" />

                {/* Focused Topic List */}
                <div className="space-y-3">
                  {curriculumFilter && yearFilter && subjectFilter && topicFilter ? (
                    (() => {
                      const plansForTopic = publishedPlans.filter(p => 
                        !!p.isArchived === showArchived && 
                        p.curriculum === curriculumFilter && 
                        p.year === yearFilter &&
                        p.subject === subjectFilter && 
                        p.topic === topicFilter
                      );

                      if (plansForTopic.length === 0) {
                        return (
                          <div className="p-8 text-center bg-white border border-dashed border-blue-100 rounded-2xl">
                             <p className="text-xs text-blue-300 italic">No resources found for this topic.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="bg-white border border-blue-300 ring-4 ring-blue-50 rounded-3xl shadow-lg overflow-hidden animate-in zoom-in-95 duration-300">
                          <div 
                            onClick={() => setIsTopicCardExpanded(!isTopicCardExpanded)}
                            className="p-5 bg-blue-600 text-white flex items-center justify-between cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                                <Folder size={18} />
                              </div>
                              <div>
                                <h3 className="font-bold text-sm tracking-tight">{topicFilter}</h3>
                                <p className="text-[10px] text-blue-100 font-medium">{plansForTopic.length} Session Notes</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <div className="flex items-center gap-2 mr-2">
                                  <button 
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (showArchived) {
                                        if (window.confirm(`Restore all ${plansForTopic.length} plans in "${topicFilter}"?`)) {
                                          const { updateDoc, doc: firestoreDoc, serverTimestamp } = await import('firebase/firestore');
                                          const promises = plansForTopic.map(p => updateDoc(firestoreDoc(db, 'lessonPlans', p.id), { isArchived: false, updatedAt: serverTimestamp() }));
                                          await Promise.all(promises);
                                          setTopicFilter('');
                                        }
                                      } else {
                                        if (window.confirm(`Archive all ${plansForTopic.length} plans in "${topicFilter}"?`)) {
                                          const { updateDoc, doc: firestoreDoc, serverTimestamp } = await import('firebase/firestore');
                                          const promises = plansForTopic.map(p => updateDoc(firestoreDoc(db, 'lessonPlans', p.id), { isArchived: true, updatedAt: serverTimestamp() }));
                                          await Promise.all(promises);
                                          setTopicFilter('');
                                        }
                                      }
                                    }}
                                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                    title={showArchived ? "Restore All" : "Archive All"}
                                  >
                                    {showArchived ? <RotateCcw size={12} /> : <Archive size={12} />}
                                  </button>
                                  <button 
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (window.confirm(`DELETE all in "${topicFilter}"?`)) {
                                        const { deleteDoc, doc: firestoreDoc } = await import('firebase/firestore');
                                        const promises = plansForTopic.map(p => deleteDoc(firestoreDoc(db, 'lessonPlans', p.id)));
                                        await Promise.all(promises);
                                        setTopicFilter('');
                                      }
                                    }}
                                    className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                              <ChevronDown size={18} className={`transition-transform duration-300 ${isTopicCardExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                          
                          <AnimatePresence>
                            {isTopicCardExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="p-3 bg-slate-50/50 flex flex-col gap-2">
                                   {plansForTopic.map((plan: PublishedPlan) => (
                                     <button
                                       key={plan.id}
                                       onClick={() => setSelectedPlan(plan)}
                                       className={`w-full text-left p-4 transition-all rounded-2xl border flex items-center justify-between ${
                                         selectedPlan?.id === plan.id 
                                         ? 'bg-blue-600 border-blue-500 shadow-md text-white scale-[1.02]' 
                                         : 'bg-white border-blue-50 hover:border-blue-200 text-blue-700 hover:shadow-sm'
                                       }`}
                                     >
                                       <div className="flex-1 min-w-0">
                                         <div className="flex items-center gap-2 mb-1">
                                           <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${selectedPlan?.id === plan.id ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                                             {plan.year}
                                           </span>
                                           <p className={`text-xs font-black truncate ${selectedPlan?.id === plan.id ? 'text-white' : 'text-blue-900 uppercase tracking-tight'}`}>
                                             Session Resources
                                           </p>
                                         </div>
                                         <p className={`text-[10px] italic truncate ${selectedPlan?.id === plan.id ? 'text-blue-100' : 'text-blue-400'}`}>
                                           {getFakeDisplayDate(plan.id, plan.updatedAt)}
                                         </p>
                                       </div>
                                       <ChevronRight size={14} className={selectedPlan?.id === plan.id ? 'text-white' : 'text-blue-200'} />
                                     </button>
                                   ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="p-10 text-center bg-white border border-dashed border-blue-100 rounded-[2rem] animate-pulse">
                      <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Folder size={20} className="text-blue-200" />
                      </div>
                      <p className="text-xs text-blue-300 font-bold uppercase tracking-widest">Awaiting Selection</p>
                      <p className="text-[10px] text-blue-200 italic mt-1">Select curriculum, subject, and topic to view notes.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Content */}
        <main className="lg:col-span-8 min-h-[70vh]">
          <AnimatePresence mode="wait">
            {selectedPlan ? (
              <motion.div
                key={selectedPlan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="bg-blue-600 rounded-[2.5rem] p-10 shadow-2xl text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-3">
                      {selectedPlan.subject} — {selectedPlan.year}
                    </h2>
                     <h1 className="font-serif text-5xl mb-6 tracking-tight leading-tight">{selectedPlan.topic}</h1>
                     {selectedPlan.topicDescription && (
                       <p className="text-blue-100 text-sm max-w-2xl mb-8 leading-relaxed font-medium italic opacity-90">
                         "{selectedPlan.topicDescription}"
                       </p>
                     )}
                     <div className="flex gap-6">
                      {selectedPlan.lessons.map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                          <div className="w-10 h-1.5 bg-white/30 rounded-full overflow-hidden">
                            <div className="w-full h-full bg-white shadow-sm" />
                          </div>
                          <span className="text-[10px] font-bold tracking-widest">SESSION {i + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <GraduationCap size={180} className="absolute -right-12 -bottom-12 opacity-10 rotate-12" />
                </div>

                <div className="space-y-12 pb-20">
                  {isUpdating && (
                    <div className="fixed bottom-10 right-10 z-[100] bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 animate-bounce">
                      <RotateCcw size={18} className="animate-spin" />
                      Syncing Changes...
                    </div>
                  )}
                  {selectedPlan.lessons.map((lesson, idx) => (
                    <section key={idx} id={`lesson-content-${idx}`} className="bg-white border border-blue-100 rounded-3xl overflow-hidden shadow-sm hover:border-blue-200 transition-colors">
                      <div className="p-6 border-b border-blue-50 flex items-center justify-between bg-blue-50/10">
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                            {idx + 1}
                          </span>
                          <div>
                            <h3 className="font-bold text-lg text-blue-900 leading-tight">{lesson.topic}</h3>
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 mt-0.5">
                              <Clock size={10} /> {lesson.duration} MINS
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => downloadLessonPDF(`lesson-content-${idx}`, lesson.topic)}
                          className="pdf-hide flex items-center gap-2 px-4 py-2 bg-white border border-blue-100 rounded-full text-xs font-bold text-blue-500 hover:text-blue-700 hover:border-blue-300 transition-all shadow-sm"
                        >
                          <Download size={14} /> PDF
                        </button>
                      </div>
                      
                      <div className="p-8 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <LessonSection title="Learning Objectives" icon={<Target size={18} />} color="blue">
                            <ul className="space-y-4">
                              {lesson.learningObjectives.map((obj, i) => (
                                <li key={i} className="text-base flex gap-3 text-blue-800 leading-relaxed">
                                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0 shadow-sm" />
                                  {isAdmin ? (
                                    <textarea 
                                      value={obj}
                                      rows={1}
                                      onChange={(e) => {
                                        const newObjs = [...lesson.learningObjectives];
                                        newObjs[i] = e.target.value;
                                        updatePublishedPlan(idx, { learningObjectives: newObjs });
                                      }}
                                      onInput={(e: any) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                      }}
                                      className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 resize-none overflow-hidden"
                                    />
                                  ) : obj}
                                </li>
                              ))}
                            </ul>
                          </LessonSection>
                          <LessonSection title="Success Criteria" icon={<CheckCircle2 size={18} />} color="green">
                            <ul className="space-y-4">
                              {lesson.learningOutcomes.map((out, i) => (
                                <li key={i} className="text-base flex gap-3 text-blue-800 leading-relaxed">
                                  <Check size={18} className="text-green-500 shrink-0 mt-1" />
                                  {isAdmin ? (
                                    <textarea 
                                      value={out}
                                      rows={1}
                                      onChange={(e) => {
                                        const newOuts = [...lesson.learningOutcomes];
                                        newOuts[i] = e.target.value;
                                        updatePublishedPlan(idx, { learningOutcomes: newOuts });
                                      }}
                                      onInput={(e: any) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                      }}
                                      className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 resize-none overflow-hidden"
                                    />
                                  ) : out}
                                </li>
                              ))}
                            </ul>
                          </LessonSection>
                        </div>

                        <LessonSection title="Hook / Starter" icon={<Zap size={18} />} color="amber">
                          <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm relative overflow-hidden group">
                            <div className="relative z-10">
                              {isAdmin ? (
                                <textarea 
                                  value={lesson.starter}
                                  onChange={(e) => updatePublishedPlan(idx, { starter: e.target.value })}
                                  rows={3}
                                  className="w-full text-base text-amber-900 bg-transparent border-none outline-none focus:ring-0 font-medium p-0 resize-none"
                                />
                              ) : (
                                <p className="text-base text-amber-900 leading-relaxed font-medium capitalize">&ldquo;{lesson.starter}&rdquo;</p>
                              )}
                              <p className="text-xs text-amber-600 mt-4 italic">Note: The entire lesson builds upon this initial hook to maintain student engagement.</p>
                            </div>
                            <Zap size={120} className="absolute -right-8 -bottom-8 opacity-5 -rotate-12 group-hover:scale-110 transition-transform duration-500" />
                          </div>
                        </LessonSection>

                        <LessonSection title="Notes for Student Notebooks (Copy these)" icon={<PenTool size={18} />} color="teal">
                          <div className="p-6 bg-teal-50/30 rounded-2xl border border-teal-100 shadow-sm">
                            <div className="space-y-4">
                              {lesson.studentNotes?.map((note, i) => (
                                <div key={i} className="flex gap-4 items-start group">
                                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-500 text-white text-xs font-bold shrink-0 mt-0.5 shadow-sm">{i + 1}</span>
                                  {isAdmin ? (
                                    <textarea 
                                      value={note}
                                      onChange={(e) => {
                                        const newNotes = [...(lesson.studentNotes || [])];
                                        newNotes[i] = e.target.value;
                                        updatePublishedPlan(idx, { studentNotes: newNotes });
                                      }}
                                      rows={2}
                                      onInput={(e: any) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                      }}
                                      className="w-full text-sm text-teal-900 leading-relaxed bg-transparent border-none outline-none focus:ring-0 resize-none p-0 group-hover:bg-white/50 rounded transition-colors overflow-hidden"
                                    />
                                  ) : (
                                    <p className="text-sm font-medium text-teal-900 leading-relaxed py-1">{note}</p>
                                  )}
                                </div>
                              )) || <p className="text-xs text-teal-400 italic">No notes available for this lesson.</p>}
                            </div>
                          </div>
                        </LessonSection>

                        {(selectedPlan.curriculum === Curriculum.IBMYP || (lesson.ATLSkills?.length ?? 0) > 0) && (
                          <LessonSection title="Approaches to Learning (ATL) Skills" icon={<Target size={18} />} color="blue">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {lesson.ATLSkills?.map((skill, i) => (
                                <div key={i} className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex gap-3 items-center group">
                                  <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                                  {isAdmin ? (
                                    <textarea 
                                      value={skill}
                                      onChange={(e) => {
                                        const newSkills = [...(lesson.ATLSkills || [])];
                                        newSkills[i] = e.target.value;
                                        updatePublishedPlan(idx, { ATLSkills: newSkills });
                                      }}
                                      rows={1}
                                      onInput={(e: any) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                      }}
                                      className="w-full text-sm text-blue-900 bg-transparent border-none outline-none focus:ring-0 resize-none p-0 overflow-hidden"
                                    />
                                  ) : (
                                    <p className="text-sm font-medium text-blue-900">{skill}</p>
                                  )}
                                  {isAdmin && (
                                    <button 
                                      onClick={() => {
                                        const newSkills = lesson.ATLSkills?.filter((_, idx) => idx !== i);
                                        updatePublishedPlan(idx, { ATLSkills: newSkills });
                                      }}
                                      className="text-blue-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {isAdmin && (
                                <button 
                                  onClick={() => {
                                    const newSkills = [...(lesson.ATLSkills || []), 'New ATL Skill'];
                                    updatePublishedPlan(idx, { ATLSkills: newSkills });
                                  }}
                                  className="p-4 border-2 border-dashed border-blue-100 rounded-xl text-blue-300 hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2 text-xs font-bold"
                                >
                                  <Plus size={14} /> Add ATL Skill
                                </button>
                              )}
                            </div>
                          </LessonSection>
                        )}

                        <LessonSection title="Conceptual Focus" icon={<Globe size={18} />} color="purple">
                          {isAdmin ? (
                            <textarea 
                              value={lesson.conceptualFocus}
                              onChange={(e) => updatePublishedPlan(idx, { conceptualFocus: e.target.value })}
                              onInput={(e: any) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                              }}
                              rows={2}
                              className="w-full text-base italic text-purple-600 bg-purple-50 p-4 rounded-xl border border-purple-100 outline-none focus:border-purple-300 resize-none overflow-hidden"
                            />
                          ) : (
                            <p className="text-base italic text-purple-600 bg-purple-50 p-4 rounded-xl border border-purple-100 font-medium">
                              &ldquo;{lesson.conceptualFocus}&rdquo;
                            </p>
                          )}
                        </LessonSection>

                          <LessonSection title="Differentiation (Personalized Learning)" icon={<BarChart3 size={18} />} color="amber">
                            {lesson.differentiationCAT4 ? (
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 gap-3">
                                  <Stat 
                                    label="Verbal" 
                                    value={lesson.differentiationCAT4.verbal} 
                                    onChange={isAdmin ? (val) => updatePublishedPlan(idx, { differentiationCAT4: { ...lesson.differentiationCAT4!, verbal: val }}) : undefined}
                                  />
                                  <Stat 
                                    label="Quant" 
                                    value={lesson.differentiationCAT4.quantitative} 
                                    onChange={isAdmin ? (val) => updatePublishedPlan(idx, { differentiationCAT4: { ...lesson.differentiationCAT4!, quantitative: val }}) : undefined}
                                  />
                                  <Stat 
                                    label="Non-Verbal" 
                                    value={lesson.differentiationCAT4.nonVerbal} 
                                    onChange={isAdmin ? (val) => updatePublishedPlan(idx, { differentiationCAT4: { ...lesson.differentiationCAT4!, nonVerbal: val }}) : undefined}
                                  />
                                  <Stat 
                                    label="Spatial" 
                                    value={lesson.differentiationCAT4.spatial} 
                                    onChange={isAdmin ? (val) => updatePublishedPlan(idx, { differentiationCAT4: { ...lesson.differentiationCAT4!, spatial: val }}) : undefined}
                                  />
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                  <DetailBox 
                                    label="Tiered Tasks" 
                                    value={lesson.differentiationCAT4.tieredTasks} 
                                    onChange={isAdmin ? (val) => updatePublishedPlan(idx, { differentiationCAT4: { ...lesson.differentiationCAT4!, tieredTasks: val }}) : undefined}
                                  />
                                  <DetailBox 
                                    label="Choice Board" 
                                    value={lesson.differentiationCAT4.choiceBoard} 
                                    onChange={isAdmin ? (val) => updatePublishedPlan(idx, { differentiationCAT4: { ...lesson.differentiationCAT4!, choiceBoard: val }}) : undefined}
                                  />
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-blue-300 italic">No differentiation strategies provided.</p>
                            )}
                          </LessonSection>

                        {selectedPlan.curriculum === Curriculum.IBMYP && (
                          <div className="space-y-8">
                            {lesson.soiAndEnquiry && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <DetailBox label="Statement of Inquiry" value={lesson.soiAndEnquiry.soi} onChange={isAdmin ? (val) => updatePublishedPlan(idx, { soiAndEnquiry: { ...lesson.soiAndEnquiry!, soi: val }}) : undefined} />
                                <DetailBox label="Global Context" value={lesson.soiAndEnquiry.globalContext} onChange={isAdmin ? (val) => updatePublishedPlan(idx, { soiAndEnquiry: { ...lesson.soiAndEnquiry!, globalContext: val }}) : undefined} />
                                <DetailBox label="Key Question" value={lesson.soiAndEnquiry.keyQuestion} onChange={isAdmin ? (val) => updatePublishedPlan(idx, { soiAndEnquiry: { ...lesson.soiAndEnquiry!, keyQuestion: val }}) : undefined} />
                                <DetailBox label="Related Concepts" value={lesson.soiAndEnquiry.relatedConcepts} onChange={isAdmin ? (val) => updatePublishedPlan(idx, { soiAndEnquiry: { ...lesson.soiAndEnquiry!, relatedConcepts: val }}) : undefined} />
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <LessonSection title="Support" icon={<Accessibility size={18} />} color="blue">
                             {isAdmin ? (
                                <textarea 
                                  value={lesson.senSupport}
                                  onChange={(e) => updatePublishedPlan(idx, { senSupport: e.target.value })}
                                  rows={4}
                                  className="w-full text-sm text-blue-700 bg-transparent border-none outline-none focus:ring-0 p-0 resize-none"
                                />
                              ) : (
                                <p className="text-sm text-blue-700 leading-relaxed font-bold">{lesson.homeAssignment}</p>
                              )}
                          </LessonSection>
                          <LessonSection title="Reflection / Exit" icon={<X size={18} />} color="red">
                             {isAdmin ? (
                                <textarea 
                                  value={lesson.exitSlip}
                                  onChange={(e) => updatePublishedPlan(idx, { exitSlip: e.target.value })}
                                  rows={4}
                                  className="w-full text-sm text-blue-700 bg-transparent border-none outline-none focus:ring-0 p-0 resize-none"
                                />
                              ) : (
                                <p className="text-sm text-blue-700 leading-relaxed">{lesson.exitSlip}</p>
                              )}
                          </LessonSection>
                          <LessonSection title="Home Assignment" icon={<PenTool size={18} />} color="teal">
                             {isAdmin ? (
                                <textarea 
                                  value={lesson.homeAssignment}
                                  onChange={(e) => updatePublishedPlan(idx, { homeAssignment: e.target.value })}
                                  rows={4}
                                  className="w-full text-sm text-blue-700 bg-transparent border-none outline-none focus:ring-0 p-0 resize-none"
                                />
                              ) : (
                                <p className="text-sm text-blue-700 leading-relaxed font-bold">{lesson.homeAssignment}</p>
                              )}
                          </LessonSection>
                        </div>

                          <LessonSection title="AI-Assisted Learner Task - Exit Slip" icon={<Sparkles size={18} className="text-yellow-500" />} color="yellow">
                            <div className="p-5 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl shadow-sm relative overflow-hidden group">
                                 <div className="relative z-10 space-y-4">
                                   {isAdmin ? (
                                     <textarea 
                                       value={lesson.aiAssistedTask}
                                       onChange={(e) => updatePublishedPlan(idx, { aiAssistedTask: e.target.value })}
                                       onInput={(e: any) => {
                                         e.target.style.height = 'auto';
                                         e.target.style.height = e.target.scrollHeight + 'px';
                                       }}
                                       rows={3}
                                       className="w-full text-sm font-medium text-amber-900 border-none outline-none focus:ring-0 resize-none p-0 bg-transparent placeholder:text-amber-200 overflow-hidden"
                                       placeholder="Describe the AI-assisted learning task..."
                                     />
                                   ) : (
                                     <p className="text-sm font-medium text-amber-900 leading-relaxed whitespace-pre-wrap">{lesson.aiAssistedTask}</p>
                                   )}
                                   <div className="flex items-center gap-4 border-t border-yellow-100 pt-3">
                                     <div className="flex items-center gap-2 px-2 py-1 bg-yellow-400 text-white rounded-lg text-[9px] font-black tracking-widest shadow-md">
                                       <Zap size={10} /> AI TASK
                                     </div>
                                   </div>
                                 </div>
                            </div>
                          </LessonSection>

                          <LessonSection title="Resources & Media" icon={<Youtube size={18} />} color="red">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {lesson.youtubeLinks.map((link, i) => {
                                const ytId = getYoutubeId(link.url);
                                return (
                                  <div key={i} className="relative group/yt">
                                    {isAdmin ? (
                                      <div className="flex flex-col gap-4 p-5 bg-white border border-blue-100 rounded-2xl shadow-sm">
                                        {ytId && (
                                          <div className="w-full h-56 rounded-2xl overflow-hidden shrink-0 bg-blue-50 border border-blue-100 shadow-inner group-hover/yt:brightness-110 transition-all">
                                            <img 
                                              src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} 
                                              alt="Thumbnail" 
                                              className="w-full h-full object-cover"
                                              referrerPolicy="no-referrer"
                                            />
                                          </div>
                                        )}
                                        <div className="min-w-0 flex-1 space-y-3">
                                          <div className="space-y-1">
                                            <input 
                                              placeholder="Video Title"
                                              value={link.title}
                                              onChange={(e) => {
                                                const newLinks = [...lesson.youtubeLinks];
                                                newLinks[i] = { ...link, title: e.target.value };
                                                updatePublishedPlan(idx, { youtubeLinks: newLinks });
                                              }}
                                              className="w-full text-sm font-black text-blue-900 border-b border-dashed border-blue-100 outline-none pb-0.5 focus:border-blue-500 bg-transparent"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <input 
                                              placeholder="YouTube URL"
                                              value={link.url}
                                              onChange={(e) => {
                                                const newLinks = [...lesson.youtubeLinks];
                                                newLinks[i] = { ...link, url: e.target.value };
                                                updatePublishedPlan(idx, { youtubeLinks: newLinks });
                                              }}
                                              className="w-full text-[10px] text-blue-400 border-b border-dashed border-blue-100 outline-none focus:border-blue-500 bg-transparent"
                                            />
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                          <a href={link.url} target="_blank" rel="noreferrer" className="flex-1 py-1.5 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors">
                                            <ExternalLink size={12} /> Launch
                                          </a>
                                          <button 
                                            onClick={() => {
                                              const newLinks = lesson.youtubeLinks.filter((_, idx2) => idx2 !== i);
                                              updatePublishedPlan(idx, { youtubeLinks: newLinks });
                                            }}
                                            className="px-2 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <a href={link.url} target="_blank" rel="noreferrer" className="flex flex-col gap-6 p-6 bg-white border border-blue-100 rounded-[2.5rem] hover:border-blue-600 hover:shadow-xl transition-all shadow-sm group/card">
                                        {ytId && (
                                          <div className="w-full h-64 rounded-2xl overflow-hidden shrink-0 bg-blue-50 border border-blue-100 shadow-inner group-hover/card:scale-[1.02] transition-transform duration-300">
                                            <img 
                                              src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} 
                                              alt="Thumbnail" 
                                              className="w-full h-full object-cover"
                                              referrerPolicy="no-referrer"
                                            />
                                          </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-black text-blue-900 group-hover/card:text-blue-600 transition-colors line-clamp-1">{link.title}</p>
                                          <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-1">{link.channel}</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-blue-500 mt-2 opacity-60 group-hover/card:opacity-100">
                                          <ExternalLink size={12} /> Watch Video
                                        </div>
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            {isAdmin && (
                              <button 
                                onClick={() => {
                                  const youtubeLinks = lesson.youtubeLinks || [];
                                  const newLinks = [...youtubeLinks, { title: 'New Resource', url: '', channel: 'Manual' }];
                                  updatePublishedPlan(idx, { youtubeLinks: newLinks });
                                }}
                                className="border-2 border-dashed border-blue-100 rounded-xl p-4 flex items-center justify-center gap-2 text-xs font-bold text-blue-300 hover:border-blue-300 hover:text-blue-500 transition-all"
                              >
                                <Plus size={14} /> Add Resource
                              </button>
                            )}
                          </div>
                        </LessonSection>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <LessonSection title="Technology Stack" icon={<Monitor size={18} />} color="blue">
                            <div className="grid grid-cols-1 gap-4">
                              {lesson.customAppLink ? (
                                <div className="p-4 bg-purple-600 rounded-2xl text-white shadow-lg space-y-2">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                      <span className="text-2xl">🚀</span>
                                      <p className="text-[10px] opacity-70 uppercase tracking-widest">Teacher's Choice App</p>
                                    </div>
                                    {isAdmin && (
                                      <button onClick={() => updatePublishedPlan(idx, { customAppLink: undefined })} className="opacity-50 hover:opacity-100">
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                  {isAdmin ? (
                                    <>
                                      <input 
                                        value={lesson.customAppLink.name}
                                        onChange={(e) => updatePublishedPlan(idx, { customAppLink: { ...lesson.customAppLink!, name: e.target.value }})}
                                        className="w-full bg-white/10 p-1 text-sm font-bold rounded"
                                      />
                                      <input 
                                        value={lesson.customAppLink.url}
                                        onChange={(e) => updatePublishedPlan(idx, { customAppLink: { ...lesson.customAppLink!, url: e.target.value }})}
                                        className="w-full bg-white/10 p-1 text-xs rounded"
                                      />
                                    </>
                                  ) : (
                                    <a href={lesson.customAppLink.url} target="_blank" rel="noreferrer" className="flex items-center justify-between group">
                                      <p className="text-sm font-bold">{lesson.customAppLink.name}</p>
                                      <ExternalLink size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                  )}
                                </div>
                              ) : isAdmin && (
                                <button 
                                  onClick={() => updatePublishedPlan(idx, { customAppLink: { name: 'Custom Tool', url: 'https://' } })}
                                  className="p-4 border-2 border-dashed border-purple-200 rounded-2xl text-xs font-bold text-purple-400 hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
                                >
                                  <Plus size={14} /> Add Custom Link
                                </button>
                              )}
                              
                              {lesson.technologyTools ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {(Object.entries(lesson.technologyTools) as [string, TechToolInfo][]).map(([tk, tool]) => (
                                    <div key={tk} className="p-5 bg-white border border-blue-50 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all group">
                                      <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">{tk}</p>
                                        <div className="p-1.5 bg-blue-50 text-blue-400 group-hover:text-blue-600 rounded-lg">
                                          <ExternalLink size={12} />
                                        </div>
                                      </div>
                                      {isAdmin ? (
                                        <div className="space-y-3">
                                          <input 
                                            value={tool.url}
                                            onChange={(e) => {
                                              const nextTools = { ...lesson.technologyTools! };
                                              nextTools[tk as keyof typeof lesson.technologyTools] = { ...tool, url: e.target.value };
                                              updatePublishedPlan(idx, { technologyTools: nextTools });
                                            }}
                                            className="w-full text-[10px] text-blue-400 border-b border-dashed border-blue-100 focus:border-blue-400 outline-none pb-1"
                                          />
                                          <textarea 
                                            value={tool.description}
                                            onChange={(e) => {
                                              const nextTools = { ...lesson.technologyTools! };
                                              nextTools[tk as keyof typeof lesson.technologyTools] = { ...tool, description: e.target.value };
                                              updatePublishedPlan(idx, { technologyTools: nextTools });
                                            }}
                                            rows={3}
                                            className="w-full text-xs text-blue-800 leading-relaxed bg-blue-50/20 border-none outline-none focus:ring-0 p-2 rounded-xl resize-none"
                                          />
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <a href={tool.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-900 group-hover:text-blue-600 transition-colors line-clamp-1">{tool.name || tk}</a>
                                          <p className="text-xs text-blue-600/70 leading-relaxed line-clamp-3">{tool.description}</p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-blue-300 italic">No digital tools listed for this session.</p>
                              )}
                            </div>
                          </LessonSection>

                          <LessonSection title="Frayer Model" icon={<BookOpen size={18} />} color="purple">
                            {lesson.freyerModel ? (
                              <div className="grid grid-cols-2 gap-4">
                                <FreyerCell label="Definition" content={lesson.freyerModel.definition} onChange={isAdmin ? (val) => updatePublishedPlan(idx, { freyerModel: { ...lesson.freyerModel, definition: val }}) : undefined} />
                                <FreyerCell label="Examples" content={lesson.freyerModel.examples} onChange={isAdmin ? (val) => updatePublishedPlan(idx, { freyerModel: { ...lesson.freyerModel, examples: val }}) : undefined} />
                                <FreyerCell label="Characteristics" content={lesson.freyerModel.characteristics} onChange={isAdmin ? (val) => updatePublishedPlan(idx, { freyerModel: { ...lesson.freyerModel, characteristics: val }}) : undefined} />
                                <FreyerCell label="Non-Examples" content={lesson.freyerModel.nonExamples} onChange={isAdmin ? (val) => updatePublishedPlan(idx, { freyerModel: { ...lesson.freyerModel, nonExamples: val }}) : undefined} />
                              </div>
                            ) : (
                              <p className="text-sm text-blue-300 italic">No vocabulary focus defined.</p>
                            )}
                          </LessonSection>
                        </div>

                        <LessonSection title="Materials / Slides" icon={<Sparkles size={18} />} color="amber">
                          <div className="space-y-6">
                            {lesson.slideDeckUrl && (
                              <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase text-blue-900 tracking-widest px-1">Visual Resource</p>
                                <SlidePreviewCard url={lesson.slideDeckUrl} />
                              </div>
                            )}

                            {lesson.notebookLMUrl && (
                               <div className="space-y-4">
                               <p className="text-[10px] font-black uppercase text-blue-900 tracking-widest px-1">AI Study Guide</p>
                               <SlidePreviewCard url={lesson.notebookLMUrl} />
                             </div>
                            )}

                            <div className="relative">
                              <p className="text-[10px] font-black uppercase text-blue-300 tracking-widest px-1 mb-2">Slide Structure & Key Points</p>
                              {isAdmin ? (
                                <textarea 
                                  value={lesson.slides}
                                  onChange={(e) => updatePublishedPlan(idx, { slides: e.target.value })}
                                  rows={8}
                                  className="w-full text-sm text-blue-500 bg-blue-50/20 p-6 rounded-xl border border-blue-50 outline-none focus:border-blue-300 resize-none font-medium"
                                />
                              ) : (
                                <p className="text-sm text-blue-400 leading-loose whitespace-pre-line bg-blue-50/20 p-6 rounded-xl border border-blue-50 font-medium">{lesson.slides}</p>
                              )}
                            </div>
                            
                            {isAdmin && (
                              <div className="space-y-4 pt-4 border-t border-blue-50">
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] uppercase font-bold text-blue-300">Slide Deck Link</label>
                                    <p className="text-[9px] text-amber-500 font-bold italic">Anyone with link recommended</p>
                                  </div>
                                  <input 
                                    value={lesson.slideDeckUrl || ''}
                                    onChange={(e) => updatePublishedPlan(idx, { slideDeckUrl: e.target.value })}
                                    className="w-full py-2 px-4 border border-blue-100 rounded-xl text-xs text-blue-600 outline-none focus:border-blue-300 transition-all font-mono"
                                    placeholder="Paste Google Slides link"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] uppercase font-bold text-blue-300">NotebookLM Slide Deck</label>
                                  </div>
                                  <input 
                                    value={lesson.notebookLMUrl || ''}
                                    onChange={(e) => updatePublishedPlan(idx, { notebookLMUrl: e.target.value })}
                                    className="w-full py-2 px-4 border border-blue-100 rounded-xl text-xs text-blue-600 outline-none focus:border-blue-300 transition-all font-mono"
                                    placeholder="Paste NotebookLM link"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </LessonSection>
                      </div>
                    </section>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-40 text-center opacity-30 select-none text-blue-400">
                <GraduationCap size={80} className="mb-6" />
                <h2 className="font-serif text-2xl mb-2 text-blue-950">Student Learning Space</h2>
                <p className="text-sm italic max-w-xs mx-auto text-blue-800">Select a published lesson from the left panel to access materials, videos, and worksheets.</p>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// Replica display components (read-only)
function LessonSection({ title, icon, color, children }: { title: string; icon: React.ReactNode; color: string; children: React.ReactNode }) {
  const borderColors: Record<string, string> = {
    blue: 'border-blue-200', green: 'border-green-200', amber: 'border-amber-200', purple: 'border-purple-200', red: 'border-red-200', teal: 'border-teal-200'
  };
  return (
    <div className={`bg-white border rounded-2xl p-6 shadow-sm ${borderColors[color] || 'border-blue-100'}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-blue-300">{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-300">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, onChange }: { label: string; value: string; onChange?: (val: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <div className="bg-blue-50/20 border border-blue-50 rounded-2xl p-4 flex items-center gap-4 transition-all hover:bg-blue-50/40">
      <div className="w-24 shrink-0">
        <p className="text-[10px] font-black uppercase text-blue-300 tracking-widest">{label}</p>
      </div>
      {onChange ? (
        <textarea 
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={1}
          className="flex-1 text-sm text-blue-800 leading-relaxed font-medium bg-transparent border-none outline-none focus:ring-0 resize-none p-0 overflow-hidden"
        />
      ) : (
        <p className="flex-1 text-sm text-blue-800 leading-relaxed font-medium">{value}</p>
      )}
    </div>
  );
}

function DetailBox({ label, value, onChange }: { label: string; value: string; onChange?: (val: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-50 shadow-sm">
      <p className="text-[10px] font-black uppercase text-blue-300 mb-2 tracking-widest">{label}</p>
      {onChange ? (
        <textarea 
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full text-sm text-blue-800 italic leading-relaxed bg-transparent border-none outline-none focus:ring-0 resize-none p-0 overflow-hidden"
        />
      ) : (
        <p className="text-sm text-blue-800 italic leading-relaxed">&ldquo;{value}&rdquo;</p>
      )}
    </div>
  );
}

interface TechItemProps {
  key?: string;
  tool: TechToolInfo;
  isAdmin?: boolean;
  onUpdate?: (updated: Partial<TechToolInfo>) => void;
}

function TechItem({ tool, isAdmin, onUpdate }: TechItemProps) {
  const iconMap: Record<string, string> = {
    'Mentimeter': '📊', 'Quizizz': '❓', 'Blooket': '🎮', 'Padlet': '📌', 'Simulations': '🧪'
  };
  return (
    <div className="space-y-3 group bg-blue-50/10 p-4 rounded-2xl border border-blue-50/50 hover:border-blue-200 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-3xl shrink-0">{iconMap[tool.name] || '🛠️'}</span>
          <div className="min-w-0 flex-1">
            <span className="text-base font-bold text-blue-900 block">{tool.name}</span>
            {isAdmin && (
              <input 
                value={tool.url}
                onChange={(e) => onUpdate?.({ url: e.target.value })}
                className="w-full text-[10px] text-blue-300 bg-transparent border-b border-dashed border-blue-50 outline-none"
              />
            )}
          </div>
        </div>
        <a href={tool.url} target="_blank" rel="noreferrer" className="p-1.5 bg-white shadow-sm border border-blue-100 rounded-lg text-blue-400 hover:text-blue-600 hover:border-blue-300 transition-all shrink-0 ml-2">
          <ExternalLink size={14} />
        </a>
      </div>
      {isAdmin ? (
        <textarea 
          value={tool.description}
          onChange={(e) => onUpdate?.({ description: e.target.value })}
          rows={2}
          className="w-full text-xs text-blue-600/80 italic border-l-2 border-blue-200 pl-3 bg-transparent border-none outline-none focus:ring-0 p-0 resize-none"
        />
      ) : (
        <p className="text-xs text-blue-600/80 leading-relaxed italic border-l-2 border-blue-200 pl-3">{tool.description}</p>
      )}
    </div>
  );
}

function FreyerCell({ label, content, onChange }: { label: string; content: string; onChange?: (val: string) => void }) {
  return (
    <div className="bg-blue-50/30 border border-blue-50 rounded-2xl p-4 flex flex-col gap-1.5 hover:border-blue-100 transition-all shadow-sm">
      <span className="text-xs font-bold uppercase tracking-widest text-blue-300">{label}</span>
      {onChange ? (
        <textarea 
          value={content}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full text-sm leading-relaxed text-blue-800 bg-transparent border-none outline-none focus:ring-0 resize-none p-0"
        />
      ) : (
        <p className="text-sm leading-relaxed text-blue-800 line-clamp-4">{content}</p>
      )}
    </div>
  );
}
