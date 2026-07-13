import React from 'react';
import styles from './HowToPlay.module.css';

const HowToPlay = () => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>How To Play</h2>
      
      <div className={styles.stepsGrid}>
        <div className={styles.stepCard}>
          <div className={styles.stepNumber}>1</div>
          <div className={styles.stepContent}>
            <h3>Connect Wallet</h3>
            <p>Connect your TronLink wallet to the DApp.</p>
          </div>
        </div>
        
        <div className={styles.stepCard}>
          <div className={styles.stepNumber}>2</div>
          <div className={styles.stepContent}>
            <h3>Place Bet</h3>
            <p>Choose Odd or Even and enter your TRX amount (10–10,000 TRX).</p>
          </div>
        </div>
        
        <div className={styles.stepCard}>
          <div className={styles.stepNumber}>3</div>
          <div className={styles.stepContent}>
            <h3>Win TRX</h3>
            <p>Place your bet — win 1.8x your amount paid instantly on-chain.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowToPlay;
