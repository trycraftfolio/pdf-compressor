const API_URL = 'https://pdf-compressor-backend-f2xj.onrender.com';
let selectedFiles = [];
let compressedBlobs = [];
let isDragging = false;
let startX = 0;
let currentX = 0;
let isBulkMode = false;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const swipeContainer = document.getElementById('swipeContainer');
const swipeButton = document.getElementById('swipeButton');
const qualitySection = document.getElementById('qualitySection');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultSection = document.getElementById('resultSection');
const originalSize = document.getElementById('originalSize');
const compressedSize = document.getElementById('compressedSize');
const savedPercent = document.getElementById('savedPercent');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const bulkModeCheckbox = document.getElementById('bulkMode');
const fileList = document.getElementById('fileList');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const logoImage = document.getElementById('logoImage');

// Theme toggle
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);
updateLogo(savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    updateLogo(newTheme);
});

function updateThemeIcon(theme) {
    themeIcon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

function updateLogo(theme) {
    // Replace these URLs with your actual logo URLs
    if (theme === 'dark') {
        logoImage.src = 'assets/logo-dark.webp';
    } else {
        logoImage.src = 'assets/logo-light.webp';
    }
}

// Bulk mode toggle
bulkModeCheckbox.addEventListener('change', (e) => {
    isBulkMode = e.target.checked;
    fileInput.multiple = isBulkMode;
    resetApp();
});

// Modal functionality
const privacyModal = document.getElementById('privacyModal');
const termsModal = document.getElementById('termsModal');
const privacyLink = document.getElementById('privacyLink');
const termsLink = document.getElementById('termsLink');
const closePrivacy = document.getElementById('closePrivacy');
const closeTerms = document.getElementById('closeTerms');

privacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    privacyModal.classList.add('show');
});

termsLink.addEventListener('click', (e) => {
    e.preventDefault();
    termsModal.classList.add('show');
});

closePrivacy.addEventListener('click', () => {
    privacyModal.classList.remove('show');
});

closeTerms.addEventListener('click', () => {
    termsModal.classList.remove('show');
});

window.addEventListener('click', (e) => {
    if (e.target === privacyModal) {
        privacyModal.classList.remove('show');
    }
    if (e.target === termsModal) {
        termsModal.classList.remove('show');
    }
});

uploadArea.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

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
    handleFiles(e.dataTransfer.files);
});

function handleFiles(files) {
    if (!files || files.length === 0) return;

    const pdfFiles = Array.from(files).filter(file => {
        if (file.type !== 'application/pdf') {
            alert(`${file.name} is not a PDF file`);
            return false;
        }
        if (file.size > 50 * 1024 * 1024) {
            alert(`${file.name} exceeds 50MB limit`);
            return false;
        }
        return true;
    });

    if (pdfFiles.length === 0) return;

    // ✅ Always hide upload area once valid file(s) selected
    uploadArea.style.display = 'none';

    if (isBulkMode) {
        selectedFiles = [...pdfFiles];
        displayFileList();
        fileInfo.style.display = 'none';
    } else {
        selectedFiles = [pdfFiles[0]];
        fileName.textContent = pdfFiles[0].name;
        fileSize.textContent = formatFileSize(pdfFiles[0].size);
        fileInfo.style.display = 'block';
        fileInfo.classList.add('show');
    }

    // ✅ Always reveal quality + swipe again
    qualitySection.style.display = 'block';
    swipeContainer.style.display = 'block';
    qualitySection.classList.add('show');
    swipeContainer.classList.add('show');
}


function displayFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span class="file-item-name"><i class="fas fa-file-pdf"></i> ${file.name}</span>
            <span class="file-item-size">${formatFileSize(file.size)}</span>
            <button class="remove-file" data-index="${index}"><i class="fas fa-times"></i></button>
        `;
        fileList.appendChild(fileItem);
    });
    fileList.classList.add('show');

    document.querySelectorAll('.remove-file').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            selectedFiles.splice(index, 1);
            if (selectedFiles.length === 0) {
                resetApp();
            } else {
                displayFileList();
            }
        });
    });
}

const qualityOptions = document.querySelectorAll('.quality-option');
qualityOptions.forEach(option => {
    option.addEventListener('click', () => {
        qualityOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        option.querySelector('input').checked = true;
    });
});

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
        if (selectedFiles.length === 0) return;
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

async function startCompression() {
    if (selectedFiles.length === 0) return;
    const quality = document.querySelector('input[name="quality"]:checked').value;

    swipeContainer.style.display = 'none';
    qualitySection.style.display = 'none';
    fileInfo.style.display = 'none';
    fileList.style.display = 'none';
    progressSection.classList.add('show');

    if (isBulkMode) {
        await compressMultiplePDFs(quality);
    } else {
        await compressPDFWithBackend(selectedFiles[0], quality);
    }
}

async function compressMultiplePDFs(quality) {
    compressedBlobs = [];
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        updateProgress((i / selectedFiles.length) * 100, `Compressing ${i + 1} of ${selectedFiles.length}...`);

        try {
            const formData = new FormData();
            formData.append('pdf', file);
            formData.append('quality', quality);

            const response = await fetch(`${API_URL}/compress`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Failed to compress ${file.name}`);
            }

            const blob = await response.blob();
            compressedBlobs.push({ name: file.name, blob: blob });
            totalOriginalSize += file.size;
            totalCompressedSize += blob.size;
        } catch (error) {
            console.error(`Error compressing ${file.name}:`, error);
            alert(`Error compressing ${file.name}`);
        }
    }

    updateProgress(100, 'Creating ZIP file...');

    const savedPercentValue = Math.floor(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100);

    setTimeout(() => {
        progressSection.classList.remove('show');
        resultSection.classList.add('show');
        originalSize.textContent = formatFileSize(totalOriginalSize);
        compressedSize.textContent = formatFileSize(totalCompressedSize);
        savedPercent.textContent = Math.max(0, savedPercentValue) + '%';
    }, 500);
}

async function compressPDFWithBackend(file, quality) {
    try {
        updateProgress(20, 'Uploading PDF...');
        const originalSizeBytes = file.size;
        const formData = new FormData();
        formData.append('pdf', file);
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
        const compressedBlob = await response.blob();
        compressedBlobs = [{ name: file.name, blob: compressedBlob }];

        const compressedSizeBytes = compressedBlob.size;
        const savedPercentValue = Math.floor(((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100);

        updateProgress(100, 'Complete!');
        setTimeout(() => {
            progressSection.classList.remove('show');
            resultSection.classList.add('show');
            originalSize.textContent = formatFileSize(originalSizeBytes);
            compressedSize.textContent = formatFileSize(compressedSizeBytes);
            savedPercent.textContent = Math.max(0, savedPercentValue) + '%';
        }, 500);
    } catch (error) {
        console.error('Compression error:', error);
        alert('Error compressing PDF:\n\n' + error.message + '\n\nMake sure backend is running at ' + API_URL);
        resetApp();
    }
}

function updateProgress(percent, message) {
    progressFill.style.width = percent + '%';
    progressText.textContent = message + ' ' + Math.floor(percent) + '%';
}

downloadBtn.addEventListener('click', async () => {
    if (compressedBlobs.length === 0) return;

    if (isBulkMode && compressedBlobs.length > 1) {
        const zip = new JSZip();
        compressedBlobs.forEach(item => {
            zip.file('compressed_' + item.name, item.blob);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'compressed_pdfs.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        const item = compressedBlobs[0];
        const url = URL.createObjectURL(item.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'compressed_' + item.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});

resetBtn.addEventListener('click', () => {
    resetApp();
});

function resetApp() {
    selectedFiles = [];
    compressedBlobs = [];
    fileInput.value = '';

    [fileInfo, fileList, qualitySection, swipeContainer, progressSection, resultSection].forEach(el => {
        el.style.display = 'none';
        el.classList.remove('show');
    });

    uploadArea.style.display = 'block';
    uploadArea.classList.remove('dragover');

    swipeButton.style.left = '4px';
    swipeButton.style.pointerEvents = 'auto';
    swipeButton.classList.remove('completed');
    swipeButton.style.transition = 'all 0.3s ease';
    progressFill.style.width = '0%';
    progressText.textContent = '';

    isBulkMode = bulkModeCheckbox.checked;
}



function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
