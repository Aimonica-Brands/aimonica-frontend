import React, { useState, useEffect } from 'react';
import { Button, Table, Popover, Collapse, Spin } from 'antd';
import { useRouter } from 'next/router';
import type { ColumnsType } from 'antd/es/table';
import { useAppKitNetwork, useAppKitAccount } from '@reown/appkit/react';
import { getContractConfig, modal } from '@/wallet';
import { usePageContext } from '@/context';
import { evmUtils, solanaUtils } from '@/wallet/utils';
import utils from '@/utils';

export default function Home() {
  const router = useRouter();
  const { evmStakingContract, solanaProgram, projectsData, setProjectsData } = usePageContext();
  const { isConnected, address } = useAppKitAccount();
  const { caipNetwork, chainId } = useAppKitNetwork();
  const [levelData, setLevelData] = useState([]);

  const [loading, setLoading] = useState(false);
  const [networkId, setNetworkId] = useState('');
  const [tabIndex2, setTabIndex2] = useState(0);

  const align = 'center' as const;
  const projectColumns: ColumnsType<any> = [
    {
      title: 'Rank',
      key: 'rank',
      align,
      render: (value: any, record: any) => {
        return <div className="rank">{record.rank}</div>;
      }
    },
    {
      title: 'Project',
      key: 'project',
      align,
      render: (value: any, record: any) => {
        return (
          <Popover
            color="transparent"
            content={() => {
              return (
                <div className="project-popover">
                  <div className="title">
                    <div className="name">
                      <img src={record.image} alt="" />
                      <span>{record.projectName}</span>
                    </div>
                    <div className="number">$ {record.coinPriceUsd}</div>
                  </div>
                  <div className="info">
                    <div className="info-title">
                      <img src="/assets/images/img-18.png" alt="" />
                      <span>Project Introduction</span>
                    </div>
                    <div className="info-text">{record.description?.slice(0, 100)}...</div>
                    <div className="info-title">
                      <img src="/assets/images/img-19.png" alt="" />
                      <span>Social Media</span>
                    </div>
                    <a href={record.links?.website} target="_blank">
                      <img src="/assets/images/icon-website-blue.svg" alt="" />
                      {record.links?.website?.slice(0, 30)}...
                    </a>
                    <a href={record.links?.x} target="_blank">
                      <img src="/assets/images/icon-twitter-blue.svg" alt="" />
                      {record.links?.x?.slice(0, 30)}...
                    </a>
                    <a href={record.links?.twitter} target="_blank">
                      <img src="/assets/images/icon-telegram-blue.svg" alt="" />
                      {record.links?.twitter?.slice(0, 30)}...
                    </a>
                    <a href={record.links?.dex} target="_blank">
                      <img src="/assets/images/icon-dexscreener-blue.svg" alt="" />
                      {record.links?.dex?.slice(0, 30)}...
                    </a>
                  </div>
                </div>
              );
            }}
            arrow={false}>
            <div className="project">
              <div>
                <img src={record.image} alt="" />
                <span>{record.projectName}</span>
              </div>
              <img src="/assets/images/fire.svg" alt="" />
            </div>
          </Popover>
        );
      }
    },
    {
      title: 'Staked',
      key: 'totalStaked',
      align,
      render: (value: any, record: any) => {
        return <div className="rank">{utils.formatNumber(record.totalStaked)}</div>;
      }
    },
    {
      title: 'Users',
      key: 'userCount',
      align,
      render: (value: any, record: any) => {
        return <div className="rank">{utils.formatNumber(record.userCount)}</div>;
      }
    },
    {
      title: 'Points',
      key: 'points',
      align,
      render: (value: any, record: any) => {
        return (
          <div className="s-box">
            <div className="s-img">
              <img src="/assets/images/img-3.png" alt="" />
            </div>
            <div className="s-text">{utils.formatNumber(record.points)}</div>
          </div>
        );
      }
    },
    {
      title: 'TVL($)',
      key: 'tvl',
      align,
      render: (value: any, record: any) => {
        return (
          <div className="s-box">
            <div className="s-img">
              <img src="/assets/images/img-4.png" alt="" />
            </div>
            <div className="s-text">$ {utils.formatNumber(record.tvl)}</div>
          </div>
        );
      }
    },
    {
      title: 'Rewards',
      key: 'rewards',
      align,
      render: (value: any, record: any) => {
        return (
          <div className="s-box">
            <div className="s-img">
              <img src="/assets/images/img-5.png" alt="" />
            </div>
            <div className="s-text">AIM Points</div>
          </div>
        );
      }
    },
    {
      title: 'Action',
      key: 'action',
      align,
      width: 100,
      fixed: 'right',
      render: (value: any, record: any) => {
        return (
          <div className="action">
            <Button className="stake-btn" onClick={() => toStake(record)}>
              Stake
            </Button>
          </div>
        );
      }
    }
  ];

  const text = `
  A dog is a type of domesticated animal.
  Known for its loyalty and faithfulness,
  it can be found as a welcome guest in many households across the world.
`;
  const faqsList = [
    {
      key: '1',
      label: 'This is panel header 1',
      children: <p>{text}</p>
    },
    {
      key: '2',
      label: 'This is panel header 2',
      children: <p>{text}</p>
    },
    {
      key: '3',
      label: 'This is panel header 3',
      children: <p>{text}</p>
    }
  ];

  useEffect(() => {
    if (projectsData.length > 0) {
      setLevelData(projectsData.slice(0, 3));
    }
  }, [projectsData]);

  useEffect(() => {
    if (isConnected && address && caipNetwork && chainId) {
      setNetworkId(chainId.toString());

      getProjectData();
    } else {
      setNetworkId('');
    }
  }, [isConnected, address, caipNetwork, chainId, evmStakingContract, solanaProgram]);

  const getProjectData = async () => {
    setLoading(true);
    setProjectsData([]);
    if (caipNetwork.chainNamespace === 'eip155') {
      if (evmStakingContract) {
        getEVMProjects();
      }
    } else if (caipNetwork.chainNamespace === 'solana') {
      if (solanaProgram) {
        getSolanaProjects();
      }
    }
  };

  const getSolanaProjects = async () => {
    solanaUtils
      .getProjects(solanaProgram)
      .then((sortedProjects) => {
        setProjectsData(sortedProjects);
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const getEVMProjects = async () => {
    evmUtils
      .getProjects()
      .then((sortedProjects) => {
        setProjectsData(sortedProjects);
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleTabClick = (network: any) => async () => {
    if (network) {
      modal
        .switchNetwork(network)
        .then(() => {
          setNetworkId(network.id.toString());
        })
        .catch((error) => {
          console.error('切换网络失败:', error);
        });
    } else {
      setNetworkId('');
    }
  };

  const toStake = (project: any) => {
    router.push(`/stake/${project.id}`);
  };

  return (
    <div className="explore-page">
      <div className="banner">
        <img src="/assets/images/banner-1.png" alt="" className="banner-1" />
        <div className="banner-content">
          <div className="css-box">
            <div className="border1"></div>
            <img src="/assets/images/star-2.svg" alt="" className="logo2" />
            <div className="border2"></div>
          </div>
          <div className="text">
            The first AI agent and meme focused waifu investor. Outperforming all web3 VCs via AIMonica Capital (AC) is
            her goal.
          </div>
        </div>
        {/* <div className="text2">
          <div>Total Stakers</div>
          <div>7,766</div>
        </div>
        <div className="text3">
          <div>Total TVL</div>
          <div>7,766</div>
        </div> */}
      </div>

      <div className="rolling-box rolling-box-1">
        <div className="rolling-content">
          {Array.from({ length: 10 }).map((_, index) => (
            <span className="rolling-item" key={index}>
              AIMONICA
            </span>
          ))}
        </div>
      </div>

      <div className="page-box">
        <div className="page-box-box">
          <div className="banner2">
            <div className="banner2-content">
              <div className="text1">
                The first AI agent and meme focused waifu investor. Outperforming all web3 VCs via AIMonica Capital (AC)
                is her goal.
              </div>
              <img src="/assets/images/text.png" alt="" className="text-img" />
              <img src="/assets/images/img-1.png" alt="" className="img-1" />
              <img src="/assets/images/img-2.png" alt="" className="img-2" />
            </div>
          </div>

          <div className="title-box">
            <div className="title">
              Top 100 Project Summary
              <img src="/assets/images/star.png" alt="" className="star-img" />
            </div>
            <div className="css-box">
              <div className="border1"></div>
              <img src="/assets/images/star-2.svg" alt="" className="logo2" />
              <div className="border2"></div>
            </div>
          </div>

          <div className="tab-box-box">
            <div className="tab-box">
              {/* <button className={networkId === '' ? 'active' : ''} onClick={handleTabClick(null)}>
                All Chain
              </button> */}
              {getContractConfig().map((item: any) => {
                return (
                  <button
                    key={item.network.id}
                    className={networkId === item.network.id.toString() ? 'active' : ''}
                    onClick={handleTabClick(item.network)}>
                    {item.network.name}
                  </button>
                );
              })}
            </div>
            <div className="tab-box tab-box2">
              <button className={tabIndex2 === 0 ? 'active' : ''} onClick={() => setTabIndex2(0)}>
                24H
              </button>
              <button className={tabIndex2 === 1 ? 'active' : ''} onClick={() => setTabIndex2(1)}>
                7D
              </button>
            </div>
          </div>

          <div className="level-box">
            {loading ? (
              <Spin />
            ) : (
              levelData &&
              levelData.map((item, index) => (
                <div className="level-item" key={item.id}>
                  <img src={`/assets/images/level-bg-${index + 1}.png`} className="bg" />
                  <img src={`/assets/images/level-${index + 1}.png`} className="level" />
                  <div className="avatar-box">
                    <div className="avatar">
                      <img src={item.image} className="avatar" />
                    </div>
                    <div className="name">{item.projectName}</div>
                  </div>
                  <div className="info-box">
                    <div className="info-box-item">
                      <div className="s-box">
                        <div className="s-img">
                          <img src="/assets/images/img-3.png" alt="" />
                        </div>
                        <div className="s-text">{utils.formatNumber(item.points)}</div>
                      </div>
                      <div className="s-box">
                        <div className="s-img">
                          <img src="/assets/images/img-4.png" alt="" />
                        </div>
                        <div className="s-text">{utils.formatNumber(item.tvl)}</div>
                      </div>
                      <div className="s-box">
                        <div className="s-img">
                          <img src="/assets/images/img-5.png" alt="" />
                        </div>
                        <div className="s-text">AIM Points</div>
                      </div>
                    </div>
                    <div className="info-box-item">
                      <div className="info-item">
                        <div>Staked</div>
                        <div>{utils.formatNumber(item.totalStaked)}</div>
                      </div>
                      <div className="info-item">
                        <div>Users</div>
                        <div>{utils.formatNumber(item.userCount)}</div>
                      </div>
                      <div className="info-item2">
                        <button className="stake-btn" onClick={() => toStake(item)}>
                          Stake
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="tablebox">
            <Table
              scroll={{ x: 'max-content' }}
              columns={projectColumns}
              dataSource={projectsData}
              pagination={false}
              loading={loading}
              rowKey={(record) => record.id}
            />
          </div>

          <div className="rolling-box rolling-box-2">
            <div className="rolling-content">
              {Array.from({ length: 10 }).map((_, index) => (
                <span className="rolling-item" key={index}>
                  AIMONICA
                </span>
              ))}
            </div>
          </div>
        </div>

        <img src="/assets/images/img-11.png" alt="" className="img-11" />
        <img src="/assets/images/img-12.png" alt="" className="img-12" />
        <img src="/assets/images/img-13.png" alt="" className="img-13" />
        <img src="/assets/images/img-14.png" alt="" className="img-14" />
      </div>

      <div className="page-box2">
        <img src="/assets/images/img-16.png" alt="" className="img-16" />
        <div className="faq-box">
          <div className="title-box-2">
            FAQs
            <img src="/assets/images/star.png" alt="" className="star-img" />
          </div>
          <div className="faq-content">
            <Collapse
              accordion
              expandIconPosition={'end'}
              bordered={false}
              ghost={true}
              items={faqsList}
              defaultActiveKey={['1']}
            />
          </div>
        </div>
        <img src="/assets/images/img-15.png" alt="" className="img-15" />
      </div>
    </div>
  );
}
