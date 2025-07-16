import { ethers } from 'ethers';
import { aimAPI, subgraphsAPI } from '@/pages/api/aim';
import { coingeckoAPI } from '@/pages/api/coingecko';

export const evmUtils = {
  /**获取项目信息 */
  getProjects: async () => {
    try {
      const projectsRes: any = await subgraphsAPI.getProjects();

      const projects = projectsRes.projects.filter((item: any) => item.registered);
      console.log('EVM 原始项目记录:', projects);

      // 获取积分排行榜，如果失败则使用空数据继续执行
      let pointsLeaderboard = { projects: [] };
      try {
        pointsLeaderboard = await aimAPI.GetPointsLeaderboard();
        console.log('积分排行榜', pointsLeaderboard);
      } catch (error) {
        console.error(error);
      }

      const newProjects = [];

      for (let index = 0; index < projects.length; index++) {
        const project = projects[index];

        const pointsLeaderboardItem = pointsLeaderboard.projects.find((item: any) => item.id == project.id);
        const points = pointsLeaderboardItem?.total_score || 0;

        const newProject = {
          index: index,
          id: project.id,
          projectName: ethers.decodeBytes32String(project.id),
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
          // console.log(newProject.projectName, coinDetailsRes);

          const coinPrice = await coingeckoAPI.getCoinPrice('base', coinDetailsRes.contract_address);
          // console.log(newProject.projectName, coinPrice);

          newProject.coinPriceUsd = coinPrice[coinDetailsRes.contract_address].usd;
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

  /**获取质押记录 */
  getStakeRecords: async (address: string) => {
    try {
      const data: any = await subgraphsAPI.getStakeRecords(address);
      console.log('EVM 原始质押记录:', data);

      if (!data.stakes) return [];

      const records = [];
      for (const stake of data.stakes) {
        // status: 0=Active, 1=Unstaked, 2=EmergencyUnstaked
        // status: "Active"
        if (stake.status != 'Active') continue;

        const projectId = stake.project.id;
        const projectName = ethers.decodeBytes32String(projectId);
        const stakedAt = Number(stake.stakedAt) * 1000;
        const unlockedAt = Number(stake.unlockedAt) * 1000;
        const now = new Date().getTime();
        const canUnstake = now >= unlockedAt;

        records.push({
          id: Number(stake.stakeId),
          userId: stake.user.id,
          projectId,
          projectName,
          amount: Number(ethers.formatEther(stake.amount)),
          duration: Number(stake.duration) / 86400,
          stakedAt,
          unlockedAt,
          canUnstake
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
      console.log('解质押ID:', record.id, '数量:', record.amount);

      const tx = await evmStakingContract.unstake(record.id);
      await tx.wait();
      return tx;
    } catch (error) {
      throw error;
    }
  },

  /**紧急解质押 */
  emergencyUnstake: async (evmStakingContract: any, record: any) => {
    try {
      console.log('紧急解质押ID:', record.id, '数量:', record.amount);

      const tx = await evmStakingContract.emergencyUnstake(record.id);
      await tx.wait();
      return tx;
    } catch (error) {
      throw error;
    }
  },

  /**获取管理员列表 */
  getAdminList: async (evmStakingContract: any) => {
    try {
      const adminList = await evmStakingContract.getRoleMembers(
        '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08'
      );
      console.log('✅ 管理员列表:', adminList);
      return adminList;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  /**添加管理员 */
  addAdmin: async (evmStakingContract: any, adminAddress: string) => {
    try {
      const tx = await evmStakingContract.grantRole(
        '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08',
        adminAddress
      );
      await tx.wait();
      return tx;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  /**删除管理员 */
  removeAdmin: async (evmStakingContract: any, adminAddress: string) => {
    try {
      const tx = await evmStakingContract.revokeRole(
        '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08',
        adminAddress
      );
      await tx.wait();
      return tx;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  /**创建项目 */
  registerProject: async (evmStakingContract: any, projectId: string, stakingTokenAddress: string) => {
    try {
      const tx = await evmStakingContract.registerProject(projectId, stakingTokenAddress);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  /**删除项目 */
  unregisterProject: async (evmStakingContract: any, projectId: string) => {
    try {
      const tx = await evmStakingContract.unregisterProject(projectId);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error(error);
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

  /**设置手续费地址 */
  setFeeWallet: async (evmStakingContract: any, feeWallet: string) => {
    try {
      const tx = await evmStakingContract.setFeeWallet(feeWallet);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  /**设置质押手续费 */
  setUnstakeFeeRate: async (evmStakingContract: any, unstakeFeeBps: number) => {
    try {
      const tx = await evmStakingContract.setUnstakeFeeRate(unstakeFeeBps * 100);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  /**设置紧急赎回手续费 */
  setEmergencyUnstakeFeeRate: async (evmStakingContract: any, emergencyUnstakeFeeBps: number) => {
    try {
      const tx = await evmStakingContract.setEmergencyUnstakeFeeRate(emergencyUnstakeFeeBps * 100);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error(error);
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
  },

  /**设置质押时长 */
  addDuration: async (evmStakingContract: any, duration: any) => {
    try {
      const tx = await evmStakingContract.addDurationOption(duration);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  /**删除质押时长 */
  removeDuration: async (evmStakingContract: any, duration: any) => {
    try {
      const tx = await evmStakingContract.removeDurationOption(duration);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
};
