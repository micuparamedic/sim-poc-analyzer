/* Sim POC Analyzer — service worker: caches the app so it runs offline.
   Bump CACHE when you change any file so devices pick up the new version. */
var CACHE = "sim-poc-v2";
var FILES = [
  "./", "index.html", "operator.html", "learner.html", "manifest.json",
  "css/style.css", "css/learner.css",
  "js/cartridges.js", "js/ranges.js", "js/calc.js", "js/scenarios.js",
  "js/operator.js", "js/scanner.js", "js/learner.js", "js/sw-register.js",
  "lib/qrcode.js", "icons/icon-192.png", "icons/icon-512.png"
];
var OPTIONAL = ["lib/jsQR.js"];   // cached if present

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(FILES).then(function () {
      return Promise.all(OPTIONAL.map(function (f) { return c.add(f).catch(function () {}); }));
    });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Cache first, then network; ignores the #hash (results are never sent anyway). */
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(e.request).then(function (res) {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return res;
    });
  }));
});
