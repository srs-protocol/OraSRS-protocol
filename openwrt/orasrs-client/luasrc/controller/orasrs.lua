module("luci.controller.orasrs", package.seeall)

function index()
    entry({"admin", "services", "orasrs"}, firstchild(), _("OraSRS IoT Shield"), 60).dependent = false
    entry({"admin", "services", "orasrs", "settings"}, cbi("orasrs"), _("Settings"), 1)
    entry({"admin", "services", "orasrs", "status"}, template("orasrs/status"), _("Status"), 2)
    entry({"admin", "services", "orasrs", "whitelist"}, cbi("orasrs_whitelist"), _("Whitelist"), 3)
    entry({"admin", "services", "orasrs", "logs"}, template("orasrs/logs"), _("Logs"), 4)
    
    -- API endpoints for AJAX calls
    entry({"admin", "services", "orasrs", "api", "status"}, call("action_status"), nil).leaf = true
    entry({"admin", "services", "orasrs", "api", "stats"}, call("action_stats"), nil).leaf = true
    entry({"admin", "services", "orasrs", "api", "threats"}, call("action_threats"), nil).leaf = true
    entry({"admin", "services", "orasrs", "api", "sync"}, call("action_sync"), nil).leaf = true
end

function action_status()
    local http = require "luci.http"
    local json = require "luci.jsonc"
    local sys = require "luci.sys"
    
    -- 调用 OraSRS API 获取状态
    local handle = io.popen("curl -s http://127.0.0.1:3006/health 2>/dev/null")
    local result = handle:read("*a")
    handle:close()
    
    http.prepare_content("application/json")
    
    if result and result ~= "" then
        http.write(result)
    else
        http.write(json.stringify({
            status = "error",
            message = "OraSRS service not responding"
        }))
    end
end

function action_stats()
    local http = require "luci.http"
    local json = require "luci.jsonc"
    
    local handle = io.popen("curl -s http://127.0.0.1:3006/stats 2>/dev/null")
    local result = handle:read("*a")
    handle:close()
    
    http.prepare_content("application/json")
    http.write(result or "{}")
end

function action_threats()
    local http = require "luci.http"
    local sqlite3 = require("lsqlite3")
    local json = require "luci.jsonc"
    
    local db = sqlite3.open("/var/lib/orasrs/cache.db")
    local threats = {}
    
    if db then
        for row in db:nrows("SELECT ip, risk_score, threat_type, source, last_seen FROM threats ORDER BY risk_score DESC LIMIT 100") do
            table.insert(threats, row)
        end
        db:close()
    end
    
    http.prepare_content("application/json")
    http.write(json.stringify({
        threats = threats,
        count = #threats
    }))
end

function action_sync()
    local http = require "luci.http"
    local json = require "luci.jsonc"
    local sys = require "luci.sys"
    
    -- 触发同步
    local result = sys.exec("curl -s -X POST http://127.0.0.1:3006/sync 2>/dev/null")
    
    http.prepare_content("application/json")
    http.write(result or json.stringify({
        success = false,
        message = "Sync failed"
    }))
end

function action_logs()
    luci.template.render("orasrs/logs")
end
