import React from 'react';
import { CONTRACT_ADDRESS, TRON_NETWORK } from '../../constants/config';
import styles from './Footer.module.css';

const Footer = () => {
  const handleCopy = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.contractSection}>
          <span className={styles.label}>Contract Address:</span>
          <span className={styles.address}>{CONTRACT_ADDRESS}</span>
          <button className={styles.copyBtn} onClick={handleCopy} title="Copy Address">
            📋
          </button>
        </div>
        
        <div className={styles.links}>
          <span className={styles.network}>Network: {TRON_NETWORK.toUpperCase()}</span>
          <a 
            href={`https://shasta.tronscan.org/#/contract/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.tronscanLink}
          >
            View Contract on Tronscan
          </a>
        </div>
        
        <div className={styles.disclaimer}>
          This is a game of chance. Bet responsibly.
        </div>
        
        <div className={styles.copyright}>
          © 2024 TronFlip
        </div>
      </div>
    </footer>
  );
};

export default Footer;
