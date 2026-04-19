/* =================================================
   IRA — app.js  | COMPLETE STANDALONE VERSION
   All 25 sample incidents are hardcoded here.
   This file works 100% without any backend.
   ================================================= */

/* ---------- helpers used everywhere ---------- */
let searchQuery = '';

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return d + 'd ago';
  if (h > 0) return h + 'h ago';
  if (m > 0) return m + 'm ago';
  return 'Just now';
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function severityBadge(s) {
  const map = { critical:'🔴 Critical', high:'🟠 High', medium:'🟡 Medium', low:'🟢 Low' };
  return `<span class="badge badge-${s}">${map[s] || s}</span>`;
}

function statusBadge(s) {
  const map = { 'open':'Open', 'in-progress':'In Progress', 'resolved':'Resolved' };
  return `<span class="badge badge-${s}">${map[s] || s}</span>`;
}

/* ---------- 25 SAMPLE INCIDENTS ---------- */
var SAMPLE_DATA = [
  {
    id:'INC-001', title:'Production database connection pool exhausted',
    severity:'critical', status:'open', category:'database', assignee:'Kiranmai',
    createdAt: Date.now() - 1800000, aiAnalyzed:true,
    description:'prod-db-01 connection pool hit max limit of 500 connections. API error rate spiked to 67%. Affecting checkout, user-auth, and order-service. PgBouncer logs show queue depth > 800.',
    aiResponse:'🔍 Root Cause: Connection pool exhaustion after v2.4.1 deploy.\n\n🛠 Fix Steps:\n1. Run: SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE wait_event_type=\'Lock\';\n2. Increase pool_size from 500 to 800 in pgbouncer.ini\n3. Rollback: kubectl rollout undo deployment/order-service\n4. Set statement_timeout=30000 in PostgreSQL\n5. Monitor: watch pg_stat_activity\n\n⚡ CRITICAL — Escalate immediately.'
  },
  {
    id:'INC-002', title:'Payment microservice memory leak — OOMKilled 5 times',
    severity:'critical', status:'in-progress', category:'application', assignee:'Manasa',
    createdAt: Date.now() - 3600000, aiAnalyzed:true,
    description:'payment-service pod restarted 5 times due to OOMKilled. Heap growing from 256MB to 2GB in 20 minutes. Stripe webhook handlers suspected.',
    aiResponse:'🔍 Root Cause: EventEmitter memory leak in Stripe webhook handler.\n\n🛠 Fix Steps:\n1. Take heap snapshot via node --inspect\n2. Apply fix: add listener.removeAllListeners() in cleanup\n3. Set Kubernetes limit: memory: 512Mi\n4. Deploy: kubectl apply -f payment-fix.yaml\n5. Monitor: kubectl top pods -n production\n\n🔁 Auto-restart every 30min until fix deployed.'
  },
  {
    id:'INC-003', title:'SSL certificate expiring in 48 hours — api.devnovate.io',
    severity:'high', status:'open', category:'security', assignee:'Sadvila',
    createdAt: Date.now() - 5400000, aiAnalyzed:true,
    description:'TLS certificate for api.devnovate.io expires Sunday. Auto-renewal via Certbot failed with ACME challenge error.',
    aiResponse:'🔒 Root Cause: Nginx missing /.well-known/acme-challenge/ location block.\n\n🛠 Fix Steps:\n1. Add to nginx.conf: location /.well-known/acme-challenge/ { root /var/www/html; }\n2. sudo nginx -t && sudo systemctl reload nginx\n3. Retry: sudo certbot renew\n4. Set monitoring alert for cert expiry < 7 days\n\n⚠️ Deadline: 48 hours.'
  },
  {
    id:'INC-004', title:'API Gateway 504 timeout — 34% of all requests failing',
    severity:'critical', status:'open', category:'network', assignee:'Harini',
    createdAt: Date.now() - 1320000, aiAnalyzed:true,
    description:'Kong API Gateway timing out on user-service and inventory-service. 504 error rate at 34%. Started 22 minutes ago.',
    aiResponse:'🌐 Root Cause: Kong proxy_read_timeout too low (60s). inventory-service query now takes 90-120s.\n\n🛠 Fix Steps:\n1. Patch: kubectl patch configmap kong-config --patch \'{"data":{"proxy_read_timeout":"120000"}}\'\n2. Restart Kong: kubectl rollout restart deployment/kong\n3. Long-term: add index on product_id + warehouse_id\n4. Add circuit breaker with 30s timeout\n\n📊 Revenue loss: ~12,000/min.'
  },
  {
    id:'INC-005', title:'Disk usage 91% on log server — logs-prod-01',
    severity:'high', status:'in-progress', category:'infrastructure', assignee:'Kiranmai',
    createdAt: Date.now() - 7200000, aiAnalyzed:true,
    description:'logs-prod-01 disk at 91% (182GB/200GB used). Logrotate not running for 6 days. At current rate, disk full in 4 hours.',
    aiResponse:'🏗 Root Cause: Logrotate cron job accidentally disabled during maintenance.\n\n🛠 Fix Steps:\n1. Free space: find /var/log -name "*.log" -mtime +7 -delete\n2. Archive: tar -czf /mnt/archive/logs.tar.gz /var/log/app/*.log.*\n3. Re-enable: crontab -e → add: 0 2 * * * /usr/sbin/logrotate\n4. Set disk alert at 75%\n\n✅ Expected freed: ~95GB.'
  },
  {
    id:'INC-006', title:'Brute force attack — 2,400 failed logins from 12 IPs',
    severity:'critical', status:'open', category:'security', assignee:'Manasa',
    createdAt: Date.now() - 900000, aiAnalyzed:true,
    description:'2,400 failed auth attempts in 15 minutes from known malicious IP ranges. Targeting admin accounts. No successful logins yet.',
    aiResponse:'🔒 Threat: Credential-stuffing from known Tor exit nodes.\n\n🛠 Immediate Response:\n1. Block IPs: ufw deny from 185.234.0.0/16\n2. Rate limit /api/auth: max 5 req/min/IP\n3. Force MFA on all admin accounts NOW\n4. Lock accounts: UPDATE users SET locked=true WHERE failed_attempts>10\n5. Enable WAF rule\n\n🚨 CRITICAL — Act immediately.'
  },
  {
    id:'INC-007', title:'Redis cache hit rate dropped from 94% to 8%',
    severity:'high', status:'open', category:'database', assignee:'Sadvila',
    createdAt: Date.now() - 10800000, aiAnalyzed:true,
    description:'Redis cache hit rate collapsed after 11:30 AM deploy. DB load increased 12x. User-facing latency: 4200ms avg.',
    aiResponse:'🔍 Root Cause: v3.1.0 deploy changed cache key format — all existing keys orphaned.\n\n🛠 Fix Steps:\n1. Increase Redis maxmemory: redis-cli CONFIG SET maxmemory 4gb\n2. Run cache key migration script\n3. Monitor: redis-cli INFO stats | grep keyspace_hits\n4. Add cache key versioning going forward\n\n⏱ Warm-up ETA: 25 minutes.'
  },
  {
    id:'INC-008', title:'Kubernetes node NotReady — worker-node-04 unresponsive',
    severity:'high', status:'in-progress', category:'infrastructure', assignee:'Harini',
    createdAt: Date.now() - 14400000, aiAnalyzed:true,
    description:'worker-node-04 NotReady for 18 minutes. 23 pods evicted. Kernel OOM killer active. Affects staging and prod pods.',
    aiResponse:'🏗 Root Cause: Data-processing job with no memory limits consumed all 32GB RAM.\n\n🛠 Fix Steps:\n1. Drain: kubectl drain worker-node-04 --ignore-daemonsets\n2. Kill process: ssh worker-node-04 "kill -9 $(ps aux --sort=-%mem | awk \'NR==2{print $2}\')"\n3. Restart kubelet: systemctl restart kubelet\n4. Add memory limit: resources.limits.memory: 4Gi\n5. Uncordon: kubectl uncordon worker-node-04\n\n✅ ETA: 12 minutes.'
  },
  {
    id:'INC-009', title:'CDN latency spike — APAC region 3.2s response time',
    severity:'medium', status:'open', category:'network', assignee:'Kiranmai',
    createdAt: Date.now() - 18000000, aiAnalyzed:false,
    description:'Users in India, Singapore, Japan experiencing 3.2s avg response vs 280ms baseline. CloudFront APAC edge nodes overloaded.'
  },
  {
    id:'INC-010', title:'Nightly backup produced empty 0-byte archive',
    severity:'medium', status:'resolved', category:'infrastructure', assignee:'Manasa',
    createdAt: Date.now() - 86400000, aiAnalyzed:true,
    description:'Backup completed with exit code 0 but 0-byte archive. /tmp partition was full — gzip failed silently.',
    aiResponse:'✅ RESOLVED\n\nFix: Changed script to write to /mnt/backup instead of /tmp. Added TMPDIR=/mnt/backup/tmp.\n\nPrevention:\n• /tmp usage alert at 80%\n• Manual backup verified: 42GB uploaded to S3\n• Added MD5 checksum verification step'
  },
  {
    id:'INC-011', title:'Elasticsearch cluster YELLOW — 3 unassigned shards',
    severity:'medium', status:'in-progress', category:'database', assignee:'Sadvila',
    createdAt: Date.now() - 21600000, aiAnalyzed:true,
    description:'ES cluster health YELLOW. 3 replica shards unassigned due to disk watermark breach on logs-es-03 (88% full).',
    aiResponse:'🔍 Root Cause: Disk watermark (85%) breached on logs-es-03.\n\n🛠 Fix Steps:\n1. Delete old indices: curator delete indices --unit days --unit-count 30\n2. Update watermark: PUT /_cluster/settings {"transient":{"cluster.routing.allocation.disk.watermark.high":"92%"}}\n3. Reroute: POST /_cluster/reroute?retry_failed=true\n4. Add logs-es-04 node'
  },
  {
    id:'INC-012', title:'GitHub Actions CI/CD broken — all 47 PRs blocked',
    severity:'high', status:'resolved', category:'application', assignee:'Harini',
    createdAt: Date.now() - 172800000, aiAnalyzed:true,
    description:'All pipelines failing at docker build with "no space left on device". Docker layer cache accumulated on runner.',
    aiResponse:'✅ RESOLVED\n\nFix: Added docker system prune -af before build step. Disk freed 98% → 12%.\n\nPrevention:\n• Weekly scheduled cleanup workflow\n• Disk check as first step in all pipelines'
  },
  {
    id:'INC-013', title:'S3 upload failures — media service AccessDenied errors',
    severity:'high', status:'open', category:'application', assignee:'Kiranmai',
    createdAt: Date.now() - 2700000, aiAnalyzed:true,
    description:'media-upload-service failing with AccessDenied on S3. Started after IAM policy update at 16:45. Profile photos broken.',
    aiResponse:'🔒 Root Cause: IAM policy update removed s3:PutObject from media-service role.\n\n🛠 Fix:\n1. Add permission back: aws iam put-role-policy --role-name media-service-role --policy-name S3Access\n2. Verify: aws s3 cp test.txt s3://ira-prod-media/\n3. Audit CloudTrail for all IAM changes in last 24h\n4. Add IAM policy validation to CI/CD'
  },
  {
    id:'INC-014', title:'Kafka consumer lag — 2.4M messages behind on order-events',
    severity:'high', status:'in-progress', category:'application', assignee:'Manasa',
    createdAt: Date.now() - 9000000, aiAnalyzed:true,
    description:'order-processor consumer lag: 2,418,332 messages. Order emails delayed 4+ hours. Consumers crashing on malformed JSON.',
    aiResponse:'🔍 Root Cause: Malformed JSON from mobile-app v2.1.0 (missing "currency" field) crashing consumers.\n\n🛠 Fix:\n1. Skip bad message: kafka-consumer-groups.sh --reset-offsets --to-offset 8234113 --execute\n2. Add dead-letter queue\n3. Scale consumers: kubectl scale deployment/order-processor --replicas=8\n4. Fix mobile-app validation\n\n⏱ ETA to clear: 3.2 hours'
  },
  {
    id:'INC-015', title:'MySQL replica lag — read replica 4.2 minutes behind',
    severity:'medium', status:'open', category:'database', assignee:'Sadvila',
    createdAt: Date.now() - 27000000, aiAnalyzed:false,
    description:'mysql-replica-02 lag: 252 seconds and growing. Analytics queries stalling SQL thread. Reporting dashboard affected.'
  },
  {
    id:'INC-016', title:'Docker Hub rate limit — CI builds returning 429 errors',
    severity:'low', status:'resolved', category:'infrastructure', assignee:'Harini',
    createdAt: Date.now() - 259200000, aiAnalyzed:true,
    description:'CI pipeline failing with "toomanyrequests" from Docker Hub. Anonymous pull limit hit by 18 parallel runners.',
    aiResponse:'✅ RESOLVED\n\nFix: Authenticated runners with Docker Hub Pro (5000 pulls/6h). Migrated base images to GitHub Container Registry (ghcr.io) — no rate limits.'
  },
  {
    id:'INC-017', title:'JWT secret rotation logged out all 14,000 users',
    severity:'high', status:'resolved', category:'security', assignee:'Kiranmai',
    createdAt: Date.now() - 345600000, aiAnalyzed:true,
    description:'Emergency JWT rotation at 09:15 invalidated all sessions. 14,000 users logged out. Support tickets flooding.',
    aiResponse:'✅ RESOLVED\n\nFix: Dual-secret approach — SECRET_V2 for new tokens, SECRET_V1 accepted for 24h grace period. Added token blacklisting. All 14,000 users notified with re-login link.'
  },
  {
    id:'INC-018', title:'Grafana dashboards blank — Prometheus scrape target down',
    severity:'medium', status:'resolved', category:'infrastructure', assignee:'Manasa',
    createdAt: Date.now() - 432000000, aiAnalyzed:false,
    description:'All Grafana dashboards showing "No Data" since 07:30. Prometheus cannot reach node-exporter on 5 prod nodes. Firewall rule blocked port 9100.'
  },
  {
    id:'INC-019', title:'WebSocket connections dropping every 60 seconds',
    severity:'medium', status:'open', category:'network', assignee:'Sadvila',
    createdAt: Date.now() - 54000000, aiAnalyzed:true,
    description:'Real-time notifications broken. WebSocket connections closed after exactly 60s. Load balancer idle timeout too aggressive.',
    aiResponse:'🌐 Root Cause: AWS ALB idle timeout set to 60s — WebSocket connections killed by LB.\n\n🛠 Fix:\n1. Increase ALB timeout: aws elbv2 modify-load-balancer-attributes --attributes Key=idle_timeout.timeout_seconds,Value=3600\n2. Add WebSocket ping/pong every 30s on client\n3. Enable sticky sessions on ALB'
  },
  {
    id:'INC-020', title:'Terraform state lock stuck — infra changes blocked',
    severity:'low', status:'resolved', category:'infrastructure', assignee:'Harini',
    createdAt: Date.now() - 518400000, aiAnalyzed:false,
    description:'Terraform state locked in DynamoDB for 3+ hours after failed apply. All infra changes blocked across 4 teams.'
  },
  {
    id:'INC-021', title:'NPM lodash vulnerability — CVE-2021-23337 HIGH severity',
    severity:'medium', status:'open', category:'security', assignee:'Kiranmai',
    createdAt: Date.now() - 61200000, aiAnalyzed:true,
    description:'npm audit reports CVE-2021-23337 in lodash@4.17.20. CVSS 7.2 HIGH. Prototype pollution in 3 microservices.',
    aiResponse:'🔒 Vulnerability: Prototype pollution in lodash.template().\n\n🛠 Fix:\n1. Upgrade: npm update lodash@4.17.21 in all 3 services\n2. Run: npm audit fix --force\n3. Scan code: grep -r "_.template(" src/\n4. Add npm audit to CI pipeline\n5. Schedule weekly: npm audit --audit-level=high'
  },
  {
    id:'INC-022', title:'Celery queue backed up — 18,000 pending email tasks',
    severity:'high', status:'in-progress', category:'application', assignee:'Manasa',
    createdAt: Date.now() - 16200000, aiAnalyzed:true,
    description:'Celery worker crash caused email queue to back up. OTP, password reset, order confirmation emails delayed 45+ min.',
    aiResponse:'🔍 Root Cause: Broken SMTP connection throwing unhandled exception, killing worker.\n\n🛠 Fix:\n1. Restart: supervisorctl restart celery:*\n2. Add: @app.task(bind=True, max_retries=3, autoretry_for=(SMTPException,))\n3. Scale: celery worker --concurrency=16 -Q emails\n4. Add Flower dashboard for monitoring\n\n⏱ ETA to clear 18k queue: 90 minutes.'
  },
  {
    id:'INC-023', title:'AWS bill 340% above baseline — forgotten load test servers',
    severity:'high', status:'open', category:'infrastructure', assignee:'Sadvila',
    createdAt: Date.now() - 72000000, aiAnalyzed:true,
    description:'AWS spend $4,200 vs $1,200 baseline. 12x c5.2xlarge load test instances left running for 6 days.',
    aiResponse:'💰 Root Cause: Load test environment left running after performance tests.\n\n🛠 Immediate Actions:\n1. Terminate instances: aws ec2 terminate-instances --filters "Name=tag:Env,Values=load-test"\n2. Delete unused EBS volumes\n3. Set AWS Budget alert at $1,500/week\n4. Add auto-shutdown Lambda after 8 hours\n\n💸 Savings from action: ~2,800 this week.'
  },
  {
    id:'INC-024', title:'CoreDNS crash — 8 min total cluster communication failure',
    severity:'critical', status:'resolved', category:'network', assignee:'Harini',
    createdAt: Date.now() - 604800000, aiAnalyzed:true,
    description:'CoreDNS crash at 03:14 caused 8 minutes of complete service-to-service failure. 100% error rate.',
    aiResponse:'✅ RESOLVED\n\nRoot cause: Invalid Corefile syntax in ConfigMap after automated push.\n\nFix: kubectl rollout undo deployment/coredns -n kube-system\n\nPrevention:\n• Corefile linting in IaC pipeline\n• Canary deployment for CoreDNS changes\n• Synthetic DNS monitoring every 30s'
  },
  {
    id:'INC-025', title:'Slow query — product search taking 28 seconds (SLA: 500ms)',
    severity:'medium', status:'open', category:'database', assignee:'Kiranmai',
    createdAt: Date.now() - 32400000, aiAnalyzed:true,
    description:'Product search averaging 28.4s per request. PostgreSQL doing full sequential scan on 4.2M rows. Index lost after migration.',
    aiResponse:'🔍 Root Cause: Migration v2.3.0 dropped and recreated products table, losing composite index.\n\n🛠 Fix:\n1. Create index: CREATE INDEX CONCURRENTLY idx_products_search ON products(category_id, is_active, price);\n2. Verify: EXPLAIN ANALYZE SELECT * FROM products WHERE category_id=5;\n3. Expected: 28s → <50ms\n4. Add index checks to migration test suite\n\n⏱ Index build ETA: 12 minutes.'
  }
];

