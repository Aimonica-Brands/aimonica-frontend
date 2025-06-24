import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;

  // 将路径数组转换为字符串
  const apiPath = Array.isArray(path) ? path.join('/') : path || '';

  try {
    // 构建外部API URL
    const externalUrl = `https://api.staging.cookie.fun/v3/${apiPath}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': '836596cc-8c94-4d10-bbfb-4234be5068e2'
    };
    const timeout = 5000;
    // 根据请求方法转发请求
    let response;

    if (req.method === 'GET') {
      response = await axios.get(externalUrl, {
        headers,
        timeout
      });
    } else if (req.method === 'POST') {
      response = await axios.post(externalUrl, req.body, {
        headers,
        timeout
      });
    } else if (req.method === 'PUT') {
      response = await axios.put(externalUrl, req.body, {
        headers,
        timeout
      });
    } else if (req.method === 'DELETE') {
      response = await axios.delete(externalUrl, {
        headers,
        timeout
      });
    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || error.message || 'Request failed'
    });
  }
}
