include $(TOPDIR)/rules.mk

PKG_NAME:=orasrs-client
PKG_VERSION:=2.1.0
PKG_RELEASE:=1

PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)-$(PKG_VERSION)
PKG_SOURCE:=$(PKG_NAME)-$(PKG_VERSION).tar.gz
PKG_SOURCE_URL:=https://github.com/srs-protocol/OraSRS-protocol/releases/download/v$(PKG_VERSION)/
PKG_HASH:=skip

PKG_MAINTAINER:=OraSRS Team <support@orasrs.net>
PKG_LICENSE:=Apache-2.0
PKG_LICENSE_FILES:=LICENSE

include $(INCLUDE_DIR)/package.mk

define Package/orasrs-client
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=Web Servers/Proxies
  TITLE:=OraSRS Threat Intelligence Client for IoT
  URL:=https://github.com/srs-protocol/OraSRS-protocol
  DEPENDS:=+node +node-npm +iptables +ipset +kmod-ipt-nat +better-sqlite3
  PKGARCH:=all
endef

define Package/orasrs-client/description
  OraSRS (Oracle Security Root Service) Lite Client
  
  Lightweight threat intelligence protection for IoT devices.
  Features:
  - Transparent proxy mode for IoT device protection
  - SQLite-based caching (< 10MB memory)
  - Automatic threat intelligence synchronization
  - Integration with URLhaus, ThreatFox for IoT botnet detection
  - LuCI web interface for easy management
endef

define Package/orasrs-client/conffiles
/etc/config/orasrs
/etc/orasrs/
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	$(CP) ./orasrs-lite.js $(PKG_BUILD_DIR)/
	$(CP) ./package.json $(PKG_BUILD_DIR)/
endef

define Build/Compile
	# Install dependencies
	cd $(PKG_BUILD_DIR) && \
	npm install --production --no-optional --prefer-offline
	
	# Optional: Use pkg to compile to binary for smaller size
	# Requires pkg to be installed in build environment
	# cd $(PKG_BUILD_DIR) && npx pkg orasrs-lite.js \
	#   --targets node16-linux-$(ARCH) \
	#   --output orasrs-lite-bin
endef

define Package/orasrs-client/install
	# Install main application
	$(INSTALL_DIR) $(1)/usr/lib/orasrs
	$(CP) $(PKG_BUILD_DIR)/orasrs-lite.js $(1)/usr/lib/orasrs/
	$(CP) $(PKG_BUILD_DIR)/node_modules $(1)/usr/lib/orasrs/
	
	# Install wrapper script
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./files/usr/bin/orasrs-cli $(1)/usr/bin/
	
	# Install configuration files
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/orasrs $(1)/etc/config/
	
	# Install init script
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/orasrs $(1)/etc/init.d/
	
	# Install transparent proxy scripts
	$(INSTALL_DIR) $(1)/usr/lib/orasrs
	$(INSTALL_BIN) ./files/usr/lib/orasrs/transparent-proxy.sh $(1)/usr/lib/orasrs/
	
	# Install LuCI interface
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/controller
	$(INSTALL_DATA) ./luasrc/controller/orasrs.lua $(1)/usr/lib/lua/luci/controller/
	
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/model/cbi
	$(INSTALL_DATA) ./luasrc/model/cbi/orasrs.lua $(1)/usr/lib/lua/luci/model/cbi/
	$(INSTALL_DATA) ./luasrc/model/cbi/orasrs_whitelist.lua $(1)/usr/lib/lua/luci/model/cbi/
	
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/view/orasrs
	$(INSTALL_DATA) ./luasrc/view/orasrs/status.htm $(1)/usr/lib/lua/luci/view/orasrs/
	$(INSTALL_DATA) ./luasrc/view/orasrs/logs.htm $(1)/usr/lib/lua/luci/view/orasrs/
	
	# Create data directories
	$(INSTALL_DIR) $(1)/var/lib/orasrs
	$(INSTALL_DIR) $(1)/var/log
endef

define Package/orasrs-client/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	# Enable and start service
	/etc/init.d/orasrs enable
	/etc/init.d/orasrs start
	
	# Reload LuCI
	/etc/init.d/uhttpd reload
	
	echo "OraSRS client installed successfully!"
	echo "Access the web interface at: http://your-router-ip/cgi-bin/luci/admin/services/orasrs"
}
exit 0
endef

define Package/orasrs-client/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	# Stop and disable service
	/etc/init.d/orasrs stop
	/etc/init.d/orasrs disable
	
	# Clean up transparent proxy rules
	/usr/lib/orasrs/transparent-proxy.sh stop
}
exit 0
endef

$(eval $(call BuildPackage,orasrs-client))
