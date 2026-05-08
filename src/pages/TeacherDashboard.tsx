import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Tv, 
  ChevronDown, 
  ChevronRight,
  RotateCcw, 
  Sparkles,
  Search,
  Check,
  X,
  Target,
  CheckCircle2,
  Accessibility,
  BarChart3,
  LogOut,
  Globe,
  PenTool,
  ClipboardList,
  Monitor,
  Youtube,
  GraduationCap,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  UploadCloud,
  ArrowRightLeft,
  Info,
  Zap,
  Clock
} from 'lucide-react';
import { Curriculum, LessonPlan, Channel, TechToolInfo, SyllabusData } from '../types';
import { SYLLABUS, UNIT_TOPICS, DEFAULT_CHANNELS } from '../constants';
import { generateLessonPlans, generateBulkLessonPlans, generateSingleStarter } from '../services/geminiService';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, query, collection, orderBy, onSnapshot, updateDoc } from 'firebase/firestore';
import { downloadLessonPDF } from '../services/pdfService';
import { get as idbGet, set as idbSet } from 'idb-keyval';

export default function TeacherDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('teacher_auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  // App State
  const [activeTab, setActiveTab] = useState<'planner' | 'channels' | 'syllabus'>('planner');
  const [curriculum, setCurriculum] = useState<Curriculum | ''>('');
  const [subject, setSubject] = useState('');
  const [year, setYear] = useState('');
  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({});
  const [activeTopic, setActiveTopic] = useState<{ unit: string; topic: string } | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<{ unit: string; topic: string }[]>([]);
  const [lessonCount, setLessonCount] = useState(6);
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [plans, setPlans] = useState<Record<string, LessonPlan[]>>({});
  const isInitialPlansLoad = useRef(true);
  const isInitialChannelsLoad = useRef(true);

  // Persistence for Plans
  useEffect(() => {
    const loadSavedPlans = async () => {
      try {
        const saved = await idbGet<Record<string, LessonPlan[]>>('persisted_plans');
        if (saved && typeof saved === 'object') {
          setPlans(saved);
        }
      } catch (err) {
        console.error("Failed to load plans from storage:", err);
      } finally {
        isInitialPlansLoad.current = false;
      }
    };
    loadSavedPlans();
  }, []);

  useEffect(() => {
    if (!isInitialPlansLoad.current) {
      savePlansToStorage(plans);
    }
  }, [plans]);

  const savePlansToStorage = async (updatedPlans: Record<string, LessonPlan[]>) => {
    try {
      await idbSet('persisted_plans', updatedPlans);
    } catch (err) {
      console.error("Failed to save plans to storage:", err);
    }
  };

  // Persistence for YouTube Channels
  useEffect(() => {
    const loadSavedChannels = async () => {
      try {
        const saved = await idbGet<Channel[]>('persisted_channels');
        if (saved && Array.isArray(saved)) {
          // Merge saved with defaults to catch new additions to the codebase
          const merged = [...saved];
          DEFAULT_CHANNELS.forEach(def => {
            if (!merged.find(m => m.handle === def.handle)) {
              merged.push(def);
            }
          });
          setChannels(merged);
        }
      } catch (err) {
        console.error("Failed to load channels from storage:", err);
      } finally {
        isInitialChannelsLoad.current = false;
      }
    };
    loadSavedChannels();
  }, []);

  useEffect(() => {
    if (!isInitialChannelsLoad.current) {
      saveChannelsToStorage(channels);
    }
  }, [channels]);

  const saveChannelsToStorage = async (updatedChannels: Channel[]) => {
    try {
      await idbSet('persisted_channels', updatedChannels);
    } catch (err) {
      console.error("Failed to save channels to storage:", err);
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Syllabus Customization State
  const [syllabusState, setSyllabusState] = useState<Record<Curriculum, SyllabusData>>(() => {
    const saved = localStorage.getItem('custom_syllabus');
    return saved ? JSON.parse(saved) : SYLLABUS;
  });
  const [unitTopicsState, setUnitTopicsState] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('custom_unit_topics');
    return saved ? JSON.parse(saved) : UNIT_TOPICS;
  });
  const [topicDescriptionsState, setTopicDescriptionsState] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('topic_descriptions');
    return saved ? JSON.parse(saved) : {};
  });
  const [isEditSyllabusMode, setIsEditSyllabusMode] = useState(false);

  const [textbookFiles, setTextbookFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence for Textbook Files
  useEffect(() => {
    const loadSavedFiles = async () => {
      try {
        const saved = await idbGet<File[]>('persisted_textbooks');
        if (saved && Array.isArray(saved)) {
          setTextbookFiles(saved);
        }
      } catch (err) {
        console.error("Failed to load textbooks from storage:", err);
      }
    };
    loadSavedFiles();
  }, []);

  const saveFilesToStorage = async (files: File[]) => {
    try {
      await idbSet('persisted_textbooks', files);
    } catch (err) {
      console.error("Failed to save textbooks to storage:", err);
    }
  };

  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelHandle, setNewChannelHandle] = useState('');

  const currentPlanKey = useMemo(() => {
    if (!curriculum || !subject || !year || !activeTopic) return '';
    return `${curriculum}|${subject}|${year}|${activeTopic.unit}|${activeTopic.topic}`;
  }, [curriculum, subject, year, activeTopic]);

  const currentLessons = plans[currentPlanKey] || [];

  const handleLogin = () => {
    if (password === 'teacher123') {
      setIsLoggedIn(true);
      setLoginError(false);
      localStorage.setItem('teacher_auth', 'true');
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('teacher_auth');
  };

  // Syllabus Management Actions
  const saveSyllabus = (newSyllabus: Record<Curriculum, SyllabusData>, newTopics: Record<string, string[]>, newDescriptions?: Record<string, string>) => {
    setSyllabusState(newSyllabus);
    setUnitTopicsState(newTopics);
    if (newDescriptions) setTopicDescriptionsState(newDescriptions);
    localStorage.setItem('custom_syllabus', JSON.stringify(newSyllabus));
    localStorage.setItem('custom_unit_topics', JSON.stringify(newTopics));
    if (newDescriptions) localStorage.setItem('topic_descriptions', JSON.stringify(newDescriptions));
  };

  const addUnit = (unitName: string) => {
    if (!curriculum || !subject || !unitName) return;
    const newSyllabus = { ...syllabusState };
    if (!newSyllabus[curriculum].units[subject]) {
      newSyllabus[curriculum].units[subject] = [];
    }
    if (!newSyllabus[curriculum].units[subject].includes(unitName)) {
      newSyllabus[curriculum].units[subject].push(unitName);
      const newTopics = { ...unitTopicsState, [unitName]: ['Introduction', 'Core Concepts'] };
      saveSyllabus(newSyllabus, newTopics);
    }
  };

  const removeUnit = (unitName: string) => {
    if (!curriculum || !subject) return;
    const newSyllabus = { ...syllabusState };
    newSyllabus[curriculum].units[subject] = newSyllabus[curriculum].units[subject].filter(u => u !== unitName);
    const newTopics = { ...unitTopicsState };
    delete newTopics[unitName];
    saveSyllabus(newSyllabus, newTopics);
  };

  const addTopic = (unitName: string, topicName: string, index?: number) => {
    const newTopics = { ...unitTopicsState };
    if (!newTopics[unitName]) newTopics[unitName] = [];
    if (!newTopics[unitName].includes(topicName)) {
      if (typeof index === 'number') {
        newTopics[unitName].splice(index, 0, topicName);
      } else {
        newTopics[unitName].push(topicName);
      }
      saveSyllabus(syllabusState, newTopics);
    }
  };

  const updateTopicDescription = (topicName: string, description: string) => {
    const newDescriptions = { ...topicDescriptionsState, [topicName]: description };
    setTopicDescriptionsState(newDescriptions);
    localStorage.setItem('topic_descriptions', JSON.stringify(newDescriptions));
  };

  const removeTopic = (unitName: string, topicName: string) => {
    const newTopics = { ...unitTopicsState };
    if (newTopics[unitName]) {
      newTopics[unitName] = newTopics[unitName].filter(t => t !== topicName);
      saveSyllabus(syllabusState, newTopics);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const validFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 100 * 1024 * 1024) {
          alert(`File "${file.name}" is too large. Max size is 100MB.`);
          continue;
        }
        validFiles.push(file);
      }
      const updatedList = [...textbookFiles, ...validFiles];
      setTextbookFiles(updatedList);
      saveFilesToStorage(updatedList);
    }
  };

  const toggleUnit = (unit: string) => {
    setOpenUnits(prev => ({ ...prev, [unit]: !prev[unit] }));
  };

  const toggleTopicSelection = (unit: string, topic: string) => {
    setSelectedTopics(prev => {
      const exists = prev.find(t => t.unit === unit && t.topic === topic);
      if (exists) {
        return prev.filter(t => !(t.unit === unit && t.topic === topic));
      } else {
        return [...prev, { unit, topic }];
      }
    });
  };

  const handleGenerate = async () => {
    if (selectedTopics.length === 0 || !curriculum || !subject || !year) return;
    setIsGenerating(true);

    const totalSize = textbookFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    if (totalSize > 100 * 1024 * 1024) {
      alert("TOTAL_SIZE_EXCEEDED: Total source material size exceeds 100MB. Please upload fewer or smaller textbook sections to stay within AI limits.");
      setIsGenerating(false);
      return;
    }

    const activeChannelStr = channels
      .filter(c => c.checked)
      .map(c => `${c.name} (${c.handle})`)
      .join(', ');

    try {
      const topicNames = selectedTopics.map(t => t.topic);
      const generated = await generateBulkLessonPlans(
        curriculum as Curriculum,
        subject,
        year,
        selectedTopics[0].unit, 
        topicNames,
        lessonCount,
        activeChannelStr,
        textbookFiles
      );

      const groupedPlans: Record<string, LessonPlan[]> = {};
      generated.forEach(lesson => {
        const matchedTopic = selectedTopics.find(st => lesson.topic.includes(st.topic)) || selectedTopics[0];
        const key = `${curriculum}|${subject}|${year}|${matchedTopic.unit}|${matchedTopic.topic}`;
        if (!groupedPlans[key]) groupedPlans[key] = [];
        groupedPlans[key].push(lesson);
      });

      setPlans(prev => ({ ...prev, ...groupedPlans }));
      
      const firstTopic = selectedTopics[0];
      setActiveTopic(firstTopic);
      
    } catch (error: any) {
      console.error("Generation failed:", error);
      if (error?.message?.includes('TOTAL_SIZE_EXCEEDED')) {
        alert(error.message.replace('TOTAL_SIZE_EXCEEDED: ', ''));
      } else if (error?.message?.includes('token count exceeds the maximum')) {
        alert("The textbooks you uploaded are too large for the AI to process at once. Please try uploading only the relevant chapters or fewer files.");
      } else {
        alert("Failed to generate lesson plans. Please check your connection or try with less source material.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const updateCurrentLesson = (lessonIndex: number, updatedLesson: Partial<LessonPlan>) => {
    if (!currentPlanKey) return;
    setPlans(prev => {
      const currentTopicLessons = [...(prev[currentPlanKey] || [])];
      if (currentTopicLessons[lessonIndex]) {
        currentTopicLessons[lessonIndex] = {
          ...currentTopicLessons[lessonIndex],
          ...updatedLesson
        };
      }
      return { ...prev, [currentPlanKey]: currentTopicLessons };
    });
  };

  const handlePublish = async () => {
    if (selectedTopics.length === 0) return;
    setIsPublishing(true);
    
    try {
      // Publish each selected topic that has a plan
      for (const topic of selectedTopics) {
        const key = `${curriculum}|${subject}|${year}|${topic.unit}|${topic.topic}`;
        const lessons = plans[key];
        if (!lessons || lessons.length === 0) continue;

        const planId = key.replace(/\|/g, '_').replace(/[\s/]+/g, '_').toLowerCase();
        await setDoc(doc(db, 'lessonPlans', planId), {
           curriculum,
           subject,
           year,
           unit: topic.unit,
           topic: topic.topic,
           topicDescription: topicDescriptionsState[topic.topic] || '',
           lessons: lessons,
           updatedAt: serverTimestamp()
        });
      }
      alert('All selected lesson plans published successfully!');
    } catch (error: any) {
      console.error("Publishing failed:", error);
      handleFirestoreError(error, OperationType.WRITE, 'lessonPlans/bulk');
      alert("Failed to publish plans: " + (error.message || 'Unknown error'));
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white border border-blue-100 rounded-3xl p-8 shadow-xl"
        >
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl text-blue-600 mb-2 tracking-tight">EduPlan <span className="text-blue-300">Studio</span></h1>
            <p className="text-blue-400 text-sm italic">Teacher Portal — Staff Access Only</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-blue-300 uppercase tracking-widest mb-1.5 ml-1">Staff Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Enter staff password"
                className="w-full bg-white border border-blue-100 rounded-xl px-4 py-3 text-blue-900 placeholder-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            {loginError && (
              <p className="text-red-400 text-xs text-center">Authentication failed. Please try again.</p>
            )}
            <button 
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 group"
            >
              Sign In <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50/50 flex flex-col overflow-hidden text-blue-900 selection:bg-blue-100 selection:text-blue-900">
      <header className="h-16 bg-white border-b border-blue-100 flex items-center px-6 gap-6 shrink-0 shadow-sm z-10">
        <h1 className="font-serif text-2xl tracking-tight mr-auto text-blue-600">EduPlan <span className="text-blue-300">Studio</span></h1>
        <div className="ml-auto flex items-center gap-4">
          <Link 
            to="/student" 
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-full border border-blue-200 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm"
          >
            <ArrowRightLeft size={14} />
            Switch to Student Hub
          </Link>
          <button 
            onClick={handlePublish}
            disabled={selectedTopics.length === 0 || isPublishing}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
          >
            {isPublishing ? <RotateCcw size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            {isPublishing ? 'Publishing...' : `Publish ${selectedTopics.length > 0 ? selectedTopics.length : ''} Designs`}
          </button>
          <button 
            onClick={handleLogout}
            className="p-2.5 text-blue-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Rail */}
        <aside className="w-80 border-r border-blue-100 bg-blue-50/20 flex flex-col shrink-0">
          <div className="flex border-b border-blue-100 bg-white">
            {(['planner', 'channels', 'syllabus'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-5 text-sm font-bold uppercase tracking-wider flex flex-col items-center gap-2.5 transition-all relative ${
                  activeTab === tab ? 'text-blue-600' : 'text-blue-300 hover:text-blue-500'
                }`}
              >
                {tab === 'planner' && <BookOpen size={22} />}
                {tab === 'channels' && <Tv size={22} />}
                {tab === 'syllabus' && <Info size={22} />}
                {tab === 'planner' ? 'Planner' : tab === 'channels' ? 'Channels' : 'Syllabus'}
                {activeTab === tab && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            {activeTab === 'planner' && (
              <div className="space-y-6">
                <section className="space-y-2">
                  <label className="text-xs font-bold text-blue-400 uppercase tracking-widest ml-1">Curriculum</label>
                  <select 
                    value={curriculum}
                    onChange={(e) => {
                      setCurriculum(e.target.value as Curriculum);
                      setSubject('');
                      setYear('');
                      setActiveTopic(null);
                    }}
                    className="w-full bg-white border border-blue-100 rounded-xl px-4 py-3 text-base text-blue-900 outline-none focus:border-blue-600 transition-colors shadow-sm"
                  >
                    <option value="">Select Curriculum</option>
                    {Object.values(Curriculum).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </section>

                {curriculum && (
                  <section className="space-y-2">
                    <label className="text-xs font-bold text-blue-400 uppercase tracking-widest ml-1">
                      {curriculum === Curriculum.IBMYP ? 'Year' : 'Subject'}
                    </label>
                    <select 
                       value={curriculum === Curriculum.IBMYP ? year : subject}
                       onChange={(e) => curriculum === Curriculum.IBMYP ? (setYear(e.target.value), setSubject('')) : setSubject(e.target.value)}
                       className="w-full bg-white border border-blue-100 rounded-xl px-4 py-3 text-base text-blue-900 outline-none focus:border-blue-600 transition-colors shadow-sm"
                    >
                      <option value="">{curriculum === Curriculum.IBMYP ? 'Select Year' : 'Select Subject'}</option>
                      {curriculum === Curriculum.IBMYP 
                        ? syllabusState[curriculum].years.map(y => <option key={y} value={y}>{y}</option>)
                        : (syllabusState[curriculum].subjects as string[]).map(s => <option key={s} value={s}>{s}</option>)
                      }
                    </select>
                  </section>
                )}

                {((curriculum === Curriculum.IBMYP && year) || (curriculum !== Curriculum.IBMYP && subject)) && (
                   <section className="space-y-2">
                    <label className="text-xs font-bold text-blue-400 uppercase tracking-widest ml-1">
                      {curriculum === Curriculum.IBMYP ? 'Subject' : 'Year'}
                    </label>
                    <select 
                      value={curriculum === Curriculum.IBMYP ? subject : year}
                      onChange={(e) => curriculum === Curriculum.IBMYP ? setSubject(e.target.value) : setYear(e.target.value)}
                      className="w-full bg-white border border-blue-100 rounded-xl px-4 py-3 text-base text-blue-900 outline-none focus:border-blue-600 transition-colors shadow-sm"
                    >
                      <option value="">{curriculum === Curriculum.IBMYP ? 'Select Subject' : 'Select Year'}</option>
                      {curriculum === Curriculum.IBMYP 
                        ? (syllabusState[Curriculum.IBMYP].subjects as Record<string, string[]>)[year]?.map(s => <option key={s} value={s}>{s}</option>)
                        : syllabusState[curriculum as Curriculum].years.map(y => <option key={y} value={y}>{y}</option>)
                      }
                    </select>
                  </section>
                )}

                {activeTopic === null && year && subject && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-xs font-bold text-blue-400 uppercase tracking-widest block">Units & Topics</label>
                      <div className="flex gap-2">
                        {isEditSyllabusMode && (
                          <button 
                            onClick={() => {
                              if (confirm("Reset syllabus and topics to defaults? This will erase your custom changes.")) {
                                setSyllabusState(SYLLABUS);
                                setUnitTopicsState(UNIT_TOPICS);
                                setTopicDescriptionsState({});
                                localStorage.removeItem('custom_syllabus');
                                localStorage.removeItem('custom_unit_topics');
                                localStorage.removeItem('topic_descriptions');
                              }
                            }}
                            className="text-[10px] font-bold px-2 py-1 rounded-md border border-red-100 text-red-400 hover:bg-red-50 transition-all"
                          >
                             Reset
                          </button>
                        )}
                        <button 
                          onClick={() => setIsEditSyllabusMode(!isEditSyllabusMode)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-all ${isEditSyllabusMode ? 'bg-blue-600 text-white border-blue-600' : 'text-blue-400 border-blue-100 hover:border-blue-400'}`}
                        >
                           {isEditSyllabusMode ? 'Done' : 'Manage Topics'}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {(syllabusState[curriculum as Curriculum].units[subject] || []).map(unit => {
                        const isOpen = openUnits[unit];
                        const topics = unitTopicsState[unit] || [];
                        return (
                          <div key={unit} className="bg-white border border-blue-100 rounded-2xl overflow-hidden shadow-sm">
                            <div className="flex items-center group/unit">
                              <button 
                                onClick={() => toggleUnit(unit)}
                                className={`flex-1 px-5 py-4 text-left text-base font-semibold flex items-center justify-between hover:bg-blue-50 transition-colors text-blue-900 ${isEditSyllabusMode ? 'pr-2' : ''}`}
                              >
                                <span className="truncate">{unit}</span>
                                {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                              </button>
                              {isEditSyllabusMode && (
                                <button 
                                  onClick={() => {
                                    if (confirm(`Delete unit "${unit}" and all its topics?`)) {
                                      removeUnit(unit);
                                    }
                                  }}
                                  className="p-3 text-red-200 hover:text-red-500 hover:bg-red-50 transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                            <AnimatePresence>
                              {isOpen && (
                                <motion.div 
                                  initial={{ height: 0 }}
                                  animate={{ height: 'auto' }}
                                  exit={{ height: 0 }}
                                  className="overflow-hidden bg-blue-50/10 border-t border-blue-50"
                                >
                                  {topics.map((t, topicIdx) => {
                                    const pk = `${curriculum}|${subject}|${year}|${unit}|${t}`;
                                    const hasPlan = !!plans[pk];
                                    const isActive = activeTopic?.unit === unit && activeTopic?.topic === t;
                                    const isSelected = selectedTopics.some(st => st.unit === unit && st.topic === t);
                                    
                                    return (
                                      <React.Fragment key={t}>
                                        {isEditSyllabusMode && (
                                          <button 
                                            onClick={() => {
                                              const name = prompt("Insert new topic here:");
                                              if (name) addTopic(unit, name, topicIdx);
                                            }}
                                            className="w-full py-1 text-[8px] font-black uppercase text-blue-300 hover:text-blue-600 transition-all opacity-0 group-hover/parent:opacity-100 flex items-center justify-center gap-1"
                                          >
                                            <Plus size={10} /> Insert Topic
                                          </button>
                                        )}
                                        <div className="flex flex-col group/item">
                                          <div className={`flex items-center transition-all ${isActive ? 'bg-blue-50/50' : 'hover:bg-blue-50/20'}`}>
                                            <button 
                                              onClick={() => toggleTopicSelection(unit, t)}
                                              className={`pl-4 pr-2 py-4 flex items-center justify-center transition-all ${isSelected ? 'text-blue-600' : 'text-blue-200 group-hover/item:text-blue-400'}`}
                                            >
                                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-blue-100'}`}>
                                                {isSelected && <Check size={12} strokeWidth={4} />}
                                              </div>
                                            </button>
                                            <button 
                                              onClick={() => {
                                                setActiveTopic({ unit, topic: t });
                                              }}
                                              className={`flex-1 pr-4 py-4 text-sm text-left flex items-center justify-between transition-all ${
                                                isActive ? 'text-blue-600 font-bold' : 'text-blue-900 group-hover/item:text-blue-900'
                                              }`}
                                            >
                                              <span className="truncate">{t}</span>
                                              {hasPlan && <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm" />}
                                            </button>
                                            {isEditSyllabusMode && (
                                              <button 
                                                onClick={() => removeTopic(unit, t)}
                                                className="p-3 text-red-200 hover:text-red-500 transition-all opacity-0 group-hover/item:opacity-100"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            )}
                                          </div>
                                          
                                          {isEditSyllabusMode && (
                                            <div className="px-4 pb-4">
                                              <textarea 
                                                value={topicDescriptionsState[t] || ''}
                                                onChange={(e) => updateTopicDescription(t, e.target.value)}
                                                placeholder="Add a small caption or description..."
                                                className="w-full text-[10px] bg-slate-50 border border-blue-50 rounded-lg p-2 focus:border-blue-300 outline-none resize-none"
                                                rows={2}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </React.Fragment>
                                    );
                                  })}
                                  {isEditSyllabusMode && (
                                    <button 
                                      onClick={() => {
                                        const name = prompt("Enter new topic name:");
                                        if (name) addTopic(unit, name);
                                      }}
                                      className="w-full py-3 text-[10px] font-bold text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 border-t border-blue-50"
                                    >
                                      <Plus size={12} /> Add New Topic to {unit}
                                    </button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                      {isEditSyllabusMode && (
                        <button 
                          onClick={() => {
                            const name = prompt("Enter new unit name:");
                            if (name) addUnit(name);
                          }}
                          className="w-full py-4 border-2 border-dashed border-blue-100 rounded-2xl text-xs font-bold text-blue-400 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={16} /> Add New Unit
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'planner' && curriculum && (
              <section className="space-y-3 pt-4 border-t border-blue-100">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Source Material</label>
                  {textbookFiles.length > 0 && (
                    <button 
                      onClick={() => {
                        setTextbookFiles([]);
                        saveFilesToStorage([]);
                      }}
                      className="text-[10px] text-red-500 hover:underline font-bold"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const files = e.dataTransfer.files;
                    if (files) {
                      const validFiles: File[] = [];
                      for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        if (file.size > 100 * 1024 * 1024) {
                          alert(`File "${file.name}" is too large. Max size is 100MB.`);
                          continue;
                        }
                        validFiles.push(file);
                      }
                      const updatedList = [...textbookFiles, ...validFiles];
                      setTextbookFiles(updatedList);
                      saveFilesToStorage(updatedList);
                    }
                  }}
                  className={`relative cursor-pointer group border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center text-center gap-3 ${
                    textbookFiles.length > 0 
                    ? 'bg-blue-50/20 border-blue-200' 
                    : 'bg-white border-blue-100 hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.txt,.doc,.docx"
                    multiple
                  />
                  
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UploadCloud size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-600">Upload Textbooks</p>
                    <p className="text-[10px] text-blue-400">PDF, TXT or DOC (Max 50MB per file)</p>
                  </div>
                </div>

                {textbookFiles.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                    {textbookFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white border border-blue-50 p-2.5 rounded-xl transition-all hover:border-blue-100 group/file shadow-sm">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                            <CheckCircle2 size={12} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-xs font-bold text-blue-900">{file.name}</span>
                            <span className="text-[10px] text-blue-300 lowercase font-medium">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const updatedList = textbookFiles.filter((_, i) => i !== idx);
                            setTextbookFiles(updatedList);
                            saveFilesToStorage(updatedList);
                          }}
                          className="p-1.5 text-blue-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-[10px] text-blue-400 italic px-1">AI will prioritize concepts from your uploaded source material.</p>
              </section>
            )}
            
            {activeTab === 'channels' && (
              <div className="space-y-6">
                <section className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-xs font-bold text-blue-300 uppercase tracking-widest">Active Channels</label>
                    <Tv size={14} className="text-blue-300" />
                  </div>
                  <div className="space-y-2">
                    {channels.map((channel, idx) => (
                      <div 
                        key={idx} 
                        className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
                          channel.checked ? 'bg-blue-50 border-blue-200' : 'bg-white border-blue-50 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button 
                            onClick={() => {
                              const newChannels = [...channels];
                              newChannels[idx].checked = !newChannels[idx].checked;
                              setChannels(newChannels);
                            }}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                              channel.checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-blue-200'
                            }`}
                          >
                            {channel.checked && <Check size={12} />}
                          </button>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate text-blue-900">{channel.name}</p>
                            <p className="text-[10px] text-blue-400 truncate">{channel.handle}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const newChannels = channels.filter((_, i) => i !== idx);
                            setChannels(newChannels);
                          }}
                          className="p-1.5 text-blue-200 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="p-4 bg-white border border-blue-100 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-blue-300 uppercase tracking-widest">Add Custom Source</p>
                  <div className="space-y-2">
                    <input 
                      placeholder="Channel Name"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      className="w-full bg-blue-50/30 border border-blue-100 rounded-lg px-3 py-1.5 text-xs text-blue-900 focus:border-blue-500 outline-none"
                    />
                    <input 
                      placeholder="@handle (e.g. @Kurzgesagt)"
                      value={newChannelHandle}
                      onChange={(e) => setNewChannelHandle(e.target.value)}
                      className="w-full bg-blue-50/30 border border-blue-100 rounded-lg px-3 py-1.5 text-xs text-blue-900 focus:border-blue-500 outline-none"
                    />
                    <button 
                      onClick={() => {
                        if (newChannelName && newChannelHandle) {
                          const newChannels = [...channels, { name: newChannelName, handle: newChannelHandle, checked: true }];
                          setChannels(newChannels);
                          setNewChannelName('');
                          setNewChannelHandle('');
                        }
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Plus size={12} /> Add Channel
                    </button>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'syllabus' && (
              <div className="space-y-6">
                <section className="space-y-4">
                  <p className="text-xs font-bold text-blue-300 uppercase tracking-widest px-1">Curriculum Breakdown</p>
                  {curriculum && syllabusState[curriculum as Curriculum]?.subjects && (
                    <div className="space-y-2">
                      {(Array.isArray(syllabusState[curriculum as Curriculum].subjects) 
                        ? (syllabusState[curriculum as Curriculum].subjects as string[]) 
                        : Object.keys(syllabusState[curriculum as Curriculum].subjects as Record<string, string[]>)
                      ).map(subj => (
                        <div key={subj} className="bg-white border border-blue-100 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            <p className="text-xs font-bold text-blue-900">{subj}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(syllabusState[curriculum as Curriculum].units[subj] || []).map(u => (
                              <span key={u} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                                {u}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-blue-100 bg-white space-y-5">
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Target Cycles</label>
                <span className="text-sm font-bold text-blue-600">{lessonCount} Total Lessons</span>
              </div>
              <input type="range" min="1" max="10" value={lessonCount} onChange={(e) => setLessonCount(parseInt(e.target.value))} className="w-full accent-blue-600 h-1.5 bg-blue-50 rounded-full cursor-pointer appearance-none" />
              <p className="text-[10px] text-blue-400 italic px-1">AI will distribute lessons based on complexity.</p>
            </div>
            <button 
              disabled={selectedTopics.length === 0 || isGenerating}
              onClick={handleGenerate}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all text-base shadow-sm ${
                selectedTopics.length === 0 || isGenerating 
                ? 'bg-blue-50 text-blue-200 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 active:scale-[0.98]'
              }`}
            >
              {isGenerating ? <RotateCcw size={20} className="animate-spin" /> : <Sparkles size={20} />}
              {isGenerating ? 'Bulk Compiling Designs...' : `Compile ${selectedTopics.length > 0 ? selectedTopics.length : ''} Topics`}
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-slate-50/30 overflow-hidden relative">
          <div className="h-16 bg-white/80 backdrop-blur-md border-b border-blue-100 flex items-center px-8 gap-6 shrink-0 z-10 sticky top-0">
            <div className="flex-1 min-w-0">
              <h2 className="font-serif text-xl truncate text-blue-950 font-medium">
                {activeTopic ? `${curriculum} / ${subject} / ${activeTopic.topic}` : 'Select a topic to start planning'}
              </h2>
            </div>
            {currentLessons.length > 0 && (
              <div className="flex gap-3">
                <p className="text-xs text-blue-400 font-medium bg-blue-50 px-4 py-2 rounded-full border border-blue-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  {currentLessons.length} Lessons Generated
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
            <div id="lesson-plan-content" className="max-w-4xl mx-auto space-y-20 bg-white p-12 rounded-[3rem] shadow-xl border border-blue-50">
               {activeTopic && (topicDescriptionsState[activeTopic.topic] || isEditSyllabusMode) && (
                 <div className="pb-10 border-b border-blue-50 mb-10">
                   <p className="text-[10px] font-black uppercase text-blue-300 tracking-widest mb-4">Topic Context & Guidance</p>
                   {isEditSyllabusMode ? (
                      <textarea 
                        value={topicDescriptionsState[activeTopic.topic] || ''}
                        onChange={(e) => updateTopicDescription(activeTopic.topic, e.target.value)}
                        placeholder="Add a small caption or description about this topic and what you want in the lesson plans..."
                        className="w-full text-base bg-slate-50 border border-blue-100 rounded-2xl p-6 focus:border-blue-500 outline-none resize-none font-serif text-blue-900"
                        rows={3}
                      />
                   ) : (
                      <p className="text-xl text-blue-900/70 font-serif leading-relaxed italic">
                        "{topicDescriptionsState[activeTopic.topic]}"
                      </p>
                   )}
                 </div>
               )}
               <AnimatePresence mode="wait">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-32 space-y-6">
                    <div className="w-12 h-12 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-blue-300 text-sm animate-pulse">Consulting curriculum standards...</p>
                  </div>
                ) : currentLessons.length > 0 ? (
                  currentLessons.map((lesson, idx) => (
                    <div key={idx} id={`lesson-${idx}`} className="relative pb-20 border-b border-dashed border-blue-100 last:border-0 last:pb-0">
                      <div className="absolute -left-16 top-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xl z-10">
                        {idx + 1}
                      </div>
                      <LessonDisplay 
                        lesson={lesson} 
                        isMYP={curriculum === Curriculum.IBMYP} 
                        onUpdate={(updated) => updateCurrentLesson(idx, updated)}
                        curriculum={curriculum}
                        subject={subject}
                        year={year}
                      />
                      <button 
                        onClick={() => downloadLessonPDF(`lesson-${idx}`, `${lesson.topic}_L${idx+1}`)}
                        className="pdf-hide absolute right-0 top-0 flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 rounded-2xl font-bold text-xs hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100"
                      >
                        <Download size={16} /> Download Lesson PDF
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 space-y-6 text-center opacity-50">
                    <ClipboardList size={48} className="text-blue-200" />
                    <p className="text-blue-400 text-sm italic">Select a topic and compile to view lesson designs.</p>
                  </div>
                )}
               </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
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
        <div className="w-full rounded-2xl p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-slate-700 shadow-xl relative overflow-hidden group">
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Sparkles className="text-blue-400" size={24} />
            </div>
            <h4 className="text-white font-bold text-sm mb-1">NotebookLM Interactive Guide</h4>
            <p className="text-slate-400 text-[10px] max-w-[200px] mb-4">AI-powered study hub for students.</p>
            <a 
              href={url} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[10px] transition-all shadow-lg active:scale-95"
            >
              <ExternalLink size={12} /> View Source
            </a>
          </div>
          <Sparkles className="absolute -left-10 -bottom-10 text-white/5 w-32 h-32" />
        </div>
      </div>
    );
  }

  if (type === 'google-slides' && slidesId) {
    return (
      <div className="space-y-3">
        <div className="aspect-video w-full rounded-2xl overflow-hidden border-2 border-blue-50 bg-slate-900 shadow-md group/slides relative">
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
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-md active:scale-[0.98]"
        >
          <ExternalLink size={14} />
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
      className={`block p-8 rounded-2xl border-2 border-dashed transition-all text-center group relative overflow-hidden active:scale-[0.98] ${
        type === 'ppt-file' 
          ? 'bg-orange-50/50 border-orange-100 hover:border-orange-400 hover:bg-orange-50' 
          : 'bg-blue-50/50 border-blue-100 hover:border-blue-400 hover:bg-blue-50'
      }`}
    >
      <div className={`w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform relative z-10 ${type === 'ppt-file' ? 'text-orange-600' : ''}`}>
        {getIcon()}
      </div>
      <p className={`text-base font-black mb-1 relative z-10 ${type === 'ppt-file' ? 'text-orange-950' : 'text-blue-900'}`}>{getLabel()}</p>
      <div className="flex items-center justify-center gap-2 relative z-10">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${type === 'ppt-file' ? 'text-orange-400' : 'text-blue-400'}`}>
          {getActionLabel()}
        </p>
        <ExternalLink size={12} className={type === 'ppt-file' ? 'text-orange-300' : 'text-blue-300'} />
      </div>
    </a>
  );
}

function LessonDisplay({ 
  lesson, 
  isMYP, 
  onUpdate,
  curriculum,
  subject,
  year
}: { 
  lesson: LessonPlan; 
  isMYP: boolean;
  onUpdate?: (updated: Partial<LessonPlan>) => void;
  curriculum: string;
  subject: string;
  year: string;
}) {
  const [isRegeneratingStarter, setIsRegeneratingStarter] = useState(false);

  const handleRegenerateStarter = async () => {
    setIsRegeneratingStarter(true);
    try {
      const newStarter = await generateSingleStarter(
        curriculum,
        subject,
        year,
        lesson.topic,
        lesson.learningObjectives
      );
      onUpdate?.({ starter: newStarter });
    } catch (err) {
      console.error("Failed to generate starter:", err);
      alert("Failed to generate starter. Please try again.");
    } finally {
      setIsRegeneratingStarter(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-blue-50/30 border border-blue-100 rounded-3xl p-8 border-l-8 border-l-blue-600 flex justify-between items-start shadow-sm">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md">Lesson {lesson.lessonNumber}</span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-50/50 px-2 py-1 rounded-md">
              <Clock size={12} /> {lesson.duration} mins
            </span>
          </div>
          <input 
            value={lesson.topic}
            onChange={(e) => onUpdate?.({ topic: e.target.value })}
            className="w-full font-serif text-3xl tracking-tight text-blue-900 bg-transparent border-none outline-none focus:ring-0 p-0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <LessonSection title="Learning Objectives" icon={<Target size={18} />} color="blue">
          <div className="space-y-2">
            {lesson.learningObjectives.map((obj, i) => (
              <div key={i} className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-3 shrink-0" />
                <textarea 
                   value={obj}
                   onChange={(e) => {
                     const newObjs = [...lesson.learningObjectives];
                     newObjs[i] = e.target.value;
                     onUpdate?.({ learningObjectives: newObjs });
                   }}
                   onInput={(e: any) => {
                     e.target.style.height = 'auto';
                     e.target.style.height = e.target.scrollHeight + 'px';
                   }}
                   rows={1}
                   className="w-full text-sm text-blue-800 leading-relaxed bg-transparent border-none outline-none focus:ring-0 resize-none p-0 overflow-hidden"
                />
              </div>
            ))}
          </div>
        </LessonSection>
        <LessonSection title="Outcomes" icon={<CheckCircle2 size={18} />} color="green">
          <div className="space-y-2">
            {lesson.learningOutcomes.map((out, i) => (
              <div key={i} className="flex gap-2">
                <Check size={14} className="text-green-500 shrink-0 mt-2" />
                <textarea 
                   value={out}
                   onChange={(e) => {
                     const newOuts = [...lesson.learningOutcomes];
                     newOuts[i] = e.target.value;
                     onUpdate?.({ learningOutcomes: newOuts });
                   }}
                   onInput={(e: any) => {
                     e.target.style.height = 'auto';
                     e.target.style.height = e.target.scrollHeight + 'px';
                   }}
                   rows={1}
                   className="w-full text-sm text-blue-800 leading-relaxed bg-transparent border-none outline-none focus:ring-0 resize-none p-0 overflow-hidden"
                />
              </div>
            ))}
          </div>
        </LessonSection>
      </div>

      <LessonSection 
        title="Hook / Starter" 
        icon={<Zap size={18} />} 
        color="amber"
      >
        <div className="flex justify-between items-center mb-4">
          <p className="text-[10px] text-amber-500 font-bold italic uppercase tracking-wider">Hook Section</p>
          <button 
            onClick={handleRegenerateStarter}
            disabled={isRegeneratingStarter}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black transition-all ${
              isRegeneratingStarter 
              ? 'bg-amber-100 text-amber-400' 
              : 'bg-amber-100 text-amber-600 hover:bg-amber-600 hover:text-white'
            }`}
          >
            {isRegeneratingStarter ? <RotateCcw size={10} className="animate-spin" /> : <Sparkles size={10} />}
            {isRegeneratingStarter ? 'GENERATING...' : lesson.starter ? 'RE-GENERATE STARTER' : 'GENERATE STARTER'}
          </button>
        </div>
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <textarea 
              value={lesson.starter}
              placeholder="Starter will appear here..."
              onChange={(e) => onUpdate?.({ starter: e.target.value })}
              onInput={(e: any) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              rows={3}
              className="w-full text-base text-amber-900 leading-relaxed font-medium bg-transparent border-none outline-none focus:ring-0 resize-none p-0 overflow-hidden"
            />
            <p className="text-xs text-amber-600 mt-4 italic">Note: The entire lesson builds upon this initial hook to maintain student engagement.</p>
          </div>
          <Zap size={120} className="absolute -right-8 -bottom-8 opacity-5 -rotate-12 group-hover:scale-110 transition-transform duration-500" />
        </div>
      </LessonSection>

      <LessonSection title="Notes for Students (10 Key Points)" icon={<PenTool size={18} />} color="teal">
        <div className="p-6 bg-teal-50/30 rounded-2xl border border-teal-100 shadow-sm">
          <div className="space-y-3">
            {lesson.studentNotes?.map((note, i) => (
              <div key={i} className="flex gap-3 items-start group">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500 text-white text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                <textarea 
                  value={note}
                  onChange={(e) => {
                    const newNotes = [...(lesson.studentNotes || [])];
                    newNotes[i] = e.target.value;
                    onUpdate?.({ studentNotes: newNotes });
                  }}
                  onInput={(e: any) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  rows={2}
                  className="w-full text-sm text-teal-900 leading-relaxed bg-transparent border-none outline-none focus:ring-0 resize-none p-0 group-hover:bg-white/50 rounded p-1 transition-colors overflow-hidden"
                />
              </div>
            )) || <p className="text-xs text-teal-400 italic">No notes generated yet.</p>}
          </div>
        </div>
      </LessonSection>

      {isMYP && (
        <LessonSection title="Approaches to Learning (ATL) Skills" icon={<Target size={18} />} color="blue">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {lesson.ATLSkills?.map((skill, i) => (
              <div key={i} className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex gap-3 items-center group">
                <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <textarea 
                  value={skill}
                  onChange={(e) => {
                    const newSkills = [...(lesson.ATLSkills || [])];
                    newSkills[i] = e.target.value;
                    onUpdate?.({ ATLSkills: newSkills });
                  }}
                  rows={1}
                  onInput={(e: any) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  className="w-full text-sm text-blue-900 bg-transparent border-none outline-none focus:ring-0 resize-none p-0 overflow-hidden"
                />
                <button 
                  onClick={() => {
                    const newSkills = lesson.ATLSkills?.filter((_, idx) => idx !== i);
                    onUpdate?.({ ATLSkills: newSkills });
                  }}
                  className="pdf-hide text-blue-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button 
              onClick={() => {
                const newSkills = [...(lesson.ATLSkills || []), 'New ATL Skill'];
                onUpdate?.({ ATLSkills: newSkills });
              }}
              className="pdf-hide p-4 border-2 border-dashed border-blue-100 rounded-xl text-blue-300 hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2 text-xs font-bold"
            >
              <Plus size={14} /> Add ATL Skill
            </button>
          </div>
        </LessonSection>
      )}

      <LessonSection title="Conceptual Focus" icon={<Globe size={18} />} color="purple">
        <textarea 
          value={lesson.conceptualFocus}
          onChange={(e) => onUpdate?.({ conceptualFocus: e.target.value })}
          onInput={(e: any) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          rows={2}
          className="w-full text-sm italic text-purple-600 bg-purple-50 p-4 rounded-xl border border-purple-100 outline-none focus:border-purple-300 resize-none overflow-hidden"
        />
      </LessonSection>

      {isMYP && lesson.soiAndEnquiry && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailBox label="Statement of Inquiry" value={lesson.soiAndEnquiry.soi} onChange={(val) => onUpdate?.({ soiAndEnquiry: { ...lesson.soiAndEnquiry!, soi: val } })} />
          <DetailBox label="Global Context" value={lesson.soiAndEnquiry.globalContext} onChange={(val) => onUpdate?.({ soiAndEnquiry: { ...lesson.soiAndEnquiry!, globalContext: val } })} />
          <DetailBox label="Key Question" value={lesson.soiAndEnquiry.keyQuestion} onChange={(val) => onUpdate?.({ soiAndEnquiry: { ...lesson.soiAndEnquiry!, keyQuestion: val } })} />
          <DetailBox label="Related Concepts" value={lesson.soiAndEnquiry.relatedConcepts} onChange={(val) => onUpdate?.({ soiAndEnquiry: { ...lesson.soiAndEnquiry!, relatedConcepts: val } })} />
        </div>
      )}

      <LessonSection title="Differentiation (Personalized Learning)" icon={<BarChart3 size={18} />} color="amber">
        {lesson.differentiationCAT4 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3">
              <Stat label="Verbal" value={lesson.differentiationCAT4.verbal} onChange={(val) => onUpdate?.({ differentiationCAT4: { ...lesson.differentiationCAT4!, verbal: val } })} />
              <Stat label="Quant" value={lesson.differentiationCAT4.quantitative} onChange={(val) => onUpdate?.({ differentiationCAT4: { ...lesson.differentiationCAT4!, quantitative: val } })} />
              <Stat label="Non-Verbal" value={lesson.differentiationCAT4.nonVerbal} onChange={(val) => onUpdate?.({ differentiationCAT4: { ...lesson.differentiationCAT4!, nonVerbal: val } })} />
              <Stat label="Spatial" value={lesson.differentiationCAT4.spatial} onChange={(val) => onUpdate?.({ differentiationCAT4: { ...lesson.differentiationCAT4!, spatial: val } })} />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <DetailBox label="Tiered Tasks" value={lesson.differentiationCAT4.tieredTasks} onChange={(val) => onUpdate?.({ differentiationCAT4: { ...lesson.differentiationCAT4!, tieredTasks: val } })} />
              <DetailBox label="Choice Board" value={lesson.differentiationCAT4.choiceBoard} onChange={(val) => onUpdate?.({ differentiationCAT4: { ...lesson.differentiationCAT4!, choiceBoard: val } })} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-blue-300 italic">No differentiation data available.</p>
        )}
      </LessonSection>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <LessonSection title="Support" icon={<Accessibility size={18} />} color="blue">
           <textarea 
            value={lesson.senSupport}
            onChange={(e) => onUpdate?.({ senSupport: e.target.value })}
            onInput={(e: any) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            rows={4}
            className="w-full text-sm text-blue-700 leading-relaxed bg-transparent border-none outline-none focus:ring-0 resize-none p-0 overflow-hidden"
          />
        </LessonSection>
        <LessonSection title="Exit" icon={<X size={18} />} color="red">
           <textarea 
            value={lesson.exitSlip}
            onChange={(e) => onUpdate?.({ exitSlip: e.target.value })}
            onInput={(e: any) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            rows={4}
            className="w-full text-sm text-blue-700 leading-relaxed bg-transparent border-none outline-none focus:ring-0 resize-none p-0 overflow-hidden"
          />
        </LessonSection>
        <LessonSection title="HW" icon={<PenTool size={18} />} color="teal">
           <textarea 
            value={lesson.homeAssignment}
            onChange={(e) => onUpdate?.({ homeAssignment: e.target.value })}
            onInput={(e: any) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            rows={4}
            className="w-full text-sm text-blue-700 leading-relaxed bg-transparent border-none outline-none focus:ring-0 resize-none p-0 overflow-hidden"
          />
        </LessonSection>
      </div>

      <LessonSection title="AI-Assisted Learner Task - Exit Slip" icon={<Sparkles size={18} className="text-yellow-500" />} color="yellow">
        <div className="p-5 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 rounded-2xl shadow-sm relative overflow-hidden group">
          <textarea 
            value={lesson.aiAssistedTask}
            onChange={(e) => onUpdate?.({ aiAssistedTask: e.target.value })}
            onInput={(e: any) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            rows={3}
            placeholder="Describe the AI-assisted learning activity..."
            className="w-full text-sm font-medium text-amber-900 leading-relaxed bg-transparent border-none outline-none focus:ring-0 resize-none p-0 overflow-hidden"
          />
          <div className="mt-4 flex items-center justify-between border-t border-yellow-100 pt-3">
            <div className="flex items-center gap-2 px-2 py-1 bg-yellow-400 text-white rounded-lg text-[9px] font-black tracking-widest shadow-md">
              <Zap size={10} /> AI TASK
            </div>
          </div>
        </div>
      </LessonSection>

      <LessonSection title="Resources & Media (Editable)" icon={<Youtube size={18} />} color="red">
        <div className="grid grid-cols-1 gap-8">
          {lesson.youtubeLinks.map((link, i) => {
            const ytId = getYoutubeId(link.url);
            return (
              <div key={i} className="p-6 bg-white border border-blue-100 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row gap-8">
                  {ytId && (
                    <div className="w-full sm:w-96 h-56 rounded-2xl overflow-hidden shrink-0 bg-blue-50 border border-blue-100 shadow-inner group relative">
                      <img 
                        src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`} 
                        alt="Thumbnail" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white shadow-2xl">
                          <Youtube size={32} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Video Title</label>
                      <input 
                        placeholder="Video Title"
                        value={link.title}
                        onChange={(e) => {
                          const newLinks = [...lesson.youtubeLinks];
                          newLinks[i] = { ...link, title: e.target.value };
                          onUpdate?.({ youtubeLinks: newLinks });
                        }}
                        className="w-full text-lg font-bold text-blue-900 border-b border-dashed border-blue-100 focus:border-blue-500 outline-none pb-1 bg-transparent"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">YouTube URL</label>
                      <input 
                        placeholder="URL"
                        value={link.url}
                        onChange={(e) => {
                          const newLinks = [...lesson.youtubeLinks];
                          newLinks[i] = { ...link, url: e.target.value };
                          onUpdate?.({ youtubeLinks: newLinks });
                        }}
                        className="w-full text-sm text-blue-400 border-b border-dashed border-blue-100 focus:border-blue-500 outline-none pb-1 bg-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                    <a href={link.url} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none p-3 text-blue-500 hover:text-white hover:bg-blue-500 border border-blue-200 rounded-xl transition-all flex items-center justify-center">
                      <ExternalLink size={18} />
                    </a>
                    <button 
                      onClick={() => {
                        const newLinks = lesson.youtubeLinks.filter((_, idx) => idx !== i);
                        onUpdate?.({ youtubeLinks: newLinks });
                      }}
                      className="flex-1 sm:flex-none p-3 text-red-500 hover:text-white hover:bg-red-500 border border-red-200 rounded-xl transition-all flex items-center justify-center"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <button 
            onClick={() => {
              const youtubeLinks = lesson.youtubeLinks || [];
              const newLinks = [...youtubeLinks, { title: 'New Resource', url: '', channel: 'Custom' }];
              onUpdate?.({ youtubeLinks: newLinks });
            }}
            className="pdf-hide py-2 border-2 border-dashed border-blue-100 rounded-xl text-xs font-bold text-blue-300 hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Add YouTube Link
          </button>
        </div>
      </LessonSection>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <LessonSection title="Technology Stack (Editable)" icon={<Monitor size={18} />} color="blue">
          <div className="grid grid-cols-1 gap-4">
            {lesson.customAppLink && (
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl space-y-2">
                <div className="flex justify-between">
                  <p className="text-[10px] text-purple-400 uppercase tracking-widest font-bold">Custom App</p>
                  <button 
                    onClick={() => onUpdate?.({ customAppLink: undefined })}
                    className="pdf-hide text-purple-300 hover:text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <input 
                  value={lesson.customAppLink.name}
                  onChange={(e) => onUpdate?.({ customAppLink: { ...lesson.customAppLink!, name: e.target.value } })}
                  className="w-full text-sm font-bold text-purple-900 bg-transparent border-b border-dashed border-purple-200 outline-none"
                />
                <input 
                  value={lesson.customAppLink.url}
                  onChange={(e) => onUpdate?.({ customAppLink: { ...lesson.customAppLink!, url: e.target.value } })}
                  className="w-full text-xs text-purple-400 bg-transparent border-b border-dashed border-purple-200 outline-none"
                />
              </div>
            )}
            
            {lesson.technologyTools && (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {(Object.entries(lesson.technologyTools) as [keyof typeof lesson.technologyTools, TechToolInfo][]).map(([key, tool]) => (
                   <div key={key} className="p-6 bg-white border border-blue-100 rounded-2xl space-y-3 shadow-sm hover:border-blue-300 transition-all group">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-blue-500 uppercase tracking-widest font-black">{key}</p>
                        <ExternalLink size={12} className="text-blue-200 group-hover:text-blue-500" />
                      </div>
                      <input 
                        value={tool.url}
                        onChange={(e) => {
                          const newTools = { ...lesson.technologyTools! };
                          newTools[key] = { ...tool, url: e.target.value };
                          onUpdate?.({ technologyTools: newTools });
                        }}
                        placeholder="Tool URL"
                        className="w-full text-sm text-blue-500 font-medium border-b border-dashed border-blue-100 focus:border-blue-400 outline-none bg-transparent pb-1"
                      />
                      <textarea 
                        value={tool.description}
                        onChange={(e) => {
                          const newTools = { ...lesson.technologyTools! };
                          newTools[key] = { ...tool, description: e.target.value };
                          onUpdate?.({ technologyTools: newTools });
                        }}
                        rows={3}
                        className="w-full text-sm text-blue-800 bg-blue-50/30 rounded-xl p-3 border-none outline-none focus:ring-1 focus:ring-blue-100 resize-none leading-relaxed"
                      />
                   </div>
                 ))}
               </div>
            )}
          </div>
        </LessonSection>

        <LessonSection title="Frayer Model" icon={<BookOpen size={18} />} color="purple">
          <div className="grid grid-cols-2 gap-2">
            <FreyerCell label="Definition" content={lesson.freyerModel.definition} onChange={(val) => onUpdate?.({ freyerModel: { ...lesson.freyerModel, definition: val } })} />
            <FreyerCell label="Examples" content={lesson.freyerModel.examples} onChange={(val) => onUpdate?.({ freyerModel: { ...lesson.freyerModel, examples: val } })} />
            <FreyerCell label="Characteristics" content={lesson.freyerModel.characteristics} onChange={(val) => onUpdate?.({ freyerModel: { ...lesson.freyerModel, characteristics: val } })} />
            <FreyerCell label="Non-Examples" content={lesson.freyerModel.nonExamples} onChange={(val) => onUpdate?.({ freyerModel: { ...lesson.freyerModel, nonExamples: val } })} />
          </div>
        </LessonSection>
      </div>

      <LessonSection title="Slide Structure & Preview" icon={<Sparkles size={18} />} color="amber">
        <div className="space-y-6">
          {(lesson.slideDeckUrl || lesson.notebookLMUrl) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lesson.slideDeckUrl && (
                <div className="space-y-3">
                   <p className="text-[10px] font-black uppercase text-blue-900 tracking-widest px-1">Slide Deck</p>
                   <SlidePreviewCard url={lesson.slideDeckUrl} />
                </div>
              )}
              {lesson.notebookLMUrl && (
                <div className="space-y-3">
                   <p className="text-[10px] font-black uppercase text-blue-900 tracking-widest px-1">NotebookLM Guide</p>
                   <SlidePreviewCard url={lesson.notebookLMUrl} />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-blue-300 tracking-widest px-1">Planned Slide content</p>
            <textarea 
              value={lesson.slides}
              onChange={(e) => onUpdate?.({ slides: e.target.value })}
              rows={8}
              className="w-full text-sm text-blue-400 leading-loose bg-blue-50/20 p-6 rounded-xl border border-blue-50 outline-none focus:border-blue-200"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-blue-50">
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Google Slides Link</label>
              </div>
              <input 
                value={lesson.slideDeckUrl || ''}
                onChange={(e) => onUpdate?.({ slideDeckUrl: e.target.value })}
                className="w-full py-2 px-4 bg-white border border-blue-100 rounded-xl text-xs text-blue-600 outline-none focus:border-blue-300 font-mono"
                placeholder="Paste Google Slides link"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">NotebookLM Slide Deck</label>
              </div>
              <input 
                value={lesson.notebookLMUrl || ''}
                onChange={(e) => onUpdate?.({ notebookLMUrl: e.target.value })}
                className="w-full py-2 px-4 bg-white border border-blue-100 rounded-xl text-xs text-blue-600 outline-none focus:border-blue-300 font-mono"
                placeholder="Paste NotebookLM link"
              />
            </div>
          </div>
        </div>
      </LessonSection>
    </div>
  );
}

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
      <textarea 
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        rows={1}
        className="flex-1 text-sm text-blue-800 leading-relaxed font-medium bg-transparent border-none outline-none focus:ring-0 resize-none p-0 overflow-hidden"
      />
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
      <textarea 
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        rows={2}
        className="w-full text-sm text-blue-800 italic leading-relaxed bg-transparent border-none outline-none focus:ring-0 resize-none p-0 overflow-hidden"
      />
    </div>
  );
}

function TechItem({ tool }: { tool: TechToolInfo }) {
  const iconMap: Record<string, string> = {
    'Mentimeter': '📊',
    'Quizizz': '❓',
    'Blooket': '🎮',
    'Padlet': '📌',
    'Simulations': '🧪'
  };
  return (
    <div className="space-y-3 group bg-blue-50/10 p-4 rounded-2xl border border-blue-50/50 hover:border-blue-200 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{iconMap[tool.name] || '🛠️'}</span>
          <span className="text-base font-bold text-blue-900">{tool.name}</span>
        </div>
        <a 
          href={tool.url} 
          target="_blank" 
          rel="noreferrer" 
          className="p-1.5 bg-white shadow-sm border border-blue-100 rounded-lg text-blue-400 hover:text-blue-600 hover:border-blue-300 transition-all"
        >
          <ExternalLink size={14} />
        </a>
      </div>
      <p className="text-xs text-blue-600/80 leading-relaxed italic border-l-2 border-blue-200 pl-3">{tool.description}</p>
    </div>
  );
}

function FreyerCell({ label, content, onChange }: { label: string; content: string; onChange?: (val: string) => void }) {
  return (
    <div className="bg-blue-50/30 border border-blue-50 rounded-2xl p-4 flex flex-col gap-1.5 hover:border-blue-100 transition-all shadow-sm">
      <span className="text-xs font-bold uppercase tracking-widest text-blue-300">{label}</span>
      <textarea 
        value={content}
        onChange={(e) => onChange?.(e.target.value)}
        rows={3}
        className="w-full text-sm leading-relaxed text-blue-800 bg-transparent border-none outline-none focus:ring-0 resize-none p-0"
      />
    </div>
  );
}
