import Head from 'next/head';
import type { AppProps } from 'next/app';
import { ConfigProvider, theme, App as AntdApp } from 'antd';
import enUS from 'antd/locale/en_US';
import packageJson from '@/package.json';
import HeaderComponent from '@/components/HeaderComponent';
import FooterComponent from '@/components/FooterComponent';
import { PageProvider } from '@/context';

import 'antd/dist/reset.css';
import '@/styles/index.scss';
import '@/styles/page.scss';
import '@/styles/page-mobile.scss';

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, arbitrum } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

const config = getDefaultConfig({
  appName: 'Aimonica',
  projectId: 'b5863416c73906526923f5c4d6db20c8',
  chains: [arbitrum, mainnet],
  ssr: true
});

const antdTheme = {
  algorithm: theme.defaultAlgorithm,
  token: { colorPrimary: '#50B4FF', fontFamily: 'Poppins' },
  hashed: false,
  components: {
    Table: {
      headerBg: '#BDE4FF',
      headerBorderRadius: 18,
      headerColor: '#FFFFFF',
      headerSplitColor: 'transparent',
      cellPaddingBlock: 10,
      cellPaddingInline: 10
    }
  }
};

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          locale="en"
          theme={lightTheme({ accentColor: '#50B4FF' })}
          initialChain={arbitrum}>
          <ConfigProvider locale={enUS} theme={antdTheme}>
            <AntdApp>
              <PageProvider>
                <Head>
                  <meta
                    name="viewport"
                    content="width=device-width,initial-scale=1.0,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no"
                  />
                  <title>AIMonica</title>
                </Head>
                <HeaderComponent />
                <main>
                  <Component {...pageProps} />
                </main>
                <FooterComponent />
                <div className="package_version">{packageJson.version}</div>
              </PageProvider>
            </AntdApp>
          </ConfigProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
