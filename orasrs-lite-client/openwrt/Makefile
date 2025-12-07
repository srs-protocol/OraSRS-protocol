# OpenWrt Package Makefile for OraSRS Lite Client
# 用于构建OpenWrt包的Makefile

include $(TOPDIR)/rules.mk

PKG_NAME:=orasrs-client
PKG_VERSION:=2.0.0
PKG_RELEASE:=1

PKG_BUILD_DIR := $(BUILD_DIR)/$(PKG_NAME)-$(PKG_VERSION)

include $(INCLUDE_DIR)/package.mk

define Package/orasrs-client
  SECTION:=net
  CATEGORY:=Network
  TITLE:=OraSRS Threat Intelligence Client
  DEPENDS:=+iptables +libubox20191227 +libuci +curl
  MAINTAINER:=OraSRS Team
endef

define Package/orasrs-client/description
  Lightweight threat intelligence client for OraSRS protocol.
  Designed to run on resource-constrained devices like routers.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/orasrs-client/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./openwrt/usr/bin/orasrs_client.sh $(1)/usr/bin/orasrs_client
	
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_DATA) ./openwrt/etc/config/orasrs $(1)/etc/config/orasrs
	
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./openwrt/etc/init.d/orasrs $(1)/etc/init.d/orasrs
endef

$(eval $(call BuildPackage,orasrs-client))