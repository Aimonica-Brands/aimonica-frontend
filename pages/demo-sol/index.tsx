import React, { useState, useEffect } from 'react';
import { Button, message, Card, Input, Tabs, Divider, Space, Select, InputNumber, Table, Tag } from 'antd';
import { handleContractError } from '@/wallet/contracts';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import bs58 from 'bs58';
import { usePageContext } from '@/context';
import * as anchor from '@coral-xyz/anchor';
import { useAppKitNetwork } from '@reown/appkit/react';
import { getContractConfig } from '@/wallet';
import { useAppKitAccount } from '@reown/appkit/react';


export default function DemoSol() {
  const { Option } = Select;
  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();
  const { solanaConnection, solanaProgram, currentNetworkType } = usePageContext();

  const [loading, setLoading] = useState(false);
  const [signMessage, setSignMessage] = useState('Hello from AIMonica DApp!');
  const [results, setResults] = useState<string[]>([]);
  const [solanaBalance, setSolanaBalance] = useState<number>(0);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  // Stake related state
  const [stakeAmount, setStakeAmount] = useState<number>(10);
  const [stakeDuration, setStakeDuration] = useState<number>(7);
  const [nextStakeId, setNextStakeId] = useState<number>(1);
  const [stakeRecords, setStakeRecords] = useState([]);

  // Test account data from logs (updated with new addresses)
  const PROJECT_CONFIG = "57cN6zv7kJ8w2y28zk9EHbLpGwpN2TaRLYcQwbUZJjpA";
  const TOKEN_MINT = "EJmXTvmKixRrLrQURoE66zwoDMc28DaUMbG6i1XXNaDz";
  const VAULT = "6r9FaxNxJzkRtm9cj5ym3nVWu9dL2pNHHBhU99DVZiwA";

  useEffect(() => {
    if (solanaProgram && solanaConnection) {
      updateData();
    }
  }, [solanaConnection, solanaProgram]);

  const updateData = () => {
    getSOLBalance();
    getTokenBalance();
    refreshStakeRecords();
  }

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
  const getSOLBalance = async () => {
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
      setSolanaBalance(solBalance);
      addResult(`SOL 余额: ${solBalance.toFixed(4)} SOL`);
    } catch (error) {
      handleContractError(error);
      addResult(`查询 SOL 余额失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 查询代币余额
  const getTokenBalance = async () => {
    if (!solanaConnection || !solanaProgram) {
      message.error('Solana 连接未建立');
      return;
    }

    setLoading(true);
    try {
      const userPublicKey = solanaProgram.provider.wallet.publicKey;
      if (!userPublicKey) {
        message.error('钱包未连接或无法获取用户公钥');
        return;
      }

      const tokenMintPubkey = new PublicKey(TOKEN_MINT);
      const userTokenAccount = getUserTokenAccount(userPublicKey, tokenMintPubkey);

      try {
        const tokenAccount = await solanaConnection.getTokenAccountBalance(userTokenAccount);
        const balance = tokenAccount.value.uiAmount || 0;
        setTokenBalance(balance);
        addResult(`代币余额: ${balance.toFixed(2)} tokens`);
      } catch (error) {
        // 如果代币账户不存在，余额为0
        setTokenBalance(0);
        addResult('代币余额: 0 tokens (账户未创建)');
      }
    } catch (error) {
      handleContractError(error);
      addResult(`查询代币余额失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getPrivateKey = () => {
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


  const refreshStakeRecords = async () => {
    if (!solanaProgram || !solanaConnection) return null;

    const userPublicKey = solanaProgram.provider.wallet.publicKey;
    if (!userPublicKey) return null;

    const projectConfigPubkey = new PublicKey(PROJECT_CONFIG);

    // Use memcmp filters to efficiently query stake records
    const userFilter = {
      memcmp: {
        offset: 8,
        bytes: userPublicKey.toBase58(),
      }
    };

    const projectFilter = {
      memcmp: {
        offset: 8 + 32,
        bytes: projectConfigPubkey.toBase58(),
      }
    };

    const userStakes = await solanaProgram.account.userStakeInfo.all([userFilter, projectFilter]);
    if (!userStakes) return null;

    // Process stake records
    const records: any[] = [];
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
    }

    // Sort records by stake ID and update state
    const sortedRecords = records.sort((a, b) => b.stakeId - a.stakeId);
    setStakeRecords(sortedRecords);

    const nextId = sortedRecords[0].stakeId + 1;
    setNextStakeId(nextId);

    addResult(`📊 查询到 ${sortedRecords.length} 个质押记录，下一个可用 ID: ${nextId}`);
    console.log(`📊 查询到 ${sortedRecords.length} 个质押记录，下一个可用 ID: ${nextId}`)
    return sortedRecords;
  }

  // Combined function to fetch stake records and get next stake ID
  const getStakeRecords = async (stakeType: string, stakeId: number, stakeAmount: number) => {
    if (!solanaProgram || !solanaConnection) return null;

    try {
      // Retry logic for fetching stake records
      let records;
      const maxRetries = 10;
      let retryCount = 0;

      const fetchStakes = async () => {
        try {
          console.log(`🔍 查询质押记录 (第 ${retryCount + 1}/${maxRetries} 次)...`);
          records = await refreshStakeRecords()
          return records;
        } catch (error) {
          console.error(`❌ 第 ${retryCount + 1} 次查询失败:`, error);
          if (retryCount >= maxRetries - 1) {
            addResult(`❌ 查询质押记录失败: 网络连接超时`);
            return null;
          }
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
          return fetchStakes();
        }
      };

      // If we're waiting for a new stake, start polling
      if (stakeId && stakeAmount) {
        const pollInterval = 5000;

        const pollForNewStake = async (): Promise<typeof records> => {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.log('⚠️ 达到最大重试次数，但交易可能已成功');
            return records;
          }

          console.log(`⏳ 等待交易确认 (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, pollInterval));

          const currentRecords = await fetchStakes();
          if (!currentRecords) return null;

          if (stakeType === "stake") {
            const newStake = currentRecords.find(stake =>
              stake.stakeId === stakeId
            );
            if (newStake) {
              console.log('✅ 新质押记录已确认:', newStake);
              return currentRecords;
            }
          } else if (stakeType === "unstake" || stakeType === "emergencyUnstake") {
            const existingStake = currentRecords.find(stake =>
              stake.stakeId === stakeId
            );
            if (!existingStake) {
              console.log('✅ 解质押记录已确认: 原质押记录已移除');
              return currentRecords;
            }
          }

          return pollForNewStake();
        };

        records = await pollForNewStake();
        if (!records) return null;
      }

      return records;
    } catch (error) {
      console.error('Refresh stake records error:', error);
      addResult(`❌ 刷新质押记录失败: ${error.message}`);
      return null;
    }
  };

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

      const projectConfigPubkey = new PublicKey(PROJECT_CONFIG);
      const tokenMintPubkey = new PublicKey(TOKEN_MINT);
      const vault = new PublicKey(VAULT);

      // Use the next stake ID from state
      console.log('质押ID:', nextStakeId, '数量:', stakeAmount);

      // Generate user token account
      const userTokenAccount = getUserTokenAccount(userPublicKey, tokenMintPubkey);
      console.log('用户代币账户:', userTokenAccount.toString());

      // Generate stake info PDA
      const stakeInfoPda = await getStakeInfoPda(userPublicKey, projectConfigPubkey, nextStakeId);

      const stakeAmountLamports = new anchor.BN(stakeAmount * Math.pow(10, 9));
      const stakeIdBN = new anchor.BN(nextStakeId);

      const stakeAccounts = {
        projectConfig: projectConfigPubkey,
        stakeInfo: stakeInfoPda,
        user: userPublicKey,
        userTokenAccount: userTokenAccount,
        vault: vault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      };

      console.log("质押账户:", JSON.stringify(stakeAccounts, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2));

      // Send stake transaction
      console.log('发送质押交易...');
      const tx = await solanaProgram.methods
        .stake(stakeAmountLamports, stakeDuration, stakeIdBN)
        .accounts(stakeAccounts)
        .rpc();

      const contractConfig = getContractConfig((caipNetwork as any).network);
      const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx}?cluster=${contractConfig.cluster}`;
      addResult(`🔗 质押交易已发送: ${txLink}`);
      message.success(`质押成功，请等待交易确认`);

      // Wait for the new stake to be confirmed
      await getStakeRecords("stake", nextStakeId, stakeAmount);
    } catch (error) {
      console.error('质押失败:', error);
      handleContractError(error);
      addResult(`❌ 质押失败: ${error.message}`);
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
      const vault = new PublicKey(VAULT);

      // 获取用户的质押记录
      const stakeRecord = stakeRecords.find(record => record.stakeId === stakeId);
      if (!stakeRecord) {
        message.error('未找到对应的质押记录');
        return;
      }

      // 检查是否可以解质押
      if (!stakeRecord.canUnstake) {
        message.error('质押期限未到，无法解质押');
        return;
      }

      console.log('解质押ID:', stakeId, '数量:', stakeRecord.amount);

      // 生成用户代币账户
      const userTokenAccount = getUserTokenAccount(userPublicKey, tokenMintPubkey);
      console.log('用户代币账户:', userTokenAccount.toString());

      // 生成质押信息 PDA
      const stakeInfoPda = await getStakeInfoPda(userPublicKey, projectConfigPubkey, stakeId);
      console.log('质押信息 PDA:', stakeInfoPda.toString());

      // 获取项目配置
      const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPubkey);
      console.log('项目配置:', projectConfig);

      // 生成 vault authority PDA
      const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("vault-authority"),
          projectConfig.projectId.toArrayLike(Buffer, 'le', 8)
        ],
        solanaProgram.programId
      );
      console.log('Vault 权限 PDA:', vaultAuthorityPda.toString());

      const unstakeAccounts = {
        projectConfig: projectConfigPubkey,
        stakeInfo: stakeInfoPda,
        user: userPublicKey,
        userTokenAccount: userTokenAccount,
        vault: vault,
        vaultAuthority: vaultAuthorityPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      };

      console.log("解质押账户:", JSON.stringify(unstakeAccounts, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2));

      // 发送解质押交易
      console.log('发送解质押交易...');
      const tx = await solanaProgram.methods
        .unstake(new anchor.BN(stakeId))
        .accounts(unstakeAccounts)
        .rpc();

      const contractConfig = getContractConfig((caipNetwork as any).network);
      const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx}?cluster=${contractConfig.cluster}`;
      addResult(`🔗 解质押交易已发送: ${txLink}`);
      message.success(`解质押成功，请等待交易确认`);

      // 等待交易确认并刷新记录
      await getStakeRecords("unstake", stakeId, stakeRecord.amount);
    } catch (error) {
      console.error('解质押失败:', error);
      handleContractError(error);
      addResult(`❌ 解质押失败: ${error.message}`);
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
      const vault = new PublicKey(VAULT);

      // 获取用户的质押记录
      const stakeRecord = stakeRecords.find(record => record.stakeId === stakeId);
      if (!stakeRecord) {
        message.error('未找到对应的质押记录');
        return;
      }

      console.log('紧急解质押ID:', stakeId, '数量:', stakeRecord.amount);

      // 生成用户代币账户
      const userTokenAccount = getUserTokenAccount(userPublicKey, tokenMintPubkey);
      console.log('用户代币账户:', userTokenAccount.toString());

      // 生成质押信息 PDA
      const stakeInfoPda = await getStakeInfoPda(userPublicKey, projectConfigPubkey, stakeId);
      console.log('质押信息 PDA:', stakeInfoPda.toString());

      // 获取项目配置
      const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPubkey);
      console.log('项目配置:', projectConfig);

      // 生成 vault authority PDA
      const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("vault-authority"),
          projectConfig.projectId.toArrayLike(Buffer, 'le', 8)
        ],
        solanaProgram.programId
      );
      console.log('Vault 权限 PDA:', vaultAuthorityPda.toString());

      const emergencyUnstakeAccounts = {
        projectConfig: projectConfigPubkey,
        stakeInfo: stakeInfoPda,
        user: userPublicKey,
        userTokenAccount: userTokenAccount,
        vault: vault,
        vaultAuthority: vaultAuthorityPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      };

      console.log("紧急解质押账户:", JSON.stringify(emergencyUnstakeAccounts, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2));

      // 发送紧急解质押交易
      console.log('发送紧急解质押交易...');
      const tx = await solanaProgram.methods
        .emergencyUnstake(new anchor.BN(stakeId))
        .accounts(emergencyUnstakeAccounts)
        .rpc();

      const contractConfig = getContractConfig((caipNetwork as any).network);
      const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx}?cluster=${contractConfig.cluster}`;
      addResult(`🔗 紧急解质押交易已发送: ${txLink}`);
      message.success(`紧急解质押成功，请等待交易确认`);

      // 等待交易确认并刷新记录
      await getStakeRecords("emergencyUnstake", stakeId, stakeRecord.amount);
    } catch (error) {
      console.error('紧急解质押失败:', error);
      handleContractError(error);
      addResult(`❌ 紧急解质押失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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
      key: 'action',
      render: (_, record: any) => (
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={() => handleUnstake(record.stakeId)}
            loading={loading}
            disabled={!record.canUnstake}
          >
            解质押
          </Button>
          <Button
            type="primary"
            danger
            size="small"
            onClick={() => handleEmergencyUnstake(record.stakeId)}
            loading={loading}
          >
            紧急解质押
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '1.2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🧪 AIMonica Demo</h1>
      <p>
        当前连接:{' '}
        <strong>
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </strong>
        ({currentNetworkType === 'eip155' ? 'EVM' : currentNetworkType === 'solana' ? 'Solana' : '未知网络'})
      </p>

      {
        currentNetworkType === 'solana' ? <Card title="Solana 功能示例">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Button onClick={getPrivateKey}>获取私钥</Button>

            {/* 消息签名 */}
            {/* <div>
            <h4>📝 消息签名</h4>
            <Input
              placeholder="输入要签名的消息"
              value={signMessage}
              onChange={(e) => setSignMessage(e.target.value)}
            />
            <Button onClick={handleSolanaSignMessage} loading={loading}>
              签名消息
            </Button>
          </div> */}

            {/* 余额显示 */}
            <div>
              <h4>💸 余额信息</h4>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <label>SOL 余额: </label>
                  <Tag color="blue">{solanaBalance.toFixed(4)} SOL</Tag>
                </div>
                <div>
                  <label>代币余额: </label>
                  <Tag color="green">{tokenBalance.toFixed(2)} tokens</Tag>
                </div>
                <Space>
                  <Button
                    onClick={getSOLBalance}
                    loading={loading}
                    type="primary"
                  >
                    刷新 SOL 余额
                  </Button>
                  <Button
                    onClick={getTokenBalance}
                    loading={loading}
                    type="primary"
                  >
                    刷新代币余额
                  </Button>
                </Space>
              </Space>
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
                  <label>下一个 Stake ID: </label>
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
                    onClick={() => refreshStakeRecords()}
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
        </Card> :
          <Card>
            <p>请切换到 Solana 网络 (Solana 或 Solana Sepolia) 来测试 Solana 功能</p>
          </Card>
      }


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
