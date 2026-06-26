import React from 'react';

interface HomePageProps {
  renderHome: () => React.JSX.Element;
}

export function HomePage({ renderHome }: HomePageProps) {
  return renderHome();
}
