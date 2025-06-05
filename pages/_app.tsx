import Head from 'next/head';
import type { AppProps } from 'next/app';
import { ConfigProvider, theme, App as AntdApp } from 'antd';
import enUS from 'antd/locale/en_US';
import packageJson from '@/package.json';
import HeaderComponent from '@/components/HeaderComponent';
import FooterComponent from '@/components/FooterComponent';
import { PageProvider } from '@/context';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

import { wagmiAdapter } from '@/wallet';
import { WagmiProvider, type Config } from 'wagmi';

import 'antd/dist/reset.css';
import '@/styles/index.scss';
import '@/styles/page.scss';
import '@/styles/page-mobile.scss';

dayjs.extend(duration);

// Set up queryClient
const queryClient = new QueryClient();

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

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </WagmiProvider>
  );
}
