QUARTZ_REPO   ?= https://github.com/jackyzha0/quartz.git
QUARTZ_BRANCH ?= v4
PORTAL_DIR    := Portal
WELT_DIR      := Welt
WELT_PORT     := 4180
WELT_WS_PORT  := 4182

.PHONY: install build dev clean check docs \
        install-portal dev-portal build-portal check-portal \
        install-welt build-welt serve-welt

# ── Shared Quartz recipe (single line for shell chaining) ───
define quartz
	cp $(1)/quartz.config.ts $(1)/.quartz/quartz.config.ts && cp $(1)/quartz.layout.ts $(1)/.quartz/quartz.layout.ts && cd $(1)/.quartz && npx quartz build --directory ../content $(2)
endef

# ── Portal ──────────────────────────────────────────────────
install-portal:
	cd $(PORTAL_DIR) && npm install

dev-portal:
	cd $(PORTAL_DIR) && npm run dev

build-portal:
	cd $(PORTAL_DIR) && npm run build

check-portal:
	cd $(PORTAL_DIR) && npm run check

# ── Welt install ────────────────────────────────────────────
install: install-portal install-welt

install-welt:
	@echo ">> Installing Quartz engine for $(WELT_DIR)"
	@if [ ! -d "$(WELT_DIR)/.quartz/.git" ]; then \
		git clone --branch $(QUARTZ_BRANCH) --depth 1 $(QUARTZ_REPO) "$(WELT_DIR)/.quartz"; \
	else \
		echo "   (already installed, pulling latest)"; \
		cd "$(WELT_DIR)/.quartz" && git pull; \
	fi
	cd "$(WELT_DIR)/.quartz" && npm install
	@echo ">> $(WELT_DIR) ready"

# ── Welt build ──────────────────────────────────────────────
build: build-portal build-welt

build-welt: install-welt
	$(call quartz,$(WELT_DIR),)

# ── Welt serve ──────────────────────────────────────────────
serve-welt: install-welt
	$(call quartz,$(WELT_DIR),--serve --port $(WELT_PORT) --wsPort $(WELT_WS_PORT))

# ── Docs (serve + open browser, Ctrl+C to stop) ────────────
docs: install-welt
	@$(call quartz,$(WELT_DIR),--serve --port $(WELT_PORT) --wsPort $(WELT_WS_PORT)) & \
	sleep 3 && open http://localhost:$(WELT_PORT); \
	echo ">> Welt running. Ctrl+C to stop."; \
	wait

# ── Dev ─────────────────────────────────────────────────────
dev: dev-portal

# ── Clean ───────────────────────────────────────────────────
clean:
	rm -rf $(WELT_DIR)/.quartz
	rm -rf $(PORTAL_DIR)/node_modules $(PORTAL_DIR)/.svelte-kit
	@echo ">> Done"
