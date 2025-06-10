import { ethers } from 'ethers';
import idl from '@/wallet/idl/idl.json';
import USDCABI from '@/wallet/abi/USDC.json';
import GPDUSDCABI from '@/wallet/abi/gpdUSDC.json';

const tokenABI = {
  //   'base-sepolia'
  84532: {
    USDC: '0x7964F8a00B49Ce5c6fc51A1b6800196E96376c62',
    GPDUSDC: '0x4733FA9d295973C53Eaa027894998B7CC364F0ca',
    USDCABI,
    GPDUSDCABI
  },
  //   'solana'
  '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
    programId: '9sMy4hnC9MML6mioESFZmzpntt3focqwUq1ymPgbMf64',
    idl
  }
};

export const initContracts = async (caipNetwork: any) => {
  const { chainNamespace, id, rpcUrls } = caipNetwork;

  const token = tokenABI[id];

  if (token) {
    if (chainNamespace === 'eip155') {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();

      const usdcContract = new ethers.Contract(token.USDC, token.USDCABI, signer);
      const gpdUsdcContract = new ethers.Contract(token.GPDUSDC, token.GPDUSDCABI, signer);
      return {
        provider,
        usdcContract,
        gpdUsdcContract
      };
    } else if (chainNamespace === 'solana') {
      // const endpoint = rpcUrls.default.http[0];
      return {
        provider: null,
        usdcContract: null,
        gpdUsdcContract: null
      };
    }
  } else {
    return {
      provider: null,
      usdcContract: null,
      gpdUsdcContract: null
    };
  }
};
