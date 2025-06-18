import React, { useState, useEffect } from 'react';
import { Button, message, Card, Input, Tabs, Divider, Space } from 'antd';
import { usePageContext, TwitterUser } from '@/context';
import { useSession, signIn, signOut } from 'next-auth/react';
import { getCurrentEnv, shareOnTwitter, createShareMessages } from '@/pages/api/auth/utils';

export default function DemoTwitter() {
  const { data: session, status } = useSession();
  const { twitterUser, setTwitterUser, isTwitterConnected } = usePageContext();

  const [twitterLoading, setTwitterLoading] = useState(false);

  // 环境配置
  const envConfig = getCurrentEnv();

  // 同步NextAuth session到context
  useEffect(() => {
    if (status === 'authenticated' && session?.twitterUsername) {
      setTwitterUser(session as any);
    } else if (status === 'unauthenticated') {
      setTwitterUser(null);
    }
  }, [session, status, setTwitterUser]);

  // 用于跟踪之前的连接状态
  const prevConnectedRef = React.useRef<boolean>(false);

  // 监听Twitter连接状态变化
  useEffect(() => {
    if (isTwitterConnected && !prevConnectedRef.current && twitterUser) {
      message.success(`Welcome @${twitterUser.twitterUsername}`);

      const url = new URL(window.location.href);
      if (url.search) {
        const cleanUrl = `${url.origin}${url.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    prevConnectedRef.current = isTwitterConnected;
  }, [isTwitterConnected, twitterUser]);

  const handleConnectTwitter = async () => {
    // 首先检查配置
    if (!envConfig.twitterConfigured) {
      message.error('Please configure Twitter API key and environment variables first');
      return;
    }

    setTwitterLoading(true);
    try {
      if (isTwitterConnected) {
        // 如果已经连接，则断开连接
        await signOut({ redirect: false });
        message.success('Twitter disconnected');
      } else {
        // 连接Twitter
        message.info('Redirecting to Twitter authorization page...');

        // 使用signIn进行重定向
        await signIn('twitter', {
          callbackUrl: envConfig.url
        });
      }
    } catch (error: any) {
      console.error('Twitter connection error:', error);

      let errorMessage = 'Twitter connection error';
      if (error.message?.includes('Configuration')) {
        errorMessage = 'Please configure Twitter API key first';
      } else if (error.message?.includes('fetch')) {
        errorMessage = 'Network error, please check your connection';
      } else if (error.message) {
        errorMessage = error.message;
      }

      message.error(errorMessage);
    } finally {
      setTwitterLoading(false);
    }
  };

  return (
    <div style={{ padding: '1.2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <Card title="Twitter connection">
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 配置状态检查 */}
          {!envConfig.twitterConfigured && (
            <div
              style={{
                padding: '10px',
                backgroundColor: '#fff2f0',
                border: '1px solid #ffccc7',
                borderRadius: '6px',
                marginBottom: '10px'
              }}>
              <p style={{ margin: 0, color: '#ff4d4f' }}>⚠️ Twitter configuration not completed, please configure environment variables</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>Please check the configuration in the .env file</p>
            </div>
          )}

          {/* Twitter connection status */}
          <div>
            <h4>📱 Twitter connection status</h4>
            {status === 'loading' || twitterLoading ? (
              <div
                style={{
                  padding: '10px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #91d5ff',
                  borderRadius: '6px',
                  marginBottom: '10px'
                }}>
                <p style={{ margin: 0, color: '#1890ff' }}>
                  🔄 {status === 'loading' ? 'Checking connection status...' : 'Processing Twitter connection...'}
                </p>
              </div>
            ) : isTwitterConnected ? (
              <div
                style={{
                  padding: '10px',
                  backgroundColor: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: '6px',
                  marginBottom: '10px'
                }}>
                <p style={{ margin: 0, color: '#52c41a' }}>✅ Connected to Twitter</p>
                <div className="twitter-modal-box">
                  <div className="twitter-user-info">
                    <img src={twitterUser.user.image} alt="" />
                    <div>
                      <div className="text1">{twitterUser.user.name}</div>
                      <div className="text2">@{twitterUser.twitterUsername}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '10px',
                  backgroundColor: '#fff7e6',
                  border: '1px solid #ffd591',
                  borderRadius: '6px',
                  marginBottom: '10px'
                }}>
                <p style={{ margin: 0, color: '#fa8c16' }}>⚠️ Not connected to Twitter</p>
              </div>
            )}

            <Button
              onClick={handleConnectTwitter}
              loading={twitterLoading}
              disabled={!envConfig.twitterConfigured}
              type={isTwitterConnected ? 'default' : 'primary'}
              style={{
                backgroundColor: !envConfig.twitterConfigured ? '#d9d9d9' : isTwitterConnected ? '#ff4d4f' : '#1da1f2',
                borderColor: !envConfig.twitterConfigured ? '#d9d9d9' : isTwitterConnected ? '#ff4d4f' : '#1da1f2',
                color: 'white'
              }}>
              {!envConfig.twitterConfigured ? 'Configuration not completed' : isTwitterConnected ? 'Disconnect Twitter' : 'Connect Twitter'}
            </Button>

            {isTwitterConnected && twitterUser && (
              <div style={{ marginTop: '10px' }}>
                <Button
                  onClick={() => {
                    const shareText = createShareMessages.connected(twitterUser.twitterUsername);
                    shareOnTwitter(shareText);
                  }}
                  style={{
                    backgroundColor: '#1da1f2',
                    borderColor: '#1da1f2',
                    color: 'white'
                  }}>
                  📝 Share on Twitter
                </Button>
              </div>
            )}
          </div>
        </Space>
      </Card>
    </div>
  );
}
