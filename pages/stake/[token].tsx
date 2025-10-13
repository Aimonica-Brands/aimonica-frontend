import React, { useState, useEffect } from 'react';
import { Button, Modal, App, Input, Tabs, Tooltip, Popover } from 'antd';
import { LeftOutlined, ExportOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { getContractConfig, handleContractError } from '@/wallet';
import { useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { usePageContext } from '@/context';
import { evmUtils, solanaUtils, getRewardPoints, getEVMTokenContract } from '@/wallet/utils';
import utils from '@/utils';
import { cookieAPI } from '@/pages/api/cookiefun';
import { shareOnTwitter } from '@/pages/api/auth';

export default function Stake() {
  const { message } = App.useApp();
  const router = useRouter();
  const { token: projectId } = router.query as { token: string };

  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork, chainId } = useAppKitNetwork();
  const { evmStakingContract, solanaProgram, projectsData, isTwitterConnected } = usePageContext();

  const [evmTokenContract, setEvmTokenContract] = useState<any>(null);
  const [projectInfo, setProjectInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [durationDay, setDurationDay] = useState(0);
  const [expectedPoints, setExpectedPoints] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [tokenWorth, setTokenWorth] = useState(0);
  const [poolAddress, setPoolAddress] = useState('');
  const [poolLink, setPoolLink] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [durationConfig, setDurationConfig] = useState<any>([]);

  const [mindshare, setMindshare] = useState(0);
  const [impressions, setImpressions] = useState(0);
  const [engagements, setEngagements] = useState(0);
  const [smartFollowers, setSmartFollowers] = useState(0);
  const [topTweets, setTopTweets] = useState([]);

  // const infoItems = [
  //   {
  //     key: '1',
  //     label: 'Team Details',
  //     children: (
  //       <div className="team-details">
  //         <div className="s-title">Our Team</div>
  //       </div>
  //     ),
  //   },
  //   {
  //     key: '2',
  //     label: 'Project Details',
  //     children: 'Content of Tab Pane 2',
  //   },
  //   {
  //     key: '3',
  //     label: 'Trades',
  //     children: 'Content of Tab Pane 3',
  //   },
  //   {
  //     key: '4',
  //     label: 'Holders',
  //     children: 'Content of Tab Pane 4',
  //   },
  // ];

  // const onChange = (key: string) => {};

  useEffect(() => {
    if (projectInfo && projectInfo.name) {
      getSearchTweets();
      getProjectMindshareGraph();
      getMetricsGraph();
      getProjectDetails();
    }
  }, [projectInfo]);

  useEffect(() => {
    if (projectInfo && tokenBalance) {
      setTokenWorth(tokenBalance * projectInfo.coinPriceUsd);
    }
  }, [projectInfo, tokenBalance]);

  useEffect(() => {
    if (projectId && projectsData && isConnected && address && caipNetwork && chainId) {
      getProject();
    }
  }, [projectId, projectsData, isConnected, address, caipNetwork, chainId]);

  useEffect(() => {
    if (evmTokenContract && evmStakingContract) {
      getDurationConfig();
      getEvmTokenBalance();
    }
    if (solanaProgram) {
      getSolTokenBalance();
    }
  }, [evmTokenContract, evmStakingContract, solanaProgram]);

  useEffect(() => {
    if (Number(amount)) {
      setExpectedPoints(Number(amount) * getRewardPoints(durationDay));
    } else {
      setExpectedPoints(0);
    }
  }, [amount, durationDay]);

  useEffect(() => {
    if (durationConfig && durationConfig.length > 0 && durationDay === 0) {
      setDurationDay(durationConfig[0]);
    }
  }, [durationConfig]);

  const getProject = async () => {
    const project = projectsData.find((item: any) => item.id == projectId);
    console.log('Current project:', project);
    setProjectInfo(project);

    if (!project) return router.push('/');

    const contractConfig = getContractConfig(chainId);

    if (caipNetwork.chainNamespace === 'eip155') {
      setPoolAddress(contractConfig?.AimStaking);
      const link = `${caipNetwork.blockExplorers.default.url}/address/${contractConfig?.AimStaking}`;
      setPoolLink(link);

      const contract = await getEVMTokenContract(chainId, project.stakingToken);
      console.log(`✅ Staking token contract initialized successfully`);
      setEvmTokenContract(contract);
    } else if (caipNetwork.chainNamespace === 'solana') {
      setPoolAddress(contractConfig?.programId);
      const link = `${caipNetwork.blockExplorers.default.url}/account/${contractConfig?.programId}?cluster=${contractConfig?.cluster}`;
      setPoolLink(link);
      setDurationConfig(project.allowedDurations);
    }
  };

  const getDurationConfig = async () => {
    evmUtils
      .getDurationConfig(evmStakingContract)
      .then((durations) => {
        setDurationConfig(durations);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const getEvmTokenBalance = async () => {
    evmUtils
      .getTokenBalance(evmTokenContract, address)
      .then((balance) => {
        const balanceWithTwoDecimals = Math.floor(balance * 10000) / 10000;
        setTokenBalance(balanceWithTwoDecimals);
        if (balance > 0) {
          const stakeAddress = getContractConfig(chainId).AimStaking;
          evmUtils
            .getAllowance(evmTokenContract, address, stakeAddress)
            .then((allowance) => {
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
        console.log('🔗Approval transaction link:', txLink);
        message.success('Approved!');
        getEvmTokenBalance();
      })
      .catch((error) => {
        handleContractError(error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const getSolTokenBalance = async () => {
    solanaUtils
      .getTokenBalance(solanaProgram, Number(projectId))
      .then((balance) => {
        const balanceWithTwoDecimals = Math.floor(balance * 10000) / 10000;
        setTokenBalance(balanceWithTwoDecimals);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  // 手动更新余额 - 质押后直接减少余额
  const updateBalanceAfterStake = (stakeAmount: number) => {
    const newBalance = tokenBalance - stakeAmount;
    const balanceWithTwoDecimals = Math.floor(newBalance * 10000) / 10000;
    setTokenBalance(balanceWithTwoDecimals);
  };

  const handleStake = async () => {
    if (loading) return;
    if (!Number(amount)) return message.error('Please enter the amount');
    if (Number(amount) > tokenBalance) return message.error('Insufficient balance');

    setLoading(true);
    if (caipNetwork.chainNamespace === 'eip155') {
      evmUtils
        .stake(evmStakingContract, amount.toString(), durationDay, projectInfo.id)
        .then((tx) => {
          const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx.hash}`;
          console.log('🔗Staking transaction link:', txLink);

          setLoading(false);
          setIsStakeModalOpen(true);
          updateBalanceAfterStake(Number(amount));
          message.success('The pledge is successful and the data will be updated in a few minutes.');
        })
        .catch((error) => {
          handleContractError(error);
          setLoading(false);
        });
    } else if (caipNetwork.chainNamespace === 'solana') {
      try {
        const nextStakeId = await solanaUtils.getNextStakeId(solanaProgram, Number(projectId));

        solanaUtils
          .stake(solanaProgram, nextStakeId, Number(amount), durationDay, Number(projectId))
          .then((tx) => {
            const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx}?cluster=${
              getContractConfig(chainId).cluster
            }`;
            console.log('🔗Staking transaction link:', txLink);

            setLoading(false);
            setIsStakeModalOpen(true);
            updateBalanceAfterStake(Number(amount));
            message.success('The pledge is successful and the data will be updated in a few minutes.');
          })
          .catch((error) => {
            handleContractError(error);
            setLoading(false);
          });
      } catch (error) {
        console.log(error);
        setLoading(false);
      }
    }
  };

  const closeStakeModal = () => {
    setIsStakeModalOpen(false);
    setAmount('');
  };

  const getMetricsGraph = () => {
    cookieAPI
      .GetMetricsGraph('0', '1', projectInfo.name)
      .then((res) => {
        if (res.success && res.ok) {
          const total = res.ok.entries.reduce((sum: number, item: any) => sum + item.value, 0);
          setEngagements(total);
        }
      })
      .catch((error) => {
        console.log(error);
      });
    cookieAPI
      .GetMetricsGraph('1', '1', projectInfo.name)
      .then((res) => {
        if (res.success && res.ok) {
          const total = res.ok.entries.reduce((sum: number, item: any) => sum + item.value, 0);
          setImpressions(total);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const getProjectMindshareGraph = () => {
    cookieAPI
      .GetProjectMindshareGraph(projectInfo.name)
      .then((res) => {
        if (res.success && res.ok) {
          const total = res.ok.entries.reduce((sum: number, item: any) => sum + item.value, 0);
          setMindshare(total);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const getProjectDetails = async () => {
    try {
      const projectDetailsRes = await cookieAPI.GetProjectDetails(projectInfo.name);
      if (projectDetailsRes.success && projectDetailsRes.ok) {
        const username = projectDetailsRes.ok.twitterUsernames[0];
        if (username) {
          const smartFollowersRes = await cookieAPI.GetAccountSmartFollowers(username);
          if (smartFollowersRes.success && smartFollowersRes.ok) {
            const total = smartFollowersRes.ok.totalCount;
            setSmartFollowers(total);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getSearchTweets = async () => {
    cookieAPI
      .SearchTweets(projectInfo.name, projectInfo.name)
      .then((res) => {
        if (res.success && res.ok) {
          const tweets = res.ok.entries.slice(0, 5);
          setTopTweets(tweets);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const getShareText = (amount: string, projectName: string) => {
    if (!amount || !projectName) return '';
    return `Staked on @AimonicaBrands ✅
${amount} ${projectName} → Reputation Points → Allocation Rights
Merit > Money 🎯`;
  };

  const handleShare = () => {
    if (!isTwitterConnected) {
      message.error('Please connect your Twitter account first');
      return;
    }
    const shareText = getShareText(amount, projectInfo.projectName);
    shareOnTwitter(shareText);
  };

  return (
    <div className="stake-page">
      <img src="/assets/images/img-37.png" alt="" className="img-37" />

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
                  <img src={projectInfo?.image} alt="" />
                  <span>{projectInfo?.projectName}</span>
                </div>
                <div className="icon-box">
                  <a href={projectInfo?.links?.website} target="_blank">
                    <img src="/assets/images/icon-website-blue.svg" alt="" />
                  </a>
                  <a href={projectInfo?.links?.x} target="_blank">
                    <img src="/assets/images/icon-twitter-blue.svg" alt="" />
                  </a>
                  <a href={projectInfo?.links?.twitter} target="_blank">
                    <img src="/assets/images/icon-telegram-blue.svg" alt="" />
                  </a>
                  <a href={projectInfo?.links?.dex} target="_blank">
                    <img src="/assets/images/icon-dexscreener-blue.svg" alt="" />
                  </a>
                </div>
              </div>
              <div className="text1">{projectInfo?.description?.slice(0, 100)}...</div>
              <div className="text2">
                <div>
                  <span>Users</span>
                  <span>{utils.formatNumber(projectInfo?.userCount)}</span>
                </div>
                <div>
                  <span>TVL</span>
                  <span>$ {utils.formatNumber(projectInfo?.tvl)}</span>
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
                  <div className="s-text">Points {getRewardPoints(durationDay)}x AIM</div>
                </div>
              </div>
              <div className="text margin-bottom">
                <span>Your Balance</span>
              </div>
              <div className="avatar-box-box">
                <div className="avatar-box">
                  <img src={projectInfo?.image} alt="" />
                  <span>{projectInfo?.projectName}</span>
                </div>
                <div className="number-box">
                  <div className="number">{utils.formatNumber(tokenBalance, 4)}</div>
                  <div className="number2">$ {utils.formatNumber(tokenWorth, 4)}</div>
                </div>
              </div>
              <div className="inputbox">
                <Input
                  type="number"
                  placeholder={`Enter Amount`}
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // 限制小数部分不超过8位
                    if (value.includes('.')) {
                      const parts = value.split('.');
                      if (parts[1] && parts[1].length > 8) {
                        return;
                      }
                    }
                    setAmount(value);
                  }}
                  disabled={loading}
                />
                <button className="max-btn" onClick={() => setAmount(tokenBalance.toString())}>
                  MAX
                </button>
              </div>
              <div className="text">
                <span>Locking Time</span>
                <div className="days">
                  {durationConfig?.map((day: any) => (
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
                <div className="number">{utils.formatNumber(expectedPoints, 4)}</div>
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

      <div className="cookie-box">
        <div className="cookie-box1">
          <div className="title">Influence Metrics</div>
          <div className="textbox">
            <div className="text-item">
              <div className="text1">
                Mindshare{' '}
                <Tooltip title="The percentage of the total conversation about the token on Twitter.">
                  <QuestionCircleOutlined style={{ fontSize: '0.18rem' }} />
                </Tooltip>
              </div>
              <div className="text">{utils.formatNumber(mindshare)}%</div>
            </div>
            <div className="text-item">
              <div className="text1">Impressions</div>
              <div className="text">{utils.formatNumber(impressions)}</div>
            </div>
            <div className="text-item">
              <div className="text1">Engagement</div>
              <div className="text">{utils.formatNumber(engagements)}</div>
            </div>
            <div className="text-item">
              <div className="text1">Smart Followers</div>
              <div className="text">{utils.formatNumber(smartFollowers)}</div>
            </div>
            <div className="text-item">
              <div className="text1">Top Tweets</div>
              <div className="avatar-box">
                {topTweets.map((tweet: any, index: number) => (
                  <Popover
                    key={index}
                    content={() => {
                      return (
                        <div className="tweet-popover">
                          <div className="title">
                            <img src={tweet.author.profileImageUrl} alt="" />
                            <span>{tweet.author.username}</span>
                          </div>
                          <div className="content">{tweet.text}</div>
                        </div>
                      );
                    }}
                    arrow={false}>
                    {/* <a
                      href={`https://x.com/${tweet.author.username}/status/${tweet.tweetId}`}
                      target="_blank"
                      style={{ left: `-${index * 0.05}rem` }}>
                      <img src={tweet.author.profileImageUrl} alt="" />
                    </a> */}
                    <div style={{ left: `-${index * 0.05}rem` }}>
                      <img src={tweet.author.profileImageUrl} alt="" />
                    </div>
                  </Popover>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* <div className="cookie-box2">
          <div className="title">Why This Agent Is Bullish</div>
          <div className="des">{projectInfo?.description?.slice(0, 100)}...</div>
          <div className="textbox">
            <div className="text-item">
              <div>Links</div>
              <div>N/A</div>
            </div>
            <div className="text-item">
              <div>Framework</div>
              <div>N/A</div>
            </div>
            <div className="text-item">
              <div>Capabilities</div>
              <div>N/A</div>
            </div>
          </div>
        </div>
        <div className="cookie-box3">
          <div className="title">Submit your Alpha Thesis</div>
          <div className="des">Help this agent stand out</div>
          <img src="/assets/images/img-36.png" alt="" className="img-36" />
        </div>
        <div className="cookie-box4">
          <Tabs defaultActiveKey="1" items={infoItems} onChange={onChange} />
        </div> */}
      </div>

      <Modal
        className="stake-modal"
        width={'fit-content'}
        centered
        closable={false}
        footer={null}
        open={isStakeModalOpen}
        onOk={closeStakeModal}
        onCancel={closeStakeModal}>
        <div className="stake-modal-box">
          <img src="/assets/images/img-27.png" alt="" className="img-27" />
          <img src="/assets/images/img-28.png" alt="" className="img-28" />
          <img src="/assets/images/img-29.png" alt="" className="img-29" />
          <img src="/assets/images/img-30.png" alt="" className="img-30" />
          <img src="/assets/images/img-31.png" alt="" className="img-31" />
          <img src="/assets/images/img-32.png" alt="" className="img-32" />
          <img src="/assets/images/img-33.png" alt="" className="img-33" onClick={closeStakeModal} />

          <div className="text1">
            Stake <br /> Success
          </div>
          <div className="text2">
            <div style={{ whiteSpace: 'pre-line' }}>{getShareText(amount, projectInfo?.projectName)}</div>
          </div>
          <div className="text3">
            <a href="https://aimonicabrands.ai" target="_blank" rel="noopener noreferrer">
              https://aimonicabrands.ai
            </a>
            <div className="btn-box">
              <button className="btn-close" onClick={closeStakeModal}>
                close
              </button>
              <button className="btn-share" onClick={handleShare}>
                Share On
                <img src="/assets/images/icon-twitter.svg" alt="" />
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
