import urllib.parse
import requests
import json
import time
import csv
import os
import re

def get_active_character_banners(server_id, lang):
    """Detects currently active character banners from the API."""
    dummy_url = f"https://ef-webview.gryphline.com/api/record/char?lang={lang}&token=A&server_id={server_id}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    try:
        response = requests.get(dummy_url, headers=headers)
        data = response.json()
        
        msg = data.get('message', '')
        if isinstance(msg, list):
            msg = str(msg[-1])
        else:
            msg = str(msg)
            
        if 'values:' in msg:
            pools_str = msg.split('values:')[1].strip()
            return [p.strip() for p in pools_str.split(',')]
    except Exception:
        pass
    
    return []

def auto_find_url():
    """Locates and extracts the gacha URL from local game cache."""
    local_app_data = os.environ.get('LOCALAPPDATA')
    file_path = None
    
    # 1. Start with the default LocalAppData path
    if local_app_data:
        file_path = os.path.join(local_app_data, 'PlatformProcess', 'Cache', 'data_1')
        if not os.path.exists(file_path):
            file_path = None

    # 2. Loop until a valid/unlocked file is found or the user skips
    while True:
        if not file_path:
            print("\n[!] Cache file 'data_1' not found or inaccessible.")
            print("    (Note: If the game is open, it may be locked. Try closing it or copying 'data_1' to your Desktop.)")
            user_folder = input("[?] Enter the folder path where 'data_1' is located (or Enter to skip/manual): ").strip()
            
            if not user_folder:
                return None
                
            user_folder = user_folder.replace('"', '').replace("'", "")
            # Handle both folder path or direct file path input
            if user_folder.endswith('data_1'):
                file_path = user_folder
            else:
                file_path = os.path.join(user_folder, 'data_1')

        if not os.path.exists(file_path):
            print(f"[!] File does not exist at: {file_path}")
            file_path = None 
            continue

        print(f"[*] Attempting to read: {file_path}")
        
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
                
            # Updated regex to match any language parameter
            pattern = rb"https://ef-webview\.gryphline\.com/api/record/char\?[^\x00\s\"']+"
            matches = re.findall(pattern, content)
            
            if matches:
                last_url = matches[-1].decode('utf-8', errors='ignore')
                print("[+] Successfully extracted URL from cache!")
                return last_url
            else:
                print("[!] No valid gacha URL found in that file.")
                file_path = None # Trigger prompt
                continue
                
        except PermissionError:
            print(f"[!] Access Denied: The file 'data_1' is currently being used by the game.")
            print("    Please close the game or enter a path to a duplicate/copy of the file.")
            file_path = None 
        except Exception as e:
            print(f"[!] Error reading file: {e}")
            file_path = None

def get_gacha_records(url):
    """Fetches records from the API and exports to JSON and CSV."""
    parsed_url = urllib.parse.urlparse(url)
    params = urllib.parse.parse_qs(parsed_url.query)
    
    token = next((v[0] for k, v in params.items() if 'token' in k.lower()), None)
    server_id = next((v[0] for k, v in params.items() if k.lower() in ['server', 'server_id']), None)
    lang = next((v[0] for k, v in params.items() if 'lang' in k.lower()), 'en-us')
            
    if server_id and server_id.endswith('?'):
        server_id = server_id[:-1]
        
    if not token or not server_id:
        print("[!] Could not find a token or server ID in the provided URL.")
        return

    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    all_data = {'weapons': [], 'characters': []}

    print("\n[*] Detecting active character banners...")
    char_pools = get_active_character_banners(server_id, lang)
    
    if not char_pools:
        print("[!] Could not auto-detect banners. The API might have changed.")
        return
        
    print(f"  -> Found banners: {', '.join(char_pools)}")

    endpoints = {
        'weapons': ('https://ef-webview.gryphline.com/api/record/weapon', ['weap123']),
        'characters': ('https://ef-webview.gryphline.com/api/record/char', char_pools) 
    }

    for record_type, (api_url, pools) in endpoints.items():
        print(f"\n[*] Fetching {record_type} records...")
        for pool in pools:
            seq_id, has_more = 0, True
            while has_more:
                req_params = {'lang': lang, 'token': token, 'server_id': server_id}
                if pool != 'weap123': req_params['pool_type'] = pool
                if seq_id != 0: req_params['seq_id'] = seq_id

                response = requests.get(api_url, params=req_params, headers=headers)
                if response.status_code != 200: break
                data = response.json()
                if data.get('code') != 0:
                    print(f"[!] API Error: URL has likely expired. Please open gacha history in-game.")
                    break
                    
                pull_list = data['data']['list']
                all_data[record_type].extend(pull_list)
                has_more = data['data']['hasMore']
                if has_more and pull_list:
                    seq_id = pull_list[-1]['seqId']
                time.sleep(0.3) 

    json_filename = 'endfield_pulls.json'
    with open(json_filename, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=4, ensure_ascii=False)
    print(f"\n[+] Success! Saved JSON backup to {json_filename}")
        
    for record_type in ['weapons', 'characters']:
        pulls = all_data[record_type]
        if not pulls: continue
        csv_filename = f"endfield_{record_type}.csv"
        with open(csv_filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=list(pulls[0].keys()))
            writer.writeheader()
            writer.writerows(pulls)
        print(f"  -> Saved {csv_filename}")

if __name__ == "__main__":
    print("=== Endfield Auto-Exporter ===")
    TARGET_URL = auto_find_url()
    
    if not TARGET_URL:
        print("\n[i] Auto-detection failed or skipped. Falling back to manual entry.")
        TARGET_URL = input("Please paste your full Gryphline webview URL here:\n> ")
        
    if TARGET_URL and TARGET_URL.strip():
        get_gacha_records(TARGET_URL.strip())
    
    input("\nPress Enter to close the window...")