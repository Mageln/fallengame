#!/usr/bin/env node
/**
 * TCP multiplexer for the sandbox ingress.
 *
 * E2B exempts the envd port (49983) from the e2b-traffic-access-token check.
 * tools/vscode/ingress.sh REDIRECTs external connections on 49983 here (49984).
 *
 * Default is ALWAYS envd, so the platform control plane is never disturbed.
 * Only a plain browser HTTP request addressed to the public *.e2b.app host is
 * sent to code-server (8080). gRPC/HTTP2/anything unrecognised goes to envd.
 */
const net = require('net');

const LISTEN_PORT = 49984;
const VSCODE_PORT = 8080;
const ENVD_PORT = 49983;
const MAX_HEAD = 8192;

function decide(buf) {
  const end = buf.indexOf('\r\n\r\n');
  const head = buf.subarray(0, end === -1 ? buf.length : end).toString('latin1');
  const low = head.toLowerCase();

  // Control-plane / envd API traffic. These must never reach code-server.
  if (/x-access-token:|e2b-sandbox-id:|e2b-sandbox-port:|content-type:\s*application\/grpc|grpc-|^pri \* http\/2/.test(low)) {
    return ENVD_PORT;
  }
  // A browser navigation to the public preview host.
  if (end !== -1 && /^host:\s*[^\s]*\.e2b\.app/im.test(head) && /^user-agent:\s*mozill/im.test(head)) {
    return VSCODE_PORT;
  }
  return ENVD_PORT;
}

net.createServer((sock) => {
  sock.setNoDelay(true);
  let buf = Buffer.alloc(0);
  let done = false;
  let upstream = null;

  const guard = setTimeout(() => finish(decide(buf)), 400);
  guard.unref();

  function finish(target) {
    if (done) return;
    done = true;
    clearTimeout(guard);
    upstream = net.connect(target, '127.0.0.1');
    upstream.setNoDelay(true);
    upstream.on('connect', () => upstream.write(buf));
    upstream.on('error', () => sock.destroy());
    upstream.on('close', () => sock.destroy());
    upstream.pipe(sock);
    sock.pipe(upstream);
    sock.removeAllListeners('data');
    console.log(`${new Date().toISOString()} ${sock.remoteAddress} -> ${target}`);
  }

  sock.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    if (done) return;
    if (buf.indexOf('\r\n\r\n') !== -1 || buf.length >= MAX_HEAD) finish(decide(buf));
  });
  sock.on('error', () => {});
  sock.on('close', () => { clearTimeout(guard); if (upstream) upstream.destroy(); });
}).listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log(`vscode multiplexer listening on ${LISTEN_PORT}`);
});
