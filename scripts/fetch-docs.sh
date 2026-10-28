#!/usr/bin/env bash
set -e
mkdir -p data/raw && cd data/raw
clone() { [ -d "$2" ] || git clone -q --depth 1 --filter=blob:none --sparse "https://github.com/$1.git" "$2"; git -C "$2" sparse-checkout set "$3"; }
clone react/react-native-website rn docs
clone expo/expo expo docs/pages
clone invertase/react-native-firebase rnfb docs
echo "done: $(find . -name '*.md*' | wc -l) files"
