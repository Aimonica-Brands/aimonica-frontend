import { ethers } from 'ethers';
import { Program, AnchorProvider } from '@project-serum/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { getContractConfig, EVMTokenConfig, SolanaTokenConfig } from './config';

/**
 * 初始化 EVM 合约
 */
export const initEVMContracts = async (network: string) => {
  try {
    const tokenConfig = getContractConfig(network) as EVMTokenConfig;
    if (!tokenConfig) {
      throw new Error(`No token configuration found for network ${network}`);
    }

    if (!window.ethereum) {
      throw new Error('MetaMask or other Ethereum wallet not found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum as any);
    const signer = await provider.getSigner();

    const usdcContract = new ethers.Contract(tokenConfig.USDC, tokenConfig.USDCABI, signer);

    const gpdUsdcContract = new ethers.Contract(tokenConfig.GPDUSDC, tokenConfig.GPDUSDCABI, signer);

    return {
      provider,
      signer,
      usdcContract,
      gpdUsdcContract
    };
  } catch (error) {
    console.error('EVM contract initialization error:', error);
    throw error;
  }
};

/**
 * 初始化 Solana 合约
 */
export const initSolanaContracts = (connection: Connection, walletProvider: any, network: string) => {
  try {
    const tokenConfig = getContractConfig(network) as SolanaTokenConfig;
    if (!tokenConfig) {
      throw new Error(`No token configuration found for network ${network}`);
    }

    if (!connection) {
      throw new Error('Solana connection not available');
    }

    if (!walletProvider) {
      throw new Error('Solana wallet provider not available');
    }

    // 创建 Anchor provider
    const anchorProvider = new AnchorProvider(connection, walletProvider, { commitment: 'confirmed' });

    // 初始化程序
    const program = new Program(tokenConfig.idl, new PublicKey(tokenConfig.programId), anchorProvider);

    return {
      connection,
      program,
      anchorProvider,
      walletProvider
    };
  } catch (error) {
    console.error('Solana contract initialization error:', error);
    throw error;
  }
};
