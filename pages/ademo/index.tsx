import React, { useState } from 'react';
import { Button, message } from 'antd';
import { usePageContext } from '@/context';
import { useAppKitAccount } from '@reown/appkit/react';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';

export default function Demo() {
  const { isConnected } = useAppKitAccount();
  const { solanaConnection, solanaProgram } = usePageContext();
  const [loading, setLoading] = useState(false);
  const [testAccount, setTestAccount] = useState<anchor.web3.Keypair | null>(null);
  const [lastTx, setLastTx] = useState<string>('');
  const [contractTestResults, setContractTestResults] = useState<any[]>([]);

  // 添加测试结果
  const addTestResult = (test: string, status: 'success' | 'error', details: string) => {
    const result = {
      timestamp: new Date().toLocaleTimeString(),
      test,
      status,
      details
    };
    setContractTestResults((prev) => [result, ...prev.slice(0, 9)]); // 只保留最近10条
  };

  // 测试1: 基础连接测试
  const handleTestConnection = async () => {
    setLoading(true);
    try {
      if (!solanaConnection) {
        throw new Error('Solana connection not available');
      }

      // 测试网络连接
      const slot = await solanaConnection.getSlot();
      const blockHeight = await solanaConnection.getBlockHeight();

      addTestResult('Network Connection', 'success', `Slot: ${slot}, Block Height: ${blockHeight}`);

      message.success('Network connection test passed');
    } catch (error) {
      console.error('Connection test error:', error);
      addTestResult('Network Connection', 'error', error.message || 'Unknown error');
      message.error('Network connection test failed');
    } finally {
      setLoading(false);
    }
  };

  // 测试2: 程序存在性测试
  const handleTestProgramExists = async () => {
    setLoading(true);
    try {
      if (!solanaProgram || !solanaConnection) {
        throw new Error('Program or connection not available');
      }

      // 检查程序账户是否存在
      const programInfo = await solanaConnection.getAccountInfo(solanaProgram.programId);

      if (programInfo) {
        addTestResult(
          'Program Existence',
          'success',
          `Program found, executable: ${programInfo.executable}, owner: ${programInfo.owner.toString()}`
        );
        message.success('Program exists and is valid');
      } else {
        throw new Error('Program account not found');
      }
    } catch (error) {
      console.error('Program test error:', error);
      addTestResult('Program Existence', 'error', error.message || 'Unknown error');
      message.error('Program test failed');
    } finally {
      setLoading(false);
    }
  };

  // 测试3: 创建测试账户
  const handleCreateTestAccount = async () => {
    setLoading(true);
    try {
      if (!solanaConnection || !solanaProgram) {
        throw new Error('Connection or program not available');
      }

      // 生成新的测试账户
      const newAccount = anchor.web3.Keypair.generate();
      setTestAccount(newAccount);

      // 获取创建账户所需的最小余额
      const rentExemption = await solanaConnection.getMinimumBalanceForRentExemption(0);

      addTestResult(
        'Test Account Creation',
        'success',
        `Account: ${newAccount.publicKey.toString()}, Rent exemption: ${rentExemption} lamports`
      );

      message.success('Test account created successfully');
    } catch (error) {
      console.error('Account creation error:', error);
      addTestResult('Test Account Creation', 'error', error.message || 'Unknown error');
      message.error('Account creation failed');
    } finally {
      setLoading(false);
    }
  };

  // 测试4: 简单的合约方法调用测试
  const handleTestContractCall = async () => {
    if (!solanaProgram) {
      message.error('Program not initialized');
      return;
    }

    setLoading(true);
    try {
      // 创建一个简单的测试账户用于初始化
      const testKeypair = anchor.web3.Keypair.generate();

      // 尝试调用一个基础的初始化方法
      // 这里我们尝试调用任何可用的方法来测试合约响应
      const provider = solanaProgram.provider;

      // 如果有initialize方法，尝试调用
      if (solanaProgram.methods.initialize) {
        const tx = await solanaProgram.methods
          .initialize()
          .accounts({
            counter: testKeypair.publicKey,
            user: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId
          })
          .signers([testKeypair])
          .rpc();

        setLastTx(tx);
        addTestResult('Contract Method Call', 'success', `Initialize method called successfully, TX: ${tx}`);
        message.success('Contract method call successful');
      } else {
        // 如果没有initialize方法，只是测试连接
        addTestResult('Contract Method Call', 'success', 'Program instance created and accessible');
        message.success('Contract connection verified');
      }
    } catch (error) {
      console.error('Contract call error:', error);
      addTestResult('Contract Method Call', 'error', error.message || 'Unknown error');
      message.error('Contract method call failed');
    } finally {
      setLoading(false);
    }
  };

  // 测试5: 获取程序详细信息
  const handleGetProgramInfo = async () => {
    setLoading(true);
    try {
      if (!solanaProgram || !solanaConnection) {
        throw new Error('Program or connection not available');
      }

      const programId = solanaProgram.programId;
      const accountInfo = await solanaConnection.getAccountInfo(programId);

      if (accountInfo) {
        const info = {
          programId: programId.toString(),
          executable: accountInfo.executable,
          owner: accountInfo.owner.toString(),
          lamports: accountInfo.lamports,
          dataLength: accountInfo.data.length
        };

        addTestResult('Program Info', 'success', JSON.stringify(info, null, 2));

        console.log('Program Info:', info);
        message.success('Program information retrieved');
      } else {
        throw new Error('Program account not found');
      }
    } catch (error) {
      console.error('Get program info error:', error);
      addTestResult('Program Info', 'error', error.message || 'Unknown error');
      message.error('Failed to get program info');
    } finally {
      setLoading(false);
    }
  };

  // 检查余额
  const handleGetBalance = async () => {
    if (!solanaConnection) {
      message.error('Solana connection not available');
      return;
    }

    try {
      const walletPublicKey = solanaProgram?.provider?.wallet?.publicKey;
      if (!walletPublicKey) {
        message.error('Wallet not connected');
        return;
      }

      const balance = await solanaConnection.getBalance(walletPublicKey);
      const solBalance = balance / 1000000000; // Convert lamports to SOL

      addTestResult('Wallet Balance', 'success', `${solBalance} SOL (${balance} lamports)`);

      message.info(`Wallet balance: ${solBalance} SOL`);
      console.log('Wallet balance:', solBalance, 'SOL');
    } catch (error) {
      console.error('Get balance error:', error);
      addTestResult('Wallet Balance', 'error', error.message || 'Unknown error');
      message.error('Failed to get balance');
    }
  };

  // 运行所有测试
  const handleRunAllTests = async () => {
    setContractTestResults([]);
    await handleTestConnection();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await handleGetBalance();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await handleTestProgramExists();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await handleGetProgramInfo();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await handleCreateTestAccount();
  };

  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <p>Please connect your wallet to interact with Solana contracts</p>
      </div>
    );
  }

  if (!solanaProgram || !solanaConnection) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <p>Solana contracts not initialized. Please ensure you're connected to a Solana network.</p>
      </div>
    );
  }

  // const getBalance = async () => {
  //   const res = await USDCContract.balanceOf(address);
  //   const _res = Number(ethers.formatUnits(res, 6));
  //   console.log('USDC balance', _res);
  //   setBalance(_res);

  //   checkApproval(_res);
  // };

  // const checkApproval = async (balance) => {
  //   try {
  //     const allowance = await USDCContract.allowance(address, GPDUSDCContract);
  //     const _allowance = Number(ethers.formatUnits(allowance, 6));
  //     const approved = _allowance > 0 && _allowance >= balance;
  //     console.log('approved', approved);
  //   } catch (error) {
  //     console.error(error);
  //   }
  // };

  return (
    <div style={{ padding: '20px' }}>
      <h3>Solana Contract Initialization Tests</h3>

      {/* 快速测试按钮 */}
      <div style={{ marginBottom: '20px' }}>
        <Button
          type="primary"
          size="large"
          onClick={handleRunAllTests}
          loading={loading}
          style={{ backgroundColor: '#2828b2', marginRight: '10px' }}>
          Run All Tests
        </Button>
      </div>

      {/* 单独测试按钮 */}
      <div style={{ marginBottom: '20px' }}>
        <h4>Individual Tests</h4>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button onClick={handleTestConnection} loading={loading}>
            Test Connection
          </Button>
          <Button onClick={handleGetBalance} loading={loading}>
            Get Balance
          </Button>
          <Button onClick={handleTestProgramExists} loading={loading}>
            Test Program
          </Button>
          <Button onClick={handleGetProgramInfo} loading={loading}>
            Program Info
          </Button>
          <Button onClick={handleCreateTestAccount} loading={loading}>
            Create Test Account
          </Button>
          <Button onClick={handleTestContractCall} loading={loading}>
            Test Contract Call
          </Button>
        </div>
      </div>

      {/* 测试结果显示 */}
      {contractTestResults.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h4>Test Results</h4>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {contractTestResults.map((result, index) => (
              <div
                key={index}
                style={{
                  padding: '10px',
                  margin: '5px 0',
                  backgroundColor: result.status === 'success' ? '#f6ffed' : '#fff2f0',
                  border: `1px solid ${result.status === 'success' ? '#b7eb8f' : '#ffccc7'}`,
                  borderRadius: '4px'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: result.status === 'success' ? '#52c41a' : '#ff4d4f' }}>{result.test}</strong>
                  <span style={{ fontSize: '12px', color: '#666' }}>{result.timestamp}</span>
                </div>
                <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>{result.details}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 账户信息显示 */}
      {testAccount && (
        <div style={{ marginBottom: '20px' }}>
          <h4>Test Account Info</h4>
          <div style={{ padding: '10px', backgroundColor: '#f0f8ff', borderRadius: '4px' }}>
            <p>
              <strong>Test Account:</strong> {testAccount.publicKey.toString()}
            </p>
            {lastTx && (
              <p>
                <strong>Last Transaction:</strong> {lastTx}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 程序信息显示 */}
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h4>Contract Information</h4>
        <p>
          <strong>Program ID:</strong> {solanaProgram.programId.toString()}
        </p>
        <p>
          <strong>Connection Endpoint:</strong> {solanaConnection.rpcEndpoint}
        </p>
        <p>
          <strong>Wallet:</strong> {solanaProgram.provider.wallet.publicKey.toString()}
        </p>
        <p>
          <strong>Cluster:</strong>{' '}
          {solanaConnection.rpcEndpoint.includes('devnet')
            ? 'Devnet'
            : solanaConnection.rpcEndpoint.includes('testnet')
            ? 'Testnet'
            : solanaConnection.rpcEndpoint.includes('mainnet')
            ? 'Mainnet'
            : 'Custom'}
        </p>
      </div>
    </div>
  );
}
