import { createAppKit } from '@reown/appkit';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { base, solana, solanaDevnet } from '@reown/appkit/networks';

export const networks: any = process.env.NEXT_PUBLIC_APP_ENV === 'production' ? [base, solana] : [base, solanaDevnet];

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

// 合约配置
export const getContractConfig = (chainId: any = ''): any => {
  const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'production';

  const config = isProduction
    ? []
    : [
        {
          // id: 8453,
          network: base,
          BKIBSHI: '0x3d1C275aa98d45C99258A51be98b08Fc8572c074',
          AimStaking: '0x990ba617d7e7ae3ede6318d9e85f851035b8323c',
          BKIBSHIABI,
          AimStakingABI
        },
        {
          // id: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
          network: solanaDevnet,
          cluster: 'devnet',
          programId: '5BH7DL2muAL9w3LYcZWcB1U8JA1dc7KFaCfTpKJ5RjmD',
          aim_staking_program
        }
      ];

  if (chainId) {
    return config.find((item) => item.network.id === chainId);
  }
  return config;
};
