import youtubedl from 'youtube-dl-exec';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

ffmpeg.setFfmpegPath(ffmpegPath);

const DEFAULT_API_KEY = 'AIzaSyDGv78JLNU2rPl-5oFuw4HwpDtF6jW5GMQ';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchYouTubeLinks(api_key = DEFAULT_API_KEY, songNames) {
  try {
    const youtubeLinks = await Promise.all(
      songNames.map(async (songName) => {
        const response = await axios.get(
          "https://www.googleapis.com/youtube/v3/search",
          {
            params: {
              q: songName,
              part: "snippet",
              key: api_key,
              type: "video",
              maxResults: 1,
            },
          }
        );
        if (response.data.items.length > 0) {
          const videoId = response.data.items[0].id.videoId;
          return { songName, url: `https://www.youtube.com/watch?v=${videoId}` };
        } else {
          return { songName, url: `No video found for ${songName}` };
        }
      })
    );
    return youtubeLinks;
  } catch (error) {
    console.error("Error fetching YouTube links:", error);
    throw new Error("Internal server error");
  }
}

async function downloadAudio(url, outputFilePath) {
  return new Promise((resolve, reject) => {
    youtubedl(url, {
      extractAudio: true,
      audioFormat: 'mp3',
      output: outputFilePath,
    })
      .then(() => {
        console.log(`${path.basename(outputFilePath)} download finished.`);
        resolve();
      })
      .catch(err => {
        console.error(`Error downloading ${path.basename(outputFilePath)}: ${err.message}`);
        reject(err);
      });
  });
}

async function downloadMultipleAudios(urlsAndNames, downloadPath) {
  for (const { songName, url } of urlsAndNames) {
    if (url.startsWith('No video found')) {
      console.error(url);
      continue;
    }
    console.log(url);
    const sanitizedSongName = songName.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '_');
    const outputFilePath = path.join(downloadPath, `${sanitizedSongName}.mp3`);
    try {
      await downloadAudio(url, outputFilePath);
    } catch (error) {
      console.error(`Failed to download ${url}: ${error.message}`);
    }
  }
}

async function downloadYouTubeAudios(api_key, songNames) {
  try {
    const youtubeLinks = await fetchYouTubeLinks(api_key, songNames);
    const downloadPath = path.join('C:\\', 'downloads');
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath);
    }

    await downloadMultipleAudios(youtubeLinks, downloadPath);
    return { message: "Download completed successfully." };
  } catch (error) {
    console.error("Error during download process:", error);
    throw new Error("Failed to download audios");
  }
}

export async function downloadSongs(api_key = DEFAULT_API_KEY, songNames) {
  try {
    const result = await downloadYouTubeAudios(api_key, songNames);
    console.log(result.message);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
