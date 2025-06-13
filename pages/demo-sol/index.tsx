import React, { useState, useEffect } from 'react';
import { Button, message, Card, Input, Tabs, Divider, Space, Select, InputNumber } from 'antd';
import { useAppKitAccount } from '@reown/appkit/react';
import { handleContractError } from '@/wallet/contracts';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import { usePageContext } from '@/context';
import * as anchor from '@coral-xyz/anchor';

const { Option } = Select;

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

  // Test account data from logs (already registered project)
  const PROJECT_CONFIG = "3fHbTJKEyCYFvs1MsPfeoaNri5vGJTGvTNgvmhx2XoDh";
  const USER_TOKEN_ACCOUNT = "9RxL2e3Xfy571X7wisRqoZv8Q9toNBukMU5JYFqyq2Eq";
  const VAULT = "EMNYpHerzkid8JzqXxVNqodDu9HYX8AzJnj17LirR2Xm";

  const addResult = (result: string) => {
    setResults((prev) => [`${new Date().toLocaleTimeString()}: ${result}`, ...prev.slice(0, 9)]);
  };

  // Stake tokens
  const handleStake = async () => {
    if (!solanaProgram || !solanaConnection) {
      message.error('请先连接 Solana 钱包');
      return;
    }

    if (!stakeAmount || stakeAmount <= 0) {
      message.error('请输入有效的质押数量');
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

      const projectConfigPubkey = new PublicKey(PROJECT_CONFIG);
      const userTokenAccount = new PublicKey(USER_TOKEN_ACCOUNT);
      const vault = new PublicKey(VAULT);

      // Find stake info PDA
      const [stakeInfoPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("stake"),
          projectConfigPubkey.toBuffer(),
          userPublicKey.toBuffer()
        ],
        solanaProgram.programId
      );

      const stakeAmountLamports = new anchor.BN(stakeAmount * Math.pow(10, 9)); // Assuming 9 decimals

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

      // 在浏览器环境中不需要显式传递 signers，钱包会自动处理签名
      const txid_stake = await solanaProgram.methods
        .stake(stakeAmountLamports, stakeDuration)
        .accounts(stakeAccounts)
        .rpc();
      console.log("stake transaction:", txid_stake);

      addResult(`✅ 质押成功: ${stakeAmount} tokens for ${stakeDuration} days`);
      addResult(`交易ID: ${txid_stake.slice(0, 20)}...`);
      message.success('质押成功！');
    } catch (error) {
      console.error('Stake error:', error);

      // 检查是否是账户已存在的错误
      if (error.message.includes('already in use') || error.message.includes('custom program error: 0x0')) {
        addResult(`❌ 质押失败: 你已经有一个活跃的质押记录`);
        addResult(`💡 设计说明: 每个用户同时只能有一个质押，这防止重复质押`);
        addResult(`🔄 如需重新质押: 先解质押 → 再质押`);
        message.error('你已经有活跃质押记录。每个用户同时只能有一个质押，请先解质押再重新质押');
      } else {
        handleContractError(error);
        addResult(`❌ 质押失败: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Unstake tokens
  const handleUnstake = async () => {
    if (!solanaProgram || !solanaConnection) {
      message.error('请先连接 Solana 钱包');
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
      const userTokenAccount = new PublicKey(USER_TOKEN_ACCOUNT);

      // Find stake info PDA
      const [stakeInfoPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("stake"),
          projectConfigPubkey.toBuffer(),
          userPublicKey.toBuffer()
        ],
        solanaProgram.programId
      );

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
        .unstake()
        .accounts(accounts)
        .rpc();

      console.log('Unstake transaction:', tx);
      addResult(`✅ 解质押成功`);
      addResult(`交易ID: ${tx.slice(0, 20)}...`);
      message.success('解质押成功！');
    } catch (error) {
      console.error('Unstake error:', error);
      handleContractError(error);
      addResult(`❌ 解质押失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Emergency unstake tokens
  const handleEmergencyUnstake = async () => {
    if (!solanaProgram || !solanaConnection) {
      message.error('请先连接 Solana 钱包');
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
      const userTokenAccount = new PublicKey(USER_TOKEN_ACCOUNT);

      // Find stake info PDA
      const [stakeInfoPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("stake"),
          projectConfigPubkey.toBuffer(),
          userPublicKey.toBuffer()
        ],
        solanaProgram.programId
      );

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
        .emergencyUnstake()
        .accounts(accounts)
        .rpc();

      console.log('Emergency unstake transaction:', tx);
      addResult(`✅ 紧急解质押成功（放弃奖励）`);
      addResult(`交易ID: ${tx.slice(0, 20)}...`);
      message.success('紧急解质押成功！');
    } catch (error) {
      console.error('Emergency unstake error:', error);
      handleContractError(error);
      addResult(`❌ 紧急解质押失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Check stake info
  const handleCheckStakeInfo = async () => {
    if (!solanaProgram || !solanaConnection) {
      message.error('请先连接 Solana 钱包');
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

      // Find stake info PDA
      const [stakeInfoPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("stake"),
          projectConfigPubkey.toBuffer(),
          userPublicKey.toBuffer()
        ],
        solanaProgram.programId
      );

      const stakeInfo = await solanaProgram.account.userStakeInfo.fetch(stakeInfoPda);

      const amount = stakeInfo.amount.toNumber() / Math.pow(10, 9); // Convert back from lamports
      const stakeDate = new Date(stakeInfo.stakeTimestamp.toNumber() * 1000);
      const endDate = new Date(stakeDate.getTime() + (stakeInfo.durationDays * 24 * 60 * 60 * 1000));
      const now = new Date();
      const canUnstake = now >= endDate;

      addResult(`📊 质押信息:`);
      addResult(`  数量: ${amount} tokens`);
      addResult(`  期限: ${stakeInfo.durationDays} 天`);
      addResult(`  质押时间: ${stakeDate.toLocaleString()}`);
      addResult(`  结束时间: ${endDate.toLocaleString()}`);
      addResult(`  状态: ${stakeInfo.isStaked ? '已质押' : '未质押'}`);
      addResult(`  ${canUnstake ? '✅ 可以解质押' : '⏳ 锁定期未结束'}`);

      message.success('查询质押信息成功');
    } catch (error) {
      console.error('Check stake info error:', error);
      if (error.message.includes('Account does not exist')) {
        addResult(`ℹ️ 没有找到质押记录`);
        message.info('没有找到质押记录');
      } else {
        handleContractError(error);
        addResult(`❌ 查询质押信息失败: ${error.message}`);
      }
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
                    <h4>🥩 质押功能</h4>
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

                      <Space wrap>
                        <Button
                          onClick={handleStake}
                          loading={loading}
                          type="primary"
                        >
                          质押代币
                        </Button>

                        <Button
                          onClick={handleUnstake}
                          loading={loading}
                        >
                          解质押
                        </Button>

                        <Button
                          onClick={handleEmergencyUnstake}
                          loading={loading}
                          danger
                        >
                          紧急解质押
                        </Button>

                        <Button
                          onClick={handleCheckStakeInfo}
                          loading={loading}
                        >
                          查询质押信息
                        </Button>
                      </Space>
                    </Space>
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
