import React, { useState, useEffect } from 'react';
import { Button, Table, Empty, Spin, App, Popover, Collapse } from 'antd';
import { useRouter } from 'next/router';
import type { ColumnsType } from 'antd/es/table';

export default function Home() {
  const router = useRouter();
  const [projectData, setProjectData] = useState([
    { rank: 1, avatar: '/assets/images/avatar-1.png', name: 'Aimonica' },
    { rank: 2, avatar: '/assets/images/avatar-2.png', name: 'FAI' },
    { rank: 3, avatar: '/assets/images/avatar-3.png', name: 'Ai16z' }
  ]);

  const [levelData, setLevelData] = useState([]);

  const [loading, setLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [tabIndex2, setTabIndex2] = useState(0);

  const align = 'center' as const;
  const projectColumns: ColumnsType<any> = [
    {
      title: 'Rank',
      dataIndex: 'rank',
      align,
      width: 60,
      render: (value: any, record: any) => {
        return <div className="rank">{value}</div>;
      }
    },
    {
      title: 'Project',
      dataIndex: '',
      align,
      width: 150,
      render: (value: any, record: any) => {
        return (
          <Popover
            content={() => {
              return (
                <div className="project-popover">
                  <div className="title">
                    <div className="name">
                      <img src={record.avatar} alt="" />
                      <span>{record.name}</span>
                    </div>
                    <div className="number">$ 0.0042370</div>
                  </div>
                  <div className="info">
                    <div className="info-title">
                      <img src="/assets/images/img-18.png" alt="" />
                      <span>Project Introduction</span>
                    </div>
                    <div className="info-text">The first AI agent and meme focused waifu investor</div>
                    <div className="info-title">
                      <img src="/assets/images/img-19.png" alt="" />
                      <span>Social Media</span>
                    </div>
                    <a href="https://x.com/AimonicaBrands">
                      <img src="/assets/images/icon-twitter-2.png" alt="" />
                      https://x.com/AimonicaBrands
                    </a>
                    <a href="https://x.com/AimonicaBrands">
                      <img src="/assets/images/icon-telegram-2.png" alt="" />
                      https://x.com/AimonicaBrands
                    </a>
                    <a href="https://x.com/AimonicaBrands">
                      <img src="/assets/images/icon-discord-2.png" alt="" />
                      https://x.com/AimonicaBrands
                    </a>
                    <a href="https://x.com/AimonicaBrands">
                      <img src="/assets/images/icon-medium-2.png" alt="" />
                      https://x.com/AimonicaBrands
                    </a>
                  </div>
                </div>
              );
            }}
            arrow={false}>
            <div className="project">
              <div>
                <img src={record.avatar} alt="" />
                <span>{record.name}</span>
              </div>
              <img src="/assets/images/fire.svg" alt="" />
            </div>
          </Popover>
        );
      }
    },
    {
      title: 'Staked',
      dataIndex: '',
      align,
      width: 80,
      render: (value: any, record: any) => {
        return <div className="rank">100M</div>;
      }
    },
    {
      title: 'Users',
      dataIndex: '',
      align,
      width: 80,
      render: (value: any, record: any) => {
        return <div className="rank">100</div>;
      }
    },
    {
      title: 'Total Points',
      dataIndex: '',
      align,
      width: 150,
      render: (value: any, record: any) => {
        return (
          <div className="s-box">
            <div className="s-img">
              <img src="/assets/images/img-3.png" alt="" />
            </div>
            <div className="s-text">1321546521</div>
          </div>
        );
      }
    },
    {
      title: 'TVL($)',
      dataIndex: '',
      align,
      width: 150,
      render: (value: any, record: any) => {
        return (
          <div className="s-box">
            <div className="s-img">
              <img src="/assets/images/img-4.png" alt="" />
            </div>
            <div className="s-text">$ 1321546521</div>
          </div>
        );
      }
    },
    {
      title: 'Rewards',
      dataIndex: '',
      align,
      width: 160,
      render: (value: any, record: any) => {
        return (
          <div className="s-box">
            <div className="s-img">
              <img src="/assets/images/img-5.png" alt="" />
            </div>
            <div className="s-text">Points 7.5x AIM</div>
          </div>
        );
      }
    },
    {
      title: '',
      dataIndex: '',
      align,
      width: 100,
      fixed: 'right',
      render: (value: any, record: any) => {
        return (
          <div className="action">
            <button className="stake-btn" onClick={() => toStake(record)}>
              Stake
            </button>
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
    setLevelData([projectData[1], projectData[0], projectData[2]]);
  }, []);

  const toStake = (record: any) => {
    console.log(record);

    router.push(`/stake/${record.rank}`);
  };

  return (
    <div className="explore-page">
      <div className="banner">
        <img src="/assets/images/banner-1.png" alt="" className="banner-1" />
        <div className="banner-content">
          <div className="css-box">
            <div className="border1"></div>
            <img src="/assets/images/logo2.svg" alt="" className="logo2" />
            <div className="border2"></div>
          </div>
          <div className="text">
            The first AI agent and meme focused waifu investor. Outperforming all web3 VCs via AIMonica Capital (AC) is
            her goal.
          </div>
        </div>
        <div className="text2">
          <div>Total Stakers</div>
          <div>7,766</div>
        </div>
        <div className="text3">
          <div>Total TVL</div>
          <div>7,766</div>
        </div>
      </div>

      <div className="rolling-box rolling-box-1">
        <div className="rolling-content">
          <span className="rolling-item">AIMONICA</span>
          <span className="rolling-item">AIMONICA</span>
          <span className="rolling-item">AIMONICA</span>
          <span className="rolling-item">AIMONICA</span>
          <span className="rolling-item">AIMONICA</span>
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
              <img src="/assets/images/logo2.svg" alt="" className="logo2" />
              <div className="border2"></div>
            </div>
          </div>

          <div className="tab-box-box">
            <div className="tab-box">
              <button className={tabIndex === 0 ? 'active' : ''} onClick={() => setTabIndex(0)}>
                All Chain
              </button>
              <button className={tabIndex === 1 ? 'active' : ''} onClick={() => setTabIndex(1)}>
                Solana
              </button>
              <button className={tabIndex === 2 ? 'active' : ''} onClick={() => setTabIndex(2)}>
                Base
              </button>
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
            {levelData.map((item) => (
              <div className="level-item" key={item.rank}>
                <img src={`/assets/images/level-bg-${item.rank}.png`} className="bg" />
                <img src={`/assets/images/level-${item.rank}.png`} className="level" />
                <div className="avatar-box">
                  <div className="avatar">
                    <img src={item.avatar} className="avatar" />
                  </div>
                  <div className="name">{item.name}</div>
                </div>
                <div className="info-box">
                  <div className="info-box-item">
                    <div className="s-box">
                      <div className="s-img">
                        <img src="/assets/images/img-3.png" alt="" />
                      </div>
                      <div className="s-text">1321546521</div>
                    </div>
                    <div className="s-box">
                      <div className="s-img">
                        <img src="/assets/images/img-4.png" alt="" />
                      </div>
                      <div className="s-text">1321546521</div>
                    </div>
                    <div className="s-box">
                      <div className="s-img">
                        <img src="/assets/images/img-5.png" alt="" />
                      </div>
                      <div className="s-text">1321546521</div>
                    </div>
                  </div>
                  <div className="info-box-item">
                    <div className="info-item">
                      <div>Staked</div>
                      <div>100M</div>
                    </div>
                    <div className="info-item">
                      <div>Users</div>
                      <div>100</div>
                    </div>
                    <div className="info-item2">
                      <button className="stake-btn" onClick={() => toStake(item)}>
                        Stake
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Table
            className="tablebox"
            scroll={{ x: 'max-content' }}
            columns={projectColumns}
            dataSource={projectData}
            pagination={false}
            loading={loading}
            rowKey={(record) => record.rank}
          />

          <div className="rolling-box rolling-box-2">
            <div className="rolling-content">
              <span className="rolling-item">AIMONICA</span>
              <span className="rolling-item">AIMONICA</span>
              <span className="rolling-item">AIMONICA</span>
              <span className="rolling-item">AIMONICA</span>
              <span className="rolling-item">AIMONICA</span>
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
