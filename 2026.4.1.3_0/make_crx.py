import os, zipfile, struct, subprocess, hashlib

dir_path = os.getcwd()
key_path = os.path.join(dir_path, 'autolingo.pem')
pubkey_path = os.path.join(dir_path, 'autolingo.pub.der')
zip_path = os.path.join(dir_path, 'autolingo.zip')
crx_path = os.path.join(dir_path, 'autolingo.crx')

# Generate PEM key if missing
if not os.path.exists(key_path):
    subprocess.run(['openssl', 'genrsa', '-out', key_path, '2048'], check=True)

# Generate public key DER
subprocess.run(['openssl', 'rsa', '-in', key_path, '-pubout', '-outform', 'DER', '-out', pubkey_path], check=True)

# Create zip excluding the output files
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(dir_path):
        # skip hidden and output files
        if root.startswith(dir_path + os.sep + '.'): 
            continue
        for name in files:
            if name in ('make_crx.py', 'autolingo.pem', 'autolingo.pub.der', 'autolingo.zip', 'autolingo.crx'):
                continue
            if name.endswith('.py') and root == dir_path:
                continue
            fullpath = os.path.join(root, name)
            arcname = os.path.relpath(fullpath, dir_path)
            zf.write(fullpath, arcname)

# Sign zip data
with open(zip_path, 'rb') as f:
    zip_data = f.read()

sig_path = os.path.join(dir_path, 'autolingo.sig')
with open(sig_path, 'wb') as sigfile:
    proc = subprocess.Popen(['openssl', 'dgst', '-sha1', '-sign', key_path], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    signature, err = proc.communicate(zip_data)
    if proc.returncode != 0:
        raise SystemExit('OpenSSL signing failed')
    sigfile.write(signature)

with open(pubkey_path, 'rb') as f:
    pubkey = f.read()
with open(sig_path, 'rb') as f:
    signature = f.read()

header = b'Cr24' + struct.pack('<I', 2) + struct.pack('<I', len(pubkey)) + struct.pack('<I', len(signature))
with open(crx_path, 'wb') as f:
    f.write(header)
    f.write(pubkey)
    f.write(signature)
    f.write(zip_data)

print('Created', crx_path)
