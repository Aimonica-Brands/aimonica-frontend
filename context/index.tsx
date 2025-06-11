import { createContext, useContext, useState, ReactNode } from 'react';

// Context 类型定义
interface PageContextType {
  // 基础状态
  walletAddress: string;
  setWalletAddress: (address: string) => void;
  
  // EVM 合约状态
  provider: any;
  setProvider: (provider: any) => void;
  USDCContract: any;
  setUSDCContract: (contract: any) => void;
  GPDUSDCContract: any;
  setGPDUSDCContract: (contract: any) => void;
  
  // Solana 合约状态
  solanaConnection: any;
  setSolanaConnection: (connection: any) => void;
  solanaProgram: any;
  setSolanaProgram: (program: any) => void;
  
  // 网络状态
  currentNetworkType: string | null;
  setCurrentNetworkType: (type: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const Context = createContext<PageContextType | undefined>(undefined);

type PageProviderProps = {
  children: ReactNode;
};

export function PageProvider({ children }: PageProviderProps) {
  const [walletAddress, setWalletAddress] = useState('');
  
  // EVM 状态
  const [provider, setProvider] = useState(null);
  const [USDCContract, setUSDCContract] = useState(null);
  const [GPDUSDCContract, setGPDUSDCContract] = useState(null);
  
  // Solana 状态
  const [solanaConnection, setSolanaConnection] = useState(null);
  const [solanaProgram, setSolanaProgram] = useState(null);
  
  // 网络状态
  const [currentNetworkType, setCurrentNetworkType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contextValue: PageContextType = {
    walletAddress,
    setWalletAddress,
    
    provider,
    setProvider,
    USDCContract,
    setUSDCContract,
    GPDUSDCContract,
    setGPDUSDCContract,
    
    solanaConnection,
    setSolanaConnection,
    solanaProgram,
    setSolanaProgram,
    
    currentNetworkType,
    setCurrentNetworkType,
    isLoading,
    setIsLoading,
    error,
    setError
  };

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}

export function usePageContext() {
  const context = useContext(Context);
  if (!context) {
    throw new Error('usePageContext must be used within a PageProvider');
  }
  return context;
}
