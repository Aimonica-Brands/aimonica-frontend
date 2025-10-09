import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { aimonicaAPI } from '@/pages/api/aimonica';
import { coingeckoAPI } from '@/pages/api/coingecko';
import { getRewardPoints } from './utils';

/**获取项目配置 PDA */
export const getProjectConfigPda = async (solanaProgram: any, projectId: number) => {
  const [projectConfigPda] = await PublicKey.findProgramAddress(
    [Buffer.from('project'), new anchor.BN(projectId).toArrayLike(Buffer, 'le', 8)],
    solanaProgram.programId,
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
      new anchor.BN(stakeId).toArrayLike(Buffer, 'le', 8),
    ],
    solanaProgram.programId,
  );
  return stakeInfoPda;
};

/**获取解除质押信息 PDA */
const getUnstakeInfoPda = async (solanaProgram: any, stakeInfoPda: any) => {
  const [unstakeInfoPda] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('unstake'), stakeInfoPda.toBuffer()],
    solanaProgram.programId,
  );
  return unstakeInfoPda;
};

/**获取质押授权 PDA */
const getVaultAuthorityPda = async (solanaProgram: any, projectId: number) => {
  const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
    [Buffer.from('vault-authority'), new anchor.BN(projectId).toArrayLike(Buffer, 'le', 8)],
    solanaProgram.programId,
  );
  return vaultAuthorityPda;
};

