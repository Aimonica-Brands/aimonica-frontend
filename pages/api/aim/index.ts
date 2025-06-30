import axios from 'axios';

// AIM API 统一管理
export const evmAPI = {
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
