// Backend API URL - Update this when you deploy backend
const API_URL = 'https://pdf-compressor-backend-uvv5.onrender.com';

let selectedFile = null;
let compressedBlob = null;
let isDragging = false;
let startX = 0;
let currentX = 0;

// Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const swipeContainer = document.getElementById('swipeContainer');
const swipeButton = document.getElementById('swipeButton');
const qualitySection = document.getElementById('qualitySection');
const compressBtn = document.getElementById('compressBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultSection = document.getElementById('resultSection');
const originalSize = document.getElementById('originalSize');
const compressedSize = document.getElementById('compressedSize');
const savedPercent = document.getElementById('savedPercent');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');

// Upload area click
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

// File input change
fileInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
});

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    handleFile(file);
});

// Handle file upload
function handleFile(file) {
    if (!file) return;

    if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file');
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        alert('File size must be less than 50MB');
        return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    fileInfo.classList.add('show');
    qualitySection.classList.add('show');
    
    // Show swipe container if it exists
    if (swipeContainer) {
        swipeContainer.classList.add('show');
    }
    
    uploadArea.style.display = 'none';
}

// Quality option selection
const qualityOptions = document.querySelectorAll('.quality-option');
qualityOptions.forEach(option => {
    option.addEventListener('click', () => {
        qualityOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        option.querySelector('input').checked = true;
    });
});

// Swipe functionality (if swipe button exists)
if (swipeButton) {
    let swipeTrack = document.querySelector('.swipe-track');
    let maxSwipe = 0;

    function initSwipe() {
        if (swipeTrack) {
            maxSwipe = swipeTrack.offsetWidth - swipeButton.offsetWidth - 8;
        }
    }

    swipeButton.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    swipeButton.addEventListener('touchstart', startDrag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', stopDrag);

    function startDrag(e) {
        if (!selectedFile) return;
        isDragging = true;
        startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        initSwipe();
        swipeButton.style.transition = 'none';
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();
        currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        let deltaX = currentX - startX;
        if (deltaX < 0) deltaX = 0;
        if (deltaX > maxSwipe) deltaX = maxSwipe;
        swipeButton.style.left = (4 + deltaX) + 'px';
        if (deltaX >= maxSwipe * 0.9) {
            completeSwipe();
        }
    }

    function stopDrag() {
        if (!isDragging) return;
        isDragging = false;
        swipeButton.style.transition = 'all 0.3s ease';
        let deltaX = currentX - startX;
        if (deltaX < maxSwipe * 0.9) {
            swipeButton.style.left = '4px';
        }
    }

    async function completeSwipe() {
        isDragging = false;
        swipeButton.style.left = (maxSwipe + 4) + 'px';
        swipeButton.classList.add('completed');
        swipeButton.style.pointerEvents = 'none';
        setTimeout(() => {
            startCompression();
        }, 300);
    }

    window.addEventListener('load', initSwipe);
    window.addEventListener('resize', initSwipe);
}

// Compress button click (if no swipe button)
if (compressBtn) {
    compressBtn.addEventListener('click', () => {
        startCompression();
    });
}

async function startCompression() {
    if (!selectedFile) return;

    const quality = document.querySelector('input[name="quality"]:checked').value;
    
    if (swipeContainer) {
        swipeContainer.style.display = 'none';
    }
    qualitySection.style.display = 'none';
    progressSection.classList.add('show');

    await compressPDFWithBackend(quality);
}

// Real Ghostscript Compression via Backend
async function compressPDFWithBackend(quality) {
    try {
        updateProgress(20, 'Uploading PDF...');

        const originalSizeBytes = selectedFile.size;

        const formData = new FormData();
        formData.append('pdf', selectedFile);
        formData.append('quality', quality);

        updateProgress(40, 'Compressing with Ghostscript...');

        const response = await fetch(`${API_URL}/compress`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Compression failed');
        }

        updateProgress(80, 'Downloading compressed file...');

        compressedBlob = await response.blob();
        const compressedSizeBytes = compressedBlob.size;

        const headerOriginalSize = response.headers.get('X-Original-Size');
        const headerCompressedSize = response.headers.get('X-Compressed-Size');
        const headerSavedPercent = response.headers.get('X-Saved-Percent');

        const finalOriginalSize = headerOriginalSize ? parseInt(headerOriginalSize) : originalSizeBytes;
        const finalCompressedSize = headerCompressedSize ? parseInt(headerCompressedSize) : compressedSizeBytes;
        
        let savedPercentValue;
        if (headerSavedPercent) {
            savedPercentValue = parseInt(headerSavedPercent);
        } else {
            savedPercentValue = Math.floor(((finalOriginalSize - finalCompressedSize) / finalOriginalSize) * 100);
        }

        updateProgress(100, 'Complete!');

        setTimeout(() => {
            progressSection.classList.remove('show');
            resultSection.classList.add('show');

            originalSize.textContent = formatFileSize(finalOriginalSize);
            compressedSize.textContent = formatFileSize(finalCompressedSize);
            savedPercent.textContent = Math.max(0, savedPercentValue) + '%';
        }, 500);

    } catch (error) {
        console.error('Compression error:', error);
        alert('Error compressing PDF:\n\n' + error.message + '\n\nMake sure backend is running at ' + API_URL);
        resetBtn.click();
    }
}

function updateProgress(percent, message) {
    progressFill.style.width = percent + '%';
    progressText.textContent = message + ' ' + percent + '%';
}

downloadBtn.addEventListener('click', () => {
    if (!compressedBlob) return;
    const url = URL.createObjectURL(compressedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compressed_' + selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

resetBtn.addEventListener('click', () => {
    selectedFile = null;
    compressedBlob = null;
    fileInput.value = '';
    
    fileInfo.classList.remove('show');
    qualitySection.classList.remove('show');
    if (swipeContainer) {
        swipeContainer.classList.remove('show');
        swipeButton.style.left = '4px';
        swipeButton.style.pointerEvents = 'auto';
        swipeButton.classList.remove('completed');
    }
    progressSection.classList.remove('show');
    resultSection.classList.remove('show');
    uploadArea.style.display = 'block';
    
    progressFill.style.width = '0%';
});

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