/* ---------- localStorage CRUD ---------- */
function forceLoadData() {
  localStorage.setItem('ira_incidents', JSON.stringify(SAMPLE_DATA));
  if (!localStorage.getItem('ira_ai_count')) {
    localStorage.setItem('ira_ai_count', '18');
    localStorage.setItem('ira_ai_log', JSON.stringify([
      { time:'14:32', msg:'Analyzed INC-001: DB pool exhausted — fix identified' },
      { time:'14:28', msg:'Analyzed INC-006: Brute force attack — IPs blocked' },
      { time:'13:55', msg:'Analyzed INC-004: API Gateway 504 — timeout config found' },
      { time:'13:41', msg:'Analyzed INC-002: Memory leak — heap snapshot taken' },
      { time:'12:18', msg:'Analyzed INC-007: Redis cache miss — key format mismatch' },
    ]));
  }
}

function getIncidents() {
  var stored = localStorage.getItem('ira_incidents');
  if (!stored || stored === '[]' || JSON.parse(stored).length === 0) {
    forceLoadData();
  }
  return JSON.parse(localStorage.getItem('ira_incidents') || '[]');
}

function saveIncidents(list) {
  localStorage.setItem('ira_incidents', JSON.stringify(list));
}

function getIncidentById(id) {
  return getIncidents().find(function(i){ return i.id === id; });
}

