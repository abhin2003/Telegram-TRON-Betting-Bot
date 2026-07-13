import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';

const SignBet = () => {
  const { isConnected, walletAddress, connectWallet } = useWallet();
  const [params, setParams] = useState({ prediction: '', amount: '' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Parse URL parameters
    const searchParams = new URLSearchParams(window.location.search);
    const prediction = searchParams.get('prediction');
    const amount = searchParams.get('amount');
    if (prediction && amount) {
      setParams({ prediction, amount });
    } else {
      setError('Missing prediction or amount parameters in URL.');
    }
  }, []);

  const handleSign = async () => {
    try {
      setStatus('signing');
      setError(null);
      
      const amountTrx = parseFloat(params.amount);
      const amountSun = Math.floor(amountTrx * 1_000_000);
      const toAddress = import.meta.env.VITE_MAIN_ADDRESS;
      const memoText = params.prediction.toUpperCase();

      if (!window.tronWeb || !window.tronWeb.defaultAddress.base58) {
        throw new Error('TronLink is not ready.');
      }

      // Build transaction
      const unSignedTxn = await window.tronWeb.transactionBuilder.sendTrx(
        toAddress, 
        amountSun, 
        window.tronWeb.defaultAddress.base58
      );
      
      // Add memo (ODD/EVEN)
      const unSignedTxnWithNote = await window.tronWeb.transactionBuilder.addUpdateData(unSignedTxn, memoText, 'utf8');
      
      // Request signature from TronLink
      const signedTxn = await window.tronWeb.trx.sign(unSignedTxnWithNote);
      
      // Broadcast
      const receipt = await window.tronWeb.trx.sendRawTransaction(signedTxn);
      
      if (!receipt.result) {
        throw new Error('Transaction failed to broadcast');
      }

      const txid = receipt.transaction.txID;
      setStatus('verifying');

      // Send to backend
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || '';
      const apiUrl = import.meta.env.VITE_API_URL || 'https://telegram-tron-betting-bot.loca.lt'; // update locally if needed
      
      try {
        await fetch(`${apiUrl}/api/verify-bet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId,
            txid,
            prediction: params.prediction,
            amount: params.amount,
            playerAddress: window.tronWeb.defaultAddress.base58
          })
        });
      } catch (e) {
        console.error('Failed to notify backend, but tx was sent:', e);
      }

      setStatus('success');
      
      // Auto-close Mini App
      setTimeout(() => {
        if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.close();
        }
      }, 2000);

    } catch (err) {
      console.error(err);
      setStatus('error');
      setError(err.message || 'Transaction failed or was rejected.');
    }
  };

  if (error && status === 'idle') {
    return <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px', background: '#1a1b26', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#24283b', padding: '40px', borderRadius: '16px', textAlign: 'center', width: '100%', maxWidth: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        
        <h1 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>Confirm Your Bet</h1>
        
        <div style={{ marginBottom: '30px', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '18px' }}>Amount: <strong style={{ color: '#00ffaa' }}>{params.amount} TRX</strong></p>
          <p style={{ margin: '0', fontSize: '18px' }}>Prediction: <strong style={{ color: params.prediction === 'ODD' ? '#ff00ff' : '#00aaff' }}>{params.prediction}</strong></p>
        </div>

        {!isConnected ? (
          <button 
            onClick={connectWallet}
            style={{ width: '100%', padding: '16px', background: '#ff0055', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Connect TronLink
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#a9b1d6' }}>Connected: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}</p>
            
            {status === 'idle' || status === 'error' ? (
              <button 
                onClick={handleSign}
                style={{ width: '100%', padding: '16px', background: '#00ffaa', color: '#000', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Sign Transaction
              </button>
            ) : status === 'signing' ? (
              <button disabled style={{ width: '100%', padding: '16px', background: '#555', color: '#ccc', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold' }}>
                Waiting for signature...
              </button>
            ) : status === 'verifying' ? (
              <button disabled style={{ width: '100%', padding: '16px', background: '#555', color: '#ccc', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold' }}>
                Sending...
              </button>
            ) : (
              <button disabled style={{ width: '100%', padding: '16px', background: '#44ff44', color: '#000', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold' }}>
                Success! You can close this.
              </button>
            )}

            {error && <p style={{ color: '#ff4444', fontSize: '14px', margin: 0 }}>{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default SignBet;
