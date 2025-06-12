import React, { useState } from 'react';
import { Button, message, Card, Input, Tabs, Divider, Space } from 'antd';
import { useAppKitAccount } from '@reown/appkit/react';
import { usePageContext } from '@/context';
import { ethers } from 'ethers';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { handleContractError } from '@/wallet/contracts';
import { useSession, signIn, signOut } from 'next-auth/react';
import { shareOnTwitter, createShareMessages } from '@/utils/twitter';

const { TabPane } = Tabs;

export default function Demo() {
  const { address, isConnected } = useAppKitAccount();
  const { data: session, status } = useSession();
  const {
    provider,
    USDCContract,
    GPDUSDCContract,
    solanaConnection,
    solanaReadProgram,
    solanaWriteProgram,
    currentNetworkType
  } = usePageContext();

  const [loading, setLoading] = useState(false);
  const [twitterLoading, setTwitterLoading] = useState(false);
  const [signMessage, setSignMessage] = useState('Hello from AIMonica DApp!');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [results, setResults] = useState<string[]>([]);

  // NFT相关状态
  const [nftName, setNftName] = useState('Test NFT');
  const [nftSymbol, setNftSymbol] = useState('TNFT');
  const [nftUri, setNftUri] = useState('https://example.com/metadata.json');
  const [nftLevel, setNftLevel] = useState('1');
  const [mintAccount, setMintAccount] = useState<anchor.web3.Keypair | null>(null);

  // Twitter配置状态
  const [twitterConfigured, setTwitterConfigured] = useState<boolean | null>(null);

  // 检查Twitter配置
  React.useEffect(() => {
    const checkConfig = async () => {
      try {
        const response = await fetch('/api/auth/check-config');
        const data = await response.json();
        setTwitterConfigured(data.configured);
        
        if (!data.configured) {
          console.warn('Twitter配置不完整:', data.details);
        }
      } catch (error) {
        console.error('检查配置失败:', error);
        setTwitterConfigured(false);
      }
    };
    
    checkConfig();
  }, []);

  const addResult = (result: string) => {
    setResults((prev) => [`${new Date().toLocaleTimeString()}: ${result}`, ...prev.slice(0, 9)]);
  };

  // 用于跟踪之前的session状态
  const prevSessionRef = React.useRef<string | undefined>();

  // 检查URL中的错误参数
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
      let errorMessage = 'Twitter连接发生错误';
      
      if (error === 'OAuthCallback') {
        errorMessage = '❌ OAuth回调错误 - 请检查Twitter应用配置中的回调URL是否正确设置为: http://localhost:3000/api/auth/callback/twitter';
      } else if (error === 'Configuration') {
        errorMessage = '❌ 配置错误 - 请检查环境变量是否正确设置';
      } else if (error === 'AccessDenied') {
        errorMessage = '❌ 访问被拒绝 - 用户取消了授权';
      }
      
      addResult(errorMessage);
      message.error(errorMessage);
      
      // 清理URL中的错误参数
      const cleanUrl = window.location.href.split('?')[0];
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // 监听session变化，处理Twitter授权成功后的状态
  React.useEffect(() => {
    // 如果从未认证状态变为已认证状态，说明刚刚完成授权
    if (status === 'authenticated' && session?.twitterUsername) {
      const wasUnauthenticated = prevSessionRef.current === undefined;
      
      if (wasUnauthenticated || prevSessionRef.current !== session.twitterUsername) {
        addResult(`✅ Twitter连接成功！欢迎 @${session.twitterUsername}`);
        message.success(`Twitter连接成功！欢迎 @${session.twitterUsername}`);
        
        // 清理URL参数（如果有的话）
        const url = new URL(window.location.href);
        if (url.searchParams.has('callbackUrl') || url.searchParams.has('error')) {
          const cleanUrl = `${url.origin}${url.pathname}`;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
      
      prevSessionRef.current = session.twitterUsername;
    } else if (status === 'unauthenticated') {
      prevSessionRef.current = undefined;
    }
  }, [session, status]);

  // EVM 示例
  const EVMExamples = () => {
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
      <div>
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
      </div>
    );
  };

  // Solana 示例
  const SolanaExamples = () => {
    // 签名消息
    const handleSolanaSignMessage = async () => {
      if (!solanaReadProgram || !solanaConnection) {
        message.error('请先连接 Solana 钱包');
        return;
      }

      setLoading(true);
      try {
        const messageBytes = new TextEncoder().encode(signMessage);
        const signature = await solanaReadProgram.provider.wallet.signMessage(messageBytes);

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
      if (!solanaConnection || !solanaReadProgram) {
        message.error('Solana 连接未建立');
        return;
      }

      setLoading(true);
      try {
        const publicKey = solanaReadProgram.provider.wallet.publicKey;
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

    // 发送 SOL
    const handleSendSOL = async () => {
      if (!solanaConnection || !solanaWriteProgram || !transferTo) {
        message.error('请填写完整信息');
        return;
      }

      setLoading(true);
      try {
        const fromPubkey = solanaWriteProgram.provider.wallet.publicKey;
        const toPubkey = new PublicKey(transferTo);
        const lamports = parseFloat(transferAmount) * 1e9; // SOL to lamports

        const transaction = new anchor.web3.Transaction().add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports
          })
        );

        const signature = await solanaWriteProgram.provider.sendAndConfirm(transaction);

        addResult(`SOL 转账成功: ${signature}`);
        message.success('SOL 转账成功');
      } catch (error) {
        handleContractError(error);
        addResult(`SOL 转账失败: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };



    // 初始化 NFT (program.methods.initNft) - 标准Metaplex NFT
    const handleInitNft = async () => {
      if (!solanaWriteProgram) {
        message.error('Solana 程序未初始化');
        return;
      }

      if (!nftName || !nftSymbol || !nftUri) {
        message.error('请填写 NFT 信息');
        return;
      }

      setLoading(true);
      try {
        // 这是标准Metaplex NFT，需要安装额外依赖
        // 如果你的程序使用idl.json，需要安装以下包：
        // npm install @solana/spl-token @metaplex-foundation/mpl-token-metadata @metaplex-foundation/umi-bundle-defaults

        message.warning('标准NFT功能需要额外依赖包，请参考控制台输出');
        console.log('需要安装以下依赖包：');
        console.log(
          'npm install @solana/spl-token @metaplex-foundation/mpl-token-metadata @metaplex-foundation/umi-bundle-defaults @metaplex-foundation/umi @metaplex-foundation/umi-signer-wallet-adapters'
        );

        addResult('❌ 标准NFT功能需要额外依赖包');
      } catch (error) {
        console.error('initNft 错误:', error);
        handleContractError(error);
        addResult(`initNft 失败: ${error.message || error.toString()}`);
      } finally {
        setLoading(false);
      }
    };

    // 简化NFT铸造 (hgnft.json 合约)
    const handleMintSimpleNft = async () => {
      if (!solanaWriteProgram) {
        message.error('Solana 程序未初始化');
        return;
      }

      if (!nftName || !nftUri) {
        message.error('请填写 NFT 名称和URI');
        return;
      }

      setLoading(true);
      try {
        // 生成新的 mint 账户
        const newMintAccount = anchor.web3.Keypair.generate();
        setMintAccount(newMintAccount);

        const provider = solanaWriteProgram.provider;
        const level = parseInt(nftLevel) || 1; // 使用用户输入的等级

        // 简化的账户结构（基于hgnft.json）
        const accounts = {
          mint: newMintAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId
        };

        console.log('调用 mintnft（简化版），参数:', {
          name: nftName,
          uri: nftUri,
          level,
          accounts
        });

        // 调用简化合约的 mintnft 方法
        const tx = await solanaWriteProgram.methods
          .mintnft(nftName, nftUri, new anchor.BN(level))
          .accounts(accounts)
          .signers([newMintAccount])
          .rpc();

        addResult(`✅ 简化NFT铸造成功: ${tx}`);
        addResult(`📦 Mint Account: ${newMintAccount.publicKey.toString()}`);
        message.success('简化NFT铸造成功');
        console.log('mintnft 交易:', tx);
        console.log('Mint Account:', newMintAccount.publicKey.toString());
      } catch (error) {
        console.error('简化NFT铸造错误:', error);
        handleContractError(error);
        addResult(`❌ 简化NFT铸造失败: ${error.message || error.toString()}`);
      } finally {
        setLoading(false);
      }
    };



    // 测试完整的简化NFT流程
    const handleTestSimpleNftFlow = async () => {
      if (!solanaWriteProgram) {
        message.error('Solana 程序未初始化');
        return;
      }

      setLoading(true);
      try {
        addResult('🚀 开始简化NFT完整流程测试...');

        // 步骤1: 铸造NFT
        const newMintAccount = anchor.web3.Keypair.generate();
        setMintAccount(newMintAccount);

        const provider = solanaWriteProgram.provider;
        const level = parseInt(nftLevel) || 1;

        const mintAccounts = {
          mint: newMintAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId
        };

        const mintTx = await solanaWriteProgram.methods
          .mintnft(nftName, nftUri, new anchor.BN(level))
          .accounts(mintAccounts)
          .signers([newMintAccount])
          .rpc();

        addResult(`✅ 步骤1 - 铸造NFT成功: ${mintTx}`);

        // 等待确认
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 步骤2: 设置锁定者
        const lockerAccounts = {
          mint: newMintAccount.publicKey,
          user: provider.wallet.publicKey
        };

        const lockerTx = await solanaWriteProgram.methods
          .setlocker(provider.wallet.publicKey)
          .accounts(lockerAccounts)
          .rpc();

        addResult(`✅ 步骤2 - 设置锁定者成功: ${lockerTx}`);

        // 等待确认
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 步骤3: 修改等级
        const newLevel = (parseInt(nftLevel) || 1) + 1;
        const setValueAccounts = {
          mint: newMintAccount.publicKey,
          locker: provider.wallet.publicKey
        };

        const setValueTx = await solanaWriteProgram.methods
          .setvalue(new anchor.BN(newLevel))
          .accounts(setValueAccounts)
          .rpc();

        addResult(`✅ 步骤3 - 修改等级成功: ${setValueTx}`);
        addResult(`🎉 简化NFT完整流程测试成功!`);
        message.success('简化NFT完整流程测试成功');
      } catch (error) {
        console.error('简化NFT流程测试错误:', error);
        handleContractError(error);
        addResult(`❌ 简化NFT流程测试失败: ${error.message || error.toString()}`);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div>
        <Card title="Solana 功能示例">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
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
              <h4>💸 SOL 转账</h4>
              <Input
                placeholder="接收地址 (Solana 公钥)"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
              />
              <Input
                placeholder="转账金额 (SOL)"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
              />
              <Button onClick={handleCheckSOLBalance} loading={loading} type="primary" style={{ marginRight: '10px' }}>
                查询 SOL 余额
              </Button>
              <Button onClick={handleSendSOL} loading={loading} type="primary">
                发送 SOL
              </Button>
            </div>

            {/* NFT 操作 */}
            <div>
              <h4>🎨 NFT 操作</h4>
              <div style={{ marginBottom: '10px' }}>
                <Input
                  placeholder="NFT 名称"
                  value={nftName}
                  onChange={(e) => setNftName(e.target.value)}
                  style={{ marginBottom: '5px' }}
                />
                <Input
                  placeholder="NFT 符号"
                  value={nftSymbol}
                  onChange={(e) => setNftSymbol(e.target.value)}
                  style={{ marginBottom: '5px' }}
                />
                <Input
                  placeholder="元数据 URI"
                  value={nftUri}
                  onChange={(e) => setNftUri(e.target.value)}
                  style={{ marginBottom: '5px' }}
                />
                <Input
                  placeholder="NFT 等级 (数字)"
                  value={nftLevel}
                  onChange={(e) => setNftLevel(e.target.value)}
                  style={{ marginBottom: '5px' }}
                  type="number"
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>合约类型说明：</strong>
                <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
                  📋 <strong>标准NFT (idl.json)</strong> - 需要额外依赖包，使用Metaplex标准
                  <br />
                  🎨 <strong>简化NFT (hgnft.json)</strong> - 无需额外依赖，自定义简单结构
                </p>
              </div>
              <Space wrap>
                <Button
                  onClick={handleInitNft}
                  loading={loading}
                  style={{ backgroundColor: '#faad14', borderColor: '#faad14', color: 'white' }}>
                  📋 标准initNft
                </Button>
                <Button onClick={handleMintSimpleNft} loading={loading} type="primary">
                  🎨 简化mintnft
                </Button>
                <Button
                  onClick={handleTestSimpleNftFlow}
                  loading={loading}
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', color: 'white' }}>
                  🚀 完整流程测试
                </Button>
              </Space>
              {mintAccount && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: '6px'
                  }}>
                  <p style={{ margin: 0, fontSize: '12px' }}>
                    <strong>Mint Account:</strong> {mintAccount.publicKey.toString()}
                  </p>
                </div>
              )}
            </div>
          </Space>
        </Card>
      </div>
    );
  };

  const handleConnectTwitter = async () => {
    // 首先检查配置
    if (twitterConfigured === false) {
      addResult('❌ Twitter配置未完成，请先配置环境变量');
      message.error('请先配置Twitter API密钥和环境变量');
      return;
    }

    setTwitterLoading(true);
    try {
      if (session?.twitterUsername) {
        // 如果已经连接，则断开连接
        await signOut({ redirect: false });
        addResult('❌ 已断开Twitter连接');
        message.success('已断开Twitter连接');
      } else {
        // 连接Twitter
        addResult('🔄 正在跳转到Twitter授权页面...');
        message.info('正在跳转到Twitter授权页面...');
        
        // 使用signIn进行重定向
        await signIn('twitter', { 
          callbackUrl: window.location.href,
        });
      }
    } catch (error: any) {
      console.error('Twitter连接错误:', error);
      
      let errorMessage = 'Twitter连接发生错误';
      if (error.message?.includes('Configuration')) {
        errorMessage = '请先配置Twitter API密钥';
      } else if (error.message?.includes('fetch')) {
        errorMessage = '网络连接错误，请检查网络';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      addResult(`❌ ${errorMessage}`);
      message.error(errorMessage);
    } finally {
      setTwitterLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>🔗 请先连接钱包</h2>
        <p>连接钱包后即可测试各种功能</p>
      </div>
    );
  }

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

      <Tabs defaultActiveKey="1">
        <TabPane tab="🔷 连接推特" key="1">
          <Card title="Twitter 连接">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* 配置状态检查 */}
              {twitterConfigured === false && (
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: '#fff2f0', 
                  border: '1px solid #ffccc7', 
                  borderRadius: '6px',
                  marginBottom: '10px'
                }}>
                  <p style={{ margin: 0, color: '#ff4d4f' }}>
                    ⚠️ Twitter配置未完成，请先配置环境变量
                  </p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>
                    请参考 TWITTER_SETUP.md 文件进行配置
                  </p>
                </div>
              )}

              {/* Twitter 连接状态 */}
              <div>
                <h4>📱 Twitter 连接状态</h4>
                {status === 'loading' || twitterLoading || twitterConfigured === null ? (
                  <div style={{ 
                    padding: '10px', 
                    backgroundColor: '#f0f9ff', 
                    border: '1px solid #91d5ff', 
                    borderRadius: '6px',
                    marginBottom: '10px'
                  }}>
                    <p style={{ margin: 0, color: '#1890ff' }}>
                      🔄 {status === 'loading' ? '正在检查连接状态...' : 
                          twitterLoading ? '正在处理Twitter连接...' : 
                          '正在检查配置...'}
                    </p>
                  </div>
                ) : session?.twitterUsername ? (
                  <div style={{ 
                    padding: '10px', 
                    backgroundColor: '#f6ffed', 
                    border: '1px solid #b7eb8f', 
                    borderRadius: '6px',
                    marginBottom: '10px'
                  }}>
                    <p style={{ margin: 0, color: '#52c41a' }}>
                      ✅ 已连接到 Twitter
                    </p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                      <strong>用户名:</strong> @{session.twitterUsername}
                    </p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                      <strong>用户ID:</strong> {session.twitterId}
                    </p>
                  </div>
                ) : (
                  <div style={{ 
                    padding: '10px', 
                    backgroundColor: '#fff7e6', 
                    border: '1px solid #ffd591', 
                    borderRadius: '6px',
                    marginBottom: '10px'
                  }}>
                    <p style={{ margin: 0, color: '#fa8c16' }}>
                      ⚠️ 未连接到 Twitter
                    </p>
                  </div>
                )}
                
                <Button
                  onClick={handleConnectTwitter}
                  loading={twitterLoading}
                  disabled={twitterConfigured === false}
                  type={session?.twitterUsername ? 'default' : 'primary'}
                  style={{ 
                    backgroundColor: twitterConfigured === false ? '#d9d9d9' :
                                   session?.twitterUsername ? '#ff4d4f' : '#1da1f2',
                    borderColor: twitterConfigured === false ? '#d9d9d9' :
                                session?.twitterUsername ? '#ff4d4f' : '#1da1f2',
                    color: 'white'
                  }}>
                  {twitterConfigured === false ? '配置未完成' :
                   session?.twitterUsername ? '断开 Twitter' : '连接 Twitter'}
                </Button>
                
                {session?.twitterUsername && (
                  <div style={{ marginTop: '10px' }}>
                                        <Button
                       onClick={() => {
                         const shareText = createShareMessages.connected(session.twitterUsername!);
                         shareOnTwitter(shareText);
                       }}
                       style={{ 
                         backgroundColor: '#1da1f2',
                         borderColor: '#1da1f2',
                         color: 'white'
                       }}>
                       📝 发推分享
                     </Button>
                  </div>
                )}
              </div>
            </Space>
          </Card>
        </TabPane>

        <TabPane tab="🔷 EVM 示例" key="2">
          {currentNetworkType === 'eip155' ? (
            <EVMExamples />
          ) : (
            <Card>
              <p>请切换到 EVM 网络 (Base 或 Base Sepolia) 来测试 EVM 功能</p>
            </Card>
          )}
        </TabPane>

        <TabPane tab="⚡ Solana 示例" key="3">
          {currentNetworkType === 'solana' ? (
            <SolanaExamples />
          ) : (
            <Card>
              <p>请切换到 Solana 网络 (Solana 或 Solana Devnet) 来测试 Solana 功能</p>
            </Card>
          )}
        </TabPane>
      </Tabs>

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
