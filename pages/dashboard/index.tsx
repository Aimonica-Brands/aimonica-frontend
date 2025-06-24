import React, { useState, useEffect } from 'react';
import { Button, Table, App, Tag, Space, Modal } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppKitNetwork, useAppKitAccount } from '@reown/appkit/react';
import { getContractConfig } from '@/wallet';
import { modal } from '@/wallet';
import { evmUtils, solanaUtils } from '@/wallet/utils';
import { usePageContext } from '@/context';
import { handleContractError } from '@/wallet/contracts';
import utils from '@/utils';

export default function Dashboard() {
  const { message } = App.useApp();
  const { chainId, caipNetwork } = useAppKitNetwork();
  const { isConnected, address } = useAppKitAccount();
  const { evmStakingContract, solanaProgram } = usePageContext();

  const [networkId, setNetworkId] = useState('');

  const align = 'center' as const;
  const [historyLoading, setHistoryLoading] = useState(false);
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

  const [totalPoints, setTotalPoints] = useState(0);
  const [totalStaked, setTotalStaked] = useState(0);
  const [totalProject, setTotalProject] = useState(0);
  const [isUnstakeModalOpen, setIsUnstakeModalOpen] = useState(false);
  const [isEmergencyUnstakeModalOpen, setIsEmergencyUnstakeModalOpen] = useState(false);

  const stakeColumns: any[] = [
    {
      title: 'Project',
      dataIndex: 'projectName',
      key: 'projectName'
    },
    {
      title: 'Stake ID',
      dataIndex: 'stakeId',
      key: 'stakeId'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `${utils.formatNumber(amount)} tokens`
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => `${duration} Day`
    },
    {
      title: 'Staked Time',
      dataIndex: 'stakedAt',
      key: 'stakedAt',
      render: (stakedAt: number) => new Date(stakedAt).toLocaleString()
    },
    {
      title: 'Unlocked Time',
      dataIndex: 'unlockedAt',
      key: 'unlockedAt',
      render: (unlockedAt: number) => new Date(unlockedAt).toLocaleString()
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        return <Tag color="green">Active</Tag>;
        // if (record.status == 0) return <Tag color="green">Active</Tag>;
        // if (record.status == 1) return <Tag color="blue">Unstaked</Tag>;
        // if (record.status == 2) return <Tag color="red">Emergency</Tag>;
      }
    },
    {
      title: 'Action',
      key: 'action',
      fixed: 'right',
      render: (_, record) => (
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
  const [stakeRecords, setStakeRecords] = useState([]);
  const [unstakeLoading, setUnstakeLoading] = useState(false);
  const [stakeRecordsLoading, setStakeRecordsLoading] = useState(false);
  const [unstakeRecord, setUnstakeRecord] = useState(null);

  useEffect(() => {
    const initData = async () => {
      if (isConnected && address && caipNetwork && chainId) {
        setNetworkId(chainId.toString());
        getStakeRecords();
      } else {
        setNetworkId('');
        setStakeRecords([]);
      }
    };

    initData();
  }, [isConnected, address, caipNetwork, chainId, evmStakingContract, solanaProgram]);

  useEffect(() => {
    if (stakeRecords.length > 0) {
      setTotalPoints(stakeRecords.reduce((acc, record) => acc + record.amount, 0));
      setTotalStaked(stakeRecords.reduce((acc, record) => acc + record.amount, 0));
      setTotalProject(
        stakeRecords.reduce((acc, record) => {
          if (acc.includes(record.projectId)) {
            return acc;
          }
          return [...acc, record.projectId];
        }, []).length
      );
    } else {
      setTotalPoints(0);
      setTotalStaked(0);
      setTotalProject(0);
    }
  }, [stakeRecords]);

  const getStakeRecords = () => {
    if (caipNetwork.chainNamespace === 'eip155') {
      setStakeRecordsLoading(true);
      evmUtils
        .getStakeRecords(address)
        .then((records) => {
          setStakeRecords(records);
        })
        .catch((error) => {
          console.error(error);
          setStakeRecords([]);
        })
        .finally(() => {
          setStakeRecordsLoading(false);
        });
    } else if (caipNetwork.chainNamespace === 'solana') {
      if (solanaProgram) {
        getSolanaStakeRecords();
      }
    }
  };

  const getSolanaStakeRecords = async (stakeType: string = '', stakeId: number = null, stakeAmount: number = null) => {
    setStakeRecordsLoading(true);
    try {
      const maxRetries = 10;
      let retryCount = 0;

      const fetchStakes = async () => {
        try {
          console.log(`🔍 查询质押记录 (第 ${retryCount + 1}/${maxRetries} 次)...`);
          const records = await solanaUtils.getStakeRecords(solanaProgram);
          console.log('🔍 查询到的质押记录:', records);
          return records;
        } catch (error) {
          console.error(`❌ 第 ${retryCount + 1} 次查询失败:`, error);
          return null;
        }
      };

      if (stakeId && stakeAmount) {
        const pollInterval = 5000;
        let found = false;
        while (retryCount < maxRetries && !found) {
          const currentRecords = await fetchStakes();
          if (!currentRecords) {
            retryCount++;
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
            continue;
          }

          if (stakeType === 'stake') {
            const newStake = currentRecords.find((stake) => stake.stakeId === stakeId);
            if (newStake) {
              console.log('✅ 新质押记录已确认:', newStake);
              setStakeRecords(currentRecords);
              found = true;
              break;
            }
          } else if (stakeType === 'unstake' || stakeType === 'emergencyUnstake') {
            const existingStake = currentRecords.find((stake) => stake.stakeId === stakeId);
            if (!existingStake) {
              console.log('✅ 新质押记录已确认: 原质押记录已移除');
              setStakeRecords(currentRecords);
              found = true;
              break;
            }
          }
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }
        if (!found) {
          console.log('⚠️ 达到最大重试次数，未获取到新数据');
        }
      } else {
        // 没有 stakeId 或 stakeAmount，直接查一次
        const currentRecords = await fetchStakes();
        if (currentRecords) {
          setStakeRecords(currentRecords);
        }
      }
    } catch (error) {
      console.error(error);
      setStakeRecords([]);
    } finally {
      setStakeRecordsLoading(false);
    }
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
          getStakeRecords();
        })
        .catch((error) => {
          handleContractError(error);
        })
        .finally(() => {
          setUnstakeLoading(false);
          setIsUnstakeModalOpen(false);
        });
    } else if (caipNetwork.chainNamespace === 'solana') {
      solanaUtils
        .unstake(solanaProgram, record)
        .then((tx) => {
          const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx}?cluster=${
            getContractConfig(chainId).cluster
          }`;
          console.log('🔗解质押交易链接:', txLink);
          message.success('Transaction submitted, please wait...');
          getSolanaStakeRecords('unstake', record.stakeId, record.amount);
        })
        .catch((error) => {
          handleContractError(error);
        })
        .finally(() => {
          setUnstakeLoading(false);
          setIsUnstakeModalOpen(false);
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
          getStakeRecords();
        })
        .catch((error) => {
          handleContractError(error);
        })
        .finally(() => {
          setUnstakeLoading(false);
          setIsEmergencyUnstakeModalOpen(false);
        });
    } else if (caipNetwork.chainNamespace === 'solana') {
      solanaUtils
        .emergencyUnstake(solanaProgram, record)
        .then((tx) => {
          const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx}?cluster=${
            getContractConfig(chainId).cluster
          }`;
          console.log('🔗紧急解质押交易链接:', txLink);
          message.success('Transaction submitted, please wait...');
          getSolanaStakeRecords('emergencyUnstake', record.stakeId, record.amount);
        })
        .catch((error) => {
          handleContractError(error);
        })
        .finally(() => {
          setUnstakeLoading(false);
          setIsEmergencyUnstakeModalOpen(false);
        });
    }
  };

  const openUnstakeModal = (record: any) => {
    setIsUnstakeModalOpen(true);
    setUnstakeRecord(record);
  };

  const openEmergencyUnstakeModal = (record: any) => {
    setIsEmergencyUnstakeModalOpen(true);
    setUnstakeRecord(record);
  };

  const closeUnstakeModal = () => {
    setIsUnstakeModalOpen(false);
    setUnstakeRecord(null);
  };

  const closeEmergencyUnstakeModal = () => {
    setIsEmergencyUnstakeModalOpen(false);
    setUnstakeRecord(null);
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
          console.log('切换网络成功', network);
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
          {getContractConfig().map((item: any) => {
            return (
              <button
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
            rowKey={(record) => record.stakeId}
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
            dataSource={historyDataSource}
            pagination={false}
            loading={historyLoading}
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
            <div className="text">(*Warning: Unstaking in advance will result in a 30% deduction of rewards*)</div>
            <div className="text2">
              <div className="text2-1">You can only get</div>
              <div className="text2-2">
                <div>
                  {unstakeRecord.amount} Aimonica(≈${unstakeRecord.amount})
                </div>
                <div className="s-box">
                  <div className="s-img">
                    <img src="/assets/images/img-3.png" alt="" />
                  </div>
                  <div className="s-text">{unstakeRecord.amount}</div>
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
              <div>5%</div>
            </div>
            <div className="text2 text3">
              <div className="text2-1">You can only get</div>
              <div className="text2-2">
                <div>
                  {unstakeRecord.amount} Aimonica(≈${unstakeRecord.amount})
                </div>
                <div className="s-box">
                  <div className="s-img">
                    <img src="/assets/images/img-3.png" alt="" />
                  </div>
                  <div className="s-text">{unstakeRecord.amount}</div>
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
