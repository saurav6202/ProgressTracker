const jwt = require('jsonwebtoken');
const key = process.env.JWT_SECRET;

function createAccessToken(user) {
    return jwt.sign({ id: user._id }, key, { expiresIn: "15m" });
}

function createRefreshToken(user) {
    return jwt.sign({ id: user._id }, key, { expiresIn: "365d" });
}

function decodeUserToken(token) {
    return jwt.verify(token, key);
}

function setAuthCookies(res, user) {
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 15 * 60 * 1000 // 15 min
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
    });
}

module.exports = {
    createAccessToken,
    createRefreshToken,
    decodeUserToken,
    setAuthCookies
};