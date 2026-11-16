// Everything a user would want to change lives here.
// Logos come from proto/assets/logos.js (the real app logos, supplied locally, never versioned).

export const APPS = [
  { id: 'netflix', name: 'Netflix', pkg: 'com.netflix.ninja' },
  { id: 'disney', name: 'Disney+', pkg: 'com.disney.disneyplus' },
  { id: 'prime', name: 'Prime Video', pkg: 'com.amazon.amazonvideo.livingroom' },
  { id: 'canal', name: 'Canal+', pkg: 'com.canal.android.canal' },
  { id: 'youtube', name: 'YouTube', pkg: 'com.google.android.youtube.tv' },
  { id: 'max', name: 'HBO Max', pkg: 'com.wbd.stream' },
];

// The scenes, with the points the animations hang on (stage pixels, 1920x1080), measured on each picture.
export const SCENES = {
  jedi: {
    img: 'assets/gen/tatooine-plate-1920.jpg', label: 'Côté lumineux',
  },
  sith: {
    img: 'assets/gen/throne-fixed-1920.jpg', label: 'Côté obscur',
  },
  room: {
    img: 'assets/gen/hall-hd.jpg',
    ledge: 746,   // top of the marble display ledge
    floor: 858,   // where the polished floor starts (the blades reflect in it)
  },
};

// The saber room: one lightsaber per film(key = hilt picture, c = blade colour).
export const SABERS = [
  { key: 'maul', ep: 'I', t: 'La Menace fantôme', who: 'Le sabre de Dark Maul', c: '255,46,46', dbl: true },
  { key: 'yoda', ep: 'II', t: "L'Attaque des clones", who: 'Le sabre de Yoda', c: '60,255,100', bl: 0.7 },
  { key: 'windu', ep: 'III', t: 'La Revanche des Sith', who: 'Le sabre de Mace Windu', c: '184,84,255' },
  { key: 'kenobi', ep: 'IV', t: 'Un nouvel espoir', who: "Le sabre d'Obi-Wan Kenobi", c: '64,140,255' },
  { key: 'vader', ep: 'V', t: "L'Empire contre-attaque", who: 'Le sabre de Dark Vador', c: '255,46,46' },
  { key: 'luke6', ep: 'VI', t: 'Le Retour du Jedi', who: 'Le sabre de Luke Skywalker', c: '60,255,100' },
];
