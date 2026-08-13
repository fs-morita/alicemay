// 素材（.raw/）を Web 用に変換して assets/ と video/ に書き出す。
// このマシンには ffmpeg / cwebp が入っていないため、sudo 不要な npm パッケージで代替している。
//   sharp        … 画像のリサイズと webp/jpg 変換
//   ffmpeg-static … 動画の軽量化とポスターフレーム抽出
//
//   npm run optimize
//
// .raw/ は公開対象外（.gitignore 済み）。元データを差し替えたらこれを再実行する。

import { execFile } from 'node:child_process'
import { mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import ffmpeg from 'ffmpeg-static'
import sharp from 'sharp'

const run = promisify(execFile)
const root = path.resolve(import.meta.dirname, '..')
const raw = path.join(root, '.raw')

const IMAGES = path.join(root, 'assets/images')
const WORKS = path.join(IMAGES, 'works')
const VIDEO = path.join(root, 'video')

// 生成画像 → セクション用の webp。[元ファイル, 出力先, 幅, 高さ]
const STILLS = [
  ['gen-03.png', 'about.webp', 1200, 884],
  ['gen-04.png', 'feature-embroidery.webp', 800, 800],
  ['gen-05.png', 'feature-water.webp', 800, 800],
  ['gen-06.png', 'feature-fabric.webp', 800, 800],
]

// ヒーロー動画。ポスターは1本目の先頭フレームから起こす。
const CLIPS = ['vid-01.mp4', 'vid-02.mp4']

async function kb(file) {
  return Math.round((await stat(file)).size / 1024)
}

async function buildStills() {
  for (const [src, out, w, h] of STILLS) {
    const dest = path.join(IMAGES, out)
    await sharp(path.join(raw, src))
      .resize(w, h, { fit: 'cover' })
      .webp({ quality: 82 })
      .toFile(dest)
    console.log(`still   ${out.padEnd(26)} ${w}x${h}  ${await kb(dest)}KB`)
  }

  // OGP は webp 非対応のクローラが残っているため jpg で書き出す。
  const og = path.join(IMAGES, 'og.jpg')
  await sharp(path.join(raw, 'gen-07.png'))
    .resize(1200, 630, { fit: 'cover' })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(og)
  console.log(`still   ${'og.jpg'.padEnd(26)} 1200x630  ${await kb(og)}KB`)
}

async function buildWorks() {
  const dir = path.join(raw, 'creema')
  const files = (await readdir(dir)).filter((f) => f.endsWith('.jpg')).sort()

  for (const file of files) {
    const out = file.replace(/\.jpg$/, '.webp')
    const dest = path.join(WORKS, out)
    await sharp(path.join(dir, file))
      .resize(800, 800, { fit: 'cover', position: 'centre' })
      .webp({ quality: 80 })
      .toFile(dest)
    console.log(`work    ${out.padEnd(26)} 800x800   ${await kb(dest)}KB`)
  }
}

async function buildVideos() {
  for (const [i, src] of CLIPS.entries()) {
    const name = `hero-0${i + 1}.mp4`
    const dest = path.join(VIDEO, name)

    // 960px 幅 / 無音 / faststart。CRF 32 で 5秒あたり 300KB 以下に収まる。
    await run(ffmpeg, [
      '-y', '-loglevel', 'error',
      '-i', path.join(raw, src),
      '-an',
      '-vf', 'scale=960:-2',
      '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p',
      '-crf', '32', '-preset', 'slow',
      '-movflags', '+faststart',
      dest,
    ])
    console.log(`video   ${name.padEnd(26)} 960w      ${await kb(dest)}KB`)
  }

  // 1本目の先頭フレームをポスターに。動画が読み込まれるまでこれが表示される。
  const frame = path.join(raw, 'poster-frame.png')
  await run(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-i', path.join(raw, CLIPS[0]),
    '-frames:v', '1',
    frame,
  ])

  const poster = path.join(IMAGES, 'hero-poster.webp')
  await sharp(frame).resize(960, 720, { fit: 'cover' }).webp({ quality: 82 }).toFile(poster)
  console.log(`poster  ${'hero-poster.webp'.padEnd(26)} 960x720   ${await kb(poster)}KB`)
}

for (const dir of [IMAGES, WORKS, VIDEO]) await mkdir(dir, { recursive: true })

await buildStills()
await buildWorks()
await buildVideos()
