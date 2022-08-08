const express = require('express')
const app = express.Router();
const { authenticateToken } = require('./auth')
const path = require('path');
const axios = require('axios');
const puppeteer = require('puppeteer');
const Token = require('../models/TokenAuthentication')

app.post('/create', authenticateToken, (req, res) => {
    try {
        UpdateRemainingLimit(req.token, async function (response) {
            if (response) {
                console.log("request.headers.host", req.headers.host)
                var filePath = path.resolve("./uploads");
                var fileName = `${req.body.path}_${Date.now().toString()}.pdf`
                const browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox','--disable-setuid-sandbox']
                })
                const page = await browser.newPage();
                if (req.body.auth_required) {
                    // set the HTTP Basic Authentication credential
                    await page.authenticate({ 'username': req.body.user_name, 'password': req.body.password });
                }
                //await page.setViewport({width:1440,height:900,deviceScaleFactor:2})
                await page.goto(req.body.website,{ waitUntil: "networkidle2" });
                await page.emulateMediaType('screen')
                await page.pdf(
                    {
                        path: filePath + `/${fileName}`,
                        format: req.body.format ? req.body.format : 'A4',
                        displayHeaderFooter: req.body.displayHeaderFooter,
                        headerTemplate: req.body.headerTemplate ? req.body.headerTemplate : "",
                        footerTemplate: req.body.footerTemplate ? req.body.footerTemplate : "",
                        printBackground:true,
                        landscape:true,
                        scale: 0.5
                    })
                await browser.close();
                console.log("file written successfullly")
                if (req.body.webhook && req.body.webhook !== "") {
                    const url = `${req.body.webhook}?downloadLink=${req.headers.host + `/pdf/download/${fileName}`}`;
                    const textResponse = await axios.get(url);
                    console.log("textResponse", textResponse)
                }
                res.status(200).send({ success: true, msg: 'PDF created successfully', downloadLink: req.headers.host + `/pdf/download/${fileName}` })
            }
            else {
                return res.status(500).json({
                    success: false,
                    msg: "Internal Server Error" 
                });
            }
        })
    } catch (e) {
        return res.status(500).json({
            success: false,
            msg: e.message
        });
    }
})

//download pdf
app.get('/download/:filename', (req, res) => {
    try {
        let filename = req.params.filename;
        var filePath = path.resolve("./uploads");
        console.log("filePath", filePath + `/${filename}`)
        res.download(filePath + `/${filename}`, function (error) {
            if (error) {
                console.log("error", error)
            } else {
                console.log("Pdf Download Successfully")
            }
        });
    } catch (e) {
        return res.status(500).json({
            success: false,
            msg: e.message
        });
    }
})

function UpdateRemainingLimit(token, next) {
    Token.findOne({ token: token }, (err, doc) => {
        doc.remainingRequests = Number(doc.remainingRequests - 1)
        return doc.save().then(doc => {
            if (doc) {
                return next(true)
            }
            return next(false);
        })
    })
}

module.exports = app