import React, { useState, useEffect } from 'react';
import { Modal, message, Button, Avatar, Card } from 'antd';
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
      console.log('Twitter', session);
      setTwitterUser(session as any);
    } else if (status === 'unauthenticated') {
      setTwitterUser(null);
    }
  }, [session, status, setTwitterUser]);

  // 监听Twitter连接状态变化
  useEffect(() => {
    if (isTwitterConnected && !prevConnectedRef.current && twitterUser) {
      // 刚刚连接成功
      message.success(`Twitter连接成功！欢迎 @${twitterUser.twitterUsername}`);

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
          <img src={twitterUser.user.image} alt="" />
          {twitterUser.twitterUsername}
        </button>
      ) : (
        <button className='connect-button' onClick={handleConnectTwitter}>
          <img src="/assets/images/icon-twitter.svg" alt="" />
          Connect Twitter
        </button>
      )
    }

    <Modal
      width={'fit-content'}
      open={isModalOpen}
      onCancel={() => setIsModalOpen(false)}
      footer={null}
    >
      {(isTwitterConnected && twitterUser) &&
        <div className='twitter-modal-box'>
          <div className='twitter-user-info'>
            <img src={twitterUser.user.image} alt="" />
            <div>
              <div className='text1'>{twitterUser.user.name}</div>
              <div className='text2'>@{twitterUser.twitterUsername}</div>
            </div>
          </div>
          <div className='twitter-modal-box-btn'>
            <Button onClick={() => setIsModalOpen(false)}>取消</Button>
            <Button type="primary" onClick={disconnectTwitter}>退出推特</Button>
          </div>
        </div>
      }

    </Modal>
  </>;
};
