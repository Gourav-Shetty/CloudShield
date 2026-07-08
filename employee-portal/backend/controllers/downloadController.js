const path = require('path');
const fs = require('fs');

// Resolve uploads directory relative to project root
const uploadsDir = path.join(__dirname, '..', 'uploads');

/**
 * @desc    Download a file from the uploads directory
 * @route   GET /api/download?file=<filename>
 * @access  Public
 * @vuln    INTENTIONALLY VULNERABLE — the `file` query parameter is used
 *          directly in path.join without stripping "../" sequences, allowing
 *          directory traversal (e.g. ?file=../../../etc/passwd).
 */
const downloadFile = (req, res) => {
  try {
    const filename = req.query.file;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a file name via ?file= query parameter',
      });
    }

    // VULNERABLE: no sanitization of "../" sequences — allows path traversal
    const filePath = path.join(uploadsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Download File Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error downloading file',
      error: error.message,
    });
  }
};

module.exports = { downloadFile };
