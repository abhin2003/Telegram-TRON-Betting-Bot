import { useState, useEffect, useCallback } from 'react';

/**
 * Custom React Hook for integrating with TronLink wallet.
 * 
 * Provides state and functions to manage the wallet connection,
 * retrieve the user's address and TRX balance, and handle errors.
 */
export const useTronLink = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [networkType, setNetworkType] = useState(null); // Used by Navbar for warning banner
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetches the TRX balance of the connected account.
   * Converts the balance from Sun to TRX (1 TRX = 1,000,000 Sun).
   */
  const fetchBalanceAndLogInfo = async (address) => {
    try {
      // Fetch the balance in Sun using the window.tronWeb instance
      const balanceInSun = await window.tronWeb.trx.getBalance(address);
      // Convert Sun to TRX
      const balanceInTrx = window.tronWeb.fromSun(balanceInSun);
      
      setBalance(balanceInTrx);

      // Display exactly in the format requested by the user
      console.log(`Connected Wallet:\n${address}\n\nBalance:\n${balanceInTrx} TRX`);
    } catch (err) {
      console.error("Failed to fetch balance:", err);
      setError("Failed to fetch account balance.");
    }
  };

  /**
   * Initializes the TronWeb connection if TronLink is available and ready.
   * Retrieves the current selected address, updates the connection state,
   * and fetches the wallet balance.
   */
  const initTronWeb = useCallback(async () => {
    if (window.tronWeb && window.tronWeb.ready) {
      try {
        const address = window.tronWeb.defaultAddress.base58;
        if (address) {
          setWalletAddress(address);
          setIsConnected(true);
          setError(null);
          
          // Detect network type
          const node = window.tronWeb.fullNode.host || "";
          let network = 'unknown';
          if (node.includes('api.trongrid.io')) network = 'mainnet';
          else if (node.includes('api.shasta.trongrid.io')) network = 'shasta';
          else if (node.includes('nile')) network = 'nile';
          setNetworkType(network);

          // Fetch and log balance
          await fetchBalanceAndLogInfo(address);

          // Register with backend to map Telegram ID to Tron Address
          const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
          if (telegramId) {
            try {
              // Note: using the same host that serves the API. If deployed separately, this needs the backend URL.
              // For now we assume the backend URL is passed as env var, or defaults to VITE_API_URL
              const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
              await fetch(`${apiUrl}/api/connect-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegramId, tronAddress: address })
              });
            } catch (err) {
              console.error('Failed to link wallet to Telegram ID:', err);
            }
          }
        } else {
          setIsConnected(false);
        }
      } catch (err) {
        console.error("Error initializing TronWeb", err);
        setError("Error parsing wallet data from TronLink.");
      }
    } else {
      setIsConnected(false);
      setWalletAddress(null);
    }
    setIsLoading(false);
  }, []);

  /**
   * Handles user click to Connect wallet.
   * Requests account access from the TronLink extension.
   */
  const connectWallet = async (providedRequestPromise = null) => {
    // 1. Detect whether TronLink is installed
    if (!window.tronWeb && !window.tronLink) {
      setError("TronLink is not installed. Please install the TronLink browser extension to proceed.");
      return { success: false, code: 400 }; // Not installed
    }

    // FIRE IMMEDIATELY before any React state updates to preserve the browser's "user gesture" 
    // context. This is strictly required for the TronLink popup to successfully open when locked.
    const requestPromise = providedRequestPromise || window.tronLink.request({ method: 'tron_requestAccounts' });

    setIsLoading(true);
    setError(null);

    let res;
    try {
      res = await requestPromise;
    } catch (err) {
      console.error("Wallet connection error:", err);
      res = { code: 500, error: err };
    }
      
    // Res.code 200 means user approved the connection
    if (res.code === 200) {
      // 4 & 5. Initialize, get wallet address, fetch balance, display in console.
      await initTronWeb();
      window.dispatchEvent(new CustomEvent('mascot-reaction', { detail: 'connected' }));
      return { success: true, code: 200 };
    } else if (res.code === 4000) {
      setError("TronLink wallet is locked. Please open the extension and unlock it.");
      setIsLoading(false);
      return { success: false, code: 4000 };
    } else if (res.code === 4001) {
      setError("Connection request was rejected by the user.");
      setIsLoading(false);
      return { success: false, code: 4001 };
    } else {
      // Fallback for any other code
      setError(`Connection failed. Code: ${res.code || 'Unknown'}`);
      setIsLoading(false);
      return { success: false, code: res.code || 500 };
    }
  };

  /**
   * Auto-detection and message listener for account / network changes.
   */
  useEffect(() => {
    const handleMessage = (e) => {
      // If user switches accounts in TronLink
      if (e.data.message && e.data.message.action === "setAccount") {
        const address = e.data.message.data.address;
        if (address) {
          setWalletAddress(address);
          setIsConnected(true);
          setError(null);
          fetchBalanceAndLogInfo(address);
        } else {
          setWalletAddress(null);
          setIsConnected(false);
        }
      }
      
      // If user switches nodes/networks in TronLink
      if (e.data.message && e.data.message.action === "setNode") {
        initTronWeb();
      }
    };

    window.addEventListener('message', handleMessage);

    // Initial check to see if it's already logged in and ready
    if (window.tronWeb && window.tronWeb.ready) {
      initTronWeb();
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [initTronWeb]);

  /**
   * Disconnects the wallet from the UI state.
   */
  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setBalance(null);
    setIsConnected(false);
    setNetworkType(null);
    setError(null);
  }, []);

  return {
    walletAddress,
    balance,
    isConnected,
    networkType,
    connectWallet,
    disconnectWallet,
    isLoading,
    error
  };
};
