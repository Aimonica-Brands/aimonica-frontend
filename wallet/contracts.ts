import { ethers } from 'ethers';
import * as anchor from '@coral-xyz/anchor';
import { clusterApiUrl, Connection } from '@solana/web3.js';
import { getContractConfig } from './index';
import { message } from 'antd';

/**
 * 初始化 EVM 合约
 */
export const initEVMContracts = async (id: any) => {
  try {
    const tokenConfig = getContractConfig(id);
    if (!tokenConfig) {
      throw new Error(`No token configuration found for network ${id}`);
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

/**
 * 初始化 Solana 合约
 */
export const initSolanaContracts = (id: any, walletProvider: any) => {
  try {
    const tokenConfig = getContractConfig(id);
    if (!tokenConfig) {
      throw new Error(`No token configuration found for network ${id}`);
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

// 在这里实现一下对合约报错的处理，比如说用户取消授权或取消交易等
export const handleContractError = (error: any) => {
  console.error('合约错误:', error);

  // Handle user rejection cases
  if (
    error.code === 4001 ||
    error.code === 'ACTION_REJECTED' ||
    error.message?.includes('user rejected') ||
    error === '交易已取消'
  ) {
    message.info('用户取消了操作');
    return;
  }

  // Handle other common error cases
  if (error.message) {
    message.error(`操作失败: ${error.message}`);
  } else {
    message.error('合约操作失败，请稍后重试');
  }
};
