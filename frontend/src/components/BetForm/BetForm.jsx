import React, { useState } from 'react';
import { useWallet } from '../../context/WalletContext';
import { useWalletModal } from '../../context/WalletModalContext';
import { MIN_BET_TRX, MAX_BET_TRX } from '../../utils/gameLogic';
import styles from './BetForm.module.css';

const BetForm = () => {
  const { isConnected, walletAddress } = useWallet();
  const { openModal } = useWalletModal();
  const [prediction, setPrediction] = useState(null); // 'ODD' or 'EVEN'
  const [asset, setAsset] = useState('TRX'); 
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [statusText, setStatusText] = useState(null);

  const numAmount = parseFloat(amount);
  const isValidAmount = !isNaN(numAmount) && numAmount >= MIN_BET_TRX && numAmount <= MAX_BET_TRX;
  const potentialWin = isValidAmount ? (numAmount * 1.8).toFixed(2) : '0.00';

  const handleBet = async () => {
    if (!isConnected || !prediction || !isValidAmount) return;
    
    setIsLoading(true);
    setTxHash(null);
    setError(null);
    setStatusText("Please approve the transaction in your wallet...");

    try {
      const amountInSun = window.tronWeb.toSun(numAmount);
      const mainAddress = import.meta.env.VITE_MAIN_ADDRESS;
      
      let betTxId;
      
      if (asset === 'TRX') {
          // Build transaction and add memo (ODD/EVEN)
          const unSignedTx = await window.tronWeb.transactionBuilder.sendTrx(mainAddress, amountInSun, walletAddress);
          const memoHex = window.tronWeb.toHex(prediction);
          const txWithMemo = await window.tronWeb.transactionBuilder.addUpdateData(unSignedTx, memoHex);
          
          const signedTx = await window.tronWeb.trx.sign(txWithMemo);
          const receipt = await window.tronWeb.trx.sendRawTransaction(signedTx);
          
          if (!receipt || (!receipt.result && !receipt.txid)) {
            throw new Error('Transaction failed or rejected by user.');
          }
          betTxId = receipt.txid || receipt.transaction?.txID;
      } else {
          throw new Error('USDT betting is not supported in this version.');
      }
      
      if (!betTxId) throw new Error("Failed to get transaction ID.");
      
      setTxHash(betTxId);
      window.dispatchEvent(new CustomEvent('mascot-reaction', { detail: 'sent' }));

      setStatusText("Bet Sent! Waiting for blockchain confirmation. You will receive a Telegram message with the result shortly!");

    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during transaction.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.assetSelector}>
        <button 
          className={`${styles.assetBtn} ${asset === 'TRX' ? styles.activeAsset : ''}`} 
          onClick={() => setAsset('TRX')}
        >TRX</button>
        <button 
          className={`${styles.assetBtn} ${asset === 'USDT' ? styles.activeAsset : ''}`} 
          onClick={() => {}}
          disabled
        >USDT (Coming Soon)</button>
      </div>

      <div className={styles.cards}>
        <div 
          className={`${styles.card} ${styles.cardOdd} ${prediction === 'ODD' ? styles.selected : ''}`}
          onClick={() => setPrediction('ODD')}
        >
          <div className={styles.cardTitle}>ODD</div>
          <div className={styles.cardSubtitle}>Ends in 1, 3, 5, 7, 9</div>
        </div>
        
        <div 
          className={`${styles.card} ${styles.cardEven} ${prediction === 'EVEN' ? styles.selected : ''}`}
          onClick={() => setPrediction('EVEN')}
        >
          <div className={styles.cardTitle}>EVEN</div>
          <div className={styles.cardSubtitle}>Ends in 0, 2, 4, 6, 8</div>
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Bet Amount ({asset})</label>
        <div className={styles.inputWrapper}>
          <svg className={styles.inputIcon} viewBox="0 0 422.39 527.76" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M422.39 96.67L194.27 0v274.6L422.39 96.67zM228.12 527.76l194.27-431.09L228.12 274.6v253.16zM0 96.67l228.12-96.67v274.6L0 96.67zM194.27 527.76V274.6L0 96.67l194.27 431.09z"/>
          </svg>
          <input 
            type="number" 
            className={styles.input}
            placeholder={`Min ${MIN_BET_TRX} - Max ${MAX_BET_TRX}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={MIN_BET_TRX}
            max={MAX_BET_TRX}
          />
          <span className={styles.currency}>{asset}</span>
        </div>
        
        {amount && !isValidAmount && (
          <div className={styles.validationError}>
            Amount must be between {MIN_BET_TRX} and {MAX_BET_TRX} {asset}
          </div>
        )}
        
        <div className={styles.payout}>
          Potential win: <span className={styles.winAmount}>{potentialWin} {asset}</span>
        </div>
      </div>

      <button 
        className={styles.placeBetBtn}
        onClick={!isConnected ? openModal : handleBet}
        disabled={isConnected && (!prediction || !isValidAmount || isLoading)}
      >
        {!isConnected ? 'Connect Wallet First' : 
         isLoading ? <span className={styles.spinner}></span> : 
         'Place Bet'}
      </button>

      {statusText && (
        <div className={styles.statusMessage}>
          {statusText}
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {txHash && !error && (
        <div className={styles.successMessage}>
          <div>Bet Sent! Wait for Telegram Notification.</div>
          <a 
            href={`https://shasta.tronscan.org/#/transaction/${txHash}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.txLink}
          >
            View on Tronscan
          </a>
        </div>
      )}
    </div>
  );
};

export default BetForm;
