const test = require('node:test');
const assert = require('node:assert/strict');
const {
    validateCustomAvatarDataUrl,
    MAX_CUSTOM_AVATAR_BYTES
} = require('../server/avatar-validation');

function dataUrl(mimeType, bytes) {
    return `data:${mimeType};base64,${bytes.toString('base64')}`;
}

test('accepts supported image formats with matching file signatures', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    const webp = Buffer.from('RIFF0000WEBP', 'ascii');

    assert.ok(validateCustomAvatarDataUrl(dataUrl('image/png', png)));
    assert.ok(validateCustomAvatarDataUrl(dataUrl('image/jpeg', jpeg)));
    assert.ok(validateCustomAvatarDataUrl(dataUrl('image/webp', webp)));
});

test('rejects unsupported, malformed, and mismatched image data', () => {
    assert.equal(validateCustomAvatarDataUrl('data:image/svg+xml;base64,PHN2Zy8+'), null);
    assert.equal(validateCustomAvatarDataUrl('https://example.com/avatar.png'), null);
    assert.equal(validateCustomAvatarDataUrl(dataUrl('image/png', Buffer.from('not a PNG'))), null);
    assert.equal(validateCustomAvatarDataUrl(dataUrl('image/jpeg', Buffer.from([0x89, 0x50, 0x4e, 0x47]))), null);
    assert.equal(validateCustomAvatarDataUrl('data:image/jpeg;base64,not base64!'), null);
});

test('rejects avatar payloads larger than the storage limit', () => {
    const image = Buffer.alloc(MAX_CUSTOM_AVATAR_BYTES + 1);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(image);

    assert.equal(validateCustomAvatarDataUrl(dataUrl('image/png', image)), null);
});
