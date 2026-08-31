import base64,sys
d=base64.b64decode(sys.stdin.buffer.read().strip()).decode()
open(sys.argv[1],"w",newline="
").write(d)
print(f"Written {len(d)} bytes")
