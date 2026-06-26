import React from 'react';

interface AdminPageProps {
  renderAdminPortal: () => React.JSX.Element;
}

export function AdminPage({ renderAdminPortal }: AdminPageProps) {
  return renderAdminPortal();
}
