import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../constants/config';
import styles from './StatsBar.module.css';
import { supabase } from '../../utils/supabaseClient';

const StatsBar = () => {
  const [stats, setStats] = useState({
    totalBets: '-',
    totalWagered: '-',
    biggestWin: '-',
    contractBalance: '-'
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from('bets')
          .select('amount, payout');
          
        let totalBets = 0;
        let totalWagered = 0;
        let biggestWin = 0;
        
        if (!error && data) {
            totalBets = data.length;
            totalWagered = data.reduce((sum, bet) => sum + (Number(bet.amount) || 0), 0);
            biggestWin = data.reduce((max, bet) => {
                const payout = Number(bet.payout) || 0;
                return payout > max ? payout : max;
            }, 0);
        }
        
        let contractBal = 0;
        if (window.tronWeb && import.meta.env.VITE_MAIN_ADDRESS) {
            const balanceInSun = await window.tronWeb.trx.getBalance(import.meta.env.VITE_MAIN_ADDRESS);
            contractBal = window.tronWeb.fromSun(balanceInSun);
        }

        setStats({
          totalBets: totalBets.toString(),
          totalWagered: totalWagered.toFixed(2),
          biggestWin: biggestWin.toFixed(2),
          contractBalance: Number(contractBal).toFixed(2)
        });
      } catch (err) {
        console.error("Failed to calculate stats", err);
      }
    };

    fetchStats();
    
    const handleUpdate = () => {
        fetchStats();
    };
    
    window.addEventListener('supabase-bets-updated', handleUpdate);
    const interval = setInterval(fetchStats, 15000);

    return () => {
        clearInterval(interval);
        window.removeEventListener('supabase-bets-updated', handleUpdate);
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.label}>Total Bets Placed</div>
          <div className={styles.value}>{stats.totalBets}</div>
          <div className={styles.icon}>🎯</div>
        </div>
        
        <div className={styles.card}>
          <div className={styles.label}>Total TRX Wagered</div>
          <div className={styles.value}>{stats.totalWagered}</div>
          <div className={styles.icon}>💎</div>
        </div>
        
        <div className={styles.card}>
          <div className={styles.label}>Biggest Win Today</div>
          <div className={styles.value}>{stats.biggestWin}</div>
          <div className={styles.icon}>🏆</div>
        </div>
        
        <div className={styles.card}>
          <div className={styles.label}>Contract Balance</div>
          <div className={styles.value}>{stats.contractBalance}</div>
          <div className={styles.icon}>🏦</div>
        </div>
      </div>
    </div>
  );
};

export default StatsBar;
