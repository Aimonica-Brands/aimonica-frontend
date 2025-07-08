import { ethers } from 'ethers';
import * as anchor from '@coral-xyz/anchor';
import { clusterApiUrl, Connection } from '@solana/web3.js';
import { getContractConfig } from './index';
import { message } from 'antd';

/**初始化 EVM 合约*/
export const initEVMTokenContract = async (chainId: any, token: any, abi: any) => {
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

    const evmTokenContract = new ethers.Contract(token, abi, signer);

    return evmTokenContract;
  } catch (error) {
    console.error('EVM contract initialization error:', error);
    throw error;
  }
};

export const initEVMStakingContract = async (chainId: any) => {
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

    const evmStakingContract = new ethers.Contract(tokenConfig.AimStaking, tokenConfig.AimStakingABI, signer);

    return evmStakingContract;
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