function addIncident(data) {
  var list = getIncidents();
  var inc = {
    id          : 'INC-' + String(list.length + 1).padStart(3,'0'),
    title       : data.title,
    severity    : data.severity    || 'medium',
    status      : 'open',
    category    : data.category    || 'infrastructure',
    description : data.description || 'No description provided.',
    assignee    : data.assignee    || 'Unassigned',
    createdAt   : Date.now(),
    aiAnalyzed  : false
  };
  list.unshift(inc);
  saveIncidents(list);
  return inc;
}

function updateIncident(id, updates) {
  var list = getIncidents();
  var idx  = list.findIndex(function(i){ return i.id === id; });
  if (idx !== -1) {
    list[idx] = Object.assign({}, list[idx], updates);
    saveIncidents(list);
    return list[idx];
  }
  return null;
}

function deleteIncidentById(id) {
  saveIncidents(getIncidents().filter(function(i){ return i.id !== id; }));
}

function getStats() {
  var all = getIncidents();
  return {
    total      : all.length,
    critical   : all.filter(function(i){ return i.severity==='critical' && i.status!=='resolved'; }).length,
    high       : all.filter(function(i){ return i.severity==='high'     && i.status!=='resolved'; }).length,
    medium     : all.filter(function(i){ return i.severity==='medium'   && i.status!=='resolved'; }).length,
    low        : all.filter(function(i){ return i.severity==='low'      && i.status!=='resolved'; }).length,
    open       : all.filter(function(i){ return i.status==='open'; }).length,
    inProgress : all.filter(function(i){ return i.status==='in-progress'; }).length,
    resolved   : all.filter(function(i){ return i.status==='resolved'; }).length
  };
}

