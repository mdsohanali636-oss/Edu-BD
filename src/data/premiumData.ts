import { Subject, Chapter } from '../types';

export const PREMIUM_SUBJECTS: Subject[] = [
  { id: 'phy', name: 'Physics', icon: 'Atom', color: '#3B82F6' },
  { id: 'chem', name: 'Chemistry', icon: 'FlaskConical', color: '#10B981' },
  { id: 'math', name: 'Mathematics', icon: 'Calculator', color: '#F59E0B' },
  { id: 'bio', name: 'Biology', icon: 'Dna', color: '#EF4444' },
  { id: 'eng', name: 'English', icon: 'Languages', color: '#8B5CF6' },
  { id: 'ict', name: 'ICT', icon: 'Monitor', color: '#EC4899' },
];

export const PREMIUM_CHAPTERS: Chapter[] = [
  { id: 'p1', subjectId: 'phy', name: 'Vector', mcqCount: 150, writtenCount: 25 },
  { id: 'p2', subjectId: 'phy', name: 'Newtonian Mechanics', mcqCount: 200, writtenCount: 40 },
  { id: 'p3', subjectId: 'phy', name: 'Work, Energy & Power', mcqCount: 180, writtenCount: 30 },
  { id: 'c1', subjectId: 'chem', name: 'Qualitative Chemistry', mcqCount: 120, writtenCount: 20 },
  { id: 'c2', subjectId: 'chem', name: 'Periodic Properties', mcqCount: 160, writtenCount: 35 },
  { id: 'm1', subjectId: 'math', name: 'Matrix & Determinants', mcqCount: 140, writtenCount: 45 },
  { id: 'm2', subjectId: 'math', name: 'Trigonometry', mcqCount: 220, writtenCount: 50 },
  { id: 'b1', subjectId: 'bio', name: 'Cell & Its Structure', mcqCount: 300, writtenCount: 15 },
];
