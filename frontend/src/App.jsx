import React, { useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { WalletProvider } from './context/WalletContext';
import SignBet from './pages/SignBet';
import './index.css';

const App = () => {
  useEffect(() => {
    document.title = 'TRON BET — Confirm Transaction';
  }, []);

  return (
    <ErrorBoundary>
      <WalletProvider>
        <SignBet />
      </WalletProvider>
    </ErrorBoundary>
  );
};

export default App;
