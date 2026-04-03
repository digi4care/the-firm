#!/usr/bin/env python3
"""
Session Catchup Script for planning-with-files (oh-my-pi version)

Analyzes the previous session to find unsynced context after the last
planning file update. Designed to run on session_start.

Usage: python3 session-catchup.py [project-path]
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

PLANNING_FILES = ["task_plan.md", "progress.md", "findings.md"]


def get_project_dir(project_path: str) -> Path:
    """Convert project path to oh-my-pi's storage path format."""
    # Normalize to an absolute path to ensure a stable representation
    # .as_posix() handles '\\' -> '/' conversion on Windows automatically
    resolved_str = Path(project_path).resolve().as_posix()

    # Sanitize path: replace separators with '-', remove ':' (Windows drives)
    sanitized = resolved_str.replace("/", "-").replace(":", "")

    # Apply naming convention: leading '-' and '_' -> '-'
    if not sanitized.startswith("-"):
        sanitized = "-" + sanitized
    sanitized_name = sanitized.replace("_", "-")

    # Check oh-my-pi data directory
    data_root_env = os.getenv("OMP_DATA_DIR")
    if data_root_env:
        data_root = Path(data_root_env)
    else:
        # Respect XDG_DATA_HOME if set, otherwise use default
        xdg_root = os.getenv("XDG_DATA_HOME")
        if xdg_root:
            data_root = Path(xdg_root) / "omp" / "storage"
        else:
            data_root = Path.home() / ".local" / "share" / "omp" / "storage"

    # oh-my-pi uses ~/.pi/agent/sessions/ for sessions
    omp_sessions = Path.home() / ".omp" / "agent" / "sessions"
    if omp_sessions.exists():
        return omp_sessions / sanitized_name

    # Fallback to data_root if ~/.omp doesn't exist
    return data_root / "session" / sanitized_name


def get_sessions_sorted(project_dir: Path) -> List[Path]:
    """Get all session files sorted by modification time (newest first)."""
    if not project_dir.exists():
        return []

    # oh-my-pi uses *.jsonl files
    sessions = list(project_dir.glob("*.jsonl"))
    # Filter out agent-specific sessions if any
    main_sessions = [s for s in sessions if not s.name.startswith("agent-")]
    return sorted(main_sessions, key=lambda p: p.stat().st_mtime, reverse=True)


def parse_session_messages(session_file: Path) -> List[Dict]:
    """Parse all messages from a session file, preserving order."""
    messages: List[Dict] = []

    # oh-my-pi uses JSONL format (one JSON object per line)
    with open(session_file, "r") as f:
        for line_num, line in enumerate(f):
            try:
                data = json.loads(line)
                if isinstance(data, dict):
                    data["_line_num"] = line_num
                    messages.append(data)
            except json.JSONDecodeError:
                # Ignore malformed lines to be resilient to partial writes
                pass

    return messages


def find_last_planning_update(messages: List[Dict]) -> Tuple[int, Optional[str]]:
    """
    Find the last time a planning file was written/edited.
    Returns (line_number, filename) or (-1, None) if not found.
    """
    last_update_line = -1
    last_update_file = None

    for msg in messages:
        msg_type = msg.get("type")

        # oh-my-pi uses 'message' type for all messages
        if msg_type == "message":
            msg_data = msg.get("message", {})
            content = msg_data.get("content", [])

            if isinstance(content, list):
                for item in content:
                    if item.get("type") == "tool_use":
                        tool_name = item.get("name", "")
                        tool_input = item.get("input", {})

                        # Check for Write/Edit tools
                        if tool_name in ("Write", "Edit"):
                            file_path = tool_input.get("file_path", "")
                            for pf in PLANNING_FILES:
                                if file_path.endswith(pf):
                                    last_update_line = msg["_line_num"]
                                    last_update_file = pf

        # Also check for tool_result type in oh-my-pi
        elif msg_type == "tool_result":
            tool_name = msg.get("toolName", "")
            if tool_name in ("Write", "Edit"):
                # Check original request for file path
                parent = msg.get("parentId")
                if parent:
                    # Find parent message
                    for m in messages:
                        if m.get("id") == parent:
                            content = m.get("message", {}).get("content", [])
                            if isinstance(content, list):
                                for item in content:
                                    if item.get("type") == "tool_use":
                                        file_path = item.get("input", {}).get(
                                            "file_path", ""
                                        )
                                        for pf in PLANNING_FILES:
                                            if file_path.endswith(pf):
                                                last_update_line = msg["_line_num"]
                                                last_update_file = pf

    return last_update_line, last_update_file


