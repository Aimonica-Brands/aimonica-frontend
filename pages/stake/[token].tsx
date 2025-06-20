import React, { useState, useEffect } from 'react';
import { Button, Modal, App, Input } from 'antd';
import { LeftOutlined, ExportOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { getContractConfig } from '@/wallet';
import { useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { usePageContext } from '@/context';
import { durationDays, evmUtils, solanaUtils } from '@/wallet/utils';

export default function Stake() {
  const { message } = App.useApp();
  const router = useRouter();
  const { token: token } = router.query;

  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork, chainId } = useAppKitNetwork();
  const { evmTokenContract, evmStakingContract, solanaProgram, solanaConnection } = usePageContext();

  const [projectData, setProjectData] = useState([
    { rank: 1, avatar: '/assets/images/avatar-1.png', name: 'Aimonica' },
    { rank: 2, avatar: '/assets/images/avatar-2.png', name: 'FAI' },
    { rank: 3, avatar: '/assets/images/avatar-3.png', name: 'Ai16z' }
  ]);

  const [projectInfo, setProjectInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [durationDay, setDurationDay] = useState(7);
  const [expectedPoints, setExpectedPoints] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [tokenPrice, setTokenPrice] = useState(1);
  const [tokenWorth, setTokenWorth] = useState(0);
  const [totalUser, setTotalUser] = useState(0);
  const [totalTVL, setTotalTVL] = useState(0);
  const [poolAddress, setPoolAddress] = useState('');
  const [poolLink, setPoolLink] = useState('');
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    if (token) {
      setProjectInfo(projectData.find((item) => item.rank === Number(token)));
    }
  }, [token]);

  useEffect(() => {
    if (isConnected && address && caipNetwork && chainId) {
      const contractConfig = getContractConfig(chainId);
      if (caipNetwork.chainNamespace === 'eip155') {
        if (evmStakingContract && evmTokenContract) {
          setPoolAddress(contractConfig.AimStaking);
          const link = `${caipNetwork.blockExplorers.default.url}/address/${contractConfig.AimStaking}`;
          setPoolLink(link);
          getEvmTokenBalance();
        }
      } else if (caipNetwork.chainNamespace === 'solana') {
        if (solanaProgram && solanaConnection) {
          setPoolAddress(contractConfig.programId);
          const link = `${caipNetwork.blockExplorers.default.url}/account/${contractConfig.programId}?cluster=${contractConfig.cluster}`;
          setPoolLink(link);
          getSolTokenBalance();
        }
      }
    } else {
      setIsApproved(false);
      setTokenBalance(0);
      setTokenWorth(0);
      setAmount('');
      setDurationDay(7);
      setExpectedPoints(0);
      setTotalUser(0);
      setTotalTVL(0);
      setPoolAddress('');
      setPoolLink('');
    }
  }, [
    isConnected,
    address,
    caipNetwork,
    chainId,
    evmTokenContract,
    evmStakingContract,
    solanaProgram,
    solanaConnection
  ]);

  useEffect(() => {
    setExpectedPoints(Number(amount));
  }, [amount]);

  const getEvmTokenBalance = async () => {
    evmUtils
      .getTokenBalance(evmTokenContract, address)
      .then((balance) => {
        setTokenBalance(balance);
        setTokenWorth(balance * tokenPrice);

        if (balance > 0) {
          const stakeAddress = getContractConfig(chainId).AimStaking;
          evmUtils
            .getAllowance(evmTokenContract, address, stakeAddress)
            .then((allowance) => {
              // console.log('EVM 代币授权:', allowance, balance, allowance >= balance);
              setIsApproved(allowance >= balance);
            })
            .catch((error) => {
              console.error(error);
            });
        }
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const handleApprove = async () => {
    if (loading) return;
    setLoading(true);
    const stakeAddress = getContractConfig(chainId).AimStaking;
    evmUtils
      .approve(evmTokenContract, stakeAddress)
      .then((tx) => {
        const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx.hash}`;
        console.log('🔗授权交易链接:', txLink);
        message.success('Approved!');
        getEvmTokenBalance();
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const getSolTokenBalance = async () => {
    solanaUtils
      .getTokenBalance(solanaProgram, solanaConnection)
      .then((balance) => {
        setTokenBalance(Math.floor(balance));
        setTokenWorth(Math.floor(balance * tokenPrice));
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const handleStake = async () => {
    if (loading) return;
    setLoading(true);

    if (caipNetwork.chainNamespace === 'eip155') {
      evmUtils
        .stake(evmStakingContract, amount.toString(), durationDay)
        .then((tx) => {
          const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx.hash}`;
          console.log('🔗质押交易链接:', txLink);
          message.success('Successful transaction!');
          setIsStakeModalOpen(true);
          getEvmTokenBalance();
          setAmount('');
        })
        .catch((error) => {
          console.error(error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (caipNetwork.chainNamespace === 'solana') {
      const nextStakeId = await solanaUtils.getNextStakeId(solanaProgram);

      solanaUtils
        .stake(solanaProgram, nextStakeId, Number(amount), durationDay)
        .then((tx) => {
          const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx}?cluster=${
            getContractConfig(chainId).cluster
          }`;
          console.log('🔗质押交易链接:', txLink);
          message.success('Successful transaction!');
          setIsStakeModalOpen(true);
          getSolTokenBalance();
          setAmount('');
        })
        .catch((error) => {
          console.error(error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  return (
    <div className="stake-page">
      <div className="stake-box">
        <button className="back-box" onClick={() => router.push('/')}>
          <LeftOutlined />
          <span>Explore</span>
          <img src="/assets/images/star.png" alt="" className="star-img" />
        </button>

        <div className="stake-content">
          <div className="left-box">
            <img src="/assets/images/img-23.png" alt="" className="img-23" />
            <img src="/assets/images/star.png" alt="" className="star-img" />

            <div className="box1">
              <div className="text">My monicadets know what's up (Monicadets = Monica's army)</div>
            </div>
            <div className="box2">
              <div className="avatar-box">
                <div className="avatar">
                  <img src={projectInfo?.avatar} alt="" />
                  <span>{projectInfo?.name}</span>
                </div>
                <div className="icon-box">
                  <a href="">
                    <img src="/assets/images/icon-twitter-2.png" alt="" />
                  </a>
                  <a href="">
                    <img src="/assets/images/icon-telegram-2.png" alt="" />
                  </a>
                  <a href="">
                    <img src="/assets/images/icon-discord-2.png" alt="" />
                  </a>
                  <a href="">
                    <img src="/assets/images/icon-dexscreener-2.png" alt="" />
                  </a>
                </div>
              </div>
              <div className="text1">Project Introduction Copywriting</div>
              <div className="text2">
                <div>
                  <span>Users</span>
                  <span>{totalUser}</span>
                </div>
                <div>
                  <span>TVL</span>
                  <span>$ {totalTVL}</span>
                </div>
              </div>
              <div className="text3">
                <span>Pool Address</span>
                <a className="pool-address" href={poolLink} target="_blank">
                  {poolAddress.slice(0, 6)}...{poolAddress.slice(-4)}
                  <ExportOutlined />
                </a>
              </div>
            </div>
          </div>
          <div className="right-box">
            <div className="tab-title-box">STAKE</div>
            <div className="stake-item">
              <div className="text">
                <span> Rewards </span>
                <div className="s-box">
                  <div className="s-img">
                    <img src="/assets/images/img-5.png" alt="" />
                  </div>
                  <div className="s-text">Points 7.5x AIM</div>
                </div>
              </div>
              <div className="text margin-bottom">
                <span>Your Balance</span>
              </div>
              <div className="avatar-box-box">
                <div className="avatar-box">
                  <img src="/assets/images/avatar.png" alt="" />
                  <span>Aimonica</span>
                </div>
                <div className="number-box">
                  <div className="number">{tokenBalance}</div>
                  <div className="number2">$ {tokenWorth}</div>
                </div>
              </div>
              <div className="inputbox">
                <Input
                  type="number"
                  placeholder={`Enter Amount`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                />
                <button className="max-btn" onClick={() => setAmount(tokenBalance.toString())}>
                  MAX
                </button>
              </div>
              <div className="text">
                <span>Locking Time</span>
                <div className="days">
                  {durationDays.map((day) => (
                    <button
                      key={day}
                      className={durationDay === day ? 'active' : ''}
                      onClick={() => setDurationDay(day)}>
                      {day}D
                    </button>
                  ))}
                </div>
              </div>
              <div className="text">
                <span>Expected Points</span>
                <div className="number">{expectedPoints}</div>
              </div>

              {caipNetwork.chainNamespace === 'eip155' && !isApproved && tokenBalance > 0 ? (
                <Button
                  type="primary"
                  size="large"
                  className="stake-btn"
                  onClick={handleApprove}
                  loading={loading}
                  disabled={!isConnected || !address || !caipNetwork || !chainId}>
                  Approve
                </Button>
              ) : (
                <Button
                  type="primary"
                  size="large"
                  className="stake-btn"
                  onClick={handleStake}
                  loading={loading}
                  disabled={!isConnected || !address || !caipNetwork || !chainId || !amount || !tokenBalance}>
                  STAKE
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        className="stake-modal"
        width={'fit-content'}
        centered
        closable={false}
        footer={null}
        open={isStakeModalOpen}
        onOk={() => setIsStakeModalOpen(false)}
        onCancel={() => setIsStakeModalOpen(false)}>
        <div className="stake-modal-box">
          <img src="/assets/images/img-27.png" alt="" className="img-27" />
          <img src="/assets/images/img-28.png" alt="" className="img-28" />
          <img src="/assets/images/img-29.png" alt="" className="img-29" />
          <img src="/assets/images/img-30.png" alt="" className="img-30" />
          <img src="/assets/images/img-31.png" alt="" className="img-31" />
          <img src="/assets/images/img-32.png" alt="" className="img-32" />
          <img src="/assets/images/img-33.png" alt="" className="img-33" onClick={() => setIsStakeModalOpen(false)} />

          <div className="text1">
            Stake <br /> Success
          </div>
          <div className="text2">
            <div>@AimonicaBrands Copywriter</div>
            <div>Copywriter</div>
            <div>Link</div>
          </div>
          <div className="text3">
            <a>https://aimonicabrands.ai</a>
            <div className="btn-box">
              <button className="btn-close" onClick={() => setIsStakeModalOpen(false)}>
                close
              </button>
              <button className="btn-share">
                Share On
                <img src="/assets/images/icon-twitter.png" alt="" />
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
