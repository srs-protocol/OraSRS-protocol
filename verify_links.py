import os
import re
import urllib.parse

def find_md_files(root_dir):
    md_files = []
    for dirpath, _, filenames in os.walk(root_dir):
        if 'node_modules' in dirpath or '.git' in dirpath:
            continue
        for f in filenames:
            if f.endswith('.md'):
                md_files.append(os.path.join(dirpath, f))
    return md_files

def extract_links(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    # Match [text](link)
    links = re.findall(r'\[.*?\]\((.*?)\)', content)
    return links

def verify_link(source_file, link):
    # Ignore external links
    if link.startswith('http') or link.startswith('https') or link.startswith('mailto:'):
        return True, "External"
    
    # Ignore anchors for now (or handle them simply by stripping)
    link_path = link.split('#')[0]
    if not link_path:
        return True, "Anchor only"

    # Decode URL encoding
    link_path = urllib.parse.unquote(link_path)

    source_dir = os.path.dirname(source_file)
    target_path = os.path.normpath(os.path.join(source_dir, link_path))

    if os.path.exists(target_path):
        return True, target_path
    else:
        return False, target_path

def main():
    root_dir = os.getcwd()
    md_files = find_md_files(root_dir)
    
    broken_links = []

    print(f"Scanning {len(md_files)} markdown files...")

    for f in md_files:
        links = extract_links(f)
        for link in links:
            valid, target = verify_link(f, link)
            if not valid:
                broken_links.append({
                    'file': f,
                    'link': link,
                    'target': target
                })

    if broken_links:
        print(f"\nFound {len(broken_links)} broken links:")
        for b in broken_links:
            # Make paths relative to root for readability
            rel_file = os.path.relpath(b['file'], root_dir)
            rel_target = os.path.relpath(b['target'], root_dir)
            print(f"File: {rel_file}")
            print(f"  Link: {b['link']}")
            print(f"  Target (Missing): {rel_target}")
            print("-" * 20)
    else:
        print("\nNo broken links found!")

if __name__ == "__main__":
    main()
