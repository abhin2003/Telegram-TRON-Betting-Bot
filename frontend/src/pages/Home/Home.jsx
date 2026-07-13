import React from 'react';
import { useWalletModal } from '../../context/WalletModalContext';
import { useWallet } from '../../context/WalletContext';
import StatsBar from '../../components/StatsBar/StatsBar';
import BetForm from '../../components/BetForm/BetForm';
import HowToPlay from '../../components/HowToPlay/HowToPlay';
import BetHistory from '../../components/BetHistory/BetHistory';
import heroMascot from '../../assets/hero.png';
import styles from './Home.module.css';

const Home = () => {
  const { openModal } = useWalletModal();
  const { isConnected } = useWallet();

  const scrollToBet = () => {
    const betSection = document.getElementById('bet-section');
    if (betSection) {
      betSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className={styles.main}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroBackground}>
          <div className={styles.bgText}>TRON</div>
          <div className={styles.bgGlow}></div>
          <div className={styles.particlesContainer}>
            <div className={styles.particle}></div>
            <div className={styles.particle}></div>
            <div className={styles.particle}></div>
            <div className={styles.particle}></div>
            <div className={styles.particle}></div>
          </div>
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              Odd or Even.<br/>
              <span className={styles.highlight}>Let TronFlip Decide.</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Predict the next block and let luck meet the blockchain.
            </p>
            <div className={styles.heroActions}>
              {!isConnected && (
                <button className={styles.primaryBtn} onClick={openModal}>
                  Connect Wallet
                </button>
              )}
              <button className={styles.secondaryBtn} onClick={scrollToBet}>
                Place Bet
              </button>
            </div>
          </div>
          
          <div className={styles.heroImageContainer}>
            <img src={heroMascot} alt="TronFlip Mascot" className={styles.heroImage} />
            <div className={styles.imageGlow}></div>
          </div>
        </div>
      </section>

      <StatsBar />
      
      <section id="bet-section" className={styles.betSection}>
        <BetForm />
      </section>
      
      <HowToPlay />
      <BetHistory />
    </main>
  );
};

export default Home;
