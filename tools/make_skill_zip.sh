#!/bin/sh
# 生成给 Claude 应用上传用的 skill 包：只含 SKILL.md（工具箱由 skill 自己从仓库克隆）
set -e
cd "$(dirname "$0")/.."
rm -rf dist/_tmp && mkdir -p dist/_tmp/narrated-video-studio
cp SKILL.md dist/_tmp/narrated-video-studio/SKILL.md
(cd dist/_tmp && zip -q -r ../narrated-video-studio.zip narrated-video-studio)
rm -rf dist/_tmp
echo "dist/narrated-video-studio.zip"
