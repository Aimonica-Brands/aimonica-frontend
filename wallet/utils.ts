import { ethers } from 'ethers';
import * as anchor from '@coral-xyz/anchor';
import { Connection } from '@solana/web3.js';
import { getContractConfig } from '@/wallet';
import evmTokenABI from '@/wallet/abi/EVMToken.json';

/**初始化 EVM 合约*/
export const getEVMTokenContract = async (chainId: any, token: any) => {
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

    const contract = new ethers.Contract(token, evmTokenABI, signer);

    return contract;
  } catch (error) {
    console.error('EVM contract initialization error:', error);
    throw error;
  }
};

/**初始化 EVM 质押合约*/
export const getEVMStakeContract = async (chainId: any) => {
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

    const contract = new ethers.Contract(tokenConfig.AimStaking, tokenConfig.AimStakingABI, signer);

    return contract;
  } catch (error) {
    console.error('EVM contract initialization error:', error);
    throw error;
  }
};

/**初始化 Solana 合约*/
export const getSolanaContracts = (chainId: any, walletProvider: any) => {
  try {
    const tokenConfig = getContractConfig(chainId);
    if (!tokenConfig) {
      throw new Error(`No token configuration found for network ${chainId}`);
    }

    if (!walletProvider) {
      throw new Error('Solana wallet provider not available');
    }

    const newConnection = new Connection(tokenConfig.endpoint, 'confirmed');

    const provider = new anchor.AnchorProvider(newConnection, walletProvider, { commitment: 'confirmed' });

    anchor.setProvider(provider);

    const program = new anchor.Program(tokenConfig.aim_staking_program, provider);

    return program;
  } catch (error) {
    console.error('❌ Solana contract initialization error:', error);
    throw error;
  }
};

/**获取奖励点数*/
export const getRewardPoints = (duration: number) => {
  if (duration == 1) return 1;
  if (duration == 7) return 1;
  if (duration == 14) return 3;
  if (duration == 30) return 8;
  return 0;
};

export * from './utils-evm';
export * from './utils-solana';
