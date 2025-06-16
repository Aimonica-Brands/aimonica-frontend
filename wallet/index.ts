import { createAppKit } from '@reown/appkit';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { solana, base, baseSepolia, solanaDevnet } from '@reown/appkit/networks';

export const networks: any =
  process.env.NEXT_PUBLIC_APP_ENV === 'production' ? [base, solana] : [solana, base, baseSepolia, solanaDevnet];

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

import BKIBSHIABI from '@/wallet/abi/BKIBSHI.json';
import AimStakingABI from '@/wallet/abi/AimStaking.json';
import aim_staking_program from '@/wallet/idl/aim_staking_program.json';

// 合约配置 - 使用 @reown/appkit/networks 的网络名称作为 key
export const contractConfig = {
  // base
  8453: {
    // AimStaking代理合约 :0x990BA617d7E7Ae3edE6318d9E85F851035B8323C
    // AimStaking合约：0x94b1A58575E00BC7b504b567e424BEa8f850808C
    // BKIBSHI:0x3d1c275aa98d45c99258a51be98b08fc8572c074
    BKIBSHI: '0x3d1C275aa98d45C99258A51be98b08Fc8572c074',
    AimStaking: '0x990ba617d7e7ae3ede6318d9e85f851035b8323c',
    BKIBSHIABI,
    AimStakingABI
  },

  // 'solana-devnet'
  EtWTRABZaYq6iMfeYKouRu166VU2xqa1: {
    cluster: 'devnet',
    programId: '5BH7DL2muAL9w3LYcZWcB1U8JA1dc7KFaCfTpKJ5RjmD',
    aim_staking_program
  }
};

// 工具函数
export const getContractConfig = (networkName: string) => {
  return contractConfig[networkName] || null;
};
