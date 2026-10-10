import { pack, unpack } from 'msgpackr';
import * as ed25519 from '@noble/ed25519';
import { x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { randomBytes, concatBytes } from '@noble/hashes/utils.js';
import { chacha20poly1305, xchacha20poly1305 } from '@noble/ciphers/chacha.js';

export enum AeadChoice {
    AesGcm = 'AesGcm',
    ChaCha20Poly1305 = 'ChaCha20Poly1305',
    XChaCha20Poly1305 = 'XChaCha20Poly1305',
}

export type EncryptedMessage = {
    EphemeralPublicKey: Uint8Array;
    Nonce: Uint8Array;
    CipherText: Uint8Array;
    Tag: Uint8Array;
    Aead: AeadChoice;
};

export type Crypto25519Settings = {
    aeadChoice: AeadChoice;
};

const subtle = typeof window !== 'undefined' ? window.crypto.subtle : undefined;

const TagLength = 16;

/** A copy backed by a plain ArrayBuffer, the type WebCrypto takes. */
const buffer = (bytes: Uint8Array): Uint8Array<ArrayBuffer> =>
    new Uint8Array(bytes);

/** ciphertext || tag (noble AEAD output) as the two parts the box stores. */
const splitTag = (sealed: Uint8Array) => ({
    CipherText: sealed.slice(0, sealed.length - TagLength),
    Tag: sealed.slice(sealed.length - TagLength),
});

export class Crypto25519Service {
    private settings: Crypto25519Settings;

    constructor(settings?: Partial<Crypto25519Settings>) {
        this.settings = {
            aeadChoice: AeadChoice.ChaCha20Poly1305,
            ...(settings ?? {}),
        };
    }

    // ------------------ Key generation ------------------
    async generateEd25519KeyPair(): Promise<{
        PublicKey: Uint8Array;
        SecretKey: Uint8Array;
    }> {
        const secret = ed25519.utils.randomSecretKey();
        const pub = await ed25519.getPublicKeyAsync(secret);
        return { PublicKey: pub, SecretKey: secret };
    }

    generateX25519KeyPair(): { PublicKey: Uint8Array; SecretKey: Uint8Array } {
        const priv = x25519.utils.randomSecretKey();
        const pub = x25519.getPublicKey(priv);
        return { PublicKey: pub, SecretKey: priv };
    }

    // ------------------ Signatures ------------------
    async signDetached(
        message: Uint8Array,
        ed25519SecretKey: Uint8Array
    ): Promise<Uint8Array> {
        if (!message) throw new Error('message required');
        if (!ed25519SecretKey) throw new Error('ed25519SecretKey required');
        return await ed25519.signAsync(message, ed25519SecretKey);
    }

    async verifyDetached(
        message: Uint8Array,
        signature: Uint8Array,
        ed25519PublicKey: Uint8Array
    ): Promise<boolean> {
        if (!message) throw new Error('message required');
        if (!signature) throw new Error('signature required');
        if (!ed25519PublicKey) throw new Error('ed25519PublicKey required');
        return await ed25519.verifyAsync(signature, message, ed25519PublicKey);
    }

    // ------------------ Structured encrypt/decrypt ------------------
    async encryptForRecipientStructured(
        plaintext: Uint8Array,
        recipientX25519PublicKey: Uint8Array,
        aead?: AeadChoice
    ): Promise<{
        box: EncryptedMessage;
        ephemeralSenderPublicKey: Uint8Array;
    }> {
        if (!plaintext) throw new Error('plaintext required');
        if (!recipientX25519PublicKey)
            throw new Error('recipientX25519PublicKey required');

        // Ephemeral keypair
        const ephPriv = x25519.utils.randomSecretKey();
        const ephPub = x25519.getPublicKey(ephPriv);

        // Compute X25519 shared secret
        const shared = x25519.getSharedSecret(
            ephPriv,
            recipientX25519PublicKey
        ); // 32 bytes

        // Derive AEAD key with HKDF-SHA256
        const aeadKey = this.hkdfSha256(shared, undefined, undefined, 32);

        const choice = aead ?? this.settings.aeadChoice;

        if (choice === AeadChoice.AesGcm) {
            if (!subtle)
                throw new Error(
                    'WebCrypto SubtleCrypto is required for AES-GCM'
                );
            const nonce = randomBytes(12);
            const cryptoKey = await subtle.importKey(
                'raw',
                buffer(aeadKey),
                { name: 'AES-GCM' },
                false,
                ['encrypt']
            );
            const combined = new Uint8Array(
                await subtle.encrypt(
                    { name: 'AES-GCM', iv: buffer(nonce), tagLength: 128 },
                    cryptoKey,
                    buffer(plaintext)
                )
            );
            const box: EncryptedMessage = {
                EphemeralPublicKey: ephPub,
                Nonce: nonce,
                ...splitTag(combined),
                Aead: AeadChoice.AesGcm,
            };
            return { box, ephemeralSenderPublicKey: ephPub };
        }

        if (choice === AeadChoice.ChaCha20Poly1305) {
            const nonce = randomBytes(12);
            // ciphertext || tag; a cipher instance encrypts once (one nonce).
            const sealed = chacha20poly1305(aeadKey, nonce).encrypt(plaintext);
            const box: EncryptedMessage = {
                EphemeralPublicKey: ephPub,
                Nonce: nonce,
                ...splitTag(sealed),
                Aead: AeadChoice.ChaCha20Poly1305,
            };
            return { box, ephemeralSenderPublicKey: ephPub };
        }

        if (choice === AeadChoice.XChaCha20Poly1305) {
            const nonce24 = randomBytes(24);
            const sealed = xchacha20poly1305(aeadKey, nonce24).encrypt(
                plaintext
            );
            const box: EncryptedMessage = {
                EphemeralPublicKey: ephPub,
                Nonce: nonce24,
                ...splitTag(sealed),
                Aead: AeadChoice.XChaCha20Poly1305,
            };
            return { box, ephemeralSenderPublicKey: ephPub };
        }

        throw new Error(`AEAD ${choice} not supported`);
    }

    async decryptFromSenderStructured(
        box: EncryptedMessage,
        recipientX25519SecretKey: Uint8Array
    ): Promise<Uint8Array> {
        if (!box) throw new Error('box required');
        if (!recipientX25519SecretKey)
            throw new Error('recipientX25519SecretKey required');

        const shared = x25519.getSharedSecret(
            recipientX25519SecretKey,
            box.EphemeralPublicKey
        );
        const aeadKey = this.hkdfSha256(shared, undefined, undefined, 32);

        if (box.Aead === AeadChoice.AesGcm) {
            if (!subtle)
                throw new Error(
                    'WebCrypto SubtleCrypto is required for AES-GCM'
                );
            const cryptoKey = await subtle.importKey(
                'raw',
                buffer(aeadKey),
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );
            const combined = concatBytes(box.CipherText, box.Tag);
            try {
                return new Uint8Array(
                    await subtle.decrypt(
                        {
                            name: 'AES-GCM',
                            iv: buffer(box.Nonce),
                            tagLength: 128,
                        },
                        cryptoKey,
                        buffer(combined)
                    )
                );
            } catch {
                throw new Error('Decryption/authentication failed');
            }
        }

        if (box.Aead === AeadChoice.ChaCha20Poly1305) {
            if (box.Nonce.length !== 12)
                throw new Error('ChaCha20 nonce must be 12 bytes');
            return this.openChaCha(chacha20poly1305, aeadKey, box);
        }

        if (box.Aead === AeadChoice.XChaCha20Poly1305) {
            if (box.Nonce.length !== 24)
                throw new Error('XChaCha20 nonce must be 24 bytes');
            return this.openChaCha(xchacha20poly1305, aeadKey, box);
        }

        throw new Error(`Unsupported AEAD: ${box.Aead}`);
    }

    // ------------------ Serialization conveniences ------------------
    encryptToJson = async (
        plaintext: Uint8Array,
        recipientX25519PublicKey: Uint8Array,
        aead?: AeadChoice
    ): Promise<string> => {
        const { box } = await this.encryptForRecipientStructured(
            plaintext,
            recipientX25519PublicKey,
            aead
        );
        // Convert Uint8Array to arrays for JSON
        const obj = {
            EphemeralPublicKey: Array.from(box.EphemeralPublicKey),
            Nonce: Array.from(box.Nonce),
            CipherText: Array.from(box.CipherText),
            Tag: Array.from(box.Tag),
            Aead: box.Aead,
        };
        return JSON.stringify(obj);
    };

    decryptFromJson = async (
        json: string,
        recipientX25519SecretKey: Uint8Array
    ): Promise<Uint8Array> => {
        if (!json?.trim()) throw new Error('json required');
        const obj = JSON.parse(json);
        const box: EncryptedMessage = {
            EphemeralPublicKey: new Uint8Array(obj.EphemeralPublicKey),
            Nonce: new Uint8Array(obj.Nonce),
            CipherText: new Uint8Array(obj.CipherText),
            Tag: new Uint8Array(obj.Tag),
            Aead: obj.Aead,
        };
        return this.decryptFromSenderStructured(box, recipientX25519SecretKey);
    };

    encryptToMessagePack = async (
        plaintext: Uint8Array,
        recipientX25519PublicKey: Uint8Array,
        aead?: AeadChoice
    ): Promise<Uint8Array> => {
        const { box } = await this.encryptForRecipientStructured(
            plaintext,
            recipientX25519PublicKey,
            aead
        );
        // msgpackr accepts Uint8Array fields directly
        return pack(box) as Uint8Array;
    };

    decryptFromMessagePack = async (
        mp: Uint8Array,
        recipientX25519SecretKey: Uint8Array
    ): Promise<Uint8Array> => {
        const obj = unpack(mp) as any;
        const box: EncryptedMessage = {
            EphemeralPublicKey: new Uint8Array(obj.EphemeralPublicKey),
            Nonce: new Uint8Array(obj.Nonce),
            CipherText: new Uint8Array(obj.CipherText),
            Tag: new Uint8Array(obj.Tag),
            Aead: obj.Aead,
        };
        return this.decryptFromSenderStructured(box, recipientX25519SecretKey);
    };

    // ------------------ Sealed-box (anonymous) ------------------
    sealToRecipient = async (
        plaintext: Uint8Array,
        recipientX25519PublicKey: Uint8Array,
        aead?: AeadChoice
    ) => {
        const { box } = await this.encryptForRecipientStructured(
            plaintext,
            recipientX25519PublicKey,
            aead
        );
        return box;
    };

    unsealFromAnonymous = async (
        sealedBox: EncryptedMessage,
        recipientX25519SecretKey: Uint8Array
    ) => {
        return this.decryptFromSenderStructured(
            sealedBox,
            recipientX25519SecretKey
        );
    };

    // ------------------ Conversions ------------------
    convertEd25519SecretKeyToX25519(ed25519SecretKey: Uint8Array): Uint8Array {
        if (!ed25519SecretKey) throw new Error('ed25519SecretKey required');
        let seed: Uint8Array;
        if (ed25519SecretKey.length === 64)
            seed = ed25519SecretKey.slice(0, 32);
        else if (ed25519SecretKey.length === 32) seed = ed25519SecretKey;
        else throw new Error('Ed25519 secret must be 32 or 64 bytes');

        const h = sha512(seed);
        const scalar = new Uint8Array(h.slice(0, 32));
        scalar[0] &= 248;
        scalar[31] &= 127;
        scalar[31] |= 64; // clamp
        return scalar;
    }

    // ------------------ Helpers ------------------
    // noble's decrypt throws on a wrong key or a tampered box; one error for both.
    private openChaCha(
        cipher: typeof chacha20poly1305 | typeof xchacha20poly1305,
        key: Uint8Array,
        box: EncryptedMessage
    ): Uint8Array {
        try {
            return cipher(key, box.Nonce).decrypt(
                concatBytes(box.CipherText, box.Tag)
            );
        } catch {
            throw new Error('Decryption/authentication failed');
        }
    }

    private hkdfSha256(
        ikm: Uint8Array,
        salt: Uint8Array | undefined,
        info: Uint8Array | undefined,
        length: number
    ): Uint8Array {
        return hkdf(
            sha256,
            ikm,
            salt ?? new Uint8Array(),
            info ?? new Uint8Array(),
            length
        );
    }
}
