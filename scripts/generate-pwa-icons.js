const sharp = require('sharp');
const path = require('path');

const SRC = path.join(__dirname, '..', 'public', 'logo_main.png');
const OUT_DIR = path.join(__dirname, '..', 'public', 'icons');
const BG = '#FAF9F6'; // --color-hanji-white

// 원본 로고(2760x1504)에서 원형 엠블럼 부분만 잘라낸 좌표
const CROP = { left: 400, top: 355, width: 755, height: 755 };

async function main() {
  const emblem = sharp(SRC).extract(CROP);

  // "any" 아이콘: 엠블럼이 캔버스 전체를 거의 채움 (약 6% 여백)
  const anySizes = [192, 512];
  for (const size of anySizes) {
    const inner = Math.round(size * 0.94);
    await sharp({
      create: { width: size, height: size, channels: 3, background: BG },
    })
      .composite([
        {
          input: await emblem.clone().resize(inner, inner).toBuffer(),
          gravity: 'center',
        },
      ])
      .png()
      .toFile(path.join(OUT_DIR, `icon-${size}.png`));
  }

  // "maskable" 아이콘: OS가 원형/둥근사각형 등으로 마스킹해도 잘리지 않도록
  // 안전 영역(약 66%)만 채우고 나머지는 배경색 여백
  const maskableSizes = [192, 512];
  for (const size of maskableSizes) {
    const inner = Math.round(size * 0.66);
    await sharp({
      create: { width: size, height: size, channels: 3, background: BG },
    })
      .composite([
        {
          input: await emblem.clone().resize(inner, inner).toBuffer(),
          gravity: 'center',
        },
      ])
      .png()
      .toFile(path.join(OUT_DIR, `icon-maskable-${size}.png`));
  }

  // iOS 홈 화면 아이콘 (투명 배경 비권장 -> 배경색 채움)
  const appleSize = 180;
  const appleInner = Math.round(appleSize * 0.94);
  await sharp({
    create: { width: appleSize, height: appleSize, channels: 3, background: BG },
  })
    .composite([
      {
        input: await emblem.clone().resize(appleInner, appleInner).toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(OUT_DIR, `apple-touch-icon.png`));

  console.log('PWA icons generated in', OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
