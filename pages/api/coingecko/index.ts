// utils/coingecko.ts
import axios from 'axios';

// 根据 CoinGecko 文档，Demo API 必须使用 api.coingecko.com
const BASE_URL = 'https://api.coingecko.com/api/v3';

// Demo API 配置
const headers = {
  accept: 'application/json',
  'x-cg-demo-api-key': process.env.NEXT_PUBLIC_COINGECKO_APIKEY
};

export const coingeckoAPI = {
  getCoinList: async () => {
    const res = await axios.get(`${BASE_URL}/coins/list`, {
      headers
    });
    return res.data;
  },

  getCoinDetails: async (id: string) => {
    const res = await axios.get(`${BASE_URL}/coins/${id}`, {
      headers
    });
    return res.data;
  },

  getCoinByContract: async (platformId: string, contract_addresses: string) => {
    const res = await axios.get(`${BASE_URL}/coins/${platformId}/contract/${contract_addresses}`, {
      headers
    });
    return res.data;
  },

  getCoinPrice: async (platformId: string, contract_addresses: string) => {
    const res = await axios.get(`${BASE_URL}/simple/token_price/${platformId}`, {
      headers,
      params: { contract_addresses, vs_currencies: 'usd' }
    });
    return res.data;
  }
};
