'use client';
import { useEffect } from 'react';
import { useAppKitAccount, useAppKitNetwork, useAppKitProvider } from '@reown/appkit/react';
import { BrowserProvider, formatUnits, ethers, Eip1193Provider } from 'ethers';
import { USDT_ADDRESS, USDT_ABI } from '@/wallet/contracts';

export const WalletComponent = () => {
  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();
  const { walletProvider } = useAppKitProvider('eip155');

  useEffect(() => {
    console.log('Wallet Status:', { isConnected, address, caipNetwork, walletProvider });

    if (isConnected && address && caipNetwork) {
      console.log(`连接到：${caipNetwork.name}，地址为：${address}`);
    //   initContract();
    }
  }, [isConnected, address, caipNetwork, walletProvider]);

  const initContract = async () => {
    if (caipNetwork?.chainNamespace === 'eip155') {
      try {
        console.log('Initializing EVM contract...');
        console.log('WalletProvider type:', typeof walletProvider);

        const provider = new ethers.BrowserProvider(walletProvider as Eip1193Provider);
        console.log('Provider created');

        const signer = await provider.getSigner();
        console.log('Signer created');

        const USDTContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
        console.log('Contract created');

        const USDTBalance = await USDTContract.balanceOf(address);
        console.log('Balance fetched:', formatUnits(USDTBalance, 18));
      } catch (error) {
        console.error('Contract initialization failed:', error);
      }
    }
  };

  return <></>;
};
