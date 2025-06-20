import { ethers } from 'ethers';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { message } from 'antd';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';

export const durationDays = [1, 7, 14, 30];

const EVM_PROJECT_CONFIG = '0x41494d3030310000000000000000000000000000000000000000000000000000';

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
  unstake: async (evmStakingContract: any, record: any) => {
    console.log('解质押ID:', record.stakeId, '数量:', record.amount);

    const tx = await evmStakingContract.unstake(record.stakeId);
    await tx.wait();
    return tx;
  },

  // 紧急解质押
  emergencyUnstake: async (evmStakingContract: any, record: any) => {
    console.log('紧急解质押ID:', record.stakeId, '数量:', record.amount);

    const tx = await evmStakingContract.emergencyUnstake(record.stakeId);
    await tx.wait();
    return tx;
  },

  // 获取代币余额
  getTokenBalance: async (evmTokenContract: any, address: string) => {
    const _balance = await evmTokenContract.balanceOf(address);
    const balance = Number(ethers.formatEther(_balance));
    return balance;
  },

  // 获取代币授权
  getAllowance: async (evmTokenContract: any, address: string, stakeAddress: string) => {
    const _allowance = await evmTokenContract.allowance(address, stakeAddress);
    const allowance = Number(ethers.formatEther(_allowance));
    return allowance;
  },

  // 授权
  approve: async (evmTokenContract: any, stakeAddress: string) => {
    const tx = await evmTokenContract.approve(stakeAddress, ethers.parseEther('1000000'));
    await tx.wait();
    return tx;
  },

  // 质押
  stake: async (evmStakingContract: any, stakeAmount: string, stakeDuration: number) => {
    console.log('质押数量:', stakeAmount, '质押时长:', stakeDuration);

    const amount = ethers.parseEther(stakeAmount);
    const tx = await evmStakingContract.stake(amount, stakeDuration, EVM_PROJECT_CONFIG);
    await tx.wait();
    return tx;
  }
};

// Only keep the project config address as it's needed to fetch the configuration
const SOLANA_PROJECT_CONFIG = '25dYEUwQ4EQLkkeS1zSu7r1MR34a5mcBGEyNpuEBJuNf';

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

const getVaultAuthorityPda = async (solanaProgram: any, projectId: anchor.BN) => {
  const [vaultAuthorityPda] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('vault-authority'), projectId.toArrayLike(Buffer, 'le', 8)],
    solanaProgram.programId
  );
  return vaultAuthorityPda;
};

// Helper function to get project configuration
const getProjectConfig = async (solanaProgram: any) => {
  const projectConfigPubkey = new PublicKey(SOLANA_PROJECT_CONFIG);
  const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPubkey);
  const vaultAuthority = await getVaultAuthorityPda(solanaProgram, projectConfig.projectId);
  const userTokenAccount = getUserTokenAccount(solanaProgram.provider.wallet.publicKey, projectConfig.tokenMint);

  const config = {
    projectConfigPubkey,
    projectId: projectConfig.projectId.toNumber(),
    authority: projectConfig.authority,
    tokenMint: projectConfig.tokenMint,
    vault: projectConfig.vault,
    projectName: projectConfig.name,
    vaultAuthority,
    userTokenAccount
  };

  // console.log(
  //   'Solana 项目配置:',
  //   JSON.stringify(config, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2)
  // );

  return config;
};

