import React, { useState, useEffect } from 'react';
import { useWalletModal } from '../../context/WalletModalContext';
import { useWallet } from '../../context/WalletContext';
import styles from './WalletModal.module.css';

const WalletModal = () => {
  const { isModalOpen, closeModal } = useWalletModal();
  const { connectWallet, isConnected } = useWallet();
  
  const [installView, setInstallView] = useState(null); // stores the wallet object if it needs installing
  const [isConnecting, setIsConnecting] = useState(false);

  // Automatically close modal when connected
  useEffect(() => {
    if (isConnected) {
      closeModal();
      setIsConnecting(false);
      setInstallView(null);
    }
  }, [isConnected, closeModal]);

  if (!isModalOpen) return null;

  const wallets = [
    { id: 'tronlink', name: 'TronLink', color: '#1B56F4', short: 'TL' },
    { id: 'okx', name: 'OKX', color: '#000000', short: 'OKX' },
    { id: 'tokenpocket', name: 'TokenPocket', color: '#2980b9', short: 'TP' },
    { id: 'walletconnect', name: 'WalletConnect', color: '#3b99fc', short: 'WC' },
    { id: 'binance', name: 'Binance', color: '#f3ba2f', short: 'BNB' },
    { id: 'ledger', name: 'Ledger', color: '#000000', short: 'LG' },
  ];

  const handleWalletClick = async (wallet, requestPromise) => {
    if (wallet.id === 'tronlink') {
      if (window.tronWeb || window.tronLink) {
        // Pass the pre-fired promise to connectWallet
        const res = await connectWallet(requestPromise);
        
        if (res && res.success) {
          // Connected successfully
          setIsConnecting(false);
          closeModal();
        } else if (res && res.code === 4000) {
          // TronLink is locked. KEEP the connecting state true.
        } else {
          // Rejected or other error, close modal and let the Navbar show the error
          setIsConnecting(false);
          closeModal();
        }
      } else {
        // TronLink not installed -> switch to install view
        setInstallView(wallet);
      }
    } else {
      // Dummy logic for other wallets -> force install view
      setInstallView(wallet);
    }
  };

  const handleClose = () => {
    setInstallView(null);
    setIsConnecting(false);
    closeModal();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Connect Wallet</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {!installView ? (
          <>
            <div className={styles.content}>
              <div className={styles.subtitleRow}>
                <span className={styles.subtitle}>Connect a wallet to use TRON BET</span>
                <span className={styles.link}>User Guide</span>
              </div>

              <div className={styles.walletGrid}>
                {wallets.map((wallet) => (
                  <button 
                    key={wallet.id} 
                    className={styles.walletItem} 
                    onClick={() => {
                      if (wallet.id === 'tronlink' && window.tronLink) {
                        setIsConnecting(true);
                        // Let React paint the "Connecting" UI first, then trigger the wallet request
                        setTimeout(() => {
                          const requestPromise = window.tronLink.request({ method: 'tron_requestAccounts' });
                          handleWalletClick(wallet, requestPromise);
                        }, 50);
                      } else {
                        handleWalletClick(wallet, null);
                      }
                    }}
                    style={{ border: 'none', textAlign: 'left', width: '100%', fontFamily: 'inherit', color: 'inherit', cursor: 'pointer' }}
                  >
                    <div className={styles.walletIcon} style={{ backgroundColor: wallet.color }}>
                      <span style={{ color: 'white', fontWeight: 'bold', fontSize: '20px' }}>{wallet.short}</span>
                    </div>
                    <span className={styles.walletName}>{wallet.name}</span>
                  </button>
                ))}
              </div>

              <div className={styles.termsSection}>
                Choosing to connect indicates that you have accepted<br/>
                <span className={styles.link}>Terms of Service</span> &nbsp; <span className={styles.link}>Privacy Policy</span>
              </div>
            </div>

            <div className={styles.footerSection}>
              Looking to have TRON BET support your wallet?
              <br/><br/>
              <span className={styles.link}>Read docs &gt;</span>
              <span className={styles.link}>Contact us &gt;</span>
            </div>
          </>
        ) : isConnecting ? (
          <div className={styles.content}>
            <div className={styles.connectingContainer}>
              <div className={styles.spinner}></div>
              <h3 className={styles.connectingTitle}>Connecting</h3>
              <p className={styles.connectingSubtitle}>Confirm to connect in your wallet</p>
              
              <div className={styles.connectingHelp}>
                Invoking another wallet or having trouble connecting?<br/>
                <span className={styles.link}>View our help documentation &gt;</span>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.content}>
            <div className={styles.installContainer}>
              <div className={styles.installIconWrapper}>
                <div className={styles.installIcon} style={{ backgroundColor: installView.color }}>
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: '32px' }}>{installView.short}</span>
                </div>
                <div className={styles.warningBadge}>!</div>
              </div>
              
              <h3 className={styles.installTitle}>Install Required</h3>
              <p className={styles.installText}>
                Install the wallet via the link below and click <span className={styles.link} onClick={() => window.location.reload()}>here</span> to reload the page
              </p>

              <div className={styles.installLinks}>
                <div className={styles.installLinkText}>
                  No {installView.name} wallet? <span className={styles.link}>Click to download {installView.name} &gt;</span>
                </div>
                <div className={styles.installLinkText}>
                  Having trouble connecting? <span className={styles.link}>View our help documentation &gt;</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletModal;
