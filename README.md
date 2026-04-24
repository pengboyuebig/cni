# CNI - Cached npm Install

基于 symlink 的 npm 包缓存管理工具，实现跨项目依赖复用，节省下载时间和磁盘空间。

## 特性

- **缓存复用** — 同版本包只下载一次，跨项目共享
- **版本共存** — `lodash@4.17.21` 和 `lodash@4.17.20` 在缓存中共存
- **符号链接** — Windows 使用 junction（免管理员权限），POSIX 使用 symlink
- **npm Hook** — 可自动拦截 `npm install`，无需改变使用习惯
- **多层级配置** — 全局配置 + 项目配置 + 环境变量 + CLI 参数

## 安装

```bash
cd D:\work\project\brfore_2026\node
npm install
npm run build
npm link
```

注册后即可在任意目录使用 `cni` 命令。

## 快速开始

```bash
# 进入任意项目目录
cd your-project

# 用 cni 替代 npm install
cni install

# 添加新依赖
cni add dayjs
cni add jest -D
```

首次运行会下载包到缓存目录，二次运行直接从缓存链接，跳过下载。

## 命令一览

### install - 安装依赖

```bash
cni install                  # 安装 package.json 中所有依赖
cni install lodash axios     # 安装指定包
cni i                        # 简写
cni install --production     # 仅安装 dependencies
cni install --ignore-scripts # 跳过 lifecycle 脚本
cni install --no-links       # 仅下载，不创建链接
cni install --force          # 强制重新下载
cni install --verbose        # 详细输出
```

### add - 添加依赖

```bash
cni add dayjs                # 添加到 dependencies
cni add jest -D              # 添加到 devDependencies
cni add lodash@4.17.21       # 指定版本
```

### cache - 缓存管理

```bash
cni cache stat               # 查看缓存统计
cni cache ls                 # 列出所有缓存包
cni cache ls lodash          # 按模式搜索
cni cache clean              # 清理无引用的包
cni cache clean --all        # 清空全部缓存
cni cache clean lodash       # 按模式删除
cni cache verify             # 校验所有缓存包完整性
```

### config - 配置管理

```bash
cni config list              # 查看所有配置
cni config get store         # 查看某个配置值
cni config set store "D:\.cni-store"   # 设置缓存路径
cni config set registry "https://registry.npmmirror.com"  # 设置镜像源
```

### hook - npm 拦截

```bash
cni hook install             # 安装 preinstall hook
cni hook uninstall           # 卸载 hook
```

安装 hook 后，每次 `npm install` 时 cni 会先从缓存安装包，npm 发现已存在则跳过下载。

## 配置

### 配置优先级

```
CLI 参数  >  环境变量  >  项目配置  >  全局配置  >  默认值
```

### 全局配置

路径：`~/.cni/config.json`（Windows: `C:\Users\<用户名>\.cni\config.json`）

```bash
cni config set store "D:\work\.cni-store"
cni config set registry "https://registry.npmmirror.com"
```

### 项目配置

在项目根目录创建 `.cnirc.json`：

```json
{
  "store": "../.cni-store",
  "registry": "https://registry.npmmirror.com"
}
```

也支持在 `package.json` 中配置：

```json
{
  "cni": {
    "store": "../.cni-store"
  }
}
```

### 环境变量

| 变量 | 说明 |
|------|------|
| `CNI_STORE` | 缓存存储路径 |
| `CNI_REGISTRY` | npm registry 地址 |
| `CNI_PROXY` | HTTP proxy |
| `CNI_HTTPS_PROXY` | HTTPS proxy |

### 配置项说明

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `store` | `~/.cni/store` | 缓存存储根路径 |
| `registry` | `https://registry.npmjs.org` | npm registry 地址 |
| `linkType` | Windows: `junction` / POSIX: `symlink` | 链接类型 |
| `verifyIntegrity` | `true` | 是否校验缓存完整性 |
| `concurrency` | `4` | 并发下载数 |
| `runScripts` | `true` | 是否运行 lifecycle 脚本 |
| `maxStoreSize` | `0` | 最大缓存大小，0 = 无限 |

## 缓存存储结构

```
<store>/
├── _metadata.json                # 全局统计
├── lodash/
│   ├── 4.17.21/
│   │   ├── node_modules/
│   │   │   └── lodash/           # 包内容
│   │   └── .metadata.json        # 版本元数据
│   └── 4.17.20/                  # 不同版本共存
│       └── ...
├── @babel/
│   └── core/
│       └── 7.24.0/               # scope 包
│           └── ...
```

## 工作原理

```
cni install
    │
    ▼
1. 加载配置 ← 全局 + 项目 + 环境变量 + CLI
    │
    ▼
2. 解析依赖 ← 读取 package-lock.json 获取精确版本
    │
    ▼
3. 缓存检查 ← 命中则跳过下载，未命中则标记需下载
    │
    ▼
4. 下载缺失 ← pacote 下载到缓存，自动校验 integrity
    │
    ▼
5. 创建链接 ← junction/symlink 链接到 node_modules
    │
    ▼
6. 完成安装 ← 更新引用，输出摘要
```

## 典型使用场景

### 多项目共享缓存

```
brfore_2026/
├── .cni-store/          ← 共享缓存目录
├── lca_main/            ← cni install → 从缓存链接
├── glkj-carbon-frontend/ ← cni install → 复用已有缓存
└── anhui-org-carbon-ui/  ← cni install → 复用已有缓存
```

在各项目中创建 `.cnirc.json`：
```json
{ "store": "../.cni-store" }
```

### npm Hook 模式

```bash
# 一次性设置
cni hook install

# 之后正常使用 npm install.cni 自动在后台加速
npm install
```

### 自定义镜像源

```bash
# 针对国内网络
cni config set registry "https://registry.npmmirror.com"

# 或在项目中配置
echo '{"registry":"https://registry.npmmirror.com"}' > .cnirc.json
```

## Windows 注意事项

- 使用 `junction`（目录联接）替代 symlink，**不需要管理员权限**
- junction 必须使用绝对路径
- 如果 junction 创建失败，自动回退到硬拷贝

## 开发

```bash
npm run build        # 编译 TypeScript
npm run dev          # 监听模式编译
node dist/bin/cni.js --help   # 直接运行
```
