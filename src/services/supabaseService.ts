import { supabase } from '../supabaseClient';
import { ContentItem, Exam, Question, ExamAttempt, Feedback, Playlist, Category } from '../types';

export const TABLE_MAP = {
  'Notes': 'notes',
  'Books': 'books',
  'Question Papers': 'question_papers',
  'YouTube Classes': 'video_classes',
  'External Resources': 'external_links',
  'Practice Sheet': 'practice_sheets'
};

export const supabaseService = {
  // Helper to get table name from category
  getTableName(category: Category) {
    return TABLE_MAP[category] || 'notes';
  },

  // Resource Items (Notes, Books, Question Papers, YouTube Classes, etc.)
  async fetchContents(category?: Category, academicClass?: string) {
    if (category) {
      const tableName = this.getTableName(category);
      let query = supabase.from(tableName).select('*').eq('active', true);
      if (academicClass) query = query.eq('academic_class', academicClass);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        category: category, // Ensure category is preserved as the table name might differ
        academicClass: item.academic_class,
        authorId: item.author_id,
        authorName: item.author_name,
        channelName: item.channel_name,
        chapterId: item.chapter_id,
        topicId: item.topic_id,
        academicGroup: item.academic_group,
        createdAt: item.created_at,
        isPremium: item.is_premium
      })) as ContentItem[];
    } else {
      // If no category, we need to fetch from all relevant tables
      const tables = Object.entries(TABLE_MAP);
      const promises = tables.map(async ([cat, table]) => {
        const { data } = await supabase.from(table).select('*').eq('active', true).limit(50);
        return (data || []).map(item => ({
          ...item,
          category: cat as Category,
          academicClass: item.academic_class,
          authorId: item.author_id,
          authorName: item.author_name,
          channelName: item.channel_name,
          chapterId: item.chapter_id,
          topicId: item.topic_id,
          academicGroup: item.academic_group,
          createdAt: item.created_at,
          isPremium: item.is_premium
        }));
      });
      
      const results = await Promise.all(promises);
      return results.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as ContentItem[];
    }
  },

  // Alias for compatibility
  async fetchResources(category?: Category, academicClass?: string) {
    return this.fetchContents(category, academicClass);
  },

  async createContent(item: Partial<ContentItem>) {
    if (!item.category) throw new Error("Category is required to determine table");
    const tableName = this.getTableName(item.category);
    
    const it = item as any;
    // Core shared fields
    const mappedItem: any = {
      title: item.title,
      description: item.description,
      academic_class: item.academicClass || it.academic_class,
      academic_group: item.academicGroup || it.academic_group || 'All',
      subject: item.subject,
      author_name: item.authorName || it.author_name,
      author_id: item.authorId || it.author_id,
      status: item.status || 'approved',
      active: true,
      chapter: item.chapter,
      chapter_id: item.chapterId || (item as any).chapter_id,
      topic_id: item.topicId || (item as any).topic_id,
      tags: item.tags,
      is_premium: item.isPremium ?? it.is_premium,
      thumbnail: item.thumbnail,
      url: item.url
    };

    // Category specific fields (Only add if they exist in schema)
    if (item.category === 'YouTube Classes') {
      mappedItem.channel_name = item.channelName || it.channel_name;
    } else if (item.category === 'Books') {
      mappedItem.year = item.year;
    } else if (item.category === 'External Resources') {
      mappedItem.icon = item.icon;
    }

    const { data, error } = await supabase
      .from(tableName)
      .insert([mappedItem])
      .select()
      .single();
    if (error) throw error;
    
    return {
      ...data,
      category: item.category,
      academicClass: data.academic_class,
      authorId: data.author_id,
      authorName: data.author_name,
      channelName: data.channel_name,
      chapterId: data.chapter_id,
      topicId: data.topic_id,
      academicGroup: data.academic_group,
      createdAt: data.created_at,
      isPremium: data.is_premium
    } as ContentItem;
  },

  async createResource(item: Partial<ContentItem>) {
    return this.createContent(item);
  },

  async updateContent(id: string, updates: Partial<ContentItem>) {
    if (!updates.category) throw new Error("Category is required to determine table");
    const tableName = this.getTableName(updates.category);
    
    const it = updates as any;
    const mappedUpdates: any = {
      title: updates.title,
      description: updates.description,
      subject: updates.subject,
      academic_class: updates.academicClass || it.academic_class,
      academic_group: updates.academicGroup || it.academic_group,
      author_name: updates.authorName || it.author_name,
      author_id: updates.authorId || it.author_id,
      status: updates.status,
      chapter: updates.chapter,
      chapter_id: updates.chapterId || it.chapter_id,
      topic_id: updates.topicId || it.topic_id,
      tags: updates.tags,
      is_premium: updates.isPremium ?? it.is_premium,
      thumbnail: updates.thumbnail,
      url: updates.url
    };

    if (updates.category === 'YouTube Classes') {
      mappedUpdates.channel_name = updates.channelName || it.channel_name;
    } else if (updates.category === 'Books') {
      mappedUpdates.year = updates.year;
    } else if (updates.category === 'External Resources') {
      mappedUpdates.icon = updates.icon;
    }
    
    // Remove undefined fields
    Object.keys(mappedUpdates).forEach(key => mappedUpdates[key] === undefined && delete mappedUpdates[key]);

    const { data, error } = await supabase
      .from(tableName)
      .update(mappedUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    
    return {
      ...data,
      category: updates.category,
      academicClass: data.academic_class,
      authorId: data.author_id,
      authorName: data.author_name,
      channelName: data.channel_name,
      chapterId: data.chapter_id,
      topicId: data.topic_id,
      academicGroup: data.academic_group,
      createdAt: data.created_at,
      isPremium: data.is_premium
    } as ContentItem;
  },

  async updateResource(id: string, updates: Partial<ContentItem>) {
    return this.updateContent(id, updates);
  },

  async deleteContent(id: string, category: Category) {
    const tableName = this.getTableName(category);
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async deleteResource(id: string, category: Category) {
    return this.deleteContent(id, category);
  },

  // Exams
  async fetchExams(isAdmin: boolean = false) {
    let query = supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false });
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(exam => ({
      ...exam,
      class: exam.academic_class,
      academicClass: exam.academic_class,
      timeLimit: exam.time_limit,
      examType: exam.exam_type,
      totalQuestionsToShow: exam.total_questions_to_show,
      mcqCount: exam.mcq_count,
      writtenCount: exam.written_count,
      negativeMarking: exam.negative_marking,
      negativeValue: exam.negative_value,
      academicGroup: exam.academic_group,
      createdAt: exam.created_at,
      updatedAt: exam.updated_at,
      createdBy: exam.created_by,
      isPremium: exam.is_premium
    })) as Exam[];
  },

  async createExam(exam: Partial<Exam>) {
    const mappedExam: any = {
      title: exam.title,
      description: exam.description,
      academic_class: exam.class || (exam as any).academicClass || (exam as any).academic_class,
      academic_group: (exam as any).academicGroup || (exam as any).academic_group || 'All',
      subject: exam.subject,
      chapter: exam.chapter,
      chapter_name_custom: exam.chapterNameCustom || (exam as any).chapter_name_custom,
      topic_ids: exam.topicIds || (exam as any).topic_ids,
      time_limit: exam.timeLimit || (exam as any).time_limit,
      exam_type: exam.examType || (exam as any).exam_type,
      total_questions_to_show: exam.totalQuestionsToShow || (exam as any).total_questions_to_show,
      mcq_count: exam.mcqCount || (exam as any).mcq_count,
      written_count: exam.writtenCount || (exam as any).written_count,
      negative_marking: exam.negativeMarking ?? (exam as any).negative_marking,
      negative_value: exam.negativeValue ?? (exam as any).negative_value,
      status: exam.status,
      created_by: exam.createdBy || (exam as any).created_by,
      is_premium: exam.isPremium ?? (exam as any).is_premium
    };

    const { data, error } = await supabase
      .from('exams')
      .insert([mappedExam])
      .select()
      .single();
    if (error) throw error;

    return {
      ...data,
      class: data.academic_class,
      academicClass: data.academic_class,
      timeLimit: data.time_limit,
      examType: data.exam_type,
      totalQuestionsToShow: data.total_questions_to_show,
      mcqCount: data.mcq_count,
      writtenCount: data.written_count,
      negativeMarking: data.negative_marking,
      negativeValue: data.negative_value,
      academicGroup: data.academic_group,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      isPremium: data.is_premium
    } as unknown as Exam;
  },

  // Questions
  async fetchQuestions(examId: string) {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    
    return (data || []).map(q => ({
      ...q,
      examId: q.exam_id,
      questionText: q.question_text,
      options: q.options,
      correctAnswer: q.correct_answer,
      points: q.points,
      class: q.academic_class,
      subject: q.subject,
      chapter: q.chapter,
      topicId: q.topic_id,
      academicGroup: q.academic_group,
      createdAt: q.created_at
    })) as Question[];
  },

  async createQuestion(question: Partial<Question>) {
    const mappedQuestion = {
      exam_id: question.examId || (question as any).exam_id,
      type: question.type,
      question_text: question.questionText || (question as any).question_text,
      options: question.options,
      correct_answer: question.correctAnswer || (question as any).correct_answer,
      points: question.points,
      academic_class: question.class || (question as any).academic_class,
      academic_group: (question as any).academicGroup || (question as any).academic_group || 'All',
      subject: question.subject,
      chapter: question.chapter,
      topic_id: question.topicId || (question as any).topic_id
    };

    const { data, error } = await supabase
      .from('questions')
      .insert([mappedQuestion])
      .select()
      .single();
    if (error) throw error;

    return {
      ...data,
      examId: data.exam_id,
      questionText: data.question_text,
      options: data.options,
      correctAnswer: data.correct_answer,
      points: data.points,
      class: data.academic_class,
      subject: data.subject,
      chapter: data.chapter,
      topicId: data.topic_id,
      academicGroup: data.academic_group,
      createdAt: data.created_at
    } as Question;
  },

  // Exam Attempts (Integration)
  async createAttempt(attempt: { user_id: string; exam_id: string; user_name: string; user_class: string }) {
    const { data, error } = await supabase
      .from('attempts')
      .insert([attempt])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateAttempt(id: string, updates: any) {
    const { data, error } = await supabase
      .from('attempts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAttempt(id: string) {
    const { data, error } = await supabase
      .from('attempts')
      .select('*, exams(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Answers Integration
  async upsertAnswer(answer: { attempt_id: string; question_id: string; selected_option: string | number }) {
    const { data, error } = await supabase
      .from('answers')
      .upsert([answer], { onConflict: 'attempt_id,question_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Submit Exam (Call Edge Function)
  async submitExam(attemptId: string) {
    const { data, error } = await supabase.functions.invoke('score-exam', {
      body: { attempt_id: attemptId }
    });
    if (error) throw error;
    return data;
  },

  // Feedback
  async submitFeedback(feedback: Partial<Feedback>) {
    const { data, error } = await supabase
      .from('feedback')
      .insert([feedback])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Playlists
  async fetchPlaylists(isAdmin: boolean = false) {
    let query = supabase.from('playlists').select('*');
    if (!isAdmin) query = query.eq('status', 'approved');
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    return (data || []).map(p => ({
      ...p,
      authorId: p.author_id,
      youtubePlaylistId: p.youtube_playlist_id,
      videoIds: p.video_ids,
      academicClass: p.academic_class,
      academicGroup: p.academic_group,
      chapterId: p.chapter_id,
      topicId: p.topic_id,
      createdAt: p.created_at,
      isPremium: p.is_premium
    })) as Playlist[];
  },

  async createPlaylist(playlist: Partial<Playlist>) {
    const mappedPlaylist = {
      title: playlist.title,
      description: playlist.description,
      thumbnail: playlist.thumbnail,
      author_id: playlist.authorId || (playlist as any).author_id,
      type: playlist.type,
      youtube_playlist_id: playlist.youtubePlaylistId || (playlist as any).youtube_playlist_id,
      video_ids: playlist.videoIds || (playlist as any).video_ids,
      academic_class: playlist.academicClass || (playlist as any).academic_class,
      academic_group: (playlist as any).academicGroup || (playlist as any).academic_group || 'All',
      subject: playlist.subject,
      status: playlist.status,
      chapter: playlist.chapter,
      chapter_id: playlist.chapterId || (playlist as any).chapter_id,
      topic_id: playlist.topicId || (playlist as any).topic_id,
      is_premium: playlist.isPremium ?? (playlist as any).is_premium
    };

    const { data, error } = await supabase
      .from('playlists')
      .insert([mappedPlaylist])
      .select()
      .single();
    if (error) throw error;

    return {
      ...data,
      authorId: data.author_id,
      youtubePlaylistId: data.youtube_playlist_id,
      videoIds: data.video_ids,
      academicClass: data.academic_class,
      academicGroup: data.academic_group,
      chapterId: data.chapter_id,
      topicId: data.topic_id,
      createdAt: data.created_at,
      isPremium: data.is_premium
    } as Playlist;
  },

  // Academic Structure
  async fetchAcademicClasses() {
    const { data, error } = await supabase
      .from('academic_classes')
      .select('*')
      .eq('active', true)
      .order('order', { ascending: true });
    if (error) throw error;
    return data;
  },

  async fetchSubjects(classId?: string) {
    let query = supabase.from('subjects').select('*').eq('active', true);
    if (classId) query = query.eq('class_id', classId);
    const { data, error } = await query.order('order', { ascending: true });
    if (error) throw error;
    return data;
  },

  async fetchChapters(subjectId?: string) {
    let query = supabase.from('chapters').select('*').eq('active', true);
    if (subjectId) query = query.eq('subject_id', subjectId);
    const { data, error } = await query.order('order', { ascending: true });
    if (error) throw error;
    return data;
  },

  async fetchTopics(chapterId?: string) {
    let query = supabase.from('topics').select('*').eq('active', true);
    if (chapterId) query = query.eq('chapter_id', chapterId);
    const { data, error } = await query.order('order', { ascending: true });
    if (error) throw error;
    return data;
  },

  async fetchAcademicGroups() {
    const { data, error } = await supabase
      .from('academic_groups')
      .select('*')
      .eq('active', true)
      .order('order', { ascending: true });
    if (error) throw error;
    return data;
  }
};
