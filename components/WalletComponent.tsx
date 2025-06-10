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
      console.log(
        `%c network: ${caipNetwork.name}, \n id: ${caipNetwork.id}, \n address: ${address}`,
        'font-size: 16px; font-weight: bold; color: green;'
      );

      initContracts(caipNetwork).then((res) => {
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
