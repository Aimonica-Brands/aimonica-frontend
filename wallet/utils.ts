import { ethers } from 'ethers';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { message } from 'antd';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';

// Test account data from logs (updated with new addresses)
const PROJECT_CONFIG = '25dYEUwQ4EQLkkeS1zSu7r1MR34a5mcBGEyNpuEBJuNf';
const TOKEN_MINT = '7jAEAyFi3pkc8dxFTMEPv9SP8PAs1aiFfodGQmbH9VoG';
const VAULT = '5UsEzwS1Aiqrs414bcCaYA6je5jXEjEk7HwYJjyhTMeP';
const VAULT_AUTHORITY = '3sQYqrrpHf5g7HJJssBiAtZkLg3qB6GmFFi82Wq1KJBH';

export const durationDays = [1, 7, 14, 30];

export const evmUtils = {
  getStakeRecords: async (evmStakingContract: any, address: string) => {
    const userStakes = await evmStakingContract.getUserStakes(address);
    console.log('EVM 原始质押记录:', userStakes);
    if (!userStakes) return [];

    const records = [];

    for (const stakeId of userStakes) {
      const stake = await evmStakingContract.stakes(stakeId);
      const status = Number(stake.status);
      // if (status > 0) continue;

      const projectId = Number(stake.projectId);
      const projectName = ethers.decodeBytes32String(stake.projectId);
      const stakedAt = Number(stake.stakedAt) * 1000;
      const unlockedAt = Number(stake.unlockedAt) * 1000;
      const now = new Date().getTime();
      const canUnstake = now >= unlockedAt;

      // status: 0=Active, 1=Unstaked, 2=EmergencyUnstaked
      records.push({
        projectId,
        projectName,
        stakeId: Number(stake.stakeId),
        amount: Number(ethers.formatEther(stake.amount)),
        duration: Number(stake.duration) / 86400,
        stakedAtStr: new Date(stakedAt).toLocaleString(),
        unlockedAtStr: new Date(unlockedAt).toLocaleString(),
        canUnstake,
        status: status
      });
    }

    const sortedRecords = records.sort((a, b) => b.stakeId - a.stakeId);
    console.log('EVM 质押记录:', sortedRecords);
    return sortedRecords;
  },

  // 解质押
  unstake: async (evmStakingContract: any, record: any, blockExplorer: string) => {
    const tx = await evmStakingContract.unstake(record.stakeId);
    await tx.wait();

    const txLink = `${blockExplorer}/tx/${tx.hash}`;
    console.log('🔗解质押交易链接:', txLink);
    message.success('Successful transaction!');
  },

  // 紧急解质押
  emergencyUnstake: async (evmStakingContract: any, record: any, blockExplorer: string) => {
    const tx = await evmStakingContract.emergencyUnstake(record.stakeId);
    await tx.wait();

    const txLink = `${blockExplorer}/tx/${tx.hash}`;
    console.log('🔗紧急解质押交易链接:', txLink);
    message.success('Successful transaction!');
  }
};

// Utility function to generate user token account address
const getUserTokenAccount = (userPublicKey: PublicKey, tokenMint: PublicKey): PublicKey => {
  return getAssociatedTokenAddressSync(tokenMint, userPublicKey);
};

// Utility function to generate stake info PDA
const getStakeInfoPda = async (
  solanaProgram: any,
  userPublicKey: PublicKey,
  projectConfig: PublicKey,
  stakeId: number
): Promise<PublicKey> => {
  const [stakeInfoPda] = await PublicKey.findProgramAddress(
    [
      Buffer.from('stake'),
      projectConfig.toBuffer(),
      userPublicKey.toBuffer(),
      new anchor.BN(stakeId).toArrayLike(Buffer, 'le', 8)
    ],
    solanaProgram.programId
  );
  return stakeInfoPda;
};

