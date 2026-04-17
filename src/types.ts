export type Category = 'Notes' | 'Books' | 'Question Papers' | 'YouTube Classes' | 'External Resources';
export type AcademicClass = 'Class 6' | 'Class 7' | 'Class 8' | 'Class 9' | 'Class 10' | 'Class 11' | 'Class 12' | 'General' | 'Engineering Admission-science' | 'Medical Admission-science' | 'Varsity Admission-science' | 'Varsity Admission-humanities' | 'Varsity Admission-commerce';

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  category: Category;
  academicClass: AcademicClass;
  subject: string;
  url: string; // PDF URL or YouTube Video ID or External Link
  thumbnail?: string;
  year?: string;
  author?: string;
  channelName?: string; // For YouTube
  authorId?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface Bookmark {
  id: string;
  contentId: string;
  savedAt: number;
}

export interface ExternalResource {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: string;
  thumbnail?: string;
  createdAt: number;
}

export interface Feedback {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  text: string;
  createdAt: number;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  authorId: string;
  type: 'youtube' | 'custom';
  youtubePlaylistId?: string;
  videoIds?: string[]; // For custom playlists
  academicClass: AcademicClass;
  subject: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}
