import { createAppKit } from '@reown/appkit';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { solana, base, baseSepolia, solanaDevnet } from '@reown/appkit/networks';

export const networks: any =
  process.env.NEXT_PUBLIC_APP_ENV === 'production' ? [base, solana] : [solanaDevnet, baseSepolia];

// 0. Get projectId from https://cloud.reown.com
export const projectId = 'b5863416c73906526923f5c4d6db20c8';

// 1. Create the Wagmi adapter
export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  projectId,
  networks
});

// 2. Create Solana adapter
export const solanaWeb3JsAdapter = new SolanaAdapter();

// 3. Set up the metadata - Optional
const metadata = {
  name: 'AIMonica',
  description: 'AIMonica DApp',
  url: 'https://aimonica.dev/', // origin must match your domain & subdomain
  icons: [`/assets/images/logo2.svg`]
};

// 4. Create the AppKit instance
export const modal = createAppKit({
  adapters: [wagmiAdapter, solanaWeb3JsAdapter],
  networks,
  metadata,
  projectId,
  features: {
    analytics: true
  },
  themeMode: 'light',
  themeVariables: { '--w3m-accent': '#50B4FF' }
});

import USDCABI from '@/wallet/abi/USDC.json';
import GPDUSDCABI from '@/wallet/abi/gpdUSDC.json';
import aim_staking_program from '@/wallet/idl/aim_staking_program.json';

// 合约配置 - 使用 @reown/appkit/networks 的网络名称作为 key
export const contractConfig = {
  'base-sepolia': {
    USDC: '0x7964F8a00B49Ce5c6fc51A1b6800196E96376c62',
    GPDUSDC: '0x4733FA9d295973C53Eaa027894998B7CC364F0ca',
    USDCABI,
    GPDUSDCABI
  },

  'solana-devnet': {
    cluster: 'devnet',
    programId: '5BH7DL2muAL9w3LYcZWcB1U8JA1dc7KFaCfTpKJ5RjmD',
    aim_staking_program
  }
};

// 工具函数
export const getContractConfig = (networkName: string) => {
  return contractConfig[networkName] || null;
};
