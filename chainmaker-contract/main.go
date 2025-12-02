package main

import (
	"fmt"
	"os"
	"time"
)

func main() {
	fmt.Println("===========================================")
	fmt.Println("    OraSRS ChainMaker 合约安全测试套件")
	fmt.Println("===========================================")
	fmt.Println("开始时间:", time.Now().Format("2006-01-02 15:04:05"))
	fmt.Println("")

	// 检查是否在 ChainMaker 环境中运行
	if os.Getenv("CHAINMAKER_CONTRACT_ENV") == "" {
		fmt.Println("⚠️  警告: 未检测到 ChainMaker 环境变量")
		fmt.Println("   请确保在 ChainMaker 合约环境中运行此测试")
		fmt.Println("")
	}

	// 运行测试套件
	RunTestsWithReport()

	fmt.Println("")
	fmt.Println("===========================================")
	fmt.Println("测试完成时间:", time.Now().Format("2006-01-02 15:04:05"))
	fmt.Println("===========================================")
}