import React, { Component } from 'react';
import { BrowserRouter as Router, Link, NavLink, Switch, Route, Redirect } from 'react-router-dom';

import './App.css';

import Button from './Button.js';
import Source from './Source.js';
import HighlightSet from './HighlightSet.js';

import { getExpandedHighlightSets } from '../derived';
import { downloadFile } from '../util/download';

// NewHighlightSetForm
class NewHighlightSetForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      setName: '',
    };
  }

  handleNameChange = (e) => {
    this.setState({setName: e.target.value});
  };

  handleSubmit = (e) => {
    e.preventDefault();
    this.props.onNewHighlightSet(this.state.setName.trim());
    this.setState({setName: ''});
  };

  render() {
    const nameIsValid = this.state.setName && (this.state.setName.trim() !== '');

    return (
      <form onSubmit={this.handleSubmit}>
        <input type="text" placeholder="Set Name" value={this.state.setName} onChange={this.handleNameChange} />
        <button type="submit" {...(nameIsValid ? {} : {disabled: true})}>+ Create Set</button>
      </form>
    );
  }
}

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
            <Route path="/source/:cid/:vid" render={({ match, history }) => {
              const collectionId = decodeURIComponent(match.params.cid);
              const videoId = decodeURIComponent(match.params.vid);
              return <Source actions={actions} source={mainState.collections.get(collectionId).videos.get(videoId)} onExit={() => { history.goBack(); }} highlightSets={mainState.highlightSets} onUpdateViewPosition={(pos) => { actions.setSourceViewPosition(collectionId, videoId, pos); }} />;
            }}/>
            <Route render={() => (
              <div className="App-main-wrapper">
                <nav className="App-main-nav header-font">
                  <NavLink to={'/library'} activeClassName="selected">Library</NavLink>
                  <NavLink to={'/highlights'} activeClassName="selected">Highlights</NavLink>
                  <NavLink to={'/settings'} activeClassName="selected">Settings</NavLink>
                </nav>
                <div className="App-below-main-nav">
                  <Switch>
                    <Route path="/library" render={({ history }) => (
                      <div>
                        <div>
                          <div style={{marginBottom: 20}}>
                            <Button onClick={() => { const newSourceId = actions.createVideoSource(); history.push('/source/' + newSourceId); }}>+ Add Video</Button>
                          </div>
                          <ul>
                            {mainState.collections.valueSeq().map((collection) => (
                              <li key={collection.id}>
                                <ul>
                                  {collection.videos.valueSeq().map((video) => (
                                    <li key={video.id} className="App-library-list-item">
                                      <Link to={'/source/' + encodeURIComponent(collection.id) + '/' + encodeURIComponent(video.id)}>
                                        {video.name}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}/>
                    <Route path="/highlights" render={() => {
                      const expandedHighlightSetsMap = getExpandedHighlightSets(mainState); // NOTE: This is an OrderedMap

                      return (
                        <div>
                          <div className="App-highlight-set-left-panel">
                            <ul className="App-highlight-set-list">
                              {expandedHighlightSetsMap.valueSeq().map((s) => (
                                <li key={s.id}>
                                  <NavLink to={'/highlights/' + s.id} activeClassName="selected">{s.name} [{s.contexts.length}]</NavLink>
                                </li>
                              ))}
                            </ul>
                            <NewHighlightSetForm onNewHighlightSet={actions.createHighlightSet} />
                          </div>
                          <div className="App-highlight-set-main-area">
                            <Switch>
                              <Route path="/highlights/:setid" render={({ match, history }) => {
                                const setId = match.params.setid;
                                const expandedSet = expandedHighlightSetsMap.get(setId);
                                return (
                                  <div>
                                    <HighlightSet actions={actions} highlightSet={expandedSet} onSourceSetChunkAnnoText={actions.sourceSetChunkAnnoText} highlightSets={mainState.highlightSets} onSetName={(name) => { actions.highlightSetRename(setId, name); }} onDelete={() => {
                                      if (expandedSet.contexts.length > 0) {
                                        window.alert('Only empty sets can be deleted');
                                      } else {
                                        actions.deleteHighlightSet(setId);
                                        history.push('/highlights');
                                      }
                                    }} />
                                  </div>
                                );
                              }}/>
                              <Route path="/highlights" render={() => {
                                if (expandedHighlightSetsMap.size) {
                                  return <Redirect to={'/highlights/' + expandedHighlightSetsMap.first().id}/>
                                } else {
                                  return <div>No sets</div>
                                }
                              }}/>
                            </Switch>
                          </div>
                        </div>
                      );
                    }}/>
                    <Route path="/settings" render={() => (
                      <div>
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
