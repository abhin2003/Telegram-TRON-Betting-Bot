import React, { createContext, useState, useContext } from 'react';

const WalletModalContext = createContext();

export const useWalletModal = () => useContext(WalletModalContext);

export const WalletModalProvider = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <WalletModalContext.Provider value={{ isModalOpen, openModal, closeModal }}>
      {children}
    </WalletModalContext.Provider>
  );
};
