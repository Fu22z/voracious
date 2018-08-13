import path from 'path';

import { parseSRT } from '../util/subtitleParsing';
import { createAutoAnnotatedText } from '../util/analysis';
import { detectWithinSupported } from '../util/languages';
import { createTimeRangeChunk, createTimeRangeChunkSet } from '../util/chunk';

const LOCAL_PREFIX = 'local:';

const SUPPORTED_VIDEO_EXTENSIONS = [
  '.mp4',
  // '.mkv',
];

const SUPPORTED_SUBTITLE_EXTENSIONS = [
  '.srt',
];

const EPISODE_PATTERN = /ep([0-9]+)/;

const fs = window.require('fs-extra'); // use window to avoid webpack

const listVideosRel = async (baseDir, relDir) => {
  const result = [];
  const videoFiles = [];
  const subtitleFilesMap = new Map(); // base -> fn

  const dirents = await fs.readdir(path.join(baseDir, relDir));

  for (const fn of dirents) {
    const absfn = path.join(baseDir, relDir, fn);
    const stat = await fs.stat(absfn);

    if (!stat.isDirectory()) {
      const ext = path.extname(fn);
      if (SUPPORTED_VIDEO_EXTENSIONS.includes(ext)) {
        videoFiles.push(fn);
      } else if (SUPPORTED_SUBTITLE_EXTENSIONS.includes(ext)) {
        const base = path.basename(fn, ext);
        subtitleFilesMap.set(base, fn);
      }
    }
  }

  for (const vfn of videoFiles) {
    const subtitleTrackIds = [];

    const basevfn = path.basename(vfn, path.extname(vfn));

    if (subtitleFilesMap.has(basevfn)) {
      subtitleTrackIds.push(path.join(relDir, subtitleFilesMap.get(basevfn)));
    }

    result.push({
      id: path.join(relDir, vfn),
      name: path.basename(vfn, path.extname(vfn)),
      url: 'local://' + path.join(baseDir, relDir, vfn), // this prefix works with our custom file protocol for Electron
      subtitleTrackIds,
    });
  }

  return result;
};

const listDirs = async (dir) => {
  const dirents = await fs.readdir(dir);
  const result = [];

  for (const fn of dirents) {
    const absfn = path.join(dir, fn);
    const stat = await fs.stat(absfn);

    if (stat.isDirectory()) {
      result.push(fn);
    }
  }

  return result;
};

export const getCollectionIndex = async (collectionLocator) => {
  if (collectionLocator.startsWith(LOCAL_PREFIX)) {
    const baseDirectory = collectionLocator.slice(LOCAL_PREFIX.length);

    const result = {
      videos: [],
      titles: [],
    };

    // Look for videos directly in baseDirectory
    const baseVideos = await listVideosRel(baseDirectory, '');
    for (const vid of baseVideos) {
      result.videos.push(vid);
      result.titles.push({
        name: vid.name,
        series: false,
        video: vid,
      });
    }

    // Look in directories
    for (const dir of await listDirs(baseDirectory)) {
      const vids = await listVideosRel(baseDirectory, dir);

      // There may be season dirs, look for those
      for (const subDir of await listDirs(path.join(baseDirectory, dir))) {
        if (subDir.startsWith('Season')) {
          vids.push(...await listVideosRel(baseDirectory, path.join(dir, subDir)));
        }
      }

      if (vids.length === 0) {
        continue;
      }

      for (const vid of vids) {
        result.videos.push(vid);
      }

      if (vids.length === 1) { // TODO: also, if single vid, make sure it doesn't have season/episode name, otherwise it IS a series
        result.titles.push({
          name: dir,
          series: false,
          video: vids[0],
          parts: null,
        });
      } else {
        const episodes = [];
        const others = [];

        for (const vid of vids) {
          const epMatch = EPISODE_PATTERN.exec(vid.name);
          if (epMatch) {
            const epNum = +(epMatch[1]);
            episodes.push({
              number: epNum,
              video: vid,
            });
          } else {
            others.push({
              name: vid.name,
              video: vid,
            });
          }
        }

        result.titles.push({
          name: dir,
          series: true,
          video: null,
          parts: {
            episodes,
            others,
            count: vids.length,
          },
        });
      }
    }

    result.titles.sort((a, b) => (a.name.localeCompare(b.name)));

    return result;
  } else {
    throw new Error('internal error');
  }
};

const loadSubtitleTrackFromSRT = async (filename) => {
  // Load and parse SRT file
  const data = await fs.readFile(filename, 'utf8');

  const subs = parseSRT(data);

  // Autodetect language
  const combinedText = subs.map(s => s.lines).join();
  const language = detectWithinSupported(combinedText);

  // Create time-indexed subtitle track
  const chunks = [];
  for (const sub of subs) {
    const annoText = createAutoAnnotatedText(sub.lines, language);
    chunks.push(createTimeRangeChunk(sub.begin, sub.end, annoText));
  }

  const chunkSet = createTimeRangeChunkSet(chunks);

  return {
    language,
    chunkSet,
  };
};

export const loadCollectionSubtitleTrack = async (collectionLocator, subTrackId) => {
  if (collectionLocator.startsWith(LOCAL_PREFIX)) {
    const baseDirectory = collectionLocator.slice(LOCAL_PREFIX.length);
    const subfn = path.join(baseDirectory, subTrackId);
    return await loadSubtitleTrackFromSRT(subfn);
  } else {
    throw new Error('internal error');
  }
};
