import React, { useState, useEffect } from 'react';
import { Button, Table, Empty, Spin, App, Popover, Collapse } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import type { ColumnsType } from 'antd/es/table';
import { useAppKitNetwork, useAppKitAccount } from '@reown/appkit/react';
import { getContractConfig } from '@/wallet';
import { modal } from '@/wallet';

export default function Dashboard() {
  const router = useRouter();
  const { chainId } = useAppKitNetwork();
  const { isConnected } = useAppKitAccount();

  const [assetsLoading, setAssetsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [networkId, setNetworkId] = useState('');

  const align = 'center' as const;
  const assetsColumns: ColumnsType<any> = [
    {
      title: 'Project',
      dataIndex: '',
      align,
      width: 80,
      render: (value: any, record: any) => {
        return <div className="text">Aimonica</div>;
      }
    },
    {
      title: 'Staked',
      dataIndex: '',
      align,
      width: 80,
      render: (value: any, record: any) => {
        return <div className="text">18.3K</div>;
      }
    },
    {
      title: 'Staking Start Time',
      dataIndex: '',
      align,
      width: 160,
      render: (value: any, record: any) => {
        return <div className="text">2025-5-25 17:26:46</div>;
      }
    },
    {
      title: 'Locking Time',
      dataIndex: '',
      align,
      width: 80,
      render: (value: any, record: any) => {
        return <div className="text">14D</div>;
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
      title: 'Points',
      dataIndex: '',
      align,
      width: 160,
      render: (value: any, record: any) => {
        return (
          <div className="s-box">
            <div className="s-img">
              <img src="/assets/images/img-25.png" alt="" />
            </div>
            <div className="s-text">6,603</div>
          </div>
        );
      }
    },
    {
      title: '',
      dataIndex: '',
      align,
      fixed: 'right',
      width: 100,
      render: (value: any, record: any) => {
        return (
          <div className="action">
            <button className="stake-btn">Unstake</button>
          </div>
        );
      }
    }
  ];
  const historyDataSource = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
  const historyColumns: ColumnsType<any> = [
    {
      title: 'Project',
      dataIndex: '',
      align,
      width: 80,
      render: (value: any, record: any) => {
        return <div className="text">Aimonica</div>;
      }
    },
    {
      title: 'Staked',
      dataIndex: '',
      align,
      width: 120,
      render: (value: any, record: any) => {
        return (
          <>
            {/* <div className="staked-status Completed">Completed</div> */}
            <div className="staked-status Redeemed">Redeemed</div>
          </>
        );
      }
    },
    {
      title: 'Redemption Time',
      dataIndex: '',
      align,
      width: 160,
      render: (value: any, record: any) => {
        return <div className="text">2025-5-25 17:26:46</div>;
      }
    },
    {
      title: 'Hash',
      dataIndex: '',
      align,
      width: 160,
      render: (value: any, record: any) => {
        return (
          <a className="hash">
            <span>51cqdv.....BU4</span>
            <ExportOutlined />
          </a>
        );
      }
    }
  ];
  const assetsDataSource = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];

  useEffect(() => {
    if (isConnected && chainId) {
      setNetworkId(chainId.toString());
    } else {
      setNetworkId('');
    }
  }, [isConnected, chainId]);

  const handleTabClick = (network: any) => async () => {
    // modal.open({ view: "Networks" });
    console.log('目标网络:', network);
    if (network) {
      modal.switchNetwork(network).then(() => {
        console.log('切换网络成功');
        setNetworkId(network.id.toString());
      }).catch((error) => {
        console.error('切换网络失败:', error);
      });
    } else {
      setNetworkId('');
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-box">
        <div className="title-box">
          <div className="title">
            Dashboard
            <img src="/assets/images/star.png" alt="" className="star-img" />
          </div>
          <div className="css-box">
            <div className="border1"></div>
            <img src="/assets/images/logo2.svg" alt="" className="logo2" />
            <div className="border2"></div>
          </div>
        </div>

        <div className="banner-box">
          <div className="banner-item">
            <div className="banner-item-title">Total Points</div>
            <div className="s-box">
              <div className="s-img">
                <img src="/assets/images/img-3.png" alt="" />
              </div>
              <div className="s-text">1321546521</div>
            </div>
          </div>
          <div className="banner-item">
            <div className="banner-item-title">Total Staked</div>
            <div className="text">1321546521</div>
          </div>
          <div className="banner-item">
            <div className="banner-item-title">Total Project</div>
            <div className="text">1321546521</div>
          </div>
          <img src="/assets/images/img-24.png" alt="" className="img-24" />
        </div>

        <div className="title-box-2">
          Assets
          <img src="/assets/images/star.png" alt="" className="star-img" />
        </div>
        <div className="tab-box">
          <button className={networkId === '' ? 'active' : ''} onClick={handleTabClick(null)}>
            All Chain
          </button>
          {
            getContractConfig().map((item: any) => {
              return (
                <button className={networkId === item.network.id.toString() ? 'active' : ''} onClick={handleTabClick(item.network)}>
                  {item.network.name}
                </button>
              );
            })
          }
        </div>

        <Table
          className="tablebox"
          scroll={{ x: 'max-content' }}
          columns={assetsColumns}
          dataSource={assetsDataSource}
          pagination={false}
          loading={assetsLoading}
          rowKey={(record) => record.id}
        />

        <div className="title-box-2">
          Staking History
          <img src="/assets/images/star.png" alt="" className="star-img" />
        </div>
        <Table
          className="tablebox"
          scroll={{ x: 'max-content' }}
          columns={historyColumns}
          dataSource={historyDataSource}
          pagination={false}
          loading={historyLoading}
          rowKey={(record) => record.id}
        />
      </div>
    </div>
  );
}
