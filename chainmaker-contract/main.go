// main包，用于启动合约
package main

import (
	sdk "chainmaker.org/chainmaker/contract-sdk-go/v2/sdk"
	"orasrs-chainmaker-contract/sracontract"
)

func main() {
	contract := &sracontract.SecurityRiskAssessmentContract{}
	sdk.RegisterContract(contract)
	sdk.Run()
}