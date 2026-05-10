import https from 'https';

https.get('https://api.nefusoft.cloud/v1/ongoing', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('CORS Header:', res.headers['access-control-allow-origin']);
}).on('error', err => console.log('Error:', err));




