import https from 'https';
import fs from 'fs';
import path from 'path';

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
};

async function main() {
  try {
    console.log('Downloading empty-history.png...');
    await download('https://url.dinzid.my.id/H9qGRIp', path.join(process.cwd(), 'public', 'empty-history.png'));
    console.log('Downloading login-required.png...');
    await download('https://url.dinzid.my.id/D1abPVN', path.join(process.cwd(), 'public', 'login-required.png'));
    console.log('Downloads completed successfully!');
  } catch (err) {
    console.error('Error downloading files:', err);
    process.exit(1);
  }
}

main();
