import { createContext, useContext, useState, ReactNode } from 'react';

const Context = createContext(undefined);

type PageProviderProps = {
  children: ReactNode;
};

export function PageProvider({ children }: PageProviderProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState(null);
  const [USDTContract, setUSDTContract] = useState(null);

  const contextValue = {
    walletAddress,
    setWalletAddress,
    provider,
    setProvider,
    USDTContract,
    setUSDTContract
  };

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}

export function usePageContext() {
  const context = useContext(Context);
  if (!context) {
    throw 'usePageContext must be used within a PageProvider';
  }
  return context;
}
