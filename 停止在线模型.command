#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
demo_root="$(cd -- "$(dirname -- "$0")" && pwd)"
cd "$demo_root" || exit 1
"$demo_root/.venv/bin/python" "$demo_root/model_demo.py" stop
demo_status=$?
printf '\n按回车关闭窗口。\n'
read -r
exit "$demo_status"
