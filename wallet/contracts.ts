import { ethers } from 'ethers';
import * as anchor from '@coral-xyz/anchor';
import { Connection } from '@solana/web3.js';
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

    const contract = new ethers.Contract(token, abi, signer);

    return contract;
  } catch (error) {
    console.error('EVM contract initialization error:', error);
    throw error;
  }
};

/**初始化 EVM 质押合约*/
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

    const contract = new ethers.Contract(tokenConfig.AimStaking, tokenConfig.AimStakingABI, signer);

    return contract;
  } catch (error) {
    console.error('EVM contract initialization error:', error);
    throw error;
  }
};

/**获取可用的 Solana RPC 端点*/
const getSolanaEndpoint = () => {
  // 免费公共 RPC 端点列表
  const mainnetEndpoints = [
    'https://solana.publicnode.com/',
    'https://solana-mainnet.g.alchemy.com/v2/demo', // Alchemy 免费端点
    'https://rpc.ankr.com/solana', // Ankr 免费端点
    'https://solana-api.projectserum.com', // Project Serum 免费端点
    'https://api.mainnet-beta.solana.com', // Solana 官方端点（有限制）
    'https://solana.public-rpc.com', // 公共 RPC
    'https://rpc.helius.xyz/?api-key=1aec0f89-8b1a-4a5c-9b1a-4a5c9b1a4a5c' // Helius 免费端点
  ];

  // 随机选择一个端点，避免单一端点过载
  // const randomIndex = Math.floor(Math.random() * 3); // 只使用前3个最稳定的端点
  return mainnetEndpoints[0];
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

    const endpoint = getSolanaEndpoint();
    const newConnection = new Connection(endpoint, 'confirmed');

    const provider = new anchor.AnchorProvider(newConnection, walletProvider, { commitment: 'confirmed' });

    anchor.setProvider(provider);

    const program = new anchor.Program(tokenConfig.aim_staking_program, provider);

    return program;
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
