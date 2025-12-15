include $(TOPDIR)/rules.mk

PKG_NAME:=orasrs-client
PKG_VERSION:=2.0.2
PKG_RELEASE:=1

PKG_MAINTAINER:=OraSRS Team
PKG_LICENSE:=MIT

include $(INCLUDE_DIR)/package.mk

define Package/orasrs-client
  SECTION:=net
  CATEGORY:=Network
  TITLE:=OraSRS Client for OpenWrt
  DEPENDS:=+node +node-npm
endef

define Package/orasrs-client/description
  OraSRS (Oracle Security Root Service) Client for IoT/Routers.
  Provides decentralized threat intelligence and IP filtering.
endef

define Build/Compile
	# Nothing to compile (JS)
endef

define Package/orasrs-client/install
	$(INSTALL_DIR) $(1)/opt/orasrs
	$(CP) ./files/* $(1)/opt/orasrs/
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/orasrs.init $(1)/etc/init.d/orasrs
endef

$(eval $(call BuildPackage,orasrs-client))
