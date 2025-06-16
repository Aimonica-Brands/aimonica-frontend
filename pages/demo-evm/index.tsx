import React, { useState, useEffect } from 'react';
import { Button, message, Card, Input, Tabs, Divider, Space } from 'antd';
import { useAppKitAccount } from '@reown/appkit/react';
import { usePageContext } from '@/context';
import { ethers } from 'ethers';
import { handleContractError } from '@/wallet/contracts';
import { getCurrentEnv } from '@/pages/api/auth/utils';

export default function DemoEvm() {
  const { address, isConnected } = useAppKitAccount();
  const {
    provider,
    USDCContract,
    GPDUSDCContract,
    currentNetworkType,
  } = usePageContext();

  const [loading, setLoading] = useState(false);
  const [signMessage, setSignMessage] = useState('Hello from AIMonica DApp!');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [results, setResults] = useState<string[]>([]);

  // 环境配置
  const envConfig = getCurrentEnv();

  const addResult = (result: string) => {
    setResults((prev) => [`${new Date().toLocaleTimeString()}: ${result}`, ...prev.slice(0, 9)]);
  };

  // 签名消息
  const handleSignMessage = async () => {
    if (!provider || !address) {
      message.error('请先连接 EVM 钱包');
      return;
    }

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(signMessage);

      addResult(`EVM 消息签名成功: ${signature.slice(0, 20)}...`);
      message.success('消息签名成功');
      console.log('签名结果:', signature);
    } catch (error) {
      handleContractError(error);
      addResult(`EVM 签名失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 发送 ETH
  const handleSendETH = async () => {
    if (!provider || !address || !transferTo) {
      message.error('请填写完整信息');
      return;
    }

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: transferTo,
        value: ethers.parseEther(transferAmount)
      });

      addResult(`ETH 转账交易发送: ${tx.hash}`);
      message.success('交易已发送，等待确认...');

      const receipt = await tx.wait();
      addResult(`ETH 转账确认: 区块 ${receipt.blockNumber}`);
      message.success('转账成功');
    } catch (error) {
      handleContractError(error);
      addResult(`ETH 转账失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 查询 USDC 余额
  const handleCheckUSDCBalance = async () => {
    if (!USDCContract || !address) {
      message.error('USDC 合约未初始化');
      return;
    }

    setLoading(true);
    try {
      const balance = await USDCContract.balanceOf(address);
      const formattedBalance = ethers.formatUnits(balance, 6);

      addResult(`USDC 余额: ${formattedBalance}`);
      message.success(`USDC 余额: ${formattedBalance}`);
    } catch (error) {
      handleContractError(error);
      addResult(`查询 USDC 余额失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 授权 USDC
  const handleApproveUSDC = async () => {
    if (!USDCContract || !GPDUSDCContract) {
      message.error('合约未初始化');
      return;
    }

    setLoading(true);
    try {
      const tx = await USDCContract.approve(
        await GPDUSDCContract.getAddress(),
        ethers.parseUnits('1000', 6) // 授权 1000 USDC
      );

      addResult(`USDC 授权交易: ${tx.hash}`);
      message.success('授权交易已发送...');

      await tx.wait();
      addResult(`USDC 授权成功`);
      message.success('USDC 授权成功');
    } catch (error) {
      handleContractError(error);
      addResult(`USDC 授权失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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
        currentNetworkType === 'eip155' ? (
          <Card title="EVM 功能示例">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* 消息签名 */}
              <div>
                <h4>📝 消息签名</h4>
                <Input
                  placeholder="输入要签名的消息"
                  value={signMessage}
                  onChange={(e) => setSignMessage(e.target.value)}
                />
                <Button onClick={handleSignMessage} loading={loading}>
                  签名消息
                </Button>
              </div>

              {/* ETH 转账 */}
              <div>
                <h4>💸 ETH 转账</h4>
                <Input placeholder="接收地址" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} />
                <Input
                  placeholder="转账金额 (ETH)"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                />
                <Button onClick={handleSendETH} loading={loading} type="primary">
                  发送 ETH
                </Button>
              </div>

              {/* USDC 操作 */}
              <div>
                <h4>🪙 USDC 操作</h4>
                <Space>
                  <Button onClick={handleCheckUSDCBalance} loading={loading}>
                    查询 USDC 余额
                  </Button>
                  <Button onClick={handleApproveUSDC} loading={loading}>
                    授权 USDC
                  </Button>
                </Space>
              </div>
            </Space>
          </Card>
        ) : (
          <Card>
            <p>请切换到 EVM 网络 (Base 或 Base Sepolia) 来测试 EVM 功能</p>
          </Card>
        )
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
