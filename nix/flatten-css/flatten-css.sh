#!/usr/bin/env bash
SCRIPT_DIR=$(dirname "$0")
POSTCSS="$SCRIPT_DIR/node_modules/.bin/postcss"

# TODO(2025-05-04, Max Bolotin): Somehow tell postcss to ignore @import statements in config.css

TEXTFOX_PACKAGE="$1"
CONFIG_CSS="$2"
BUILD_DIR="$3"
INSTALL_DIR="$4"

print_usage_and_exit() {
  echo "Usage: flatten-css <path-to-textfox> <path-to-config-css> <path-to-build-dir> <path-to-install-dir>"
  exit 1
}

if [[ ! -x "$POSTCSS" ]]; then
  echo "postcss cmd not found, exiting with error code 1"
  exit 1
fi

if [[ ! -d "$TEXTFOX_PACKAGE" ]]; then
  echo "Textfox package is not a directory: $TEXTFOX_PACKAGE"
  print_usage_and_exit
fi

if [[ ! -f "$CONFIG_CSS" ]]; then
  echo "Config css is not a file: $CONFIG_CSS"
  print_usage_and_exit
fi

mkdir -p "${BUILD_DIR}/chrome"
cp -R -L ${TEXTFOX_PACKAGE}/chrome/* "${BUILD_DIR}/chrome"
echo "Copying ${CONFIG_CSS} to ${BUILD_DIR}/chrome/config.css"
cp -L "${CONFIG_CSS}" "${BUILD_DIR}/chrome/config.css"

mkdir -p "${INSTALL_DIR}/chrome"
cd "${BUILD_DIR}/chrome"
echo "Contents of build dir:"
ls
$POSTCSS userContent.css -o "${INSTALL_DIR}/chrome/userContent.css" --use postcss-import
$POSTCSS userChrome.css -o "${INSTALL_DIR}/chrome/userChrome.css" --use postcss-import
