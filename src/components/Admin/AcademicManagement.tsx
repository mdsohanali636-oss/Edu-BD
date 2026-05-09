import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  ChevronRight, 
  LayoutGrid, 
  BookOpen, 
  Library,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Settings2,
  ArrowUpDown,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Firestore 
} from 'firebase/firestore';
import { AcademicClassInfo, AcademicSubject, AcademicChapter, AcademicTopic } from '../../types';
import { Button, Card, Badge } from '../ui/Base';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  db: Firestore;
}

export const AcademicManagement: React.FC<Props> = ({ db }) => {
  const [classes, setClasses] = useState<AcademicClassInfo[]>([]);
  const [subjects, setSubjects] = useState<AcademicSubject[]>([]);
  const [chapters, setChapters] = useState<AcademicChapter[]>([]);
  const [topics, setTopics] = useState<AcademicTopic[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', active: true, order: 0 });
  const [topicTags, setTopicTags] = useState<string[]>([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchSubjects(selectedClassId);
      setSelectedSubjectId(null);
      setChapters([]);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedSubjectId) {
      fetchChapters(selectedSubjectId);
      setSelectedChapterId(null);
      setTopics([]);
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    if (selectedChapterId) {
      fetchTopics(selectedChapterId);
    }
  }, [selectedChapterId]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'academic_classes'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as AcademicClassInfo)));
    } catch (err) {
      console.error("Error fetching classes:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async (classId: string) => {
    try {
      const q = query(
        collection(db, 'subjects'), 
        where('classId', '==', classId),
        orderBy('order', 'asc')
      );
      const snap = await getDocs(q);
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as AcademicSubject)));
    } catch (err) {
      console.error("Error fetching subjects:", err);
    }
  };

  const fetchChapters = async (subjectId: string) => {
    try {
      const q = query(
        collection(db, 'chapters'), 
        where('subjectId', '==', subjectId),
        orderBy('order', 'asc')
      );
      const snap = await getDocs(q);
      setChapters(snap.docs.map(d => ({ id: d.id, ...d.data() } as AcademicChapter)));
    } catch (err) {
      console.error("Error fetching chapters:", err);
    }
  };

  const fetchTopics = async (chapterId: string) => {
    try {
      const q = query(
        collection(db, 'topics'), 
        where('chapterId', '==', chapterId),
        orderBy('order', 'asc')
      );
      const snap = await getDocs(q);
      setTopics(snap.docs.map(d => ({ id: d.id, ...d.data() } as AcademicTopic)));
    } catch (err) {
      console.error("Error fetching topics:", err);
    }
  };

  const handleSaveClass = async () => {
    if (!formData.name.trim()) return;
    
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'academic_classes', editingItem.id), {
          ...formData,
          updatedAt: Date.now()
        });
      } else {
        await addDoc(collection(db, 'academic_classes'), {
          ...formData,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      fetchClasses();
      setIsClassModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', active: true, order: 0 });
    } catch (err) {
      console.error("Error saving class:", err);
    }
  };

  const handleSaveSubject = async () => {
    if (!formData.name.trim() || !selectedClassId) return;
    
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'subjects', editingItem.id), {
          ...formData,
          updatedAt: Date.now()
        });
      } else {
        await addDoc(collection(db, 'subjects'), {
          ...formData,
          classId: selectedClassId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      fetchSubjects(selectedClassId);
      setIsSubjectModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', active: true, order: 0 });
    } catch (err) {
      console.error("Error saving subject:", err);
    }
  };

  const handleSaveChapter = async () => {
    if (!formData.name.trim() || !selectedClassId || !selectedSubjectId) return;
    
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'chapters', editingItem.id), {
          ...formData,
          updatedAt: Date.now()
        });
      } else {
        await addDoc(collection(db, 'chapters'), {
          ...formData,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      fetchChapters(selectedSubjectId);
      setIsChapterModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', active: true, order: 0 });
    } catch (err) {
      console.error("Error saving chapter:", err);
    }
  };

  const handleSaveTopic = async () => {
    if (!formData.name.trim() || !selectedClassId || !selectedSubjectId || !selectedChapterId) return;
    
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'topics', editingItem.id), {
          ...formData,
          tags: topicTags,
          updatedAt: Date.now()
        });
      } else {
        await addDoc(collection(db, 'topics'), {
          ...formData,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          chapterId: selectedChapterId,
          tags: topicTags,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      fetchTopics(selectedChapterId);
      setIsTopicModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', active: true, order: 0 });
      setTopicTags([]);
    } catch (err) {
      console.error("Error saving topic:", err);
    }
  };

  const handleDelete = async (type: 'class' | 'subject' | 'chapter' | 'topic', id: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}? This might affect existing data.`)) return;
    
    try {
      const collectionName = 
        type === 'class' ? 'academic_classes' : 
        type === 'subject' ? 'subjects' : 
        type === 'chapter' ? 'chapters' : 'topics';
      await deleteDoc(doc(db, collectionName, id));
      
      if (type === 'class') {
        fetchClasses();
        if (selectedClassId === id) setSelectedClassId(null);
      } else if (type === 'subject') {
        if (selectedClassId) fetchSubjects(selectedClassId);
        if (selectedSubjectId === id) setSelectedSubjectId(null);
      } else if (type === 'chapter') {
        if (selectedSubjectId) fetchChapters(selectedSubjectId);
        if (selectedChapterId === id) setSelectedChapterId(null);
      } else {
        if (selectedChapterId) fetchTopics(selectedChapterId);
      }
    } catch (err) {
      console.error(`Error deleting ${type}:`, err);
    }
  };

  const renderModal = (type: 'class' | 'subject' | 'chapter' | 'topic', isOpen: boolean, onClose: () => void, onSave: () => void) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                {editingItem ? `Edit ${type}` : `Add New ${type}`}
              </h3>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <X size={20} className="text-zinc-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder={`Enter ${type} name`}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl p-4 text-zinc-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {type === 'topic' && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Tags (Customizable)</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {['Easy', 'Medium', 'Hard', 'Important', 'Board Favorite', 'Frequently Repeated'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (topicTags.includes(tag)) {
                            setTopicTags(topicTags.filter(t => t !== tag));
                          } else {
                            setTopicTags([...topicTags, tag]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                          topicTags.includes(tag)
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Sort Order</label>
                  <input 
                    type="number" 
                    value={formData.order}
                    onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl p-4 text-zinc-900 dark:text-white font-bold"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Status</label>
                  <button 
                    onClick={() => setFormData({...formData, active: !formData.active})}
                    className={`w-full flex items-center justify-center gap-2 p-4 rounded-2xl font-bold transition-all ${
                      formData.active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}
                  >
                    {formData.active ? <Eye size={18} /> : <EyeOff size={18} />}
                    {formData.active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 pt-4">
              <Button variant="ghost" onClick={onClose} className="flex-1 rounded-2xl py-6 font-black uppercase tracking-widest">Cancel</Button>
              <Button onClick={onSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-6 font-black uppercase tracking-widest shadow-xl shadow-blue-500/20">
                {editingItem ? 'Update' : 'Save'} {type}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        
        {/* Classes Column */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center">
                <LayoutGrid size={20} />
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Classes</h3>
            </div>
            <Button 
              size="sm" 
              onClick={() => {
                setEditingItem(null);
                setFormData({ name: '', active: true, order: classes.length });
                setIsClassModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              <Plus size={18} />
            </Button>
          </div>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {classes.map((cls) => (
              <div 
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className={`w-full p-4 rounded-[24px] text-left transition-all border group cursor-pointer ${
                  selectedClassId === cls.id 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-500/20' 
                    : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-white hover:border-blue-500/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black opacity-40">#{cls.order}</span>
                    <span className="font-bold tracking-tight text-sm">{cls.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(cls);
                          setFormData({ name: cls.name, active: cls.active, order: cls.order });
                          setIsClassModalOpen(true);
                        }}
                        className={`p-1.5 hover:bg-white/20 rounded-lg ${selectedClassId === cls.id ? 'text-white' : 'text-zinc-400'}`}
                      >
                        <Pencil size={12} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete('class', cls.id);
                        }}
                        className={`p-1.5 hover:bg-white/20 rounded-lg ${selectedClassId === cls.id ? 'text-white' : 'text-zinc-400'}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <ChevronRight size={16} className={selectedClassId === cls.id ? 'text-white' : 'text-zinc-300'} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subjects Column */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center">
                <BookOpen size={20} />
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Subjects</h3>
            </div>
            {selectedClassId && (
              <Button 
                size="sm" 
                onClick={() => {
                  setEditingItem(null);
                  setFormData({ name: '', active: true, order: subjects.length });
                  setIsSubjectModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              >
                <Plus size={18} />
              </Button>
            )}
          </div>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {!selectedClassId ? (
              <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-800/50 rounded-[32px] border border-zinc-100 dark:border-zinc-800">
                <p className="text-zinc-500 text-[10px] font-bold">Select class</p>
              </div>
            ) : (
              subjects.map((sub) => (
                <div 
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`w-full p-4 rounded-[24px] text-left transition-all border group cursor-pointer ${
                    selectedSubjectId === sub.id 
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-500/20' 
                      : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-white hover:border-emerald-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black opacity-40">#{sub.order}</span>
                      <span className="font-bold tracking-tight text-sm">{sub.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem(sub);
                            setFormData({ name: sub.name, active: sub.active, order: sub.order });
                            setIsSubjectModalOpen(true);
                          }}
                          className={`p-1.5 rounded-lg ${selectedSubjectId === sub.id ? 'text-white' : 'text-zinc-400'}`}
                        >
                          <Pencil size={12} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete('subject', sub.id);
                          }}
                          className={`p-1.5 rounded-lg ${selectedSubjectId === sub.id ? 'text-white' : 'text-zinc-400'}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <ChevronRight size={16} className={selectedSubjectId === sub.id ? 'text-white' : 'text-zinc-300'} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chapters Column */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 text-purple-600 rounded-xl flex items-center justify-center">
                <Library size={20} />
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Chapters</h3>
            </div>
            {selectedSubjectId && (
              <Button 
                size="sm" 
                onClick={() => {
                  setEditingItem(null);
                  setFormData({ name: '', active: true, order: chapters.length });
                  setIsChapterModalOpen(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
              >
                <Plus size={18} />
              </Button>
            )}
          </div>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {!selectedSubjectId ? (
              <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-800/50 rounded-[32px] border border-zinc-100 dark:border-zinc-800">
                <p className="text-zinc-500 text-[10px] font-bold">Select subject</p>
              </div>
            ) : (
              chapters.map((ch) => (
                <div 
                  key={ch.id}
                  onClick={() => setSelectedChapterId(ch.id)}
                  className={`w-full p-4 rounded-[24px] text-left transition-all border group cursor-pointer ${
                    selectedChapterId === ch.id 
                      ? 'bg-purple-600 border-purple-500 text-white shadow-xl shadow-purple-500/20' 
                      : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-white hover:border-purple-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black opacity-40">#{ch.order}</span>
                      <span className="font-bold tracking-tight text-sm">{ch.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem(ch);
                            setFormData({ name: ch.name, active: ch.active, order: ch.order });
                            setIsChapterModalOpen(true);
                          }}
                          className={`p-1.5 rounded-lg ${selectedChapterId === ch.id ? 'text-white' : 'text-zinc-400'}`}
                        >
                          <Pencil size={12} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete('chapter', ch.id);
                          }}
                          className={`p-1.5 rounded-lg ${selectedChapterId === ch.id ? 'text-white' : 'text-zinc-400'}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <ChevronRight size={16} className={selectedChapterId === ch.id ? 'text-white' : 'text-zinc-300'} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Topics Column */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Topics</h3>
            </div>
            {selectedChapterId && (
              <Button 
                size="sm" 
                onClick={() => {
                  setEditingItem(null);
                  setFormData({ name: '', active: true, order: topics.length });
                  setTopicTags([]);
                  setIsTopicModalOpen(true);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
              >
                <Plus size={18} />
              </Button>
            )}
          </div>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {!selectedChapterId ? (
              <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-800/50 rounded-[32px] border border-zinc-100 dark:border-zinc-800">
                <p className="text-zinc-500 text-[10px] font-bold">Select chapter</p>
              </div>
            ) : (
              topics.map((tp) => (
                <div 
                  key={tp.id}
                  className="w-full p-4 rounded-[24px] bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 group hover:border-amber-500/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-zinc-400">#{tp.order}</span>
                      <span className="font-bold text-zinc-900 dark:text-white tracking-tight text-sm">{tp.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          setEditingItem(tp);
                          setFormData({ name: tp.name, active: tp.active, order: tp.order });
                          setTopicTags(tp.tags || []);
                          setIsTopicModalOpen(true);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-amber-500 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete('topic', tp.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {tp.tags && tp.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tp.tags.map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-widest leading-none">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Modals */}
      {renderModal('class', isClassModalOpen, () => setIsClassModalOpen(false), handleSaveClass)}
      {renderModal('subject', isSubjectModalOpen, () => setIsSubjectModalOpen(false), handleSaveSubject)}
      {renderModal('chapter', isChapterModalOpen, () => setIsChapterModalOpen(false), handleSaveChapter)}
      {renderModal('topic', isTopicModalOpen, () => setIsTopicModalOpen(false), handleSaveTopic)}
    </div>
  );
};
