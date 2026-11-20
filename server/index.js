require('dotenv').config();

const path = require('node:path');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const {
    SteamOpenIdStrategy,
    SteamOpenIdError,
    SteamOpenIdErrorType
} = require('passport-steam-openid');
const PgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const {
    pool,
    initializeDatabase,
    findOrCreateProfile,
    getProfile,
    updateProfileMmr,
    updateProfileAvatar,
    getHeroProgress,
    saveHeroProgress,
    deleteHeroProgress,
    recordOpenIdNonce
} = require('./db');
const { isValidSteamId, isValidOpenIdNonce } = require('./steam-id');
const { createSteamLoginState, consumeSteamLoginState } = require('./login-state');
const { fetchSteamProfile } = require('./steam-profile');
const {
    validateHeroProgress,
    isValidHeroProgressId
} = require('./hero-progress');
const { isValidMmr } = require('./validation');
const { validateCustomAvatarDataUrl } = require('./avatar-validation');

const app = express();
const port = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET;
const databaseUrl = process.env.DATABASE_URL;
const steamApiKey = process.env.STEAM_API_KEY;
const configuredBaseUrl = process.env.BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${port}`;

function normalizeBaseUrl(value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        throw new Error('BASE_URL must be an absolute HTTP(S) origin without a path.');
    }

    if (!['http:', 'https:'].includes(url.protocol) ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
        throw new Error('BASE_URL must be an absolute HTTP(S) origin without a path.');
    }
    return url.origin;
}

const baseUrl = normalizeBaseUrl(configuredBaseUrl);

if (!sessionSecret || sessionSecret.trim() !== sessionSecret || sessionSecret.length < 32 ||
    sessionSecret === 'replace-with-a-long-random-secret') {
    throw new Error('SESSION_SECRET must be a randomly generated value of at least 32 characters.');
}
if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.');
}
if (isProduction && !baseUrl.startsWith('https://')) {
    throw new Error('BASE_URL must use HTTPS in production.');
}

if (isProduction) {
    app.set('trust proxy', 1);
}

app.disable('x-powered-by');
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https://avatars.steamstatic.com', 'https://steamcdn-a.akamaihd.net', 'https://steamcommunity.akamaihd.net'],
            fontSrc: ["'self'", 'data:'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"]
        }
    }
}));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(session({
    name: 'dota.sid',
    store: new PgSession({
        pool,
        tableName: 'user_sessions',
        createTableIfMissing: true
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 14 * 24 * 60 * 60 * 1000
    }
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((profile, done) => done(null, profile.steam_id));
passport.deserializeUser(async (steamId, done) => {
    try {
        const profile = await getProfile(steamId);
        return done(null, profile || false);
    } catch (error) {
        return done(error);
    }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false
});
const profileLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false
});

function requireAuthentication(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({ error: 'Требуется вход через Steam.' });
}

function requireSameOrigin(req, res, next) {
    const origin = req.get('origin');
    if (origin !== baseUrl) {
        return res.status(403).json({ error: 'Запрос отклонён.' });
    }
    return next();
}

function preventCaching(req, res, next) {
    res.set('Cache-Control', 'no-store');
    return next();
}

app.put(
    '/api/me/avatar',
    preventCaching,
    profileLimiter,
    requireAuthentication,
    requireSameOrigin,
    express.json({ limit: '260kb' }),
    async (req, res, next) => {
        const avatarDataUrl = req.body && req.body.avatarDataUrl;
        if (avatarDataUrl !== null && !validateCustomAvatarDataUrl(avatarDataUrl)) {
            return res.status(400).json({
                error: 'Выберите изображение PNG, JPEG или WebP размером не больше 180 КБ.'
            });
        }

        try {
            const profile = await updateProfileAvatar(req.user.steam_id, avatarDataUrl);
            if (!profile) {
                return res.status(404).json({ error: 'Профиль не найден. Войдите через Steam ещё раз.' });
            }
            return res.json({ profile: serializeProfile(profile) });
        } catch (error) {
            return next(error);
        }
    }
);

app.use(express.json({ limit: '10kb' }));

function createSteamOpenIdStrategy(returnURL) {
    return new SteamOpenIdStrategy({
        returnURL,
        profile: false,
        maxNonceTimeDelay: 600
    }, async (req, steamId, steamProfile, done) => {
        const nonce = req.query['openid.response_nonce'];
        if (!isValidSteamId(steamId)) {
            return done(new SteamOpenIdError(
                'Steam returned an invalid account identifier.',
                SteamOpenIdErrorType.InvalidSteamId
            ));
        }
        if (!isValidOpenIdNonce(nonce)) {
            return done(new SteamOpenIdError(
                'Steam returned an invalid or expired nonce.',
                SteamOpenIdErrorType.NonceExpired
            ));
        }

        try {
            await recordOpenIdNonce(nonce);
            let publicSteamProfile = null;
            if (steamApiKey) {
                try {
                    publicSteamProfile = await fetchSteamProfile(steamId, steamApiKey);
                } catch {
                    console.warn('Unable to refresh public Steam profile details; login will continue.');
                }
            }
            return done(null, await findOrCreateProfile(steamId, publicSteamProfile));
        } catch (error) {
            if (error.code === '23505') {
                return done(new SteamOpenIdError(
                    'Steam nonce has already been used.',
                    SteamOpenIdErrorType.Unauthorized
                ));
            }
            return done(error);
        }
    });
}

function authenticateSteam(req, res, next, state) {
    const strategy = createSteamOpenIdStrategy(`${baseUrl}/auth/steam/${state}`);
    const authenticate = passport.authenticate(strategy, (error, profile) => {
        if (error) {
            if (error instanceof SteamOpenIdError) {
                return res.redirect('/?login=failed');
            }
            return next(error);
        }
        if (!profile) {
            return res.redirect('/?login=failed');
        }
        return req.logIn(profile, { keepSessionInfo: true }, loginError => {
            if (loginError) {
                return next(loginError);
            }
            return res.redirect('/');
        });
    });
    return authenticate(req, res, next);
}

function serializeProfile(profile) {
    return {
        steamId: profile.steam_id,
        steamProfileUrl: `https://steamcommunity.com/profiles/${profile.steam_id}`,
        personaName: profile.steam_persona_name,
        avatarUrl: profile.steam_avatar_url,
        customAvatarDataUrl: profile.custom_avatar_data_url,
        currentMmr: profile.current_mmr,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
    };
}

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.get('/auth/steam/:state?', preventCaching, loginLimiter, (req, res, next) => {
    const state = req.params.state;
    let loginState;
    if (state) {
        if (!consumeSteamLoginState(req.session, state)) {
            return res.redirect('/?login=failed');
        }
        const openIdMode = req.query['openid.mode'];
        if (openIdMode !== 'id_res') {
            return res.redirect(openIdMode === 'cancel' ? '/?login=cancelled' : '/?login=failed');
        }
        loginState = state;
    } else {
        loginState = createSteamLoginState(req.session);
    }

    req.session.save(error => {
        if (error) {
            return next(error);
        }
        return authenticateSteam(req, res, next, loginState);
    });
});

