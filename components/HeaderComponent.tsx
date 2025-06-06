import { useRouter } from 'next/router';
import { useState } from 'react';
import { Drawer, Input, Popover, Select } from 'antd';
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
        <div className="number-box">
          <img src="/assets/images/img-3.png" alt="" />0
        </div>
        <ConnectButton />
      </div>

      <Drawer placement={'right'} closeIcon={null} footer={null} width={'50%'} onClose={closeDrawer} open={open}>
        <div className="drawer-menu">{getMenu()}</div>
      </Drawer>
    </header>
  );
}
