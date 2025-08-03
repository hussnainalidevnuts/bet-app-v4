import { useSelector } from 'react-redux';
import { selectMainOdds } from '@/lib/features/websocket/websocketSlice';

export const useLiveOdds = (matchId) => {
  const mainOdds = useSelector(state => selectMainOdds(state, matchId));
  return mainOdds;
}; 