import React from 'react';
import { useAppContext } from '../context/AppContext';
import { RevisionCenter } from '../components/RevisionCenter';

export function RevisionPage() {
  const { 
    user, 
    qSavedQuestionsData, 
    qWrongQuestionsData, 
    refetchSavedQuestions, 
    refetchWrongQuestions, 
    savedQuestionIds, 
    handleToggleSaveQuestion, 
    dynamicClasses, 
    academicGroups, 
    dynamicSubjects, 
    firestoreUser 
  } = useAppContext();

  return (
    <RevisionCenter
      user={user}
      savedQuestions={qSavedQuestionsData || []}
      wrongQuestions={qWrongQuestionsData || []}
      refetchSaved={refetchSavedQuestions}
      refetchWrong={refetchWrongQuestions}
      savedQuestionIds={savedQuestionIds}
      onToggleSaveQuestion={handleToggleSaveQuestion}
      dynamicClasses={dynamicClasses}
      academicGroups={academicGroups}
      dynamicSubjects={dynamicSubjects}
      firestoreUser={firestoreUser}
    />
  );
}
