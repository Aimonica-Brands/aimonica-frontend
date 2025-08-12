import { ethers } from 'ethers';
import { aimonicaAPI, subgraphsAPI } from '@/pages/api/aimonica';
import { coingeckoAPI } from '@/pages/api/coingecko';
import { getRewardPoints } from './utils';

export const evmUtils = {
  /**获取项目信息 */
  getProjects: async () => {
    try {
      const projectsRes: any = await subgraphsAPI.getProjects();

      const projects = projectsRes.projects.filter((item: any) => item.registered);
      console.log('EVM 原始项目记录:', projects);

      let leaderboard = [];
      try {
        const pointsLeaderboard = await aimonicaAPI.GetPointsLeaderboard();
        leaderboard = pointsLeaderboard.projects;
      } catch (error) {
        console.error(error);
      }

      const newProjects = [];

      for (let i = 0; i < projects.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 10000 * i));
        console.log(`Processing project ${i + 1}/${projects.length}...`);

        const project = projects[i];

        const projectName = ethers.decodeBytes32String(project.id);
        const leaderboardItem = leaderboard.find((item: any) => item.id == project.id);
        console.log(`${projectName} 积分`, leaderboardItem);
        const points = Number(leaderboardItem?.total_score) || 0;

        const newProject = {
          index: i,
          id: project.id,
          projectName,
          stakingToken: project.stakingToken,
          totalStaked: Number(ethers.formatEther(project.totalStaked)),
          createdAt: project.createdAt,
          userCount: Number(project.userCount),
          points,
          platformId: 'base',
          contractAddress: '',
          description: '',
          image: '',
          links: {
            website: '',
            x: '',
            twitter: '',
            dex: ''
          },
          coinPriceUsd: 0,
          tvl: 0
        };

        try {
          const coinDetailsRes = await coingeckoAPI.getCoinByContract('base', project.stakingToken);
          console.log(newProject.projectName, coinDetailsRes);

          const coinPrice = await coingeckoAPI.getCoinPrice('base', coinDetailsRes.contract_address);
          newProject.coinPriceUsd = coinPrice[coinDetailsRes.contract_address].usd;
          console.log(newProject.projectName, newProject.coinPriceUsd);

          newProject.tvl = Number(newProject.totalStaked) * newProject.coinPriceUsd;
          // newProject.platformId = coinDetailsRes.asset_platform_id;
          // newProject.contractAddress = coinDetailsRes.contract_address;
          newProject.description = coinDetailsRes.description.en;
          newProject.image = coinDetailsRes.image.small;
          newProject.links = {
            website: coinDetailsRes.links.homepage[0],
            x: `https://x.com/${coinDetailsRes.links.twitter_screen_name}`,
            twitter: `https://t.me/${coinDetailsRes.links.telegram_channel_identifier}`,
            dex: `https://dexscreener.com/${coinDetailsRes.asset_platform_id}/${coinDetailsRes.contract_address}`
          };
        } catch (error) {
          console.error(`获取项目 ${newProject.projectName} 的信息失败:`, error);
          // 使用默认值，继续处理项目
        }

        newProjects.push(newProject);
      }
      if (newProjects.length > 0) {
        const sortedProjects = newProjects
          .sort((a: any, b: any) => b.tvl - a.tvl)
          .map((item: any, index: number) => {
            return { ...item, rank: index + 1 };
          });

        console.log('EVM 项目记录:', sortedProjects);
        return sortedProjects;
      }

      return [];
    } catch (error) {
      throw error;
    }
  },

  /**获取质押记录 获取积分记录 */
  getStakeRecords: async (address: string) => {
    try {
      const data: any = await subgraphsAPI.getStakeRecords(address);
      console.log('EVM 原始质押记录:', data);

      if (!data.stakes) return [];

      const records = [];
      for (const stake of data.stakes) {
        const projectId = stake.project.id;
        const projectName = ethers.decodeBytes32String(projectId);
        const stakedAt = Number(stake.stakedAt) * 1000;
        const unlockedAt = Number(stake.unlockedAt) * 1000;
        const now = new Date().getTime();
        const canUnstake = now >= unlockedAt;

        const amount = Number(ethers.formatEther(stake.amount));
        const duration = Number(stake.duration) / 86400;

        const points = stake.status !== 'EmergencyUnstaked' ? amount * getRewardPoints(duration) : '-';

        records.push({
          projectId,
          projectName,
          stakeId: stake.stakeId,
          userId: stake.user.id,
          stakingToken: stake.stakingToken,
          amount,
          duration,
          status: stake.status,
          transactionHash: stake.transactionHash,
          stakedAt,
          unlockedAt,
          canUnstake,
          points
        });
      }
      const sortedRecords = records.sort((a: any, b: any) => b.stakedAt - a.stakedAt);
      console.log('EVM 质押记录:', sortedRecords);

      return sortedRecords;
    } catch (error) {
      throw error;
    }
  },

  /**获取代币余额 */
  getTokenBalance: async (evmTokenContract: any, address: string) => {
    try {
      const _balance = await evmTokenContract.balanceOf(address);
      const balance = Number(ethers.formatEther(_balance));
      return balance;
    } catch (error) {
      console.error('获取代币余额失败:', error);
      throw error;
    }
  },

  /**获取代币授权 */
  getAllowance: async (evmTokenContract: any, address: string, stakeAddress: string) => {
    try {
      const _allowance = await evmTokenContract.allowance(address, stakeAddress);
      const allowance = Number(ethers.formatEther(_allowance));
      return allowance;
    } catch (error) {
      console.error('获取代币授权失败:', error);
      throw error;
    }
  },

  /**授权 */
  approve: async (evmTokenContract: any, stakeAddress: string) => {
    try {
      const tx = await evmTokenContract.approve(stakeAddress, ethers.parseEther('1000000'));
      await tx.wait();
      return tx;
    } catch (error) {
      console.error('授权失败:', error);
      throw error;
    }
  },

  /**质押 */
  stake: async (evmStakingContract: any, stakeAmount: string, stakeDuration: number, projectId: string) => {
    try {
      console.log('项目ID:', ethers.decodeBytes32String(projectId), '数量:', stakeAmount, '时长:', stakeDuration);

      const amount = ethers.parseEther(stakeAmount);
      const tx = await evmStakingContract.stake(amount, stakeDuration, projectId);
      await tx.wait();
      return tx;
    } catch (error) {
      throw error;
    }
  },

  /**解质押 */
  unstake: async (evmStakingContract: any, record: any) => {
    try {
      console.log('解质押ID:', record.stakeId, '数量:', record.amount);

      const tx = await evmStakingContract.unstake(record.stakeId);
      await tx.wait();
      return tx;
    } catch (error) {
      throw error;
    }
  },

  /**紧急解质押 */
  emergencyUnstake: async (evmStakingContract: any, record: any) => {
    try {
      console.log('紧急解质押ID:', record.stakeId, '数量:', record.amount);

      const tx = await evmStakingContract.emergencyUnstake(record.stakeId);
      await tx.wait();
      return tx;
    } catch (error) {
      throw error;
    }
  },

  /**获取手续费配置 */
  getFeeConfig: async (evmStakingContract: any) => {
    try {
      const feeWallet = await evmStakingContract.feeWallet();
      const unstakeFeeRate = await evmStakingContract.unstakeFeeRate();
      const emergencyUnstakeFeeRate = await evmStakingContract.emergencyUnstakeFeeRate();
      const config = {
        feeWallet,
        unstakeFeeRate: Number(unstakeFeeRate) / 100,
        emergencyUnstakeFeeRate: Number(emergencyUnstakeFeeRate) / 100
      };
      console.log('✅ 获取手续费配置:', config);

      return config;
    } catch (error) {
      throw error;
    }
  },

  /**获取质押时长 */
  getDurationConfig: async (evmStakingContract: any) => {
    try {
      const allowedDurations = [1, 7, 14, 21, 30];
      let durations: any = [];
      for (const duration of allowedDurations) {
        const durationOptions = await evmStakingContract.durationOptions(duration);
        if (durationOptions) durations.push(duration);
      }
      console.log('✅ 获取质押时长:', durations);

      return durations;
    } catch (error) {
      throw error;
    }
  }
};
