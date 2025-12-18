local m, s, o

m = Map("orasrs", translate("OraSRS Threat Intelligence"), 
    translate("Lightweight threat intelligence protection for IoT devices. OraSRS provides real-time protection against botnets, malware, and attacks targeting IoT devices."))

-- General Settings Section
s = m:section(TypedSection, "orasrs", translate("General Settings"))
s.anonymous = true
s.addremove = false

o = s:option(Flag, "enabled", translate("Enable OraSRS"))
o.rmempty = false
o.default = "1"

o = s:option(Value, "api_endpoint", translate("API Endpoint"))
o.default = "https://api.orasrs.net"
o.placeholder = "https://api.orasrs.net"
o.description = translate("OraSRS threat intelligence API endpoint")

o = s:option(Value, "sync_interval", translate("Sync Interval (seconds)"))
o.datatype = "uinteger"
o.default = "3600"
o.description = translate("How often to sync threat intelligence from the cloud (in seconds)")

o = s:option(Value, "cache_size", translate("Cache Size"))
o.datatype = "uinteger"
o.default = "1000"
o.description = translate("Maximum number of entries to cache locally")

o = s:option(ListValue, "log_level", translate("Log Level"))
o:value("debug", translate("Debug"))
o:value("info", translate("Info"))
o:value("warn", translate("Warning"))
o:value("error", translate("Error"))
o.default = "info"

-- IoT Shield Section
s = m:section(TypedSection, "iot_shield", translate("IoT Shield (Transparent Proxy)"))
s.anonymous = true
s.addremove = false
s.description = translate("Transparent proxy mode intercepts traffic from IoT devices and blocks threats automatically")

o = s:option(Flag, "enabled", translate("Enable IoT Shield"))
o.rmempty = false
o.default = "0"
o.description = translate("<strong>Warning:</strong> This will intercept all traffic from configured IoT networks")

o = s:option(ListValue, "shield_mode", translate("Protection Mode"))
o:value("monitor", translate("Monitor Only (Log threats but don't block)"))
o:value("block", translate("Block Mode (Actively block threats)"))
o.default = "monitor"
o.description = translate("Monitor mode is recommended for initial deployment")

o = s:option(Flag, "auto_block", translate("Auto Block High Risk IPs"))
o.default = "1"
o.depends("shield_mode", "block")

o = s:option(Value, "block_threshold", translate("Block Threshold (Risk Score)"))
o.datatype = "range(0,100)"
o.default = "80"
o.depends("shield_mode", "block")
o.description = translate("IPs with risk scores above this threshold will be blocked")

o = s:option(Value, "iot_network", translate("IoT Network CIDR"))
o.default = "192.168.2.0/24"
o.placeholder = "192.168.2.0/24"
o.description = translate("Network range of IoT devices to protect (e.g., 192.168.2.0/24)")

o = s:option(DynamicList, "protected_ports", translate("Protected Ports"))
o.default = "80 443 1883 8883"
o.description = translate("Ports to monitor (space-separated). Common IoT ports: 80, 443, 1883, 8883")

-- Performance Settings
s = m:section(TypedSection, "performance", translate("Performance Tuning"))
s.anonymous = true
s.addremove = false

o = s:option(Value, "max_memory_mb", translate("Max Memory (MB)"))
o.datatype = "uinteger"
o.default = "20"
o.description = translate("Maximum memory usage limit")

o = s:option(Value, "cache_ttl", translate("Cache TTL (seconds)"))
o.datatype = "uinteger"
o.default = "86400"
o.description = translate("How long to keep threat data in cache (24 hours = 86400 seconds)")

o = s:option(Flag, "compact_mode", translate("Compact Mode"))
o.default = "0"
o.description = translate("Enable for low-memory devices (< 64MB RAM)")

-- Alert Settings
s = m:section(TypedSection, "alerts", translate("Alert Configuration"))
s.anonymous = true
s.addremove = false

o = s:option(Flag, "enabled", translate("Enable Alerts"))
o.default = "0"

o = s:option(Value, "webhook_url", translate("Webhook URL"))
o.depends("enabled", "1")
o.placeholder = "https://your-webhook-url.com"
o.description = translate("Send alerts to this webhook URL")

o = s:option(Value, "alert_threshold", translate("Alert Threshold"))
o.datatype = "range(0,100)"
o.default = "70"
o.depends("enabled", "1")
o.description = translate("Minimum risk score to trigger alerts")

return m
