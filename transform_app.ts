import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  [/\.uid\b/g, '.id'],
  [/\.displayName\b/g, '.user_metadata?.full_name'],
  [/\.photoURL\b/g, '.user_metadata?.avatar_url'],
  [/\.thumbnail_url\b/g, '.thumbnail'],
  [/\.academic_class\b/g, '.academicClass'],
  [/\.is_premium\b/g, '.isPremium'],
  [/\.time_limit\b/g, '.timeLimit'],
  [/\.correct_answer\b/g, '.correctAnswer'],
  [/\.question_text\b/g, '.questionText'],
  [/\.created_at\b/g, '.createdAt'],
  [/\.updated_at\b/g, '.updatedAt'],
  [/\.total_questions_to_show\b/g, '.totalQuestionsToShow'],
  [/\.negative_marking\b/g, '.negativeMarking'],
  [/\.negative_value\b/g, '.negativeValue'],
  [/\bauth\b\.currentUser\?\.uid/g, 'user?.id'],
  [/\bauth\b\.currentUser\?\.displayName/g, 'user?.user_metadata?.full_name'],
  [/\bauth\b\.currentUser\?\.photoURL/g, 'user?.user_metadata?.avatar_url'],
  [/\bauth\b\.currentUser\b/g, 'user'],
  [/db=\{db\}/g, ''],
  [/db=\{supabase\}/g, '']
];

for (const [regex, replacement] of replacements) {
  content = content.replace(regex, replacement as string);
}

// Basic cleanup for redundant auth/db in components
content = content.replace(/<AcademicManagement\s+db=\{db\}\s*\/>/g, '<AcademicManagement />');
content = content.replace(/<PremiumExamSection\s+user=\{user\}\s+db=\{db\}/g, '<PremiumExamSection user={user}');

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx transformed');
