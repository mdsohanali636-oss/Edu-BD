import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { PremiumExamSection } from '../components/PremiumExam/PremiumExamSection';

export function PremiumExamPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { 
    user, 
    dynamicClasses, 
    dynamicSubjects, 
    dynamicChapters, 
    dynamicTopics, 
    savedQuestionIds, 
    handleToggleSaveQuestion 
  } = useAppContext();

  const fetchLeaderboards = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: ['leaderboards'] });
  }, [queryClient]);

  const handleCustomExamFinished = (customExam: any, result: any) => {
    const answersObj: any = {};
    if (result.answers) {
      if (Array.isArray(result.answers)) {
        customExam.questions.forEach((q: any, idx: number) => {
          answersObj[q.id] = result.answers[idx];
        });
      } else {
        Object.assign(answersObj, result.answers);
      }
    }

    // Direct user to /exam with the exam details stored in routing state
    navigate('/exam', { 
      state: { 
        customExam, 
        result, 
        answers: answersObj 
      } 
    });
  };

  return (
    <PremiumExamSection
      user={user}
      dynamicClasses={dynamicClasses}
      dynamicSubjects={dynamicSubjects}
      dynamicChapters={dynamicChapters}
      dynamicTopics={dynamicTopics}
      fetchLeaderboards={fetchLeaderboards}
      onCustomExamFinished={handleCustomExamFinished}
      savedQuestionIds={savedQuestionIds}
      onToggleSaveQuestion={handleToggleSaveQuestion}
    />
  );
}
