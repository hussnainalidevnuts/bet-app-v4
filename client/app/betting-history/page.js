'use client';

import BettingHistoryPage from '@/components/betting/BettingHistoryPage';
import withAuth from '@/components/auth/withAuth';


const ProtectedBettingHistoryPage = withAuth(BettingHistoryPage);

export default function BettingPage() {
  return <ProtectedBettingHistoryPage />;
}
