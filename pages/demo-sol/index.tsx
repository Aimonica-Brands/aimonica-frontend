import React, { useState, useEffect } from 'react';
import { Button, message, Card, Input, Tabs, Divider, Space, Select, InputNumber, Table, Tag } from 'antd';
import { useAppKitAccount } from '@reown/appkit/react';
import { handleContractError } from '@/wallet/contracts';
import { Keypair, PublicKey, SystemProgram, Connection } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import bs58 from 'bs58';
import { usePageContext } from '@/context';
import * as anchor from '@coral-xyz/anchor';


const { Option } = Select;



export default function DemoSol() {
  const { address, isConnected } = useAppKitAccount();
  const { solanaConnection, solanaProgram, } = usePageContext();

  const [loading, setLoading] = useState(false);
  const [signMessage, setSignMessage] = useState('Hello from AIMonica DApp!');
  const [results, setResults] = useState<string[]>([]);

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
    const fetchStakeRecords = async () => {
      await refreshStakeRecords();
    };
    if (solanaProgram && solanaConnection) {
      fetchStakeRecords();
    }
  }, [solanaConnection, solanaProgram]);

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

  // Combined function to fetch stake records and get next stake ID
  const refreshStakeRecords = async (options?: {
    stakeId: number;
    amount: number;
  }) => {
    if (!solanaProgram || !solanaConnection) return null;

    try {
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

      // Retry logic for fetching stake records
      let userStakes;
      const maxRetries = 10;
      let retryCount = 0;
      let previousStakeCount = 0;

      const fetchStakes = async () => {
        try {
          console.log(`🔍 查询质押记录 (第 ${retryCount + 1}/${maxRetries} 次)...`);
          userStakes = await solanaProgram.account.userStakeInfo.all([userFilter, projectFilter]);
          console.log(`✅ 查询成功！Found ${userStakes.length} existing stakes`);
          return userStakes;
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

      // Initial fetch
      userStakes = await fetchStakes();
      if (!userStakes) return null;

      // If we're waiting for a new stake, start polling
      if (options?.stakeId && options?.amount) {
        const { stakeId, amount } = options;
        const pollInterval = 3000;
        previousStakeCount = userStakes.length;

        const pollForNewStake = async (): Promise<typeof userStakes> => {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.log('⚠️ 达到最大重试次数，但交易可能已成功');
            return userStakes;
          }

          console.log(`⏳ 等待交易确认 (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, pollInterval));

          const currentStakes = await fetchStakes();
          if (!currentStakes) return null;

          const currentStakeCount = currentStakes.length;
          console.log(`📊 当前质押记录数: ${currentStakeCount}, 之前: ${previousStakeCount}`);

          if (currentStakeCount > previousStakeCount) {
            const newStake = currentStakes.find(stake =>
              stake.account.stakeId.toNumber() === stakeId &&
              stake.account.amount.toNumber() / Math.pow(10, 9) === amount
            );

            if (newStake) {
              console.log('✅ 新质押记录已确认:', newStake);
              return currentStakes;
            }
          }

          previousStakeCount = currentStakeCount;
          return pollForNewStake();
        };

        userStakes = await pollForNewStake();
        if (!userStakes) return null;
      }

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

      // Set next stake ID (current count + 1)
      const nextId = userStakes.length + 1;
      setNextStakeId(nextId);

      addResult(`📊 查询到 ${sortedRecords.length} 个质押记录，下一个可用 ID: ${nextId}`);

      return userStakes;
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

      addResult(`✅ 使用 RPC: ${solanaConnection.rpcEndpoint}`);

      const projectConfigPubkey = new PublicKey(PROJECT_CONFIG);
      const tokenMintPubkey = new PublicKey(TOKEN_MINT);
      const vault = new PublicKey(VAULT);

      // Use the next stake ID from state
      const availableStakeId = nextStakeId;
      console.log('Using stake ID:', availableStakeId);

      // Generate user token account
      const userTokenAccount = getUserTokenAccount(userPublicKey, tokenMintPubkey);
      console.log('User token account:', userTokenAccount.toString());

      // Generate stake info PDA
      const stakeInfoPda = await getStakeInfoPda(userPublicKey, projectConfigPubkey, availableStakeId);

      const stakeAmountLamports = new anchor.BN(stakeAmount * Math.pow(10, 9));
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

      console.log("Stake accounts:", JSON.stringify(stakeAccounts, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2));

      // Send stake transaction
      console.log('Sending stake transaction...');
      const tx = await solanaProgram.methods
        .stake(stakeAmountLamports, stakeDuration, stakeIdBN)
        .accounts(stakeAccounts)
        .rpc();

      console.log("✅ Transaction sent! Hash:", tx);
      addResult(`🚀 交易已发送! Hash: ${tx}`);
      addResult(`🔗 查看交易: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

      // Wait for the new stake to be confirmed
      const userStakes = await refreshStakeRecords({
        stakeId: availableStakeId,
        amount: stakeAmount
      });

      if (userStakes) {
        const newStake = userStakes.find(stake =>
          stake.account.stakeId.toNumber() === availableStakeId &&
          stake.account.amount.toNumber() / Math.pow(10, 9) === stakeAmount
        );

        if (newStake) {
          addResult(`✅ 质押成功: ${stakeAmount} tokens for ${stakeDuration} days (Stake ID: ${availableStakeId})`);
          message.success(`质押成功！Stake ID: ${availableStakeId}`);
        } else {
          addResult(`⚠️ 交易可能已成功，但未及时确认`);
          message.warning('交易已发送，但确认超时。请检查 Solana Explorer 确认状态。');
        }
      }

    } catch (error) {
      console.error('Stake error:', error);
      handleContractError(error);
      addResult(`❌ 质押失败: ${error.message}`);
    } finally {
      setLoading(false);
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
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#f6ffed',
          border: `1px solid #b7eb8f`,
          borderRadius: '4px',
          margin: '10px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            🔗 当前 RPC: <code>{solanaConnection.rpcEndpoint}</code>
          </div>
        </div>
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
