#!/usr/bin/env python3
"""
Fix import statements that were added in the wrong place
Move middleware imports to the top of the file
"""

from pathlib import Path
import re

ROUTES_DIR = Path(__file__).parent.parent / 'src' / 'routes'
SKIP_FILES = ['auth.py', 'livekit_routes.py', '__init__.py']

MIDDLEWARE_IMPORTS = [
    "from ..middleware.auth import require_auth, optional_auth, require_role",
    "from ..middleware.error_handler import handle_errors, validate_request_json, ValidationError"
]

def fix_imports(filepath):
    """Move middleware imports to the correct location"""
    
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    # Find and remove middleware imports from wrong location
    middleware_lines = []
    cleaned_lines = []
    
    for line in lines:
        if any(imp in line for imp in MIDDLEWARE_IMPORTS):
            if line.strip():  # Only keep non-empty middleware import lines
                middleware_lines.append(line)
        else:
            cleaned_lines.append(line)
    
    if not middleware_lines:
        return False  # No middleware imports found
    
    # Find the last regular import line
    last_import_idx = -1
    for i, line in enumerate(cleaned_lines):
        if (line.startswith('import ') or line.startswith('from ')) and 'middleware' not in line:
            last_import_idx = i
    
    if last_import_idx == -1:
        print(f"⚠ {filepath.name}: Could not find import section")
        return False
    
    # Insert middleware imports after last regular import
    result_lines = (
        cleaned_lines[:last_import_idx+1] +
        ['\n', '# Enhanced middleware for production\n'] +
        middleware_lines +
        ['\n'] +
        cleaned_lines[last_import_idx+1:]
    )
    
    # Write back
    with open(filepath, 'w') as f:
        f.writelines(result_lines)
    
    return True

def main():
    print("🔧 Fixing import locations...\n")
    
    fixed_count = 0
    
    for filepath in sorted(ROUTES_DIR.glob('*.py')):
        if filepath.name in SKIP_FILES or filepath.name.endswith('.backup'):
            continue
        
        try:
            if fix_imports(filepath):
                print(f"✅ Fixed {filepath.name}")
                fixed_count += 1
            else:
                print(f"⏭  Skipped {filepath.name}")
        except Exception as e:
            print(f"❌ Error fixing {filepath.name}: {e}")
    
    print(f"\n✅ Fixed {fixed_count} files")

if __name__ == '__main__':
    main()
