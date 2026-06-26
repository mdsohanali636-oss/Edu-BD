import React from 'react';

interface SavedPageProps {
  renderContentList: () => React.JSX.Element;
}

export function SavedPage({ renderContentList }: SavedPageProps) {
  return renderContentList();
}
