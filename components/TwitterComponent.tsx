import React, { useState, useEffect } from 'react';
import { Modal, message, Button, Avatar } from 'antd';
import { usePageContext, TwitterUser } from '@/context';
import { useSession, signIn, signOut } from 'next-auth/react';
import { getCurrentEnv, } from '@/pages/api/auth/utils';

export default function TwitterComponent() {
  const { data: session, status } = useSession();
  const {
    twitterUser,
    setTwitterUser,
    isTwitterConnected
  } = usePageContext();

  // 用于跟踪之前的连接状态
  const prevConnectedRef = React.useRef<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // 环境配置
  const envConfig = getCurrentEnv();

  // 同步NextAuth session到context
  useEffect(() => {
    if (status === 'authenticated' && session?.twitterUsername) {
      console.log('session', session);
      const newTwitterUser: TwitterUser = {
        username: session.twitterUsername,
        id: session.twitterId,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        profile_image_url: session.profile_image_url,
      };
      setTwitterUser(newTwitterUser);
    } else if (status === 'unauthenticated') {
      setTwitterUser(null);
    }
  }, [session, status, setTwitterUser]);

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
    }
  };


  const disconnectTwitter = async () => {
    await signOut({ redirect: false });
    setIsModalOpen(false);
    message.success('已断开Twitter连接');
  };

  return <>
    {
      (isTwitterConnected && twitterUser) ? (
        <button className='connect-button' onClick={() => setIsModalOpen(true)}>
          <img src={twitterUser.profile_image_url} alt="" />
          {twitterUser.username}
        </button>
      ) : (
        <button className='connect-button' onClick={handleConnectTwitter}>
          <img src="/assets/images/icon-twitter.svg" alt="" />
          Connect Twitter
        </button>
      )
    }

    <Modal
      open={isModalOpen}
      onCancel={() => setIsModalOpen(false)}
      footer={null}
    >
      {
        twitterUser && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Avatar
              size={64}
              src={twitterUser.profile_image_url}
              style={{ marginBottom: '0.2rem' }}
            />
            <h3 style={{ marginBottom: '0.2rem' }}>@{twitterUser.username}</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.2rem' }}>
              <Button type="primary" danger onClick={disconnectTwitter}>退出推特</Button>
              <Button onClick={() => setIsModalOpen(false)}>取消</Button>
            </div>
          </div>
        )
      }
    </Modal>
  </>;
};
