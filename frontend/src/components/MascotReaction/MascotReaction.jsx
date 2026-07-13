import React, { useState, useEffect } from 'react';
import mascotImg from '../../assets/hero.png';
import styles from './MascotReaction.module.css';

const MascotReaction = () => {
  const [reaction, setReaction] = useState('idle'); // idle, connected, sent, win, loss

  useEffect(() => {
    const handleReaction = (e) => {
      setReaction(e.detail);
      // Reset to idle after animation
      setTimeout(() => setReaction('idle'), 4000);
    };

    window.addEventListener('mascot-reaction', handleReaction);
    return () => window.removeEventListener('mascot-reaction', handleReaction);
  }, []);

  if (reaction === 'idle') return null;

  return (
    <div className={styles.container}>
      <img 
        src={mascotImg} 
        alt="Mascot Reaction" 
        className={`${styles.mascot} ${styles[reaction]}`} 
      />
    </div>
  );
};

export default MascotReaction;
