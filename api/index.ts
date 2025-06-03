import { message } from 'antd';
import axios, { AxiosInstance } from 'axios';
import { request, gql } from 'graphql-request';

// 创建 axios 实例
const instance: AxiosInstance = axios.create({
  baseURL: 'https://pre-vaults-api.gaib.cloud',
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' }
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    message.error(error?.response?.data?.message || error?.message || 'Request failed');
    return Promise.reject(error);
  }
);
