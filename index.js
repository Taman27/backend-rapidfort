const express = require("express");
const multer = require("multer");
const cors = require("cors");
const docxToPDF = require("docx-pdf");
const path = require("path");
const { exec } = require("child_process");

const app = express();
const port = 7000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads");
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage: storage });

app.post("/convertFile", upload.single("file"), (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded",
            });
        }

        const outputPath = path.join(__dirname, "files", `${req.file.originalname}.pdf`);
        const finalOutputPath = path.join(
            __dirname,
            "files",
            `${req.file.originalname}-final.pdf`
        );

        docxToPDF(req.file.path, outputPath, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: "Error converting DOCX to PDF",
                });
            }

            const password = req.body.password;

            if (password) {
                const qpdfCommand = `qpdf --encrypt ${password} ${password} 256 -- "${outputPath}" "${finalOutputPath}"`;

                exec(qpdfCommand, (err, stdout, stderr) => {
                    if (err) {
                        console.error(stderr);
                        return res.status(500).json({
                            message: "Error adding password protection",
                        });
                    }

                    res.download(finalOutputPath, () => {
                        console.log("Password-protected file downloaded");
                    });
                });
            } else {
                res.download(outputPath, () => {
                    console.log("Unprotected file downloaded");
                });
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal server error",
        });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
});
  