/**获取用户代币账户 */
const getUserTokenAccount = async (solanaProgram: any, projectConfig: any, userPublicKey: any) => {
  const tokenAccounts = await solanaProgram.provider.connection.getParsedTokenAccountsByOwner(userPublicKey, {
    mint: projectConfig.tokenMint,
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
      memcmp: { offset: 40, bytes: projectConfigPda.toBase58() },
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
      solanaProgram.programId,
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
  getProjects: async (solanaProgram: any, onProjectUpdate?: (projects: any[]) => void) => {
    try {
      // 检查平台
      const [platformConfigPda] = await PublicKey.findProgramAddress(
        [Buffer.from('platform')],
        solanaProgram.programId,
      );
      const platformConfig = await solanaProgram.account.platformConfig.fetch(platformConfigPda);

      if (!platformConfig) {
        console.log('Platform not initialized');
        return [];
      }

      const projectCount = platformConfig.projectCount.toNumber();
      console.log('Solana project count:', projectCount);
      if (projectCount <= 0) return [];

      let leaderboard = [];
      try {
        const pointsLeaderboard = await aimonicaAPI.GetPointsLeaderboard();
        leaderboard = pointsLeaderboard.projects;
      } catch (error) {
        console.error(error);
      }

      // 并行异步获取所有项目的基本信息
      const basicProjectPromises = Array.from({ length: projectCount }, async (_, i) => {
        console.log(`Fetching basic info for project ${i + 1}/${projectCount}...`);

        try {
          const projectConfigPda = await getProjectConfigPda(solanaProgram, i);
          const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);

          const [totalStaked, userCount] = await Promise.all([
            getProjectTotalStaked(solanaProgram, i),
            getProjectUserCount(solanaProgram, projectConfigPda),
          ]);

          const leaderboardItem = leaderboard.find((item: any) => item.id == i);
          const points = Number(leaderboardItem?.total_score) || 0;

          return {
            id: i.toString(),
            projectName: projectConfig.name,
            stakingToken: projectConfig.tokenMint.toBase58(),
            feeWallet: projectConfig.feeWallet.toBase58(),
            unstakeFeeRate: projectConfig.unstakeFeeBps / 100,
            emergencyUnstakeFeeRate: projectConfig.emergencyUnstakeFeeBps / 100,
            createdAt: projectConfig.projectId.toNumber(),
            allowedDurations: projectConfig.allowedDurations,
            totalStaked: totalStaked,
            userCount: userCount,
            points,
            platformId: 'solana',
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
            isLoading: true,
            shouldRemove: false,
          };
        } catch (error) {
          console.error(`Failed to get project ${i} basic information:`, error);
          return null;
        }
      });

      const basicProjectsResults = await Promise.all(basicProjectPromises);
      const basicProjects = basicProjectsResults.filter((project) => project !== null);

      // 立即返回基本信息
      console.log('Solana basic project records:', basicProjects);
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

      // 创建所有的异步请求，并标记失败的项目
      const fetchPromises = detailedProjects.map(async (currentProject: any) => {
        console.log(`Fetching details for project ${currentProject.projectName}...`);

        try {
          const coinDetailsRes = await coingeckoAPI.getCoinByContract(
            currentProject.platformId,
            currentProject.stakingToken,
          );
          console.log(currentProject.projectName, coinDetailsRes);

          const coinPrice = await coingeckoAPI.getCoinPrice(currentProject.platformId, coinDetailsRes.contract_address);
          currentProject.coinPriceUsd = coinPrice[coinDetailsRes.contract_address].usd;
          console.log(currentProject.projectName, currentProject.coinPriceUsd);

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

        // 每获取一个项目的详细信息就更新一次（过滤掉需要删除的项目）
        if (onProjectUpdate) {
          const validProjects = detailedProjects.filter((p) => !p.shouldRemove);
          const sortedProjects = validProjects
            .sort((a: any, b: any) => b.tvl - a.tvl)
            .map((item: any, index: number) => {
              return { ...item, rank: index + 1 };
            });
          onProjectUpdate(sortedProjects);
        }
      });

      // 等待所有请求完成
      await Promise.all(fetchPromises);

      // 过滤掉获取失败的项目
      const validProjects = detailedProjects.filter((project) => !project.shouldRemove);

      // 最终返回完整的详细信息
      if (validProjects.length > 0) {
        const sortedProjects = validProjects
          .sort((a: any, b: any) => b.tvl - a.tvl)
          .map((item: any, index: number) => {
            return { ...item, rank: index + 1 };
          });

        console.log('Solana project records (complete):', sortedProjects);
        return sortedProjects;
      }

      return [];
    } catch (error) {
      throw error;
    }
  },

  /**获取用户所有质押记录 */
  getStakeRecords: async (solanaProgram: any) => {
    try {
      const userPublicKey = solanaProgram.provider.wallet.publicKey;

      const userFilter = {
        memcmp: { offset: 8, bytes: userPublicKey.toBase58() },
      };

      const userStakes = await solanaProgram.account.userStakeInfo.all([userFilter]);

      // console.log(
      //   'Solana 原始质押记录:',
      //   JSON.stringify(userStakes, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2)
      // );

      if (!userStakes) return [];

      const records = [];

      for (const stake of userStakes) {
        try {
          if (!stake.account.isStaked) continue;

          const account = stake.account;
          const projectId = account.projectId.toNumber();
          const projectConfigPda = await getProjectConfigPda(solanaProgram, projectId);
          const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);
          const projectName = projectConfig.name;
          const unstakeFeeRate = projectConfig.unstakeFeeBps / 100;
          const emergencyUnstakeFeeRate = projectConfig.emergencyUnstakeFeeBps / 100;
          const amount = account.amount.toNumber() / 1e6;
          const duration = account.durationDays;
          const points = amount * getRewardPoints(duration);

          const stakedAt = account.stakeTimestamp.toNumber() * 1000;
          const unlockedAt = stakedAt + account.durationDays * 86400 * 1000;
          const now = new Date().getTime();
          const canUnstake = now >= unlockedAt;

          records.push({
            projectId,
            projectName,
            stakeId: account.stakeId.toNumber(),
            userId: account.user.toBase58(),
            amount,
            duration,
            stakedAt,
            unlockedAt,
            canUnstake,
            points,
            unstakeFeeRate,
            emergencyUnstakeFeeRate,
          });
        } catch (error) {
          console.error(error);
        }
      }

      const sortedRecords = records.sort((a, b) => b.stakedAt - a.stakedAt);
      console.log('Solana staking records:', sortedRecords);

      return sortedRecords;
    } catch (error) {
      throw error;
    }
  },

  /**获取用户所有解除质押记录 */
  getUnstakeRecords: async (solanaProgram: any) => {
    try {
      const userPublicKey = solanaProgram.provider.wallet.publicKey;

      const userFilter = {
        memcmp: { offset: 8, bytes: userPublicKey.toBase58() },
      };

      const userStakes = await solanaProgram.account.userStakeInfo.all([userFilter]);
      const userUnstakes = await solanaProgram.account.unstakeInfo.all([userFilter]);
      const unstakes = userUnstakes.map((unstake) => {
        const stake = userStakes.find(
          (stake) => stake.account.stakeId.toNumber() === unstake.account.stakeId.toNumber(),
        );
        unstake.account.durationDays = stake.account.durationDays;
        return unstake;
      });

      // console.log(
      //   'Solana 原始解除质押记录:',
      //   JSON.stringify(unstakes, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2)
      // );

      if (!unstakes) return [];

      const records = [];

      for (const stake of unstakes) {
        try {
          const account = stake.account;
          const projectId = account.projectId.toNumber();
          const projectConfigPda = await getProjectConfigPda(solanaProgram, projectId);
          const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);
          const projectName = projectConfig.name;
          const unstakeFeeRate = projectConfig.unstakeFeeBps / 100;
          const emergencyUnstakeFeeRate = projectConfig.emergencyUnstakeFeeBps / 100;
          const amount = account.amount.toNumber() / 1e6;
          const duration = account.durationDays;

          const unstakeAt = account.unstakeTimestamp.toNumber() * 1000;

          let points = null;
          let status = 'Unknown';
          if (account.status.unstaked) {
            status = 'Unstaked';
            points = amount * getRewardPoints(duration);
          } else if (account.status.emergencyUnstaked) {
            status = 'EmergencyUnstaked';
            points = '-';
          }

          records.push({
            projectId,
            projectName,
            stakeId: account.stakeId.toNumber(),
            userId: account.user.toBase58(),
            amount,
            duration,
            status,
            unstakeAt,
            points,
            unstakeFeeRate,
            emergencyUnstakeFeeRate,
          });
        } catch (error) {
          console.error(error);
        }
      }

      const sortedRecords = records.sort((a, b) => b.unstakeAt - a.unstakeAt);
      console.log('Solana unstaking records:', sortedRecords);

      return sortedRecords;
    } catch (error) {
      throw error;
    }
  },

  /**获取下一个质押ID */
  getNextStakeId: async (solanaProgram: any, projectId: number) => {
    try {
      const userPublicKey = solanaProgram.provider.wallet.publicKey;

      const userFilter = {
        memcmp: { offset: 8, bytes: userPublicKey.toBase58() },
      };

      const userStakes = await solanaProgram.account.userStakeInfo.all([userFilter]);

      if (userStakes.length === 0) return 0;

      const records = userStakes.map((stake) => {
        const stakeId = stake.account.stakeId.toNumber();
        return { stakeId };
      });

      const sortedRecords = records.sort((a, b) => b.stakeId - a.stakeId);
      const nextStakeId = sortedRecords[0].stakeId + 1;
      console.log('Next stake ID:', nextStakeId);

      return nextStakeId;
    } catch (error) {
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
        console.log('Balance retrieved:', balance);
        return balance;
      } catch (error) {
        // 如果代币账户不存在，返回 0 余额
        if (error.message && error.message.includes('could not find account')) {
          console.log('Token account does not exist, returning 0 balance');
          return 0;
        }
        throw error;
      }
    } catch (error) {
      throw error;
    }
  },

  /**质押 */
  stake: async (solanaProgram: any, stakeId: number, stakeAmount: number, stakeDuration: number, projectId: number) => {
    try {
      console.log('Project ID:', projectId, 'Stake ID:', stakeId, 'Amount:', stakeAmount);

      const projectConfigPda = await getProjectConfigPda(solanaProgram, projectId);
      const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);
      const userPublicKey = solanaProgram.provider.wallet.publicKey;
      const userTokenAccount = await getUserTokenAccount(solanaProgram, projectConfig, userPublicKey);
      const amountToStake = new anchor.BN(stakeAmount * 1e6);
      const stakeIdBN = new anchor.BN(stakeId);
      const stakeInfoPda = await getstakeInfoPda(solanaProgram, projectConfigPda, userPublicKey, stakeId);
      const unstakeInfoPda = await getUnstakeInfoPda(solanaProgram, stakeInfoPda);

      const stakeAccounts = {
        projectConfig: projectConfigPda,
        stakeInfo: stakeInfoPda,
        unstakeInfo: unstakeInfoPda,
        user: userPublicKey,
        userTokenAccount: userTokenAccount,
        vault: projectConfig.vault,
        systemProgram: SystemProgram.programId,
        tokenProgram: projectConfig.tokenProgram,
      };

      const tx = await solanaProgram.methods
        .stake(amountToStake, stakeDuration, stakeIdBN)
        .accounts(stakeAccounts)
        .rpc();

      return tx;
    } catch (error) {
      throw error;
    }
  },

  /**解质押 */
  unstake: async (solanaProgram: any, record: any, projectId: number) => {
    try {
      console.log('Project ID:', projectId, 'Unstake ID:', record.stakeId, 'Amount:', record.amount);

      const vaultAuthorityPda = await getVaultAuthorityPda(solanaProgram, projectId);
      const projectConfigPda = await getProjectConfigPda(solanaProgram, projectId);
      const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);
      const userPublicKey = solanaProgram.provider.wallet.publicKey;
      const userTokenAccount = await getUserTokenAccount(solanaProgram, projectConfig, userPublicKey);
      const feeWalletTokenAccount = getAssociatedTokenAddressSync(projectConfig.tokenMint, projectConfig.feeWallet);
      const stakeInfoPda = await getstakeInfoPda(solanaProgram, projectConfigPda, userPublicKey, record.stakeId);
      const unstakeInfoPda = await getUnstakeInfoPda(solanaProgram, stakeInfoPda);

      const unstakeAccounts = {
        projectConfig: projectConfigPda,
        stakeInfo: stakeInfoPda,
        unstakeInfo: unstakeInfoPda,
        user: userPublicKey,
        userTokenAccount: userTokenAccount,
        vault: projectConfig.vault,
        vaultAuthority: vaultAuthorityPda,
        feeWallet: feeWalletTokenAccount,
        tokenProgram: projectConfig.tokenProgram,
      };

      const tx = await solanaProgram.methods.unstake(new anchor.BN(record.stakeId)).accounts(unstakeAccounts).rpc();

      return tx;
    } catch (error) {
      throw error;
    }
  },

  /**紧急解质押 */
  emergencyUnstake: async (solanaProgram: any, record: any, projectId: number) => {
    try {
      console.log('Project ID:', projectId, 'Emergency unstake ID:', record.stakeId, 'Amount:', record.amount);

      const vaultAuthorityPda = await getVaultAuthorityPda(solanaProgram, projectId);
      const projectConfigPda = await getProjectConfigPda(solanaProgram, projectId);
      const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);
      const userPublicKey = solanaProgram.provider.wallet.publicKey;
      const userTokenAccount = await getUserTokenAccount(solanaProgram, projectConfig, userPublicKey);
      const feeWalletTokenAccount = getAssociatedTokenAddressSync(projectConfig.tokenMint, projectConfig.feeWallet);
      const stakeInfoPda = await getstakeInfoPda(solanaProgram, projectConfigPda, userPublicKey, record.stakeId);
      const unstakeInfoPda = await getUnstakeInfoPda(solanaProgram, stakeInfoPda);

      const emergencyUnstakeAccounts = {
        projectConfig: projectConfigPda,
        stakeInfo: stakeInfoPda,
        unstakeInfo: unstakeInfoPda,
        user: userPublicKey,
        userTokenAccount: userTokenAccount,
        vault: projectConfig.vault,
        vaultAuthority: vaultAuthorityPda,
        feeWallet: feeWalletTokenAccount,
        tokenProgram: projectConfig.tokenProgram,
      };

      const tx = await solanaProgram.methods
        .emergencyUnstake(new anchor.BN(record.stakeId))
        .accounts(emergencyUnstakeAccounts)
        .rpc();

      return tx;
    } catch (error) {
      throw error;
    }
  },
};
