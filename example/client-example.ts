// example/client-example.ts
import { DefenseEngine } from "../src/DefenseEngine";

// 示例：初始化客户端
async function runClientExample() {
    console.log("🚀 初始化 OraSRS 威胁情报客户端...");

    // 从部署结果中获取合约地址
    const CONTRACT_ADDRESS = "0x5f3f1dBD7B74C6B46e8c44f98792A1dAf8d69154"; // 新部署的合约
    const RPC_URL = "https://api.orasrs.net"; // 公网节点

    // 创建防御引擎实例
    // 注意：实际使用时需要提供私钥以进行交易
    const defenseEngine = new DefenseEngine(
        CONTRACT_ADDRESS, 
        RPC_URL
        // 可选：privateKey - 如果只需要监听，可以不提供私钥
    );

    // 初始化防火墙
    await defenseEngine.init();

    // 开始监听全网共识事件
    defenseEngine.startGlobalSync();

    console.log("✅ 客户端初始化完成");
    console.log("📋 功能说明：");
    console.log("   1. 本地检测到攻击 -> 立即封禁 -> 异步上报证据");
    console.log("   2. 监听全网共识 -> 同步封禁规则");
    console.log("   3. 实现乐观验证：先防御，后共识");

    // 模拟处理一次攻击（需要有私钥才能实际执行）
    try {
        // 注意：这会失败，因为我们没有提供私钥
        await defenseEngine.handleAttack("192.168.1.100", "DDoS Attack", "大量连接请求日志...");
        console.log("✅ 攻击处理流程演示完成");
    } catch (e) {
        console.log("ℹ️  由于未提供私钥，上报步骤失败（这在只读模式下是正常的）");
    }

    // 演示查询功能
    try {
        const status = await defenseEngine.checkThreatStatus("8.8.8.8");
        console.log(`🔍 查询IP 8.8.8.8 状态:`, status);
    } catch (e) {
        console.log(`❌ 查询失败:`, e);
    }

    console.log("\n💡 使用说明：");
    console.log("   - 在生产环境中，需要提供有权限的私钥进行威胁上报");
    console.log("   - 公网节点上的合约地址需要替换为实际部署的地址");
    console.log("   - 实现日志监控器来自动检测攻击并调用 handleAttack");
}

// 运行示例
runClientExample()
    .then(() => console.log("\n✅ 示例运行完成"))
    .catch(error => console.error("\n❌ 示例运行失败:", error));
