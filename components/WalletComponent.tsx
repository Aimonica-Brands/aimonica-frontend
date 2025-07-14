import { useEffect } from 'react';
import { useAppKitAccount, useAppKitNetwork, useAppKitProvider } from '@reown/appkit/react';
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react';
import type { Provider } from '@reown/appkit-adapter-solana/react';
import { initEVMStakingContract, initSolanaContracts } from '@/wallet/contracts';
import { usePageContext } from '@/context';
import { modal } from '@/wallet';

export const WalletComponent = () => {
  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork, chainId } = useAppKitNetwork();
  const { connection } = useAppKitConnection();
  const { walletProvider } = useAppKitProvider<Provider>('solana');
  const { setEvmStakingContract, setSolanaProgram, setCurrentNetworkType } = usePageContext();

  useEffect(() => {
    const initContracts = async () => {
      if (isConnected && address && caipNetwork && chainId) {
        console.log('🌐 网络连接:', caipNetwork);
        modal.close();
        setCurrentNetworkType(caipNetwork.chainNamespace);

        // 初始化合约
        if (caipNetwork.chainNamespace === 'eip155') {
          try {
            const contract = await initEVMStakingContract(chainId);
            console.log(`✅ ${caipNetwork.name} 合约初始化成功`, contract);
            setEvmStakingContract(contract);
          } catch (error) {
            console.error(`❌ ${caipNetwork.name} 合约初始化失败`, error);
          }
        } else if (caipNetwork.chainNamespace === 'solana') {
          if (connection && walletProvider) {
            try {
              const program = initSolanaContracts(chainId, walletProvider);
              console.log(`✅ ${caipNetwork.name} 合约初始化成功`, program);
              setSolanaProgram(program);
            } catch (error) {
              console.error(`❌ ${caipNetwork.name} 合约初始化失败`, error);
            }
          } else {
            console.log(`⏳ 等待 ${caipNetwork.name} 连接...`);
          }
        }
      } else {
        // 用户断开连接，清理状态
        if (!isConnected) {
          console.log('👋 用户断开连接, 清理状态...');
          clearContractStates();
        }
      }
    };

    initContracts();
  }, [isConnected, address, caipNetwork, chainId, connection, walletProvider]);

  const clearContractStates = () => {
    setEvmStakingContract(null);
    setSolanaProgram(null);
    setCurrentNetworkType(null);
  };

  return null;
};
