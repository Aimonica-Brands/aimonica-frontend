import React, { useState, useEffect } from 'react';
import { Button, message, Card, Input, Tabs, Divider, Space } from 'antd';
import { usePageContext, TwitterUser } from '@/context';
import { useSession, signIn, signOut } from 'next-auth/react';
import { getCurrentEnv, shareOnTwitter, createShareMessages } from '@/pages/api/auth/utils';

export default function DemoTwitter() {
  const { data: session, status } = useSession();
  const {
    twitterUser,
    setTwitterUser,
    isTwitterConnected
  } = usePageContext();

  const [twitterLoading, setTwitterLoading] = useState(false);

  // 环境配置
  const envConfig = getCurrentEnv();

  // 同步NextAuth session到context
  useEffect(() => {
    if (status === 'authenticated' && session?.twitterUsername) {
      const newTwitterUser: TwitterUser = {
        username: session.twitterUsername,
        id: session.twitterId,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      };
      setTwitterUser(newTwitterUser);
    } else if (status === 'unauthenticated') {
      setTwitterUser(null);
    }
  }, [session, status, setTwitterUser]);



  // 用于跟踪之前的连接状态
  const prevConnectedRef = React.useRef<boolean>(false);

  // 监听Twitter连接状态变化
  useEffect(() => {
    if (isTwitterConnected && !prevConnectedRef.current && twitterUser) {
      // 刚刚连接成功
      message.success(`Twitter连接成功！欢迎 @${twitterUser.username}`);

      // 清理URL参数
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
      message.error('请先配置Twitter API密钥和环境变量');
      return;
    }

    setTwitterLoading(true);
    try {
      if (isTwitterConnected) {
        // 如果已经连接，则断开连接
        await signOut({ redirect: false });
        message.success('已断开Twitter连接');
      } else {
        // 连接Twitter
        message.info('正在跳转到Twitter授权页面...');

        // 使用signIn进行重定向
        await signIn('twitter', {
          callbackUrl: envConfig.url
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

      message.error(errorMessage);
    } finally {
      setTwitterLoading(false);
    }
  };

  return (
    <div style={{ padding: '1.2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🧪 AIMonica Demo</h1>
      <Card title="Twitter 连接">
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 配置状态检查 */}
          {!envConfig.twitterConfigured && (
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
                请检查 .env 文件中的配置
              </p>
            </div>
          )}

          {/* Twitter 连接状态 */}
          <div>
            <h4>📱 Twitter 连接状态</h4>
            {status === 'loading' || twitterLoading ? (
              <div style={{
                padding: '10px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #91d5ff',
                borderRadius: '6px',
                marginBottom: '10px'
              }}>
                <p style={{ margin: 0, color: '#1890ff' }}>
                  🔄 {status === 'loading' ? '正在检查连接状态...' : '正在处理Twitter连接...'}
                </p>
              </div>
            ) : isTwitterConnected ? (
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
                  <strong>用户名:</strong> @{twitterUser?.username}
                </p>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                  <strong>用户ID:</strong> {twitterUser?.id}
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
              disabled={!envConfig.twitterConfigured}
              type={isTwitterConnected ? 'default' : 'primary'}
              style={{
                backgroundColor: !envConfig.twitterConfigured ? '#d9d9d9' :
                  isTwitterConnected ? '#ff4d4f' : '#1da1f2',
                borderColor: !envConfig.twitterConfigured ? '#d9d9d9' :
                  isTwitterConnected ? '#ff4d4f' : '#1da1f2',
                color: 'white'
              }}>
              {!envConfig.twitterConfigured ? '配置未完成' :
                isTwitterConnected ? '断开 Twitter' : '连接 Twitter'}
            </Button>

            {isTwitterConnected && twitterUser && (
              <div style={{ marginTop: '10px' }}>
                <Button
                  onClick={() => {
                    const shareText = createShareMessages.connected(twitterUser.username);
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
    </div>
  );
}
