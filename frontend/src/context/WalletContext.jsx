import React, { createContext, useContext } from 'react';
import { useTronLink } from '../hooks/useTronLink';

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const wallet = useTronLink();
  return (
    <WalletContext.Provider value={wallet}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
