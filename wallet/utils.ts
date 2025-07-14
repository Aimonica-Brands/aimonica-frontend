import { ethers } from 'ethers';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { aimAPI, subgraphsAPI } from '@/pages/api/aim';
import { coingeckoAPI } from '@/pages/api/coingecko';

export const timeOutNumber = 8000;

/**质押时长 */
export const durationDays = [1, 7, 14, 30];

export const getRewardPoints = (duration: number) => {
  switch (duration) {
    case 1:
      return 1;
    case 7:
      return 1;
    case 14:
      return 3;
    case 30:
      return 8;
  }
};

/**获取积分 */
const getPoints = async (pointsLeaderboardProjects: any, id: any) => {
  if (pointsLeaderboardProjects.length == 0) return 0;
  const pointsLeaderboardItem = pointsLeaderboardProjects.find((item: any) => item.id == id);
  console.log('getPoints', pointsLeaderboardItem);
  return Number(pointsLeaderboardItem?.total_score);
};

export const evmUtils = {
  /**获取项目信息 */
  getProjects: async () => {
    try {
      const projectsRes: any = await subgraphsAPI.getProjects();

      const projects = projectsRes.projects.filter((item: any) => item.registered);
      console.log('EVM 项目:', projects);

      // 获取积分排行榜，如果失败则使用空数据继续执行
      let pointsLeaderboardProjects = [];
      try {
        const leaderboardRes = await aimAPI.GetPointsLeaderboard();
        pointsLeaderboardProjects = leaderboardRes.projects;
        console.log('积分排行榜', pointsLeaderboardProjects);
      } catch (error) {
        console.error('获取积分排行榜失败，使用默认值继续执行:', error);
      }

      const newProjects = [];

      for (let index = 0; index < projects.length; index++) {
        const project = projects[index];

        const points = await getPoints(pointsLeaderboardProjects, project.id);

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
          console.log(newProject.projectName, coinDetailsRes);

          const coinPrice = await coingeckoAPI.getCoinPrice('base', coinDetailsRes.contract_address);
          console.log(newProject.projectName, coinPrice);

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

        console.log('EVM 项目:', sortedProjects);
        return sortedProjects;
      }

      return [];
    } catch (error) {
      console.error('获取 EVM 项目错误:', error);
      return [];
    }
  },

  /**获取质押记录 */
  getStakeRecords: async (address: string) => {
    try {
      const data: any = await subgraphsAPI.getStakeRecords(address);
      console.log('EVM 质押记录:', data);

      if (!data.stakes) return [];

      const records = [];
      for (const stake of data.stakes) {
        // status: 0=Active, 1=Unstaked, 2=EmergencyUnstaked
        // status: "Active"
        if (stake.status != 'Active') continue;

        const project_id = stake.project.id;
        const projectName = ethers.decodeBytes32String(project_id);

        const staked_at = Number(stake.stakedAt) * 1000;
        const unlocked_at = Number(stake.unlockedAt) * 1000;
        const now = new Date().getTime();
        const canUnstake = now >= unlocked_at;

        records.push({
          id: Number(stake.stakeId),
          user_id: stake.user.id,
          project_id,
          projectName,
          amount: Number(ethers.formatEther(stake.amount)),
          duration: Number(stake.duration) / 86400,
          staked_at,
          unlocked_at,
          canUnstake
        });
      }
      const sortedRecords = records.sort((a: any, b: any) => b.staked_at - a.staked_at);
      console.log('EVM 质押记录:', sortedRecords);

      return sortedRecords;
    } catch (error) {
      console.error('获取 EVM 质押记录错误:', error);
      return [];
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
      console.log(
        '项目ID:',
        ethers.decodeBytes32String(projectId),
        '质押数量:',
        stakeAmount,
        '质押时长:',
        stakeDuration
      );

      const amount = ethers.parseEther(stakeAmount);
      const tx = await evmStakingContract.stake(amount, stakeDuration, projectId);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error('质押失败:', error);
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
      console.error('解质押失败:', error);
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
      console.error('紧急解质押失败:', error);
      throw error;
    }
  }
};

/**获取项目配置 PDA */
const getProjectConfigPda = async (solanaProgram: any, projectId: number) => {
  const [projectConfigPda] = await PublicKey.findProgramAddress(
    [Buffer.from('project'), new anchor.BN(projectId).toArrayLike(Buffer, 'le', 8)],
    solanaProgram.programId
  );
  return projectConfigPda;
};

