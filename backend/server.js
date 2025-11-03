const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - Allow all origins
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: false
}));

app.options('*', cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'input-' + uniqueSuffix + '.pdf');
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files allowed'));
        }
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running!' });
});

app.post('/compress', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const quality = req.body.quality || 'recommended';
        const inputPath = req.file.path;
        const outputFilename = 'compressed-' + path.basename(inputPath);
        const outputPath = path.join(uploadsDir, outputFilename);

        const qualitySettings = {
            extreme: '/screen',
            recommended: '/ebook',
            low: '/printer'
        };

        const gsQuality = qualitySettings[quality] || '/ebook';

        console.log(`Compressing with quality: ${quality} (${gsQuality})`);

        const gsCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${gsQuality} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`;

        try {
            execSync(gsCommand, { timeout: 60000 });
        } catch (error) {
            console.error('Ghostscript error:', error);
            throw new Error('PDF compression failed');
        }

        const originalSize = fs.statSync(inputPath).size;
        const compressedSize = fs.statSync(outputPath).size;
        const savedPercent = Math.floor(((originalSize - compressedSize) / originalSize) * 100);

        const compressedBuffer = fs.readFileSync(outputPath);

        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="compressed_${req.file.originalname}"`,
            'X-Original-Size': originalSize,
            'X-Compressed-Size': compressedSize,
            'X-Saved-Percent': Math.max(0, savedPercent)
        });

        res.send(compressedBuffer);

    } catch (error) {
        console.error('Error:', error);
        
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ 
            error: 'Compression failed', 
            message: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 PDF Compressor Backend running on http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
});
