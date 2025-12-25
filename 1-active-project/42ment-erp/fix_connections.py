"""
Script to fix connection leaks in all model files
Adds finally blocks to ensure connections are always closed
"""
import re
from pathlib import Path

def fix_connection_leak(file_path):
    """Fix connection leaks in a model file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern 1: Functions with conn.close() before return
    # Replace: conn.close() + return statement
    # With: return statement (move close to finally)

    # Pattern to match function definitions and their bodies
    functions = re.finditer(
        r'(def \w+\([^)]*\):.*?)(    try:\s+conn = get_connection\(\).*?)(    except Exception as e:.*?)(        \})',
        content,
        re.DOTALL
    )

    # Simpler approach: Add conn = None at start and finally block at end
    # For each function that has "conn = get_connection()"

    lines = content.split('\n')
    new_lines = []
    i = 0

    while i < len(lines):
        line = lines[i]
        new_lines.append(line)

        # Check if this is a try block with get_connection
        if '    try:' in line and i + 1 < len(lines) and 'conn = get_connection()' in lines[i + 1]:
            # Insert conn = None before try
            new_lines.insert(-1, '    conn = None')

            # Find the matching except block
            indent_level = len(line) - len(line.lstrip())
            j = i + 1
            in_try = True
            except_found = False

            while j < len(lines):
                current_line = lines[j]
                current_indent = len(current_line) - len(current_line.lstrip())

                # Look for except at same indent level
                if current_indent == indent_level and 'except Exception as e:' in current_line:
                    except_found = True

                # Find the end of except block (next line with same or less indent that's not empty)
                if except_found and j > i + 1:
                    if current_indent <= indent_level and current_line.strip() and not current_line.strip().startswith('#'):
                        # Check if finally already exists
                        if 'finally:' not in current_line:
                            # Add finally block before this line
                            new_lines.insert(len(new_lines), ' ' * indent_level + 'finally:')
                            new_lines.insert(len(new_lines), ' ' * indent_level + '    if conn:')
                            new_lines.insert(len(new_lines), ' ' * indent_level + '        conn.close()')
                            new_lines.insert(len(new_lines), '')
                        break

                j += 1

        # Remove conn.close() calls inside try/except blocks
        if 'conn.close()' in line and '    ' in line:
            # Skip this line
            new_lines.pop()

        i += 1

    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines))

    print(f"Fixed: {file_path}")


# This approach is too complex. Let's use a simpler manual template.
print("Manual fix required. Use the following pattern for each function:")
print("""
conn = None
try:
    conn = get_connection()
    cursor = conn.cursor()
    # ... operations ...
    conn.commit()  # for write operations
    # ... more operations ...
    return {'success': True, ...}
except Exception as e:
    if conn:
        conn.rollback()  # for write operations
    log_error(...)
    return {'success': False, ...}
finally:
    if conn:
        conn.close()
""")
