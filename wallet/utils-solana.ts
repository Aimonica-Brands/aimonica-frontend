import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { aimonicaAPI } from '@/pages/api/aimonica';
import { coingeckoAPI } from '@/pages/api/coingecko';

/**获取项目配置 PDA */
export const getProjectConfigPda = async (solanaProgram: any, projectId: number) => {
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
      console.log('Solana 项目数量:', projectCount);
      if (projectCount <= 0) return [];

      let leaderboard = [];
      try {
        const pointsLeaderboard = await aimonicaAPI.GetPointsLeaderboard();
        leaderboard = pointsLeaderboard.projects;
      } catch (error) {
        console.error(error);
      }

      const newProjects = [];

      for (let i = 0; i < projectCount; i++) {
        try {
          const projectConfigPda = await getProjectConfigPda(solanaProgram, i);
          const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);
          console.log(
            `${projectConfig.name} 配置:`,
            JSON.stringify(projectConfig, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2)
          );

          const totalStaked = await getProjectTotalStaked(solanaProgram, i);
          const userCount = await getProjectUserCount(solanaProgram, projectConfigPda);
          const leaderboardItem = leaderboard.find((item: any) => item.id == i);
          console.log(`${projectConfig.name} 积分`, leaderboardItem);
          const points = Number(leaderboardItem?.total_score) || 0;

          const newProject = {
            index: i,
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
            // console.log(newProject.projectName, coinDetailsRes);

            const coinPrice = await coingeckoAPI.getCoinPrice(newProject.platformId, coinDetailsRes.contract_address);
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

        console.log('Solana 项目记录:', sortedProjects);
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
        memcmp: { offset: 8, bytes: userPublicKey.toBase58() }
      };

      const userStakes = await solanaProgram.account.userStakeInfo.all([userFilter]);
      console.log('Solana 原始质押记录:', userStakes);

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
          const unstakeFeeRate = projectConfig.unstakeFeeBps;
          const emergencyUnstakeFeeRate = projectConfig.emergencyUnstakeFeeBps;
          const stakedAt = account.stakeTimestamp.toNumber() * 1000;
          const unlockedAt = stakedAt + account.durationDays * 86400 * 1000;
          const now = new Date().getTime();
          const canUnstake = now >= unlockedAt;

          records.push({
            id: account.stakeId.toNumber(),
            userId: account.user.toBase58(),
            projectId,
            projectName,
            amount: account.amount.toNumber() / 1e6,
            duration: account.durationDays,
            stakedAt,
            unlockedAt,
            canUnstake,
            unstakeFeeRate: unstakeFeeRate / 100,
            emergencyUnstakeFeeRate: emergencyUnstakeFeeRate / 100
          });
        } catch (error) {
          console.error(error);
        }
      }

      const sortedRecords = records.sort((a, b) => b.stakedAt - a.stakedAt);
      console.log('Solana 质押记录:', sortedRecords);

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

      const tx = await solanaProgram.methods.unstake(new anchor.BN(record.id)).accounts(unstakeAccounts).rpc();

      return tx;
    } catch (error) {
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

      const tx = await solanaProgram.methods
        .emergencyUnstake(new anchor.BN(record.id))
        .accounts(emergencyUnstakeAccounts)
        .rpc();

      return tx;
    } catch (error) {
      throw error;
    }
  }
};
