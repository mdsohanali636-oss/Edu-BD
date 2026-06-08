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
  Sparkles,
  RefreshCw,
  RefreshCcw
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { AcademicClassInfo, AcademicSubject, AcademicChapter, AcademicTopic } from '../../types';
import { Button, Card, Badge } from '../ui/Base';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onDataChanged?: () => void;
}

export const AcademicManagement: React.FC<Props> = ({ onDataChanged }) => {
  const [classes, setClasses] = useState<AcademicClassInfo[]>([]);
  const [subjects, setSubjects] = useState<AcademicSubject[]>([]);
  const [chapters, setChapters] = useState<AcademicChapter[]>([]);
  const [topics, setTopics] = useState<AcademicTopic[]>([]);
  const [academicGroups, setAcademicGroups] = useState<any[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    type: 'class' | 'group' | 'subject' | 'chapter' | 'topic';
    id: string;
    name: string;
  } | null>(null);
  
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<{
    name: string;
    active: boolean;
    order: number;
    academicGroup: string;
    hasGroups?: boolean;
  }>({ 
    name: '', 
    active: true, 
    order: 0, 
    academicGroup: 'All',
    hasGroups: false
  });
  const [topicTags, setTopicTags] = useState<string[]>([]);

  useEffect(() => {
    fetchClasses();
    fetchAcademicGroups();
  }, []);

  const fetchAcademicGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('academic_groups')
        .select('*')
        .order('order', { ascending: true });
      if (error) throw error;
      setAcademicGroups(data || []);
    } catch (err: any) {
      console.error("Error fetching academic groups:", err);
      showStatus('error', "Error fetching groups: " + err.message);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchSubjects(selectedClassId);
      setSelectedSubjectId(null);
      setChapters([]);
    } else {
      setSubjects([]);
      setSelectedSubjectId(null);
      setChapters([]);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedSubjectId) {
      fetchChapters(selectedSubjectId);
      setSelectedChapterId(null);
      setTopics([]);
    } else {
      setChapters([]);
      setSelectedChapterId(null);
      setTopics([]);
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    if (selectedChapterId) {
      fetchTopics(selectedChapterId);
    } else {
      setTopics([]);
    }
  }, [selectedChapterId]);

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('academic_classes')
        .select('*')
        .order('order', { ascending: true });
      if (error) {
        if (error.code === '42P01') {
          showStatus('error', "The 'academic_classes' table does not exist. Please run the SQL script I provided.");
          return;
        }
        throw error;
      }
      
      const mapped = (data || []).map(item => ({
        ...item,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
      setClasses(mapped as AcademicClassInfo[]);
    } catch (err: any) {
      console.error("Error fetching classes:", err);
      showStatus('error', "Error fetching classes: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('class_id', classId)
        .order('order', { ascending: true });
        
      if (error) {
        if (error.code === '42P01') {
          showStatus('error', "The 'subjects' table does not exist. Please create it.");
          return;
        }
        throw error;
      }
      
      const mapped = (data || []).map(item => ({
        ...item,
        classId: item.class_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
      setSubjects(mapped as any[]);
    } catch (err: any) {
      console.error("Error fetching subjects:", err);
      showStatus('error', "Error fetching subjects: " + err.message);
    }
  };

  const fetchChapters = async (subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('subject_id', subjectId)
        .order('order', { ascending: true });
        
      if (error) {
        if (error.code === '42P01') {
          showStatus('error', "The 'chapters' table does not exist.");
          return;
        }
        throw error;
      }
      
      const mapped = (data || []).map(item => ({
        ...item,
        subjectId: item.subject_id,
        classId: item.class_id,
        mcqCount: item.mcq_count,
        writtenCount: item.written_count,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
      setChapters(mapped as any[]);
    } catch (err: any) {
      console.error("Error fetching chapters:", err);
      showStatus('error', "Error fetching chapters: " + err.message);
    }
  };

  const fetchTopics = async (chapterId: string) => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('order', { ascending: true });
        
      if (error) {
        if (error.code === '42P01') {
          showStatus('error', "The 'topics' table does not exist.");
          return;
        }
        throw error;
      }
      
      const mapped = (data || []).map(item => ({
        ...item,
        chapterId: item.chapter_id,
        subjectId: item.subject_id,
        classId: item.class_id,
        mcqCount: item.mcq_count,
        writtenCount: item.written_count,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
      setTopics(mapped as any[]);
    } catch (err: any) {
      console.error("Error fetching topics:", err);
      showStatus('error', "Error fetching topics: " + err.message);
    }
  };

  const handleSaveClass = async () => {
    if (!formData.name.trim()) {
      showStatus('error', "Please enter a name for the class.");
      return;
    }
    
    const trimmedName = formData.name.trim().toLowerCase();
    const isDuplicate = classes.some(c => 
      c.name.trim().toLowerCase() === trimmedName && (!editingItem || c.id !== editingItem.id)
    );
    if (isDuplicate) {
      showStatus('error', `A class named "${formData.name.trim()}" already exists.`);
      return;
    }
    
    setSaveLoading(true);
    try {
      const classPayload = {
        name: formData.name,
        active: formData.active,
        "order": formData.order,
        has_groups: formData.hasGroups,
        updated_at: new Date().toISOString()
      };

      if (editingItem) {
        const { error } = await supabase
          .from('academic_classes')
          .update(classPayload)
          .eq('id', editingItem.id);
        if (error) throw error;
        showStatus('success', "Class updated successfully!");
      } else {
        const { error } = await supabase
          .from('academic_classes')
          .insert([{
            ...classPayload,
            created_at: new Date().toISOString()
          }]);
        if (error) throw error;
        showStatus('success', "Class added successfully!");
      }
      await fetchClasses();
      onDataChanged?.();
      setIsClassModalOpen(false);
      setIsGroupModalOpen(false);
      setEditingItem(null);
      setFormData({ 
        name: '', 
        active: true, 
        order: classes.length + 1, 
        academicGroup: 'All',
        hasGroups: false
      });
    } catch (err: any) {
      console.error("Error saving class:", err);
      // Check for specific Supabase errors
      if (err.code === '42501') {
        showStatus('error', "Permission Denied: Ensure your account has 'admin' role in Supabase profiles table.");
      } else if (err.code === '23505') {
        showStatus('error', "A class with this name or order already exists.");
      } else {
        showStatus('error', `Save Failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveGroup = async () => {
    if (!formData.name.trim()) {
      showStatus('error', "Please enter a group name.");
      return;
    }
    
    const trimmedName = formData.name.trim().toLowerCase();
    const isDuplicate = academicGroups.some(g => 
      g.name.trim().toLowerCase() === trimmedName && (!editingItem || g.id !== editingItem.id)
    );
    if (isDuplicate) {
      showStatus('error', `A group named "${formData.name.trim()}" already exists.`);
      return;
    }
    
    setSaveLoading(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('academic_groups')
          .update({
            name: formData.name,
            active: formData.active,
            "order": formData.order
          })
          .eq('id', editingItem.id);
        if (error) throw error;
        showStatus('success', "Group updated successfully!");
      } else {
        const { error } = await supabase
          .from('academic_groups')
          .insert([{
            name: formData.name,
            active: formData.active,
            "order": formData.order
          }]);
        if (error) throw error;
        showStatus('success', "Group added successfully!");
      }
      await fetchAcademicGroups();
      onDataChanged?.();
      setIsGroupModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', active: true, order: 0, academicGroup: 'All' });
    } catch (err: any) {
      console.error("Error saving group:", err);
      showStatus('error', err.message || "Failed to save group.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveSubject = async () => {
    if (!formData.name.trim()) {
      showStatus('error', "Please enter a subject name.");
      return;
    }
    if (!selectedClassId) {
      showStatus('error', "No class selected!");
      return;
    }
    
    const trimmedName = formData.name.trim().toLowerCase();
    const isDuplicate = subjects.some(s => 
      s.name.trim().toLowerCase() === trimmedName && (!editingItem || s.id !== editingItem.id)
    );
    if (isDuplicate) {
      showStatus('error', `A subject named "${formData.name.trim()}" already exists under this class.`);
      return;
    }
    
    setSaveLoading(true);
    try {
      // Normalize selected IDs to ensure they are UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      let actualClassId = selectedClassId;
      if (actualClassId && !uuidRegex.test(actualClassId)) {
        const found = classes.find(c => c.name === actualClassId);
        if (found) actualClassId = found.id;
      }

      // Find the actual class UUID
      const currentClass = classes.find(c => c.id === actualClassId);
      const finalClassId = currentClass?.id;

      if (!finalClassId) {
        showStatus('error', "Valid Class selection (UUID) is required to save subjects. Please re-select the class.");
        setSaveLoading(false);
        return;
      }

      if (editingItem) {
        const { error } = await supabase
          .from('subjects')
          .update({
            name: formData.name,
            active: formData.active,
            "order": formData.order,
            academic_group: formData.academicGroup,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id);
        if (error) throw error;
        showStatus('success', "Subject updated successfully!");
      } else {
        const { error } = await supabase
          .from('subjects')
          .insert([{
            name: formData.name,
            active: formData.active,
            "order": formData.order,
            class_id: finalClassId,
            academic_group: formData.academicGroup,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        if (error) throw error;
        showStatus('success', "Subject added successfully!");
      }
      if (finalClassId) await fetchSubjects(finalClassId);
      onDataChanged?.();
      setIsSubjectModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', active: true, order: 0, academicGroup: 'All' });
    } catch (err: any) {
      console.error("Error saving subject:", err);
      if (err.code === '42501') {
        showStatus('error', "Permission Denied: Check your role in Supabase profiles.");
      } else {
        showStatus('error', "Failed: " + (err.message || 'Unknown error'));
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveChapter = async () => {
    if (!formData.name.trim()) {
      showStatus('error', "Please enter a chapter name.");
      return;
    }
    if (!selectedClassId || !selectedSubjectId) {
      showStatus('error', "Please select a class and subject first.");
      return;
    }
    
    const trimmedName = formData.name.trim().toLowerCase();
    const isDuplicate = chapters.some(c => 
      c.name.trim().toLowerCase() === trimmedName && (!editingItem || c.id !== editingItem.id)
    );
    if (isDuplicate) {
      showStatus('error', `A chapter named "${formData.name.trim()}" already exists under this subject.`);
      return;
    }
    
    setSaveLoading(true);
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      let actualClassId = selectedClassId;
      if (actualClassId && !uuidRegex.test(actualClassId)) {
        const found = classes.find(c => c.name === actualClassId);
        if (found) actualClassId = found.id;
      }
      
      let actualSubjectId = selectedSubjectId;
      if (actualSubjectId && !uuidRegex.test(actualSubjectId)) {
        const found = subjects.find(s => s.name === actualSubjectId);
        if (found) actualSubjectId = found.id;
      }

      if (!actualClassId || !actualSubjectId) {
        showStatus('error', "Valid Class and Subject selection (UUIDs) are required to save chapters.");
        setSaveLoading(false);
        return;
      }

      if (editingItem) {
        const { error } = await supabase
          .from('chapters')
          .update({
            name: formData.name,
            active: formData.active,
            "order": formData.order,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id);
        if (error) throw error;
        showStatus('success', "Chapter updated successfully!");
      } else {
        const { error } = await supabase
          .from('chapters')
          .insert([{
            name: formData.name,
            active: formData.active,
            "order": formData.order,
            class_id: actualClassId,
            subject_id: actualSubjectId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        if (error) throw error;
        showStatus('success', "Chapter added successfully!");
      }
      if (actualSubjectId) await fetchChapters(actualSubjectId);
      onDataChanged?.();
      setIsChapterModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', active: true, order: 0, academicGroup: 'All' });
    } catch (err: any) {
      console.error("Error saving chapter:", err);
      if (err.code === '42501') {
        showStatus('error', "Permission Denied: Check your role in Supabase profiles.");
      } else {
        showStatus('error', "Failed: " + (err.message || 'Unknown error'));
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveTopic = async () => {
    if (!formData.name.trim()) {
      showStatus('error', "Please enter a topic name.");
      return;
    }
    if (!selectedClassId || !selectedSubjectId || !selectedChapterId) {
      showStatus('error', "Selection missing! Make sure Class, Subject, and Chapter are selected.");
      return;
    }
    
    const trimmedName = formData.name.trim().toLowerCase();
    const isDuplicate = topics.some(t => 
      t.name.trim().toLowerCase() === trimmedName && (!editingItem || t.id !== editingItem.id)
    );
    if (isDuplicate) {
      showStatus('error', `A topic named "${formData.name.trim()}" already exists under this chapter.`);
      return;
    }
    
    setSaveLoading(true);
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      let actualClassId = selectedClassId;
      if (actualClassId && !uuidRegex.test(actualClassId)) {
        const found = classes.find(c => c.name === actualClassId);
        if (found) actualClassId = found.id;
      }
      
      let actualSubjectId = selectedSubjectId;
      if (actualSubjectId && !uuidRegex.test(actualSubjectId)) {
        const found = subjects.find(s => s.name === actualSubjectId);
        if (found) actualSubjectId = found.id;
      }
      
      let actualChapterId = selectedChapterId;
      if (actualChapterId && !uuidRegex.test(actualChapterId)) {
        const found = chapters.find(c => c.name === actualChapterId);
        if (found) actualChapterId = found.id;
      }

      if (!actualClassId || !actualSubjectId || !actualChapterId) {
        showStatus('error', "Selection missing! Make sure Class, Subject, and Chapter are selected.");
        setSaveLoading(false);
        return;
      }

      if (editingItem) {
        const { error } = await supabase
          .from('topics')
          .update({
            name: formData.name,
            active: formData.active,
            "order": formData.order,
            tags: topicTags,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id);
        if (error) throw error;
        showStatus('success', "Topic updated successfully!");
      } else {
        const { error } = await supabase
          .from('topics')
          .insert([{
            name: formData.name,
            active: formData.active,
            "order": formData.order,
            class_id: actualClassId,
            subject_id: actualSubjectId,
            chapter_id: actualChapterId,
            tags: topicTags,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        if (error) throw error;
        showStatus('success', "Topic added successfully!");
      }
      if (actualChapterId) await fetchTopics(actualChapterId);
      onDataChanged?.();
      setIsTopicModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', active: true, order: 0, academicGroup: 'All' });
      setTopicTags([]);
    } catch (err: any) {
      console.error("Error saving topic:", err);
      if (err.code === '42501') {
        showStatus('error', "Permission Denied: Check your role in Supabase profiles.");
      } else {
        showStatus('error', "Failed: " + (err.message || 'Unknown error'));
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (type: 'class' | 'group' | 'subject' | 'chapter' | 'topic', id: string) => {
    if (!id) return;
    
    let actualId = id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // If id doesn't look like a UUID, try to find it in our state
    if (!uuidRegex.test(id)) {
      if (type === 'class') {
        const found = classes.find(c => c.name === id || c.id === id);
        if (found) actualId = found.id;
      } else if (type === 'group') {
        const found = academicGroups.find(g => g.name === id || g.id === id);
        if (found) actualId = found.id;
      } else if (type === 'subject') {
        const found = subjects.find(s => s.name === id || s.id === id);
        if (found) actualId = found.id;
      } else if (type === 'chapter') {
        const found = chapters.find(c => c.name === id || c.id === id);
        if (found) actualId = found.id;
      } else if (type === 'topic') {
        const found = topics.find(t => t.name === id || t.id === id);
        if (found) actualId = found.id;
      }
    }

    // Still not a UUID? We can't delete by id.
    if (!uuidRegex.test(actualId)) {
      console.error(`Cannot delete ${type}: ID "${actualId}" is not a valid UUID.`);
      showStatus('error', `Invalid ID format for ${type}. Try refreshing and deleting again.`);
      setDeleteConfirm(null);
      return;
    }

    setLoading(true);
    try {
      const collectionName = 
        type === 'class' ? 'academic_classes' : 
        type === 'group' ? 'academic_groups' :
        type === 'subject' ? 'subjects' : 
        type === 'chapter' ? 'chapters' : 'topics';
      
      const { error } = await supabase
        .from(collectionName)
        .delete()
        .eq('id', actualId);
        
      if (error) {
        console.error(`Supabase Delete Error [${error.code}]:`, error.message);
        throw error;
      }
      
      showStatus('success', `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.`);
      
      if (type === 'class') {
        await fetchClasses();
        if (selectedClassId === actualId || selectedClassId === id) setSelectedClassId(null);
      } else if (type === 'group') {
        await fetchAcademicGroups();
      } else if (type === 'subject') {
        const currentClass = classes.find(c => c.id === selectedClassId || c.name === selectedClassId);
        const actualClassId = currentClass ? currentClass.id : selectedClassId;
        if (actualClassId) await fetchSubjects(actualClassId);
        if (selectedSubjectId === actualId || selectedSubjectId === id) setSelectedSubjectId(null);
      } else if (type === 'chapter') {
        const currentSubject = subjects.find(s => s.id === selectedSubjectId || s.name === selectedSubjectId);
        const actualSubjectId = currentSubject ? currentSubject.id : selectedSubjectId;
        if (actualSubjectId) await fetchChapters(actualSubjectId);
        if (selectedChapterId === actualId || selectedChapterId === id) setSelectedChapterId(null);
      } else {
        const currentChapter = chapters.find(c => c.id === selectedChapterId || c.name === selectedChapterId);
        const actualChapterId = currentChapter ? currentChapter.id : selectedChapterId;
        if (actualChapterId) await fetchTopics(actualChapterId);
      }
      onDataChanged?.();
    } catch (err: any) {
      console.error(`Error deleting ${type}:`, err);
      if (err.code === '23503') {
        showStatus('error', `Cannot delete this ${type} because it has dependent items. Please delete its subjects/chapters/topics first.`);
      } else if (err.code === '42501') {
        showStatus('error', "Permission Denied: Ensure you have admin rights in your Supabase profile.");
      } else {
        showStatus('error', `Delete Failed: ${err.message || 'Unknown database error'}`);
      }
    } finally {
      setLoading(false);
      setDeleteConfirm(null);
    }
  };

  const renderDeleteConfirmationModal = () => {
    if (!deleteConfirm || !deleteConfirm.show) return null;

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl border border-red-500/20"
        >
          <div className="p-10 space-y-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-2">
                <Trash2 size={40} />
              </div>
              <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Confirm Delete?</h3>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                Are you sure you want to delete <span className="text-red-500 font-bold">"{deleteConfirm.name}"</span>? 
                This action is permanent and might break existing content links.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button 
                variant="danger" 
                onClick={() => handleDelete(deleteConfirm.type, deleteConfirm.id)}
                disabled={loading}
                className="w-full rounded-2xl py-7 text-lg font-black uppercase tracking-widest shadow-xl shadow-red-500/20"
              >
                {loading ? <RefreshCcw className="animate-spin mr-2" /> : <Trash2 className="mr-2" />}
                Yes, Delete it
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setDeleteConfirm(null)}
                className="w-full rounded-2xl py-6 font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600"
              >
                Cancel
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderModal = (type: 'class' | 'group' | 'subject' | 'chapter' | 'topic', isOpen: boolean, onClose: () => void, onSave: () => void) => {
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
              {/* Dropdown selection handling */}
              {(type === 'subject' || type === 'chapter' || type === 'topic') && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Class</label>
                  <select 
                    value={selectedClassId || ''}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl p-4 text-zinc-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                  >
                    <option value="" disabled>Select a class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {(type === 'chapter' || type === 'topic') && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Subject</label>
                  <select 
                    value={selectedSubjectId || ''}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl p-4 text-zinc-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                    disabled={!selectedClassId}
                  >
                    <option value="" disabled>Select a subject</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {type === 'topic' && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Chapter</label>
                  <select 
                    value={selectedChapterId || ''}
                    onChange={(e) => setSelectedChapterId(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl p-4 text-zinc-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                    disabled={!selectedSubjectId}
                  >
                    <option value="" disabled>Select a chapter</option>
                    {chapters.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {type === 'subject' && (() => {
                const selectedClass = classes.find(c => c.id === selectedClassId);
                const classHasGroups = selectedClass ? (selectedClass.has_groups ?? (selectedClass as any).hasGroups ?? false) : false;
                if (!classHasGroups) return null;
                return (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Academic Group / Stream</label>
                    <select 
                      value={formData.academicGroup}
                      onChange={(e) => setFormData({...formData, academicGroup: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl p-4 text-zinc-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                    >
                      <option value="All">All Groups (Common)</option>
                      {academicGroups.map(g => (
                        <option key={g.id} value={g.name}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                );
              })()}

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

              {type === 'class' && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Enable Streams / Groups</label>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, hasGroups: !formData.hasGroups})}
                    className={`w-full flex items-center justify-center gap-2 p-4 rounded-2xl font-bold transition-all ${
                      formData.hasGroups ? 'bg-blue-500/10 text-blue-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    <Settings2 size={18} />
                    {formData.hasGroups ? 'Groups Enabled (Science, Humanities, Commerce)' : 'Groups Disabled (All Group Common)'}
                  </button>
                </div>
              )}

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
              <Button 
                onClick={onSave} 
                disabled={saveLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-6 font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveLoading ? <RefreshCcw size={18} className="animate-spin mr-2" /> : (editingItem ? <Pencil size={18} className="mr-2" /> : <Save size={18} className="mr-2" />)}
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
      {/* Floating Status Message */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold border ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-500 text-white border-emerald-400' 
                : 'bg-red-500 text-white border-red-400'
            }`}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {statusMessage.text}
            <button onClick={() => setStatusMessage(null)} className="ml-4 opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        
        {/* Groups Column */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Groups</h3>
            </div>
            <Button 
              size="sm" 
              onClick={() => {
                setEditingItem(null);
                setFormData({ name: '', active: true, order: academicGroups.length, academicGroup: 'All' });
                setIsGroupModalOpen(true);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
            >
              <Plus size={18} />
            </Button>
          </div>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {academicGroups.length === 0 ? (
              <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-800/50 rounded-[32px] border border-zinc-100 dark:border-zinc-800">
                <p className="text-zinc-500 text-[10px] font-bold">No groups found.</p>
              </div>
            ) : (
              academicGroups.map((group) => (
                <div 
                  key={group.id}
                  className="w-full p-4 rounded-[24px] text-left transition-all border group bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-white hover:border-amber-500/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black opacity-40">#{group.order}</span>
                      <span className="font-bold tracking-tight text-sm">{group.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="flex transition-opacity opacity-0 group-hover:opacity-100">
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             setEditingItem(group);
                             setFormData({ name: group.name, active: group.active, order: group.order, academicGroup: 'All' });
                             setIsGroupModalOpen(true);
                           }}
                           className="p-1.5 hover:bg-amber-500/10 text-zinc-400 rounded-lg hover:text-amber-600"
                         >
                           <Pencil size={12} />
                         </button>
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             setDeleteConfirm({
                               show: true,
                               type: 'group',
                               id: group.id,
                               name: group.name
                             });
                           }}
                           className="p-1.5 hover:bg-red-500/10 text-zinc-400 rounded-lg hover:text-red-600"
                         >
                           <Trash2 size={12} />
                         </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

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
                setFormData({ 
                  name: '', 
                  active: true, 
                  order: classes.length + 1, 
                  academicGroup: 'All',
                  hasGroups: false
                });
                setIsClassModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              <Plus size={18} />
            </Button>
          </div>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {classes.length === 0 ? (
              <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-800/50 rounded-[32px] border border-zinc-100 dark:border-zinc-800">
                <p className="text-zinc-500 text-[10px] font-bold">No classes found. Add one to start.</p>
              </div>
            ) : (
              classes.map((cls) => (
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
                      <div className="flex flex-col">
                        <span className="font-bold tracking-tight text-sm">{cls.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {(cls.has_groups ?? cls.hasGroups) ? (
                            <span className={`text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded ${
                              selectedClassId === cls.id ? 'bg-amber-400 text-zinc-900 font-extrabold' : 'bg-amber-500/10 text-amber-500'
                            }`}>With Groups</span>
                          ) : (
                            <span className="text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/40 text-zinc-400">Common only</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`flex transition-opacity ${selectedClassId === cls.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem(cls);
                              setFormData({ 
                                name: cls.name, 
                                active: cls.active, 
                                order: cls.order, 
                                academicGroup: 'All',
                                hasGroups: cls.has_groups ?? cls.hasGroups ?? false
                              });
                              setIsClassModalOpen(true);
                            }}
                            className={`p-1.5 hover:bg-white/20 rounded-lg ${selectedClassId === cls.id ? 'text-white' : 'text-zinc-400'}`}
                          >
                            <Pencil size={12} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({
                                show: true,
                                type: 'class',
                                id: cls.id,
                                name: cls.name
                              });
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
    ))
  )}
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
                  setFormData({ name: '', active: true, order: subjects.length, academicGroup: 'All' });
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
              <div className="p-10 text-center bg-zinc-50 dark:bg-zinc-800/20 rounded-[32px] border border-dashed border-zinc-200 dark:border-zinc-800">
                <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                  <BookOpen size={24} className="text-zinc-300" />
                </div>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                  Select a Class<br/>to manage Subjects
                </p>
              </div>
            ) : subjects.length === 0 ? (
              <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-800/50 rounded-[32px] border border-zinc-100 dark:border-zinc-800">
                <p className="text-zinc-500 text-[10px] font-bold">No subjects found for this class.</p>
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
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem(sub);
                            setFormData({ name: sub.name, active: sub.active, order: sub.order, academicGroup: sub.academicGroup || (sub as any).academic_group || 'All' });
                            setIsSubjectModalOpen(true);
                          }}
                          className={`p-1.5 rounded-lg ${selectedSubjectId === sub.id ? 'text-white' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                        >
                          <Pencil size={12} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({
                              show: true,
                              type: 'subject',
                              id: sub.id,
                              name: sub.name
                            });
                          }}
                          className={`p-1.5 rounded-lg ${selectedSubjectId === sub.id ? 'text-white' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <ChevronRight size={16} className={selectedSubjectId === sub.id ? 'text-white' : 'text-zinc-300'} />
                    </div>
                  </div>
                )
              )
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
                  setFormData({ name: '', active: true, order: chapters.length, academicGroup: 'All' });
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
              <div className="p-10 text-center bg-zinc-50 dark:bg-zinc-800/20 rounded-[32px] border border-dashed border-zinc-200 dark:border-zinc-800">
                <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                  <Library size={24} className="text-zinc-300" />
                </div>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                  Select a Subject<br/>to manage Chapters
                </p>
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
                      <div className={`flex transition-opacity ${selectedChapterId === ch.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem(ch);
                            setFormData({ name: ch.name, active: ch.active, order: ch.order, academicGroup: 'All' });
                            setIsChapterModalOpen(true);
                          }}
                          className={`p-1.5 rounded-lg ${selectedChapterId === ch.id ? 'text-white' : 'text-zinc-400'}`}
                        >
                          <Pencil size={12} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({
                              show: true,
                              type: 'chapter',
                              id: ch.id,
                              name: ch.name
                            });
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
                  setFormData({ name: '', active: true, order: topics.length, academicGroup: 'All' });
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
              <div className="p-10 text-center bg-zinc-50 dark:bg-zinc-800/20 rounded-[32px] border border-dashed border-zinc-200 dark:border-zinc-800">
                <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={24} className="text-zinc-300" />
                </div>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                  Select a Chapter<br/>to manage Topics
                </p>
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
                          setFormData({ name: tp.name, active: tp.active, order: tp.order, academicGroup: 'All' });
                          setTopicTags(tp.tags || []);
                          setIsTopicModalOpen(true);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-amber-500 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm({
                          show: true,
                          type: 'topic',
                          id: tp.id,
                          name: tp.name
                        })}
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
      {renderDeleteConfirmationModal()}
      {renderModal('class', isClassModalOpen, () => setIsClassModalOpen(false), handleSaveClass)}
      {renderModal('group', isGroupModalOpen, () => setIsGroupModalOpen(false), handleSaveGroup)}
      {renderModal('subject', isSubjectModalOpen, () => setIsSubjectModalOpen(false), handleSaveSubject)}
      {renderModal('chapter', isChapterModalOpen, () => setIsChapterModalOpen(false), handleSaveChapter)}
      {renderModal('topic', isTopicModalOpen, () => setIsTopicModalOpen(false), handleSaveTopic)}
    </div>
  );
};
