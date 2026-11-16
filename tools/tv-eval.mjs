// Runs a JS expression in the TV's WebView (debuggable APK, `adb forward tcp:9229 localabstract:webview_devtools_remote_<pid>`)
// and prints the result. Usage: node tools/tv-eval.mjs "<expression>"   (top-level await allowed)
const list = await (await fetch('http://localhost:9229/json')).json();
const ws = new WebSocket(list.find((p) => p.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id !== 1) return;
  const r = m.result?.result;
  console.log(m.result?.exceptionDetails ? 'ERROR ' + JSON.stringify(m.result.exceptionDetails.exception?.description || m.result.exceptionDetails) : JSON.stringify(r?.value ?? r?.description, null, 1));
  ws.close();
});
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: process.argv[2], awaitPromise: true, returnByValue: true, replMode: true } }));
