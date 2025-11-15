#!/usr/bin/env python3
"""
Batch update all route files with new middleware
This script automatically adds error handling and authentication to all routes
"""

import os
import re
from pathlib import Path

ROUTES_DIR = Path(__file__).parent.parent / 'src' / 'routes'

# Routes that have already been updated
UPDATED_ROUTES = ['auth.py', 'livekit_routes.py', 'matching.py']

# Import statements to add
NEW_IMPORTS = """
from ..middleware.auth import require_auth, optional_auth, require_role
from ..middleware.error_handler import handle_errors, validate_request_json, ValidationError
"""

def update_route_file(filepath):
    """Update a single route file with new middleware"""
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Skip if already updated
    if 'from ..middleware.auth import' in content:
        print(f"✓ {filepath.name} already updated")
        return False
    
    # Add new imports after existing imports
    import_section_end = content.rfind('import ')
    if import_section_end != -1:
        # Find the end of that import line
        next_newline = content.find('\n', import_section_end)
        if next_newline != -1:
            content = content[:next_newline+1] + NEW_IMPORTS + content[next_newline+1:]
    
    # Replace @jwt_required() with @require_auth
    content = re.sub(r'@jwt_required\(\)', '@require_auth', content)
    
    # Replace get_jwt_identity() with g.user_id
    content = re.sub(r'get_jwt_identity\(\)', 'g.user_id', content)
    
    # Add @handle_errors to route functions
    # Find all route decorators and add @handle_errors if not present
    def add_handle_errors(match):
        route_decorator = match.group(0)
        func_def = match.group(1)
        
        # Check if @handle_errors is already there
        if '@handle_errors' in route_decorator:
            return match.group(0)
        
        # Add @handle_errors before the function definition
        return route_decorator + '@handle_errors\n' + func_def
    
    # Pattern to match route decorators followed by function definition
    pattern = r"(@[a-z_]+\.route\([^)]+\)[^\n]*\n(?:@[^\n]+\n)*)(def [a-z_]+\([^)]*\):)"
    content = re.sub(pattern, add_handle_errors, content, flags=re.MULTILINE)
    
    # Add flask.g import if using g.user_id
    if 'g.user_id' in content and 'from flask import' in content:
        content = re.sub(
            r'from flask import ([^\n]+)',
            lambda m: f"from flask import {m.group(1)}, g" if ', g' not in m.group(1) else m.group(0),
            content,
            count=1
        )
    
    # Write back
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"✓ Updated {filepath.name}")
    return True

def main():
    """Update all route files"""
    
    print("🚀 Starting batch route update...")
    print(f"📁 Routes directory: {ROUTES_DIR}")
    print()
    
    updated_count = 0
    skipped_count = 0
    
    for filepath in ROUTES_DIR.glob('*.py'):
        if filepath.name.startswith('__'):
            continue
        
        if filepath.name in UPDATED_ROUTES:
            print(f"⏭  Skipping {filepath.name} (already manually updated)")
            skipped_count += 1
            continue
        
        try:
            if update_route_file(filepath):
                updated_count += 1
            else:
                skipped_count += 1
        except Exception as e:
            print(f"❌ Error updating {filepath.name}: {e}")
    
    print()
    print(f"✅ Batch update complete!")
    print(f"   Updated: {updated_count} files")
    print(f"   Skipped: {skipped_count} files")

if __name__ == '__main__':
    main()
