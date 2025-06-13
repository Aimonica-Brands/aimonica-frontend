import USDCABI from '@/wallet/abi/USDC.json';
import GPDUSDCABI from '@/wallet/abi/gpdUSDC.json';
import aim_staking_program from '@/wallet/idl/aim_staking_program.json';
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
  aim_staking_program: any;
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
    programId: 'HdBvhzMrhmdPyrbwL9ZR2ZFqhqVSKcDra7ggdWqCcwps',
    aim_staking_program: idl
    // programId: '5BH7DL2muAL9w3LYcZWcB1U8JA1dc7KFaCfTpKJ5RjmD',
    // aim_staking_program
  } as SolanaTokenConfig
};

// 工具函数
export const getContractConfig = (networkName: string): EVMTokenConfig | SolanaTokenConfig | null => {
  return CONTRACT_CONFIGS[networkName] || null;
};
