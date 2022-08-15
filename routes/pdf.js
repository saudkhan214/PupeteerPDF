const express = require('express')
const app = express.Router();
const { authenticateToken } = require('./auth')
const path = require('path');
const axios = require('axios');
const puppeteer = require('puppeteer');
const uuid = require('uuid');
const fs = require('fs');
const Token = require('../models/TokenAuthentication')
const FileStructure = require('../models/FileStructure')

app.post('/create', authenticateToken, (req, res) => {
    try {
        UpdateRemainingLimit(req.token, async function (response) {
            if (response) {
                console.log("request.headers.host", req.headers.host)
                var filePath = path.resolve("./uploads");
                var fileName = `puppeteer_${Date.now().toString()}.pdf`
                const browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                })
                const page = await browser.newPage();

                // Get the "viewport" of the page, as reported by the page.
                const dimensions = await page.evaluate(() => {
                    return {
                        width: document.documentElement.clientWidth,
                        height: document.documentElement.clientHeight,
                        deviceScaleFactor: window.devicePixelRatio,
                    };
                });

                if (req.body.view_port) {
                    await page.setViewport({
                        height: req.body.view_port.height > 0 ? req.body.view_port.height : dimensions.height,
                        width: req.body.view_port.width > 0 ? req.body.view_port.width : dimensions.width,
                        isMobile: req.body.view_port.isMobile == true ? req.body.view_port.isMobile : false,
                        hasTouch: req.body.view_port.hasTouch == true ? req.body.view_port.hasTouch : false,
                        deviceScaleFactor: req.body.view_port.deviceScaleFactor > 0 ? req.body.view_port.deviceScaleFactor : 1,
                        isLandscape: req.body.view_port.isLandscape == true ? req.body.view_port.isLandscape : false
                    })
                }

                if (req.body.auth_required) {
                    // set the HTTP Basic Authentication credential
                    await page.authenticate({ 'username': req.body.user_name, 'password': req.body.password });
                }
                //await page.setViewport({width:1440,height:900,deviceScaleFactor:2})
                await page.goto(req.body.website, { waitUntil: "networkidle2", timeout: 0 });
                await page.emulateMediaType('screen')
                await page.pdf(
                    {
                        path: filePath + `/${fileName}`,
                        format: req.body.format ? req.body.format : 'A4',
                        displayHeaderFooter: req.body.displayHeaderFooter,
                        headerTemplate: req.body.headerTemplate ? req.body.headerTemplate : "",
                        footerTemplate: req.body.footerTemplate ? req.body.footerTemplate : "",
                        printBackground: true,
                        landscape: req.body.landscape,
                        scale: 1,
                    })
                await browser.close();
                console.log("file written successfullly")
                if (req.body.webhook && req.body.webhook !== "") {
                    const url = `${req.body.webhook}?downloadLink=${req.headers.host + `/pdf/download/${fileName}`}`;
                    const textResponse = await axios.get(url);
                    console.log("textResponse", textResponse)
                }
                let obj = {
                    fileName: req.body.path,
                    uniqueFileName: fileName,
                    uniqueId: uuid.v1()
                }
                var myData = new FileStructure(obj);
                await myData.save()
                res.status(200).send({ success: true, msg: 'PDF created successfully', downloadLink: req.headers.host + `/pdf/download/${obj.uniqueId}`, uniqueFileId: obj.uniqueId })
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
app.get('/download/:uniqueId', async (req, res) => {
    try {
        let uniqueId = req.params.uniqueId;
        FileStructure.findOne({ uniqueId: uniqueId }).then(doc => {
            if (!doc) {
                return res.status(404).send({ success: false, msg: "file not found" })
            } else {
                var filePath = path.resolve("./uploads");
                console.log("filePath", filePath + `/${doc.uniqueFileName}`)
                res.download(filePath + `/${doc.uniqueFileName}`, `${doc.fileName}`, function (error) {
                    if (error) {
                        console.log("error", error)
                    } else {
                        console.log("Pdf Download Successfully")
                    }
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

app.delete('/delete/:uniqueId', async (req, res) => {
    try {
        let uniqueId = req.params.uniqueId;
        FileStructure.findOne({ uniqueId: uniqueId }).then(doc => {
            if (!doc) {
                return res.status(404).send({ success: false, msg: "file not found" })
            } else {
                var filePath = path.resolve("./uploads");
                console.log("filePath", filePath + `/${doc.uniqueFileName}`)
                FileStructure.deleteOne({ uniqueId: uniqueId }).then(element => {
                    fs.unlinkSync(filePath + `/${doc.uniqueFileName}`)
                })
                res.status(200).send({ success: true, msg: 'PDF deleted successfully' })
            }
        })
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