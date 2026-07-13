import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import Home from './pages/Home/Home';
import ErrorBoundary from './components/ErrorBoundary';
import { WalletProvider, useWallet } from './context/WalletContext';
import { WalletModalProvider } from './context/WalletModalContext';
import WalletModal from './components/WalletModal/WalletModal';
import MascotReaction from './components/MascotReaction/MascotReaction';
import './index.css';

const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="loading-spinner"></div>
    <p>Connecting to TronLink...</p>
  </div>
);

const AppContent = () => {
  const { isLoading } = useWallet();

  useEffect(() => {
    document.title = 'TRON BET — Odd/Even Betting';
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Navbar />
      <WalletModal />
      <MascotReaction />
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
      <Footer />
    </>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <WalletModalProvider>
          <Router>
            <AppContent />
          </Router>
        </WalletModalProvider>
      </WalletProvider>
    </ErrorBoundary>
  );
};

export default App;
