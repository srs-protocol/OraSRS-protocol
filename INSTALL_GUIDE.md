# OraSRS Linux 客户端一键安装使用说明

## 一键安装命令

### 方式一：使用 curl
```bash
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-client.sh | bash
```

### 方式二：使用 wget
```bash
wget -O - https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-client.sh | bash
```

## 安装过程说明

一键安装脚本会自动执行以下步骤：

1. **检测系统环境**：自动识别 Linux 发行版 (Ubuntu, Debian, CentOS, Fedora, Arch 等)
2. **安装依赖**：根据发行版安装必要的依赖包 (wget, curl, tar, gzip)
3. **下载客户端**：从 OraSRS 协议链下载最新的客户端二进制文件
4. **创建服务**：设置 systemd 服务，实现开机自启
5. **启动服务**：自动启动客户端并连接到 OraSRS 协议链

## 安装后配置

### 服务管理命令
```bash
# 启动服务
sudo systemctl start orasrs-client

# 停止服务
sudo systemctl stop orasrs-client

# 重启服务
sudo systemctl restart orasrs-client

# 查看服务状态
sudo systemctl status orasrs-client

# 查看实时日志
sudo journalctl -u orasrs-client -f
```

### API 接口测试
安装完成后，您可以使用以下命令测试客户端：

```bash
# 健康检查
curl http://localhost:3006/health

# 风险查询示例
curl 'http://localhost:3006/orasrs/v1/query?ip=8.8.8.8'

# 威胁列表
curl http://localhost:3006/orasrs/v2/threat-list
```

## 配置文件

客户端配置文件位于 `$HOME/orasrs-client/.env`，包含以下环境变量：

```bash
ORASRS_PORT=3006
ORASRS_HOST=0.0.0.0
ORASRS_ENABLE_LOGGING=true
ORASRS_LOG_FILE=$HOME/orasrs-client/logs/orasrs-service.log
ORASRS_BLOCKCHAIN_ENDPOINT=https://api.orasrs.net
ORASRS_CHAIN_ID=8888
ORASRS_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

**环境变量说明**:
- `ORASRS_BLOCKCHAIN_ENDPOINT`: OraSRS协议链端点，这是基于Hardhat和Geth的私有链
- `ORASRS_CHAIN_ID`: 区块链网络ID，8888是OraSRS私有链的默认Chain ID

如需修改配置，请编辑配置文件后重启服务：
```bash
sudo systemctl restart orasrs-client
```

## Docker 部署选项

如果不使用一键安装，也可以使用 Docker 部署：

### 使用 Dockerfile
```bash
# 克隆仓库
git clone https://github.com/srs-protocol/OraSRS-protocol.git
cd OraSRS-protocol

# 构建镜像
docker build -f Dockerfile.client -t orasrs-client .

# 运行容器
docker run -d --name orasrs-client -p 3006:3006 orasrs-client
```

### 使用 Docker Compose
```bash
# 启动服务
docker-compose -f docker-compose.client.yml up -d

# 查看日志
docker-compose -f docker-compose.client.yml logs -f
```

## 常见问题

### 1. 权限问题
如果遇到权限问题，请确保使用有 sudo 权限的用户运行脚本。

### 2. 网络连接问题
如果下载失败，请检查网络连接是否正常，以及防火墙是否阻止了相关域名的访问。

### 3. 端口冲突
默认使用 3006 端口，如果该端口已被占用，可以修改配置文件中的 `ORASRS_PORT` 变量。

### 4. 服务启动失败
使用以下命令查看详细日志：
```bash
sudo journalctl -u orasrs-client -f
```

## 卸载客户端

如需卸载客户端，请执行以下步骤：

```bash
# 停止服务
sudo systemctl stop orasrs-client
sudo systemctl disable orasrs-client

# 删除服务文件
sudo rm /etc/systemd/system/orasrs-client.service

# 重新加载 systemd
sudo systemctl daemon-reload
sudo systemctl reset-failed

# 删除客户端文件
rm -rf $HOME/orasrs-client
```

## 支持协议

- **协议版本**: OraSRS v2.0.1
- **区块链集成**: 连接 OraSRS 协议链 (api.orasrs.net)，这是基于Hardhat和Geth的私有链，Chain ID为8888
- **去重逻辑**: 防止重复威胁报告的时间窗口机制
- **三层架构**: 支持边缘层、共识层、智能层

## 技术支持

如遇到安装或使用问题，请查看日志文件 `$HOME/orasrs-client/logs/` 或联系技术支持。