/* ---------- AI Analysis ---------- */
var AI_TEMPLATES = {
  database      : '🔍 Database issue detected.\n\n🛠 Steps:\n1. Check connections: SELECT count(*), state FROM pg_stat_activity GROUP BY state;\n2. Kill long queries: SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query_start < now() - interval \'5 min\';\n3. Check slow query log\n4. Add missing indexes\n5. Monitor query performance',
  security      : '🔒 Security threat detected.\n\n🛠 Immediate Response:\n1. Block offending IPs in firewall/WAF\n2. Enable rate limiting: max 5 req/min/IP\n3. Force MFA on all admin accounts\n4. Audit access logs\n5. Rotate exposed credentials\n6. File incident report',
  infrastructure: '🏗 Infrastructure issue detected.\n\n🛠 Steps:\n1. Check resources: top -b -n1 && df -h\n2. Review recent config changes\n3. Check logs: journalctl -p err --since "2 hours ago"\n4. Free disk space if needed\n5. Add monitoring alerts at 75% threshold',
  application   : '💻 Application fault detected.\n\n🛠 Steps:\n1. Check logs: kubectl logs deployment/app --tail=100\n2. Review recent deployments: kubectl rollout history\n3. Check memory/CPU: kubectl top pods\n4. Rollback if needed: kubectl rollout undo\n5. Add liveness/readiness probes',
  network       : '🌐 Network issue detected.\n\n🛠 Steps:\n1. Trace route: mtr --report target-host\n2. Check DNS: dig +trace domain.com\n3. Verify LB health in console\n4. Review firewall rules and security groups\n5. Test from multiple origin points'
};

