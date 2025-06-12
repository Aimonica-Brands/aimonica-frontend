import USDCABI from '@/wallet/abi/USDC.json';
import GPDUSDCABI from '@/wallet/abi/gpdUSDC.json';
import idl from '@/wallet/idl/idl.json';
import hgnft from '@/wallet/idl/hgnft.json';

// EVM 代币配置
export interface EVMTokenConfig {
  USDC: string;
  GPDUSDC: string;
  USDCABI: any;
  GPDUSDCABI: any;
}

// Solana 程序配置
export interface SolanaTokenConfig {
  readProgramId: string;
  writeProgramId: string;
  idl: any;
  hgnft: any;
}

// 合约配置 - 使用 @reown/appkit/networks 的网络名称作为 key
export const CONTRACT_CONFIGS = {
  'base-sepolia': {
    USDC: '0x7964F8a00B49Ce5c6fc51A1b6800196E96376c62',
    GPDUSDC: '0x4733FA9d295973C53Eaa027894998B7CC364F0ca',
    USDCABI,
    GPDUSDCABI
  } as EVMTokenConfig,

  'solana-devnet': {
    readProgramId: 'HdBvhzMrhmdPyrbwL9ZR2ZFqhqVSKcDra7ggdWqCcwps',
    writeProgramId: '4WTUyXNcf6QCEj76b3aRDLPewkPGkXFZkkyf3A3vua1z',
    idl,
    hgnft
  } as SolanaTokenConfig
};

// 工具函数
export const getContractConfig = (networkName: string): EVMTokenConfig | SolanaTokenConfig | null => {
  return CONTRACT_CONFIGS[networkName] || null;
};
