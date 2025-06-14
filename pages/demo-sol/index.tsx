import React, { useState, useEffect } from 'react';
import { Button, message, Card, Input, Tabs, Divider, Space, Select, InputNumber, Table, Tag } from 'antd';
import { useAppKitAccount } from '@reown/appkit/react';
import { handleContractError } from '@/wallet/contracts';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import bs58 from 'bs58';
import { usePageContext } from '@/context';
import * as anchor from '@coral-xyz/anchor';

const { Option } = Select;

// Stake record interface
interface StakeRecord {
  stakeId: number;
  amount: number;
  duration: number;
  stakeTimestamp: Date;
  endTimestamp: Date;
  isStaked: boolean;
  canUnstake: boolean;
  stakeInfoPda: string;
}

export default function DemoSol() {
  const { address, isConnected } = useAppKitAccount();
  const {
    solanaConnection,
    solanaProgram,
    solanaProvider,
  } = usePageContext();

  const [loading, setLoading] = useState(false);
  const [signMessage, setSignMessage] = useState('Hello from AIMonica DApp!');
  const [results, setResults] = useState<string[]>([]);

  // Stake related state
  const [stakeAmount, setStakeAmount] = useState<number>(10);
  const [stakeDuration, setStakeDuration] = useState<number>(7);
  const [nextStakeId, setNextStakeId] = useState<number>(2);
  const [stakeRecords, setStakeRecords] = useState<StakeRecord[]>([]);

  // Test account data from logs (updated with new addresses)
  const PROJECT_CONFIG = "57cN6zv7kJ8w2y28zk9EHbLpGwpN2TaRLYcQwbUZJjpA";
  const TOKEN_MINT = "EJmXTvmKixRrLrQURoE66zwoDMc28DaUMbG6i1XXNaDz";
  const VAULT = "6r9FaxNxJzkRtm9cj5ym3nVWu9dL2pNHHBhU99DVZiwA";

  // Utility function to generate user token account address
  const getUserTokenAccount = (userPublicKey: PublicKey, tokenMint: PublicKey): PublicKey => {
    return getAssociatedTokenAddressSync(tokenMint, userPublicKey);
  };

  // Utility function to generate stake info PDA
  const getStakeInfoPda = async (
    userPublicKey: PublicKey,
    projectConfig: PublicKey,
    stakeId: number
  ): Promise<PublicKey> => {
    const [stakeInfoPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from("stake"),
        projectConfig.toBuffer(),
        userPublicKey.toBuffer(),
        new anchor.BN(stakeId).toArrayLike(Buffer, 'le', 8)
      ],
      solanaProgram.programId
    );
    return stakeInfoPda;
  };

  const addResult = (result: string) => {
    setResults((prev) => [`${new Date().toLocaleTimeString()}: ${result}`, ...prev.slice(0, 9)]);
  };



  const getNextStakeId = async (
    program,
    userPublicKey: anchor.web3.PublicKey,
    projectConfigPublicKey: anchor.web3.PublicKey,
    maxRetries = 3
  ) => {
    const userFilter = {
      memcmp: {
        offset: 8, // 8字节的 discriminator 之后
        bytes: userPublicKey.toBase58(),
      }
    };

    const projectFilter = {
      memcmp: {
        offset: 8 + 32, // discriminator + user
        bytes: projectConfigPublicKey.toBase58(),
      }
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 尝试查询用户质押记录 (第 ${attempt}/${maxRetries} 次)...`);
        
        const userStakes = await program.account.userStakeInfo.all([userFilter, projectFilter]);

        console.log(`✅ 查询成功！Found ${userStakes.length} existing stakes for this user in this project.`);

        // 下一个可用的 ID 就是当前质押的数量 + 1（因为 stake ID 从 1 开始）
        return BigInt(userStakes.length + 1);
        
      } catch (error) {
        console.error(`❌ 第 ${attempt} 次查询失败:`, error);
        
        if (attempt === maxRetries) {
          // 最后一次重试失败，返回一个基于时间的随机 ID
          console.log('🔄 所有重试失败，使用时间戳生成 stake ID...');
          const fallbackId = Math.floor(Date.now() / 1000) % 1000 + 1; // 1-1000 范围
          addResult(`⚠️ 网络查询失败，使用随机 Stake ID: ${fallbackId}`);
          return BigInt(fallbackId);
        }
        
        // 等待后重试（递增延迟）
        const delay = attempt * 2000; // 2秒, 4秒, 6秒
        console.log(`⏳ ${delay/1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }



  // Stake tokens with stake ID
  const handleStake = async () => {
    if (!solanaProgram || !solanaConnection) {
      message.error('请先连接 Solana 钱包');
      return;
    }

    if (!stakeAmount || stakeAmount <= 0) {
      message.error('请输入有效的质押数量');
      return;
    }

    if (loading) {
      message.warning('操作正在进行中，请勿重复点击');
      return;
    }

    setLoading(true);
    try {
      const userPublicKey = solanaProgram.provider.wallet.publicKey;

      if (!userPublicKey) {
        message.error('钱包未连接或无法获取用户公钥');
        return;
      }

      console.log('User public key:', userPublicKey.toString());
      console.log('Program ID:', solanaProgram.programId.toString());
      console.log('Provider type:', solanaProgram.provider.wallet.constructor.name);
      console.log('🔗 Connection endpoint:', solanaConnection.rpcEndpoint);
      
      // 验证我们使用的是正确的 RPC 端点
      if (solanaConnection.rpcEndpoint.includes('walletconnect')) {
        console.error('⚠️ 警告: 仍在使用 WalletConnect RPC，这可能导致问题');
        addResult('⚠️ 警告: 检测到 WalletConnect RPC，可能影响交易成功率');
      } else {
        console.log('✅ 使用官方 Solana RPC');
        addResult(`✅ 使用 RPC: ${solanaConnection.rpcEndpoint}`);
      }

      const projectConfigPubkey = new PublicKey(PROJECT_CONFIG);
      const tokenMintPubkey = new PublicKey(TOKEN_MINT);
      const vault = new PublicKey(VAULT);

      // Find next available stake ID using the new method
      const nextStakeIdBigInt = await getNextStakeId(solanaProgram, userPublicKey, projectConfigPubkey);
      const availableStakeId = Number(nextStakeIdBigInt);
      console.log('Using available stake ID:', availableStakeId);

      // Generate user token account dynamically based on user + token mint
      const userTokenAccount = getUserTokenAccount(userPublicKey, tokenMintPubkey);
      console.log('User token account:', userTokenAccount.toString());

      // Generate stake info PDA with available stake ID
      const stakeInfoPda = await getStakeInfoPda(userPublicKey, projectConfigPubkey, availableStakeId);

      const stakeAmountLamports = new anchor.BN(stakeAmount * Math.pow(10, 9)); // Assuming 9 decimals
      const stakeIdBN = new anchor.BN(availableStakeId);

      const stakeAccounts = {
        projectConfig: projectConfigPubkey,
        stakeInfo: stakeInfoPda,
        user: userPublicKey,
        userTokenAccount: userTokenAccount,
        vault: vault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      };

      console.log("stake accounts:", JSON.stringify(stakeAccounts, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2));

      // Call stake function with stake_id parameter
      console.log('Calling stake with params:', {
        amount: stakeAmountLamports.toString(),
        duration: stakeDuration,
        stakeId: stakeIdBN.toString()
      });

      // 发送交易并等待确认
      console.log('发送质押交易...');
      const tx = await solanaProgram.methods
        .stake(stakeAmountLamports, stakeDuration, stakeIdBN)
        .accounts(stakeAccounts)
        .rpc();

      console.log("✅ 交易已发送! Transaction hash:", tx);

      // 立即显示交易 hash，不管确认是否成功
      addResult(`🚀 交易已发送! Hash: ${tx}`);
      addResult(`🔗 查看交易: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

      try {
        // 等待交易确认，增加超时时间到 60 秒
        console.log('等待交易确认...');
        const confirmation = await solanaConnection.confirmTransaction({
          signature: tx,
          blockhash: (await solanaConnection.getLatestBlockhash()).blockhash,
          lastValidBlockHeight: (await solanaConnection.getLatestBlockhash()).lastValidBlockHeight
        }, 'confirmed');

        if (confirmation.value.err) {
          throw new Error(`交易失败: ${JSON.stringify(confirmation.value.err)}`);
        }

        console.log('✅ 交易确认成功!');
        addResult(`✅ 质押成功: ${stakeAmount} tokens for ${stakeDuration} days (Stake ID: ${availableStakeId})`);
        addResult(`Stake Info PDA: ${stakeInfoPda.toString()}`);
        message.success(`质押成功！Stake ID: ${availableStakeId}`);

      } catch (confirmError) {
        console.warn('交易确认失败，但交易可能已成功:', confirmError);
        addResult(`⚠️ 交易确认超时，但交易可能已成功`);
        addResult(`💡 请在 Solana Explorer 中检查交易状态`);
        message.warning('交易已发送，但确认超时。请检查 Solana Explorer 确认状态。');
      }

      // Update next stake ID to be one higher than what we just used
      setNextStakeId(availableStakeId + 1);

      // Refresh stake records
      await refreshStakeRecords();
    } catch (error) {
      console.error('Stake error:', error);

      // 检查是否有交易签名在错误中
      let txSignature = null;
      if (error.signature) {
        txSignature = error.signature;
      } else if (error.message && error.message.includes('signature')) {
        // 尝试从错误消息中提取签名
        const signatureMatch = error.message.match(/signature ([A-Za-z0-9]{87,88})/);
        if (signatureMatch) {
          txSignature = signatureMatch[1];
        }
      }

      if (txSignature) {
        addResult(`🚀 交易已发送! Hash: ${txSignature}`);
        addResult(`🔗 查看交易: https://explorer.solana.com/tx/${txSignature}?cluster=devnet`);
      }

      // 处理超时错误
      if (error.message && error.message.includes('Transaction was not confirmed')) {
        message.warning('交易可能已成功，但确认超时。请检查您的钱包或稍后刷新页面查看结果。');
        addResult(`⚠️ 质押交易超时: 交易可能成功但未及时确认`);
        addResult(`💡 建议: 请在 Solana Explorer 中检查交易状态或刷新页面`);

        // 尝试刷新质押记录
        setTimeout(() => {
          refreshStakeRecords();
        }, 5000);
      } else if (error.message && error.message.includes('insufficient funds')) {
        message.error('账户余额不足');
        addResult(`❌ 质押失败: 账户余额不足`);
      } else {
        handleContractError(error);
        addResult(`❌ 质押失败: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Unstake specific stake by ID
  const handleUnstake = async (stakeId: number) => {
    if (!solanaProgram || !solanaConnection) {
      message.error('请先连接 Solana 钱包');
      return;
    }

    if (loading) {
      message.warning('操作正在进行中，请勿重复点击');
      return;
    }

    setLoading(true);
    try {
      const userPublicKey = solanaProgram.provider.wallet.publicKey;

      if (!userPublicKey) {
        message.error('钱包未连接或无法获取用户公钥');
        return;
      }

      const projectConfigPubkey = new PublicKey(PROJECT_CONFIG);
      const tokenMintPubkey = new PublicKey(TOKEN_MINT);
      const userTokenAccount = getUserTokenAccount(userPublicKey, tokenMintPubkey);

      // Get stake info PDA for this specific stake ID
      const stakeInfoPda = await getStakeInfoPda(userPublicKey, projectConfigPubkey, stakeId);

      // Get project config to find project_id for vault authority
      const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPubkey);

      // Find vault PDA
      const [vaultPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("vault"),
          projectConfig.projectId.toArrayLike(Buffer, 'le', 8)
        ],
        solanaProgram.programId
      );

      // Find vault authority PDA
      const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("vault-authority"),
          projectConfig.projectId.toArrayLike(Buffer, 'le', 8)
        ],
        solanaProgram.programId
      );

      const stakeIdBN = new anchor.BN(stakeId);

      const accounts = {
        projectConfig: projectConfigPubkey,
        stakeInfo: stakeInfoPda,
        user: userPublicKey,
        userTokenAccount: userTokenAccount,
        vault: vaultPda,
        vaultAuthority: vaultAuthorityPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      };

      console.log('Unstake accounts:', JSON.stringify(accounts, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2));

      const tx = await solanaProgram.methods
        .unstake(stakeIdBN)
        .accounts(accounts)
        .rpc();

      console.log('✅ 解质押交易已发送! Transaction hash:', tx);

      // 立即显示交易 hash
      addResult(`🚀 解质押交易已发送! Hash: ${tx}`);
      addResult(`🔗 查看交易: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
      addResult(`✅ 解质押成功 (Stake ID: ${stakeId})`);
      message.success(`解质押成功！Stake ID: ${stakeId}`);

      // Refresh stake records
      await refreshStakeRecords();
    } catch (error) {
      console.error('Unstake error:', error);
      handleContractError(error);
      addResult(`❌ 解质押失败 (Stake ID: ${stakeId}): ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Emergency unstake specific stake by ID
  const handleEmergencyUnstake = async (stakeId: number) => {
    if (!solanaProgram || !solanaConnection) {
      message.error('请先连接 Solana 钱包');
      return;
    }

    if (loading) {
      message.warning('操作正在进行中，请勿重复点击');
      return;
    }

    setLoading(true);
    try {
      const userPublicKey = solanaProgram.provider.wallet.publicKey;

      if (!userPublicKey) {
        message.error('钱包未连接或无法获取用户公钥');
        return;
      }

      const projectConfigPubkey = new PublicKey(PROJECT_CONFIG);
      const tokenMintPubkey = new PublicKey(TOKEN_MINT);
      const userTokenAccount = getUserTokenAccount(userPublicKey, tokenMintPubkey);

      // Get stake info PDA for this specific stake ID
      const stakeInfoPda = await getStakeInfoPda(userPublicKey, projectConfigPubkey, stakeId);

      // Get project config to find project_id for vault authority
      const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPubkey);

      // Find vault PDA
      const [vaultPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("vault"),
          projectConfig.projectId.toArrayLike(Buffer, 'le', 8)
        ],
        solanaProgram.programId
      );

      // Find vault authority PDA
      const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("vault-authority"),
          projectConfig.projectId.toArrayLike(Buffer, 'le', 8)
        ],
        solanaProgram.programId
      );

      const stakeIdBN = new anchor.BN(stakeId);

      const accounts = {
        projectConfig: projectConfigPubkey,
        stakeInfo: stakeInfoPda,
        user: userPublicKey,
        userTokenAccount: userTokenAccount,
        vault: vaultPda,
        vaultAuthority: vaultAuthorityPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      };

      console.log('Emergency unstake accounts:', JSON.stringify(accounts, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2));

      const tx = await solanaProgram.methods
        .emergencyUnstake(stakeIdBN)
        .accounts(accounts)
        .rpc();

      console.log('Emergency unstake transaction:', tx);

      addResult(`✅ 紧急解质押成功（放弃奖励）(Stake ID: ${stakeId})`);
      addResult(`交易ID: ${tx.slice(0, 20)}...`);
      message.success(`紧急解质押成功！Stake ID: ${stakeId}`);

      // Refresh stake records
      await refreshStakeRecords();
    } catch (error) {
      console.error('Emergency unstake error:', error);
      handleContractError(error);
      addResult(`❌ 紧急解质押失败 (Stake ID: ${stakeId}): ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Refresh all stake records for current user
  const refreshStakeRecords = async () => {
    if (!solanaProgram || !solanaConnection) {
      return;
    }

    try {
      const userPublicKey = solanaProgram.provider.wallet.publicKey;

      if (!userPublicKey) {
        return;
      }

      const projectConfigPubkey = new PublicKey(PROJECT_CONFIG);

      // Use the same efficient filtering method to get all stake records
      const userFilter = {
        memcmp: {
          offset: 8, // 8字节的 discriminator 之后
          bytes: userPublicKey.toBase58(),
        }
      };

      const projectFilter = {
        memcmp: {
          offset: 8 + 32, // discriminator + user
          bytes: projectConfigPubkey.toBase58(),
        }
      };

      // 重试查询质押记录
      let userStakes;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔍 刷新质押记录 (第 ${attempt}/${maxRetries} 次)...`);
          userStakes = await solanaProgram.account.userStakeInfo.all([userFilter, projectFilter]);
          console.log(`✅ 查询成功！Found ${userStakes.length} existing stakes for this user in this project.`);
          break; // 成功则跳出循环
        } catch (error) {
          console.error(`❌ 第 ${attempt} 次查询失败:`, error);
          
          if (attempt === maxRetries) {
            // 最后一次重试失败
            addResult(`❌ 刷新质押记录失败: 网络连接超时`);
            addResult(`💡 建议: 请检查网络连接或稍后重试`);
            return; // 直接返回，不继续处理
          }
          
          // 等待后重试
          const delay = attempt * 2000;
          console.log(`⏳ ${delay/1000} 秒后重试刷新...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      const records: StakeRecord[] = [];
      let maxStakeId = 0;

      for (const stake of userStakes) {
        const stakeInfo = stake.account;
        const amount = stakeInfo.amount.toNumber() / Math.pow(10, 9);
        const stakeDate = new Date(stakeInfo.stakeTimestamp.toNumber() * 1000);
        const endDate = new Date(stakeDate.getTime() + (stakeInfo.durationDays * 24 * 60 * 60 * 1000));
        const now = new Date();
        const canUnstake = now >= endDate;

        records.push({
          stakeId: stakeInfo.stakeId.toNumber(),
          amount,
          duration: stakeInfo.durationDays,
          stakeTimestamp: stakeDate,
          endTimestamp: endDate,
          isStaked: stakeInfo.isStaked,
          canUnstake,
          stakeInfoPda: stake.publicKey.toString()
        });

        // Track the highest stake ID found
        maxStakeId = Math.max(maxStakeId, stakeInfo.stakeId.toNumber());
      }

      // 更新下一个可用的 stake ID
      try {
        const nextId = await getNextStakeId(solanaProgram, userPublicKey, projectConfigPubkey);
        setNextStakeId(Number(nextId));
        
        const newRecords = records.sort((a, b) => b.stakeId - a.stakeId);
        setStakeRecords(newRecords);
        addResult(`📊 查询到 ${newRecords.length} 个质押记录，下一个可用 ID: ${Number(nextId)}`);
      } catch (nextIdError) {
        // 即使获取下一个 ID 失败，也要显示已有的记录
        console.error('获取下一个 stake ID 失败:', nextIdError);
        const newRecords = records.sort((a, b) => b.stakeId - a.stakeId);
        setStakeRecords(newRecords);
        addResult(`📊 查询到 ${newRecords.length} 个质押记录，下一个 ID 获取失败，将使用随机 ID`);
      }

    } catch (error) {
      console.error('Refresh stake records error:', error);
      addResult(`❌ 刷新质押记录失败: ${error.message}`);
    }
  };

    // 签名消息
    const handleSolanaSignMessage = async () => {
      if (!solanaProgram || !solanaConnection) {
        message.error('请先连接 Solana 钱包');
        return;
      }

      setLoading(true);
      try {
        const messageBytes = new TextEncoder().encode(signMessage);
        const signature = await solanaProgram.provider.wallet.signMessage(messageBytes);

        addResult(`Solana 消息签名成功: ${Buffer.from(signature).toString('hex').slice(0, 20)}...`);
        message.success('消息签名成功');
        console.log('Solana 签名结果:', signature);
      } catch (error) {
        console.log(error);
        handleContractError(error);
        addResult(`Solana 签名失败: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    // 查询 SOL 余额
    const handleCheckSOLBalance = async () => {
      if (!solanaConnection || !solanaProgram) {
        message.error('Solana 连接未建立');
        return;
      }

      setLoading(true);
      try {
        const publicKey = solanaProgram.provider.wallet.publicKey;

      if (!publicKey) {
        message.error('钱包未连接或无法获取用户公钥');
        return;
      }

        const balance = await solanaConnection.getBalance(publicKey);
        const solBalance = balance / 1000000000; // lamports to SOL

        addResult(`SOL 余额: ${solBalance.toFixed(4)} SOL`);
        message.success(`SOL 余额: ${solBalance.toFixed(4)} SOL`);
      } catch (error) {
        handleContractError(error);
        addResult(`查询 SOL 余额失败: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    const toPrivateKey = () => {
      // 您的私钥数组
      const privateKeyArray = new Uint8Array([104, 6, 27, 155, 224, 174, 1, 74, 31, 122, 9, 169, 139, 243, 245, 178, 51, 62, 178, 251, 223, 165, 114, 130, 221, 223, 189, 211, 211, 108, 114, 234, 166, 181, 206, 158, 177, 135, 230, 10, 6, 143, 200, 153, 178, 235, 105, 165, 170, 148, 170, 169, 97, 108, 202, 97, 159, 84, 49, 207, 127, 17, 47, 150]);

      // 方法1: 创建 Keypair 对象
      const keypair = Keypair.fromSecretKey(privateKeyArray);
      // 方法2: 转换为 Base58 格式（大多数钱包使用的格式）
      const base58PrivateKey = bs58.encode(privateKeyArray);
      console.log('Base58 私钥:', base58PrivateKey);

      // 获取公钥地址
      console.log('钱包地址:', keypair.publicKey.toString());
    }

  // Table columns for stake records
  const stakeColumns = [
    {
      title: 'Stake ID',
      dataIndex: 'stakeId',
      key: 'stakeId',
      render: (stakeId: number) => <Tag color="blue">#{stakeId}</Tag>
    },
    {
      title: '数量',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `${amount.toFixed(2)} tokens`
    },
    {
      title: '期限',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => `${duration} 天`
    },
    // {
    //   title: '状态',
    //   dataIndex: 'isStaked',
    //   key: 'isStaked',
    //   render: (isStaked: boolean, record: StakeRecord) => (
    //     <Tag color={isStaked ? 'green' : 'red'}>
    //       {isStaked ? '已质押' : '已解质押'}
    //     </Tag>
    //   )
    // },
    // {
    //   title: '解锁状态',
    //   dataIndex: 'canUnstake',
    //   key: 'canUnstake',
    //   render: (canUnstake: boolean, record: StakeRecord) => (
    //     record.isStaked ? (
    //       <Tag color={canUnstake ? 'green' : 'orange'}>
    //         {canUnstake ? '可解质押' : '锁定中'}
    //       </Tag>
    //     ) : <span>-</span>
    //   )
    // },
    {
      title: '质押时间',
      dataIndex: 'stakeTimestamp',
      key: 'stakeTimestamp',
      render: (stakeTimestamp: Date) => stakeTimestamp.toLocaleString()
    },
    {
      title: '结束时间',
      dataIndex: 'endTimestamp',
      key: 'endTimestamp',
      render: (endTimestamp: Date) => endTimestamp.toLocaleString()
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: StakeRecord) => (
        record.isStaked ? (
          <Space>
            <Button
              size="small"
              onClick={() => handleUnstake(record.stakeId)}
              disabled={!record.canUnstake || loading}
            >
              解质押
              </Button>
            <Button
              size="small"
              danger
              onClick={() => handleEmergencyUnstake(record.stakeId)}
              disabled={loading}
            >
              紧急解质押
              </Button>
          </Space>
        ) : <span>已完成</span>
      )
    }
  ];

  return (
    <div style={{ padding: '1.2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🧪 AIMonica Demo</h1>
      <p>
        当前连接:{' '}
        <strong>
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </strong>
      </p>
      
      {/* RPC 状态显示 */}
      {solanaConnection && (
        <p style={{ 
          padding: '8px 12px', 
          backgroundColor: solanaConnection.rpcEndpoint.includes('walletconnect') ? '#fff2f0' : '#f6ffed',
          border: `1px solid ${solanaConnection.rpcEndpoint.includes('walletconnect') ? '#ffccc7' : '#b7eb8f'}`,
          borderRadius: '4px',
          margin: '10px 0'
        }}>
          🔗 当前 RPC: <code>{solanaConnection.rpcEndpoint}</code>
          {solanaConnection.rpcEndpoint.includes('walletconnect') && (
            <span style={{ color: '#ff4d4f', marginLeft: '8px' }}>⚠️ 使用 WalletConnect RPC</span>
          )}
          {!solanaConnection.rpcEndpoint.includes('walletconnect') && (
            <span style={{ color: '#52c41a', marginLeft: '8px' }}>✅ 使用官方 RPC</span>
          )}
        </p>
      )}

      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: "1",
            label: "⚡ Solana 示例",
            children: <div>
              <Card title="Solana 功能示例">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Button onClick={toPrivateKey}>转成私钥</Button>

                  {/* 消息签名 */}
                  <div>
                    <h4>📝 消息签名</h4>
                    <Input
                      placeholder="输入要签名的消息"
                      value={signMessage}
                      onChange={(e) => setSignMessage(e.target.value)}
                    />
                    <Button onClick={handleSolanaSignMessage} loading={loading}>
                      签名消息
                    </Button>
                  </div>

                  {/* SOL 余额 */}
                  <div>
                    <h4>💸 SOL 余额</h4>
                    <Button onClick={handleCheckSOLBalance} loading={loading} type="primary" style={{ marginRight: '10px' }}>
                      查询 SOL 余额
                    </Button>
                  </div>

                  <Divider />

                  {/* 质押功能 */}
                  <div>
                    <h4>🥩 多次质押功能 (支持 Stake ID)</h4>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <label>质押数量: </label>
                        <InputNumber
                          value={stakeAmount}
                          onChange={(value) => setStakeAmount(value || 0)}
                          min={1}
                          max={1000}
                          step={1}
                          style={{ width: 120 }}
                        />
                        <span style={{ marginLeft: 8 }}>tokens</span>
                      </div>

                      <div>
                        <label>质押期限: </label>
                        <Select
                          value={stakeDuration}
                          onChange={setStakeDuration}
                          style={{ width: 120 }}
                        >
                          <Option value={7}>7 天</Option>
                          <Option value={14}>14 天</Option>
                          <Option value={30}>30 天</Option>
                        </Select>
                      </div>

                      <div>
                        <label>预估下一个 Stake ID: </label>
                        <Tag color="green">#{nextStakeId}</Tag>
                        <span style={{ marginLeft: 8, fontSize: '12px', color: '#666' }}>
                          (自动检测可用ID)
                        </span>
                      </div>

                      <Space wrap>
                        <Button
                          onClick={handleStake}
                          loading={loading}
                          type="primary"
                        >
                          创建新质押 (自动检测 ID)
                        </Button>

                        <Button
                          onClick={refreshStakeRecords}
                          loading={loading}
                        >
                          刷新质押记录
                        </Button>
                      </Space>
                    </Space>
                  </div>

                  <Divider />

                  {/* 质押记录表格 */}
                  <div>
                    <h4>📋 我的质押记录</h4>
                    <Table
                      columns={stakeColumns}
                      dataSource={stakeRecords}
                      rowKey="stakeId"
                      size="small"
                      pagination={false}
                      locale={{ emptyText: '暂无质押记录，请先创建质押' }}
                    />
                  </div>
                </Space>
              </Card>
            </div>
          }
        ]}
      />

      {/* 操作结果显示 */}
      {results.length > 0 && (
        <Card title="📋 操作记录" style={{ marginTop: 20 }}>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {results.map((result, index) => (
              <div
                key={index}
                style={{
                  padding: '5px 0',
                  borderBottom: index < results.length - 1 ? '1px solid #f0f0f0' : 'none',
                  fontSize: '16px',
                  color:
                    result.includes('失败') || result.includes('❌')
                      ? '#ff4d4f'
                      : result.includes('成功') || result.includes('✅') || result.includes('🎉')
                        ? '#52c41a'
                        : '#1890ff'
                }}>
                {result}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
