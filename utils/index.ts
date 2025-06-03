import { message } from 'antd';
import numeral from 'numeral';

export default {
  formatAddr(value: string) {
    if (!value) return '';
    const index = value.length;
    return value.slice(0, 5) + '...' + value.slice(index - 5, index);
  },

  formatNumber(num: number, decimals: number = 0) {
    if (typeof num !== 'number') return '-';
    const formatted = numeral(num).format(`0,0.${'0'.repeat(decimals)}`);
    const [intPart, decPart] = formatted.split('.');
    if (!decPart) return intPart;
    const trimmedDecimal = decPart.replace(/0+$/, '');
    return trimmedDecimal ? `${intPart}.${trimmedDecimal}` : intPart;
  },

  handleCopy(value: string) {
    const dummy = document.createElement('textarea');
    document.body.appendChild(dummy);
    dummy.value = value;
    dummy.select();
    document.execCommand('Copy');
    document.body.removeChild(dummy);
    message.success('Copied');
  },

  scrollToTop() {
    let distance = document.documentElement.scrollTop;
    const step = distance / 10;
    (function jump() {
      if (distance > 0) {
        distance -= step;
        window.scrollTo(0, distance);
        setTimeout(jump, 10);
      }
    })();
  },

  scrollToTarget(anchor) {
    const headerElement = document.getElementsByTagName('header')[0];
    const headerHeight = headerElement.clientHeight;
    const anchorElement = document.getElementById(anchor);
    if (anchorElement) {
      const anchorOffset = anchorElement.offsetTop - headerHeight;
      window.scrollTo({ top: anchorOffset, behavior: 'smooth' });
    }
  }
};
