import { message } from 'antd';
import { createAppKit } from '@reown/appkit';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { solana, base, baseSepolia } from '@reown/appkit/networks';

export const networks: any = [baseSepolia, solana, base];

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

// 错误处理
export function walletError(error: any) {
  if (error?.code === 4001 || error?.code === 'ACTION_REJECTED') {
    message.error('Transaction rejected by user');
    return;
  }

  if (error?.data?.message) {
    message.error(error.data.message);
    return;
  }

  if (error?.message) {
    message.error(error.message);
    return;
  }
}
