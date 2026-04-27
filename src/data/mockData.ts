import { ContentItem, Exam } from '../types';

export const INITIAL_DATA: ContentItem[] = [
  {
    id: '1',
    title: 'HSC Physics 1st Paper - Chapter 2 (Vector)',
    description: 'Complete notes for Class 11-12 Physics Vector chapter with examples.',
    category: 'Notes',
    academicClass: 'Class 12',
    subject: 'Physics',
    url: 'https://example.com/vector-notes.pdf',
    status: 'approved',
    chapter: 'Chapter 2',
    authorId: 'system',
    createdAt: Date.now()
  }
];

export const MOCK_EXAMS: Exam[] = [
  {
    id: 'e1',
    title: 'General Knowledge — Admission Special',
    timeLimit: 10,
    class: 'General',
    subject: 'General Knowledge',
    chapter: 'All',
    examType: 'mcq',
    totalQuestionsToShow: 10,
    negativeMarking: true,
    negativeValue: 0.25,
    status: 'approved',
    createdAt: Date.now(),
    createdBy: 'system'
  },
  {
    id: 'e2',
    title: 'Class 9 Physics — Basic Mechanics',
    timeLimit: 15,
    class: 'Class 9',
    subject: 'Physics',
    chapter: 'All',
    examType: 'mcq',
    totalQuestionsToShow: 10,
    negativeMarking: false,
    negativeValue: 0,
    status: 'approved',
    createdAt: Date.now(),
    createdBy: 'system'
  }
];
