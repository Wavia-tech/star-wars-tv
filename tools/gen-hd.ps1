# Generates the scenery in HD with the local generator (Z-Image-Turbo, stable-diffusion.cpp).
# Tries 1920x1088; if the graphics memory refuses, falls back to 1536x864.
# Usage: .\tools\gen-hd.ps1 -Name throne   (or sunset, hall, all)
param([string]$Name = "all", [int]$Seed = -1)

$gen = "C:\Users\coren\AI\image-gen"
$out = Join-Path $PSScriptRoot "..\proto\assets\gen"
$exe = Join-Path $gen "bin\sd-cli.exe"

$prompts = [ordered]@{
  throne = "Ultra detailed cinematic film still, photorealistic, 16:9. The Emperor's throne room at the top of a giant battle station in space. Camera placed directly BEHIND a tall dark angular throne: we see the high back of the throne in the lower centre of the frame, and over its edge the hood of a figure in a heavy black robe, his right arm stretched out to the side with fingers spread. In front of him a huge circular window divided by thick radial metal spokes fills the upper two thirds of the frame; through it a green forest moon and a raging space battle: large wedge-shaped grey star destroyers, long rounded rebel cruisers, tiny starfighters, orange explosions. A dark metal staircase rises in the middle distance toward the window. Two guards in long crimson robes and smooth crimson helmets stand motionless, one at each side of the stairs. Polished black floor with reflections, cold grey-blue light from the window, deep shadows. No text, no logos. Bottom fifth of the image dark and calm."
  sunset = "Ultra detailed cinematic film still, photorealistic, 16:9. Desert planet at dusk: TWO suns side by side low above the horizon, a larger pale yellow-white sun and a slightly smaller deep orange sun just beside it, both clearly visible as two separate discs, huge warm orange and violet sky, a few thin high streaks of haze. Endless rolling sand dunes. On the left third, seen strictly from behind, a young man in his late teens with sandy hair, wearing a loose off-white farm tunic with wide sleeves and light trousers, standing on a low ridge looking at the two suns, his shadow long behind him. Tall slim grey metal moisture vaporator towers with small round tops stand in the sand around. On the right, the rounded sandstone dome entrance of an underground farm homestead. Far away on the horizon, a tiny giant rusty tracked desert crawler. Warm heat haze, nostalgic, quiet. No text, no logos. Bottom fifth of the image calm dark sand in shadow."
  hall = "Ultra detailed cinematic film still, photorealistic, 16:9. A long ceremonial hall inside an ancient temple of warrior monks, at night, straight-on symmetrical camera. Tall fluted stone columns on both sides, beams of cool moonlight falling through tall narrow windows, and at the far end a large opening onto a glowing city of endless skyscrapers with streams of flying traffic. Polished dark stone floor with soft reflections. Across the lower middle of the frame, a long horizontal dark stone display ledge runs the full width of the image at about 70 percent of the image height, completely bare, nothing on it. Floating dust in the moonbeams, calm, sacred, cold blue and silver palette with deep shadows. No people, no objects on the ledge, no text, no logos."
}

$names = if ($Name -eq "all") { $prompts.Keys } else { @($Name) }
foreach ($n in $names) {
  $file = Join-Path $out "$n.png"
  foreach ($size in @(@(1920, 1088), @(1536, 864))) {
    $tmp = Join-Path $out "$n.tmp.png"
    if (Test-Path $tmp) { Remove-Item $tmp }
    & $exe --diffusion-model (Join-Path $gen "models\z_image_turbo-Q4_K.gguf") --vae (Join-Path $gen "models\ae.safetensors") `
      --llm (Join-Path $gen "models\Qwen3-4B-Instruct-2507-Q4_K_M.gguf") -p $prompts[$n] --cfg-scale 1.0 --steps 8 `
      -W $size[0] -H $size[1] -s $Seed --vae-tiling --fa -o $tmp 2>&1 | Select-Object -Last 2
    if (Test-Path $tmp) { Move-Item -Force $tmp $file; Write-Output "OK $n $($size[0])x$($size[1])"; break }
    Write-Output "FAILED $n at $($size[0])x$($size[1])"
  }
}
