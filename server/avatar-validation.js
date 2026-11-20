const MAX_CUSTOM_AVATAR_BYTES = 180 * 1024;
const MAX_CUSTOM_AVATAR_DATA_URL_LENGTH = Math.ceil(MAX_CUSTOM_AVATAR_BYTES / 3) * 4 + 32;

function isImageSignature(image, mimeType) {
    if (mimeType === 'image/png') {
        return image.length >= 8 &&
            image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (mimeType === 'image/jpeg') {
        return image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
    }
    if (mimeType === 'image/webp') {
        return image.length >= 12 &&
            image.toString('ascii', 0, 4) === 'RIFF' &&
            image.toString('ascii', 8, 12) === 'WEBP';
    }
    return false;
}

function validateCustomAvatarDataUrl(value) {
    if (typeof value !== 'string' || value.length > MAX_CUSTOM_AVATAR_DATA_URL_LENGTH) {
        return null;
    }

    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match) {
        return null;
    }

    const image = Buffer.from(match[2], 'base64');
    if (!image.length || image.length > MAX_CUSTOM_AVATAR_BYTES ||
        image.toString('base64') !== match[2] || !isImageSignature(image, match[1])) {
        return null;
    }

    return value;
}

module.exports = {
    validateCustomAvatarDataUrl,
    MAX_CUSTOM_AVATAR_BYTES,
    MAX_CUSTOM_AVATAR_DATA_URL_LENGTH
};
