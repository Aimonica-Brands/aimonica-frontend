import { ethers } from 'ethers';

import USDCABI from '@/wallet/abi/USDC.json';
import GPDUSDCABI from '@/wallet/abi/gpdUSDC.json';

const tokenABI = {
  //   'base-sepolia'
  84532: {
    USDC: '0x7964F8a00B49Ce5c6fc51A1b6800196E96376c62',
    GPDUSDC: '0x4733FA9d295973C53Eaa027894998B7CC364F0ca',
    USDCABI,
    GPDUSDCABI
  }
};

// Contract ABIs
export const USDC_ABI = USDCABI;
export const GPDUSDC_ABI = GPDUSDCABI;

export const initContracts = async (chainNamespace: string, chainId: any) => {
  if (chainNamespace === 'eip155') {
    const provider = new ethers.BrowserProvider(window.ethereum as any);
    const signer = await provider.getSigner();

    const token = tokenABI[chainId];
    const usdcContract = new ethers.Contract(token.USDC, token.USDCABI, signer);
    const gpdUsdcContract = new ethers.Contract(token.GPDUSDC, token.GPDUSDCABI, signer);
    return {
      provider,
      usdcContract,
      gpdUsdcContract
    };
  }
  return {
    provider: null,
    usdcContract: null,
    gpdUsdcContract: null
  };
};
