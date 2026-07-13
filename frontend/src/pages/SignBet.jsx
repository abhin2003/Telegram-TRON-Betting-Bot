import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';

const SignBet = () => {
  const { isConnected, walletAddress, connectWallet } = useWallet();
  const [params, setParams] = useState({ prediction: '', amount: '', tg_id: '' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Parse URL parameters
    const searchParams = new URLSearchParams(window.location.search);
    const prediction = searchParams.get('prediction');
    const amount = searchParams.get('amount');
    const tg_id = searchParams.get('tg_id');
    if (prediction && amount) {
      setParams({ prediction, amount, tg_id: tg_id || '' });
    } else {
      setError('Missing prediction or amount parameters in URL.');
    }
  }, []);

  const handleConnectAndSign = async () => {
    try {
      setError(null);
      
      // Step 1: Ensure wallet is connected
      let currentAddress = window.tronWeb?.defaultAddress?.base58;
      
      if (!currentAddress) {
        setStatus('connecting');
        // Await connection
        await connectWallet();
        
        // Wait a brief moment for tronWeb to inject and initialize the address
        await new Promise(resolve => setTimeout(resolve, 500));
        currentAddress = window.tronWeb?.defaultAddress?.base58;
        
        if (!currentAddress) {
          throw new Error('Please unlock your TronLink wallet and approve the connection.');
        }
      }

      // Step 2: Sign the transaction
      setStatus('signing');
      
      const amountTrx = parseFloat(params.amount);
      const amountSun = Math.floor(amountTrx * 1_000_000);
      const toAddress = import.meta.env.VITE_MAIN_ADDRESS;
      const tgId = params.tg_id || '';
      const memoText = `${params.prediction.toUpperCase()}|${tgId}`;

      // Use a dedicated RPC to avoid TronLink's unreliable testnet nodes
      const TronWeb = window.TronWeb || window.tronWeb.constructor; 
      // Fortunately TronLink injects window.tronWeb which we can use to get the constructor
      // Or we can just use fetch to interact with TronGrid API directly if TronWeb constructor isn't available.
      // But actually, window.tronWeb has fullHost. We can just override it or use it carefully.
      // Let's just create a new instance if we can, or just use fetch for broadcast to be 100% sure.
      
      // Build transaction using window.tronWeb (which is usually fine for building, the broadcast is the issue)
      const unSignedTxn = await window.tronWeb.transactionBuilder.sendTrx(
        toAddress, 
        amountSun, 
        currentAddress
      );
      
      // Add memo (e.g. ODD|1234567)
      const unSignedTxnWithNote = await window.tronWeb.transactionBuilder.addUpdateData(unSignedTxn, memoText, 'utf8');
      
      // Request signature from TronLink
      const signedTxn = await window.tronWeb.trx.sign(unSignedTxnWithNote);
      
      // Broadcast using direct fetch to TronGrid to guarantee it reaches the real network
      const broadcastRes = await fetch('https://api.shasta.trongrid.io/wallet/broadcasttransaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signedTxn)
      });
      const receipt = await broadcastRes.json();
      
      if (!receipt.result) {
        console.error("Broadcast failed:", receipt);
        throw new Error(receipt.message ? (typeof receipt.message === 'string' ? receipt.message : Buffer.from(receipt.message, 'hex').toString()) : 'Transaction failed to broadcast');
      }

      const txid = receipt.txid || signedTxn.txID;
      setStatus('verifying');

      // Send to backend
      const telegramId = params.tg_id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id || '';
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
            playerAddress: currentAddress
          })
        });
      } catch (e) {
        console.error('Failed to notify backend, but tx was sent:', e);
      }

      setStatus('success');
      
      // Auto-close Window
      setTimeout(() => {
        try {
           window.close();
        } catch(e) {}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isConnected && walletAddress && (
             <p style={{ margin: 0, fontSize: '14px', color: '#a9b1d6' }}>Connected: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}</p>
          )}
          
          {(status === 'idle' || status === 'error') ? (
            <button 
              onClick={handleConnectAndSign}
              style={{ width: '100%', padding: '16px', background: '#ff0055', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {!isConnected ? 'Connect Wallet & Sign' : 'Sign Transaction'}
            </button>
          ) : status === 'connecting' ? (
            <button disabled style={{ width: '100%', padding: '16px', background: '#555', color: '#ccc', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold' }}>
              Connecting...
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
      </div>
    </div>
  );
};

export default SignBet;