export const solanaUtils = {
  getNextStakeId: async (solanaProgram: any) => {
    const userPublicKey = solanaProgram.provider.wallet.publicKey;

    const { projectConfigPubkey } = await getProjectConfig(solanaProgram);

    // Use memcmp filters to efficiently query stake records
    const userFilter = {
      memcmp: { offset: 8, bytes: userPublicKey.toBase58() }
    };

    const projectFilter = {
      memcmp: { offset: 8 + 32, bytes: projectConfigPubkey.toBase58() }
    };

    const userStakes = await solanaProgram.account.userStakeInfo.all([userFilter, projectFilter]);
    // console.log('Solana 原始质押记录:', userStakes);
    if (!userStakes) return [];

    const records = userStakes.map((stake) => {
      const stakeId = stake.account.stakeId.toNumber();
      return { stakeId };
    });
    const sortedRecords = records.sort((a, b) => b.stakeId - a.stakeId);
    const nextStakeId = sortedRecords[0].stakeId + 1;
    // console.log('下一个质押ID:', nextStakeId);
    return nextStakeId;
  },

  getStakeRecords: async (solanaProgram: any) => {
    const userPublicKey = solanaProgram.provider.wallet.publicKey;

    const { projectConfigPubkey, projectId, projectName } = await getProjectConfig(solanaProgram);

    // Use memcmp filters to efficiently query stake records
    const userFilter = {
      memcmp: { offset: 8, bytes: userPublicKey.toBase58() }
    };

    const projectFilter = {
      memcmp: { offset: 8 + 32, bytes: projectConfigPubkey.toBase58() }
    };

    const userStakes = await solanaProgram.account.userStakeInfo.all([userFilter, projectFilter]);
    // console.log('Solana 原始质押记录:', userStakes);
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

  // 解质押
  handleUnstake: async (solanaProgram: any, record: any) => {
    const userPublicKey = solanaProgram.provider.wallet.publicKey;

    const { projectConfigPubkey, vault, vaultAuthority, userTokenAccount } = await getProjectConfig(solanaProgram);

    console.log('解质押ID:', record.stakeId, '数量:', record.amount);

    // 生成质押信息 PDA
    const stakeInfoPda = await getStakeInfoPda(solanaProgram, userPublicKey, projectConfigPubkey, record.stakeId);

    const unstakeAccounts = {
      projectConfig: projectConfigPubkey,
      stakeInfo: stakeInfoPda,
      user: userPublicKey,
      userTokenAccount: userTokenAccount,
      vault: vault,
      vaultAuthority: vaultAuthority,
      tokenProgram: TOKEN_PROGRAM_ID
    };

    console.log(
      '解质押账户:',
      JSON.stringify(unstakeAccounts, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2)
    );

    const tx = await solanaProgram.methods.unstake(new anchor.BN(record.stakeId)).accounts(unstakeAccounts).rpc();

    message.success('Successful transaction!');

    return tx;
  },

  // 紧急解质押
  emergencyUnstake: async (solanaProgram: any, record: any) => {
    const userPublicKey = solanaProgram.provider.wallet.publicKey;
    if (!userPublicKey) {
      message.error('Wallet not connected or unable to get user public key');
      return;
    }

    const { projectConfigPubkey, vault, vaultAuthority, userTokenAccount } = await getProjectConfig(solanaProgram);

    console.log('紧急解质押ID:', record.stakeId, '数量:', record.amount);

    // 生成质押信息 PDA
    const stakeInfoPda = await getStakeInfoPda(solanaProgram, userPublicKey, projectConfigPubkey, record.stakeId);

    const emergencyUnstakeAccounts = {
      projectConfig: projectConfigPubkey,
      stakeInfo: stakeInfoPda,
      user: userPublicKey,
      userTokenAccount: userTokenAccount,
      vault: vault,
      vaultAuthority: vaultAuthority,
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

    message.success('Successful transaction!');

    return tx;
  },

  stake: async (solanaProgram: any, stakeId: number, stakeAmount: number, stakeDuration: number) => {
    const userPublicKey = solanaProgram.provider.wallet.publicKey;
    if (!userPublicKey) {
      message.error('Wallet not connected or unable to get user public key');
      return;
    }

    const { projectConfigPubkey, vault, userTokenAccount } = await getProjectConfig(solanaProgram);

    // Use the next stake ID from state
    console.log('质押ID:', stakeId, '数量:', stakeAmount);

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

    const { userTokenAccount } = await getProjectConfig(solanaProgram);

    const tokenAccount = await solanaConnection.getTokenAccountBalance(userTokenAccount);
    const balance = tokenAccount.value.uiAmount || 0;
    return balance;
  }
};
