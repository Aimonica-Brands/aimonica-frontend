import React, { useState, useEffect } from 'react';
import { Button, Table, App, Tag, Space, Modal } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppKitNetwork, useAppKitAccount } from '@reown/appkit/react';
import { getContractConfig } from '@/wallet';
import { modal } from '@/wallet';
import { evmUtils, solanaUtils, getRewardPoints } from '@/wallet/utils';
import { usePageContext } from '@/context';
import { handleContractError } from '@/wallet/contracts';
import utils from '@/utils';
import { aimAPI } from '@/pages/api/aim';
import { ethers } from 'ethers';

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
  const [stakeRecords, setStakeRecords] = useState([]);
  const [unstakeLoading, setUnstakeLoading] = useState(false);
  const [stakeRecordsLoading, setStakeRecordsLoading] = useState(false);
  const [unstakeRecord, setUnstakeRecord] = useState(null);
  const [unstakeFeeRate, setUnstakeFeeRate] = useState(0);
  const [emergencyUnstakeFeeRate, setEmergencyUnstakeFeeRate] = useState(0);

  const stakeColumns: any[] = [
    {
      title: 'Project',
      dataIndex: 'projectName'
    },
    {
      title: 'Stake ID',
      dataIndex: 'id'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (value: number) => `${utils.formatNumber(value)} tokens`
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      render: (value: number) => `${value} Day`
    },
    {
      title: 'Staked Time',
      dataIndex: 'staked_at',
      render: (value: number) => new Date(value).toLocaleString()
    },
    {
      title: 'Unlocked Time',
      dataIndex: 'unlocked_at',
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
    // {
    //   title: 'TVL($)',
    //   dataIndex: 'tvl',
    //   align,
    //   render: (value: any, record: any) => {
    //     return (
    //       <div className="s-box">
    //         <div className="s-img">
    //           <img src="/assets/images/img-4.png" alt="" />
    //         </div>
    //         <div className="s-text">$ {utils.formatNumber(value)}</div>
    //       </div>
    //     );
    //   }
    // },
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
        getFeeRate();
      } else {
        setNetworkId('');
        setStakeRecords([]);
      }
    };

    initData();
  }, [isConnected, address, caipNetwork, chainId, evmStakingContract, solanaProgram]);

  useEffect(() => {
    if (stakeRecords.length > 0) {
      setTotalPoints(stakeRecords.reduce((acc, record) => acc + record.points, 0));
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

  const getFeeRate = async () => {
    if (caipNetwork.chainNamespace === 'eip155') {
      if (evmStakingContract) {
        evmStakingContract.unstakeFeeRate().then((res) => {
          setUnstakeFeeRate(Number(res) / 100);
        });
        evmStakingContract.emergencyUnstakeFeeRate().then((res) => {
          setEmergencyUnstakeFeeRate(Number(res) / 100);
        });
      }
    } else if (caipNetwork.chainNamespace === 'solana') {
      if (solanaProgram) {
      }
    }
  };

  const getStakeRecords = async () => {
    // 获取所有项目信息
    // const allProjects = await solanaUtils.getAllProjects(solanaProgram);
    // console.log('所有项目:', allProjects);
    // if (stakeRecordsLoading) return;
    // setStakeRecordsLoading(true);
    // setStakeRecords([]);

    // evmAPI
    //   .GetPointsDashboard(address)
    //   .then((res) => {
    //     console.log('GetPointsDashboard------------', res);
    //     setTotalPoints(Number(res.totalScore));

    //     const records = res.stakes.map((stake) => {
    //       // if (stake.status != 'Active') return;

    //       const projectName = stake.chain == 'Solana' ? stake.project_id : ethers.decodeBytes32String(stake.project_id);
    //       const duration = stake.chain == 'Solana' ? Number(stake.duration) : Number(stake.duration) / 86400;

    //       const amount = Number(ethers.formatEther(stake.amount));
    //       const points = amount * getRewardPoints(duration);

    //       return {
    //         ...stake,
    //         // id: '9',
    //         // user_id: '0x6716eec26c82a8a025cef05d301e0af8cb8da33d',
    //         // project_id: '0x64656d6f00000000000000000000000000000000000000000000000000000000',
    //         projectName,
    //         // chain: 'Base',
    //         // amount: '150000000000000000000',
    //         amount,
    //         // staked_at: '2025-07-03T09:17:21.000Z',
    //         // duration: 86400,
    //         duration,
    //         // unlocked_at: '2025-07-04T09:17:21.000Z',
    //         // status: 'Active',
    //         // transaction_hash: '0x0c81651036bd1675d37b3c83cebf664321f04ed668a00721848f3936d03eee3f',
    //         // processed: true,
    //         // created_at: '2025-07-05T16:45:00.028Z',
    //         points
    //       };
    //     });

    //     setStakeRecords(records);
    //   })
    //   .catch((error) => {
    //     console.error(error);
    //     setStakeRecords([]);
    //   })
    //   .finally(() => {
    //     setStakeRecordsLoading(false);
    //   });

    // evmAPI.GetPointsLeaderboard().then((res) => {
    //   const { projects, users } = res;
    //   console.log('projects------------', projects);
    //   console.log('users------------', users);
    //   const evmTotalScore = projects.filter((item: any) => item.chain == 'Base');
    //   const solanaTotalScore = projects.filter((item: any) => item.chain == 'Solana');
    //   const userTotalScore = users.find((item: any) => item.user_id.toLowerCase() == address.toLowerCase());

    //   console.log('evmTotalScore------------', evmTotalScore);
    //   console.log('solanaTotalScore------------', solanaTotalScore);
    //   console.log('userTotalScore------------', userTotalScore);
    // });

    if (caipNetwork.chainNamespace === 'eip155') {
      if (evmStakingContract) {
        getEvmStakeRecords();
      }
    } else if (caipNetwork.chainNamespace === 'solana') {
      if (solanaProgram) {
        getSolanaStakeRecords();
      }
    }
  };

  const getEvmStakeRecords = async (id: number = null, stakeAmount: number = null) => {
    setStakeRecordsLoading(true);
    try {
      const maxRetries = 10;
      let retryCount = 0;

      const fetchStakes = async () => {
        try {
          console.log(`🔍 查询EVM质押记录 (第 ${retryCount + 1}/${maxRetries} 次)...`);
          const records = await evmUtils.getStakeRecords(address);
          console.log('🔍 查询到的EVM质押记录:', records);
          const newRecords = records.map((record) => {
            record.points = record.amount * getRewardPoints(record.duration);
            // record.tvl = record.amount * 0.0015;
            return record;
          });
          return newRecords;
        } catch (error) {
          console.error(`❌ 第 ${retryCount + 1} 次查询失败:`, error);
          return null;
        }
      };

      if (id && stakeAmount) {
        const pollInterval = 5000;
        let found = false;
        while (retryCount < maxRetries && !found) {
          const currentRecords = await fetchStakes();
          if (!currentRecords) {
            retryCount++;
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
            continue;
          }

          const existingStake = currentRecords.find((stake) => stake.id === id);
          if (!existingStake) {
            console.log('✅ 新EVM质押记录已确认: 原质押记录已移除');
            setStakeRecords(currentRecords);
            found = true;
            break;
          }
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }
        if (!found) {
          console.log('⚠️ 达到最大重试次数，未获取到新EVM数据');
        }
      } else {
        // 没有 id 或 stakeAmount，直接查一次
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

  const getSolanaStakeRecords = async (id: number = null, stakeAmount: number = null) => {
    setStakeRecordsLoading(true);
    try {
      const maxRetries = 10;
      let retryCount = 0;

      const fetchStakes = async () => {
        try {
          console.log(`🔍 查询质押记录 (第 ${retryCount + 1}/${maxRetries} 次)...`);
          const records = await solanaUtils.getStakeRecords(solanaProgram);
          console.log('🔍 查询到的质押记录:', records);
          const newRecords = records.map((record) => {
            record.points = record.amount * getRewardPoints(record.duration);
            // record.tvl = record.amount * 0.0015;
            return record;
          });
          return newRecords;
        } catch (error) {
          console.error(`❌ 第 ${retryCount + 1} 次查询失败:`, error);
          return null;
        }
      };

      if (id && stakeAmount) {
        const pollInterval = 5000;
        let found = false;
        while (retryCount < maxRetries && !found) {
          const currentRecords = await fetchStakes();
          if (!currentRecords) {
            retryCount++;
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
            continue;
          }

          const existingStake = currentRecords.find((stake) => stake.id === id);
          if (!existingStake) {
            console.log('✅ 新质押记录已确认: 原质押记录已移除');
            setStakeRecords(currentRecords);
            found = true;
            break;
          }
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }
        if (!found) {
          console.log('⚠️ 达到最大重试次数，未获取到新数据');
        }
      } else {
        // 没有 id 或 stakeAmount，直接查一次
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
          getEvmStakeRecords(record.id, record.amount);
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
        .unstake(solanaProgram, record, Number(record.project_id))
        .then((tx) => {
          const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx}?cluster=${
            getContractConfig(chainId).cluster
          }`;
          console.log('🔗解质押交易链接:', txLink);
          message.success('Transaction submitted, please wait...');
          getSolanaStakeRecords(record.id, record.amount);
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
          getEvmStakeRecords(record.id, record.amount);
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
        .emergencyUnstake(solanaProgram, record, Number(record.project_id))
        .then((tx) => {
          const txLink = `${caipNetwork.blockExplorers.default.url}/tx/${tx}?cluster=${
            getContractConfig(chainId).cluster
          }`;
          console.log('🔗紧急解质押交易链接:', txLink);
          message.success('Transaction submitted, please wait...');
          getSolanaStakeRecords(record.id, record.amount);
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
            rowKey={(record) => `${record.project_id}-${record.id}`}
          />
        </div>

        {/* <div className="title-box-2">
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
        </div> */}
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
            <div className="text-box2">
              <div>Unstaking Fee</div>
              <div>{emergencyUnstakeFeeRate}%</div>
            </div>
            <div className="text2">
              <div className="text2-1">You can only get</div>
              <div className="text2-2">
                <div>{utils.formatNumber(unstakeRecord.amount * (1 - emergencyUnstakeFeeRate / 100), 1)} Aimonica</div>
                <div className="s-box">
                  <div className="s-img">
                    <img src="/assets/images/img-3.png" alt="" />
                  </div>
                  <div className="s-text">
                    {utils.formatNumber(unstakeRecord.amount * (1 - emergencyUnstakeFeeRate / 100), 1)}
                  </div>
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
                <div>{utils.formatNumber(unstakeRecord.amount * (1 - unstakeFeeRate / 100), 1)} Aimonica</div>
                <div className="s-box">
                  <div className="s-img">
                    <img src="/assets/images/img-3.png" alt="" />
                  </div>
                  <div className="s-text">
                    {utils.formatNumber(unstakeRecord.amount * (1 - unstakeFeeRate / 100), 1)}
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
