import React, { useState, useEffect } from 'react';
import { Modal, message, Button } from 'antd';
import { usePageContext } from '@/context';
import { useSession, signIn, signOut } from 'next-auth/react';
import { getCurrentEnv, createShareMessages, shareOnTwitter } from '@/pages/api/auth';

export default function TwitterComponent() {
  const { data: session, status } = useSession();
  const { twitterUser, setTwitterUser, isTwitterConnected } = usePageContext();

  // 用于跟踪之前的连接状态
  const prevConnectedRef = React.useRef<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // 环境配置
  const envConfig = getCurrentEnv();

  // 同步NextAuth session到context
  useEffect(() => {
    if (status === 'authenticated' && session?.twitterUsername) {
      console.log('Twitter', session);
      setTwitterUser(session as any);
    } else if (status === 'unauthenticated') {
      setTwitterUser(null);
    }
  }, [session, status, setTwitterUser]);

  // 监听Twitter连接状态变化
  useEffect(() => {
    if (isTwitterConnected && !prevConnectedRef.current && twitterUser) {
      message.success(`Welcome ${twitterUser.user.name}!`);

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
    }
  };

  const disconnectTwitter = async () => {
    await signOut({ redirect: false });
    setIsModalOpen(false);
    message.success('Twitter disconnected');
  };

  // const shareText = createShareMessages.connected(twitterUser.twitterUsername);
  // shareOnTwitter(shareText);

  return (
    <>
      {isTwitterConnected && twitterUser ? (
        <button className="connect-button">
          <img src={twitterUser.user.image} alt="" style={{ borderRadius: '50%' }} />
          {twitterUser.user.name}
        </button>
      ) : (
        <button className="connect-button" onClick={handleConnectTwitter}>
          <img src="/assets/images/icon-twitter.svg" alt="" />
          Connect Twitter
        </button>
      )}

      <Modal width={'fit-content'} open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
        {isTwitterConnected && twitterUser && (
          <div className="twitter-modal-box">
            <div className="twitter-user-info">
              <img src={twitterUser.user.image} alt="" />
              <div>
                <div className="text1">{twitterUser.user.name}</div>
                <div className="text2">@{twitterUser.twitterUsername}</div>
              </div>
            </div>
            <div className="twitter-modal-box-btn">
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" onClick={disconnectTwitter}>
                Disconnect Twitter
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
