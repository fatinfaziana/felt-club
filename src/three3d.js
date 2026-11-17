/* ---------- 3D layer (Three.js r128). Every 3D scene is built from these parts ---------- */
const T3 = (() => {
  let avail = null, pref = null, lastErr = '';
  const has = () => {
    if (avail === null) { try { avail = typeof THREE !== 'undefined' && !!document.createElement('canvas').getContext('webgl'); } catch (e) { avail = false; } }
    return avail;
  };
  const getPref = () => { if (pref === null) { try { pref = localStorage.getItem('fc3d') !== '0'; } catch (e) { pref = true; } } return pref; };
  const setPref = v => { pref = !!v; try { localStorage.setItem('fc3d', v ? '1' : '0'); } catch (e) {} };
  const on = () => has() && getPref();

  const mat = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.7, metalness: 0.05 }, o || {}));
  const mk = (parent, geo, m, x, y, z, o) => {
    const me = new THREE.Mesh(geo, m); me.position.set(x || 0, y || 0, z || 0);
    me.castShadow = !(o && o.noCast); me.receiveShadow = !(o && o.noRecv); if (parent) parent.add(me); return me;
  };
  const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const CYL = (rt, rb, h, seg) => new THREE.CylinderGeometry(rt, rb, h, seg || 24);
  const SPH = (r, seg) => new THREE.SphereGeometry(r, seg || 20, seg ? Math.ceil(seg * 0.7) : 14);
  const ease = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

  function canvasTex(w, h, draw, rep) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  }
  const speckle = (base, spread, n) => (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { const v = Math.floor(Math.random() * spread); g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${(v / 255).toFixed(3)})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  };

  // text label as a sprite. returns {sprite, set(text)}
  function label(text, o) {
    o = o || {};
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: o.depthTest !== false }));
    const sc = o.scale || 1.6; sprite.scale.set(sc, sc / 4, 1); sprite.renderOrder = 10;
    let cur = null;
    const api = { sprite, set(t, col) {
      const key = t + '|' + (col || ''); if (key === cur) return; cur = key;
      g.clearRect(0, 0, 512, 128); if (!t) { tex.needsUpdate = true; return; }
      g.font = '700 54px Figtree, system-ui, sans-serif'; const w = Math.min(500, g.measureText(t).width + 44);
      g.fillStyle = o.bg || 'rgba(20,12,30,.72)'; g.beginPath();
      if (g.roundRect) g.roundRect(256 - w / 2, 22, w, 84, 30); else g.rect(256 - w / 2, 22, w, 84);
      g.fill(); g.fillStyle = col || o.color || '#f7f0e1'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 256, 66); tex.needsUpdate = true;
    } };
    api.set(text); return api;
  }

  const SKIN = ['#f1c9a0', '#c98e63', '#8d5a3b', '#e5b48a', '#a56a45', '#f4d3b5'];
  const HAIR = ['#2a1b12', '#5a3a1e', '#111', '#8a5a2b', '#3a2a2a', '#b07a3a'];
  // a stylised person facing +z. o.seated, o.idx (colour choice)
  function person(color, o) {
    o = o || {}; const g = new THREE.Group(), i = o.idx || 0;
    const shirt = mat(color, { roughness: 0.6 }), skin = mat(SKIN[i % 6], { roughness: 0.55 }), dark = mat('#1d1626');
    const seated = !!o.seated, hip = seated ? 0.62 : 0.95;
    const torso = mk(g, CYL(0.2, 0.25, 0.62, 18), shirt, 0, hip + 0.4, 0);
    mk(g, SPH(0.25, 16), shirt, 0, hip + 0.1, 0).scale.set(1, 0.6, 0.85);
    mk(g, SPH(0.12, 12), skin, 0, hip + 0.76, 0).scale.set(1, 0.7, 1);
    const head = new THREE.Group(); head.position.set(0, hip + 0.98, 0); g.add(head);
    mk(head, SPH(0.18, 18), skin, 0, 0, 0);
    mk(head, SPH(0.19, 16), mat(HAIR[i % 6]), 0, 0.04, -0.025).scale.set(1, 0.85, 1);
    mk(head, SPH(0.03, 8), dark, -0.065, 0.01, 0.165, { noCast: true }); mk(head, SPH(0.03, 8), dark, 0.065, 0.01, 0.165, { noCast: true });
    const arms = [];
    for (const sx of [-1, 1]) {
      const a = new THREE.Group(); a.position.set(sx * 0.27, hip + 0.66, 0); g.add(a);
      mk(a, CYL(0.06, 0.055, 0.46, 10), shirt, 0, -0.22, 0); mk(a, SPH(0.065, 10), skin, 0, -0.47, 0);
      a.rotation.x = seated ? -1.0 : 0.05; a.rotation.z = sx * (seated ? 0.12 : 0.08); arms.push(a);
    }
    for (const sx of [-1, 1]) {
      if (seated) { const l = mk(g, CYL(0.09, 0.08, 0.5, 10), mat('#2b2a3a'), sx * 0.12, 0.62, 0.25); l.rotation.x = Math.PI / 2; mk(g, CYL(0.08, 0.07, 0.5, 10), mat('#2b2a3a'), sx * 0.12, 0.33, 0.5); }
      else { mk(g, CYL(0.09, 0.08, 0.95, 10), mat('#2b2a3a'), sx * 0.12, 0.47, 0); mk(g, BOX(0.14, 0.07, 0.26), dark, sx * 0.12, 0.04, 0.05); }
    }
    g.userData = { torso, head, arms, phase: Math.random() * 6.28, base: head.position.y };
    return g;
  }

  // Indoor lounge: wooden floor, panelled walls and warm lamps
  function lounge(s, o) {
    o = o || {}; const W = o.w || 22, D = o.d || 18, H = o.h || 7, sc = s.scene, cx = o.cx || 0, cz = o.cz || 0;
    sc.background = new THREE.Color(o.bg || 0x120b1a); sc.fog = new THREE.Fog(o.bg || 0x120b1a, 18, 46);
    const wood = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#5a3a22'; g.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) { g.fillStyle = `hsl(25,${35 + Math.random() * 10}%,${22 + Math.random() * 8}%)`; g.fillRect(0, i * 32, w, 30); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, i * 32 + 30, w, 2); } }, [W / 6, D / 6]);
    mk(sc, new THREE.PlaneGeometry(W, D), mat('#fff', { map: wood, roughness: 0.45 }), cx, 0, cz, { noCast: true }).rotation.x = -Math.PI / 2;
    const wall = mat(o.wall || '#2d1b3d', { roughness: 0.9 }), trim = mat('#6b4423', { roughness: 0.5 });
    const walls = [[0, -D / 2, 0, W], [0, D / 2, Math.PI, W], [-W / 2, 0, Math.PI / 2, D], [W / 2, 0, -Math.PI / 2, D]];
    for (const [x, z, ry, len] of walls) {
      const m = mk(sc, new THREE.PlaneGeometry(len, H), wall, cx + x, H / 2, cz + z, { noCast: true }); m.rotation.y = ry;
      const t = mk(sc, BOX(len, 0.5, 0.12), trim, cx + x, 0.25, cz + z, { noCast: true }); t.rotation.y = ry; t.position.x += Math.sin(ry) * 0.06; t.position.z -= Math.cos(ry) * 0.06 * -1;
      const r = mk(sc, BOX(len, 0.14, 0.14), trim, cx + x, 3.2, cz + z, { noCast: true }); r.rotation.y = ry;
    }
    mk(sc, new THREE.PlaneGeometry(W, D), mat('#1a1022'), cx, H, cz, { noCast: true }).rotation.x = Math.PI / 2;
    sc.add(new THREE.HemisphereLight(0xffe9cc, 0x2a1a3a, o.ambient === undefined ? 0.55 : o.ambient));
    const lamps = o.lamps || [[0, 0]];
    lamps.forEach(([x, z], k) => {
      const g = new THREE.Group(); g.position.set(cx + x, H - 2.6, cz + z); sc.add(g);
      mk(g, CYL(0.02, 0.02, 2.6, 6), mat('#222'), 0, 1.3, 0, { noCast: true });
      mk(g, CYL(0.25, 0.8, 0.5, 20, 1), mat('#2a6b4a', { side: THREE.DoubleSide }), 0, 0, 0, { noCast: true });
      mk(g, SPH(0.2, 10), new THREE.MeshBasicMaterial({ color: 0xfff1c9 }), 0, -0.15, 0, { noCast: true });
      const l = new THREE.SpotLight(0xffe2b0, o.lampPower || 1.1, 24, 0.9, 0.6, 1.2); l.position.set(0, -0.1, 0); l.target.position.set(0, -8, 0); g.add(l); g.add(l.target);
      if (k === 0) { l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.0005; }
    });
    return sc;
  }

  // Open-air course/range: sky, sun, grass and a ring of trees
  function outdoor(s, o) {
    o = o || {}; const sc = s.scene, R = o.r || 40;
    sc.background = new THREE.Color(0x9ed4f0); sc.fog = new THREE.Fog(0x9ed4f0, o.fogNear || 30, o.fogFar || 90);
    sc.add(new THREE.HemisphereLight(0xdff1ff, 0x3b6b3a, 0.75));
    const sun = new THREE.DirectionalLight(0xfff0cf, 0.95); sun.position.set(o.sunX === undefined ? -8 : o.sunX, 16, 10); sun.castShadow = true;
    const sh = o.shadow || 14; Object.assign(sun.shadow.camera, { left: -sh, right: sh, top: sh, bottom: -sh, near: 1, far: 50 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sc.add(sun);
    const grass = canvasTex(512, 512, speckle('#3f8a45', 40, 5000), [R / 4, R / 4]);
    mk(sc, new THREE.PlaneGeometry(R * 2, R * 2), mat('#fff', { map: grass, roughness: 1 }), o.cx || 0, -0.01, o.cz || 0, { noCast: true }).rotation.x = -Math.PI / 2;
    const trunk = mat('#6b4423'), leaf = [mat('#2f7d3a'), mat('#3b8f44'), mat('#276b32')];
    const n = o.trees === undefined ? 22 : o.trees, ox = o.cx || 0, oz = o.cz || 0;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.2, d = (o.treeR || 22) + Math.random() * 7, x = ox + Math.cos(a) * d, z = oz + Math.sin(a) * d, sz = 0.8 + Math.random() * 0.7;
      const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(sz); sc.add(t);
      mk(t, CYL(0.25, 0.35, 2, 8), trunk, 0, 1, 0); mk(t, new THREE.ConeGeometry(1.7, 3.2, 9), leaf[i % 3], 0, 3.4, 0); mk(t, new THREE.ConeGeometry(1.3, 2.6, 9), leaf[(i + 1) % 3], 0, 5, 0);
    }
    for (let i = 0; i < 6; i++) { const c = mk(sc, SPH(2 + Math.random() * 2, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false }), ox - 30 + i * 12 + Math.random() * 5, 22 + Math.random() * 4, oz - 28, { noCast: true }); c.scale.set(2.4, 0.7, 1); s.clouds.push(c); }
    return sc;
  }

  function stage(box, o) {
    o = o || {};
    const wrap = document.createElement('div'); wrap.className = 's3d'; box.appendChild(wrap);
    const cv = document.createElement('canvas'); wrap.appendChild(cv);
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(o.fov || 45, 1.6, 0.6, 300);
    let fovMul = 1;
    const s = { scene, camera, renderer, wrap, cv, hooks: [], tweens: [], people: [], clouds: [], views: {}, view: '', S: null, t: 0, dead: false, sway: 0 };
    const tgt = { pos: new THREE.Vector3(0, 8, 8), look: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), fov: o.fov || 45 };
    const ORB_UP = new THREE.Vector3(0, 1, 0), curLook = new THREE.Vector3(), curUp = new THREE.Vector3(0, 1, 0);
    const bar = document.createElement('div'); bar.className = 's3d-views'; wrap.appendChild(bar);
    const hint = document.createElement('div'); hint.className = 's3d-hint'; wrap.appendChild(hint); s.hint = t => { hint.textContent = t || ''; hint.hidden = !t; };
    s.hint('');

    const orb = { yaw: 0, pitch: 0, zoom: 1 }, sph = new THREE.Spherical(), dpos = new THREE.Vector3();
    s.orbit = orb;
    s.goto = (v, snap) => {
      orb.yaw = orb.pitch = 0; orb.zoom = 1;
      tgt.pos.set(...v.pos); tgt.look.set(...v.look); tgt.up.set(...(v.up || [0, 1, 0])); tgt.fov = v.fov || 45; s.sway = v.sway || 0;
      if (snap) { camera.position.copy(tgt.pos); curLook.copy(tgt.look); curUp.copy(tgt.up); camera.fov = tgt.fov * fovMul; camera.updateProjectionMatrix(); }
    };
    s.setViews = (views, pick, snap) => {
      s.views = views; const names = Object.keys(views); s.base = pick || names[0]; s.manual = false;
      bar.innerHTML = names.map(k => `<button type="button" data-v="${k}" aria-pressed="false">${views[k].label || k}</button>`).join('') + '<button type="button" data-z="-1" aria-label="Zoom in">＋</button><button type="button" data-z="1" aria-label="Zoom out">－</button>';
      s.setView(views[s.view] ? s.view : (pick || names[0]), snap);
    };
    s.setView = (name, snap) => {
      if (!s.views[name]) return; s.view = name; s.manual = !!s.base && name !== s.base; s.zoomed = false; s.goto(s.views[name], snap);
      bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === name));
      if (s.onView) s.onView(name);
    };
    bar.onclick = e => {
      const z = e.target.closest('[data-z]'); if (z) { s.zoomBy(z.dataset.z > 0 ? 1.25 : 0.8); return; }
      const b = e.target.closest('[data-v]'); if (b) s.setView(b.dataset.v);
    };
    // Look around freely: drag to orbit, wheel / pinch / buttons to zoom. Choosing a view button resets it.
    s.zoomBy = f => { orb.zoom = Math.min(2.6, Math.max(0.3, orb.zoom * f)); s.manual = true; s.zoomed = false; };
    (() => {
      const ptrs = new Map(); let pinch = 0;
      cv.style.touchAction = 'none';
      cv.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { cv.setPointerCapture(e.pointerId); } catch (x) {} pinch = 0; });
      cv.addEventListener('pointermove', e => {
        const p = ptrs.get(e.pointerId); if (!p) return;
        const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
        if (ptrs.size >= 2) {
          const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) s.zoomBy(pinch / d); pinch = d; return;
        }
        if (Math.abs(dx) + Math.abs(dy) < 1) return;
        orb.yaw -= dx * 0.007; orb.pitch -= dy * 0.005; s.manual = true; s.zoomed = false;
      });
      const up = e => { ptrs.delete(e.pointerId); pinch = 0; };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('wheel', e => { e.preventDefault(); s.zoomBy(e.deltaY > 0 ? 1.1 : 0.91); }, { passive: false });
      cv.addEventListener('dblclick', () => s.setView(s.base || s.view));
    })();
    // Zoom in a little when it is the player's turn, and back out afterwards (unless they chose another view themselves).
    s.autoZoom = on => {
      const v = s.views[s.base]; if (!v || s.manual || !!on === !!s.zoomed) return; s.zoomed = !!on;
      if (!on) { s.goto(v); return; }
      const k = v.zoom === undefined ? 0.24 : v.zoom, p = v.pos.map((x, i) => x + (v.look[i] - x) * k);
      s.goto({ pos: p, look: v.look, up: v.up, fov: Math.max(30, (v.fov || 45) - 4), sway: 0 });
    };
    s.on = fn => { s.hooks.push(fn); };
    s.tween = (ms, fn, done) => { const t = { ms, t: 0, fn, done }; s.tweens.push(t); return t; };
    s.addPerson = p => { s.people.push(p); return p; };

    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    s.ray = e => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); const r = cv.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); return ray; };
    s.pick = (e, objs) => s.ray(e).intersectObjects(objs, true);
    s.project = v => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); const q = v.clone().project(camera), r = cv.getBoundingClientRect(); return { x: r.left + (q.x + 1) / 2 * r.width, y: r.top + (1 - q.y) / 2 * r.height }; };
    s.onTap = fn => {
      let d = null;
      cv.addEventListener('pointerdown', e => { d = { x: e.clientX, y: e.clientY }; });
      cv.addEventListener('pointerup', e => { if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) fn(e); d = null; });
    };

    const rs = () => { const w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; fovMul = camera.aspect >= 1.3 ? 1 : Math.min(1.9, 1.3 / camera.aspect); camera.fov = tgt.fov * fovMul; camera.updateProjectionMatrix(); };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(rs) : null; if (ro) ro.observe(wrap); rs();
    let last = performance.now(), raf = 0;
    const dispose = () => { s.dead = true; cancelAnimationFrame(raf); if (ro) ro.disconnect(); try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) {} };
    s.dispose = dispose;
    const frame = now => {
      if (!wrap.isConnected) { dispose(); return; }
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now; s.t += dt;
      for (const h of s.hooks) h(dt, s.t);
      for (let i = s.tweens.length - 1; i >= 0; i--) { const w = s.tweens[i]; w.t += dt * 1000; const k = Math.min(1, w.t / w.ms); w.fn(k, ease(k)); if (k >= 1) { s.tweens.splice(i, 1); if (w.done) w.done(); } }
      for (const p of s.people) { const u = p.userData; u.torso.scale.y = 1 + 0.018 * Math.sin(s.t * 2 + u.phase); u.head.position.y = u.base + 0.008 * Math.sin(s.t * 2 + u.phase); if (!u.lookLocked) u.head.rotation.y = 0.12 * Math.sin(s.t * 0.6 + u.phase); }
      s.clouds.forEach((c, i) => { c.position.x += dt * 0.25; if (c.position.x > 50) c.position.x = -50; });
      const k = 1 - Math.exp(-dt * 5);
      dpos.copy(tgt.pos);
      if (orb.yaw || orb.pitch || orb.zoom !== 1) { dpos.sub(tgt.look); sph.setFromVector3(dpos); sph.theta += orb.yaw; sph.phi = Math.min(1.5, Math.max(0.12, sph.phi + orb.pitch)); sph.radius = Math.min(48, Math.max(3, sph.radius * orb.zoom)); dpos.setFromSpherical(sph).add(tgt.look); if (dpos.y < 3.4) dpos.y = 3.4; }
      const upT = (orb.yaw || orb.pitch) ? ORB_UP : tgt.up;
      camera.position.lerp(dpos, k); curLook.lerp(tgt.look, k); curUp.lerp(upT, k); camera.up.copy(curUp).normalize();
      const f = camera.fov + (tgt.fov * fovMul - camera.fov) * k; if (Math.abs(f - camera.fov) > 0.01) { camera.fov = f; camera.updateProjectionMatrix(); }
      const sw = s.sway; const bx = sw ? Math.sin(s.t * 0.9) * sw : 0, by = sw ? Math.cos(s.t * 0.7) * sw * 0.6 : 0;
      camera.position.x += bx; camera.position.y += by; camera.lookAt(curLook); camera.position.x -= bx; camera.position.y -= by;
      renderer.render(scene, camera);
    };
    try { window.__s3d = s; } catch (e) {}
    raf = requestAnimationFrame(frame);
    if (o.views) s.setViews(o.views, o.view, true);
    return s;
  }

  // wrap a 2D screen: keep its seats, banners and controls, and swap its board for a 3D scene
  // Your own cards, big and crisp, along the bottom of the 3D view. They mirror the 2D hand: tapping a card taps the real one
  // (so it lifts up when picked, just like picking a card up off the table).
  function hud(s, finders) {
    const root = document.createElement('div'); root.className = 's3d-hand'; root.hidden = true; s.wrap.appendChild(root);
    let last = '', cur = [];
    const sync = () => {
      let found = []; try { found = (finders() || []).filter(f => f && f.el && !f.el.hidden && f.el.querySelector('.card, .bt-card, .vp-card, button')); } catch (e) { found = []; }
      const key = found.map(f => f.label + '|' + f.el.innerHTML).join('§'); if (key === last) return; last = key; cur = found;
      root.hidden = !found.length;
      root.innerHTML = found.map((f, g) => `<div class="hg${f.el.querySelectorAll('.card').length > 6 ? ' dense' : ''}" data-g="${g}">${f.label ? `<span class="hl">${f.label}</span>` : ''}<div class="hr">${f.el.innerHTML}</div></div>`).join('');
    };
    root.onclick = e => {
      const grp = e.target.closest('.hg'); if (!grp) return; const f = cur[+grp.dataset.g]; if (!f || !f.el) return;
      const all = [...grp.querySelector('.hr').querySelectorAll('*')], i = all.indexOf(e.target); if (i < 0) return;
      let o = f.el.querySelectorAll('*')[i]; if (!o) return;
      let b = o; while (b && b !== f.el && b.tagName !== 'BUTTON' && !b.dataset.c && !b.dataset.i && !b.dataset.h) b = b.parentElement; if (b && b !== f.el) o = b;
      o.click(); setTimeout(sync, 30); setTimeout(sync, 250);
    };
    s.hud = { sync }; return root;
  }

  function wrapUi(ui2d, o) {
    let sc = null, box = null, hidden = [], stEl = null, lastS = null;
    return {
      mount(stageEl, ctl, S) {
        ui2d.mount(stageEl, ctl, S); sc = null; hidden = []; stEl = stageEl;
        try {
          const slot = o.slot(stageEl); box = document.createElement('div'); box.className = 's3dbox';
          slot.before.parentNode.insertBefore(box, slot.before);
          (slot.hide || []).forEach(e => { if (e) { e.style.display = 'none'; hidden.push(e); } });
          sc = o.make(box, S);
          if (o.hands && sc && sc.wrap) hud(sc, () => o.hands(stEl, lastS));
        } catch (e) {
          lastErr = String(e && e.stack || e); console.error(lastErr);
          hidden.forEach(h => { h.style.display = ''; }); if (box) box.remove(); sc = null; try { window.__errs && window.__errs.push('3D: ' + lastErr); } catch (x) {}
        }
      },
      update(S) { lastS = S; const r = ui2d.update(S); if (sc && sc.autoZoom) sc.autoZoom(!!S.turn); if (sc && sc.hud) sc.hud.sync(); if (sc && sc.sync) { try { sc.sync(S); } catch (e) { lastErr = String(e && e.stack || e); console.error(lastErr); try { window.__errs && window.__errs.push('3D sync: ' + lastErr); } catch (x) {} } } return r; },
    };
  }

  // playing cards as thin boxes with a face and a back
  const cardTex = {};
  const LABS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'], SU = ['♠', '♥', '♦', '♣'];
  function cardFace(c) {
    if (cardTex[c]) return cardTex[c];
    return (cardTex[c] = canvasTex(256, 360, (g, w, h) => {
      g.fillStyle = '#fbf6ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8ccb0'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
      const red = (c & 3) === 1 || (c & 3) === 2; g.fillStyle = red ? '#c4372e' : '#1b1b1b'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '700 70px Georgia, serif'; g.fillText(LABS[c >> 2], 52, 56); g.font = '60px serif'; g.fillText(SU[c & 3], 52, 118);
      g.font = '170px serif'; g.fillText(SU[c & 3], w / 2 + 8, h / 2 + 24);
      g.save(); g.translate(w, h); g.rotate(Math.PI); g.font = '700 70px Georgia, serif'; g.fillText(LABS[c >> 2], 52, 56); g.font = '60px serif'; g.fillText(SU[c & 3], 52, 118); g.restore();
    }));
  }
  let backTex = null;
  const cardBack = () => backTex || (backTex = canvasTex(256, 360, (g, w, h) => {
    g.fillStyle = '#fbf6ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#a3262a'; g.fillRect(14, 14, w - 28, h - 28);
    g.strokeStyle = '#f4d9a0'; g.lineWidth = 3; for (let i = -h; i < w + h; i += 22) { g.beginPath(); g.moveTo(i, 14); g.lineTo(i + h, h - 14); g.stroke(); g.beginPath(); g.moveTo(i, h - 14); g.lineTo(i + h, 14); g.stroke(); }
    g.strokeStyle = '#f4d9a0'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28);
  }));
  const edge = () => mat('#f2ead8', { roughness: 0.8 });
  // a card lying flat; face up when c >= 0, face down otherwise. 0.7 x 1.0 units
  function card3(c, w) {
    w = w || 0.7; const h = w * 1.4286;
    const f = c >= 0 ? new THREE.MeshStandardMaterial({ map: cardFace(c), roughness: 0.5 }) : new THREE.MeshStandardMaterial({ map: cardBack(), roughness: 0.5 });
    const b = new THREE.MeshStandardMaterial({ map: cardBack(), roughness: 0.5 }), e = edge();
    const m = new THREE.Mesh(BOX(w, 0.012, h), [e, e, f, b, e, e]); m.castShadow = true; m.receiveShadow = true; m.userData.c = c; return m;
  }
  const CHIP_COL = [[500, '#222'], [100, '#2d2d2d'], [25, '#2e8b57'], [10, '#3f6fd6'], [1, '#c4372e']];
  // stack of casino chips worth `amt`
  function chips(amt, r) {
    r = r || 0.17; const g = new THREE.Group(); let left = Math.max(0, Math.round(amt)), k = 0, col = 0;
    const defs = [[100, '#1f1f24'], [25, '#2e8b57'], [10, '#3f6fd6'], [5, '#c4372e'], [1, '#f2f2f2']];
    const stacks = [];
    for (const [v, c] of defs) { const n = Math.floor(left / v); left -= n * v; if (n) stacks.push([c, Math.min(n, 12)]); }
    stacks.slice(0, 3).forEach(([c, n], si) => {
      for (let i = 0; i < n; i++) {
        const ch = mk(g, CYL(r, r, 0.045, 20), mat(c, { roughness: 0.4 }), si * r * 2.15 - (Math.min(stacks.length, 3) - 1) * r, 0.0225 + i * 0.05, 0);
        mk(g, CYL(r * 0.78, r * 0.78, 0.047, 20), mat('#f4ead0', { roughness: 0.6 }), ch.position.x, ch.position.y, 0, { noCast: true });
      }
    });
    return g;
  }

  return { has, on, setPref, hud, mat, mk, BOX, CYL, SPH, canvasTex, speckle, label, person, lounge, outdoor, stage, wrapUi, card3, chips, ease, err: () => lastErr };
})();
