import React, { useState, useEffect } from 'react';
import { Button, Card, App, Tabs, Divider, Space, Tag, InputNumber, Table } from 'antd';
import { useAppKitAccount } from '@reown/appkit/react';
import { usePageContext } from '@/context';
import { ethers } from 'ethers';
import { handleContractError } from '@/wallet/contracts';

export default function DemoEvm() {
  const { message } = App.useApp();
  const { address, isConnected } = useAppKitAccount();
  const {
    provider,
    evmTokenContract,
    evmStakingContract,
    currentNetworkType,
  } = usePageContext();

  const [loading, setLoading] = useState(false);
  const [signMessage, setSignMessage] = useState('Hello from AIMonica DApp!');
  const [results, setResults] = useState<string[]>([]);
  const [ETHBalance, setETHBalance] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  // Stake related state
  const [stakeAmount, setStakeAmount] = useState<number>(10);
  const [stakeDuration, setStakeDuration] = useState<number>(7);
  const [stakeRecords, setStakeRecords] = useState([]);
  const [isApproved, setIsApproved] = useState(false);

  // Project ID for staking
  // AIM001
  const PROJECT_ID = "0x41494d3030310000000000000000000000000000000000000000000000000000";

  useEffect(() => {
    if (provider && evmTokenContract && evmStakingContract) {
      updateData();
    }
  }, [provider, evmTokenContract, evmStakingContract]);

  const updateData = () => {
    getETHBalance();
    getTokenBalance();
    refreshStakeRecords();
  }

  const addResult = (result: string) => {
    setResults((prev) => [`${new Date().toLocaleTimeString()}: ${result}`, ...prev.slice(0, 9)]);
  };

  // 查询 ETH 余额
  const getETHBalance = async () => {
    if (!provider || !address) {
      message.error('请先连接 EVM 钱包');
      return;
    }

    setLoading(true);
    try {
      const balance = await provider.getBalance(address);
      const ethBalance = Number(ethers.formatEther(balance));
      setETHBalance(ethBalance);
      addResult(`ETH 余额: ${ethBalance.toFixed(4)} ETH`);
    } catch (error) {
      handleContractError(error);
      addResult(`查询 ETH 余额失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 查询代币余额
  const getTokenBalance = async () => {
    if (!evmTokenContract || !address) {
      message.error('代币合约未初始化');
      return;
    }

    setLoading(true);
    try {
      const _balance = await evmTokenContract.balanceOf(address);
      const balanceInEther = Number(ethers.formatEther(_balance));
      setTokenBalance(balanceInEther);
      addResult(`代币余额: ${balanceInEther.toFixed(2)} tokens`);

      if (balanceInEther > 0) {
        const stakingContractAddress = await evmStakingContract.getAddress();
        const allowance = await evmTokenContract.allowance(address, stakingContractAddress);
        const allowanceInEther = Number(ethers.formatEther(allowance));
        setIsApproved(allowanceInEther >= balanceInEther);
      }
    } catch (error) {
      handleContractError(error);
      addResult(`查询代币余额失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 授权代币
  const handleApprove = async () => {
    if (!evmTokenContract || !evmStakingContract) {
      message.error('合约未初始化');
      return;
    }

    setLoading(true);
    try {
      const stakingContractAddress = await evmStakingContract.getAddress();
      const tx = await evmTokenContract.approve(
        stakingContractAddress,
        ethers.parseEther('1000000') // 授权 100万代币
      );

      addResult(`🔗 授权交易已发送: ${tx.hash}`);
      message.success('授权交易已发送，等待确认...');

      await tx.wait();
      await getTokenBalance();

      addResult(`✅ 授权成功`);
      message.success('授权成功');
    } catch (error) {
      handleContractError(error);
      addResult(`❌ 授权失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 刷新质押记录
  const refreshStakeRecords = async () => {
    if (!evmStakingContract || !address) return;

    try {
      const userStakes = await evmStakingContract.getUserStakes(address);
      const records = [];

      for (const stakeId of userStakes) {
        const stake = await evmStakingContract.stakes(stakeId);
        const projectIdStr = ethers.decodeBytes32String(stake.projectId);
        const stakedAt = Number(stake.stakedAt) * 1000;
        const unlockedAt = Number(stake.unlockedAt) * 1000;
        const now = new Date().getTime();
        const canUnstake = now >= unlockedAt;

        // status: 0=Active, 1=Unstaked, 2=EmergencyUnstaked
        records.push({
          projectId: projectIdStr,
          stakeId: Number(stake.stakeId),
          amount: Number(ethers.formatEther(stake.amount)),
          stakedAtStr: new Date(stakedAt).toLocaleString(),
          duration: Number(stake.duration) / 86400,
          unlockedAtStr: new Date(unlockedAt).toLocaleString(),
          canUnstake,
          status: Number(stake.status),
        });
      }

      // 按 stakeId 倒序排列
      const sortedRecords = records.sort((a, b) => b.stakeId - a.stakeId);
      setStakeRecords(sortedRecords);
    } catch (error) {
      console.error('刷新质押记录失败:', error);
    }
  };

  // 质押代币
  const handleStake = async () => {
    if (!evmStakingContract || !address) {
      message.error('请先连接 EVM 钱包');
      return;
    }

    if (!stakeAmount || stakeAmount <= 0) {
      message.error('请输入有效的质押数量');
      return;
    }

    if (!tokenBalance) {
      message.error('余额不足');
      return;
    }

    if (loading) {
      message.warning('操作正在进行中，请勿重复点击');
      return;
    }

    setLoading(true);
    try {
      const amount = ethers.parseEther(stakeAmount.toString());
      const tx = await evmStakingContract.stake(amount, stakeDuration, PROJECT_ID);

      addResult(`🔗 质押交易已发送: ${tx.hash}`);
      message.success('质押交易已发送，等待确认...');

      await tx.wait();
      addResult(`✅ 质押成功`);
      message.success('质押成功');

      // 刷新质押记录
      updateData();
    } catch (error) {
      handleContractError(error);
      addResult(`❌ 质押失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


  // 解质押
  const handleUnstake = async (stakeId: number) => {
    if (!evmStakingContract || !address) {
      message.error('请先连接 EVM 钱包');
      return;
    }

    if (loading) {
      message.warning('操作正在进行中，请勿重复点击');
      return;
    }

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

    setLoading(true);
    try {
      const tx = await evmStakingContract.unstake(stakeId);

      addResult(`🔗 解质押交易已发送: ${tx.hash}`);
      message.success('解质押交易已发送，等待确认...');

      await tx.wait();
      addResult(`✅ 解质押成功`);
      message.success('解质押成功');

      // 刷新质押记录
      updateData();
    } catch (error) {
      handleContractError(error);
      addResult(`❌ 解质押失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 紧急解质押
  const handleEmergencyUnstake = async (stakeId: number) => {
    if (!evmStakingContract || !address) {
      message.error('请先连接 EVM 钱包');
      return;
    }

    if (loading) {
      message.warning('操作正在进行中，请勿重复点击');
      return;
    }

    setLoading(true);
    try {
      const tx = await evmStakingContract.emergencyUnstake(stakeId);

      addResult(`🔗 紧急解质押交易已发送: ${tx.hash}`);
      message.success('紧急解质押交易已发送，等待确认...');

      await tx.wait();
      addResult(`✅ 紧急解质押成功`);
      message.success('紧急解质押成功');

      // 刷新质押记录
      updateData();
    } catch (error) {
      handleContractError(error);
      addResult(`❌ 紧急解质押失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const columns: any[] = [
    {
      title: '项目',
      dataIndex: 'projectId',
      key: 'projectId',
      render: (projectId: string) => <Tag color="blue">{projectId}</Tag>
    },
    {
      title: '质押ID',
      dataIndex: 'stakeId',
      key: 'stakeId',
      render: (stakeId: number) => <Tag color="blue">#{stakeId}</Tag>
    },
    {
      title: '数量',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `${amount.toFixed(2)} tokens`,
    },

    {
      title: '期限',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => `${duration} 天`,
    },
    {
      title: '质押时间',
      dataIndex: 'stakedAtStr',
      key: 'stakedAtStr',
    },
    {
      title: '解锁时间',
      dataIndex: 'unlockedAtStr',
      key: 'unlockedAtStr',
    },
    {
      title: '状态',
      dataIndex: 'statusText',
      key: 'statusText',
      render: (_, record) => {
        if (record.status == 0) return <Tag color="green">Active</Tag>;
        if (record.status == 1) return <Tag color="blue">Unstaked</Tag>;
        if (record.status == 2) return <Tag color="red">EmergencyUnstaked</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            onClick={() => handleUnstake(record.stakeId)}
            loading={loading}
            disabled={!record.canUnstake}
          >
            解质押
          </Button>
          <Button
            danger
            onClick={() => handleEmergencyUnstake(record.stakeId)}
            loading={loading}
            disabled={record.status == 2}
          >
            紧急解质押
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '1.2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <p>
        当前连接:{' '}
        <strong>
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </strong>
        ({currentNetworkType === 'eip155' ? 'EVM' : currentNetworkType === 'solana' ? 'Solana' : '未知网络'})
      </p>

      {
        currentNetworkType === 'eip155' ? <Card title="EVM 功能示例">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* 余额显示 */}
            <div>
              <h4>💸 余额信息</h4>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <label>ETH 余额: </label>
                  <Tag color="blue">{ETHBalance.toFixed(4)} ETH</Tag>
                </div>
                <div>
                  <label>代币余额: </label>
                  <Tag color="green">{tokenBalance.toFixed(2)} tokens</Tag>
                </div>
                <Space>
                  <Button
                    onClick={getETHBalance}
                    loading={loading}
                    type="primary"
                  >
                    刷新 ETH 余额
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

            {/* 质押功能 */}
            <div>
              <h4>💎 质押功能</h4>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <label>质押数量: </label>
                  <InputNumber
                    min={1}
                    value={stakeAmount}
                    onChange={(value) => setStakeAmount(value || 0)}
                    style={{ width: '200px' }}
                  />
                </div>
                <div>
                  <label>质押期限: </label>
                  <Space>
                    <Button
                      type={stakeDuration === 7 ? 'primary' : 'default'}
                      onClick={() => setStakeDuration(7)}
                    >
                      7天
                    </Button>
                    <Button
                      type={stakeDuration === 14 ? 'primary' : 'default'}
                      onClick={() => setStakeDuration(14)}
                    >
                      14天
                    </Button>
                    <Button
                      type={stakeDuration === 30 ? 'primary' : 'default'}
                      onClick={() => setStakeDuration(30)}
                    >
                      30天
                    </Button>
                  </Space>
                </div>
                <Space>
                  {!isApproved ? (
                    <Button
                      onClick={handleApprove}
                      loading={loading}
                      type="primary"
                    >
                      授权代币
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStake}
                      loading={loading}
                      type="primary"
                    >
                      质押
                    </Button>
                  )}
                </Space>
              </Space>
            </div>

            {/* 质押记录 */}
            <div style={{ width: '100%' }}>
              <h4>📋 质押记录</h4>
              <Table
                scroll={{ x: "max-content" }}
                columns={columns}
                dataSource={stakeRecords}
                rowKey="stakeId"
                pagination={false}
              />
            </div>
          </Space>
        </Card> :
          <Card>
            <p>请切换到 EVM 网络 (Base 或 Base Sepolia) 来测试 EVM 功能</p>
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
