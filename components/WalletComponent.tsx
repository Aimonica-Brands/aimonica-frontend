import { useEffect } from 'react';
import { useAppKitAccount, useAppKitNetwork, useAppKitProvider, useAppKitEvents } from '@reown/appkit/react';
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react';
import type { Provider } from '@reown/appkit-adapter-solana/react';
import { initEVMContracts, initSolanaContracts } from '@/wallet/contracts';
import { usePageContext } from '@/context';
import { modal } from '@/wallet';

export default function WalletComponent() {
  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork, chainId } = useAppKitNetwork();
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
    const initContracts = async () => {
      if (isConnected && address && caipNetwork && chainId) {
        console.log('🌐 网络连接:', caipNetwork);
        modal.close();
        setCurrentNetworkType(caipNetwork.chainNamespace);

        // 初始化合约
        if (caipNetwork.chainNamespace === 'eip155') {
          try {
            const result = await initEVMContracts(chainId);
            console.log(`✅ ${caipNetwork.name} 合约初始化成功`, result);

            setProvider(result.provider);
            setEvmTokenContract(result.evmTokenContract);
            setEvmStakingContract(result.evmStakingContract);
          } catch (error) {
            console.error(`❌ ${caipNetwork.name} 合约初始化失败`, error);
          }
        } else if (caipNetwork.chainNamespace === 'solana') {
          if (connection && walletProvider) {
            try {
              const result = initSolanaContracts(chainId, walletProvider);
              console.log(`✅ ${caipNetwork.name} 合约初始化成功`, result);

              setSolanaConnection(result.solanaConnection);
              setSolanaProgram(result.solanaProgram);
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
    setProvider(null);
    setEvmTokenContract(null);
    setEvmStakingContract(null);
    setSolanaConnection(null);
    setSolanaProgram(null);
    setCurrentNetworkType(null);
  };

  return <>
    {
      (isConnected && address) ? (
        <button className='connect-button' onClick={() => modal.open()}>
          <img src="/assets/images/icon-wallet.svg" alt="" />
          {address.slice(0, 6)}...{address.slice(-4)}
        </button>
      ) : (
        <button className='connect-button' onClick={() => modal.open()}>
          <img src="/assets/images/icon-wallet.svg" alt="" />
          Connect Wallet
        </button>
      )
    }
  </>;
};
