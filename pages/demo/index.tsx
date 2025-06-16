import React, { useState, useEffect } from 'react';
import { Button, } from 'antd';
import { useRouter } from 'next/router';

export default function Demo() {
  const router = useRouter();

  return (
    <div style={{ padding: '1.2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🧪 AIMonica Demo</h1>
      <Button onClick={() => router.push('/demo-twitter')}>
        Demo Twitter
      </Button>
      <br />
      <br />
      <Button onClick={() => router.push('/demo-evm')}>
        Demo EVM
      </Button>
      <br />
      <br />
      <Button onClick={() => router.push('/demo-sol')}>
        Demo Sol
      </Button>
    </div>
  );
}
