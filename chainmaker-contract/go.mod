module orasrs-chainmaker-contract

go 1.19

require (
    github.com/chainmaker/chainmaker-contract-go/v2 v2.4.0
    github.com/chainmaker/chainmaker-tools-go/v2 v2.4.0
)

// replace 指令用于本地开发
// replace github.com/chainmaker/chainmaker-contract-go/v2 => ../path/to/local/chainmaker-contract-go
// replace github.com/chainmaker/chainmaker-tools-go/v2 => ../path/to/local/chainmaker-tools-go