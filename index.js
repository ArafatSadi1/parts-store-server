const express = require('express');
const app = express();
const cors = require('cors');
const res = require('express/lib/response');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res)=>{
    res.send('Hello, from parts store server')
})

app.listen(port, ()=>{
    console.log(`PartsStore Server running on port ${port}`)
})