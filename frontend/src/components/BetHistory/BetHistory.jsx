import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../constants/config';
import { shortenAddress } from '../../utils/format';
import { formatRelativeTime } from '../../utils/time';
import { useWallet } from '../../context/WalletContext';
import styles from './BetHistory.module.css';
import { supabase } from '../../utils/supabaseClient';

const BetHistory = () => {
  const [bets, setBets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { walletAddress } = useWallet();
  const prevBetsRef = useRef([]);

  useEffect(() => {
    const fetchBets = async () => {
      try {
        const { data, error } = await supabase
          .from('bets')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        
        if (data) {
          if (walletAddress && prevBetsRef.current.length > 0 && data.length > 0) {
            const myLatestBet = data.find(b => b.player === walletAddress);
            const myPrevLatestBet = prevBetsRef.current.find(b => b.player === walletAddress);
            
            if (myLatestBet && (!myPrevLatestBet || myLatestBet.id !== myPrevLatestBet.id)) {
               if (myLatestBet.result === 'WIN') {
                  window.dispatchEvent(new CustomEvent('mascot-reaction', { detail: 'win' }));
               } else if (myLatestBet.result === 'LOSE') {
                  window.dispatchEvent(new CustomEvent('mascot-reaction', { detail: 'loss' }));
               }
            }
          }
          
          prevBetsRef.current = data;
          setBets(data);
        }
      } catch (err) {
        console.error("Failed to fetch bets from Supabase", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBets();
    
    // Subscribe to real-time inserts
    const subscription = supabase
      .channel('public:bets')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bets' }, payload => {
        setBets(current => {
          const updated = [payload.new, ...current].slice(0, 20);
          prevBetsRef.current = updated;
          return updated;
        });
      })
      .subscribe();
      
    // Fallback manual refresh from the BetForm component
    const handleUpdate = () => {
        fetchBets();
    };
    window.addEventListener('supabase-bets-updated', handleUpdate);

    return () => {
      supabase.removeChannel(subscription);
      window.removeEventListener('supabase-bets-updated', handleUpdate);
    };
  }, [walletAddress]);

  const getPredictionBadge = (prediction) => {
    return <span className={`${styles.badge} ${prediction === 'ODD' ? styles.badgePurple : styles.badgeBlue}`}>{prediction}</span>;
  };

  const getResultBadge = (result) => {
    const resultUpper = result ? result.toUpperCase() : 'PENDING';
    let badgeClass = styles.badgeYellow; // Default to pending
    
    if (resultUpper === 'WIN') badgeClass = styles.badgeGreen;
    else if (resultUpper === 'LOSE') badgeClass = styles.badgeRed;
    
    return <span className={`${styles.badge} ${badgeClass}`}>{resultUpper}</span>;
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Recent Bets</h2>
      
      {error && !bets.length ? (
        <div className={styles.errorState}>{error}</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Player</th>
                <th>Prediction</th>
                <th>Amount</th>
                <th>Block</th>
                <th>Result</th>
                <th>Payout</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && bets.length === 0 ? (
                // Skeleton loading
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={styles.skeletonRow}>
                    <td><div className={styles.skeletonBox}></div></td>
                    <td><div className={styles.skeletonBox}></div></td>
                    <td><div className={styles.skeletonBox}></div></td>
                    <td><div className={styles.skeletonBox}></div></td>
                    <td><div className={styles.skeletonBox}></div></td>
                    <td><div className={styles.skeletonBox}></div></td>
                    <td><div className={styles.skeletonBox}></div></td>
                  </tr>
                ))
              ) : bets.length === 0 ? (
                <tr>
                  <td colSpan="7" className={styles.emptyState}>No bets yet</td>
                </tr>
              ) : (
                bets.map((bet) => (
                  <tr key={bet.id || bet.txHash || Math.random()}>
                    <td className={styles.timeText}>{formatRelativeTime(bet.timestamp)}</td>
                    <td className={styles.playerText}>{shortenAddress(bet.player)}</td>
                    <td>{getPredictionBadge(bet.prediction)}</td>
                    <td>{Number(bet.amount).toFixed(2)} TRX</td>
                    <td>{bet.block || '-'}</td>
                    <td>{getResultBadge(bet.result)}</td>
                    <td className={bet.result?.toUpperCase() === 'WIN' ? styles.winAmount : ''}>
                      {bet.result?.toUpperCase() === 'WIN' ? `${Number(bet.payout).toFixed(2)} TRX` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BetHistory;
