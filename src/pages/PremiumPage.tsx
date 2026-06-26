import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { PremiumSubscriptionPage } from '../components/PremiumSubscription/PremiumSubscriptionPage';

export function PremiumPage() {
  const navigate = useNavigate();
  const { user } = useAppContext();

  return (
    <PremiumSubscriptionPage 
      user={user} 
      onNavigateHome={() => navigate('/')} 
    />
  );
}
