import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import styles from './ResultPopup.module.css';
import mascot from '../../assets/hero.png';

const ResultPopup = ({ isOpen, type, amount, payout, asset, onClose, txHash }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
      setTimeout(() => setShouldRender(false), 400); // match transition duration
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const isWin = type === 'WIN';

  const handleShare = () => {
    const text = isWin 
      ? `I just won ${payout} ${asset} on TronFlip! 🎉` 
      : `Just played a round of TronFlip! 🎲`;
    
    if (navigator.share) {
      navigator.share({
        title: 'TronFlip Result',
        text: text,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      alert('Result copied to clipboard!');
    }
  };

  return ReactDOM.createPortal(
    <div className={`${styles.overlay} ${isVisible ? styles.visible : ''}`}>
      <div className={`${styles.popupContainer} ${isVisible ? styles.popupVisible : ''} ${isWin ? styles.winTheme : styles.lossTheme}`}>
        
        {/* Particles / Sparkles */}
        <div className={styles.particlesContainer}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`${styles.particle} ${isWin ? styles.sparkle : styles.brokenSpark}`} style={{
              '--delay': `${Math.random() * 2}s`,
              '--x': `${(Math.random() - 0.5) * 200}px`,
              '--y': `${(Math.random() - 0.5) * 200}px`
            }}></div>
          ))}
        </div>

        {/* Mascot Area */}
        <div className={`${styles.mascotContainer} ${!isWin ? styles.mascotLoss : ''}`}>
          {isWin && <div className={styles.crown}>👑</div>}
          <div className={styles.mascotGlow}></div>
          <img src={mascot} alt="TronFlip Mascot" className={styles.mascotImage} />
        </div>

        {/* Ribbon Header */}
        <div className={styles.ribbonWrapper}>
          <div className={styles.ribbonTailLeft}></div>
          <div className={styles.ribbonCenter}>
            <h2 className={styles.headerText}>{isWin ? 'YOU WON!' : 'YOU LOST!'}</h2>
          </div>
          <div className={styles.ribbonTailRight}></div>
        </div>

        {/* Content Body */}
        <div className={styles.contentBody}>
          <p className={styles.subtext}>
            {isWin ? (
              <>Great choice! You predicted<br/><span className={styles.textGreen}>correctly.</span></>
            ) : (
              <>Better luck next time.<br/><span className={styles.textRed}>Try again!</span></>
            )}
          </p>

          <div className={styles.rewardBox}>
            <span className={isWin ? styles.winAmount : styles.lossAmount}>
              {isWin ? `+ ${Number(payout).toFixed(2)}` : `- ${Number(amount).toFixed(2)}`} {asset}
            </span>
            {/* Diamond/Tron Logo Placeholder */}
            <div className={styles.assetIcon}>
              <svg viewBox="0 0 422.39 527.76" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M422.39 96.67L194.27 0v274.6L422.39 96.67zM228.12 527.76l194.27-431.09L228.12 274.6v253.16zM0 96.67l228.12-96.67v274.6L0 96.67zM194.27 527.76V274.6L0 96.67l194.27 431.09z"/>
              </svg>
            </div>
          </div>

          {txHash && isWin && (
             <a href={`https://shasta.tronscan.org/#/transaction/${txHash}`} target="_blank" rel="noopener noreferrer" className={styles.txLink}>
               View Payout TX
             </a>
          )}

          <div className={styles.actionButtons}>
            <button className={styles.primaryBtn} onClick={onClose}>
              {isWin ? 'OK!' : 'TRY AGAIN'}
            </button>
            <button className={styles.secondaryBtn} onClick={handleShare}>
              SHARE
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default ResultPopup;
