const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve the index html on root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint to get data
app.get('/api/data', (req, res) => {
    const dataPath = path.join(__dirname, 'dashboard_data.json');
    if (fs.existsSync(dataPath)) {
        // Stream the file because it's large
        const stream = fs.createReadStream(dataPath);
        res.setHeader('Content-Type', 'application/json');
        stream.pipe(res);
    } else {
        res.status(404).json({ error: 'Data not found' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
