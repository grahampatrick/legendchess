import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * Apple touch icon: the same board knight on brand green as icon.svg,
 * rendered to PNG at build/request time (iOS ignores SVG favicons).
 */
export default async function AppleIcon() {
  const svg = await readFile(path.join(process.cwd(), 'src/app/icon.svg'), 'utf8');
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#7cb342',
      }}
    >
      <img src={dataUri} width={180} height={180} alt="" />
    </div>,
    size,
  );
}