def extract_messages_after(messages: List[Dict], after_line: int) -> List[Dict]:
    """Extract conversation messages after a certain line number."""
    result = []

    for msg in messages:
        if msg.get("_line_num", -1) <= after_line:
            continue

        msg_type = msg.get("type")

        if msg_type == "message":
            msg_data = msg.get("message", {})
            role = msg_data.get("role", "")
            content = msg_data.get("content", [])

            if role == "user":
                text_content = ""
                if isinstance(content, list):
                    for item in content:
                        if item.get("type") == "text":
                            text_content = item.get("text", "")
                            break
                elif isinstance(content, str):
                    text_content = content

                if text_content and len(text_content) > 20:
                    result.append(
                        {
                            "role": "user",
                            "content": text_content,
                            "line": msg["_line_num"],
                        }
                    )

            elif role == "assistant":
                text_content = ""
                tool_uses = []

                if isinstance(content, list):
                    for item in content:
                        if item.get("type") == "text":
                            text_content = item.get("text", "")
                        elif item.get("type") == "tool_use":
                            tool_name = item.get("name", "")
                            tool_input = item.get("input", {})
                            if tool_name == "Edit":
                                tool_uses.append(
                                    f"Edit: {tool_input.get('file_path', 'unknown')}"
                                )
                            elif tool_name == "Write":
                                tool_uses.append(
                                    f"Write: {tool_input.get('file_path', 'unknown')}"
                                )
                            elif tool_name == "Bash":
                                cmd = tool_input.get("command", "")[:80]
                                tool_uses.append(f"Bash: {cmd}")
                            else:
                                tool_uses.append(f"{tool_name}")

                if text_content or tool_uses:
                    result.append(
                        {
                            "role": "assistant",
                            "content": text_content[:600] if text_content else "",
                            "tools": tool_uses,
                            "line": msg["_line_num"],
                        }
                    )

    return result


def main():
    project_path = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    project_dir = get_project_dir(project_path)

    # Check if planning files exist (indicates active task)
    has_planning_files = any(Path(project_path, f).exists() for f in PLANNING_FILES)
    if not has_planning_files:
        # No planning files in this project; skip catchup to avoid noise
        return

    if not project_dir.exists():
        # No previous sessions, nothing to catch up on
        print(f"[planning-with-files] No session directory found at {project_dir}")
        return

    sessions = get_sessions_sorted(project_dir)
    if len(sessions) < 1:
        print(f"[planning-with-files] No session files found in {project_dir}")
        return

    # Find a substantial previous session
    target_session = None
    for session in sessions:
        if session.stat().st_size > 5000:
            target_session = session
            break

    if not target_session:
        target_session = sessions[0]  # Use most recent even if small

    messages = parse_session_messages(target_session)
    last_update_line, last_update_file = find_last_planning_update(messages)

    # No planning updates in the target session; skip catchup output.
    if last_update_line < 0:
        print(
            "[planning-with-files] No planning file updates found in previous session"
        )
        return

    # Only output if there's unsynced content
    messages_after = extract_messages_after(messages, last_update_line)

    if not messages_after:
        print("[planning-with-files] No unsynced messages found")
        return

    # Output catchup report
    print("\n[planning-with-files] SESSION CATCHUP DETECTED")
    print(f"Previous session: {target_session.stem}")

    print(f"Last planning update: {last_update_file} at message #{last_update_line}")
    print(f"Unsynced messages: {len(messages_after)}")

    print("\n--- UNSYNCED CONTEXT ---")
    for msg in messages_after[-15:]:  # Last 15 messages
        if msg["role"] == "user":
            print(f"USER: {msg['content'][:300]}")
        else:
            if msg.get("content"):
                print(f"ASSISTANT: {msg['content'][:300]}")
            if msg.get("tools"):
                print(f"  Tools: {', '.join(msg['tools'][:4])}")

    print("\n--- RECOMMENDED ---")
    print("1. Run: git diff --stat")
    print("2. Read: task_plan.md, progress.md, findings.md")
    print("3. Update planning files based on above context")
    print("4. Continue with task")


if __name__ == "__main__":
    main()
