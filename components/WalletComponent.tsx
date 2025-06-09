'use client';
import { useEffect } from 'react';
import { useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { initContracts } from '@/wallet/contracts';
import { usePageContext } from '@/context';

export const WalletComponent = () => {
  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();
  const { setProvider, setUSDCContract, setGPDUSDCContract } = usePageContext();

  useEffect(() => {
    if (isConnected && address && caipNetwork) {
      console.log(`当前已连接: ${caipNetwork.name}, Address: ${address}`);
      console.log('caipNetwork', caipNetwork);
      initContracts(caipNetwork.chainNamespace, caipNetwork.id).then((res) => {
        setProvider(res.provider);
        setUSDCContract(res.usdcContract);
        setGPDUSDCContract(res.gpdUsdcContract);
      });
    }
  }, [isConnected, address, caipNetwork]);

  return (
    <div>
      <appkit-button size="sm" />
    </div>
  );
};
