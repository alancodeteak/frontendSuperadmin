// src/utils/backgroundImages.js

const backgrounds = [
  "/backgroundImages/Background%201.png",
  "/backgroundImages/Background%202.png",
  "/backgroundImages/Background%203.png",
  "/backgroundImages/Background%204.png",
  "/backgroundImages/Background%205.png",
  "/backgroundImages/Background%206.png",
  "/backgroundImages/Background%209.png",
  "/backgroundImages/Background%2010.png",
  "/backgroundImages/Background%2012.png",
  "/backgroundImages/Background%2013.png",
  "/backgroundImages/Background%2021.png",
  "/backgroundImages/Background%2022.png",
  "/backgroundImages/Background%2027.png",
  "/backgroundImages/Background%2033.png",
  "/backgroundImages/Background%2043.png",
  "/backgroundImages/Background%2044.png",
]

export function getRandomBackgroundImage(seed = "") {
  if (!seed) {
    return backgrounds[Math.floor(Math.random() * backgrounds.length)]
  }

  let hash = 0

  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }

  return backgrounds[Math.abs(hash) % backgrounds.length]
}