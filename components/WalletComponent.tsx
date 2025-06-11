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
    setUSDCContract,
    setGPDUSDCContract,
    setSolanaConnection,
    setSolanaProgram,
    setCurrentNetworkType
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
    const { chainNamespace, network } = caipNetwork as any;

    console.log(`🔗 初始化 ${network} 合约...`);

    if (chainNamespace === 'eip155') {
      try {
        const result = await initEVMContracts(network);
        console.log(`✅ ${network} 合约初始化成功`, result);

        setProvider(result.provider);
        setUSDCContract(result.usdcContract);
        setGPDUSDCContract(result.gpdUsdcContract);
      } catch (error) {
        console.error(`❌ ${network} 合约初始化失败`, error);
      }
    } else if (chainNamespace === 'solana') {
      // Solana 网络需要使用 React 钩子

      if (connection && walletProvider) {
        try {
          const result = initSolanaContracts(connection, walletProvider, network);
          console.log(`✅ ${network} 合约初始化成功`, result);

          setSolanaConnection(result.connection);
          setSolanaProgram(result.program);
        } catch (error) {
          console.error(`❌ ${network} 合约初始化失败`, error);
        }
      } else {
        console.log(`⏳ 等待 ${network} 连接...`);
      }
    }
  };

  const clearContractStates = () => {
    setProvider(null);
    setUSDCContract(null);
    setGPDUSDCContract(null);
    setSolanaConnection(null);
    setSolanaProgram(null);
    setCurrentNetworkType(null);
  };

  return null; // 这是一个工具组件，不需要 UI
};
