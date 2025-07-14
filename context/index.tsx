import { createContext, useContext, useState, ReactNode } from 'react';

// Twitter用户信息类型
export interface TwitterUser {
  twitterUsername: string;
  twitterId: string;
  accessToken?: string;
  refreshToken?: string;
  user: {
    image: string;
    name: string;
  };
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
  evmStakingContract: any;
  setEvmStakingContract: (contract: any) => void;

  // Solana 合约状态
  solanaProgram: any;
  setSolanaProgram: (program: any) => void;

  // 网络状态
  currentNetworkType: string | null;
  setCurrentNetworkType: (type: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;

  // 项目数据
  projectsData: any[];
  setProjectsData: (data: any[]) => void;
}

const Context = createContext<PageContextType | undefined>(undefined);

type PageProviderProps = {
  children: ReactNode;
};

export function PageProvider({ children }: PageProviderProps) {
  const [walletAddress, setWalletAddress] = useState('');

  // Twitter
  const [twitterUser, setTwitterUser] = useState<TwitterUser | null>(null);

  // EVM
  const [evmStakingContract, setEvmStakingContract] = useState(null);

  // Solana
  const [solanaProgram, setSolanaProgram] = useState(null);

  // 网络状态
  const [currentNetworkType, setCurrentNetworkType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectsData, setProjectsData] = useState([]);

  const contextValue: PageContextType = {
    walletAddress,
    setWalletAddress,

    twitterUser,
    setTwitterUser,
    isTwitterConnected: !!twitterUser,

    evmStakingContract,
    setEvmStakingContract,

    solanaProgram,
    setSolanaProgram,

    currentNetworkType,
    setCurrentNetworkType,
    isLoading,
    setIsLoading,
    error,
    setError,
    projectsData,
    setProjectsData
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
