import USDCABI from '@/wallet/abi/USDC.json';
import GPDUSDCABI from '@/wallet/abi/gpdUSDC.json';
import idl from '@/wallet/idl/idl.json';

// EVM 代币配置
export interface EVMTokenConfig {
  USDC: string;
  GPDUSDC: string;
  USDCABI: any;
  GPDUSDCABI: any;
}

// Solana 程序配置
export interface SolanaTokenConfig {
  programId: string;
  idl: any;
}

// 合约配置 - 使用 @reown/appkit/networks 的网络名称作为 key
export const CONTRACT_CONFIGS = {
  'base-sepolia': {
    USDC: '0x7964F8a00B49Ce5c6fc51A1b6800196E96376c62',
    GPDUSDC: '0x4733FA9d295973C53Eaa027894998B7CC364F0ca',
    USDCABI,
    GPDUSDCABI
  } as EVMTokenConfig,

  base: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base Mainnet USDC
    GPDUSDC: '0x4733FA9d295973C53Eaa027894998B7CC364F0ca', // 需要替换为实际地址
    USDCABI,
    GPDUSDCABI
  } as EVMTokenConfig,

  'solana-devnet': {
    programId: '9sMy4hnC9MML6mioESFZmzpntt3focqwUq1ymPgbMf64',
    idl
  } as SolanaTokenConfig,

  solana: {
    programId: '9sMy4hnC9MML6mioESFZmzpntt3focqwUq1ymPgbMf64', // 需要替换为主网地址
    idl
  } as SolanaTokenConfig
};

// 工具函数
export const getContractConfig = (networkName: string): EVMTokenConfig | SolanaTokenConfig | null => {
  return CONTRACT_CONFIGS[networkName] || null;
};
