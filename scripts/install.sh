#!/bin/bash
#
# Quilt CLI Installer
#
# Usage:
#   curl -fsSL https://quilt.sh/install | bash
#
# Environment variables:
#   QUILT_INSTALL_DIR - Installation directory (default: /usr/local/bin or ~/.local/bin)
#   QUILT_VERSION     - Version to install (default: latest)
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REPO="ariacomputecompany/quilt-sdk"
BINARY_NAME="quilt"

log() {
    echo -e "${CYAN}==>${NC} $1"
}

error() {
    echo -e "${RED}Error:${NC} $1" >&2
    exit 1
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)  echo "linux" ;;
        Darwin*) echo "darwin" ;;
        *)       error "Unsupported operating system: $(uname -s)" ;;
    esac
}

# Detect architecture
detect_arch() {
    case "$(uname -m)" in
        x86_64|amd64)  echo "x64" ;;
        aarch64|arm64) echo "arm64" ;;
        *)             error "Unsupported architecture: $(uname -m)" ;;
    esac
}

# Get latest version from GitHub
get_latest_version() {
    curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/latest" 2>/dev/null | \
        grep '"tag_name"' | \
        sed -E 's/.*"v?([^"]+)".*/\1/' || echo "2.0.0"
}

# Determine install directory
get_install_dir() {
    if [ -n "$QUILT_INSTALL_DIR" ]; then
        echo "$QUILT_INSTALL_DIR"
    elif [ -w "/usr/local/bin" ]; then
        echo "/usr/local/bin"
    else
        mkdir -p "$HOME/.local/bin"
        echo "$HOME/.local/bin"
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main installation
main() {
    echo ""
    echo -e "${BOLD}Quilt CLI Installer${NC}"
    echo ""

    # Detect platform
    OS=$(detect_os)
    ARCH=$(detect_arch)
    log "Detected platform: ${OS}-${ARCH}"

    # Determine version
    VERSION="${QUILT_VERSION:-$(get_latest_version)}"
    log "Installing version: ${VERSION}"

    # Determine install directory
    INSTALL_DIR=$(get_install_dir)
    log "Install directory: ${INSTALL_DIR}"

    # Binary name for this platform
    BINARY_FILE="quilt-${OS}-${ARCH}"
    DOWNLOAD_URL="https://github.com/${GITHUB_REPO}/releases/download/v${VERSION}/${BINARY_FILE}"

    # Create temp directory
    TEMP_DIR=$(mktemp -d)
    trap "rm -rf ${TEMP_DIR}" EXIT

    # Download binary
    log "Downloading ${BINARY_FILE}..."
    if command_exists curl; then
        curl -fsSL "${DOWNLOAD_URL}" -o "${TEMP_DIR}/${BINARY_NAME}" || {
            warn "Failed to download from GitHub releases"
            log "Trying alternative download method..."

            # Fallback: try npm global install
            if command_exists npm; then
                log "Installing via npm..."
                npm install -g quilt-sdk
                success "Quilt installed via npm"
                echo ""
                echo -e "Run ${CYAN}quilt --help${NC} to get started"
                echo ""
                exit 0
            else
                error "Could not download binary and npm is not available"
            fi
        }
    elif command_exists wget; then
        wget -q "${DOWNLOAD_URL}" -O "${TEMP_DIR}/${BINARY_NAME}" || {
            error "Failed to download binary"
        }
    else
        error "curl or wget is required"
    fi

    # Make executable
    chmod +x "${TEMP_DIR}/${BINARY_NAME}"

    # Move to install directory
    if [ -w "${INSTALL_DIR}" ]; then
        mv "${TEMP_DIR}/${BINARY_NAME}" "${INSTALL_DIR}/${BINARY_NAME}"
    else
        log "Requesting sudo access to install to ${INSTALL_DIR}..."
        sudo mv "${TEMP_DIR}/${BINARY_NAME}" "${INSTALL_DIR}/${BINARY_NAME}"
    fi

    success "Quilt installed to ${INSTALL_DIR}/${BINARY_NAME}"

    # Verify installation
    if command_exists quilt; then
        success "Installation verified"
    else
        # Check if install dir is in PATH
        if [[ ":$PATH:" != *":${INSTALL_DIR}:"* ]]; then
            warn "${INSTALL_DIR} is not in your PATH"
            echo ""
            echo "Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
            echo ""
            echo -e "  ${CYAN}export PATH=\"\$PATH:${INSTALL_DIR}\"${NC}"
            echo ""
        fi
    fi

    echo ""
    echo -e "${BOLD}Getting Started${NC}"
    echo ""
    echo "  1. Configure your API key:"
    echo -e "     ${CYAN}quilt config set api-key <your-api-key>${NC}"
    echo ""
    echo "  2. Set the API endpoint:"
    echo -e "     ${CYAN}quilt config set endpoint https://backend.quilt.sh${NC}"
    echo ""
    echo "  3. Create your first container:"
    echo -e "     ${CYAN}quilt create --name myapp --cmd \"echo hello\"${NC}"
    echo ""
    echo "  Run ${CYAN}quilt --help${NC} for more commands"
    echo ""
}

main "$@"
