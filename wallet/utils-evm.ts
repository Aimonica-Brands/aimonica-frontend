import { ethers } from 'ethers';
import { aimonicaAPI, subgraphsAPI } from '@/pages/api/aimonica';
import { coingeckoAPI } from '@/pages/api/coingecko';
import { getRewardPoints } from './utils';

export const evmUtils = {
  /**获取项目信息 */
  getProjects: async (onProjectUpdate?: (projects: any[]) => void) => {
    try {
      const projectsRes: any = await subgraphsAPI.getProjects();

      const projects = projectsRes.projects.filter((item: any) => item.registered);
      console.log('EVM original project records:', projects);

      let leaderboard = [];
      try {
        const pointsLeaderboard = await aimonicaAPI.GetPointsLeaderboard();
        leaderboard = pointsLeaderboard.projects;
      } catch (error) {
        console.error(error);
      }
      // 优化：将排行榜转换为 Map，O(1) 查找
      const leaderboardMap: Map<string, any> = new Map(
        (leaderboard || []).map((item: any) => [String(item.id), item])
      );

      // 先创建基本项目信息
      const basicProjects = projects.map((project: any, index: number) => {
        const projectName = ethers.decodeBytes32String(project.id);
        const leaderboardItem = leaderboardMap.get(String(project.id));
        const points = Number(leaderboardItem?.total_score) || 0;

        return {
          id: project.id,
          projectName,
          stakingToken: project.stakingToken,
          totalStaked: Number(ethers.formatEther(project.totalStaked)),
          createdAt: project.createdAt,
          userCount: Number(project.userCount),
          points,
          platformId: 'base',
          contractAddress: '',
          description: 'Loading...',
          image: '',
          links: {
            website: '',
            x: '',
            twitter: '',
            dex: '',
          },
          coinPriceUsd: 0,
          tvl: 0,
          isLoading: true, // 标记为加载中
          shouldRemove: false,
        };
      });

      // 立即返回基本信息
      console.log('EVM basic project records:', basicProjects);
      if (onProjectUpdate && basicProjects.length > 0) {
        const sortedBasicProjects = basicProjects
          .sort((a: any, b: any) => b.totalStaked - a.totalStaked)
          .map((item: any, index: number) => {
            return { ...item, rank: index + 1 };
          });
        onProjectUpdate(sortedBasicProjects);
      }

      // 并行异步获取详细信息
      const detailedProjects = [...basicProjects];
      // 使用稳定映射，避免由于外部排序导致的索引错配
      const projectById: Map<string, any> = new Map(detailedProjects.map((p: any) => [p.id, p]));

      // 创建所有的异步请求，并标记失败的项目
      const fetchPromises = projects.map(async (project: any, idx: number) => {
        const currentProject = projectById.get(project.id);
        if (!currentProject) {
          console.warn(`Basic project not found for id=${project.id}, skipping`);
          return;
        }
        // console.log(`Fetching details for project ${idx + 1}/${projects.length}...`);

        try {
          const coinDetailsRes = await coingeckoAPI.getCoinByContract('base', project.stakingToken);
          // console.log(currentProject.projectName, coinDetailsRes);

          const coinPrice = await coingeckoAPI.getCoinPrice('base', coinDetailsRes.contract_address);
          currentProject.coinPriceUsd = coinPrice[coinDetailsRes.contract_address].usd;
          // console.log(currentProject.projectName, currentProject.coinPriceUsd);

          currentProject.tvl = Number(currentProject.totalStaked) * currentProject.coinPriceUsd;
          currentProject.description = coinDetailsRes.description.en;
          currentProject.image = coinDetailsRes.image.small;
          currentProject.links = {
            website: coinDetailsRes.links.homepage[0],
            x: `https://x.com/${coinDetailsRes.links.twitter_screen_name}`,
            twitter: `https://t.me/${coinDetailsRes.links.telegram_channel_identifier}`,
            dex: `https://dexscreener.com/${coinDetailsRes.asset_platform_id}/${coinDetailsRes.contract_address}`,
          };
          currentProject.isLoading = false;
          currentProject.shouldRemove = false; // 标记为保留
        } catch (error) {
          console.error(`Failed to get project ${currentProject.projectName} information, will remove it:`, error);
          currentProject.shouldRemove = true; // 标记为删除
        }

        // 每获取一个项目的详细信息就更新一次（过滤掉需要删除的项目），节流降低渲染频率
        if (onProjectUpdate) {
          const now = Date.now();
          (evmUtils as any).__lastEmitAt = (evmUtils as any).__lastEmitAt || 0;
          if (now - (evmUtils as any).__lastEmitAt > 200) { // 200ms 粗略节流
            (evmUtils as any).__lastEmitAt = now;
            const validProjects = detailedProjects.filter((p) => !p.shouldRemove);
            const sortedProjects = validProjects
              .sort((a: any, b: any) => b.tvl - a.tvl)
              .map((item: any, index: number) => {
                return { ...item, rank: index + 1 };
              });
            onProjectUpdate(sortedProjects);
          }
        }
      });

      // 等待所有请求完成
      await Promise.all(fetchPromises);

      // 过滤掉获取失败的项目
      const validProjects = detailedProjects.filter((project) => !project.shouldRemove);

      // 最终返回完整的详细信息（确保最后一次也触发更新）
      if (validProjects.length > 0) {
        const sortedProjects = validProjects
          .sort((a: any, b: any) => b.tvl - a.tvl)
          .map((item: any, index: number) => {
            return { ...item, rank: index + 1 };
          });

        if (onProjectUpdate) {
          onProjectUpdate(sortedProjects);
        }
        console.log('EVM project records (complete):', sortedProjects);
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
      console.log('EVM original staking records:', data);

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
          points,
        });
      }
      const sortedRecords = records.sort((a: any, b: any) => b.stakedAt - a.stakedAt);
      console.log('EVM staking records:', sortedRecords);

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
      console.error('Failed to get token balance:', error);
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
      console.error('Failed to get token allowance:', error);
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
      console.error('Approval failed:', error);
      throw error;
    }
  },

  /**质押 */
  stake: async (evmStakingContract: any, stakeAmount: string, stakeDuration: number, projectId: string) => {
    try {
      console.log(
        'Project ID:',
        ethers.decodeBytes32String(projectId),
        'Amount:',
        stakeAmount,
        'Duration:',
        stakeDuration,
      );

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
      console.log('Unstake ID:', record.stakeId, 'Amount:', record.amount);

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
      console.log('Emergency unstake ID:', record.stakeId, 'Amount:', record.amount);

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
        emergencyUnstakeFeeRate: Number(emergencyUnstakeFeeRate) / 100,
      };
      console.log('✅ Fee configuration retrieved:', config);

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
      console.log('✅ Staking duration retrieved:', durations);

      return durations;
    } catch (error) {
      throw error;
    }
  },
};
