'use client';
import { useEffect } from 'react';
import { useAppKitAccount, useAppKitNetwork, useAppKitProvider } from '@reown/appkit/react';
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react';
import type { Provider } from '@reown/appkit-adapter-solana/react';
import { initEVMContracts, initSolanaContracts } from '@/wallet/contracts';
import { usePageContext } from '@/context';

export const WalletComponent = () => {
  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();
  const { connection } = useAppKitConnection();
  const { walletProvider } = useAppKitProvider<Provider>('solana');

  const {
    setProvider,
    setEvmTokenContract,
    setEvmStakingContract,
    setSolanaConnection,
    setSolanaProgram,
    setCurrentNetworkType,
  } = usePageContext();

  useEffect(() => {
    if (isConnected && address && caipNetwork) {
      console.log('🌐 网络连接:', caipNetwork);
      // 设置当前网络类型
      setCurrentNetworkType(caipNetwork.chainNamespace);
      // 初始化合约
      initializeContracts(caipNetwork);
    } else {
      // 用户断开连接，清理状态
      if (!isConnected) {
        console.log('👋 用户断开连接, 清理状态...');
        clearContractStates();
      }
    }
  }, [isConnected, address, caipNetwork, connection, walletProvider]);

  const initializeContracts = async (caipNetwork: any) => {
    const { chainNamespace, id, name } = caipNetwork as any;

    console.log(`🔗 初始化 ${name} 合约...`);

    if (chainNamespace === 'eip155') {
      try {
        const result = await initEVMContracts(id);
        console.log(`✅ ${name} 合约初始化成功`, result);

        setProvider(result.provider);
        setEvmTokenContract(result.evmTokenContract);
        setEvmStakingContract(result.evmStakingContract);
      } catch (error) {
        console.error(`❌ ${name} 合约初始化失败`, error);
      }
    } else if (chainNamespace === 'solana') {
      // Solana 网络需要使用 React 钩子

      if (connection && walletProvider) {
        try {
          const result = initSolanaContracts(id, walletProvider);
          console.log(`✅ ${name} 合约初始化成功`, result);

          setSolanaConnection(result.solanaConnection);
          setSolanaProgram(result.solanaProgram);
        } catch (error) {
          console.error(`❌ ${name} 合约初始化失败`, error);
        }
      } else {
        console.log(`⏳ 等待 ${name} 连接...`);
      }
    }
  };

  const clearContractStates = () => {
    setProvider(null);
    setEvmTokenContract(null);
    setEvmStakingContract(null);
    setSolanaConnection(null);
    setSolanaProgram(null);
    setCurrentNetworkType(null);
  };

  return null; // 这是一个工具组件，不需要 UI
};