function analyzeIncidentAI(incident) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      var response = incident.aiResponse || AI_TEMPLATES[incident.category] || '🤖 AI Analysis complete.\n\n🛠 Steps:\n1. Check monitoring dashboards\n2. Review last 2 hours of deploys\n3. Check CPU, RAM, Disk, Network metrics\n4. Rollback if deploy correlated\n5. Escalate if not resolved in 15 minutes';
      updateIncident(incident.id, { aiAnalyzed:true, aiResponse:response, analyzedAt:Date.now() });
      var count = parseInt(localStorage.getItem('ira_ai_count') || '0') + 1;
      localStorage.setItem('ira_ai_count', String(count));
      var logs = JSON.parse(localStorage.getItem('ira_ai_log') || '[]');
      logs.unshift({ time: formatTime(Date.now()), msg: 'Analyzed ' + incident.id + ': ' + incident.title.substring(0,45) + '...' });
      if (logs.length > 20) logs.pop();
      localStorage.setItem('ira_ai_log', JSON.stringify(logs));
      resolve(response);
    }, 1400 + Math.random() * 600);
  });
}

/* ---------- Animate counter ---------- */
function animateCount(el, target, duration) {
  if (!el) return;
  duration = duration || 900;
  var start     = parseInt(el.textContent) || 0;
  var range     = target - start;
  var startTime = performance.now();
  function step(now) {
    var progress = Math.min((now - startTime) / duration, 1);
    var eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + range * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- Clock ---------- */
function startClock() {
  var el = document.getElementById('live-time');
  if (!el) return;
  function tick() {
    el.textContent = new Date().toLocaleString('en-IN', {
      hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit', month:'short', day:'numeric'
    });
  }
  tick();
  setInterval(tick, 1000);
}

/* ---------- Sidebar ---------- */
function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  var main    = document.querySelector('.main-content');
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
    if (main) main.classList.toggle('expanded');
  }
}

