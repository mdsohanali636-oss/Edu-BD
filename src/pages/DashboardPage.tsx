import React from 'react';

interface DashboardPageProps {
  renderUserDashboard: () => React.JSX.Element;
}

export function DashboardPage({ renderUserDashboard }: DashboardPageProps) {
  return renderUserDashboard();
}
