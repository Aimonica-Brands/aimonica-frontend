import axios from 'axios';

// Cookie.fun API 统一管理
export const cookieAPI = {
  // GetSectors: async () => {
  //   const res = await axios.get('/api/cookiefun/sectors');
  //   return res.data;
  // },

  GetProjectDetails: async (slug: string) => {
    const res = await axios.post('/api/cookiefun/project', { slug });
    console.log('GetProjectDetails', res);
    return res.data;
  },

  GetAccountDetails: async (username: string) => {
    const res = await axios.post('/api/cookiefun/account', { username });
    console.log('GetAccountDetails', res);
    return res.data;
  },

  GetMetricsGraph: async (metricType: string, granulation: string, projectSlug: string) => {
    // Select metricType
    // Engagements (0)
    // Impressions (1)
    // SmartEngagements (2)
    // EngagementRate (3)
    // Mentions (4)
    // Select granulation
    // _1Hour (0)
    // _24Hours (1)

    const res = await axios.post('/api/cookiefun/metrics', { metricType, granulation, projectSlug });
    console.log('GetMetricsGraph', res);
    return res.data;
  },

  GetProjectMindshareGraph: async (projectSlug: string) => {
    const res = await axios.post('/api/cookiefun/project/mindshare-graph', { projectSlug });
    console.log('GetProjectMindshareGraph', res);
    return res.data;
  },

  GetAccountSmartFollowers: async (username: string) => {
    const res = await axios.post('/api/cookiefun/account/smart-followers', { username });
    console.log('GetAccountSmartFollowers', res);
    return res.data;
  },

  SearchTweets: async (searchQuery: string, projectSlug: string) => {
    const res = await axios.post('/api/cookiefun/feed/query', { searchQuery, projectSlug });
    return res.data;
  },
};
