# WSL interop often puts Windows npm/go ahead of Linux installs in PATH.
# Prefer native Linux binaries so recipes do not invoke /mnt/c/Program Files/... .
IS_WSL := $(shell grep -qiE 'microsoft|WSL' /proc/version 2>/dev/null && echo 1)

ifneq ($(IS_WSL),)
  WSL_NATIVE_NPM := $(shell which -a npm 2>/dev/null | grep -vE '^/mnt/[a-z]/' | head -1)
  ifeq ($(WSL_NATIVE_NPM),)
    WSL_NATIVE_NPM := $(shell ls -1d $(HOME)/.nvm/versions/node/v*/bin/npm 2>/dev/null | tail -1)
  endif
  ifneq ($(WSL_NATIVE_NPM),)
    NPM := $(WSL_NATIVE_NPM)
  else ifneq ($(findstring /mnt/,$(NPM)),)
    $(error npm: run scripts/install-wsl-node.sh in WSL (see README "WSL"))
  endif

  WSL_NATIVE_GO := $(shell which -a go 2>/dev/null | grep -vE '^/mnt/[a-z]/' | head -1)
  ifeq ($(WSL_NATIVE_GO),)
    ifneq ($(wildcard $(HOME)/.local/go/bin/go),)
      WSL_NATIVE_GO := $(HOME)/.local/go/bin/go
    endif
  endif
  ifneq ($(WSL_NATIVE_GO),)
    GO := $(WSL_NATIVE_GO)
  endif
endif
