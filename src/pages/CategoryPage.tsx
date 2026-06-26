import React from 'react';

interface CategoryPageProps {
  renderFilters: () => React.JSX.Element;
  renderContentList: () => React.JSX.Element;
}

export function CategoryPage({ renderFilters, renderContentList }: CategoryPageProps) {
  return (
    <div className="space-y-10">
      {renderFilters()}
      {renderContentList()}
    </div>
  );
}
