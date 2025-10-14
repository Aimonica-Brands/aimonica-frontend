// utils/coingecko.ts
import axios from 'axios';

// Demo API Key 仅适用于 CoinGecko Public Demo API Plan，CoinGecko Public Demo API 的根 URL 必须是https://api.coingecko.com/api/v3/。
// const BASE_URL = 'https://api.coingecko.com/api/v3/';

// Pro API Key 仅适用于CoinGecko API 付费计划订阅者，CoinGecko Pro API 的根 URL 必须为https://pro-api.coingecko.com/api/v3/。
const BASE_URL = 'https://pro-api.coingecko.com/api/v3/';

// Demo API 配置
const headers = {
  accept: 'application/json',
  // 'x-cg-demo-api-key': process.env.NEXT_PUBLIC_COINGECKO_APIKEY,
  'x-cg-pro-api-key': process.env.NEXT_PUBLIC_COINGECKO_APIKEY,
};

export const coingeckoAPI = {
  getCoinByContract: async (platformId: string, contract_addresses: string) => {
    const res = await axios.get(`${BASE_URL}coins/${platformId}/contract/${contract_addresses}`, {
      headers,
    });
    return res.data;
  },

  getCoinPrice: async (platformId: string, contract_addresses: string) => {
    const res = await axios.get(`${BASE_URL}simple/token_price/${platformId}`, {
      headers,
      params: { contract_addresses, vs_currencies: 'usd' },
    });
    return res.data;
  },
};