/* ---------- Alert Panel ---------- */
function toggleAlertPanel() {
  var p = document.getElementById('alert-panel');
  if (p) p.classList.toggle('open');
}

function renderAlertPanel() {
  var active  = getIncidents().filter(function(i){ return i.status !== 'resolved'; }).slice(0, 12);
  var list    = document.getElementById('alert-list');
  if (list) {
    list.innerHTML = active.length
      ? active.map(function(i){ return '<div class="alert-item ' + i.severity + '" style="cursor:pointer" onclick="toggleAlertPanel()"><div class="alert-item-title">' + i.title + '</div><div class="alert-item-time">' + i.id + ' · ' + i.assignee + ' · ' + timeAgo(i.createdAt) + '</div></div>'; }).join('')
      : '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">✅ No active alerts</div>';
  }
  var critHigh   = active.filter(function(i){ return i.severity==='critical'||i.severity==='high'; }).length;
  var bellBadge  = document.getElementById('bell-count');
  if (bellBadge) { bellBadge.textContent = critHigh; bellBadge.style.display = critHigh > 0 ? 'flex' : 'none'; }
  var navCount   = document.getElementById('nav-open-count');
  if (navCount)  navCount.textContent = active.length;
}

/* ---------- Modal ---------- */
var currentEditId = null;

