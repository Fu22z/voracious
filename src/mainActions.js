import { Record, Map as IMap } from 'immutable';

import genUID from './util/uid';
import createStorageBackend from './storage';
import { listCollectionVideos } from './library';

const jstr = JSON.stringify; // alias
const jpar = JSON.parse; // alias

const MainStateRecord = new Record({
  loading: false,
  collections: new IMap(), // id -> CollectionRecord
});

const CollectionRecord = new Record({
  id: undefined,
  videos: new IMap() // id -> VideoRecord,
});

const VideoRecord = new Record({
  id: undefined,
  name: undefined,
  videoURL: undefined,
  subtitleTracks: new IMap(), // language -> SubtitleTrackRecord
  playbackPosition: 0,
});

const SubtitleTrackRecord = new Record({
  language: undefined,
  subtitles: undefined,
});

export default class MainActions {
  constructor(subscribableState) {
    this.state = subscribableState;

    this.initializeState().then(() => {
      console.log('MainActions state initialized');
    });
  }

  initializeState = async () => {
    this.state.set(new MainStateRecord());

    this.state.set(this.state.get().set('loading', true));

    this.storage = await createStorageBackend();

    await this._storageLoadProfile();

    const collectionIds = ['/Users/russ/Documents/Voracious'];

    for (const collectionId of collectionIds) {
      const collectionVideos = await listCollectionVideos(collectionId);

      const collectionVideoRecords = []; // [k, v] pairs
      for (const vid of collectionVideos) {
        collectionVideoRecords.push([vid.id, new VideoRecord({
          id: vid.id,
          name: vid.name,
          videoURL: vid.url,
          // remaining fields are OK to leave as default
        })]);
      }

      this.state.set(this.state.get().setIn(['collections', collectionId], new CollectionRecord({
        id: collectionId,
        videos: new IMap(collectionVideoRecords),
      })));
    }

    this.state.set(this.state.get().set('loading', false));
  };

  _storageLoadProfile = async () => {
    const profileStr = await this.storage.getItemMaybe('profile');

    if (profileStr) {
      const profile = jpar(profileStr);

      // TODO: update state from profile object
    } else {
      // Key wasn't present, so initialize to default state

      // TODO: update state with default profile info, if any

      // Save our empty/default profile
      this._storageSaveProfile();
    }
  };

  _storageSaveProfile = () => {
    const profileObj = {
    };

    // TODO: fill profileObject from this.state

    this.storage.setItem('profile', jstr(profileObj));
  };

  _storageSavePlaybackPosition = (collectionId, videoId, position) => {
    // TODO: escape slashes in ids? encodeURIComponent?
    this.storage.setItem('playback_position/' + collectionId + '/' + videoId, jstr(position));
  };

/*
  setVideoSubtitleTrack = (sourceId, file) => {
    this.state.set(this.state.get().updateIn(['sources', sourceId, 'texts'], texts => texts.push(new SourceTextRecord({
      language,
      role,
      chunkSetId,
      chunkSet,
    }))));

    this._storageSaveProfile();
  };
*/

  saveVideoPlaybackPosition = (collectionId, videoId, position) => {
    const currentPosition = this.state.get().collections.get(collectionId).videos.get(videoId).playbackPosition;
    if (position === currentPosition) {
      return;
    }

    this.state.set(this.state.get().setIn(['collections', collectionId, 'videos', videoId, 'playbackPosition'], position));

    this._storageSavePlaybackPosition(collectionId, videoId, position);
  };
};
