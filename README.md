# Star Wars TV (prototype)

Fan-made Android TV home screen by Wavia, in the same family as Poudlard TV. Work in progress.

## Prototype

```bash
node tools/serve.mjs proto 8766
```

Then open http://localhost:8766/index.html. Keys: ← → choose, ↓ ↑ change room, Enter open, C switch side.
Add `#sith` to start on the dark side, `#room` to start in the saber room.

- **Home**: one scene per side of the Force. Light side: the twin sunset on Tatooine (*A New Hope*), the chosen app sits
  in the suns' glow. Dark side: the Emperor's throne room (*Return of the Jedi*), his Force lightning strikes the chosen
  app. Opening an app: a blade cuts the screen.
- **The saber room**: one lightsaber per episode, in the colour of that film's saber. The chosen one rises and
  ignites, its light floods the room, and the title appears under it.

Everything moves from one `requestAnimationFrame` loop; sabers and lightning are drawn on canvas (no filters, no blend
modes, no video), so they stay smooth on a TV chip. Sounds are synthesised (no film audio).

## Pictures

`proto/assets/gen/` holds first drafts made with the local image generator. They will be replaced by final scenes.
No film stills, posters, official logos, Lucasfilm prop renders or film music are used.

## Licence

Part of the page's code is under the MIT licence (`app/LICENSE-kevin.txt`).
Star Wars and related names are trademarks of Lucasfilm Ltd.; this is an unofficial, non-commercial fan project.
