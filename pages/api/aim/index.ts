import axios from 'axios';
import { request, gql } from 'graphql-request';

// AIM API 统一管理
export const aimAPI = {
  GetPointsLeaderboard: async () => {
    const res = await axios.get('/api/aim/points/leaderboard');
    return res.data;
  },

  GetPointsDashboard: async (walletAddress: string) => {
    const res = await axios.get(`/api/aim/points/dashboard/${walletAddress}`);
    return res.data;
  },

  GetProjects: async () => {
    const res = await axios.get(`/api/aim/points/projects`);
    return res.data;
  }
};

export const subgraphsAPI = {
  getProjects: async () => {
    const endpoint = 'https://gateway.thegraph.com/api/subgraphs/id/2TCfqqmAFv4LpnJRVxjJ192C3sHJoCxu29rPTxgooch7';
    const query = `{
      projects(first: 1000, orderBy: createdAt, orderDirection: asc) {
        id
        stakingToken
        registered
        stakes {
          id
        }
        totalStaked
        createdAt
      }
      users(first: 1000) {
        id
        stakes {
          id
        }
        totalStaked
        activeStakeCount
      }
    }`;
    const headers = { Authorization: 'Bearer 3e2bce3f640324fa2d38b5c73d3984c3' };

    const res = await request(endpoint, query, {}, headers);
    return res;
  },

  /**获取质押记录 */
  getStakeRecords: async (address: string) => {
    const endpoint = 'https://gateway.thegraph.com/api/subgraphs/id/2TCfqqmAFv4LpnJRVxjJ192C3sHJoCxu29rPTxgooch7';
    const query = `{
        stakes(where: { user: "${address.toLowerCase()}" }) {
          id
          stakeId
          user {
            id
          }
          project {
            id
          }
          amount
          stakingToken
          stakedAt
          duration
          unlockedAt
          status
          transactionHash
        }
      }`;
    const headers = { Authorization: `Bearer 3e2bce3f640324fa2d38b5c73d3984c3` };

    const res = await request(endpoint, query, {}, headers);
    return res;
  }
};