/**获取质押信息 PDA */
const getstakeInfoPda = async (solanaProgram: any, projectConfigPda: any, userPublicKey: any, stakeId: number) => {
  const [stakeInfoPda] = await PublicKey.findProgramAddress(
    [
      Buffer.from('stake'),
      projectConfigPda.toBuffer(),
      userPublicKey.toBuffer(),
      new anchor.BN(stakeId).toArrayLike(Buffer, 'le', 8)
    ],
    solanaProgram.programId
  );
  return stakeInfoPda;
};

/**获取质押授权 PDA */
const getVaultAuthorityPda = async (solanaProgram: any, projectId: number) => {
  const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
    [Buffer.from('vault-authority'), new anchor.BN(projectId).toArrayLike(Buffer, 'le', 8)],
    solanaProgram.programId
  );
  return vaultAuthorityPda;
};

/**获取用户代币账户 */
const getUserTokenAccount = async (solanaProgram: any, projectConfig: any, userPublicKey: any) => {
  const tokenAccounts = await solanaProgram.provider.connection.getParsedTokenAccountsByOwner(userPublicKey, {
    mint: projectConfig.tokenMint
  });
  const userTokenAccount =
    tokenAccounts.value.length > 0
      ? tokenAccounts.value[0].pubkey
      : getAssociatedTokenAddressSync(projectConfig.tokenMint, userPublicKey);

  return userTokenAccount;
};

/**获取项目用户数量 */
const getProjectUserCount = async (solanaProgram: any, projectConfigPda: any) => {
  try {
    const projectFilter = {
      memcmp: { offset: 40, bytes: projectConfigPda.toBase58() }
    };
    const allStakes = await solanaProgram.account.userStakeInfo.all([projectFilter]);
    const activeUsers = new Set();
    for (const stake of allStakes) {
      if (stake.account.isStaked) {
        activeUsers.add(stake.account.user.toBase58());
      }
    }
    const userCount = activeUsers.size;
    return userCount;
  } catch (error) {
    return 0;
  }
};

/**获取质押总量 */
const getProjectTotalStaked = async (solanaProgram: any, projectId: any) => {
  try {
    const [vaultPda] = await PublicKey.findProgramAddress(
      [Buffer.from('vault'), new anchor.BN(projectId).toArrayLike(Buffer, 'le', 8)],
      solanaProgram.programId
    );
    const vaultAccount = await solanaProgram.provider.connection.getTokenAccountBalance(vaultPda);
    const totalStaked = vaultAccount.value.uiAmount || 0;
    return totalStaked;
  } catch (error) {
    return 0;
  }
};

