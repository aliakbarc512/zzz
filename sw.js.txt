
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

const CACHE_NAME = "chattix-v1";

firebase.initializeApp({
  apiKey: "AIzaSyCEenJ5RhwvWeOrsCTii4peRKwEX4gn5ec",
  authDomain: "x-cheema.firebaseapp.com",
  projectId: "x-cheema",
  storageBucket: "x-cheema.firebasestorage.app",
  messagingSenderId: "720516753668",
  appId: "1:720516753668:web:ba8f9ac8d95b6a16c04851"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};

  self.registration.showNotification(
    data.title || "New message on CHATTIX",
    {
      body: data.body || "You received a new message.",
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      data: { url: data.url || "./" }
    }
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin)) {
          return client.focus();
        }
      }

      return self.clients.openWindow("./");
    })
  );
});

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});
