export default function FooterComponent() {
  return (
    <footer>
      <div className="rolling-box">
        <div className="rolling-content">
          {Array.from({ length: 10 }).map((_, index) => (
            <span className="rolling-item" key={index}>
              AIMONICA
            </span>
          ))}
        </div>
      </div>
      <div className="footer-box">
        <div className="footer-content">
          <div className="footer-left">
            <div className="footer-logo">
              <img src="/assets/images/star-2.svg" alt="" />
              <span>AIMONICA</span>
            </div>
            <div className="footer-text">© 2025 aimonica. All rights reserved.</div>
          </div>
          <div className="footer-right">
            <a href="https://x.com/AimonicaBrands">
              <img src="/assets/images/icon-twitter.svg" alt="" />
            </a>
            <a href="https://t.me/+QBZYsb2t0gFlMTU1">
              <img src="/assets/images/icon-telegram.svg" alt="" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
