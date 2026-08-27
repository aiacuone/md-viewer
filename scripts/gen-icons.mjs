import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

function crc32(buf) {
	let c = ~0;
	for (let i = 0; i < buf.length; i++) {
		c ^= buf[i];
		for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
	}
	return ~c >>> 0;
}

function chunk(type, data) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const typeBuf = Buffer.from(type);
	const crcBuf = Buffer.alloc(4);
	crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
	return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function png(size, rgb = [126, 182, 255]) {
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr[8] = 8;
	ihdr[9] = 2;
	const rows = [];
	for (let y = 0; y < size; y++) {
		const r = Buffer.alloc(1 + size * 3);
		r[0] = 0;
		for (let x = 0; x < size; x++) {
			const edge = x < size * 0.12 || y < size * 0.12 || x > size * 0.88 || y > size * 0.88;
			const i = 1 + x * 3;
			if (edge) {
				r[i] = 14;
				r[i + 1] = 16;
				r[i + 2] = 20;
			} else {
				r[i] = rgb[0];
				r[i + 1] = rgb[1];
				r[i + 2] = rgb[2];
			}
		}
		rows.push(r);
	}
	const idat = deflateSync(Buffer.concat(rows));
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk('IHDR', ihdr),
		chunk('IDAT', idat),
		chunk('IEND', Buffer.alloc(0))
	]);
}

writeFileSync('static/pwa-192.png', png(192));
writeFileSync('static/pwa-512.png', png(512));
console.log('Wrote PWA icons');
