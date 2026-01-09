document.addEventListener('DOMContentLoaded', () => {
  initBackground();
  const checkBtn = document.getElementById('checkBtn');
  const gameIdInput = document.getElementById('gameId');
  const resultsSection = document.getElementById('resultsSection');
  const terminalOutput = document.getElementById('terminalOutput');
  const downloadSection = document.getElementById('downloadSection');
  const downloadLink = document.getElementById('downloadLink');
  const notFoundSection = document.getElementById('notFoundSection');
  const gameArt = document.getElementById('gameArt');
  const statusDot = document.querySelector('.status-dot');
  const badge = document.querySelector('.badge');
  const statusLabel = document.querySelector('.status-label');

  checkBtn.addEventListener('click', checkManifest);
  gameIdInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkManifest();
    }
  });

  const toggle = (el, show) => {
    if (!el) return;
    el.classList.toggle('hidden', !show);
  };

  // Check SystemZero status using App ID 431960
  checkStatus();

  async function checkManifest() {
    const gameId = gameIdInput.value.trim();
    if (!gameId || !/^\d+$/.test(gameId)) {
      showError('Enter a valid numeric App ID.');
      return;
    }

    checkBtn.disabled = true;
    checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';

    toggle(resultsSection, true);
    toggle(downloadSection, false);
    toggle(notFoundSection, false);
    toggle(gameArt, false);
    terminalOutput.textContent = '';
    await typeOut(`┌─ SystemZero Manifest Scanner\n`);
    await typeOut(`│ Scanning App ID: ${gameId}\n`);
    await typeOut(`└─ Initializing...\n\n`);

    try {
      await typeOut(`[1/2] Testing Server 1\n`);
      await typeOut(`      └─ Querying...\n`);
      const response = await fetchWithTimeout(`https://api.github.com/repos/SteamAutoCracks/ManifestHub/branches/${gameId}`, {
        headers: { 'Accept': 'application/vnd.github+json' }
      });

      if (response.ok) {
        await typeOut(`      └─ ✓ SUCCESS\n\n`);
        await typeOut(`[RESULT] Manifest found\n`);
        await typeOut(`[STATUS] Ready for download\n\n`);
        downloadLink.removeAttribute('download');
        downloadLink.href = `https://codeload.github.com/SteamAutoCracks/ManifestHub/zip/refs/heads/${gameId}`;
        toggle(downloadSection, true);
        loadGameArt(gameId);
        checkBtn.innerHTML = '<i class="fas fa-check-circle"></i> Ready';
      } else if (response.status === 404) {
        await typeOut(`      └─ ✗ NOT FOUND (404)\n\n`);
        await typeOut(`[2/2] Testing Server 2\n`);
        await typeOut(`      └─ Querying...\n`);
        const s3Url = `https://steamgames554.s3.us-east-1.amazonaws.com/${gameId}.zip`;
        const s3Response = await fetchWithTimeout(s3Url, { method: 'HEAD' });
        
        if (s3Response.ok) {
          await typeOut(`      └─ ✓ SUCCESS\n\n`);
          await typeOut(`[RESULT] Manifest found\n`);
          await typeOut(`[STATUS] Ready for download\n\n`);
          downloadLink.removeAttribute('download');
          downloadLink.href = s3Url;
          toggle(downloadSection, true);
          loadGameArt(gameId);
          checkBtn.innerHTML = '<i class="fas fa-check-circle"></i> Ready';
        } else {
          await typeOut(`      └─ ✗ NOT FOUND\n\n`);
          await typeOut(`[RESULT] Manifest not available\n`);
          await typeOut(`[STATUS] App ID ${gameId} has no manifest\n\n`);
          toggle(notFoundSection, true);
          checkBtn.innerHTML = '<i class="fas fa-circle-xmark"></i> Not found';
        }
      } else {
        throw new Error('Registry unavailable');
      }
    } catch (err) {
      await typeOut(`[ERROR] Connection failed\n`);
      await typeOut(`[STATUS] Unable to reach servers\n\n`);
      showError('Registry unavailable. Try later.');
    } finally {
      setTimeout(() => { checkBtn.disabled = false; checkBtn.innerHTML = '<i class="fas fa-satellite-dish"></i> Scan'; }, 900);
    }
  }

  async function checkStatus() {
    if (!statusDot || !badge) return;
    try {
      const res = await fetchWithTimeout('https://api.github.com/repos/SteamAutoCracks/ManifestHub/branches/431960', {
        headers: { 'Accept': 'application/vnd.github+json' }
      }, 5000);
      const online = res.ok;
      statusDot.classList.toggle('offline', !online);
      badge.classList.toggle('offline', !online);
      if (statusLabel) statusLabel.textContent = online ? 'Online' : 'Offline';
      statusDot.title = online ? 'SystemZero online' : 'SystemZero offline';
    } catch (err) {
      statusDot.classList.add('offline');
      badge.classList.add('offline');
      if (statusLabel) statusLabel.textContent = 'Offline';
      statusDot.title = 'SystemZero offline';
    }
  }

  function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
  async function typeOut(text) {
    for (let i = 0; i < text.length; i++) {
      terminalOutput.textContent += text.charAt(i);
      terminalOutput.scrollTop = terminalOutput.scrollHeight;
      await sleep(18);
    }
  }

  function showError(msg) {
    terminalOutput.textContent = `> ERROR: ${msg}\n`;
    toggle(resultsSection, true);
    toggle(downloadSection, false);
    toggle(notFoundSection, false);
  }

  function loadGameArt(gameId) {
    const sources = [
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/header.jpg`,
      `https://steamcdn-a.akamaihd.net/steam/apps/${gameId}/header.jpg`,
      `https://steamcdn-a.akamaihd.net/steam/apps/${gameId}/capsule_616x353.jpg`
    ];

    let idx = 0;
    toggle(gameArt, false);

    const tryNext = () => {
      if (idx >= sources.length) return;
      const src = sources[idx++];
      gameArt.onerror = tryNext;
      gameArt.onload = () => { toggle(gameArt, true); };
      gameArt.src = src;
    };

    tryNext();
  }

  function initBackground() {
    const canvas = document.getElementById('glowCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, particles;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      particles = Array.from({ length: 80 }, () => spawn());
    }

    function spawn() {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: 1.5 + Math.random() * 1.5,
        hue: 150 + Math.random() * 120
      };
    }

    function step() {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) {
          Object.assign(p, spawn());
        }
        ctx.beginPath();
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        grad.addColorStop(0, `hsla(${p.hue}, 80%, 70%, 0.35)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < 120 * 120) {
            const alpha = 1 - dist2 / (120 * 120);
            ctx.strokeStyle = `rgba(79, 240, 178, ${alpha * 0.25})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(step);
    }

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(step);
  }

  function fetchWithTimeout(url, options = {}, timeout = 7000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const merged = { ...options, signal: controller.signal };
    return fetch(url, merged).finally(() => clearTimeout(id));
  }
});
