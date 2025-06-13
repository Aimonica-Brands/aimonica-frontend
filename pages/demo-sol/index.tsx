import React, { useState, useEffect } from 'react';
import { Button, message, Card, Input, Tabs, Divider, Space } from 'antd';
import { useAppKitAccount } from '@reown/appkit/react';
import { handleContractError } from '@/wallet/contracts';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { usePageContext } from '@/context';





export default function DemoSol() {
  const { address, isConnected } = useAppKitAccount();
  const {
    solanaConnection,
    solanaProgram,
    anchorProvider,
    walletProvider,
  } = usePageContext();

  const [loading, setLoading] = useState(false);
  const [signMessage, setSignMessage] = useState('Hello from AIMonica DApp!');
  const [results, setResults] = useState<string[]>([]);






  const addResult = (result: string) => {
    setResults((prev) => [`${new Date().toLocaleTimeString()}: ${result}`, ...prev.slice(0, 9)]);
  };






  // Solana 示例
  const SolanaExamples = () => {

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

    return (
      <div>
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

            {/* SOL 转账 */}
            <div>
              <h4>💸 SOL 余额</h4>
              <Button onClick={handleCheckSOLBalance} loading={loading} type="primary" style={{ marginRight: '10px' }}>
                查询 SOL 余额
              </Button>
            </div>
          </Space>
        </Card>
      </div>
    );
  };



  return (
    <div style={{ padding: '1.2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🧪 AIMonica Demo</h1>
      <p>
        当前连接:{' '}
        <strong>
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </strong>
      </p>

      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: "1",
            label: "⚡ Solana 示例",
            children: <SolanaExamples />
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
