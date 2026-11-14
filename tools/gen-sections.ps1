# Generates our own pictures for the saber room, the Mandalorian page and the dark side page, with the local generator.
# Raw outputs go to app/assets/gen/raw; tools/sections.py turns them into what the page uses.
# Usage: .\tools\gen-sections.ps1            (everything missing)
#        .\tools\gen-sections.ps1 -Only camp (one picture, regenerated)
param([string]$Only = "", [int]$Seed = -1)

$gen = "C:\Users\coren\AI\image-gen"
$exe = Join-Path $gen "bin\sd-cli.exe"
$out = Join-Path $PSScriptRoot "..\app\assets\gen\raw"
New-Item -ItemType Directory -Force $out | Out-Null

$film = "Ultra detailed cinematic film still, photorealistic, 16:9, anamorphic lens, film grain. No text, no logos, no watermark."
$hilt = "Studio product photograph on a pure black seamless background. A single lightsaber hilt with NO blade, lying perfectly horizontally across the middle of the frame, emitter end on the RIGHT, pommel end on the LEFT, seen exactly side-on, the whole hilt visible with black space around it. The hilt is a short handheld machined metal cylinder, the size of a flashlight. Soft key light from above, thin cool rim light, sharp focus, fine scratches and wear, photorealistic. No hands, no blade, no glow, no text."

$jobs = [ordered]@{
  # name = @(width, height, prompt)
  camp    = @(1536, 864, "$film A camp at night on a rocky desert planet under a starry sky with a ringed planet. On the right of the frame a small campfire on the sand, bright orange flames and glowing embers, lighting the rocks around. Seated beside the fire, seen from the side, a lone bounty hunter in battered silver beskar armour plates over a dark flight suit, a T-visor helmet, a long brown cape. Left of centre, a small round floating hover pram like an egg-shaped metal pod, its lid open, a tiny green creature with big ears peeking out. In the left foreground a large flat dark stone slab, bare, catching the firelight. Cold blue night tones against the warm firelight. Top left of the frame dark empty sky.")
  bridge  = @(1536, 864, "$film The bridge of a huge wedge-shaped imperial star destroyer, interior, seen from inside the room. A wide panoramic band of tall slanted windows fills the upper middle of the frame from the left third to the right edge, divided by thick dark metal mullions; through the windows there is ONLY perfectly flat pure black, no stars, no planet, nothing. On the right, standing with his back to us in front of the windows, a tall dark lord in glossy black armour and a black helmet with a flared back, a long black cape. Grey metal floor and dark crew consoles in the lower part of the frame, cold grey-blue light, the room dim. The bottom left of the frame dark and calm.")
  view0   = @(1536, 864, "$film Seen from orbit just above, a volcanic planet: rivers of glowing orange lava between black rock ridges, a black fortress tower on a cliff over a lava fall, ash clouds lit orange from below, dark red sky.")
  view1   = @(1536, 864, "$film A planet-wide city at night seen from high above: endless skyscrapers glittering with warm lights to the horizon, streams of flying traffic, haze, a dark violet sky.")
  view2   = @(1536, 864, "$film Deep space: a gigantic unfinished spherical battle station under construction, its frame of girders open on one side, a few small grey wedge ships around it, a pale gas giant planet below, cold light.")
  view3   = @(1536, 864, "$film A tropical ocean planet seen from low orbit: turquoise lagoons, small palm-covered islands with white beaches, a faint shimmering energy shield in the sky, bright daylight and white clouds.")
  holo_s1   = @(576, 1024, "Portrait poster composition: a lone bounty hunter in silver beskar armour and a T-visor helmet, waist up, holding a long rifle across his chest, standing in a desert canyon, dramatic light, plain dark background behind, photorealistic, no text.")
  holo_s2   = @(576, 1024, "Portrait poster composition: a bounty hunter in silver beskar armour and T-visor helmet, waist up, carrying a tiny green creature with big ears in the crook of his arm, plain dark background, dramatic light, photorealistic, no text.")
  holo_s3   = @(576, 1024, "Portrait poster composition: a bounty hunter in silver beskar armour and T-visor helmet with a jetpack, flying upward, cape trailing, plain dark background, dramatic light, photorealistic, no text.")
  holo_film = @(576, 1024, "Portrait poster composition: a bounty hunter in silver beskar armour and T-visor helmet walking toward the camera beside a tiny green creature with big ears, a starship behind them, plain dark background, dramatic light, photorealistic, no text.")
  hilt_kenobi = @(1024, 576, "$hilt Silver-grey hilt with black rubber T-track grip strips around the middle, a knurled ring pommel on the left, and on the right a cone-shaped emitter with small vent fins.")
  hilt_vader  = @(1024, 576, "$hilt Chrome hilt: a black ridged rubber grip on the left half, a small black clamp box with one red and one black button in the middle, and on the right a beveled angular chrome emitter shroud.")
  hilt_luke6  = @(1024, 576, "$hilt Matte black hilt: a silver emitter with small round vent holes on the right, a black body with a small control panel, and a rounded silver pommel on the left.")
  hilt_windu  = @(1024, 576, "$hilt Slender hilt of brushed gold electrum with polished silver bands, a black ridged grip on the left, a flared emitter on the right.")
  hilt_yoda   = @(1024, 576, "$hilt A very short stubby hilt, only three times as long as it is wide, brushed silver with black grip rings, a small rounded emitter on the right.")
  hilt_maul   = @(1024, 576, "$hilt A very long double-ended staff hilt, twice as long as a normal hilt, perfectly symmetrical, an emitter at BOTH the left and the right end, black body with ribbed silver sections and a plain middle grip.")
}

foreach ($n in $jobs.Keys) {
  if ($Only -and $n -ne $Only) { continue }
  $file = Join-Path $out "$n.png"
  if ((Test-Path $file) -and -not $Only) { continue }
  $w, $h, $p = $jobs[$n]
  $tmp = Join-Path $out "$n.tmp.png"
  & $exe --diffusion-model (Join-Path $gen "models\z_image_turbo-Q4_K.gguf") --vae (Join-Path $gen "models\ae.safetensors") `
    --llm (Join-Path $gen "models\Qwen3-4B-Instruct-2507-Q4_K_M.gguf") -p $p --cfg-scale 1.0 --steps 8 `
    -W $w -H $h -s $Seed --vae-tiling --fa -o $tmp 2>&1 | Out-Null
  if (Test-Path $tmp) { Move-Item -Force $tmp $file; Write-Output "OK $n" } else { Write-Output "FAILED $n" }
}
Write-Output "DONE"