export const solanaUtils = {
  /**获取当前平台所有项目信息 */
  getProjects: async (solanaProgram: any) => {
    try {
      // 检查平台
      const [platformConfigPda] = await PublicKey.findProgramAddress(
        [Buffer.from('platform')],
        solanaProgram.programId
      );
      const platformConfig = await solanaProgram.account.platformConfig.fetch(platformConfigPda);

      if (!platformConfig) {
        console.log('平台未初始化');
        return [];
      }

      const projectCount = platformConfig.projectCount.toNumber();
      console.log('Solana 项目:', projectCount);
      if (projectCount <= 0) return [];

      // 获取积分排行榜，如果失败则使用空数据继续执行
      let pointsLeaderboardProjects = [];
      try {
        const leaderboardRes = await aimAPI.GetPointsLeaderboard();
        pointsLeaderboardProjects = leaderboardRes.projects;
        console.log('积分排行榜', pointsLeaderboardProjects);
      } catch (error) {
        console.error('获取积分排行榜失败，使用默认值继续执行:', error);
      }

      const newProjects = [];

      for (let i = 0; i < projectCount; i++) {
        try {
          const projectConfigPda = await getProjectConfigPda(solanaProgram, i);
          const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);
          console.log(`项目 ${i} 配置:`, projectConfig);
          const totalStaked = await getProjectTotalStaked(solanaProgram, i);
          const userCount = await getProjectUserCount(solanaProgram, projectConfigPda);
          const points = await getPoints(pointsLeaderboardProjects, i);

          const newProject = {
            index: i,
            id: i.toString(),
            projectName: projectConfig.name,
            stakingToken: projectConfig.tokenMint.toBase58(),
            createdAt: projectConfig.projectId.toNumber(),
            allowedDurations: projectConfig.allowedDurations,
            totalStaked: totalStaked,
            userCount: userCount,
            points,
            platformId: 'solana',
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
            const coinDetailsRes = await coingeckoAPI.getCoinByContract(newProject.platformId, newProject.stakingToken);
            console.log(newProject.projectName, coinDetailsRes);

            const coinPrice = await coingeckoAPI.getCoinPrice(newProject.platformId, coinDetailsRes.contract_address);
            console.log(newProject.projectName, coinPrice);

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
        } catch (error) {
          console.error(`获取项目 ${i} 信息失败:`, error);
        }
      }

      if (newProjects.length > 0) {
        const sortedProjects = newProjects
          .sort((a: any, b: any) => b.tvl - a.tvl)
          .map((item: any, index: number) => {
            return { ...item, rank: index + 1 };
          });

        console.log('Solana 项目:', sortedProjects);
        return sortedProjects;
      }

      return [];
    } catch (error) {
      console.error('获取 Solana 项目错误:', error);
      return [];
    }
  },

  /**获取用户所有质押记录 */
  getStakeRecords: async (solanaProgram: any) => {
    try {
      const userPublicKey = solanaProgram.provider.wallet.publicKey;

      const userFilter = {
        memcmp: { offset: 8, bytes: userPublicKey.toBase58() }
      };

      const userStakes = await solanaProgram.account.userStakeInfo.all([userFilter]);
      console.log('Solana 质押记录:', userStakes);

      if (!userStakes) return [];

      const records = [];

      for (const stake of userStakes) {
        try {
          const account = stake.account;
          // status: 0=Active, 1=Unstaked, 2=EmergencyUnstaked
          // status: "Active"
          if (!account.isStaked) continue;

          const projectId = account.projectId.toNumber();

          const projectConfigPda = await getProjectConfigPda(solanaProgram, projectId);

          const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);
          const projectName = projectConfig.name;
          const unstakeFeeBps = projectConfig.unstakeFeeBps;
          const emergencyUnstakeFeeBps = projectConfig.emergencyUnstakeFeeBps;

          const staked_at = account.stakeTimestamp.toNumber() * 1000;
          const unlocked_at = staked_at + account.durationDays * 86400 * 1000;
          const now = new Date().getTime();
          const canUnstake = now >= unlocked_at;

          records.push({
            id: account.stakeId.toNumber(),
            user_id: account.user.toBase58(),
            project_id: projectId,
            projectName,
            amount: account.amount.toNumber() / 1e6,
            duration: account.durationDays,
            staked_at,
            unlocked_at,
            canUnstake,
            unstakeFeeRate: unstakeFeeBps / 100,
            emergencyUnstakeFeeRate: emergencyUnstakeFeeBps / 100
          });
        } catch (error) {
          console.error('处理质押记录失败:', error);
          // 继续处理其他记录
        }
      }

      const sortedRecords = records.sort((a, b) => b.staked_at - a.staked_at);
      console.log('Solana 质押记录:', sortedRecords);

      return sortedRecords;
    } catch (error) {
      console.error('获取 Solana 质押记录错误:', error);
      return [];
    }
  },

  /**获取下一个质押ID */
  getNextStakeId: async (solanaProgram: any, projectId: number) => {
    try {
      const userPublicKey = solanaProgram.provider.wallet.publicKey;

      const userFilter = {
        memcmp: { offset: 8, bytes: userPublicKey.toBase58() }
      };

      const userStakes = await solanaProgram.account.userStakeInfo.all([userFilter]);

      if (userStakes.length === 0) return 0;

      const records = userStakes.map((stake) => {
        const stakeId = stake.account.stakeId.toNumber();
        return { stakeId };
      });

      const sortedRecords = records.sort((a, b) => b.stakeId - a.stakeId);
      const nextStakeId = sortedRecords[0].stakeId + 1;
      console.log('下一个质押ID:', nextStakeId);

      return nextStakeId;
    } catch (error) {
      console.error('获取下一个质押ID失败:', error);
      throw error;
    }
  },

  /**获取代币余额 */
  getTokenBalance: async (solanaProgram: any, projectId: number) => {
    try {
      const projectConfigPda = await getProjectConfigPda(solanaProgram, projectId);
      const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);
      const userPublicKey = solanaProgram.provider.wallet.publicKey;
      const userTokenAccount = await getUserTokenAccount(solanaProgram, projectConfig, userPublicKey);

      try {
        const tokenAccount = await solanaProgram.provider.connection.getTokenAccountBalance(userTokenAccount);
        const balance = tokenAccount.value.uiAmount || 0;
        console.log('获取到余额:', balance);
        return balance;
      } catch (error) {
        // 如果代币账户不存在，返回 0 余额
        if (error.message && error.message.includes('could not find account')) {
          console.log('代币账户不存在，返回 0 余额');
          console.log(error.message);
          return 0;
        }
        // 其他错误则抛出
        console.log(error.message);
        throw error;
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  /**质押 */
  stake: async (solanaProgram: any, stakeId: number, stakeAmount: number, stakeDuration: number, projectId: number) => {
    try {
      console.log('项目ID:', projectId, '质押ID:', stakeId, '数量:', stakeAmount);

      const projectConfigPda = await getProjectConfigPda(solanaProgram, projectId);
      const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);
      const userPublicKey = solanaProgram.provider.wallet.publicKey;
      const userTokenAccount = await getUserTokenAccount(solanaProgram, projectConfig, userPublicKey);
      const amountToStake = new anchor.BN(stakeAmount * 1e6);
      const stakeIdBN = new anchor.BN(stakeId);
      const stakeInfoPda = await getstakeInfoPda(solanaProgram, projectConfigPda, userPublicKey, stakeId);

      const stakeAccounts = {
        projectConfig: projectConfigPda,
        stakeInfo: stakeInfoPda,
        user: userPublicKey,
        userTokenAccount: userTokenAccount,
        vault: projectConfig.vault,
        systemProgram: SystemProgram.programId,
        tokenProgram: projectConfig.tokenProgram
      };

      console.log(
        '质押账户:',
        JSON.stringify(stakeAccounts, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2)
      );

      const tx = await solanaProgram.methods
        .stake(amountToStake, stakeDuration, stakeIdBN)
        .accounts(stakeAccounts)
        .rpc();

      return tx;
    } catch (error) {
      console.error('质押失败:', error);
      throw error;
    }
  },

  /**解质押 */
  unstake: async (solanaProgram: any, record: any, projectId: number) => {
    try {
      console.log('项目ID:', projectId, '解质押ID:', record.id, '数量:', record.amount);

      const vaultAuthorityPda = await getVaultAuthorityPda(solanaProgram, projectId);
      const projectConfigPda = await getProjectConfigPda(solanaProgram, projectId);
      const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);
      const userPublicKey = solanaProgram.provider.wallet.publicKey;
      const userTokenAccount = await getUserTokenAccount(solanaProgram, projectConfig, userPublicKey);
      const feeWalletTokenAccount = getAssociatedTokenAddressSync(projectConfig.tokenMint, projectConfig.feeWallet);
      const stakeInfoPda = await getstakeInfoPda(solanaProgram, projectConfigPda, userPublicKey, record.id);

      const unstakeAccounts = {
        projectConfig: projectConfigPda,
        stakeInfo: stakeInfoPda,
        user: userPublicKey,
        userTokenAccount: userTokenAccount,
        vault: projectConfig.vault,
        vaultAuthority: vaultAuthorityPda,
        feeWallet: feeWalletTokenAccount,
        tokenProgram: projectConfig.tokenProgram
      };

      console.log(
        '解质押账户:',
        JSON.stringify(unstakeAccounts, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2)
      );

      const tx = await solanaProgram.methods.unstake(new anchor.BN(record.id)).accounts(unstakeAccounts).rpc();

      return tx;
    } catch (error) {
      console.error('解质押失败:', error);
      throw error;
    }
  },

  /**紧急解质押 */
  emergencyUnstake: async (solanaProgram: any, record: any, projectId: number) => {
    try {
      console.log('项目ID:', projectId, '紧急解质押ID:', record.id, '数量:', record.amount);

      const vaultAuthorityPda = await getVaultAuthorityPda(solanaProgram, projectId);
      const projectConfigPda = await getProjectConfigPda(solanaProgram, projectId);
      const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);
      const userPublicKey = solanaProgram.provider.wallet.publicKey;
      const userTokenAccount = await getUserTokenAccount(solanaProgram, projectConfig, userPublicKey);
      const feeWalletTokenAccount = getAssociatedTokenAddressSync(projectConfig.tokenMint, projectConfig.feeWallet);
      const stakeInfoPda = await getstakeInfoPda(solanaProgram, projectConfigPda, userPublicKey, record.id);

      const emergencyUnstakeAccounts = {
        projectConfig: projectConfigPda,
        stakeInfo: stakeInfoPda,
        user: userPublicKey,
        userTokenAccount: userTokenAccount,
        vault: projectConfig.vault,
        vaultAuthority: vaultAuthorityPda,
        feeWallet: feeWalletTokenAccount,
        tokenProgram: projectConfig.tokenProgram
      };

      console.log(
        '紧急解质押账户:',
        JSON.stringify(emergencyUnstakeAccounts, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2)
      );

      const tx = await solanaProgram.methods
        .emergencyUnstake(new anchor.BN(record.id))
        .accounts(emergencyUnstakeAccounts)
        .rpc();

      return tx;
    } catch (error) {
      console.error('紧急解质押失败:', error);
      throw error;
    }
  }
};
