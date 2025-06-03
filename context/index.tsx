import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { contractsVariable, initContracts } from '../wallet';

const Context = createContext({
  ...contractsVariable,
  walletAddress: ''
});

export function usePageContext() {
  return useContext(Context);
}

export function PageProvider({ children }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [contextState, setContextState] = useState({
    ...contractsVariable,
    walletAddress: address || ''
  });

  // 监听钱包连接和网络变化
  useEffect(() => {
    async function setupContracts() {
      console.log(isConnected, address, chainId);
      if (isConnected && address) {
        const contracts = await initContracts(chainId);
        setContextState({ ...contracts, walletAddress: address });
      } else {
        // 重置状态
        setContextState({ ...contractsVariable, walletAddress: '' });
      }
    }

    setupContracts();
  }, [isConnected, address, chainId]);

  return <Context.Provider value={contextState}>{children}</Context.Provider>;
}
