# Generates one photorealistic hilt per episode with the local generator (free), on black, vertical.
$gen = "C:\Users\coren\AI\image-gen\generate.ps1"
$out = Join-Path $PSScriptRoot "..\proto\assets\gen\hilts"
$base = "Studio product photograph of a single lightsaber hilt with no blade, standing perfectly vertical and straight, emitter at the top, pommel at the bottom, centered, filling 80 percent of the frame height, seen straight from the front, on a pure black seamless background, soft studio key light from the left and a thin cool rim light on the right, photorealistic machined metal, fine scratches and wear, sharp focus, no text, no hands, no blade, no glow."
$hilts = [ordered]@{
  vader  = "Black and chrome hilt: a ridged black rubber grip, a chrome body, a small black control box with red and black buttons, and a beveled angular chrome shroud emitter at the top."
  luke   = "Matte black hilt with a thin silver ring in the middle, a black control box with a small red button, and a short vented silver emitter at the top."
  anakin = "Chrome camera-flash style hilt: a grip made of black rubber T-track ridges, a red activation button on a clamp, and a flared bell-shaped chrome emitter at the top."
  obiwan = "Silver hilt with a black ridged grip, small brass details, and a flared emitter with thin vertical vents at the top."
  windu  = "Slender hilt of polished gold-coloured electrum and silver, a gold ridged grip, a small black activation plate."
  kylo   = "Crude battered black iron hilt with a crossguard: two short vented quillons sticking out sideways near the top, exposed wiring, rough welds."
  rey    = "Hilt made from a scavenged staff segment: tan leather wrapping, brass collars, a weathered bronze emitter."
  maul   = "Long double-ended staff hilt with an emitter at each end, black ridged grip sections and a silver central section, twice as long as a normal hilt."
}
foreach ($k in $hilts.Keys) {
  $file = Join-Path $out "$k.png"
  if (Test-Path $file) { continue }
  & $gen -Prompt "$base $($hilts[$k])" -Format reel -Out $file | Select-Object -Last 1
}
