import { useState, useEffect } from 'react';
import { Button, Table, App, Tag, Space, Modal } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppKitNetwork, useAppKitAccount } from '@reown/appkit/react';
import { getContractConfig, modal, handleContractError } from '@/wallet';
import { getRewardPoints, evmUtils, solanaUtils, getProjectConfigPda } from '@/wallet/utils';
import { usePageContext } from '@/context';
import utils from '@/utils';
import { aimonicaAPI } from '@/pages/api/aimonica';
import { ethers } from 'ethers';

export default function Dashboard() {
  const { message } = App.useApp();
  const { chainId, caipNetwork } = useAppKitNetwork();
  const { isConnected, address } = useAppKitAccount();
  const { evmStakingContract, solanaProgram } = usePageContext();

  const [networkId, setNetworkId] = useState('');
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalStaked, setTotalStaked] = useState(0);
  const [totalProject, setTotalProject] = useState(0);
  const [isUnstakeModalOpen, setIsUnstakeModalOpen] = useState(false);
  const [isEmergencyUnstakeModalOpen, setIsEmergencyUnstakeModalOpen] = useState(false);
  const [stakeRecords, setStakeRecords] = useState([]);
  const [unstakeLoading, setUnstakeLoading] = useState(false);
  const [stakeRecordsLoading, setStakeRecordsLoading] = useState(false);
  const [unstakeRecord, setUnstakeRecord] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);

  const [unstakeFeeRate, setUnstakeFeeRate] = useState(0);
  const [emergencyUnstakeFeeRate, setEmergencyUnstakeFeeRate] = useState(0);

  const align = 'center' as const;
  const historyColumns: ColumnsType<any> = [
    {
      title: 'Project',
      dataIndex: 'projectName'
    },
    {
      title: 'Stake ID',
      dataIndex: 'id',
      render: (value: any, record: any) => {
        if (caipNetwork.chainNamespace === 'solana') {
          return record.id.slice(0, 4) + '...' + record.id.slice(-4);
        }
        return value;
      }
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (value: number) => `${utils.formatNumber(value)}`
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      render: (value: number) => `${value} Day`
    },
    {
      title: 'Redemption Time',
      dataIndex: 'createdAt',
      render: (value: number) => new Date(value).toLocaleString()
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value: any, record: any) => {
        return <Tag color={value === 'Active' ? 'green' : '#bdbdbd'}>{value}</Tag>;
      }
    },
    ...(caipNetwork?.chainNamespace === 'eip155'
      ? [
          {
            title: 'Hash',
            dataIndex: 'transactionHash',
            render: (value: any, record: any) => {
              return (
                <a className="hash" href={`${caipNetwork.blockExplorers.default.url}/tx/${value}`} target="_blank">
                  <span>
                    {value.slice(0, 6)}...{value.slice(-6)}
                  </span>
                  <ExportOutlined />
                </a>
              );
            }
          }
        ]
      : [])
  ];

  const stakeColumns: any[] = [
    {
      title: 'Project',
      dataIndex: 'projectName'
    },
    {
      title: 'Stake ID',
      dataIndex: 'id',
      render: (value: any, record: any) => {
        if (caipNetwork.chainNamespace === 'solana') {
          return record.publicKey.slice(0, 4) + '...' + record.publicKey.slice(-4);
        }
        return value;
      }
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (value: number) => `${utils.formatNumber(value)}`
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      render: (value: number) => `${value} Day`
    },
    {
      title: 'Staked Time',
      dataIndex: 'stakedAt',
      render: (value: number) => new Date(value).toLocaleString()
    },
    {
      title: 'Unlocked Time',
      dataIndex: 'unlockedAt',
      render: (value: number) => new Date(value).toLocaleString()
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value: any, record: any) => {
        return <Tag color="green">Active</Tag>;
      }
    },
    {
      title: 'Points',
      dataIndex: 'points',
      align,
      render: (value: any, record: any) => {
        return (
          <div className="s-box">
            <div className="s-img">
              <img src="/assets/images/img-3.png" alt="" />
            </div>
            <div className="s-text">{utils.formatNumber(value)}</div>
          </div>
        );
      }
    },
    {
      title: 'Rewards',
      dataIndex: 'rewards',
      align,
      render: (value: any, record: any) => {
        return (
          <div className="s-box">
            <div className="s-img">
              <img src="/assets/images/img-5.png" alt="" />
            </div>
            <div className="s-text">Points {getRewardPoints(record.duration)}x AIM</div>
          </div>
        );
      }
    },
    {
      title: 'Action',
      dataIndex: 'action',
      fixed: 'right',
      render: (value: any, record: any) => (
        <Space direction="vertical">
          <Button className="unstake-btn" disabled={!record.canUnstake} onClick={() => openUnstakeModal(record)}>
            Unstake
          </Button>
          <Button className="emergency-btn" onClick={() => openEmergencyUnstakeModal(record)}>
            Emergency
          </Button>
        </Space>
      )
    }
  ];

  useEffect(() => {
    const initData = async () => {
      if (isConnected && address && caipNetwork && chainId) {
        setNetworkId(chainId.toString());
        getStakeRecords();
      } else {
        setNetworkId('');
        setStakeRecords([]);
        setHistoryRecords([]);
        setTotalPoints(0);
        setTotalStaked(0);
        setTotalProject(0);
      }
    };

    initData();
  }, [isConnected, address, caipNetwork, chainId, evmStakingContract, solanaProgram]);

  useEffect(() => {
    if (historyRecords.length > 0) {
      setTotalStaked(historyRecords.reduce((acc, record) => acc + record.amount, 0));
      setTotalProject(
        historyRecords.reduce((acc, record) => {
          if (acc.includes(record.projectId)) {
            return acc;
          }
          return [...acc, record.projectId];
        }, []).length
      );
    }
  }, [historyRecords]);

  const getStakeRecords = async () => {
    if (caipNetwork.chainNamespace === 'eip155') {
      if (evmStakingContract) {
        getEvmStakeRecords();
        getFeeConfig();
        getPointsDashboard();
      }
    } else if (caipNetwork.chainNamespace === 'solana') {
      if (solanaProgram) {
        getSolanaStakeRecords();
        getPointsDashboard();
      }
    }
  };

  const getFeeConfig = async () => {
    evmUtils
      .getFeeConfig(evmStakingContract)
      .then((config) => {
        setUnstakeFeeRate(config.unstakeFeeRate);
        setEmergencyUnstakeFeeRate(config.emergencyUnstakeFeeRate);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const getEvmStakeRecords = async (id: number = null, stakeAmount: number = null) => {
    setStakeRecordsLoading(true);
    evmUtils
      .getStakeRecords(address)
      .then((records) => {
        const newRecords = records.map((record) => {
          record.points = record.amount * getRewardPoints(record.duration);
          return record;
        });
        setStakeRecords(newRecords);
      })
      .catch((error) => {
        console.error(error);
        setStakeRecords([]);
      })
      .finally(() => {
        setStakeRecordsLoading(false);
      });
  };

  const getSolanaStakeRecords = async (id: number = null, stakeAmount: number = null) => {
    setStakeRecordsLoading(true);
    solanaUtils
      .getStakeRecords(solanaProgram)
      .then((records) => {
        const newRecords = records.map((record) => {
          record.points = record.amount * getRewardPoints(record.duration);
          return record;
        });
        setStakeRecords(newRecords);
      })
      .catch((error) => {
        console.error(error);
        setStakeRecords([]);
      })
      .finally(() => {
        setStakeRecordsLoading(false);
      });
  };

  const handleUnstake = async () => {
    if (unstakeLoading || !unstakeRecord) return;

    const record = unstakeRecord;
    setUnstakeLoading(true);

    if (caipNetwork.chainNamespace === 'eip155') {
      evmUtils
        .unstake(evmStakingContract, record)
        .then((tx) => {
          const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx.hash}`;
          console.log('🔗解质押交易链接:', txLink);

          message.success('Transaction submitted, please wait...');
          setUnstakeLoading(false);
          closeUnstakeModal();
          setStakeRecords((prev) => prev.filter((item) => item.id !== record.id));
          getPointsDashboard();
        })
        .catch((error) => {
          handleContractError(error);
          setUnstakeLoading(false);
        });
    } else if (caipNetwork.chainNamespace === 'solana') {
      solanaUtils
        .unstake(solanaProgram, record, Number(record.projectId))
        .then((tx) => {
          const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx}?cluster=${
            getContractConfig(chainId).cluster
          }`;
          console.log('🔗解质押交易链接:', txLink);

          message.success('Transaction submitted, please wait...');
          setUnstakeLoading(false);
          closeUnstakeModal();
          setStakeRecords((prev) => prev.filter((item) => item.id !== record.id));
          getPointsDashboard();
        })
        .catch((error) => {
          handleContractError(error);
          setUnstakeLoading(false);
        });
    }
  };

  const handleEmergencyUnstake = async () => {
    if (unstakeLoading || !unstakeRecord) return;

    const record = unstakeRecord;
    setUnstakeLoading(true);

    if (caipNetwork.chainNamespace === 'eip155') {
      evmUtils
        .emergencyUnstake(evmStakingContract, record)
        .then((tx) => {
          const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx.hash}`;
          console.log('🔗紧急解质押交易链接:', txLink);

          message.success('Transaction submitted, please wait...');
          setUnstakeLoading(false);
          closeEmergencyUnstakeModal();
          setStakeRecords((prev) => prev.filter((item) => item.id !== record.id));
          getPointsDashboard();
        })
        .catch((error) => {
          handleContractError(error);
          setUnstakeLoading(false);
        });
    } else if (caipNetwork.chainNamespace === 'solana') {
      solanaUtils
        .emergencyUnstake(solanaProgram, record, Number(record.projectId))
        .then((tx) => {
          const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx}?cluster=${
            getContractConfig(chainId).cluster
          }`;
          console.log('🔗紧急解质押交易链接:', txLink);

          message.success('Transaction submitted, please wait...');
          setUnstakeLoading(false);
          closeEmergencyUnstakeModal();
          setStakeRecords((prev) => prev.filter((item) => item.id !== record.id));
          getPointsDashboard();
        })
        .catch((error) => {
          handleContractError(error);
          setUnstakeLoading(false);
        });
    }
  };

  const openUnstakeModal = (record: any) => {
    setIsUnstakeModalOpen(true);
    setUnstakeRecord(record);
    if (caipNetwork.chainNamespace === 'solana') {
      setUnstakeFeeRate(record.unstakeFeeRate);
      setEmergencyUnstakeFeeRate(record.emergencyUnstakeFeeRate);
    }
  };

  const openEmergencyUnstakeModal = (record: any) => {
    setIsEmergencyUnstakeModalOpen(true);
    setUnstakeRecord(record);
    if (caipNetwork.chainNamespace === 'solana') {
      setUnstakeFeeRate(record.unstakeFeeRate);
      setEmergencyUnstakeFeeRate(record.emergencyUnstakeFeeRate);
    }
  };

  const closeUnstakeModal = () => {
    setIsUnstakeModalOpen(false);
  };

  const closeEmergencyUnstakeModal = () => {
    setIsEmergencyUnstakeModalOpen(false);
  };

  const handleTabClick = (network: any) => async () => {
    if (!isConnected) {
      modal.open();
      return;
    }
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
      setStakeRecords([]);
    }
  };

  const getPointsDashboard = async () => {
    if (historyLoading) return;
    setHistoryLoading(true);

    aimonicaAPI
      .GetPointsDashboard(address)
      .then(async (res) => {
        console.log('质押历史数据', res);

        setTotalPoints(Number(res.totalScore));

        let stakes = [];
        if (caipNetwork.chainNamespace === 'eip155') {
          stakes = res.stakes.filter((item: any) => item.chain == 'Base');
        } else if (caipNetwork.chainNamespace === 'solana') {
          stakes = res.stakes.filter((item: any) => item.chain == 'Solana');
        }

        const records = [];
        for (const stake of stakes) {
          // if (!stake.processed) continue;

          let projectName = '';
          if (caipNetwork.chainNamespace === 'solana') {
            const projectConfigPda = await getProjectConfigPda(solanaProgram, stake.project_id);
            const projectConfig = await solanaProgram.account.projectConfig.fetch(projectConfigPda);
            // console.log(
            //   `${projectConfig.name} 配置:`,
            //   JSON.stringify(projectConfig, (key, value) => (value?.toBase58 ? value.toBase58() : value), 2)
            // );
            projectName = projectConfig.name;
          } else {
            projectName = ethers.decodeBytes32String(stake.project_id);
          }

          records.push({
            id: stake.id,
            userId: stake.user_id,
            projectId: stake.project_id,
            projectName,
            amount: Number(ethers.formatEther(stake.amount)),
            duration: Number(stake.duration) / 86400,
            createdAt: stake.created_at,
            transactionHash: stake.transaction_hash,
            status: stake.status
          });
        }
        const sortedRecords = records.sort((a: any, b: any) => b.createdAt - a.createdAt);

        setHistoryRecords(sortedRecords);
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        setHistoryLoading(false);
      });
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
            <img src="/assets/images/star-2.svg" alt="" className="logo2" />
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
              <div className="s-text">{utils.formatNumber(totalPoints)}</div>
            </div>
          </div>
          <div className="banner-item">
            <div className="banner-item-title">Total Staked</div>
            <div className="text">{utils.formatNumber(totalStaked)}</div>
          </div>
          <div className="banner-item">
            <div className="banner-item-title">Total Project</div>
            <div className="text">{utils.formatNumber(totalProject)}</div>
          </div>
          <img src="/assets/images/img-24.png" alt="" className="img-24" />
        </div>

        <div className="title-box-2">
          Assets
          <img src="/assets/images/star.png" alt="" className="star-img" />
        </div>
        <div className="tab-box">
          {/* <button className={networkId === '' ? 'active' : ''} onClick={handleTabClick(null)}>
            All Chain
          </button> */}
          {getContractConfig().map((item: any, index: number) => {
            return (
              <button
                key={index}
                className={networkId === item.network.id.toString() ? 'active' : ''}
                onClick={handleTabClick(item.network)}>
                {item.network.name}
              </button>
            );
          })}
        </div>

        <div className="tablebox">
          <Table
            scroll={{ x: 'max-content' }}
            columns={stakeColumns}
            dataSource={stakeRecords}
            pagination={false}
            loading={stakeRecordsLoading}
            rowKey={(record) => `${record.projectId}-${record.id}`}
          />
        </div>

        <div className="title-box-2">
          Staking History
          <img src="/assets/images/star.png" alt="" className="star-img" />
        </div>

        <div className="tablebox">
          <Table
            scroll={{ x: 'max-content' }}
            columns={historyColumns}
            dataSource={historyRecords}
            pagination={false}
            loading={historyLoading}
            rowKey={(record) => `${record.projectId}-${record.id}`}
          />
        </div>
      </div>

      <Modal
        className="unstake-modal"
        width={'fit-content'}
        centered
        closable={false}
        footer={null}
        open={isEmergencyUnstakeModalOpen}>
        {unstakeRecord && (
          <div className="unstake-modal-box">
            <img src="/assets/images/img-26.png" alt="" className="img-26" />
            <div className="title">Emergency Unstake</div>
            <div className="text">(*Warning: Emergency Unstake will deduct all points*)</div>
            <div className="text-box2">
              <div>Unstaking Fee</div>
              <div>{emergencyUnstakeFeeRate}%</div>
            </div>
            <div className="text2">
              <div className="text2-1">You can only get</div>
              <div className="text2-2">
                <div>
                  {utils.formatNumber(unstakeRecord.amount * (1 - emergencyUnstakeFeeRate / 100))}{' '}
                  {unstakeRecord.projectName}
                </div>
                <div className="s-box">
                  <div className="s-img">
                    <img src="/assets/images/img-3.png" alt="" />
                  </div>
                  <div className="s-text">0</div>
                </div>
              </div>
            </div>
            <div className="btn-box">
              <Button className="btn-cancel" onClick={closeEmergencyUnstakeModal}>
                Cancel
              </Button>
              <Button className="btn-confirm" loading={unstakeLoading} onClick={handleEmergencyUnstake}>
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        className="unstake-modal"
        width={'fit-content'}
        centered
        closable={false}
        footer={null}
        open={isUnstakeModalOpen}>
        {unstakeRecord && (
          <div className="unstake-modal-box">
            <img src="/assets/images/img-26.png" alt="" className="img-26" />
            <div className="title">Unstake</div>
            <div className="text-box2">
              <div>Unstaking Fee</div>
              <div>{unstakeFeeRate}%</div>
            </div>
            <div className="text2 text3">
              <div className="text2-1">You can only get</div>
              <div className="text2-2">
                <div>
                  {utils.formatNumber(unstakeRecord.amount * (1 - unstakeFeeRate / 100))} {unstakeRecord.projectName}
                </div>
                <div className="s-box">
                  <div className="s-img">
                    <img src="/assets/images/img-3.png" alt="" />
                  </div>
                  <div className="s-text">
                    {utils.formatNumber(unstakeRecord.amount * getRewardPoints(unstakeRecord.duration))}
                  </div>
                </div>
              </div>
            </div>
            <div className="btn-box">
              <Button className="btn-cancel" onClick={closeUnstakeModal}>
                Cancel
              </Button>
              <Button className="btn-confirm" loading={unstakeLoading} onClick={handleUnstake}>
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
