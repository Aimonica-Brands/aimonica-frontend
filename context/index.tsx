import { createContext, useContext, useState, ReactNode } from 'react';

// Twitter用户信息类型
export interface TwitterUser {
  username: string;
  id: string;
  accessToken?: string;
  refreshToken?: string;
}

// Context 类型定义
interface PageContextType {
  // 基础状态
  walletAddress: string;
  setWalletAddress: (address: string) => void;

  // Twitter状态
  twitterUser: TwitterUser | null;
  setTwitterUser: (user: TwitterUser | null) => void;
  isTwitterConnected: boolean;

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
  anchorProvider: any;
  setAnchorProvider: (provider: any) => void;
  walletProvider: any;
  setWalletProvider: (provider: any) => void;

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

  // Twitter 状态
  const [twitterUser, setTwitterUser] = useState<TwitterUser | null>(null);

  // EVM 状态
  const [provider, setProvider] = useState(null);
  const [USDCContract, setUSDCContract] = useState(null);
  const [GPDUSDCContract, setGPDUSDCContract] = useState(null);

  // Solana 状态
  const [solanaConnection, setSolanaConnection] = useState(null);
  const [solanaProgram, setSolanaProgram] = useState(null);
  const [anchorProvider, setAnchorProvider] = useState(null);
  const [walletProvider, setWalletProvider] = useState(null);

  // 网络状态
  const [currentNetworkType, setCurrentNetworkType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contextValue: PageContextType = {
    walletAddress,
    setWalletAddress,

    // Twitter 状态
    twitterUser,
    setTwitterUser,
    isTwitterConnected: !!twitterUser,

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
    anchorProvider,
    setAnchorProvider,
    walletProvider,
    setWalletProvider,

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
