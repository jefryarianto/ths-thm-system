import subprocess, os, sys

html = sys.argv[1] if len(sys.argv) > 1 else 'mockup-map-fallback.html'
out = sys.argv[2] if len(sys.argv) > 2 else html.replace('.html', '.png')

edge = None
for p in [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
          r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
          r"C:\Program Files\Google\Chrome\Application\chrome.exe"]:
    if os.path.exists(p):
        edge = p
        break
if not edge:
    print('NO_BROWSER')
    sys.exit(1)

base = os.path.dirname(os.path.abspath(__file__))
url = 'file:///' + os.path.join(base, html).replace('\\', '/')
out_abs = os.path.abspath(out)
r = subprocess.run([edge, '--headless', '--disable-gpu', '--screenshot=' + out_abs,
                    '--window-size=1900,900', url],
                   capture_output=True, timeout=60)
print('rc', r.returncode, 'ok' if os.path.exists(out_abs) else 'FAIL', out_abs)
