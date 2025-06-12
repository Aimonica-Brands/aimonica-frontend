# Twitter 功能简化版

## 🎯 核心功能

1. **Twitter 账户登录** - 使用 OAuth 2.0 安全登录
2. **发布推文分享** - 一键分享到 Twitter
3. **状态管理** - 账户信息统一管理

## 📁 项目结构

```
├── pages/api/auth/
│   ├── [...nextauth].ts     # NextAuth 配置（简化版）
│   └── check-config.ts      # 环境配置检查
├── context/index.tsx        # 状态管理（包含 Twitter 状态）
├── utils/
│   ├── env.ts              # 环境配置工具
│   └── twitter.ts          # Twitter 工具函数
└── pages/demo/index.tsx     # Demo 页面（简化版）
```

## ⚙️ 环境配置

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_AUTH_SECRET=your-secret-key

# Twitter API
NEXT_PUBLIC_TWITTER_CLIENT_ID=your-client-id
NEXT_PUBLIC_TWITTER_CLIENT_SECRET=your-client-secret
```

## 🔧 Twitter 应用设置

在 [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard) 配置：

```
App Type: Web App, Automated App or Bot
OAuth 2.0: Enabled

回调 URLs:
✅ https://your-domain.com/api/auth/callback/twitter (生产)

Website URL:
✅ https://your-domain.com (生产域名)
```

## 🎨 使用方法

### 1. 连接 Twitter

```typescript
import { usePageContext } from '@/context';
import { signIn, signOut } from 'next-auth/react';

const { isTwitterConnected, twitterUser } = usePageContext();

// 连接
await signIn('twitter');

// 断开
await signOut();
```

### 2. 发布推文

```typescript
import { shareOnTwitter, createShareMessages } from '@/utils/twitter';

// 连接分享
const shareText = createShareMessages.connected(twitterUser.username);
shareOnTwitter(shareText);

// 质押分享
const shareText = createShareMessages.staked('100', 'USDC');
shareOnTwitter(shareText);
```

### 3. 状态管理

```typescript
const {
  twitterUser,        // Twitter 用户信息
  setTwitterUser,     // 设置用户信息
  isTwitterConnected  // 连接状态
} = usePageContext();
```

## 🌍 环境区分

```typescript
import { getCurrentEnv } from '@/utils/env';

const env = getCurrentEnv();

// 检查环境
if (env.isDev) {
  // 开发环境逻辑
} else {
  // 生产环境逻辑
}

// 检查配置
if (!env.twitterConfigured) {
  // 配置未完成
}
```

## 🚀 部署注意事项

1. **Twitter 回调**：添加生产环境回调 URL
2. **重启服务**：修改环境变量后重启

## 🔍 配置检查

访问 `/api/auth/check-config` 检查配置状态：

```json
{
  "configured": true,
  "environment": "production",
  "url": "https://test.aimonica.dev",
  "message": "Twitter配置完整"
}
```

## 💡 最佳实践

- ✅ 妥善保管 API 密钥
- ✅ 使用环境变量区分开发/生产
- ✅ 定期检查 Twitter API 限制
- ✅ 统一使用 context 管理状态 