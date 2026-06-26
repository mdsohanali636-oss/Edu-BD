import React from 'react';

interface LeaderboardPageProps {
  renderLeaderboard: () => React.JSX.Element;
}

export function LeaderboardPage({ renderLeaderboard }: LeaderboardPageProps) {
  return renderLeaderboard();
}
