import React, { useState, useEffect } from 'react';
import { Button, Modal, Empty, Spin, App, Popover, Collapse, Input } from 'antd';
import { LeftOutlined, ExportOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';

export default function Stake() {
  const { message } = App.useApp();
  const router = useRouter();
  const { token: token } = router.query;
  const [dataSource, setDataSource] = useState([{ rank: 1 }, { rank: 2 }, { rank: 3 }]);
  const [loading, setLoading] = useState(false);

  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(0);
  const [tabIndex, setTabIndex] = useState(0);
  const [isUnstakeModalOpen, setIsUnstakeModalOpen] = useState(false);
  const [isEmergencyUnstakeModalOpen, setIsEmergencyUnstakeModalOpen] = useState(false);
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const handleTabChange = (index: number) => {
    setTabIndex(index);
  };

  const handleStake = () => {
    console.log(amount);
    setIsStakeModalOpen(true);
  };

  const handleEmergencyUnstake = () => {
    setIsEmergencyUnstakeModalOpen(true);
  };

  const handleUnstake = () => {
    setIsUnstakeModalOpen(true);
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
                <img src="/assets/images/img-10.png" alt="" />
                <span>Aimonica</span>
              </div>
              <div className="text1">Project Introduction Copywriting</div>
              <div className="text2">
                <div>
                  <span>Users</span>
                  <span>1000</span>
                </div>
                <div>
                  <span>TVL</span>
                  <span>$ 1000</span>
                </div>
              </div>
              <div className="text3">
                <span>Pool Address</span>
                <a className="pool-address">
                  8B4j....KTY5s
                  <ExportOutlined />
                </a>
              </div>
            </div>
          </div>
          <div className="right-box">
            <div className="tab-title-box">
              <button className={tabIndex === 0 ? 'active' : ''} onClick={() => handleTabChange(0)}>
                STAKE
              </button>
              <button className={tabIndex === 1 ? 'active' : ''} onClick={() => handleTabChange(1)}>
                UNSTAKE
              </button>
            </div>
            {tabIndex === 0 ? (
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
                    <img src="/assets/images/img-10.png" alt="" />
                    <span>Aimonica</span>
                  </div>
                  <div className="number-box">
                    <div className="number">1500</div>
                    <div className="number2">$ 15</div>
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
                  <button className="max-btn" onClick={() => setAmount(balance.toString())}>
                    MAX
                  </button>
                </div>
                <div className="text">
                  <span>Locking Time</span>
                  <div className="days">
                    <button>7D</button>
                    <button>14D</button>
                    <button>30D</button>
                  </div>
                </div>
                <div className="text">
                  <span>Expected Points</span>
                  <div className="number">1500</div>
                </div>
                <Button type="primary" size="large" className="stake-btn" onClick={handleStake} loading={loading}>
                  STAKE
                </Button>
              </div>
            ) : (
              <div className="stake-item">
                <div className="text">
                  <span>Your Balance</span>
                </div>
                <div className="avatar-box-box margin-bottom">
                  <div className="avatar-box">
                    <img src="/assets/images/img-10.png" alt="" />
                    <span>Aimonica</span>
                  </div>
                  <div className="number-box">
                    <div className="number">1500</div>
                  </div>
                </div>
                <div className="text">
                  <span>Your Earned Points</span>
                  <div className="s-box">
                    <div className="s-img">
                      <img src="/assets/images/img-3.png" alt="" />
                    </div>
                    <div className="s-text">10000</div>
                  </div>
                </div>
                <div className="text">
                  <span>Staking start time</span>
                  <span>2025-5-25 17:26:46</span>
                </div>
                <div className="text">
                  <span>Locking Time</span>
                  <span>14D:12H:50M:24S</span>
                </div>
                <div className="text">
                  <span>Redemption Time</span>
                  <span>2025-5-25 17:26:46</span>
                </div>
                <Button
                  type="primary"
                  size="large"
                  className="stake-btn"
                  onClick={handleEmergencyUnstake}
                  loading={loading}>
                  Emergency Unstake
                </Button>
                <div className="text2">(*Warning: Unstaking in advance will result in a 30% deduction of rewards*)</div>
                <Button type="primary" size="large" className="stake-btn" onClick={handleUnstake} loading={loading}>
                  Unstake
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        className="unstake-modal"
        width={'fit-content'}
        centered
        closable={false}
        footer={null}
        open={isEmergencyUnstakeModalOpen}
        onOk={() => setIsEmergencyUnstakeModalOpen(false)}
        onCancel={() => setIsEmergencyUnstakeModalOpen(false)}>
        <div className="unstake-box">
          <img src="/assets/images/img-26.png" alt="" className="img-26" />
          <div className="title">Emergency Unstake</div>
          <div className="text">（*Warning: Unstaking in advance will result in a 30% deduction of rewards*）</div>
          <div className="text2">
            <div className="text2-1">You can only get</div>
            <div className="text2-2">
              <div>15K Aimonica(≈$1,500)</div>
              <div className="s-box">
                <div className="s-img">
                  <img src="/assets/images/img-3.png" alt="" />
                </div>
                <div className="s-text">1321546521</div>
              </div>
            </div>
          </div>
          <div className="btn-box">
            <button className="btn-cancel" onClick={() => setIsEmergencyUnstakeModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-confirm" onClick={() => setIsEmergencyUnstakeModalOpen(false)}>
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        className="unstake-modal"
        width={'fit-content'}
        centered
        closable={false}
        footer={null}
        open={isUnstakeModalOpen}
        onOk={() => setIsUnstakeModalOpen(false)}
        onCancel={() => setIsUnstakeModalOpen(false)}>
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
              <div>15K Aimonica(≈$1,500)</div>
              <div className="s-box">
                <div className="s-img">
                  <img src="/assets/images/img-3.png" alt="" />
                </div>
                <div className="s-text">1321546521</div>
              </div>
            </div>
          </div>
          <div className="btn-box">
            <button className="btn-cancel" onClick={() => setIsUnstakeModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-confirm" onClick={() => setIsUnstakeModalOpen(false)}>
              Confirm
            </button>
          </div>
        </div>
      </Modal>

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
