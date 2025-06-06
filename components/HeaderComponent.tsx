import { useRouter } from 'next/router';
import { useState } from 'react';
import { Drawer, Select } from 'antd';
import { ConnectButton } from '@/components/ConnectButton';
import { SearchOutlined } from '@ant-design/icons';

export default function HeaderComponent() {
  const router = useRouter();

  const menuList = [
    {
      label: 'Explore',
      path: '/'
    },
    {
      label: 'Dashboard',
      path: '/dashboard'
    }
  ];
  const [open, setOpen] = useState(false);

  const showDrawer = () => {
    setOpen(true);
  };
  const closeDrawer = () => {
    setOpen(false);
  };

  const toPage = (path: string) => {
    router.push(path).then(() => {
      closeDrawer();
    });
  };

  const getActive = (path: string) => {
    if (path === '/' && router.pathname.startsWith('/stake')) {
      return 'active';
    } else if (router.pathname === path) {
      return 'active';
    }
    return '';
  };

  const getMenu = () => {
    return (
      <div className="menu-list">
        {menuList.map((item, index) => (
          <a key={index} className={`menu ${getActive(item.path)}`} onClick={() => toPage(item.path)}>
            {item.label}
          </a>
        ))}
      </div>
    );
  };

  const mockOptions = [
    {
      rank: 1,
      value: 'AIMonica',
      name: 'AIMonica',
      avatar: '/assets/images/avatar.png'
    },
    {
      rank: 2,
      value: 'Bitcoin',
      name: 'Bitcoin',
      avatar: '/assets/images/avatar-1.png'
    }
  ];
  const [searchValue, setSearchValue] = useState(null);
  const [searchOptions, setSearchOptions] = useState(mockOptions);

  const handleSearch = (input: string) => {
    if (!input) {
      setSearchOptions(mockOptions);
    } else {
      setSearchOptions(
        mockOptions.filter(
          (item) =>
            item.name.toLowerCase().includes(input.toLowerCase()) ||
            item.value.toLowerCase().includes(input.toLowerCase())
        )
      );
    }
  };

  return (
    <header>
      <div className="header-left">
        <div className="logo-box">
          <a href="">
            <img src="/assets/images/avatar.png" alt="" />
            AIMONICA
          </a>
        </div>
        {getMenu()}
      </div>
      <div className="header-right">
        <Select
          className="search-input"
          placeholder="Search For Tokens/Projects"
          showSearch
          allowClear
          value={searchValue}
          defaultActiveFirstOption={false}
          prefix={<SearchOutlined />}
          suffixIcon={null}
          filterOption={false}
          onSearch={handleSearch}
          options={searchOptions.map((d) => ({
            value: d.value,
            label: (
              <div
                className="project-box"
                onClick={() => {
                  toPage(`/stake/${d.rank}`);
                  setSearchValue(null);
                }}>
                <div className="project">
                  <div>
                    <img src={d.avatar} alt="" />
                    <span>{d.name}</span>
                  </div>
                  <img src="/assets/images/fire.svg" alt="" />
                </div>
              </div>
            )
          }))}
        />

        <div className="number-box">
          <img src="/assets/images/img-3.png" alt="" /> 0
        </div>
        <ConnectButton />
      </div>

      <Drawer placement={'right'} closeIcon={null} footer={null} width={'50%'} onClose={closeDrawer} open={open}>
        <div className="drawer-menu">{getMenu()}</div>
      </Drawer>
    </header>
  );
}
