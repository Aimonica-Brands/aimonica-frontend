import { PublicKey, SystemProgram } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { aimAPI } from '@/pages/api/aim';
import { coingeckoAPI } from '@/pages/api/coingecko';

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

/**获取手续费钱包代币账户 */
const getFeeWalletTokenAccount = async (
  solanaProgram: any,
  tokenMint: PublicKey,
  feeWallet: PublicKey,
  tokenProgram: PublicKey
) => {
  // 检查 wallet 是否存在
  if (!solanaProgram.provider.wallet) {
    throw new Error('Solana wallet not connected');
  }

  // 获取有效的 payer
  const payer = solanaProgram.provider.wallet.payer || solanaProgram.provider.wallet;
  if (!payer) {
    throw new Error('Unable to get valid payer');
  }

  // 获取 fee wallet token account 地址
  const feeWalletTokenAccount = await getAssociatedTokenAddress(tokenMint, feeWallet, false, tokenProgram);

  // 检查 fee wallet token account 是否已存在
  try {
    await solanaProgram.provider.connection.getTokenAccountBalance(feeWalletTokenAccount);
    console.log('✅ Fee wallet token account 已存在:', feeWalletTokenAccount.toBase58());
    return feeWalletTokenAccount;
  } catch (error) {
    if (error.message && error.message.includes('could not find account')) {
      console.log('🔄 Fee wallet token account 不存在，正在创建...');

      // 创建关联代币账户指令
      const instruction = createAssociatedTokenAccountInstruction(
        payer.publicKey, // payer
        feeWalletTokenAccount, // associated token account
        feeWallet, // owner
        tokenMint,
        tokenProgram
      );

      // 发送交易
      const transaction = new anchor.web3.Transaction().add(instruction);
      const signature = await solanaProgram.provider.sendAndConfirm(transaction);
      console.log('✅ Fee wallet token account 创建成功，交易签名:', signature);
      return feeWalletTokenAccount;
    } else {
      throw error;
    }
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

      // 获取积分排行榜，如果失败则使用空数据继续执行
      let pointsLeaderboard = { projects: [] };
      try {
        pointsLeaderboard = await aimAPI.GetPointsLeaderboard();
        console.log('积分排行榜', pointsLeaderboard);
      } catch (error) {
        console.error(error);
      }

      const newProjects = [];

      for (let i = 0; i < projectCount; i++) {
        try {
          const projectConfigPda = await getProjectConfigPda(solanaProgram, i);
          const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);
          console.log(`项目 ${i} 配置:`, projectConfig);

          const totalStaked = await getProjectTotalStaked(solanaProgram, i);
          const userCount = await getProjectUserCount(solanaProgram, projectConfigPda);
          const pointsLeaderboardItem = pointsLeaderboard.projects.find((item: any) => item.id == i);
          const points = pointsLeaderboardItem?.total_score || 0;

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
  },

  /**获取管理员列表 */
  getAdminList: async (solanaProgram: any) => {
    try {
      const [platformConfigPda] = await PublicKey.findProgramAddress(
        [Buffer.from('platform')],
        solanaProgram.programId
      );

      try {
        const platformConfig = await solanaProgram.account.platformConfig.fetch(platformConfigPda);

        const authorities = platformConfig.authorities.map((auth: any) => auth.toBase58());
        console.log('✅ 管理员列表获取成功:', authorities);

        return authorities;
      } catch (error) {
        // 平台未初始化，返回空数组
        console.log('平台未初始化，返回空管理员列表');
        return [];
      }
    } catch (error) {
      throw error;
    }
  },

  /**添加管理员 */
  addAdmin: async (solanaProgram: any, adminAddress: string) => {
    try {
      const [platformConfigPda] = await PublicKey.findProgramAddress(
        [Buffer.from('platform')],
        solanaProgram.programId
      );

      const authority = solanaProgram.provider.wallet.publicKey;
      const newAuthority = new PublicKey(adminAddress);

      const accounts = {
        platformConfig: platformConfigPda,
        authority: authority,
        systemProgram: SystemProgram.programId
      };

      const tx = await solanaProgram.methods.addAuthority(newAuthority).accounts(accounts).rpc();

      return tx;
    } catch (error) {
      throw error;
    }
  },

  /**删除管理员 */
  removeAdmin: async (solanaProgram: any, adminAddress: string) => {
    try {
      const [platformConfigPda] = await PublicKey.findProgramAddress(
        [Buffer.from('platform')],
        solanaProgram.programId
      );

      const authority = solanaProgram.provider.wallet.publicKey;
      const authorityToRemove = new PublicKey(adminAddress);

      const accounts = {
        platformConfig: platformConfigPda,
        authority: authority,
        systemProgram: SystemProgram.programId
      };

      const tx = await solanaProgram.methods.removeAuthority(authorityToRemove).accounts(accounts).rpc();

      return tx;
    } catch (error) {
      throw error;
    }
  },

  /**初始化平台 */
  initializePlatform: async (solanaProgram: any) => {
    try {
      const authority = solanaProgram.provider.wallet.publicKey;

      // Get platform config PDA
      const [platformConfigPda] = await PublicKey.findProgramAddress(
        [Buffer.from('platform')],
        solanaProgram.programId
      );

      // Check if platform is already initialized
      try {
        const existingPlatformConfig = await solanaProgram.account.platformConfig.fetch(platformConfigPda);
        console.log('平台已初始化，项目数量:', existingPlatformConfig.projectCount.toNumber());

        // 检查权限
        if (!existingPlatformConfig.authorities.some((auth: any) => auth.equals(authority))) {
          throw new Error(
            `Platform authority mismatch. Current wallet: ${authority.toBase58()}, Platform authorities: ${existingPlatformConfig.authorities
              .map((auth: any) => auth.toBase58())
              .join(', ')}`
          );
        }

        return platformConfigPda;
      } catch (error) {
        if (error.message.includes('Platform authority mismatch')) {
          throw error;
        }
        // Platform doesn't exist, proceed with initialization
        console.log('平台未初始化，开始初始化...');
      }

      const accounts = {
        platformConfig: platformConfigPda,
        authority: authority,
        systemProgram: SystemProgram.programId
      };

      await solanaProgram.methods.initializePlatform().accounts(accounts).rpc();

      return platformConfigPda;
    } catch (error) {
      throw error;
    }
  },

  /**注册项目 */
  registerProject: async (solanaProgram: any, projectName: string, tokenMintAddress: string) => {
    try {
      console.log('注册项目', { projectName, tokenMintAddress });

      // 首先初始化平台
      const platformConfigPda = await solanaUtils.initializePlatform(solanaProgram);
      const authority = solanaProgram.provider.wallet.publicKey;

      const tokenMint = new PublicKey(tokenMintAddress);

      // 检测代币程序类型
      let tokenProgram = TOKEN_PROGRAM_ID;

      // 获取代币账户信息
      const mintInfo = await solanaProgram.provider.connection.getAccountInfo(tokenMint);

      // 检查代币程序类型
      if (mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
        console.log('检测到 Token-2022 代币');
        tokenProgram = TOKEN_2022_PROGRAM_ID;
      } else {
        console.log('检测到标准 SPL Token');
        tokenProgram = TOKEN_PROGRAM_ID;
      }

      // Get current platform state
      const platformConfigAccountBefore = await solanaProgram.account.platformConfig.fetch(platformConfigPda);
      const projectCount = platformConfigAccountBefore.projectCount;
      console.log('当前项目数量:', projectCount.toNumber());

      // Derive PDAs for the new project
      const [projectConfigPda] = await PublicKey.findProgramAddress(
        [Buffer.from('project'), projectCount.toArrayLike(Buffer, 'le', 8)],
        solanaProgram.programId
      );

      const [vaultPda] = await PublicKey.findProgramAddress(
        [Buffer.from('vault'), projectCount.toArrayLike(Buffer, 'le', 8)],
        solanaProgram.programId
      );

      const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
        [Buffer.from('vault-authority'), projectCount.toArrayLike(Buffer, 'le', 8)],
        solanaProgram.programId
      );

      // Check if project is already registered
      try {
        const existingProjectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);
        console.log('项目已注册，跳过注册，项目名称:', existingProjectConfig);
        return 'registered';
      } catch (error) {
        // Project doesn't exist, proceed with registration
        console.log('项目未注册，开始注册...');
      }

      const accounts = {
        platformConfig: platformConfigPda,
        projectConfig: projectConfigPda,
        tokenMint: tokenMint,
        vault: vaultPda,
        vaultAuthority: vaultAuthorityPda,
        authority: authority,
        systemProgram: SystemProgram.programId,
        tokenProgram: tokenProgram,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY
      };

      const allowedDurations = [7, 14, 30]; // e.g., 7 days, 14 days, 30 days

      const tx = await solanaProgram.methods.registerProject(projectName, allowedDurations).accounts(accounts).rpc();

      return tx;
    } catch (error) {
      throw error;
    }
  },

  /**更新项目配置 */
  updateProjectConfig: async (
    solanaProgram: any,
    projectId: string,
    feeWalletAddress: string,
    unstakeFeeBps: number,
    emergencyUnstakeFeeBps: number
  ) => {
    try {
      console.log('🔄 更新项目配置:', { projectId, feeWalletAddress, unstakeFeeBps, emergencyUnstakeFeeBps });

      const [projectConfigPda] = await PublicKey.findProgramAddress(
        [Buffer.from('project'), new anchor.BN(projectId).toArrayLike(Buffer, 'le', 8)],
        solanaProgram.programId
      );
      const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);

      const authority = solanaProgram.provider.wallet.publicKey;
      const feeWallet = new PublicKey(feeWalletAddress);

      await getFeeWalletTokenAccount(solanaProgram, projectConfig.tokenMint, feeWallet, projectConfig.tokenProgram);

      const accounts = {
        projectConfig: projectConfigPda,
        authority: authority
      };

      const tx = await solanaProgram.methods
        .updateProjectConfig(feeWallet, unstakeFeeBps * 100, emergencyUnstakeFeeBps * 100)
        .accounts(accounts)
        .rpc();

      return tx;
    } catch (error) {
      throw error;
    }
  },

  /**更新质押时长 */
  updateAllowedDurations: async (solanaProgram: any, projectId: string, newAllowedDurations: number[]) => {
    try {
      console.log('🔄 更新质押时长:', { projectId, newAllowedDurations });

      const [projectConfigPda] = await PublicKey.findProgramAddress(
        [Buffer.from('project'), new anchor.BN(projectId).toArrayLike(Buffer, 'le', 8)],
        solanaProgram.programId
      );

      const authority = solanaProgram.provider.wallet.publicKey;

      const accounts = {
        projectConfig: projectConfigPda,
        authority: authority,
        systemProgram: SystemProgram.programId
      };

      const tx = await solanaProgram.methods.updateAllowedDurations(newAllowedDurations).accounts(accounts).rpc();

      return tx;
    } catch (error) {
      throw error;
    }
  }
};
