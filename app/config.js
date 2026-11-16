// Star Wars TV's settings (set up for France): the apps in the cockpit and where the films and series open.
// On the TV, the Customise panel (Up in the cockpit, then OK) changes these and keeps its own copy; this file is the
// starting point for a new install, and the one to edit before you build. PROMPT.md fills it in for you.
window.STARWARS = {
  // Open the Customise panel by itself the first time Star Wars TV starts, so someone who only installed the APK can pick
  // their own apps and service on the TV. Set it to false when this file is already set up for the TV (PROMPT.md does):
  // the panel then waits until someone presses Up in the cockpit.
  askOnFirstRun: false,                         // the dock below is already set up for France

  // Up to six, left to right. `pkg` is an app's package name, or "input:<name>" for an HDMI port: the port whose
  // HDMI-CEC device name contains <name> (or whose TV input id is exactly <name>). Anything not on the TV is skipped.
  dock: [                                       // France: the usual streaming apps
    { pkg: "com.netflix.ninja", label: "Netflix" },
    { pkg: "com.disney.disneyplus", label: "Disney+" },
    { pkg: "com.amazon.amazonvideo.livingroom", label: "Prime Video" },
    { pkg: "com.canal.android.canal", label: "Canal+" },
    { pkg: "com.google.android.youtube.tv", label: "YouTube" },
    { pkg: "com.wbd.stream", label: "HBO Max" },
  ],

  // Where OK on a lightsaber, a bounty puck or a place through the bridge's windows takes you:
  //   an app's package: straight to the title if `links` below has it for that app, else that app's own search
  //   "search":         the TV's own search, which shows where each title streams in your country
  // If the app isn't installed, the TV's search is used.
  films: "com.disney.disneyplus",               // France: every Star Wars title is on Disney+

  // Direct links to each title, per app, keyed by the title as Star Wars TV names it. Each is opened in that app with an
  // ordinary "view this link" request, so use the links the app's own website gives. A season opens at its first episode.
  // Add a block for your service and set `films` to its package.
  links: {                                    // France, checked on JustWatch on 16 November 2026
    "com.disney.disneyplus": {                 // Disney+ (subscription): every film and series. A series opens on its page.
      "The Phantom Menace": "https://www.disneyplus.com/browse/entity-e0a9fee4-2959-4077-ad8c-8fab4fd6e4d1",
      "Attack of the Clones": "https://www.disneyplus.com/browse/entity-39cbdf17-1bbe-4de2-b4a4-8e342875c2c6",
      "Revenge of the Sith": "https://www.disneyplus.com/browse/entity-eb1e2c5f-69bf-4240-a61f-7ffc4e0311b3",
      "A New Hope": "https://www.disneyplus.com/browse/entity-9a280e53-fcc0-4e17-a02c-b1f40913eb0b",
      "The Empire Strikes Back": "https://www.disneyplus.com/browse/entity-0f5c5223-f4f6-46ef-ba8a-69cb0e17d8d3",
      "Return of the Jedi": "https://www.disneyplus.com/browse/entity-4b6e7cda-daa5-4f2d-9b61-35bbe562c69c",
      "The Mandalorian, Season 1": "https://www.disneyplus.com/browse/entity-422f6dcc-226f-44e7-98d4-22de69b31cf3",
      "The Mandalorian, Season 2": "https://www.disneyplus.com/browse/entity-422f6dcc-226f-44e7-98d4-22de69b31cf3",
      "The Mandalorian, Season 3": "https://www.disneyplus.com/browse/entity-422f6dcc-226f-44e7-98d4-22de69b31cf3",
      "Obi-Wan Kenobi": "https://www.disneyplus.com/browse/entity-e28eab5e-5cff-4ef2-b018-d2267c750364",
      "Andor, Season 1": "https://www.disneyplus.com/browse/entity-faba988a-a9f5-45f2-a074-0775a7d6f67a",
      "Andor, Season 2": "https://www.disneyplus.com/browse/entity-faba988a-a9f5-45f2-a074-0775a7d6f67a",
      "Rogue One: A Star Wars Story": "https://www.disneyplus.com/browse/entity-5ec74210-f970-42b7-a39f-8653c0a9eab8",
    },
    "com.amazon.amazonvideo.livingroom": {     // Prime Video: to rent or buy (not in the subscription)
      "The Phantom Menace": "https://app.primevideo.com/detail?gti=amzn1.dv.gti.1aa9f758-e2af-1e1f-3347-09c3d630331b",
      "Attack of the Clones": "https://app.primevideo.com/detail?gti=amzn1.dv.gti.f0a9f71b-2e9e-ba78-d13d-63abd86514d5",
      "Revenge of the Sith": "https://app.primevideo.com/detail?gti=amzn1.dv.gti.3cb80b5c-9aa1-451a-bc1c-aebea5fa962b",
      "A New Hope": "https://app.primevideo.com/detail?gti=amzn1.dv.gti.50bc6424-b6fb-1d7a-28ee-1c5cf662577a",
      "The Empire Strikes Back": "https://app.primevideo.com/detail?gti=amzn1.dv.gti.9ab80b48-1e50-9cec-c3ae-e9aac98665ff",
      "Return of the Jedi": "https://app.primevideo.com/detail?gti=amzn1.dv.gti.6cb80b6a-1d14-cb51-ef85-2dbeba5d86a9",
      "Rogue One: A Star Wars Story": "https://app.primevideo.com/detail?gti=amzn1.dv.gti.84b867f1-8e05-4420-bd25-40b0a9d89e01",
      "The Mandalorian and Grogu": "https://app.primevideo.com/detail?gti=amzn1.dv.gti.2c6fae46-947a-4424-94fd-2e7aad5637c5",
    },
  },

  // what each service is called under its logo when a title is on several
  services: {
    "com.disney.disneyplus": { id: "disney", name: "Disney+", note: "avec l'abonnement" },
    "com.amazon.amazonvideo.livingroom": { id: "prime", name: "Prime Video", note: "location ou achat" },
  },
};
