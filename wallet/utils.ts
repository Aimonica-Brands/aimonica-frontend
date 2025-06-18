import { ethers } from 'ethers';
import { PublicKey } from '@solana/web3.js';
import { message } from 'antd';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';

// Test account data from logs (updated with new addresses)
const PROJECT_CONFIG = '57cN6zv7kJ8w2y28zk9EHbLpGwpN2TaRLYcQwbUZJjpA';
const TOKEN_MINT = 'EJmXTvmKixRrLrQURoE66zwoDMc28DaUMbG6i1XXNaDz';
const VAULT = '6r9FaxNxJzkRtm9cj5ym3nVWu9dL2pNHHBhU99DVZiwA';

export const evmUtils = {
  getStakeRecords: async (evmStakingContract: any, address: string) => {
    const userStakes = await evmStakingContract.getUserStakes(address);
    console.log('EVM 原始质押记录:', userStakes);
    if (!userStakes) return [];

    const records = [];

    for (const stakeId of userStakes) {
      const stake = await evmStakingContract.stakes(stakeId);
      const status = Number(stake.status);
      if (status > 0) continue;

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
  getStakeRecords: async (solanaProgram: any) => {
    const userPublicKey = solanaProgram.provider.wallet.publicKey;
    if (!userPublicKey) return [];

    const projectConfigPubkey = new PublicKey(PROJECT_CONFIG);

    // Use memcmp filters to efficiently query stake records
    const userFilter = {
      memcmp: {
        offset: 8,
        bytes: userPublicKey.toBase58()
      }
    };

    const projectFilter = {
      memcmp: {
        offset: 8 + 32,
        bytes: projectConfigPubkey.toBase58()
      }
    };

    const userStakes = await solanaProgram.account.userStakeInfo.all([userFilter, projectFilter]);
    // console.log('Solana 原始质押记录:', userStakes);
    if (!userStakes) return [];

    const records = [];

    for (const stake of userStakes) {
      const account = stake.account;

      const projectId = account.projectId.toNumber();
      const projectName = projectId;
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

    // 获取项目配置
    const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPubkey);

    // 生成 vault authority PDA
    const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
      [Buffer.from('vault-authority'), projectConfig.projectId.toArrayLike(Buffer, 'le', 8)],
      solanaProgram.programId
    );

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

    // 获取项目配置
    const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPubkey);

    // 生成 vault authority PDA
    const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
      [Buffer.from('vault-authority'), projectConfig.projectId.toArrayLike(Buffer, 'le', 8)],
      solanaProgram.programId
    );

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
  }
};