export const solanaUtils = {
  getNextStakeId: async (solanaProgram: any) => {
    const userPublicKey = solanaProgram.provider.wallet.publicKey;
    if (!userPublicKey) return [];

    const projectConfigPubkey = new PublicKey(PROJECT_CONFIG);

    const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPubkey);
    console.log('Solana 项目配置:', projectConfig);

    const projectId = projectConfig.projectId.toNumber();
    const projectName = projectConfig.name;
    const tokenMint = projectConfig.tokenMint.toBase58();
    const vault = projectConfig.vault.toBase58();
    const authority = projectConfig.authority.toBase58();

    console.log('Solana 项目配置:', projectName, projectId);
    console.log('tokenMint:', tokenMint);
    console.log('vault:', vault);
    console.log('authority:', authority);

    // Use memcmp filters to efficiently query stake records
    const userFilter = {
      memcmp: { offset: 8, bytes: userPublicKey.toBase58() }
    };

    const projectFilter = {
      memcmp: { offset: 8 + 32, bytes: projectConfigPubkey.toBase58() }
    };

    const userStakes = await solanaProgram.account.userStakeInfo.all([userFilter, projectFilter]);
    console.log('Solana 原始质押记录:', userStakes);
    if (!userStakes) return [];

    const records = userStakes.map((stake) => {
      const stakeId = stake.account.stakeId.toNumber();
      return { stakeId };
    });
    const sortedRecords = records.sort((a, b) => b.stakeId - a.stakeId);
    console.log('Solana 质押记录:', sortedRecords);
    const nextStakeId = sortedRecords[0].stakeId + 1;
    console.log('下一个质押ID:', nextStakeId);
    return nextStakeId;
  },

  getStakeRecords: async (solanaProgram: any) => {
    const userPublicKey = solanaProgram.provider.wallet.publicKey;
    if (!userPublicKey) return [];

    const projectConfigPubkey = new PublicKey(PROJECT_CONFIG);

    const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPubkey);
    console.log('Solana 项目配置:', projectConfig);

    const projectId = projectConfig.projectId.toNumber();
    const projectName = projectConfig.name;
    const tokenMint = projectConfig.tokenMint.toBase58();
    const vault = projectConfig.vault.toBase58();
    const authority = projectConfig.authority.toBase58();

    console.log('Solana 项目配置:', projectName, projectId);
    console.log('tokenMint:', tokenMint);
    console.log('vault:', vault);
    console.log('authority:', authority);

    // Use memcmp filters to efficiently query stake records
    const userFilter = {
      memcmp: { offset: 8, bytes: userPublicKey.toBase58() }
    };

    const projectFilter = {
      memcmp: { offset: 8 + 32, bytes: projectConfigPubkey.toBase58() }
    };

    const userStakes = await solanaProgram.account.userStakeInfo.all([userFilter, projectFilter]);
    console.log('Solana 原始质押记录:', userStakes);
    if (!userStakes) return [];

    const records = [];

    for (const stake of userStakes) {
      const account = stake.account;

      const stakedAt = account.stakeTimestamp.toNumber() * 1000;
      const unlockedAt = stakedAt + account.durationDays * 86400000;
      const now = new Date().getTime();
      const canUnstake = now >= unlockedAt;

      records.push({
        projectId,
        projectName,
        stakeId: account.stakeId.toNumber(),
        amount: account.amount.toNumber() / Math.pow(10, 9),
        duration: account.durationDays,
        stakedAtStr: new Date(stakedAt).toLocaleString(),
        unlockedAtStr: new Date(unlockedAt).toLocaleString(),
        canUnstake,
        status: account.isStaked ? 0 : 1
      });
    }

    const sortedRecords = records.sort((a, b) => b.stakeId - a.stakeId);
    // console.log('Solana 质押记录:', sortedRecords);
    return sortedRecords;
  },

  handleUnstake: async (solanaProgram: any, record: any, blockExplorer: string, cluster: string) => {
    const userPublicKey = solanaProgram.provider.wallet.publicKey;
    if (!userPublicKey) {
      message.error('Wallet not connected or unable to get user public key');
      return;
    }

    const projectConfigPubkey = new PublicKey(PROJECT_CONFIG);
    const tokenMintPubkey = new PublicKey(TOKEN_MINT);
    const vault = new PublicKey(VAULT);

    console.log('解质押ID:', record.stakeId, '数量:', record.amount);

    // 生成用户代币账户
    const userTokenAccount = getUserTokenAccount(userPublicKey, tokenMintPubkey);

    // 生成质押信息 PDA
    const stakeInfoPda = await getStakeInfoPda(solanaProgram, userPublicKey, projectConfigPubkey, record.stakeId);

    // 生成 vault authority PDA
    const vaultAuthorityPda = new PublicKey(VAULT_AUTHORITY);

    const unstakeAccounts = {
      projectConfig: projectConfigPubkey,
      stakeInfo: stakeInfoPda,
      user: userPublicKey,
      userTokenAccount: userTokenAccount,
      vault: vault,
      vaultAuthority: vaultAuthorityPda,
      tokenProgram: TOKEN_PROGRAM_ID
    };

    console.log(
      '解质押账户:',
      JSON.stringify(unstakeAccounts, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2)
    );

    const tx = await solanaProgram.methods.unstake(new anchor.BN(record.stakeId)).accounts(unstakeAccounts).rpc();

    const txLink = `${blockExplorer}/tx/${tx}?cluster=${cluster}`;
    console.log('🔗解质押交易链接:', txLink);
    message.success('Successful transaction!');
  },

  // 紧急解质押
  emergencyUnstake: async (solanaProgram: any, record: any, blockExplorer: string, cluster: string) => {
    const userPublicKey = solanaProgram.provider.wallet.publicKey;
    if (!userPublicKey) {
      message.error('Wallet not connected or unable to get user public key');
      return;
    }

    const projectConfigPubkey = new PublicKey(PROJECT_CONFIG);
    const tokenMintPubkey = new PublicKey(TOKEN_MINT);
    const vault = new PublicKey(VAULT);

    console.log('紧急解质押ID:', record.stakeId, '数量:', record.amount);

    // 生成用户代币账户
    const userTokenAccount = getUserTokenAccount(userPublicKey, tokenMintPubkey);

    // 生成质押信息 PDA
    const stakeInfoPda = await getStakeInfoPda(solanaProgram, userPublicKey, projectConfigPubkey, record.stakeId);

    // 生成 vault authority PDA
    const vaultAuthorityPda = new PublicKey(VAULT_AUTHORITY);

    const emergencyUnstakeAccounts = {
      projectConfig: projectConfigPubkey,
      stakeInfo: stakeInfoPda,
      user: userPublicKey,
      userTokenAccount: userTokenAccount,
      vault: vault,
      vaultAuthority: vaultAuthorityPda,
      tokenProgram: TOKEN_PROGRAM_ID
    };

    console.log(
      '紧急解质押账户:',
      JSON.stringify(emergencyUnstakeAccounts, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2)
    );

    const tx = await solanaProgram.methods
      .emergencyUnstake(new anchor.BN(record.stakeId))
      .accounts(emergencyUnstakeAccounts)
      .rpc();

    const txLink = `${blockExplorer}/tx/${tx}?cluster=${cluster}`;
    console.log('🔗紧急解质押交易链接:', txLink);
    message.success('Successful transaction!');
  },

  stake: async (solanaProgram: any, stakeId: number, stakeAmount: number, stakeDuration: number) => {
    const userPublicKey = solanaProgram.provider.wallet.publicKey;
    if (!userPublicKey) {
      message.error('Wallet not connected or unable to get user public key');
      return;
    }

    const projectConfigPubkey = new PublicKey(PROJECT_CONFIG);
    const tokenMintPubkey = new PublicKey(TOKEN_MINT);
    const vault = new PublicKey(VAULT);

    // Use the next stake ID from state
    console.log('质押ID:', stakeId, '数量:', stakeAmount);

    // Generate user token account
    const userTokenAccount = getUserTokenAccount(userPublicKey, tokenMintPubkey);

    // Generate stake info PDA
    const stakeInfoPda = await getStakeInfoPda(solanaProgram, userPublicKey, projectConfigPubkey, stakeId);

    const stakeAmountLamports = new anchor.BN(stakeAmount * Math.pow(10, 9));
    const stakeIdBN = new anchor.BN(stakeId);

    const stakeAccounts = {
      projectConfig: projectConfigPubkey,
      stakeInfo: stakeInfoPda,
      user: userPublicKey,
      userTokenAccount: userTokenAccount,
      vault: vault,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID
    };

    console.log(
      '质押账户:',
      JSON.stringify(stakeAccounts, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2)
    );

    const tx = await solanaProgram.methods
      .stake(stakeAmountLamports, stakeDuration, stakeIdBN)
      .accounts(stakeAccounts)
      .rpc();

    message.success('Successful transaction!');
    return tx;
  },

  getTokenBalance: async (solanaProgram: any, solanaConnection: any) => {
    const userPublicKey = solanaProgram.provider.wallet.publicKey;
    if (!userPublicKey) return;

    const tokenMintPubkey = new PublicKey(TOKEN_MINT);
    const userTokenAccount = getUserTokenAccount(userPublicKey, tokenMintPubkey);

    try {
      const tokenAccount = await solanaConnection.getTokenAccountBalance(userTokenAccount);
      const balance = tokenAccount.value.uiAmount || 0;
      return balance;
    } catch (error) {
      return 0;
    }
  }
};
