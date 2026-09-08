const http = require('http');
const axios = require('axios');

const crypto = require("crypto");
const WXBizDataCrypt = require('./WXBizDataCrypt')

const PORT = 3000;
const routes = {}

function addRoute(method, path, handler) {
  if(!Array.isArray(routes[method])) routes[method] = []
  routes[method].push({ path, handler })
}

addRoute('POST', '/douyin-auth', async (req, res) => {
  const login = await axios.post('https://open-sandbox.douyin.com/api/apps/v2/jscode2session', {
    appid: 'tt0dd37b6e92e7546501',
    code: req.body?.code,
    secret: "d82cb4c8a99ffe7125788ee0bf5f49b7ac5bc17d",
  })
  const sessionKey = login.data?.data?.session_key
  
  const decipher = crypto.createDecipheriv(
    "aes-128-cbc",
    Buffer.from(sessionKey, "base64"),
    Buffer.from(req.body?.iv, "base64")
  );
  let ret = decipher.update(req.body?.encryptedData, "base64");
  ret += decipher.final();
  
  res.end(JSON.stringify({ code: 200, msg: 'ok', data: JSON.parse(ret) }));
})
addRoute('POST', '/weixin-auth', async (req, res) => {
  const appid = 'wx6b997bcb1adfd991';
  const secret= 'd186f9eb3a2d78a3b2913f3d02cdec15';
  const login = await axios.get('https://api.weixin.qq.com/sns/jscode2session', { params: {
    grant_type: 'authorization_code',
    appid,
    secret,
    js_code: req.body?.code,
  } });
  
  const pc = new WXBizDataCrypt(appid, login.data?.session_key)
	const data = pc.decryptData(req.body?.encryptedData , req.body?.iv);

  res.end(JSON.stringify({ code: 200, msg: 'ok', data }));
})
addRoute('POST', '/zhifubao-auth', (req, res) => {
  const secret = `/jCftJs3vuywznLioLnuEg==`;
  const crypted = Buffer.from(req.body?.encryptedData, 'base64').toString('binary');
  const sessionKey = Buffer.from(secret, 'base64');
  const iv = Buffer.alloc(16, 0)
  
  const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKey, iv);

  let decoded = decipher.update(crypted, 'binary', 'utf8');
  decoded += decipher.final('utf8');

  res.end(JSON.stringify({ code: 200, msg: 'ok', data: JSON.parse(decoded) }));
})

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  let body = ''
  req.on('data', (data) => {
    body += data
  })
  req.on('end', async () => {
    req.body = JSON.parse(body)
    console.log('body', req.body);
    
    try {
      await routes[req.method.toUpperCase()]?.find(v => v.path === req.url)?.handler(req, res)
    } catch (error) {
      console.log('error:', error.message);
      
      res.end(JSON.stringify({ code: 500, msg: error.message }))
    }
  })
});



server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
})