app.post('/auth/logout', preventCaching, requireAuthentication, requireSameOrigin, (req, res, next) => {
    req.logout(error => {
        if (error) {
            return next(error);
        }
        req.session.destroy(sessionError => {
            if (sessionError) {
                return next(sessionError);
            }
            res.clearCookie('dota.sid', {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'lax',
                path: '/'
            });
            return res.status(204).end();
        });
    });
});

app.get('/api/me', preventCaching, requireAuthentication, (req, res) => {
    res.json({ profile: serializeProfile(req.user) });
});

app.put('/api/me/mmr', preventCaching, profileLimiter, requireAuthentication, requireSameOrigin, async (req, res, next) => {
    if (!isValidMmr(req.body.mmr)) {
        return res.status(400).json({ error: 'MMR должен быть целым числом от 0 до 100000.' });
    }

    try {
        const profile = await updateProfileMmr(req.user.steam_id, req.body.mmr);
        if (!profile) {
            return res.status(404).json({ error: 'Профиль не найден. Войдите через Steam ещё раз.' });
        }
        return res.json({ profile: serializeProfile(profile) });
    } catch (error) {
        return next(error);
    }
});

app.get('/api/me/heroes', preventCaching, profileLimiter, requireAuthentication, async (req, res, next) => {
    try {
        const heroes = await getHeroProgress(req.user.steam_id);
        return res.json({ heroes });
    } catch (error) {
        return next(error);
    }
});

app.post('/api/me/heroes', preventCaching, profileLimiter, requireAuthentication, requireSameOrigin, async (req, res, next) => {
    const progress = validateHeroProgress(req.body);
    if (!progress) {
        return res.status(400).json({
            error: 'Укажите имя героя, уровень от 0 до 30 и корректный набранный опыт.'
        });
    }

    try {
        const hero = await saveHeroProgress(req.user.steam_id, progress);
        return res.json({ hero });
    } catch (error) {
        return next(error);
    }
});

app.delete('/api/me/heroes/:heroId', preventCaching, profileLimiter, requireAuthentication, requireSameOrigin, async (req, res, next) => {
    if (!isValidHeroProgressId(req.params.heroId)) {
        return res.status(400).json({ error: 'Некорректный идентификатор героя.' });
    }

    try {
        const deleted = await deleteHeroProgress(req.user.steam_id, req.params.heroId);
        if (!deleted) {
            return res.status(404).json({ error: 'Герой не найден в вашем профиле.' });
        }
        return res.status(204).end();
    } catch (error) {
        return next(error);
    }
});

app.use(express.static(path.join(__dirname, '..', 'public'), {
    dotfiles: 'deny',
    index: 'index.html',
    maxAge: isProduction ? '1h' : 0,
    setHeaders(res, filePath) {
        if (/\.(?:html|css|js)$/i.test(filePath)) {
            res.set('Cache-Control', 'no-cache');
        }
    }
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'API-маршрут не найден.' }));

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }
    if (error.type === 'entity.too.large') {
        const message = req.path === '/api/me/avatar'
            ? 'Изображение аватара слишком большое.'
            : 'Размер запроса слишком большой.';
        return res.status(413).json({ error: message });
    }
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Некорректный формат запроса.' });
    }
    console.error('Request failed:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
});

async function start() {
    await initializeDatabase();
    app.listen(port, () => {
        console.log(`Dota MMR Tracker is listening on port ${port}`);
    });
}

start().catch(async error => {
    console.error('Server startup failed:', error);
    await pool.end();
    process.exitCode = 1;
});
