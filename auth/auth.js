const jwt = require('jsonwebtoken');
const { decodeUserToken, createAccessToken } = require("./utils");

module.exports = async function (req, res, next) {
    if (req.path.startsWith("/user/login") || req.path.startsWith("/user/signup")) {
        return next();
    }
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
        // Try refresh token
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) return res.redirect("/user/signup");

        try {
            const decoded = decodeUserToken(refreshToken);
            const newAccessToken = createAccessToken({ _id: decoded.id });

            // Reset access token cookie
            res.cookie("accessToken", newAccessToken, {
                httpOnly: true,
                secure: true,
                sameSite: "strict",
                maxAge: 15 * 60 * 1000
            });

            req.userId = decoded.id;
            return next();
        } catch(e) {
            console.log(e)
            return res.status(401).json({ message: "Invalid refresh token" });
        }
    } else {
        try {
            const decoded = await decodeUserToken(accessToken);
            req.userId = decoded.id;
            next();
        } catch(e) {
            return res.status(401).json({ message: "Invalid access token" });
        }
    }
}

