const express = require('express');
const router = express.Router();
const axios = require('axios');

const CLIENT_ID = '16ddb7a6-85bc-4ce2-9137-fdd722f2c7af_b4113fd1-a56e-4ee5-8aee-900377fd5d3a';
const CLIENT_SECRET = 'xIxWub7d6S50hQiPkR01ByL2t0cevq25cfj9EMx6dls=';
const TOKEN_ENDPOINT = 'https://icdaccessmanagement.who.int/connect/token';
const SEARCH_ENDPOINT = 'https://id.who.int/icd/release/11/2024-01/mms/search';

let cachedToken = null;
let tokenExpiry = null;

async function getToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('scope', 'icdapi_access');

  try {
    const res = await axios.post(TOKEN_ENDPOINT, params.toString(), {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = res.data;
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
    return cachedToken;
  } catch (err) {
    throw new Error('Failed to get ICD API token');
  }
}

router.get('/search', async (req, res, next) => {
  try {
    const query = req.query.q;
    if (!query) return res.json([]);

    const token = await getToken();
    const url = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}&useFlexisearch=true&flatResults=true`;

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'API-Version': 'v2',
        'Accept-Language': 'en'
      }
    });

    res.json(response.data.destinationEntities || []);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).send(err.response.data);
    }
    next(err);
  }
});

router.get('/lineage', async (req, res, next) => {
  try {
    const entityUrl = req.query.url;
    if (!entityUrl) return res.json({ block: '', category: '' });

    const token = await getToken();
    let currentUrl = entityUrl.replace('http://', 'https://');
    const parents = [];

    for (let i = 0; i < 2; i++) {
      try {
        const response = await axios.get(currentUrl, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'API-Version': 'v2', 'Accept-Language': 'en' }
        });
        
        const data = response.data;
        if (data.parent && data.parent.length > 0) {
          const parentUrl = data.parent[0].replace('http://', 'https://');
          const parentRes = await axios.get(parentUrl, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'API-Version': 'v2', 'Accept-Language': 'en' }
          });
          
          const pData = parentRes.data;
          let pTitle = '';
          if (pData.title) pTitle = typeof pData.title === 'string' ? pData.title : pData.title['@value'];
          
          // Strip HTML
          const cleanTitle = pTitle.replace(/<[^>]*>?/gm, '');
          parents.push(cleanTitle || '');
          currentUrl = parentUrl;
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    }
    res.json({ category: parents[0] || '', block: parents[1] || '' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
