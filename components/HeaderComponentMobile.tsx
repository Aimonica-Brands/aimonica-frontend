import { useRouter } from 'next/router';

export default function HeaderComponentMobile() {
  const router = useRouter();

  const getActive = (path: string) => {
    if (path === '/' && router.pathname.startsWith('/stake')) {
      return 'active';
    } else if (router.pathname === path) {
      return 'active';
    }
    return '';
  };

  const toPage = (path: string) => {
    router.push(path).then(() => {
      setTimeout(() => {
        window.scrollTo(0, 0);
      });
    });
  };

  return (
    <div className="header-mobile">
      <div className={`mobile-menu ${getActive('/')}`} onClick={() => toPage('/')}>
        <img src={`/assets/images/icon-explore${getActive('/') ? '-active' : ''}.svg`} alt="" />
        <div className="text">Explore</div>
      </div>
      <div className="mobile-menu">
        <img src="/assets/images/logo.png" alt="" />
        <div className="text">Aimonica</div>
      </div>
      <div className={`mobile-menu ${getActive('/dashboard')}`} onClick={() => toPage('/dashboard')}>
        <img src={`/assets/images/icon-dashboard${getActive('/dashboard') ? '-active' : ''}.svg`} alt="" />
        <div className="text">Dashboard</div>
      </div>
    </div>
  );
}