function openCreateModal()  { var m = document.getElementById('create-modal');  if(m) m.classList.add('open'); }
function closeCreateModal() { var m = document.getElementById('create-modal');  if(m) m.classList.remove('open'); clearForm(); }
function closeDetailModal() { var m = document.getElementById('detail-modal');  if(m) m.classList.remove('open'); currentEditId = null; }

function closeModalOutside(e)  { if (e.target === document.getElementById('create-modal')) closeCreateModal(); }
function closeDetailOutside(e) { if (e.target === document.getElementById('detail-modal'))  closeDetailModal(); }

function clearForm() {
  ['inc-title','inc-desc','inc-assignee'].forEach(function(id){
    var el = document.getElementById(id); if(el) el.value = '';
  });
}

function createIncident() {
  var titleEl = document.getElementById('inc-title');
  var title   = titleEl ? titleEl.value.trim() : '';
  if (!title) { showToast('Please enter an incident title', 'error'); return; }

  var inc = addIncident({
    title       : title,
    severity    : (document.getElementById('inc-severity')  || {}).value  || 'medium',
    category    : (document.getElementById('inc-category')  || {}).value  || 'infrastructure',
    description : ((document.getElementById('inc-desc')     || {}).value  || '').trim(),
    assignee    : ((document.getElementById('inc-assignee') || {}).value  || '').trim()
  });

  closeCreateModal();
  showToast('✅ ' + inc.id + ' created successfully', 'success');

  var autoAI = document.getElementById('inc-ai-analyze');
  if (!autoAI || autoAI.checked) {
    setTimeout(function(){
      analyzeIncidentAI(inc).then(function(){
        showToast('🤖 AI analysis complete for ' + inc.id, 'info');
        if (typeof refreshPage === 'function') refreshPage();
      });
    }, 800);
  }
  if (typeof refreshPage === 'function') refreshPage();
  renderAlertPanel();
}

