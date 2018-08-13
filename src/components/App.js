import React, { Component } from 'react';
import { BrowserRouter as Router, Link, NavLink, Switch, Route, Redirect } from 'react-router-dom';

import './App.css';

import Button from './Button.js';
import Player from './Player.js';
import AddCollection from './AddCollection.js';

import { downloadFile } from '../util/download';

class ScrollToTopOnMount extends Component {
  componentDidMount() {
    window.scrollTo(0, 0)
  }

  render() {
    return null
  }
}

const VideoListItem = (props) => {
  const { videoId, collection, name } = props;
  const hasSubs = collection.videos.get(videoId).subtitleTracks.size > 0;

  return (
    <li className={'App-library-list-item ' + (hasSubs ? 'App-library-list-item-has-subs' : 'App-library-list-item-no-subs')}>
      <Link to={'/player/' + encodeURIComponent(collection.locator) + '/' + encodeURIComponent(videoId)}>
        {name}
      </Link>
    </li>
  );
};

// App
class App extends Component {
  handleExportBackup = () => {
    // TODO: Is calling this actions method hacky? It's not an action, really. But it makes sense if we think of actions as a model, I guess.
    const backupData = JSON.stringify(this.props.actions._saveToJSONable());
    downloadFile(backupData, 'voracious_backup_' + (new Date()).toISOString() + '.json', 'application/json');
  };

  render() {
    const { mainState, actions } = this.props;

    if (mainState.loading) {
      return <h1>Loading...</h1>;
    } else {
      return (
        <Router>
          <Switch>
            <Route path="/player/:cloc/:vid" render={({ match, history }) => {
              const collectionLocator = decodeURIComponent(match.params.cloc);
              const videoId = decodeURIComponent(match.params.vid);
              return <Player video={mainState.collections.get(collectionLocator).videos.get(videoId)} onExit={() => { history.goBack(); }} onUpdatePlaybackPosition={(pos) => { actions.saveVideoPlaybackPosition(collectionLocator, videoId, pos); }} onNeedSubtitles={() => { actions.loadSubtitlesIfNeeded(collectionLocator, videoId); }} />;
            }}/>
            <Route path="/add_collection" render={({ history }) => {
              return <AddCollection onAdd={(name, dir) => { actions.addLocalCollection(name, dir); history.replace('/library'); }} onExit={() => { history.goBack(); }} />;
            }}/>
            <Route render={() => (
              <div className="App-main-wrapper">
                <nav className="App-main-nav header-font">
                  <NavLink to={'/library'} activeClassName="selected">Library</NavLink>
                  <NavLink to={'/settings'} activeClassName="selected">Settings</NavLink>
                </nav>
                <div className="App-below-main-nav">
                  <Switch>
                    <Route path="/library/:cloc/:tname" render={({ match }) => {
                      const collectionLocator = decodeURIComponent(match.params.cloc);
                      const titleName = decodeURIComponent(match.params.tname);
                      const collection = mainState.collections.get(collectionLocator);
                      const title = collection.titles.find(t => t.name === titleName); // unindexed, but should be quick
                      return (
                        <div>
                          <ScrollToTopOnMount/>
                          <div className="App-collection-header">
                            <h2 className="App-collection-header-title"><Link to="/library" className="App-back-to-library-link">{collection.name}</Link> / {title.name}</h2>
                          </div>
                          {title.parts.episodes.length ? (
                            <ul>
                              {title.parts.episodes.map(ep => (
                                <VideoListItem collection={collection} videoId={ep.videoId} name={'Episode ' + ep.number} key={ep.number} />
                              ))}
                            </ul>
                          ) : null}
                          {title.parts.others.length ? (
                            <ul>
                              {title.parts.others.map(other => (
                                <VideoListItem collection={collection} videoId={other.videoId} name={other.name} key={other.name} />
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      );
                    }}/>
                    <Route path="/library" render={({ history }) => (
                      <ul>
                        {mainState.collections.valueSeq().sort((a, b) => a.name.localeCompare(b.name)).map((collection) => (
                          <li className="App-collection" key={collection.locator}>
                            <div className="App-collection-header">
                              <h2 className="App-collection-header-title">{collection.name}</h2>
                              <div className="App-collection-id">{collection.locator}</div>
                            </div>
                            <ul>
                              {collection.titles.map(title => title.series ? (
                                  <li key={title.name} className="App-library-list-item">
                                    <Link to={'/library/' + encodeURIComponent(collection.locator) + '/' + encodeURIComponent(title.name)}>
                                      {title.name} <span style={{color: 'grey'}}>[{title.parts.count}]</span>
                                    </Link>
                                  </li>
                                ) : (
                                  <VideoListItem collection={collection} videoId={title.videoId} name={title.name} key={title.name} />
                                )
                              )}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    )}/>
                    <Route path="/settings" render={({history}) => (
                      <div>
                        <Button onClick={() => {history.push('/add_collection'); }}>Add Collection</Button>
                        <Button onClick={this.handleExportBackup}>Export Backup</Button>
                      </div>
                    )}/>
                    <Redirect to="/library"/>
                  </Switch>
                </div>
              </div>
            )}/>
          </Switch>
        </Router>
      );
    }
  }
}

export default App;
