const express = require("express");
const router = express.Router();
const { User } = require("../models/models");
const bcrypt = require('bcrypt');
const { createRefreshToken, createAccessToken, setAuthCookies } = require("../auth/utils");

router.get("/signup", (req, res) => {
    return res.render("signup");
})
router.get("/login", (req, res) => {
    return res.render("login", { error: null });
})
router.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 7);
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
        })
        
        setAuthCookies(res, newUser);

        return res.redirect("/");
    } catch (e) {
        console.log("error in creaing new user: ", e);
        return res.json({ error: "error durng signup!" });
    }
})
router.post("/login", async (req, res) => {
    try {
        const { usernameemail, password } = req.body;
        const user = await User.findOne({
            $or: [
                { username: usernameemail },
                { email: usernameemail }
            ]
        });
        if (!user) return res.render("login", { error: "Username, email or password is wrong" });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.render("login", { error: "Username, email or password is wrong" });

        const cookie = setAuthCookies(res, user);

        return res.redirect("/");
    } catch (e) {
        console.log("error in creaing new user: ", e);
        return res.json({ error: "error durng signup!" });
    }
})

module.exports = router;