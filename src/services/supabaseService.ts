import { supabase } from '../supabaseClient';
import { ContentItem, Exam, Question, ExamAttempt, Feedback, Playlist, Category, deserializeExplanation, SubscriptionSettings, SubscriptionPackage, SubscriptionBenefit, SubscriptionRequest, SubscriptionCoupon } from '../types';

export const TABLE_MAP = {
  'Notes': 'notes',
  'Books': 'books',
  'Question Papers': 'question_papers',
  'YouTube Classes': 'video_classes',
  'External Resources': 'external_links',
  'Practice Sheet': 'practice_sheets'
};

export const supabaseService = {
  // Safe operations wrapper to dynamically handle missing columns/schema cache mismatch.
  // Auto-heals by parsing missing columns from Postgres/Postgrest errors, deleting them, and retrying.
  async safeWrite(tableName: string, payload: any, operation: 'insert' | 'update' | 'upsert', idToUpdate?: string, options?: { onConflict?: string }) {
    let currentPayload = Array.isArray(payload) ? [...payload] : { ...payload };
    const maxRetries = 10;
    
    if (tableName === 'exam_attempts') {
      if (Array.isArray(currentPayload)) {
        currentPayload = currentPayload.map(item => this.sanitizeAttemptPayload(item));
      } else {
        currentPayload = this.sanitizeAttemptPayload(currentPayload);
      }
    } else if (tableName === 'user_stats') {
      if (Array.isArray(currentPayload)) {
        currentPayload = currentPayload.map(item => this.sanitizeUserStatsPayload(item));
      } else {
        currentPayload = this.sanitizeUserStatsPayload(currentPayload);
      }
    } else if (tableName === 'leaderboards') {
      if (Array.isArray(currentPayload)) {
        currentPayload = currentPayload.map(item => this.sanitizeLeaderboardsPayload(item));
      } else {
        currentPayload = this.sanitizeLeaderboardsPayload(currentPayload);
      }
    }
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        let query;
        if (operation === 'insert') {
          query = supabase.from(tableName).insert(Array.isArray(currentPayload) ? currentPayload : [currentPayload]);
        } else if (operation === 'update') {
          if (!idToUpdate) throw new Error("ID is required for update operations.");
          query = supabase.from(tableName).update(currentPayload).eq('id', idToUpdate);
        } else if (operation === 'upsert') {
          const upsertOptions: any = {};
          if (options?.onConflict) {
            upsertOptions.onConflict = options.onConflict;
          } else if (tableName === 'user_stats') {
            upsertOptions.onConflict = 'user_id';
          }
          query = supabase.from(tableName).upsert(
            Array.isArray(currentPayload) ? currentPayload : [currentPayload],
            Object.keys(upsertOptions).length > 0 ? upsertOptions : undefined
          );
        }
        
        let selectQuery = query!.select();
        const { data, error } = Array.isArray(currentPayload) ? await selectQuery : await selectQuery.maybeSingle();
        if (error) {
          throw error;
        }
        return data;
      } catch (err: any) {
        const errorMessage = String(err.message || err.details || "");
        const errorCode = String(err.code || "");
        
        const isColumnError = errorCode === '42703' || 
                             errorMessage.includes('column') || 
                             errorMessage.includes('does not exist') ||
                             errorMessage.includes('not found') ||
                             errorMessage.includes('unknown field') ||
                             errorMessage.includes('schema cache');
                             
        if (isColumnError && attempt < maxRetries) {
          let offendingColumn: string | null = null;
          
          // Try matching formats like column "highest_score"
          const matchQuote = errorMessage.match(/column\s+"([^"]+)"/i);
          // Try matching formats like 'highest_score' column or column 'highest_score'
          const matchSingleQuote = errorMessage.match(/'([^']+)'\s+column/i) || errorMessage.match(/column\s+'([^']+)'/i);
          // Try matching basic word formats
          const matchSimple = errorMessage.match(/column\s+([a-zA-Z0-9_]+)/i);
          
          if (matchQuote && matchQuote[1]) {
            offendingColumn = matchQuote[1];
          } else if (matchSingleQuote && matchSingleQuote[1]) {
            offendingColumn = matchSingleQuote[1];
          } else if (matchSimple && matchSimple[1]) {
            offendingColumn = matchSimple[1];
          }
          
          if (offendingColumn) {
            console.warn(`[Auto-Heal Write] Table "${tableName}" failed due to column "${offendingColumn}". Stripping and retrying...`);
            if (Array.isArray(currentPayload)) {
              currentPayload = currentPayload.map(item => {
                const updated = { ...item };
                delete updated[offendingColumn!];
                return updated;
              });
            } else {
              delete currentPayload[offendingColumn];
            }
            continue;
          }
        }
        throw err;
      }
    }
  },

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

  // Helper to resolve string names to UUIDs from academic tables
  async resolveAcademicIds(className: string | null, subjectName: string | null, chapterName?: string | null) {
    let class_id: string | null = null;
    let subject_id: string | null = null;
    let chapter_id: string | null = null;

    if (className) {
      const { data: cls } = await supabase
        .from('academic_classes')
        .select('id')
        .eq('name', className)
        .limit(1);
      if (cls && cls[0]) {
        class_id = cls[0].id;
      }
    }

    if (subjectName && class_id) {
      const { data: sub } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', subjectName)
        .eq('class_id', class_id)
        .limit(1);
      if (sub && sub[0]) {
        subject_id = sub[0].id;
      }
    }

    if (chapterName && chapterName !== 'All Chapters' && chapterName !== 'All' && class_id && subject_id) {
      const { data: chap } = await supabase
        .from('chapters')
        .select('id')
        .eq('name', chapterName)
        .eq('class_id', class_id)
        .eq('subject_id', subject_id)
        .limit(1);
      if (chap && chap[0]) {
        chapter_id = chap[0].id;
      }
    }

    return { class_id, subject_id, chapter_id };
  },

  // Helper to map DB question to Frontend Question
  mapQuestionDBToFrontend(q: any, classLookup?: Map<string, string>, subjectLookup?: Map<string, string>, chapterLookup?: Map<string, string>): Question {
    const parsedMeta = deserializeExplanation(q.explanation || '');
    
    // Options
    let optionsArray = [q.option_a || '', q.option_b || '', q.option_c || '', q.option_d || ''];
    if (q.options && Array.isArray(q.options)) {
      optionsArray = q.options;
    }
    
    // Try to parse options if stringified objects
    const optionsParsed = optionsArray.map((opt: any) => {
      if (typeof opt === 'string' && opt.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(opt);
          return parsed.text || '';
        } catch (e) {
          return opt;
        }
      }
      return opt;
    });

    // Correct Answer
    let correctIndex: string | number = q.correct_option !== undefined ? q.correct_option : q.correct_answer;
    if (q.correct_option === 'A' || q.correct_option === 'a' || q.correct_option === '0') correctIndex = 0;
    else if (q.correct_option === 'B' || q.correct_option === 'b' || q.correct_option === '1') correctIndex = 1;
    else if (q.correct_option === 'C' || q.correct_option === 'c' || q.correct_option === '2') correctIndex = 2;
    else if (q.correct_option === 'D' || q.correct_option === 'd' || q.correct_option === '3') correctIndex = 3;
    else if (typeof q.correct_option === 'string' && /^[0-3]$/.test(q.correct_option)) {
      correctIndex = parseInt(q.correct_option, 10);
    } else if (typeof q.correct_answer === 'string' && /^[0-3]$/.test(q.correct_answer)) {
      correctIndex = parseInt(q.correct_answer, 10);
    }

    return {
      ...q,
      id: q.id,
      examId: q.exam_id,
      questionText: q.question || q.question_text || '',
      options: optionsParsed,
      correctAnswer: correctIndex,
      points: q.points !== undefined ? Number(q.points) : 1,
      type: q.question_type === 'written' ? 'written' : (q.type || 'mcq'),
      class: classLookup?.get(q.class_id) || q.academic_class || '',
      classId: q.class_id,
      subject: subjectLookup?.get(q.subject_id) || q.subject || '',
      subjectId: q.subject_id,
      chapter: chapterLookup?.get(q.chapter_id) || q.chapter || '',
      chapterId: q.chapter_id,
      topicId: q.topic_id,
      academicGroup: q.academic_group || 'All',
      createdAt: q.created_at,
      difficulty: q.difficulty || parsedMeta.difficulty,
      isPremium: q.is_premium !== undefined ? q.is_premium : parsedMeta.is_premium,
      tags: q.tags || parsedMeta.tags || [],
      status: q.status || parsedMeta.status || 'published',
      explanationImage: q.explanation_image || parsedMeta.explanation_image,
      explanationText: parsedMeta.text || q.explanation,
      negativeMarks: q.negative_marks || parsedMeta.negative_marks || 0.25
    } as unknown as Question;
  },

  // Helper to map Frontend Question to DB format
  async mapQuestionFrontendToDB(question: Partial<Question>): Promise<any> {
    const className = question.class || (question as any).academic_class;
    const subjectName = question.subject;
    const chapterName = question.chapter;

    const ids = await this.resolveAcademicIds(className, subjectName, chapterName);

    const rawOptionsVal = question.options || ['', '', '', ''];
    // Keep/extract text parts of options
    const optionTexts = rawOptionsVal.map((opt: any) => {
      if (opt && typeof opt === 'object') {
        return opt.text || '';
      }
      if (typeof opt === 'string' && opt.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(opt);
          return parsed.text || '';
        } catch (e) {
          return opt;
        }
      }
      return opt ? String(opt) : '';
    });

    const questionImage = (question as any).question_image || (question.questionText?.includes('![](http') 
      ? question.questionText.match(/\!\[\]\((.*?)\)/)?.[1] 
      : null);

    // Map correct answer into letter 'A', 'B', 'C', 'D'
    let correctOpt = 'A';
    if (question.correctAnswer !== undefined) {
      const ansNum = Number(question.correctAnswer);
      if (ansNum >= 0 && ansNum <= 3) {
        correctOpt = ['A', 'B', 'C', 'D'][ansNum];
      } else {
        correctOpt = String(question.correctAnswer);
      }
    } else if ((question as any).correct_option) {
      correctOpt = (question as any).correct_option;
    } else if ((question as any).correct_answer) {
      const ansNum = Number((question as any).correct_answer);
      if (ansNum >= 0 && ansNum <= 3) {
        correctOpt = ['A', 'B', 'C', 'D'][ansNum];
      } else {
        correctOpt = String((question as any).correct_answer);
      }
    }

    const dbPayload: any = {
      exam_id: question.examId || (question as any).exam_id || null,
      question: question.questionText || (question as any).question_text || '',
      question_text: question.questionText || (question as any).question_text || '',
      option_a: optionTexts[0] || '',
      option_b: optionTexts[1] || '',
      option_c: optionTexts[2] || '',
      option_d: optionTexts[3] || '',
      options: optionTexts,
      correct_option: correctOpt,
      correct_answer: correctOpt,
      points: question.points !== undefined ? Number(question.points) : 1,
      question_type: question.type || 'mcq',
      type: question.type || 'mcq',
      class_id: (question as any).class_id || (question as any).classId || ids.class_id || null,
      academic_class: className || null,
      subject_id: (question as any).subject_id || (question as any).subjectId || ids.subject_id || null,
      subject: subjectName || null,
      chapter_id: (question as any).chapter_id || (question as any).chapterId || ids.chapter_id || null,
      chapter: chapterName || null,
      topic_id: question.topicId || (question as any).topic_id || null,
      academic_group: (question as any).academicGroup || (question as any).academic_group || 'All',
      difficulty: (question as any).difficulty || 'medium',
      status: (question as any).status || 'published',
      is_premium: (question as any).is_premium !== undefined ? (question as any).is_premium : (question.isPremium || false),
      explanation: question.explanation || null,
      explanation_image: (question as any).explanation_image || null,
      question_image: questionImage || (question as any).question_image || null,
      option_a_image: (question as any).option_a_image || null,
      option_b_image: (question as any).option_b_image || null,
      option_c_image: (question as any).option_c_image || null,
      option_d_image: (question as any).option_d_image || null,
      negative_marks: question.negativeMarks !== undefined ? Number(question.negativeMarks) : 0.25,
      negative_value: question.negativeMarks !== undefined ? Number(question.negativeMarks) : 0.25
    };

    return dbPayload;
  },

  // Exams
  async fetchExams(isAdmin: boolean = false) {
    let query = supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false });
    
    const { data, error } = await query;
    if (error) throw error;

    // Fetch lookups for resolution back to names with safe fallback
    const [classesRes, subjectsRes, chaptersRes] = await Promise.allSettled([
      supabase.from('academic_classes').select('id, name'),
      supabase.from('subjects').select('id, name'),
      supabase.from('chapters').select('id, name')
    ]);

    const dbClasses = classesRes.status === 'fulfilled' ? classesRes.value.data : [];
    const dbSubjects = subjectsRes.status === 'fulfilled' ? subjectsRes.value.data : [];
    const dbChapters = chaptersRes.status === 'fulfilled' ? chaptersRes.value.data : [];

    const classLookup = new Map((dbClasses || []).map(c => [c.id, c.name]));
    const subjectLookup = new Map((dbSubjects || []).map(s => [s.id, s.name]));
    const chapterLookup = new Map((dbChapters || []).map(ch => [ch.id, ch.name]));
    
    return (data || []).map(exam => ({
      ...exam,
      class: exam.academic_class || classLookup.get(exam.class_id),
      academicClass: exam.academic_class || classLookup.get(exam.class_id),
      subject: exam.subject || subjectLookup.get(exam.subject_id),
      chapter: exam.chapter || chapterLookup.get(exam.chapter_id),
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
    const className = exam.class || (exam as any).academicClass || (exam as any).academic_class;
    const subjectName = exam.subject;
    const chapterName = exam.chapter;

    const ids = await this.resolveAcademicIds(className, subjectName, chapterName);

    const mappedExam: any = {
      title: exam.title,
      description: exam.description,
      academic_class: className || null,
      class_id: (exam as any).class_id || (exam as any).classId || ids.class_id || null,
      academic_group: (exam as any).academicGroup || (exam as any).academic_group || 'All',
      subject: subjectName || null,
      subject_id: (exam as any).subject_id || (exam as any).subjectId || ids.subject_id || null,
      chapter: chapterName || null,
      chapter_id: (exam as any).chapter_id || (exam as any).chapterId || ids.chapter_id || null,
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

    const data = await this.safeWrite('exams', mappedExam, 'insert');

    return {
      ...data,
      class: data.academic_class,
      academicClass: data.academic_class,
      timeLimit: data.time_limit,
      examType: data.exam_type || 'mcq',
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

  async updateExam(id: string, exam: Partial<Exam>) {
    const className = exam.class || (exam as any).academicClass || (exam as any).academic_class;
    const subjectName = exam.subject;
    const chapterName = exam.chapter;

    const ids = await this.resolveAcademicIds(className, subjectName, chapterName);

    const mappedExam: any = {};
    if (exam.title !== undefined) mappedExam.title = exam.title;
    if (exam.description !== undefined) mappedExam.description = exam.description;
    if (className !== undefined) mappedExam.academic_class = className;
    if ((exam as any).class_id !== undefined || ids.class_id) mappedExam.class_id = (exam as any).class_id || ids.class_id;
    if ((exam as any).academicGroup !== undefined) mappedExam.academic_group = (exam as any).academicGroup;
    if (subjectName !== undefined) mappedExam.subject = subjectName;
    if ((exam as any).subject_id !== undefined || ids.subject_id) mappedExam.subject_id = (exam as any).subject_id || ids.subject_id;
    if (chapterName !== undefined) mappedExam.chapter = chapterName;
    if ((exam as any).chapter_id !== undefined || ids.chapter_id) mappedExam.chapter_id = (exam as any).chapter_id || ids.chapter_id;
    if (exam.chapterNameCustom !== undefined) mappedExam.chapter_name_custom = exam.chapterNameCustom;
    if (exam.topicIds !== undefined) mappedExam.topic_ids = exam.topicIds;
    if (exam.timeLimit !== undefined) mappedExam.time_limit = exam.timeLimit;
    if (exam.examType !== undefined) mappedExam.exam_type = exam.examType;
    if (exam.totalQuestionsToShow !== undefined) mappedExam.total_questions_to_show = exam.totalQuestionsToShow;
    if (exam.mcqCount !== undefined) mappedExam.mcq_count = exam.mcqCount;
    if (exam.writtenCount !== undefined) mappedExam.written_count = exam.writtenCount;
    if (exam.negativeMarking !== undefined) mappedExam.negative_marking = exam.negativeMarking;
    if (exam.negativeValue !== undefined) mappedExam.negative_value = exam.negativeValue;
    if (exam.status !== undefined) mappedExam.status = exam.status;
    if (exam.isPremium !== undefined) mappedExam.is_premium = exam.isPremium;

    const data = await this.safeWrite('exams', mappedExam, 'update', id);

    return {
      ...data,
      class: data.academic_class,
      academicClass: data.academic_class,
      timeLimit: data.time_limit,
      examType: data.exam_type || 'mcq',
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
  async fetchQuestions(examOrId: string | Partial<Exam>) {
    if (!examOrId) return [];

    let directQuestions: any[] = [];
    let dynamicQuestions: any[] = [];

    // Fetch lookups for resolution back to names with safe fallback
    const [classesRes, subjectsRes, chaptersRes] = await Promise.allSettled([
      supabase.from('academic_classes').select('id, name'),
      supabase.from('subjects').select('id, name'),
      supabase.from('chapters').select('id, name')
    ]);

    const dbClasses = classesRes.status === 'fulfilled' ? classesRes.value.data : [];
    const dbSubjects = subjectsRes.status === 'fulfilled' ? subjectsRes.value.data : [];
    const dbChapters = chaptersRes.status === 'fulfilled' ? chaptersRes.value.data : [];

    const classLookup = new Map((dbClasses || []).map(c => [c.id, c.name]));
    const subjectLookup = new Map((dbSubjects || []).map(s => [s.id, s.name]));
    const chapterLookup = new Map((dbChapters || []).map(ch => [ch.id, ch.name]));

    if (typeof examOrId === 'string') {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examOrId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      directQuestions = data || [];
    } else {
      const exam = examOrId;
      // 1. Fetch direct
      if (exam.id) {
        try {
          const { data } = await supabase
            .from('questions')
            .select('*')
            .eq('exam_id', exam.id);
          if (data) directQuestions = data;
        } catch (err) {
          console.warn("Direct question fetch error:", err);
        }
      }

      // 2. Fetch dynamic matching filters
      try {
        let query = supabase.from('questions').select('*');
        
        let classIdFilter = (exam as any).class_id || (exam as any).classId;
        let subjectIdFilter = (exam as any).subject_id || (exam as any).subjectId;
        let chapterIdFilter = (exam as any).chapter_id || (exam as any).chapterId;

        // Resolve string filters to IDs using lookups if necessary
        const clsName = exam.class || (exam as any).academicClass || (exam as any).academic_class;
        if (!classIdFilter && clsName) {
          const foundClass = (dbClasses || []).find(c => c.name === clsName);
          if (foundClass) classIdFilter = foundClass.id;
        }

        if (classIdFilter) {
          query = query.eq('class_id', classIdFilter);
        }

        if (!subjectIdFilter && exam.subject && exam.subject !== 'All') {
          const foundSub = (dbSubjects || []).find(s => s.name === exam.subject && (s as any).class_id === classIdFilter);
          if (foundSub) subjectIdFilter = foundSub.id;
        }

        if (subjectIdFilter) {
          query = query.eq('subject_id', subjectIdFilter);
        }

        if (!chapterIdFilter && exam.chapter && exam.chapter !== 'All Chapters' && exam.chapter !== 'All') {
          const foundChap = (dbChapters || []).find(ch => ch.name === exam.chapter && (ch as any).class_id === classIdFilter && (ch as any).subject_id === subjectIdFilter);
          if (foundChap) chapterIdFilter = foundChap.id;
        }

        if (chapterIdFilter) {
          query = query.eq('chapter_id', chapterIdFilter);
        }

        const group = exam.academicGroup || exam.academic_group || (exam as any).academic_group;
        if (group && group !== 'All') {
          query = query.in('academic_group', [group, 'All']);
        }
        
        const topicIds = exam.topicIds || (exam as any).topic_ids;
        if (topicIds && topicIds.length > 0 && !topicIds.includes('All')) {
          query = query.in('topic_id', topicIds);
        }

        const { data: dynamicData } = await query;
        if (dynamicData) {
          dynamicQuestions = dynamicData;
        }
      } catch (err) {
        console.warn("Dynamic question bank query error:", err);
      }
    }

    // Combine and deduplicate
    const combined = [...directQuestions, ...dynamicQuestions];
    const seen = new Set<string>();
    const unique: any[] = [];

    for (const q of combined) {
      if (!seen.has(q.id)) {
        seen.add(q.id);
        unique.push(q);
      }
    }

    return unique.map(q => this.mapQuestionDBToFrontend(q, classLookup, subjectLookup, chapterLookup));
  },

  async createQuestion(question: Partial<Question>) {
    console.log("[supabaseService] Creating question on new schema:", question);
    const dbPayload = await this.mapQuestionFrontendToDB(question);
    
    const data = await this.safeWrite('questions', dbPayload, 'insert');

    // Fetch lookups for resolution back to names with safe fallback
    const [classesRes, subjectsRes, chaptersRes] = await Promise.allSettled([
      supabase.from('academic_classes').select('id, name'),
      supabase.from('subjects').select('id, name'),
      supabase.from('chapters').select('id, name')
    ]);

    const dbClasses = classesRes.status === 'fulfilled' ? classesRes.value.data : [];
    const dbSubjects = subjectsRes.status === 'fulfilled' ? subjectsRes.value.data : [];
    const dbChapters = chaptersRes.status === 'fulfilled' ? chaptersRes.value.data : [];

    const classLookup = new Map((dbClasses || []).map(c => [c.id, c.name]));
    const subjectLookup = new Map((dbSubjects || []).map(s => [s.id, s.name]));
    const chapterLookup = new Map((dbChapters || []).map(ch => [ch.id, ch.name]));

    return this.mapQuestionDBToFrontend(data, classLookup, subjectLookup, chapterLookup);
  },

  async updateQuestion(id: string, question: Partial<Question>) {
    console.log("[supabaseService] Updating question on new schema, ID:", id, "Payload:", question);
    const dbPayload = await this.mapQuestionFrontendToDB(question);
    
    const data = await this.safeWrite('questions', dbPayload, 'update', id);

    // Fetch lookups for resolution back to names with safe fallback
    const [classesRes, subjectsRes, chaptersRes] = await Promise.allSettled([
      supabase.from('academic_classes').select('id, name'),
      supabase.from('subjects').select('id, name'),
      supabase.from('chapters').select('id, name')
    ]);

    const dbClasses = classesRes.status === 'fulfilled' ? classesRes.value.data : [];
    const dbSubjects = subjectsRes.status === 'fulfilled' ? subjectsRes.value.data : [];
    const dbChapters = chaptersRes.status === 'fulfilled' ? chaptersRes.value.data : [];

    const classLookup = new Map((dbClasses || []).map(c => [c.id, c.name]));
    const subjectLookup = new Map((dbSubjects || []).map(s => [s.id, s.name]));
    const chapterLookup = new Map((dbChapters || []).map(ch => [ch.id, ch.name]));

    return this.mapQuestionDBToFrontend(data, classLookup, subjectLookup, chapterLookup);
  },

  // Exam Attempts (Integration)
  sanitizeAttemptPayload(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;
    const clean = { ...payload };
    
    // 1. Standardize known properties
    if (clean.user_class && !clean.academic_class) {
      clean.academic_class = clean.user_class;
    }
    if (clean.class_name && !clean.academic_class) {
      clean.academic_class = clean.class_name;
    }
    if (clean.group_name && !clean.academic_group) {
      clean.academic_group = clean.group_name;
    }
    if (clean.user_subject && !clean.subject) {
      clean.subject = clean.user_subject;
    }
    
    // 2. Remove duplicate/unsupported columns entirely
    delete clean.user_class;
    delete clean.class_name;
    delete clean.group_name;
    delete clean.user_subject;
    
    // 3. Fallbacks and validation
    if (clean.score !== undefined) {
      clean.score = Math.max(0, isNaN(Number(clean.score)) ? 0 : Number(clean.score));
    }
    if (clean.total_marks !== undefined) {
      clean.total_marks = Math.max(0, isNaN(Number(clean.total_marks)) ? 0 : Number(clean.total_marks));
    }
    if (clean.total_questions !== undefined) {
      clean.total_questions = Math.max(0, isNaN(Number(clean.total_questions)) ? 0 : Number(clean.total_questions));
    }
    if (clean.time_taken !== undefined) {
      clean.time_taken = Math.max(0, isNaN(Number(clean.time_taken)) ? 0 : Number(clean.time_taken));
    }
    if (clean.correct_count !== undefined) {
      clean.correct_count = Math.max(0, isNaN(Number(clean.correct_count)) ? 0 : Number(clean.correct_count));
    }
    if (clean.wrong_count !== undefined) {
      clean.wrong_count = Math.max(0, isNaN(Number(clean.wrong_count)) ? 0 : Number(clean.wrong_count));
    }
    if (clean.unanswered_count !== undefined) {
      clean.unanswered_count = Math.max(0, isNaN(Number(clean.unanswered_count)) ? 0 : Number(clean.unanswered_count));
    }
    
    clean.academic_class = String(clean.academic_class || 'SSC').trim();
    clean.academic_group = String(clean.academic_group || 'General').trim();
    clean.subject = String(clean.subject || 'All').trim();
    clean.chapter = String(clean.chapter || 'All').trim();
    clean.topic = String(clean.topic || 'All').trim();
    clean.user_name = String(clean.user_name || 'Student').trim();
    
    return clean;
  },

  sanitizeUserStatsPayload(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;
    const clean = { ...payload };
    // Only user_photo doesn't exist in the Postgres user_stats table schema
    delete clean.user_photo;
    return clean;
  },

  sanitizeLeaderboardsPayload(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;
    const clean = { ...payload };
    
    // Map best_score to score
    if (clean.best_score !== undefined) {
      if (clean.score === undefined) {
        clean.score = clean.best_score;
      }
      delete clean.best_score;
    }
    
    // Map correct_count to correct_answers
    if (clean.correct_count !== undefined) {
      if (clean.correct_answers === undefined) {
        clean.correct_answers = clean.correct_count;
      }
      delete clean.correct_count;
    }
    
    // Map wrong_count to wrong_answers
    if (clean.wrong_count !== undefined) {
      if (clean.wrong_answers === undefined) {
        clean.wrong_answers = clean.wrong_count;
      }
      delete clean.wrong_count;
    }
    
    // Map unanswered_count to skipped_answers
    if (clean.unanswered_count !== undefined) {
      if (clean.skipped_answers === undefined) {
        clean.skipped_answers = clean.unanswered_count;
      }
      delete clean.unanswered_count;
    }
    
    // Map time_taken to completion_time
    if (clean.time_taken !== undefined) {
      if (clean.completion_time === undefined) {
        clean.completion_time = clean.time_taken;
      }
      delete clean.time_taken;
    }

    // Map user_photo to user_avatar
    if (clean.user_photo !== undefined) {
      if (clean.user_avatar === undefined) {
        clean.user_avatar = clean.user_photo;
      }
      delete clean.user_photo;
    }

    delete clean.last_updated;
    
    return clean;
  },

  async createAttempt(attempt: any) {
    const cleanPayload = this.sanitizeAttemptPayload(attempt);
    return this.safeWrite('exam_attempts', cleanPayload, 'insert');
  },

  async updateAttempt(id: string, updates: any) {
    const cleanPayload = this.sanitizeAttemptPayload(updates);
    return this.safeWrite('exam_attempts', cleanPayload, 'update', id);
  },

  async getAttempt(id: string) {
    const { data, error } = await supabase
      .from('exam_attempts')
      .select('*, exams(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Answers Integration
  async upsertAnswer(answer: { attempt_id: string; question_id: string; selected_option: string | number }) {
    const { data, error } = await supabase
      .from('exam_answers')
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
    // 1. Core validation before insert to prevent empty or null feedback submissions
    const rawMessage = feedback.message || (feedback as any).content || (feedback as any).text;
    const validatedMessage = String(rawMessage || '').trim();
    
    if (!validatedMessage) {
      throw new Error("Feedback message cannot be empty, null, or only whitespace.");
    }

    // 2. Map fields to EXACTLY match Supabase schema (Prevent future schema mismatch issues)
    const dbFeedback = {
      user_id: feedback.user_id || feedback.userId || null,
      user_email: (feedback.user_email || feedback.userEmail || 'guest@educationalportal.org').trim(),
      user_name: (feedback.user_name || feedback.userName || 'Guest Student').trim(),
      message: validatedMessage,
      status: feedback.status || 'unread',
      reply: feedback.reply || feedback.admin_reply || null
    };

    const { data, error } = await supabase
      .from('feedback')
      .insert([dbFeedback])
      .select()
      .single();

    if (error) {
      console.error("[submitFeedback] Database insertion error:", error);
      throw error;
    }
    return data;
  },

  async fetchFeedbacks() {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Robust mapping with fallback handling for compatibility with legacy columns
    return (data || []).map(f => ({
      id: f.id,
      userId: f.user_id,
      user_id: f.user_id,
      userEmail: f.user_email || 'guest@educationalportal.org',
      user_email: f.user_email || 'guest@educationalportal.org',
      userName: f.user_name || 'Guest Student',
      user_name: f.user_name || 'Guest Student',
      message: f.message || f.content || 'No feedback text provided',
      status: f.status || 'unread',
      reply: f.reply || null,
      admin_reply: f.reply || null,
      createdAt: f.created_at,
      created_at: f.created_at
    })) as Feedback[];
  },

  async updateFeedbackStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from('feedback')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async replyToFeedback(id: string, reply: string) {
    const { data, error } = await supabase
      .from('feedback')
      .update({ reply, status: 'resolved' })
      .eq('id', id)
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
  },

  async syncLeaderboardAndStats(uId: string, examId: string, attemptData: {
    score: number;
    time_taken: number;
    correct_count: number;
    wrong_count: number;
    unanswered_count: number;
    total_questions: number;
    user_name: string;
    user_class: string;
    exam_title: string;
    user_photo?: string;
    subject?: string;
    chapter?: string;
    topic?: string;
    academic_group?: string;
    performance_level?: string;
  }) {
    console.log("[supabaseService] syncLeaderboardAndStats initiated for user", uId, "Exam ID", examId);
    if (!uId || !examId) {
      throw new Error("Missing user_id or exam_id parameters for leaderboard operations.");
    }

    const score = Number(attemptData.score || 0);
    const timeTaken = Number(attemptData.time_taken || 0);
    const correctCount = Number(attemptData.correct_count || 0);
    const wrongCount = Number(attemptData.wrong_count || 0);
    const unansweredCount = Number(attemptData.unanswered_count || 0);
    const totalQuestions = Number(attemptData.total_questions || 0);
    const userName = attemptData.user_name || 'Student';
    const userClass = attemptData.user_class || 'SSC';
    const examTitle = attemptData.exam_title || 'Practice Match';
    const userPhoto = attemptData.user_photo || '';

    // Calculate percentage and accuracy ratios
    const totalAttempted = correctCount + wrongCount;
    const accuracy = Number((totalAttempted > 0 ? (correctCount / totalAttempted) * 100 : 0).toFixed(2));

    // Calculate daily streak and total accumulation
    let currentStreak = 1;
    let accumulatedXp = 0;
    let existingStats: any = null;

    try {
      const { data, error: fetchErr } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', uId)
        .maybeSingle();

      if (!fetchErr && data) {
        existingStats = data;
        accumulatedXp = data.total_xp || data.xp || 0;
        currentStreak = data.streak || 1;

        if (data.updated_at) {
          const lastUpdate = new Date(data.updated_at);
          const now = new Date();
          const msDiff = now.getTime() - lastUpdate.getTime();
          const hoursDiff = msDiff / (1000 * 60 * 60);

          if (hoursDiff >= 20 && hoursDiff <= 36) {
            currentStreak += 1;
          } else if (hoursDiff > 36) {
            currentStreak = 1;
          }
        }
      }
    } catch (e) {
      console.warn("Soft warning: failed fetching existing user stats, continuing safely:", e);
    }

    // Calculate earned game XP
    let examXp = 50; // Base completion XP
    if (correctCount === totalQuestions && totalQuestions > 0) {
      examXp += 100; // Full marks bonus XP
    }
    if (timeTaken > 0 && totalQuestions > 0 && (timeTaken / totalQuestions) < 15) {
      examXp += 25; // Speed completion XP
    }
    if (accuracy >= 90) {
      examXp += 30; // High accuracy bonus XP
    }
    // Days in a streak XP
    examXp += Math.min(100, currentStreak * 10);

    const totalXp = accumulatedXp + examXp;

    // Badges determination
    let badge = 'Bronze';
    if (totalXp >= 3500) {
      badge = 'Master';
    } else if (totalXp >= 1500) {
      badge = 'Gold';
    } else if (totalXp >= 500) {
      badge = 'Silver';
    }

    // Calculate subject/chapter strength over all attempts dynamically
    let strongestSubject = 'General';
    let weakestSubject = 'General';
    let strongestChapter = 'All';
    let weakestChapter = 'All';

    try {
      const { data: attempts } = await supabase
        .from('exam_attempts')
        .select('subject, chapter, correct_count, total_questions')
        .eq('user_id', uId);
      
      const allAttempts = attempts || [];
      // Combine with the current pending attempt
      allAttempts.push({
        subject: attemptData.subject || 'General',
        chapter: attemptData.chapter || 'All',
        correct_count: correctCount,
        total_questions: totalQuestions
      } as any);

      if (allAttempts.length > 0) {
        const subMap: Record<string, { correct: number, total: number }> = {};
        const chapMap: Record<string, { correct: number, total: number }> = {};
        
        allAttempts.forEach(att => {
          const s = att.subject || 'General';
          const c = att.chapter || 'All';
          const corr = att.correct_count || 0;
          const tot = att.total_questions || 1;
          
          if (!subMap[s]) subMap[s] = { correct: 0, total: 0 };
          subMap[s].correct += corr;
          subMap[s].total += tot;
          
          if (!chapMap[c]) chapMap[c] = { correct: 0, total: 0 };
          chapMap[c].correct += corr;
          chapMap[c].total += tot;
        });
        
        let maxSubAcc = -1;
        let minSubAcc = 101;
        Object.entries(subMap).forEach(([sub, stats]) => {
          const acc = (stats.correct / (stats.total || 1)) * 100;
          if (acc > maxSubAcc) {
            maxSubAcc = acc;
            strongestSubject = sub;
          }
          if (acc < minSubAcc) {
            minSubAcc = acc;
            weakestSubject = sub;
          }
        });
        
        let maxChapAcc = -1;
        let minChapAcc = 101;
        Object.entries(chapMap).forEach(([chap, stats]) => {
          const acc = (stats.correct / (stats.total || 1)) * 100;
          if (acc > maxChapAcc) {
            maxChapAcc = acc;
            strongestChapter = chap;
          }
          if (acc < minChapAcc) {
            minChapAcc = acc;
            weakestChapter = chap;
          }
        });
      }
    } catch (err) {
      console.warn("Soft warning: failed calculating dynamic subject/chapter statistics:", err);
    }

    const calculatedCorrect = (existingStats?.total_correct || 0) + correctCount;
    const calculatedWrong = (existingStats?.total_wrong || 0) + wrongCount;
    const finalAccuracy = Number((calculatedCorrect / ((calculatedCorrect + calculatedWrong) || 1) * 100).toFixed(2));
    const finalPerformanceLevel = finalAccuracy >= 80 ? 'Expert' : finalAccuracy >= 55 ? 'Intermediate' : finalAccuracy >= 35 ? 'Beginner' : 'Novice';

    // Upsert User Stats
    const userStatsPayload = {
      user_id: uId,
      user_name: userName,
      user_photo: userPhoto,
      total_exams: existingStats ? (existingStats.total_exams || 0) + 1 : 1,
      total_correct: calculatedCorrect,
      total_wrong: calculatedWrong,
      total_skipped: (existingStats?.total_skipped || 0) + unansweredCount,
      total_xp: totalXp,
      xp: totalXp,
      streak: currentStreak,
      badge: badge,
      highest_score: existingStats ? Math.max(existingStats.highest_score || 0, score) : score,
      lowest_score: existingStats ? Math.min(existingStats.lowest_score || score, score) : score,
      average_score: existingStats
        ? Number((((existingStats.average_score || 0) * (existingStats.total_exams || 0) + score) / ((existingStats.total_exams || 0) + 1)).toFixed(2))
        : score,
      total_score: existingStats ? (existingStats.total_score || 0) + score : score,
      total_time: existingStats ? (existingStats.total_time || 0) + timeTaken : timeTaken,
      completion_time: existingStats ? (existingStats.completion_time || 0) + timeTaken : timeTaken,
      accuracy: finalAccuracy,
      performance_level: finalPerformanceLevel,
      strongest_subject: strongestSubject,
      weakest_subject: weakestSubject,
      strongest_chapter: strongestChapter,
      weakest_chapter: weakestChapter,
      updated_at: new Date().toISOString()
    };

    try {
      await this.safeWrite('user_stats', userStatsPayload, 'upsert');
    } catch (err: any) {
      console.error("Non-recoverable error in syncing user_stats secure table:", err);
      throw new Error(err.message || "Failed to update user statistics.");
    }

    // Insert Performance History entry
    const performanceHistoryRow = {
      user_id: uId,
      exam_id: examId,
      score: score,
      accuracy: accuracy,
      correct_answers: correctCount,
      wrong_answers: wrongCount,
      skipped_answers: unansweredCount,
      completion_time: timeTaken,
      subject: attemptData.subject || 'All',
      chapter: attemptData.chapter || 'All',
      topic: attemptData.topic || 'All',
      academic_class: userClass,
      academic_group: attemptData.academic_group || 'General',
      performance_level: score >= 80 ? 'Expert' : score >= 55 ? 'Intermediate' : score >= 35 ? 'Beginner' : 'Novice'
    };

    try {
      await this.safeWrite('performance_history', performanceHistoryRow, 'insert');
      console.log("[supabaseService] performance_history inserted successfully.");
    } catch (pfErr: any) {
      console.error("[supabaseService] Error writing to performance_history:", pfErr);
    }

    // Upsert Leaderboard entry for separate exam
    let existingLeaderboard: any = null;

    try {
      const { data: leadData } = await supabase
        .from('leaderboards')
        .select('*')
        .eq('user_id', uId)
        .eq('exam_id', examId)
        .maybeSingle();
      if (leadData) {
        existingLeaderboard = leadData;
      }
    } catch (e) {
      console.warn("Soft warning: failed fetching existing lead entry:", e);
    }

    const currentBestScore = existingLeaderboard 
      ? (existingLeaderboard.score !== undefined ? existingLeaderboard.score : (existingLeaderboard.best_score || 0)) 
      : 0;

    const bestScore = existingLeaderboard 
      ? Math.max(currentBestScore, score) 
      : score;

    const currentBestTime = existingLeaderboard 
      ? (existingLeaderboard.completion_time !== undefined ? existingLeaderboard.completion_time : (existingLeaderboard.time_taken || 999999)) 
      : 999999;

    const bestTime = existingLeaderboard && currentBestScore === bestScore
      ? Math.min(currentBestTime, timeTaken)
      : timeTaken;

    const totalAttempts = existingLeaderboard 
      ? (existingLeaderboard.total_attempts || 0) + 1 
      : 1;

    const leaderboardPayload = {
      academic_class: userClass,
      exam_id: examId,
      user_id: uId,
      user_name: userName,
      user_photo: userPhoto,
      best_score: bestScore,
      time_taken: bestTime,
      last_updated: new Date().toISOString(),
      exam_title: examTitle,
      first_submission_at: existingLeaderboard?.first_submission_at || new Date().toISOString(),
      total_attempts: totalAttempts,
      accuracy: accuracy,
      xp: examXp,
      streak: currentStreak,
      badge: badge,
      correct_count: correctCount,
      wrong_count: wrongCount,
      unanswered_count: unansweredCount,
      total_questions: totalQuestions
    };

    try {
      if (existingLeaderboard && existingLeaderboard.id) {
        await this.safeWrite('leaderboards', leaderboardPayload, 'update', existingLeaderboard.id);
      } else {
        await this.safeWrite('leaderboards', leaderboardPayload, 'insert');
      }
    } catch (err: any) {
      console.error("Non-recoverable error in syncing leaderboards table:", err);
      throw new Error(err.message || "Failed to submit leaderboard rank.");
    }

    return {
      xpGained: examXp,
      totalXp,
      streak: currentStreak,
      badge
    };
  },

  subscriptionTablesMissing: {
    packages: false,
    settings: false,
    benefits: false,
    requests: false,
    coupons: false
  },

  // SUBSCRIPTION SYSTEM METHODS
  async getSubscriptionSettings(): Promise<SubscriptionSettings> {
    try {
      const { data, error } = await supabase
        .from('subscription_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();
      
      if (error) {
        if (error.code === 'PGRST205' || String(error.message).toLowerCase().includes("schema cache") || String(error.message).toLowerCase().includes("does not exist")) {
          this.subscriptionTablesMissing.settings = true;
          throw error;
        }
        throw error;
      }
      
      this.subscriptionTablesMissing.settings = false;
      
      if (data) {
        return {
          id: data.id,
          current_price: Number(data.current_price || 500),
          old_price: Number(data.old_price || 1000),
          discount_percent: Number(data.discount_percent || 50),
          poster_image_url: data.poster_image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
          poster_title: data.poster_title || 'Parodorshhi Premium',
          poster_description: data.poster_description || 'Get full access to all premium exams, in-depth subject-specific interactive analytics, exclusive books and notes, and automatic future premium modules.',
          payment_number_bkash: data.payment_number_bkash || '01712345678',
          payment_number_nagad: data.payment_number_nagad || '01912345678',
          is_subscription_enabled: data.is_subscription_enabled !== false,
          stats_members: Number(data.stats_members || 1250),
          stats_exams: Number(data.stats_exams || 45),
          stats_notes: Number(data.stats_notes || 180),
          stats_sheets: Number(data.stats_sheets || 65)
        };
      }
    } catch (err: any) {
      if (err?.code === 'PGRST205' || String(err?.message || "").toLowerCase().includes("schema cache") || String(err?.message || "").toLowerCase().includes("does not exist")) {
        this.subscriptionTablesMissing.settings = true;
      }
      console.warn("[getSubscriptionSettings] Failed, loading from Local Storage falling back to default:", err);
      
      const stored = localStorage.getItem('fallback_subscription_settings');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
    }
    
    const defaults = {
      id: 'default',
      current_price: 500,
      old_price: 1000,
      discount_percent: 50,
      poster_image_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
      poster_title: 'Parodorshhi Premium',
      poster_description: 'Get full access to all premium exams, in-depth subject-specific interactive analytics, exclusive books and notes, and automatic future premium modules.',
      payment_number_bkash: '01712345678',
      payment_number_nagad: '01912345678',
      is_subscription_enabled: true,
      stats_members: 1250,
      stats_exams: 45,
      stats_notes: 180,
      stats_sheets: 65
    };
    localStorage.setItem('fallback_subscription_settings', JSON.stringify(defaults));
    return defaults;
  },

  async updateSubscriptionSettings(payload: Partial<SubscriptionSettings>): Promise<any> {
    if (this.subscriptionTablesMissing.settings) {
      console.log("[DEBUG updateSubscriptionSettings] Table is missing, saving to Local Storage");
      const current = await this.getSubscriptionSettings();
      const updated = { ...current, ...payload };
      localStorage.setItem('fallback_subscription_settings', JSON.stringify(updated));
      return updated;
    }

    try {
      return await this.safeWrite('subscription_settings', { ...payload, updated_at: new Date().toISOString() }, 'update', 'default');
    } catch (err: any) {
      if (err?.code === 'PGRST205' || String(err?.message).includes("schema cache") || String(err?.message || "").includes("does not exist")) {
        this.subscriptionTablesMissing.settings = true;
        return this.updateSubscriptionSettings(payload);
      }
      throw err;
    }
  },

  async getSubscriptionPackages(): Promise<SubscriptionPackage[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_packages')
        .select('*')
        .order('duration_days', { ascending: true });
      
      if (error) {
        if (error.code === 'PGRST205' || String(error.message).toLowerCase().includes("schema cache") || String(error.message).toLowerCase().includes("does not exist")) {
          this.subscriptionTablesMissing.packages = true;
          throw error;
        }
        throw error;
      }
      
      this.subscriptionTablesMissing.packages = false;
      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        duration_days: Number(p.duration_days),
        price: Number(p.price),
        old_price: p.old_price ? Number(p.old_price) : undefined,
        discount_percent: p.discount_percent ? Number(p.discount_percent) : undefined,
        is_active: p.is_active !== false,
        created_at: p.created_at,
        is_most_popular: !!p.is_most_popular
      }));
    } catch (err: any) {
      if (err?.code === 'PGRST205' || String(err?.message || "").toLowerCase().includes("schema cache") || String(err?.message || "").toLowerCase().includes("does not exist")) {
        this.subscriptionTablesMissing.packages = true;
      }
      console.error("[getSubscriptionPackages] Failed to read packages from Supabase, loading from Local Storage.", err);
      
      const stored = localStorage.getItem('fallback_subscription_packages');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error("Local storage parse err for packages:", e);
        }
      }
      
      const defaults = [
        { id: '6eb71c66-4191-496c-9c9a-5b62b70f0e79', name: '1 Month', duration_days: 30, price: 500, old_price: 1000, discount_percent: 50, is_active: true, is_most_popular: false },
        { id: '8e25dd06-9b93-4fc9-b541-6927bf4be90b', name: '3 Months', duration_days: 90, price: 1200, old_price: 2400, discount_percent: 50, is_active: true, is_most_popular: true },
        { id: 'ef87bdde-0168-45ec-8968-3be3d460e6bb', name: '6 Months', duration_days: 180, price: 2000, old_price: 4000, discount_percent: 50, is_active: true, is_most_popular: false },
        { id: 'ac3e04e1-ef92-42ec-a070-df6746e59e66', name: '12 Months', duration_days: 365, price: 3500, old_price: 7000, discount_percent: 50, is_active: true, is_most_popular: false }
      ];
      localStorage.setItem('fallback_subscription_packages', JSON.stringify(defaults));
      return defaults;
    }
  },

  async updateSubscriptionPackage(id: string, payload: Partial<SubscriptionPackage>): Promise<any> {
    if (this.subscriptionTablesMissing.packages) {
      console.log("[DEBUG updateSubscriptionPackage] Table is missing, updating in Local Storage for ID:", id);
      const stored = localStorage.getItem('fallback_subscription_packages');
      let pkgs: SubscriptionPackage[] = stored ? JSON.parse(stored) : [];
      pkgs = pkgs.map(p => p.id === id ? { ...p, ...payload } : p);
      localStorage.setItem('fallback_subscription_packages', JSON.stringify(pkgs));
      return { success: true };
    }

    try {
      return await this.safeWrite('subscription_packages', payload, 'update', id);
    } catch (err: any) {
      console.error("[updateSubscriptionPackage] Error:", err);
      if (err?.code === 'PGRST205' || String(err?.message).includes("schema cache") || String(err?.message || "").includes("does not exist")) {
        this.subscriptionTablesMissing.packages = true;
        return this.updateSubscriptionPackage(id, payload);
      }
      throw err;
    }
  },

  async createSubscriptionPackage(payload: Omit<SubscriptionPackage, 'id'>): Promise<any> {
    if (this.subscriptionTablesMissing.packages) {
      console.log("[DEBUG createSubscriptionPackage] Table is missing, saving to Local Storage");
      const stored = localStorage.getItem('fallback_subscription_packages');
      let pkgs: SubscriptionPackage[] = stored ? JSON.parse(stored) : [];
      const newId = crypto.randomUUID ? crypto.randomUUID() : 'local-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      const newPkg: SubscriptionPackage = {
        ...payload,
        id: newId,
        created_at: new Date().toISOString()
      };
      pkgs.push(newPkg);
      localStorage.setItem('fallback_subscription_packages', JSON.stringify(pkgs));
      return newPkg;
    }

    try {
      return await this.safeWrite('subscription_packages', payload, 'insert');
    } catch (err: any) {
      console.error("[createSubscriptionPackage] Error:", err);
      if (err?.code === 'PGRST205' || String(err?.message).includes("schema cache") || String(err?.message || "").includes("does not exist")) {
        this.subscriptionTablesMissing.packages = true;
        // Retry dynamically on localStorage
        return this.createSubscriptionPackage(payload);
      }
      throw err;
    }
  },

  async deleteSubscriptionPackage(id: string, name?: string): Promise<any> {
    console.log("[DEBUG deleteSubscriptionPackage] Starting delete for package:", { id, name });
    
    if (this.subscriptionTablesMissing.packages) {
      console.log("[DEBUG deleteSubscriptionPackage] Table is missing, deleting from Local Storage for ID/Name:", id, name);
      const stored = localStorage.getItem('fallback_subscription_packages');
      let pkgs: SubscriptionPackage[] = stored ? JSON.parse(stored) : [];
      let initialCount = pkgs.length;
      
      pkgs = pkgs.filter(p => p.id !== id && p.name !== name);
      
      if (pkgs.length === initialCount && name) {
        pkgs = pkgs.filter(p => !p.name.includes(name) && !name.includes(p.name));
      }
      
      localStorage.setItem('fallback_subscription_packages', JSON.stringify(pkgs));
      console.log("[DEBUG deleteSubscriptionPackage] Local Storage packages after deleting:", pkgs);
      return { success: true, count: initialCount - pkgs.length };
    }

    let query = supabase.from('subscription_packages').delete();
    let deleteCondition: any = {};
    if (id && id.length > 5) {
      query = query.eq('id', id);
      deleteCondition = { id };
    } else if (name) {
      query = query.eq('name', name);
      deleteCondition = { name };
    } else {
      query = query.eq('id', id);
      deleteCondition = { id };
    }

    console.log("[DEBUG deleteSubscriptionPackage] Sending delete query with condition:", deleteCondition);
    const { error } = await query;

    if (error) {
      console.error("[deleteSubscriptionPackage] failed to delete package:", error);
      if (error.code === 'PGRST205' || String(error.message).includes("schema cache") || String(error.message).includes("does not exist")) {
        this.subscriptionTablesMissing.packages = true;
        return this.deleteSubscriptionPackage(id, name);
      }
      throw new Error(error.message || "Database request failure during package removal.");
    }

    console.log("[DEBUG deleteSubscriptionPackage] Successfully deleted package.");
    return { success: true };
  },

  async getSubscriptionBenefits(): Promise<SubscriptionBenefit[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_benefits')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) {
        if (error.code === 'PGRST205' || String(error.message).toLowerCase().includes("schema cache") || String(error.message).toLowerCase().includes("does not exist")) {
          this.subscriptionTablesMissing.benefits = true;
          throw error;
        }
        throw error;
      }
      this.subscriptionTablesMissing.benefits = false;
      return (data || []).map((b: any) => ({
        id: b.id,
        text: b.text,
        is_active: b.is_active !== false,
        created_at: b.created_at
      }));
    } catch (err: any) {
      if (err?.code === 'PGRST205' || String(err?.message || "").toLowerCase().includes("schema cache") || String(err?.message || "").toLowerCase().includes("does not exist")) {
        this.subscriptionTablesMissing.benefits = true;
      }
      console.error("[getSubscriptionBenefits] Failed to read benefits:", err);
      
      const stored = localStorage.getItem('fallback_subscription_benefits');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
      
      const defaults = [
        { id: 'b1', text: 'Premium Exams', is_active: true },
        { id: 'b2', text: 'Advanced Performance Analytics', is_active: true },
        { id: 'b3', text: 'Exclusive Resources', is_active: true },
        { id: 'b4', text: 'Future Premium Features', is_active: true }
      ];
      localStorage.setItem('fallback_subscription_benefits', JSON.stringify(defaults));
      return defaults;
    }
  },

  async createSubscriptionBenefit(text: string): Promise<any> {
    if (this.subscriptionTablesMissing.benefits) {
      console.log("[DEBUG createSubscriptionBenefit] Table is missing, saving to Local Storage");
      const stored = localStorage.getItem('fallback_subscription_benefits');
      const list: SubscriptionBenefit[] = stored ? JSON.parse(stored) : [];
      const item: SubscriptionBenefit = {
        id: crypto.randomUUID ? crypto.randomUUID() : 'local-ben-' + Date.now(),
        text,
        is_active: true,
        created_at: new Date().toISOString()
      };
      list.push(item);
      localStorage.setItem('fallback_subscription_benefits', JSON.stringify(list));
      return item;
    }

    try {
      return await this.safeWrite('subscription_benefits', { text, is_active: true }, 'insert');
    } catch (err: any) {
      if (err?.code === 'PGRST205' || String(err?.message).includes("schema cache") || String(err?.message || "").includes("does not exist")) {
        this.subscriptionTablesMissing.benefits = true;
        return this.createSubscriptionBenefit(text);
      }
      throw err;
    }
  },

  async deleteSubscriptionBenefit(id: string, text?: string): Promise<any> {
    if (this.subscriptionTablesMissing.benefits) {
      console.log("[DEBUG deleteSubscriptionBenefit] Table is missing, deleting from Local Storage");
      const stored = localStorage.getItem('fallback_subscription_benefits');
      let list: SubscriptionBenefit[] = stored ? JSON.parse(stored) : [];
      list = list.filter(b => b.id !== id && b.text !== text);
      localStorage.setItem('fallback_subscription_benefits', JSON.stringify(list));
      return { success: true };
    }

    let query = supabase.from('subscription_benefits').delete();
    if (id && id.length > 5) {
      query = query.eq('id', id);
    } else if (text) {
      query = query.eq('text', text);
    } else {
      query = query.eq('id', id);
    }
    const { error } = await query;
    if (error) {
      if (error.code === 'PGRST205' || String(error.message).includes("schema cache") || String(error.message).includes("does not exist")) {
        this.subscriptionTablesMissing.benefits = true;
        return this.deleteSubscriptionBenefit(id, text);
      }
      console.error("[deleteSubscriptionBenefit] failed to delete benefit:", error);
      throw error;
    }
    return { success: true };
  },

  async updateSubscriptionBenefit(id: string, text: string): Promise<any> {
    if (this.subscriptionTablesMissing.benefits) {
      console.log("[DEBUG updateSubscriptionBenefit] Table is missing, updating in Local Storage for ID:", id);
      const stored = localStorage.getItem('fallback_subscription_benefits');
      let list: SubscriptionBenefit[] = stored ? JSON.parse(stored) : [];
      list = list.map(b => b.id === id ? { ...b, text } : b);
      localStorage.setItem('fallback_subscription_benefits', JSON.stringify(list));
      return { success: true };
    }

    try {
      return await this.safeWrite('subscription_benefits', { text }, 'update', id);
    } catch (err: any) {
      console.error("[updateSubscriptionBenefit] Error:", err);
      if (err?.code === 'PGRST205' || String(err?.message).includes("schema cache") || String(err?.message || "").includes("does not exist")) {
        this.subscriptionTablesMissing.benefits = true;
        return this.updateSubscriptionBenefit(id, text);
      }
      throw err;
    }
  },

  async getSubscriptionRequests(): Promise<SubscriptionRequest[]> {
    try {
      let data: any[] | null = null;
      let error: any = null;

      // Try 1: with explicit foreign key name
      const try1 = await supabase
        .from('subscription_requests')
        .select('*, user_profiles:profiles!subscription_requests_user_id_fkey(full_name, email)')
        .order('created_at', { ascending: false });
      
      data = try1.data;
      error = try1.error;

      const isTableMissingError = (err: any) => {
        if (!err) return false;
        const msg = String(err.message || "").toLowerCase();
        return err.code === '42P01' || msg.includes("42p01") || (msg.includes("does not exist") && (msg.includes("relation") || msg.includes("table")));
      };

      // Try 2: with user_id hint if Try 1 failed with a join/relationship error (not table-missing error)
      if (error && !isTableMissingError(error)) {
        console.warn("[getSubscriptionRequests] Try 1 join failed, trying Try 2 with profiles!user_id join:", error);
        const try2 = await supabase
          .from('subscription_requests')
          .select('*, user_profiles:profiles!user_id(full_name, email)')
          .order('created_at', { ascending: false });
        data = try2.data;
        error = try2.error;
      }

      // Try 3: with simple profiles join
      if (error && !isTableMissingError(error)) {
        console.warn("[getSubscriptionRequests] Try 2 join failed, trying Try 3 with simple profiles join:", error);
        const try3 = await supabase
          .from('subscription_requests')
          .select('*, user_profiles:profiles(full_name, email)')
          .order('created_at', { ascending: false });
        data = try3.data;
        error = try3.error;
      }

      // Try 4: with absolutely no join
      if (error && !isTableMissingError(error)) {
        console.warn("[getSubscriptionRequests] Try 3 join failed, trying Try 4 with no join at all:", error);
        const try4 = await supabase
          .from('subscription_requests')
          .select('*')
          .order('created_at', { ascending: false });
        data = try4.data;
        error = try4.error;
      }

      if (error) {
        throw error;
      }

      this.subscriptionTablesMissing.requests = false;
      const requestsList = data || [];
      const hasJoinedProfiles = requestsList.length > 0 && requestsList[0].user_profiles !== undefined;
      
      if (!hasJoinedProfiles && requestsList.length > 0) {
        try {
          console.log("[getSubscriptionRequests] Manually fetching user profiles for requests mapping...");
          const userIds = Array.from(new Set(requestsList.map((r: any) => r.user_id)));
          const { data: profiles, error: pErr } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);
          
          if (!pErr && profiles) {
            const profileMap = new Map(profiles.map(p => [p.id, p]));
            requestsList.forEach((r: any) => {
              const uProfile = profileMap.get(r.user_id);
              if (uProfile) {
                r.user_profiles = {
                  full_name: uProfile.full_name || 'Anonymous User',
                  email: uProfile.email || ''
                };
              }
            });
          }
        } catch (mapErr) {
          console.warn("[getSubscriptionRequests] Mapping profiles failed:", mapErr);
        }
      }

      return requestsList.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        package_name: r.package_name,
        amount: Number(r.amount),
        payment_method: r.payment_method,
        transaction_id: r.transaction_id,
        payment_number: r.payment_number,
        status: r.status,
        approved_by: r.approved_by,
        approved_at: r.approved_at,
        created_at: r.created_at,
        admin_note: r.admin_note,
        coupon_code: r.coupon_code,
        original_amount: r.original_amount ? Number(r.original_amount) : undefined,
        discount_amount: r.discount_amount ? Number(r.discount_amount) : undefined,
        user_profiles: r.user_profiles ? {
          full_name: (r.user_profiles as any).full_name || 'Anonymous User',
          email: (r.user_profiles as any).email || ''
        } : undefined
      }));
    } catch (err: any) {
      const msg = String(err?.message || "").toLowerCase();
      const isTrulyMissing = err?.code === '42P01' || msg.includes("42p01") || (msg.includes("does not exist") && (msg.includes("relation") || msg.includes("table")));
      if (isTrulyMissing) {
        this.subscriptionTablesMissing.requests = true;
      }
      console.error("[getSubscriptionRequests] Failed to fetch requests. State:", { isTrulyMissing, message: err?.message, code: err?.code });
      
      const stored = localStorage.getItem('fallback_subscription_requests');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
      return [];
    }
  },

  async submitSubscriptionRequest(payload: Omit<SubscriptionRequest, 'id' | 'status'>): Promise<any> {
    const isTrulyMissing = (err: any) => {
      if (!err) return false;
      const msg = String(err.message || "").toLowerCase();
      return err.code === '42P01' || msg.includes("42p01") || (msg.includes("does not exist") && (msg.includes("relation") || msg.includes("table")));
    };

    if (this.subscriptionTablesMissing.requests) {
      console.log("[DEBUG submitSubscriptionRequest] Table is missing, saving to Local Storage");
      const stored = localStorage.getItem('fallback_subscription_requests');
      const list: SubscriptionRequest[] = stored ? JSON.parse(stored) : [];
      let user_profiles = { full_name: 'Student', email: '' };
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
          if (profile) {
            user_profiles = {
              full_name: profile.full_name || 'Student',
              email: profile.email || user.email || ''
            };
          }
        }
      } catch (e) {}

      const item: SubscriptionRequest = {
        ...payload,
        id: crypto.randomUUID ? crypto.randomUUID() : 'local-req-' + Date.now(),
        status: 'pending',
        created_at: new Date().toISOString(),
        user_profiles
      };
      list.unshift(item);
      localStorage.setItem('fallback_subscription_requests', JSON.stringify(list));
      return item;
    }

    try {
      return await this.safeWrite('subscription_requests', {
        ...payload,
        status: 'pending'
      }, 'insert');
    } catch (err: any) {
      if (isTrulyMissing(err)) {
        this.subscriptionTablesMissing.requests = true;
        return this.submitSubscriptionRequest(payload);
      }
      throw err;
    }
  },

  async getPendingRequestsForUser(userId: string): Promise<SubscriptionRequest[]> {
    const isTrulyMissing = (err: any) => {
      if (!err) return false;
      const msg = String(err.message || "").toLowerCase();
      return err.code === '42P01' || msg.includes("42p01") || (msg.includes("does not exist") && (msg.includes("relation") || msg.includes("table")));
    };

    if (this.subscriptionTablesMissing.requests) {
      const stored = localStorage.getItem('fallback_subscription_requests');
      const list: SubscriptionRequest[] = stored ? JSON.parse(stored) : [];
      return list.filter(r => r.user_id === userId && r.status === 'pending');
    }

    try {
      const { data, error } = await supabase
        .from('subscription_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending');
      
      if (error) {
        if (isTrulyMissing(error)) {
          this.subscriptionTablesMissing.requests = true;
          throw error;
        }
        throw error;
      }
      this.subscriptionTablesMissing.requests = false;
      return data || [];
    } catch (err: any) {
      if (isTrulyMissing(err)) {
        this.subscriptionTablesMissing.requests = true;
      }
      console.warn("[getPendingRequestsForUser] Falling back to Local Storage due to missing requests table structure:", err);
      const stored = localStorage.getItem('fallback_subscription_requests');
      const list: SubscriptionRequest[] = stored ? JSON.parse(stored) : [];
      return list.filter(r => r.user_id === userId && r.status === 'pending');
    }
  },

  async getRequestsForUser(userId: string): Promise<SubscriptionRequest[]> {
    const isTrulyMissing = (err: any) => {
      if (!err) return false;
      const msg = String(err.message || "").toLowerCase();
      return err.code === '42P01' || msg.includes("42p01") || (msg.includes("does not exist") && (msg.includes("relation") || msg.includes("table")));
    };

    if (this.subscriptionTablesMissing.requests) {
      const stored = localStorage.getItem('fallback_subscription_requests');
      const list: SubscriptionRequest[] = stored ? JSON.parse(stored) : [];
      return list.filter(r => r.user_id === userId);
    }

    try {
      const { data, error } = await supabase
        .from('subscription_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        if (isTrulyMissing(error)) {
          this.subscriptionTablesMissing.requests = true;
          throw error;
        }
        throw error;
      }
      this.subscriptionTablesMissing.requests = false;
      return data || [];
    } catch (err: any) {
      if (isTrulyMissing(err)) {
        this.subscriptionTablesMissing.requests = true;
      }
      console.warn("[getRequestsForUser] Falling back to Local Storage due to missing requests table structure:", err);
      const stored = localStorage.getItem('fallback_subscription_requests');
      const list: SubscriptionRequest[] = stored ? JSON.parse(stored) : [];
      return list.filter(r => r.user_id === userId);
    }
  },

  async approveSubscriptionRequest(requestId: string, userId: string, durationDays: number, adminId: string, adminNote?: string): Promise<any> {
    console.log("[DEBUG approveSubscriptionRequest] Initializing approval workflow:", { requestId, userId, durationDays, adminId, adminNote });
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);
    const isoString = expiresAt.toISOString();

    // 1. UPDATE LOCAL STORAGE FALLBACK ALWAYS (Ensure instant local consistency)
    try {
      console.log("[DEBUG approveSubscriptionRequest] Synchronizing local storage fallback...");
      const stored = localStorage.getItem('fallback_subscription_requests');
      let list: SubscriptionRequest[] = stored ? JSON.parse(stored) : [];
      let foundLocal = false;
      list = list.map(r => {
        if (r.id === requestId) {
          foundLocal = true;
          return {
            ...r,
            status: 'approved',
            approved_by: adminId,
            approved_at: new Date().toISOString(),
            admin_note: adminNote || null,
            expiry_date: isoString
          };
        }
        return r;
      });
      localStorage.setItem('fallback_subscription_requests', JSON.stringify(list));
      console.log("[DEBUG approveSubscriptionRequest] Local storage fallback sync completed.");
    } catch (err) {
      console.error("[DEBUG approveSubscriptionRequest] Local Storage sync failed:", err);
    }

    // 2. RETRIEVE REQUEST FOR SYSTEM LOG & PLAN VERIFICATION
    let reqPackageName = "Unknown Plan";
    try {
      const { data: requestRecord } = await supabase
        .from('subscription_requests')
        .select('package_name')
        .eq('id', requestId)
        .maybeSingle();
      if (requestRecord) {
        reqPackageName = requestRecord.package_name;
        console.log("[DEBUG approveSubscriptionRequest] Retrieved plan/package from DB:", reqPackageName);
      }
    } catch (fetchErr) {
      console.warn("[DEBUG approveSubscriptionRequest] Failed to pre-fetch request info:", fetchErr);
    }

    // 3. IF REQUEST TABLES ARE DECLARED MISSING, SKIP DB UPDATE FOR REQUEST
    if (this.subscriptionTablesMissing.requests) {
      console.log("[DEBUG approveSubscriptionRequest] Requests table marked missing. Granting profile access directly...");
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            has_premium_access: true,
            premium_expiry: isoString
          })
          .eq('id', userId);
        
        if (profileError) throw profileError;
        console.log("[DEBUG approveSubscriptionRequest] Premium profile granted successfully.");
      } catch (err) {
        console.error("[DEBUG approveSubscriptionRequest] Failed to update profile premium access in Supabase:", err);
      }
      return { success: true };
    }

    // 4. DATABASE UPDATE: subscription_requests
    let dbUpdated = false;
    let finalUpdateError = null;
    let finalUpdateResponse = null;

    try {
      console.log("[DEBUG approveSubscriptionRequest] Attempting update query on subscription_requests.id:", requestId, "for user:", userId);
      const { data: updateData, error: dbError } = await supabase
        .from('subscription_requests')
        .update({
          status: 'approved',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          admin_note: adminNote || null,
          expiry_date: isoString
        } as any)
        .eq('id', requestId)
        .select();

      finalUpdateResponse = { data: updateData, error: dbError };
      console.log("[DEBUG approveSubscriptionRequest] Update Result & Supabase Response:", {
        requestId,
        userId,
        tableName: 'subscription_requests',
        rowTargeted: 'id',
        targetId: requestId,
        supabaseResponse: finalUpdateResponse,
        matchedRows: updateData?.length || 0
      });

      if (!dbError) {
        dbUpdated = true;
        console.log("[DEBUG approveSubscriptionRequest] Database update succeeded with expiry_date column! Details: ", updateData);
      } else {
        finalUpdateError = dbError;
        console.warn("[DEBUG approveSubscriptionRequest] DB update failed with expiry_date. Retrying without it...", dbError);
      }
    } catch (dbErr: any) {
      finalUpdateError = dbErr;
      console.error("[DEBUG approveSubscriptionRequest] Failed to update request using expiry_date column directly:", dbErr);
    }

    // If step above failed, retry with standard columns only
    if (!dbUpdated) {
      try {
        console.log("[DEBUG approveSubscriptionRequest] Retrying database update without 'expiry_date' column...");
        const compositeNote = adminNote 
          ? `[Expiry: ${new Date(isoString).toLocaleDateString()}] ${adminNote}` 
          : `[Expiry: ${new Date(isoString).toLocaleDateString()}]`;

        const { data: retryData, error: retryError } = await supabase
          .from('subscription_requests')
          .update({
            status: 'approved',
            approved_by: adminId,
            approved_at: new Date().toISOString(),
            admin_note: compositeNote
          })
          .eq('id', requestId)
          .select();

        finalUpdateResponse = { data: retryData, error: retryError };
        console.log("[DEBUG approveSubscriptionRequest] Retry standard update Result & Supabase Response:", {
          requestId,
          userId,
          tableName: 'subscription_requests',
          rowTargeted: 'id',
          targetId: requestId,
          supabaseResponse: finalUpdateResponse,
          matchedRows: retryData?.length || 0
        });

        if (retryError) {
          console.error("[DEBUG approveSubscriptionRequest] Standard column update retry failed:", retryError);
          const msg = String(retryError.message || "").toLowerCase();
          const isTrulyMissing = retryError.code === '42P01' || msg.includes("42p01") || (msg.includes("does not exist") && (msg.includes("relation") || msg.includes("table")));
          if (isTrulyMissing) {
            console.log("[DEBUG approveSubscriptionRequest] Marking subscription requests table as missing.");
            this.subscriptionTablesMissing.requests = true;
            return this.approveSubscriptionRequest(requestId, userId, durationDays, adminId, adminNote);
          }
          throw retryError;
        }
        dbUpdated = true;
        finalUpdateError = null;
        console.log("[DEBUG approveSubscriptionRequest] Standard column update retry succeeded! Details: ", retryData);
      } catch (err: any) {
        console.error("[DEBUG approveSubscriptionRequest] Exception during standard columns update:", err);
        throw err;
      }
    }

    // Ensure database update succeeds before showing success message (guideline 10)
    if (!dbUpdated && finalUpdateError) {
      throw new Error(`Failed to update subscription_requests status of row ${requestId} in Supabase database: ${finalUpdateError.message || JSON.stringify(finalUpdateError)}`);
    }

    // 5. DATABASE UPDATE: profiles (Grant Premium Access)
    console.log("[DEBUG approveSubscriptionRequest] Database update: Granting user premium profile...");
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        has_premium_access: true,
        premium_expiry: isoString
      })
      .eq('id', userId);

    if (profileError) {
      console.error("[DEBUG approveSubscriptionRequest] failed to update profiles table:", profileError);
      throw new Error(`Profile update failed: ${profileError.message || JSON.stringify(profileError)}. Please ensure 'Admins can update all profiles' RLS policy is ran on public.profiles table in Supabase.`);
    }
    console.log("[DEBUG approveSubscriptionRequest] User profile premium state updated.");

    // 6. DATABASE UPDATE: user_roles (Grant Premium Role)
    try {
      console.log("[DEBUG approveSubscriptionRequest] Database update: Synchronizing user_roles table...");
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        await supabase
          .from('user_roles')
          .update({ is_premium: true })
          .eq('user_id', userId);
        console.log("[DEBUG approveSubscriptionRequest] Existing user role status set to is_premium=true.");
      } else {
        await this.safeWrite('user_roles', {
          user_id: userId,
          role: 'user',
          is_premium: true
        }, 'insert');
        console.log("[DEBUG approveSubscriptionRequest] Inserted new user role record with is_premium=true.");
      }
    } catch (roleErr) {
      console.warn("[DEBUG approveSubscriptionRequest] non-blocking fail to update user_roles:", roleErr);
    }

    console.log("[DEBUG approveSubscriptionRequest] Completed approval workflow perfectly!");
    return { success: true };
  },

  async rejectSubscriptionRequest(requestId: string, adminId: string, adminNote?: string): Promise<any> {
    console.log("[DEBUG rejectSubscriptionRequest] Initializing rejection workflow:", { requestId, adminId, adminNote });

    // 1. UPDATE LOCAL STORAGE FALLBACK ALWAYS
    try {
      console.log("[DEBUG rejectSubscriptionRequest] Synchronizing local storage fallback...");
      const stored = localStorage.getItem('fallback_subscription_requests');
      let list: SubscriptionRequest[] = stored ? JSON.parse(stored) : [];
      list = list.map(r => r.id === requestId ? {
        ...r,
        status: 'rejected',
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        admin_note: adminNote || null
      } : r);
      localStorage.setItem('fallback_subscription_requests', JSON.stringify(list));
      console.log("[DEBUG rejectSubscriptionRequest] Local storage fallback sync complete.");
    } catch (err) {
      console.error("[DEBUG rejectSubscriptionRequest] Local Storage sync failed:", err);
    }

    if (this.subscriptionTablesMissing.requests) {
      console.log("[DEBUG rejectSubscriptionRequest] Table marked missing, returning true via local only path.");
      return { success: true };
    }

    console.log("[DEBUG rejectSubscriptionRequest] Database update: setting request state to rejected...");
    const { data: rejectData, error } = await supabase
      .from('subscription_requests')
      .update({
        status: 'rejected',
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        admin_note: adminNote || null
      })
      .eq('id', requestId)
      .select();

    console.log("[DEBUG rejectSubscriptionRequest] Update Result & Supabase Response:", {
      requestId,
      tableName: 'subscription_requests',
      rowTargeted: 'id',
      targetId: requestId,
      supabaseResponse: { data: rejectData, error },
      matchedRows: rejectData?.length || 0
    });

    if (error) {
      console.error("[DEBUG rejectSubscriptionRequest] Database update failed:", error);
      const msg = String(error.message || "").toLowerCase();
      const isTrulyMissing = error.code === '42P01' || msg.includes("42p01") || (msg.includes("does not exist") && (msg.includes("relation") || msg.includes("table")));
      if (isTrulyMissing) {
        this.subscriptionTablesMissing.requests = true;
        return this.rejectSubscriptionRequest(requestId, adminId, adminNote);
      }
      throw error;
    }

    console.log("[DEBUG rejectSubscriptionRequest] Rejection completed successfully in database! Data: ", rejectData);
    return { success: true };
  },

  // --- COUPON WORK engine (Feature 9) ---
  async getCoupons(): Promise<SubscriptionCoupon[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_coupons')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        if (error.code === 'PGRST205' || String(error.message).toLowerCase().includes("schema cache") || String(error.message).toLowerCase().includes("does not exist")) {
          this.subscriptionTablesMissing.coupons = true;
          throw error;
        }
        throw error;
      }
      this.subscriptionTablesMissing.coupons = false;
      return (data || []).map((c: any) => ({
        id: c.id,
        code: c.code,
        discount_type: c.discount_type,
        discount_value: Number(c.discount_value),
        expiry_date: c.expiry_date,
        usage_limit: c.usage_limit ? Number(c.usage_limit) : null,
        is_active: c.is_active !== false,
        created_at: c.created_at,
        used_count: Number(c.used_count || 0)
      }));
    } catch (err: any) {
      this.subscriptionTablesMissing.coupons = true;
      console.warn("[getCoupons] Failed to load from Supabase, loading from Local Storage falling back to defaults.", err);
      const stored = localStorage.getItem('fallback_subscription_coupons');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
      const defaults: SubscriptionCoupon[] = [
        { id: 'c1', code: 'PREMIUM10', discount_type: 'percentage', discount_value: 10, is_active: true, expiry_date: '2027-12-31' },
        { id: 'c2', code: 'SAVE50', discount_type: 'fixed', discount_value: 50, is_active: true, expiry_date: '2027-12-31' },
        { id: 'c3', code: 'WELCOME20', discount_type: 'percentage', discount_value: 20, is_active: true, expiry_date: '2027-12-31' }
      ];
      localStorage.setItem('fallback_subscription_coupons', JSON.stringify(defaults));
      return defaults;
    }
  },

  async createCoupon(payload: Omit<SubscriptionCoupon, 'id'>): Promise<any> {
    if (this.subscriptionTablesMissing.coupons) {
      const stored = localStorage.getItem('fallback_subscription_coupons');
      const list: SubscriptionCoupon[] = stored ? JSON.parse(stored) : [];
      const newItem: SubscriptionCoupon = {
        ...payload,
        id: 'coupon-' + Date.now(),
        created_at: new Date().toISOString(),
        used_count: 0
      };
      list.push(newItem);
      localStorage.setItem('fallback_subscription_coupons', JSON.stringify(list));
      return newItem;
    }
    try {
      return await this.safeWrite('subscription_coupons', payload, 'insert');
    } catch (err: any) {
      if (err?.code === 'PGRST205' || String(err?.message).includes("schema cache") || String(err?.message || "").includes("does not exist")) {
        this.subscriptionTablesMissing.coupons = true;
        return this.createCoupon(payload);
      }
      throw err;
    }
  },

  async updateCoupon(id: string, payload: Partial<SubscriptionCoupon>): Promise<any> {
    if (this.subscriptionTablesMissing.coupons) {
      const stored = localStorage.getItem('fallback_subscription_coupons');
      let list: SubscriptionCoupon[] = stored ? JSON.parse(stored) : [];
      list = list.map(c => c.id === id ? { ...c, ...payload } : c);
      localStorage.setItem('fallback_subscription_coupons', JSON.stringify(list));
      return { success: true };
    }
    try {
      return await this.safeWrite('subscription_coupons', payload, 'update', id);
    } catch (err: any) {
      if (err?.code === 'PGRST205' || String(err?.message).includes("schema cache") || String(err?.message || "").includes("does not exist")) {
        this.subscriptionTablesMissing.coupons = true;
        return this.updateCoupon(id, payload);
      }
      throw err;
    }
  },

  async deleteCoupon(id: string): Promise<any> {
    if (this.subscriptionTablesMissing.coupons) {
      const stored = localStorage.getItem('fallback_subscription_coupons');
      let list: SubscriptionCoupon[] = stored ? JSON.parse(stored) : [];
      list = list.filter(c => c.id !== id);
      localStorage.setItem('fallback_subscription_coupons', JSON.stringify(list));
      return { success: true };
    }
    try {
      const { error } = await supabase.from('subscription_coupons').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      if (err?.code === 'PGRST205' || String(err?.message).includes("schema cache") || String(err?.message || "").includes("does not exist")) {
        this.subscriptionTablesMissing.coupons = true;
        return this.deleteCoupon(id);
      }
      throw err;
    }
  },

  async updateUserPremiumExpiry(userId: string, expiresAt: string | null, isPremium: boolean): Promise<any> {
    // Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        has_premium_access: isPremium,
        premium_expiry: expiresAt
      })
      .eq('id', userId);

    if (profileError) throw profileError;

    // Update user_roles table
    try {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        await supabase
          .from('user_roles')
          .update({ is_premium: isPremium })
          .eq('user_id', userId);
      } else {
        await this.safeWrite('user_roles', {
          user_id: userId,
          role: 'user',
          is_premium: isPremium
        }, 'insert');
      }
    } catch (roleErr) {
      console.warn("[updateUserPremiumExpiry] failed to update user_roles:", roleErr);
    }
    return { success: true };
  },

  // Check if a question is bookmarked
  async isQuestionSaved(userId: string, questionId: string): Promise<boolean> {
    if (!userId || !questionId) return false;
    try {
      const { data, error } = await supabase
        .from('saved_questions')
        .select('*')
        .eq('user_id', userId)
        .eq('question_id', questionId)
        .limit(1);
      if (error) {
        console.warn("isQuestionSaved error:", error);
        return false;
      }
      return data && data.length > 0;
    } catch (e) {
      console.warn("isQuestionSaved error:", e);
      return false;
    }
  },

  // Save/bookmark a question
  async saveQuestion(userId: string, questionId: string): Promise<any> {
    if (!userId || !questionId) throw new Error("User ID and Question ID are required.");
    const isSaved = await this.isQuestionSaved(userId, questionId);
    if (isSaved) {
      return { success: true, message: "Already saved" };
    }
    const payload = {
      user_id: userId,
      question_id: questionId,
      saved_at: new Date().toISOString()
    };
    try {
      const data = await this.safeWrite('saved_questions', payload, 'insert');
      return { success: true, data };
    } catch (error) {
      console.error("Error saving question:", error);
      throw error;
    }
  },

  // Unsave/unbookmark a question
  async unsaveQuestion(userId: string, questionId: string): Promise<any> {
    if (!userId || !questionId) throw new Error("User ID and Question ID are required.");
    try {
      const { error } = await supabase
        .from('saved_questions')
        .delete()
        .eq('user_id', userId)
        .eq('question_id', questionId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error unsaving question:", error);
      throw error;
    }
  },

  // Get user's saved questions
  async getSavedQuestions(userId: string): Promise<any[]> {
    if (!userId) return [];
    try {
      // 1. Fetch saved question records
      const { data: savedData, error: savedError } = await supabase
        .from('saved_questions')
        .select('*')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });

      if (savedError) {
        console.warn("getSavedQuestions fetch error", savedError);
        return [];
      }
      if (!savedData || savedData.length === 0) return [];

      const questionIds = savedData.map((d: any) => d.question_id);

      // 2. Fetch actual question objects
      const { data: questionsData, error: qError } = await supabase
        .from('questions')
        .select('*')
        .in('id', questionIds);

      if (qError) {
        console.warn("Error fetching saved questions details", qError);
        return [];
      }

      // Map questions to frontend format with lookups
      const classLookup = new Map<string, string>();
      const subjectLookup = new Map<string, string>();
      const chapterLookup = new Map<string, string>();

      try {
        const [classesRes, subjectsRes, chaptersRes] = await Promise.allSettled([
          supabase.from('academic_classes').select('id, name'),
          supabase.from('subjects').select('id, name'),
          supabase.from('chapters').select('id, name')
        ]);
        const dbClasses = classesRes.status === 'fulfilled' ? classesRes.value.data : [];
        const dbSubjects = subjectsRes.status === 'fulfilled' ? subjectsRes.value.data : [];
        const dbChapters = chaptersRes.status === 'fulfilled' ? chaptersRes.value.data : [];
        (dbClasses || []).forEach(c => classLookup.set(c.id, c.name));
        (dbSubjects || []).forEach(s => subjectLookup.set(s.id, s.name));
        (dbChapters || []).forEach(ch => chapterLookup.set(ch.id, ch.name));
      } catch (e) {
        console.warn("getSavedQuestions lookup fetch failed, using fallback:", e);
      }

      const questionsMap = new Map<string, Question>();
      (questionsData || []).forEach((q: any) => {
        questionsMap.set(q.id, this.mapQuestionDBToFrontend(q, classLookup, subjectLookup, chapterLookup));
      });

      // 3. Assemble full SavedQuestion objects
      return savedData.map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        question_id: s.question_id,
        saved_at: s.saved_at || s.created_at,
        question: questionsMap.get(s.question_id)
      })).filter(s => s.question !== undefined);

    } catch (e) {
      console.error("getSavedQuestions error:", e);
      return [];
    }
  },

  // Save/record an incorrectly answered question
  async recordWrongQuestion(userId: string, questionId: string, userAnswer: string, correctAnswer: string, examId?: string | null, examType?: string): Promise<any> {
    if (!userId || !questionId) return null;
    try {
      // 1. Check if the wrong question already exists for this user to prevent duplicates and increment attempt
      const { data: existing, error: existingErr } = await supabase
        .from('wrong_questions')
        .select('*')
        .eq('user_id', userId)
        .eq('question_id', questionId)
        .limit(1);

      const nowStr = new Date().toISOString();
      if (!existingErr && existing && existing.length > 0) {
        // Already exists - update metadata like attempt count if supported
        const record = existing[0];
        const attempts = Number(record.attempts_count || 1) + 1;
        const payload = {
          user_answer: userAnswer,
          correct_answer: correctAnswer,
          exam_id: examId || null,
          exam_type: examType || 'General',
          attempts_count: attempts,
          updated_at: nowStr
        };
        const data = await this.safeWrite('wrong_questions', payload, 'update', record.id);
        return { success: true, updated: true, data };
      } else {
        // Insert new incorrect question row
        const payload = {
          user_id: userId,
          question_id: questionId,
          user_answer: userAnswer,
          correct_answer: correctAnswer,
          exam_id: examId || null,
          exam_type: examType || 'General',
          attempts_count: 1,
          created_at: nowStr,
          updated_at: nowStr
        };
        const data = await this.safeWrite('wrong_questions', payload, 'insert');
        return { success: true, inserted: true, data };
      }
    } catch (err) {
      console.error("Error storing incorrect question:", err);
      // Fallback: don't crash
      return null;
    }
  },

  // Get user's wrong questions
  async getWrongQuestions(userId: string): Promise<any[]> {
    if (!userId) return [];
    try {
      const { data: wrongData, error: wrongError } = await supabase
        .from('wrong_questions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (wrongError) {
        console.warn("getWrongQuestions fetch error:", wrongError);
        return [];
      }
      if (!wrongData || wrongData.length === 0) return [];

      const questionIds = wrongData.map((d: any) => d.question_id);

      // Fetch corresponding questions
      const { data: questionsData, error: qError } = await supabase
        .from('questions')
        .select('*')
        .in('id', questionIds);

      if (qError) {
        console.warn("Error fetching wrong questions details:", qError);
        return [];
      }

      // Map questions to frontend format with lookups
      const classLookup = new Map<string, string>();
      const subjectLookup = new Map<string, string>();
      const chapterLookup = new Map<string, string>();

      try {
        const [classesRes, subjectsRes, chaptersRes] = await Promise.allSettled([
          supabase.from('academic_classes').select('id, name'),
          supabase.from('subjects').select('id, name'),
          supabase.from('chapters').select('id, name')
        ]);
        const dbClasses = classesRes.status === 'fulfilled' ? classesRes.value.data : [];
        const dbSubjects = subjectsRes.status === 'fulfilled' ? subjectsRes.value.data : [];
        const dbChapters = chaptersRes.status === 'fulfilled' ? chaptersRes.value.data : [];
        (dbClasses || []).forEach(c => classLookup.set(c.id, c.name));
        (dbSubjects || []).forEach(s => subjectLookup.set(s.id, s.name));
        (dbChapters || []).forEach(ch => chapterLookup.set(ch.id, ch.name));
      } catch (e) {
        console.warn("getWrongQuestions lookup fetch failed:", e);
      }

      const questionsMap = new Map<string, Question>();
      (questionsData || []).forEach((q: any) => {
        questionsMap.set(q.id, this.mapQuestionDBToFrontend(q, classLookup, subjectLookup, chapterLookup));
      });

      return wrongData.map((w: any) => ({
        id: w.id,
        user_id: w.user_id,
        question_id: w.question_id,
        user_answer: w.user_answer,
        correct_answer: w.correct_answer,
        exam_id: w.exam_id,
        exam_type: w.exam_type,
        attempts_count: w.attempts_count || 1,
        created_at: w.created_at,
        question: questionsMap.get(w.question_id)
      })).filter(w => w.question !== undefined);

    } catch (err) {
      console.error("getWrongQuestions error:", err);
      return [];
    }
  },

  // Remove/resolve a wrong question (e.g., when the user gets it right)
  async removeWrongQuestion(userId: string, questionId: string): Promise<any> {
    if (!userId || !questionId) return null;
    try {
      const { error } = await supabase
        .from('wrong_questions')
        .delete()
        .eq('user_id', userId)
        .eq('question_id', questionId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error removing wrong question:", error);
      throw error;
    }
  }
};