/* ---------- Toast ---------- */
function showToast(msg, type, duration) {
  type     = type     || 'info';
  duration = duration || 3800;
  var icons = { success:'fa-circle-check', error:'fa-circle-xmark', warning:'fa-triangle-exclamation', info:'fa-circle-info' };
  var container = document.getElementById('toast-container');
  if (!container) return;
  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = '<i class="fa-solid ' + icons[type] + ' toast-icon"></i><span class="toast-msg">' + msg + '</span>';
  container.appendChild(toast);
  setTimeout(function(){
    toast.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(function(){ if(toast.parentNode) toast.remove(); }, 300);
  }, duration);
}

/* ---------- Search ---------- */
function filterIncidents(q) {
  searchQuery = q.toLowerCase();
  if (typeof applyFilter      === 'function') applyFilter();
  if (typeof applyFiltersPage === 'function') applyFiltersPage();
}

/* ---------- Export ---------- */
function exportCSV() {
  var headers = ['ID','Title','Severity','Status','Category','Assignee','Created'];
  var rows    = getIncidents().map(function(i){
    return [i.id, '"'+i.title+'"', i.severity, i.status, i.category, i.assignee||'', new Date(i.createdAt).toISOString()];
  });
  var csv  = [headers].concat(rows).map(function(r){ return r.join(','); }).join('\n');
  var blob = new Blob([csv], { type:'text/csv' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = 'ira-incidents.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Exported as CSV', 'success');
}

function exportReport() { exportCSV(); }

/* ---------- Scroll animations ---------- */
function initAnimations() {
  var cards = document.querySelectorAll('.stat-card, .card, .incident-card');
  cards.forEach(function(el, i){
    el.style.opacity   = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition= 'opacity 0.5s ease, transform 0.5s ease';
    setTimeout(function(){
      el.style.opacity   = '1';
      el.style.transform = 'translateY(0)';
    }, 80 + i * 60);
  });
}

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', function() {
  forceLoadData();   /* Always ensure data is loaded */
  startClock();
  renderAlertPanel();
  setTimeout(initAnimations, 100);
});