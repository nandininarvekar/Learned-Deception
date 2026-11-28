#!/bin/bash
set -eu
cd "$(dirname "$0")"
export PATH="$HOME/.local/bin:$HOME/.pyenv/shims:/opt/homebrew/bin:$PATH"
export PYTHONPATH="$PWD/src"
export MAFIA_CODEX_REASONING_SUMMARY="${MAFIA_CODEX_REASONING_SUMMARY:-none}"
if [ -x .venv/bin/python ]; then
  python_bin=.venv/bin/python
else
  python_bin=python3
fi
if ! "$python_bin" -c 'from mafia_lab.train import main' >/dev/null 2>&1; then
  python3 -m venv .venv
  python_bin=.venv/bin/python
  "$python_bin" -m pip install -e .
fi
codex login status
for selection in gpt-6.2-sol:sol-12 gpt-6-luna:luna-12 cli-default:cli-default-12; do
  export MAFIA_CODEX_MODEL="${selection%:*}"
  echo "Checking $MAFIA_CODEX_MODEL with your ChatGPT login..."
  if "$python_bin" -m mafia_lab.train --provider codex --series "${selection#*:}"; then
    exit 0
  else
    status=$?
  fi
  # Only a model rejection during preflight permits trying another series.
  if [ "$status" -ne 3 ]; then
    exit "$status"
  fi
done
echo "The account rejected all model selections, including the CLI default." >&2
exit 3
