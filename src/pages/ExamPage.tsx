import React from 'react';

interface ExamPageProps {
  renderExamMode: () => React.JSX.Element;
}

export function ExamPage({ renderExamMode }: ExamPageProps) {
  return renderExamMode();
}
