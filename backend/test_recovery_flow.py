import os
import sys
import time
import requests

BASE = 'http://127.0.0.1:8000/api'
resp = requests.post(f'{BASE}/auth/login', json={'username': 'admin', 'password': 'Admin@SaniForensic2026!'})
assert resp.status_code == 200, resp.text
token = resp.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# Create a test synthetic disk image with realistic forensic file signatures
img_path = r'E:\SANI-FORENSIC\data\temp\forensic_sample.raw'
os.makedirs(os.path.dirname(img_path), exist_ok=True)

# 1KB noise + JPEG SOI + JPEG body + JPEG EOI + 2KB noise + PNG + 1KB noise + PDF
noise1 = b'\xAA' * 1024
jpeg_payload = b'\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00\x60\x00\x60\x00\x00' + (b'FORENSIC_JPEG_PAYLOAD_EVIDENCE' * 10) + b'\xFF\xD9'
noise2 = b'\x55' * 2048
png_payload = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x10\x00\x00\x00\x10\x08\x06\x00\x00\x00\x1f\xf3\xff\xa4' + (b'PNG_DATA_STREAM' * 15) + b'\x00\x00\x00\x00IEND\xaeB`\x82'
noise3 = b'\x00' * 512
pdf_payload = b'%PDF-1.4\n%Forensic Case Sample Document\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF'

with open(img_path, 'wb') as f:
    f.write(noise1)
    f.write(jpeg_payload)
    f.write(noise2)
    f.write(png_payload)
    f.write(noise3)
    f.write(pdf_payload)

print(f"Created sample evidence raw image at {img_path} ({os.path.getsize(img_path)} bytes)")

# Start recovery job
start_resp = requests.post(f'{BASE}/recovery/start', json={
    'source_path': img_path,
    'source_type': 'IMAGE',
    'scan_method': 'SIGNATURE_CARVING',
    'target_categories': ['ALL']
}, headers=headers)
assert start_resp.status_code == 200, start_resp.text
job = start_resp.json()
job_id = job['id']
print(f"Started recovery job {job_id}, status: {job['status']}")

# Poll for completion
for _ in range(20):
    time.sleep(0.5)
    st_resp = requests.get(f'{BASE}/recovery/jobs/{job_id}', headers=headers)
    st = st_resp.json()
    if st['status'] in ['COMPLETED', 'FAILED']:
        print(f"Job {job_id} finished with status: {st['status']}, files found: {st['files_found']}")
        break

# Get results
res_resp = requests.get(f'{BASE}/recovery/jobs/{job_id}/results', headers=headers)
assert res_resp.status_code == 200, res_resp.text
files = res_resp.json()
print(f"Discovered {len(files)} carved artifacts:")
for f in files:
    print(f" - ID {f['id']}: {f['original_filename']} ({f['file_type']}) offset={hex(f['offset'])} size={f['size']} conf={f['confidence_level']} ({f['confidence_score']}%)")

# Preview files
for f in files:
    prev_resp = requests.get(f"{BASE}/recovery/file/{f['id']}/preview", headers=headers)
    assert prev_resp.status_code == 200, prev_resp.text
    p = prev_resp.json()
    print(f"Preview for {p['filename']}: type={p['preview_type']}, size={p['size']}, preview length={len(p['content'])}")

# Test Export
export_dir = r'E:\SANI-FORENSIC\data\temp\export_test'
export_resp = requests.post(f'{BASE}/recovery/export', json={
    'file_ids': [f['id'] for f in files],
    'destination_folder': export_dir
}, headers=headers)
assert export_resp.status_code == 200, export_resp.text
exp_data = export_resp.json()
print(f"Exported {exp_data['total_exported']} files to {export_dir}")
print(f"Manifest JSON created at {exp_data['manifest_json']}")
print("Recovery backend test PASSED completely!")
