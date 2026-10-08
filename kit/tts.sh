#!/bin/bash
# 在能连外网的那一侧运行（云端连不上配音服务）。用法：tts.sh lines.txt [声音]
# lines.txt 每行：id|要念的文字（数字写成汉字，引号书名号去掉，多音字换同音字）
V=${2:-zh-CN-YunxiNeural}
while IFS='|' read -r id t; do [ -z "$id" ] && continue; timeout 60 python3 -m edge_tts --voice "$V" --rate=+5% --text "$t" --write-media "$id.mp3" 2>&1 | tail -1; [ -s "$id.mp3" ] || echo "失败：$id（换个说法再试）"; done < "$1"
