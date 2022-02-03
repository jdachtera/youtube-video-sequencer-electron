const ytdl = require('ytdl-core');

(async () => {
  // Example of filtering the formats to audio only.
  let info = await ytdl.getInfo(
    'https://www.youtube.com/watch?v=vbwB6wjIp8g&bpctr=9999999999'
  );

  console.log(info);
})();
