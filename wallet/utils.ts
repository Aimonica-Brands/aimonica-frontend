import { ethers } from 'ethers';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { aimAPI, subgraphsAPI } from '@/pages/api/aim';
import { coingeckoAPI } from '@/pages/api/coingecko';

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

export const evmUtils = {
  /**获取项目信息 */
  getProjects: async () => {
    try {
      const projectsRes: any = await subgraphsAPI.getProjects();

      const projects = projectsRes.projects.filter((item: any) => item.registered);
      console.log('EVM 项目:', projects);

      const users = projectsRes.users;
      console.log('users', users);

      const pointsLeaderboard = await aimAPI.GetPointsLeaderboard();
      console.log('pointsLeaderboard', pointsLeaderboard);

      const newProjects = [];

      for (let index = 0; index < projects.length; index++) {
        const project = projects[index];

        const newProject = {
          index: index,
          id: project.id,
          projectName: ethers.decodeBytes32String(project.id),
          stakingToken: project.stakingToken,
          totalStaked: Number(ethers.formatEther(project.totalStaked)),
          createdAt: project.createdAt,
          points: 0,
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

        const pointsLeaderboardItem = pointsLeaderboard.projects.find((item: any) => item.id === project.id);
        console.log('pointsLeaderboardItem', pointsLeaderboardItem);
        newProject.points = pointsLeaderboardItem?.total_score;

        try {
          const coinDetailsRes = await coingeckoAPI.getCoinByContract('base', project.stakingToken);
          console.log('coinDetailsRes', coinDetailsRes);

          const coinPrice = await coingeckoAPI.getCoinPrice('base', coinDetailsRes.contract_address);
          // console.log(projectName, coinPrice);

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
    const _balance = await evmTokenContract.balanceOf(address);
    const balance = Number(ethers.formatEther(_balance));
    return balance;
  },

  /**获取代币授权 */
  getAllowance: async (evmTokenContract: any, address: string, stakeAddress: string) => {
    const _allowance = await evmTokenContract.allowance(address, stakeAddress);
    const allowance = Number(ethers.formatEther(_allowance));
    return allowance;
  },

  /**授权 */
  approve: async (evmTokenContract: any, stakeAddress: string) => {
    const tx = await evmTokenContract.approve(stakeAddress, ethers.parseEther('1000000'));
    await tx.wait();
    return tx;
  },

  /**质押 */
  stake: async (evmStakingContract: any, stakeAmount: string, stakeDuration: number, projectId: string) => {
    console.log('项目ID:', ethers.decodeBytes32String(projectId), '质押数量:', stakeAmount, '质押时长:', stakeDuration);

    const amount = ethers.parseEther(stakeAmount);
    const tx = await evmStakingContract.stake(amount, stakeDuration, projectId);
    await tx.wait();
    return tx;
  },

  /**解质押 */
  unstake: async (evmStakingContract: any, record: any) => {
    console.log('解质押ID:', record.id, '数量:', record.amount);

    const tx = await evmStakingContract.unstake(record.id);
    await tx.wait();
    return tx;
  },

  /**紧急解质押 */
  emergencyUnstake: async (evmStakingContract: any, record: any) => {
    console.log('紧急解质押ID:', record.id, '数量:', record.amount);

    const tx = await evmStakingContract.emergencyUnstake(record.id);
    await tx.wait();
    return tx;
  }
};

/**获取项目配置 */
const getProjectConfig = async (solanaProgram: any, projectId: number) => {
  const [projectConfigPda] = await PublicKey.findProgramAddress(
    [Buffer.from('project'), new anchor.BN(projectId).toArrayLike(Buffer, 'le', 8)],
    solanaProgram.programId
  );

  const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
    [Buffer.from('vault-authority'), new anchor.BN(projectId).toArrayLike(Buffer, 'le', 8)],
    solanaProgram.programId
  );

  const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);

  const projectConfigPubkey = new PublicKey(projectConfigPda);

  console.log(
    'Solana 项目配置:',
    JSON.stringify(projectConfig, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2)
  );

  // 获取用户的实际代币账户
  const userPublicKey = solanaProgram.provider.wallet.publicKey;
  const tokenAccounts = await solanaProgram.provider.connection.getParsedTokenAccountsByOwner(userPublicKey, {
    mint: projectConfig.tokenMint
  });

  let userTokenAccount;
  if (tokenAccounts.value.length > 0) {
    // 使用实际的代币账户
    userTokenAccount = tokenAccounts.value[0].pubkey;
  } else {
    // 如果没有找到，使用关联代币账户
    userTokenAccount = getAssociatedTokenAddressSync(projectConfig.tokenMint, solanaProgram.provider.wallet.publicKey);
  }

  const feeWalletTokenAccount = getAssociatedTokenAddressSync(projectConfig.tokenMint, projectConfig.feeWallet);

  const config = {
    projectConfigPubkey,
    projectId: projectConfig.projectId.toNumber(),
    authority: projectConfig.authority,
    tokenMint: projectConfig.tokenMint,
    vault: projectConfig.vault,
    projectName: projectConfig.name,
    vaultAuthority: vaultAuthorityPda,
    userTokenAccount,
    feeWalletTokenAccount,
    tokenProgram: projectConfig.tokenProgram,
    unstakeFeeBps: projectConfig.unstakeFeeBps,
    emergencyUnstakeFeeBps: projectConfig.emergencyUnstakeFeeBps
  };

  // console.log(
  //   'Solana 项目配置:',
  //   JSON.stringify(config, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2)
  // );

  return config;
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

      const pointsLeaderboard = await aimAPI.GetPointsLeaderboard();
      console.log('pointsLeaderboard', pointsLeaderboard);

      const newProjects = [];

      for (let i = 0; i < projectCount; i++) {
        try {
          // Get project config PDA
          const [projectConfigPda] = await PublicKey.findProgramAddress(
            [Buffer.from('project'), new anchor.BN(i).toArrayLike(Buffer, 'le', 8)],
            solanaProgram.programId
          );

          // Get project config
          const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);
          console.log(`项目 ${i} 配置:`, projectConfig);

          // Get vault PDA
          const [vaultPda] = await PublicKey.findProgramAddress(
            [Buffer.from('vault'), new anchor.BN(i).toArrayLike(Buffer, 'le', 8)],
            solanaProgram.programId
          );

          // Get vault balance
          let totalStaked = 0;
          try {
            const vaultAccount = await solanaProgram.provider.connection.getTokenAccountBalance(vaultPda);
            totalStaked = vaultAccount.value.uiAmount || 0;
          } catch (error) {
            console.log(`无法获取项目 ${i} 的 totalStaked:`, error);
          }

          const newProject = {
            index: i,
            id: i.toString(),
            projectName: projectConfig.name,
            stakingToken: projectConfig.tokenMint.toBase58(),
            totalStaked: totalStaked,
            createdAt: projectConfig.projectId.toNumber(), // 使用项目ID作为创建时间
            points: 0,
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

          const pointsLeaderboardItem = pointsLeaderboard.projects.find((item: any) => item.id === newProject.id);
          console.log('pointsLeaderboardItem', pointsLeaderboardItem);
          newProject.points = pointsLeaderboardItem?.total_score;

          try {
            const coinDetailsRes = await coingeckoAPI.getCoinByContract(newProject.platformId, newProject.stakingToken);
            console.log('coinDetailsRes', coinDetailsRes);

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
    const userPublicKey = solanaProgram.provider.wallet.publicKey;

    const userFilter = {
      memcmp: { offset: 8, bytes: userPublicKey.toBase58() }
    };

    const userStakes = await solanaProgram.account.userStakeInfo.all([userFilter]);
    console.log('Solana 质押记录:', userStakes);

    if (!userStakes) return [];

    const records = [];

    for (const stake of userStakes) {
      const account = stake.account;
      // status: 0=Active, 1=Unstaked, 2=EmergencyUnstaked
      // status: "Active"
      if (!account.isStaked) continue;

      const projectId = account.projectId.toNumber();

      const { projectName, unstakeFeeBps, emergencyUnstakeFeeBps } = await getProjectConfig(solanaProgram, projectId);

      const staked_at = account.stakeTimestamp.toNumber() * 1000;
      const unlocked_at = staked_at + account.durationDays * 86400 * 1000;
      const now = new Date().getTime();
      const canUnstake = now >= unlocked_at;

      records.push({
        id: account.stakeId.toNumber(),
        user_id: account.user.toBase58(),
        project_id: projectId,
        projectName,
        amount: account.amount.toNumber() / Math.pow(10, 9),
        duration: account.durationDays,
        staked_at,
        unlocked_at,
        canUnstake,
        unstakeFeeRate: unstakeFeeBps / 100,
        emergencyUnstakeFeeRate: emergencyUnstakeFeeBps / 100
      });
    }

    const sortedRecords = records.sort((a, b) => b.staked_at - a.staked_at);
    console.log('Solana 质押记录:', sortedRecords);

    return sortedRecords;
  },

  /**获取下一个质押ID */
  getNextStakeId: async (solanaProgram: any, projectId: number) => {
    const userPublicKey = solanaProgram.provider.wallet.publicKey;

    // const { projectConfigPubkey } = await getProjectConfig(solanaProgram, projectId);

    const userFilter = {
      memcmp: { offset: 8, bytes: userPublicKey.toBase58() }
    };

    // const projectFilter = {
    //   memcmp: { offset: 8 + 32, bytes: projectConfigPubkey.toBase58() }
    // };
    // const userStakes = await solanaProgram.account.userStakeInfo.all([userFilter, projectFilter]);

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
  },

  /**获取代币余额 */
  getTokenBalance: async (solanaProgram: any, solanaConnection: any, projectId: number) => {
    const { userTokenAccount, tokenMint } = await getProjectConfig(solanaProgram, projectId);

    try {
      const tokenAccount = await solanaConnection.getTokenAccountBalance(userTokenAccount);
      const balance = tokenAccount.value.uiAmount || 0;
      console.log('获取到余额:', balance);
      return balance;
    } catch (error) {
      // 如果代币账户不存在，返回 0 余额
      if (error.message && error.message.includes('could not find account')) {
        console.log('代币账户不存在，返回 0 余额');
        console.log('错误详情:', error.message);
        return 0;
      }
      // 其他错误则抛出
      console.log('其他错误:', error.message);
      throw error;
    }
  },

  /**质押 */
  stake: async (solanaProgram: any, stakeId: number, stakeAmount: number, stakeDuration: number, projectId: number) => {
    console.log('项目ID:', projectId, '质押ID:', stakeId, '数量:', stakeAmount);

    const userPublicKey = solanaProgram.provider.wallet.publicKey;

    const { projectConfigPubkey, vault, userTokenAccount, tokenProgram } = await getProjectConfig(
      solanaProgram,
      projectId
    );

    const [stakeInfoPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from('stake'),
        projectConfigPubkey.toBuffer(),
        userPublicKey.toBuffer(),
        new anchor.BN(stakeId).toArrayLike(Buffer, 'le', 8)
      ],
      solanaProgram.programId
    );

    const stakeAmountLamports = new anchor.BN(stakeAmount * Math.pow(10, 9));
    const stakeIdBN = new anchor.BN(stakeId);

    const stakeAccounts = {
      projectConfig: projectConfigPubkey,
      stakeInfo: stakeInfoPda,
      user: userPublicKey,
      userTokenAccount: userTokenAccount,
      vault: vault,
      systemProgram: SystemProgram.programId,
      tokenProgram: tokenProgram
    };

    console.log(
      '质押账户:',
      JSON.stringify(stakeAccounts, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2)
    );

    const tx = await solanaProgram.methods
      .stake(stakeAmountLamports, stakeDuration, stakeIdBN)
      .accounts(stakeAccounts)
      .rpc();

    return tx;
  },

  /**解质押 */
  unstake: async (solanaProgram: any, record: any, projectId: number) => {
    console.log('项目ID:', projectId, '解质押ID:', record.id, '数量:', record.amount);

    const userPublicKey = solanaProgram.provider.wallet.publicKey;

    const { projectConfigPubkey, vault, vaultAuthority, userTokenAccount, feeWalletTokenAccount, tokenProgram } =
      await getProjectConfig(solanaProgram, projectId);

    const [stakeInfoPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from('stake'),
        projectConfigPubkey.toBuffer(),
        userPublicKey.toBuffer(),
        new anchor.BN(record.id).toArrayLike(Buffer, 'le', 8)
      ],
      solanaProgram.programId
    );

    const unstakeAccounts = {
      projectConfig: projectConfigPubkey,
      stakeInfo: stakeInfoPda,
      user: userPublicKey,
      userTokenAccount: userTokenAccount,
      vault: vault,
      vaultAuthority: vaultAuthority,
      feeWallet: feeWalletTokenAccount,
      tokenProgram: tokenProgram
    };

    console.log(
      '解质押账户:',
      JSON.stringify(unstakeAccounts, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2)
    );

    const tx = await solanaProgram.methods.unstake(new anchor.BN(record.id)).accounts(unstakeAccounts).rpc();

    return tx;
  },

  /**紧急解质押 */
  emergencyUnstake: async (solanaProgram: any, record: any, projectId: number) => {
    console.log('项目ID:', projectId, '紧急解质押ID:', record.id, '数量:', record.amount);

    const userPublicKey = solanaProgram.provider.wallet.publicKey;

    const { projectConfigPubkey, vault, vaultAuthority, userTokenAccount, feeWalletTokenAccount, tokenProgram } =
      await getProjectConfig(solanaProgram, projectId);

    const [stakeInfoPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from('stake'),
        projectConfigPubkey.toBuffer(),
        userPublicKey.toBuffer(),
        new anchor.BN(record.id).toArrayLike(Buffer, 'le', 8)
      ],
      solanaProgram.programId
    );

    const emergencyUnstakeAccounts = {
      projectConfig: projectConfigPubkey,
      stakeInfo: stakeInfoPda,
      user: userPublicKey,
      userTokenAccount: userTokenAccount,
      vault: vault,
      vaultAuthority: vaultAuthority,
      feeWallet: feeWalletTokenAccount,
      tokenProgram: tokenProgram
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
  }
};
