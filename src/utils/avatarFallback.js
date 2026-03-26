const AVATAR_URLS = [
  '/avathars/Rectangle 2.png',
  '/avathars/Rectangle 2-1.png',
  '/avathars/Rectangle 2-2.png',
  '/avathars/Rectangle 2-3.png',
  '/avathars/Rectangle 2-4.png',
  '/avathars/Rectangle 2-5.png',
  '/avathars/Rectangle 2-6.png',
  '/avathars/Rectangle 2-7.png',
  '/avathars/Rectangle 2-8.png',
  '/avathars/Rectangle 2-9.png',
  '/avathars/Rectangle 2-10.png',
  '/avathars/Rectangle 2-11.png',
  '/avathars/Rectangle 2-12.png',
  '/avathars/Rectangle 2-13.png',
  '/avathars/Rectangle 2-14.png',
  '/avathars/Rectangle 2-15.png',
  '/avathars/Rectangle 2-16.png',
  '/avathars/Rectangle 2-17.png',
  '/avathars/Select Avatar=Avatar 8.png',
  '/avathars/Select Avatar=Avatar 9.png',
  '/avathars/Select Avatar=Avatar 10.png',
  '/avathars/Select Avatar=Avatar 11.png',
  '/avathars/Select Avatar=Avatar 14.png',
  '/avathars/Select Avatar=Avatar 15.png',
  '/avathars/Select Avatar=Avatar 16.png',
  '/avathars/Select Avatar=Avatar 17.png',
  '/avathars/Select Avatar=Avatar 20.png',
  '/avathars/Select Avatar=Avatar 21.png',
  '/avathars/Select Avatar=Avatar 22.png',
  '/avathars/Select Avatar=Avatar 23.png',
]

export function getRandomAvatarUrl() {
  const i = Math.floor(Math.random() * AVATAR_URLS.length)
  const raw = AVATAR_URLS[i] ?? AVATAR_URLS[0]
  // Many filenames contain spaces; ensure the URL is valid.
  return raw ? encodeURI(raw) : raw
}

