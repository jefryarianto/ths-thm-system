import base64

content = base64.b64decode(open("apps/web/e2e/_test.b64").read().strip()).decode("utf-8")
open("apps/web/e2e/kepengurusan.spec.ts", "w", newline="
").write(content)
print(f"Written {len(content)} bytes")