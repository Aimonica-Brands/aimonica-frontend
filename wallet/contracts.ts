import { ethers } from 'ethers';
// import { AnchorProvider, Program } from '@project-serum/anchor';
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { getContractConfig, EVMTokenConfig, SolanaTokenConfig } from './config';
import { message } from 'antd';

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
    console.log('⚙️ 代币配置:', tokenConfig);

    if (!connection) {
      throw new Error('Solana connection not available');
    }

    if (!walletProvider) {
      throw new Error('Solana wallet provider not available');
    }

    if (!tokenConfig.aim_staking_program) {
      throw new Error('aim_staking_program IDL not found in token configuration');
    }

    if (!tokenConfig.programId) {
      throw new Error('programId not found in token configuration');
    }

    // 创建 Anchor provider
    console.log('🔧 创建 Anchor provider...');

    const programId = new PublicKey(tokenConfig.programId);
    console.log('✅ Program ID 验证成功:', programId.toString());

    // 在浏览器环境中创建 provider，不使用 env()
    const provider = new anchor.AnchorProvider(connection, walletProvider, { commitment: 'confirmed' });

    // 设置提供者
    anchor.setProvider(provider);

    // 创建程序实例
    const program = new anchor.Program(tokenConfig.aim_staking_program, provider);

    console.log('✅ 初始化程序成功:');

    return {
      solanaConnection: connection,
      solanaProgram: program,
      solanaProvider: provider
    };
  } catch (error) {
    console.error('❌ Solana contract initialization error:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
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
