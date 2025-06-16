'use client';

import TransactionHistoryPage from '@/components/transactions/TransactionHistoryPage';
import withAuth from '@/components/auth/withAuth';

// Protect the TransactionHistoryPage with authentication
const ProtectedTransactionHistoryPage = withAuth(TransactionHistoryPage);

export default function TransactionsPage() {
  return <ProtectedTransactionHistoryPage />;
}
