import { ethers } from 'ethers';
import * as anchor from '@coral-xyz/anchor';
import { clusterApiUrl, Connection } from '@solana/web3.js';
import { getContractConfig } from './index';
import { message } from 'antd';

/**初始化 EVM 合约*/
export const initEVMContracts = async (chainId: any) => {
  try {
    const tokenConfig = getContractConfig(chainId);
    if (!tokenConfig) {
      throw new Error(`No token configuration found for network ${chainId}`);
    }

    if (!window.ethereum) {
      throw new Error('MetaMask or other Ethereum wallet not found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum as any);
    const signer = await provider.getSigner();

    const tokenContract = new ethers.Contract(tokenConfig.BKIBSHI, tokenConfig.BKIBSHIABI, signer);

    const stakingContract = new ethers.Contract(tokenConfig.AimStaking, tokenConfig.AimStakingABI, signer);

    return {
      provider,
      evmTokenContract: tokenContract,
      evmStakingContract: stakingContract
    };
  } catch (error) {
    console.error('EVM contract initialization error:', error);
    throw error;
  }
};

/**初始化 Solana 合约*/
export const initSolanaContracts = (chainId: any, walletProvider: any) => {
  try {
    const tokenConfig = getContractConfig(chainId);
    if (!tokenConfig) {
      throw new Error(`No token configuration found for network ${chainId}`);
    }

    if (!walletProvider) {
      throw new Error('Solana wallet provider not available');
    }

    const endpoint = clusterApiUrl(tokenConfig.cluster);
    const newConnection = new Connection(endpoint);

    const provider = new anchor.AnchorProvider(newConnection, walletProvider, { commitment: 'confirmed' });

    anchor.setProvider(provider);

    const program = new anchor.Program(tokenConfig.aim_staking_program, provider);

    return {
      solanaConnection: newConnection,
      solanaProgram: program
    };
  } catch (error) {
    console.error('❌ Solana contract initialization error:', error);
    throw error;
  }
};

/**处理合约错误*/
export const handleContractError = (error: any) => {
  console.error('合约错误:', error);

  // 用户取消了操作
  if (
    error.code === 4001 ||
    error.code === 'ACTION_REJECTED' ||
    error.message?.includes('user rejected') ||
    error === '交易已取消'
  ) {
    return;
  }

  // 处理其他常见错误
  if (error.message) {
    message.error(`Failed: ${error.message}`);
  } else {
    message.error('Failed: Please try again later');
  }
};
