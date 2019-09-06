
const fs = require('fs');

function main() {
  const p1 = fs.readFileSync('audio-1.mp4');
  const p2 = fs.readFileSync('audio-2.mp4');
  const p3 = Buffer.concat([p1, p2]);
  fs.writeFileSync('audio-com.mp4', p3);
}

main();
