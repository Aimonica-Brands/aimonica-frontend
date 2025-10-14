import { useState, useEffect } from 'react';
import { Button, Table, App, Tag, Space, Modal } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppKitNetwork, useAppKitAccount } from '@reown/appkit/react';
import { getContractConfig, modal, handleContractError } from '@/wallet';
import { getRewardPoints, evmUtils, solanaUtils, getProjectConfigPda } from '@/wallet/utils';
import { usePageContext } from '@/context';
import utils from '@/utils';

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
  const [tableLoading, setTableLoading] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [unstakeRecord, setUnstakeRecord] = useState(null);
  const [unstakeLoading, setUnstakeLoading] = useState(false);
  const [unstakeFeeRate, setUnstakeFeeRate] = useState(0);
  const [emergencyUnstakeFeeRate, setEmergencyUnstakeFeeRate] = useState(0);

  const align = 'center' as const;
  const historyColumns: ColumnsType<any> = [
    {
      title: 'Project',
      dataIndex: 'projectName',
    },
    {
      title: 'Stake ID',
      dataIndex: 'stakeId',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (value: number) => `${utils.formatNumber(value)}`,
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      render: (value: number) => `${value} Day`,
    },

    {
      title: 'Status',
      dataIndex: 'status',
      render: (value: any, record: any) => {
        return <Tag color={value === 'Unstaked' ? 'blue' : 'red'}>{value}</Tag>;
      },
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
      },
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
      },
    },

    ...(caipNetwork?.chainNamespace === 'eip155'
      ? [
          {
            title: 'Hash',
            dataIndex: 'transactionHash',
            render: (value: any) => {
              return (
                value && (
                  <a className="hash" href={`${caipNetwork.blockExplorers.default.url}/tx/${value}`} target="_blank">
                    <span>
                      {value.slice(0, 6)}...{value.slice(-6)}
                    </span>
                    <ExportOutlined />
                  </a>
                )
              );
            },
          },
        ]
      : [
          {
            title: 'Unstake Time',
            dataIndex: 'unstakeAt',
            render: (value: number) => new Date(value).toLocaleString(),
          },
        ]),
  ];

  const stakeColumns: any[] = [
    {
      title: 'Project',
      dataIndex: 'projectName',
    },
    {
      title: 'Stake ID',
      dataIndex: 'stakeId',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (value: number) => `${utils.formatNumber(value)}`,
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      render: (value: number) => `${value} Day`,
    },
    {
      title: 'Staked Time',
      dataIndex: 'stakedAt',
      render: (value: number) => new Date(value).toLocaleString(),
    },
    {
      title: 'Unlocked Time',
      dataIndex: 'unlockedAt',
      render: (value: number) => new Date(value).toLocaleString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value: any, record: any) => <Tag color="green">Active</Tag>,
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
      },
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
      },
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

          {record.unlockedAt >= new Date().getTime() && (
            <Button className="emergency-btn" onClick={() => openEmergencyUnstakeModal(record)}>
              Emergency
            </Button>
          )}
        </Space>
      ),
    },
  ];

  useEffect(() => {
    const initData = async () => {
      if (isConnected && address && caipNetwork && chainId) {
        setNetworkId(chainId.toString());
        if (caipNetwork.chainNamespace === 'eip155') {
          if (evmStakingContract) {
            getEvmStakeRecords();
            getFeeConfig();
          }
        } else if (caipNetwork.chainNamespace === 'solana') {
          if (solanaProgram) {
            getSolanaStakeRecords();
          }
        }
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
    const records = [...stakeRecords, ...historyRecords];
    if (records.length === 0) return;
    setTotalPoints(records.reduce((acc, record) => acc + (record.points === '-' ? 0 : record.points), 0));
    setTotalStaked(records.reduce((acc, record) => acc + record.amount, 0));
    setTotalProject(
      records.reduce((acc, record) => {
        if (acc.includes(record.projectId)) {
          return acc;
        }
        return [...acc, record.projectId];
      }, []).length,
    );
  }, [stakeRecords, historyRecords]);

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

  const getEvmStakeRecords = async () => {
    setTableLoading(true);

    try {
      const records = await evmUtils.getStakeRecords(address);

      const stake = records.filter((record) => record.status === 'Active');
      setStakeRecords(stake);

      const history = records.filter((record) => record.status !== 'Active');
      setHistoryRecords(history);
    } catch (error) {
      console.error(error);
      setStakeRecords([]);
      setHistoryRecords([]);
    } finally {
      setTableLoading(false);
    }
  };

  const getSolanaStakeRecords = async () => {
    setTableLoading(true);
    try {
      const stakeRecords = await solanaUtils.getStakeRecords(solanaProgram);
      setStakeRecords(stakeRecords);

      const unstakeRecords = await solanaUtils.getUnstakeRecords(solanaProgram);
      setHistoryRecords(unstakeRecords);
    } catch (error) {
      console.error(error);
      setStakeRecords([]);
      setHistoryRecords([]);
    } finally {
      setTableLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (unstakeLoading || !unstakeRecord) return;

    const record = unstakeRecord;
    setUnstakeLoading(true);

    try {
      if (caipNetwork.chainNamespace === 'eip155') {
        // 仅 EVM 执行状态检查
        const statusCheck = await evmUtils.checkStakeStatus(evmStakingContract, record.stakeId);
        if (!statusCheck.isActive) {
          message.warning(
            'This order has already been unstaked. Please wait a few minutes and refresh the page to update the status.',
          );
          setUnstakeLoading(false);
          closeUnstakeModal();
          return;
        }

        evmUtils
          .unstake(evmStakingContract, record)
          .then((tx) => {
            const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx.hash}`;
            console.log('🔗Unstake transaction link:', txLink);

            message.success('Transaction submitted, please wait...');
            setUnstakeLoading(false);
            closeUnstakeModal();
            getEvmStakeRecords();
          })
          .catch((error) => {
            handleContractError(error);
            setUnstakeLoading(false);
          });
      } else if (caipNetwork.chainNamespace === 'solana') {
        // Solana 不做状态检查，直接执行
        solanaUtils
          .unstake(solanaProgram, record, Number(record.projectId))
          .then((tx) => {
            const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx}?cluster=${
              getContractConfig(chainId).cluster
            }`;
            console.log('🔗Unstake transaction link:', txLink);

            message.success('Transaction submitted, please wait...');
            setUnstakeLoading(false);
            closeUnstakeModal();
            getSolanaStakeRecords();
          })
          .catch((error) => {
            handleContractError(error);
            setUnstakeLoading(false);
          });
      }
    } catch (error) {
      console.error('Failed to check stake status:', error);
      message.error('Failed to verify order status. Please try again.');
      setUnstakeLoading(false);
    }
  };

  const handleEmergencyUnstake = async () => {
    if (unstakeLoading || !unstakeRecord) return;

    const record = unstakeRecord;
    setUnstakeLoading(true);

    try {
      if (caipNetwork.chainNamespace === 'eip155') {
        // 仅 EVM 执行状态检查
        const statusCheck = await evmUtils.checkStakeStatus(evmStakingContract, record.stakeId);
        if (!statusCheck.isActive) {
          message.warning(
            'This order has already been unstaked. Please wait a few minutes and refresh the page to update the status.',
          );
          setUnstakeLoading(false);
          closeEmergencyUnstakeModal();
          return;
        }

        evmUtils
          .emergencyUnstake(evmStakingContract, record)
          .then((tx) => {
            const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx.hash}`;
            console.log('🔗Emergency unstake transaction link:', txLink);

            message.success('Transaction submitted, please wait...');
            setUnstakeLoading(false);
            closeEmergencyUnstakeModal();
            getEvmStakeRecords();
          })
          .catch((error) => {
            handleContractError(error);
            setUnstakeLoading(false);
          });
      } else if (caipNetwork.chainNamespace === 'solana') {
        // Solana 不做状态检查，直接执行
        solanaUtils
          .emergencyUnstake(solanaProgram, record, Number(record.projectId))
          .then((tx) => {
            const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx}?cluster=${
              getContractConfig(chainId).cluster
            }`;
            console.log('🔗Emergency unstake transaction link:', txLink);

            setUnstakeLoading(false);
            closeEmergencyUnstakeModal();
            getSolanaStakeRecords();
          })
          .catch((error) => {
            handleContractError(error);
            setUnstakeLoading(false);
          });
      }
    } catch (error) {
      console.error('Failed to check stake status:', error);
      message.error('Failed to verify order status. Please try again.');
      setUnstakeLoading(false);
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
          console.error('Failed to switch network:', error);
        });
    } else {
      setNetworkId('');
      setStakeRecords([]);
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
            loading={tableLoading}
            rowKey={(record) => `${record.projectId}-${record.stakeId}`}
          />
        </div>

        <div className="title-box-2">
          Unstake History
          <img src="/assets/images/star.png" alt="" className="star-img" />
        </div>

        <div className="tablebox">
          <Table
            scroll={{ x: 'max-content' }}
            columns={historyColumns}
            dataSource={historyRecords}
            pagination={false}
            loading={tableLoading}
            rowKey={(record) => `${record.projectId}-${record.stakeId}`}
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
