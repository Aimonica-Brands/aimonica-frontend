import { ethers } from 'ethers';
import { message } from 'antd';

// 导入 ABI
import USDTABI from './abi/USDT.json';
import gpdUSDTABI from './abi/gpdUSDT.json';

import { arbitrum, mainnet } from 'wagmi/chains';

export function evmToken() {
  return {
    // ETH主网
    eth: {},
    // ARB主网
    arb: {
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      gpdUSDT: '0xed1B25e98233d138A49ACe801474dA486704F9D5'
    }
  };
}

// 初始合约状态
export const contractsVariable = {
  provider: null,
  contractUSDT: null,
  contractGPDUSDT: null
};

export async function initContracts(chainId: number) {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    if (chainId === arbitrum.id) {
      const contracts = {
        provider,
        contractUSDT: new ethers.Contract(evmToken().arb.USDT, USDTABI, signer),
        contractGPDUSDT: new ethers.Contract(evmToken().arb.gpdUSDT, gpdUSDTABI, signer)
      };
      return contracts;
    } else {
      return contractsVariable;
    }
  } catch (error) {
    console.error('Error initializing contracts:', error);
    return contractsVariable;
  }
}

export function walletError(error: any) {
  if (error?.code === 4001 || error?.code === 'ACTION_REJECTED') {
    message.error('Transaction rejected by user');
    return;
  }

  if (error?.data?.message) {
    message.error(error.data.message);
    return;
  }

  if (error?.message) {
    message.error(error.message);
    return;
  }
}
