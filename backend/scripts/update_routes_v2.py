#!/usr/bin/env python3
"""
Batch update all route files with new middleware - Version 2
Improved to handle imports correctly
"""

import os
import re
from pathlib import Path

ROUTES_DIR = Path(__file__).parent.parent / 'src' / 'routes'
UPDATED_ROUTES = ['auth.py', 'livekit_routes.py']

def update_route_file(filepath):
    """Update a single route file with new middleware"""
    
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    # Check if already updated
    content = ''.join(lines)
    if 'from ..middleware.auth import' in content or 'from src.middleware.auth import' in content:
        print(f"✓ {filepath.name} already has middleware imports")
        return False
    
    # Find the last import line
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.startswith('import ') or line.startswith('from '):
            last_import_idx = i
    
    if last_import_idx == -1:
        print(f"⚠ {filepath.name} has no imports, skipping")
        return False
    
    # Insert new imports after last import
    new_imports = [
        "\n",
        "# Enhanced middleware for production\n",
        "from src.middleware.auth import require_auth, optional_auth, require_role\n",
        "from src.middleware.error_handler import handle_errors, validate_request_json, ValidationError\n",
        "\n"
    ]
    
    lines = lines[:last_import_idx+1] + new_imports + lines[last_import_idx+1:]
    
    # Convert to string for regex operations
    content = ''.join(lines)
    
    # Replace @jwt_required() with @require_auth
    content = re.sub(r'@jwt_required\(\)', '@require_auth', content)
    content = re.sub(r'from flask_jwt_extended import jwt_required.*\n', '', content)
    
    # Replace get_jwt_identity() with g.user_id
    content = re.sub(r'get_jwt_identity\(\)', 'g.user_id', content)
    content = re.sub(r'from flask_jwt_extended import.*get_jwt_identity.*\n', '', content)
    
    # Add g to flask imports if needed
    if 'g.user_id' in content:
        content = re.sub(
            r'from flask import ([^g\n][^\n]*)',
            lambda m: f"from flask import {m.group(1)}, g" if 'g' not in m.group(1) else m.group(0),
            content,
            count=1
        )
    
    # Add @handle_errors decorator to all route functions
    # Pattern: @blueprint.route(...) followed by optional decorators, then def
    pattern = r'(@[a-z_]+_bp\.route\([^\)]+\))\n((?:@[^\n]+\n)*)(def [a-z_]+\([^\)]*\):)'
    
    def add_decorators(match):
        route_dec = match.group(1)
        other_decs = match.group(2)
        func_def = match.group(3)
        
        # Skip if @handle_errors already present
        if '@handle_errors' in other_decs:
            return match.group(0)
        
        # Add @handle_errors after @require_auth if present, otherwise first
        if '@require_auth' in other_decs:
            return f"{route_dec}\n{other_decs}@handle_errors\n{func_def}"
        else:
            return f"{route_dec}\n@handle_errors\n{other_decs}{func_def}"
    
    content = re.sub(pattern, add_decorators, content)
    
    # Write back
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"✅ Updated {filepath.name}")
    return True

def main():
    """Update all route files"""
    
    print("🚀 Starting batch route update (v2)...")
    print(f"📁 Routes directory: {ROUTES_DIR}\n")
    
    updated_count = 0
    skipped_count = 0
    
    for filepath in sorted(ROUTES_DIR.glob('*.py')):
        if filepath.name.startswith('__') or filepath.name.endswith('.backup'):
            continue
        
        if filepath.name in UPDATED_ROUTES:
            print(f"⏭  Skipping {filepath.name} (manually updated)")
            skipped_count += 1
            continue
        
        try:
            if update_route_file(filepath):
                updated_count += 1
            else:
                skipped_count += 1
        except Exception as e:
            print(f"❌ Error updating {filepath.name}: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"\n✅ Batch update complete!")
    print(f"   Updated: {updated_count} files")
    print(f"   Skipped: {skipped_count} files")

if __name__ == '__main__':
    main()
