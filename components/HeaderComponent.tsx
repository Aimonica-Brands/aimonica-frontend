import { useRouter } from 'next/router';
import { useState } from 'react';
import { Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { projectData } from '@/wallet/project';
import TwitterComponent from './TwitterComponent';
import dynamic from 'next/dynamic';

const WalletComponent = dynamic(() => import('./WalletComponent').then((mod) => mod.WalletComponent), {
  ssr: false
});

export default function HeaderComponent() {
  const router = useRouter();

  const menuList = [
    { label: 'Explore', path: '/' },
    { label: 'Dashboard', path: '/dashboard' }
  ];

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

  const [searchValue, setSearchValue] = useState(null);
  const [searchOptions, setSearchOptions] = useState(projectData);

  const handleSearch = (input: string) => {
    if (!input) {
      setSearchOptions(projectData);
    } else {
      setSearchOptions(projectData.filter((item) => item.name.toLowerCase().includes(input.toLowerCase())));
    }
  };

  const toPage = (path: string) => {
    router.push(path).then(() => {
      setTimeout(() => {
        window.scrollTo(0, 0);
      });
    });
  };

  return (
    <header>
      <div className="header-left">
        <div className="logo-box">
          <a href="/">
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
            value: d.name,
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

        <TwitterComponent />

        {/* AppKit Connect Button */}
        <appkit-button />
        {/* Wallet initialization component */}
        <WalletComponent />
      </div>
    </header>
  );
}
