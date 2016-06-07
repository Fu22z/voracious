import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'

import { incrementCount, newDoc, importVideoFile, importSubsFile, videoTimeUpdate, controlBack } from '../actions'

// Counter
const Counter = connect(
  (state) => ({ // mapStateToProps
    value: state.count,
  }),
  (dispatch) => ({ // mapDispatchToProps
    onIncreaseClick: () => dispatch(incrementCount()),
  })
)(({value, onIncreaseClick}) => (
  <div>
    <span>{value}</span>
    <button onClick={onIncreaseClick}>Increase</button>
  </div>
));

const languageOptions = [
  {value: 'ja', label: 'Japanese'},
  {value: 'en', label: 'English'},
];

// Select, "uncontrolled" but watches changes
class Select extends Component {
  componentWillMount() {
    const {options, onSet} = this.props;
    if (options.length > 0) {
      onSet(options[0].value);
    }
  }

  render() {
    const {options, onSet} = this.props;
    return (
      <select onChange={e => onSet(e.target.value)}>
        {options.map((o, i) => <option key={i} value={o.value}>{o.label}</option>)}
      </select>
    )
  }
}

// NewDocForm
const NewDocForm = connect()(
  class extends Component {
    render() {
      const kindOptions = [
        {value: 'video', label: 'Video'},
        {value: 'comic', label: 'Comic'},
      ];
      return (
        <form onSubmit={e => {
          e.preventDefault();
          this.props.dispatch(newDoc(this.kindVal, this.languageVal));
        }}>
          <Select options={kindOptions} onSet={v => { this.kindVal = v; }} />
          <Select options={languageOptions} onSet={v => { this.languageVal = v; }} />
          <button type="submit">New Document</button>
        </form>
      );
    }
  }
);

// FileChooserForm
const FileChooser = ({label, accept, onChoose}) => (
  <label>{label} <input type="file" accept={accept} onChange={e => { onChoose(e.target.files[0]); e.target.value = null; }}/></label>
);

// VideoImportControls
class VideoImportControls extends Component {
  render() {
    const {dispatch} = this.props;
    return (
      <div>
        <form>
          <FileChooser label="Import Video" accept="video/*" onChoose={(file) => { dispatch(importVideoFile(file)); }} />
        </form>
        <form>
          <FileChooser label="Import Subs (SRT)" accept=".srt" onChoose={(file) => { dispatch(importSubsFile(file, this.subLanguageVal)); }} />
          <Select options={languageOptions} onSet={v => { this.subLanguageVal = v; }} />
        </form>
      </div>
    );
  }
}

class VideoMedia extends Component {
  render() {
    const {media, onTimeUpdate, mountedVideoElement} = this.props;
    return (
      <div>{ media ? (
        <video src={media.videoURL} controls onTimeUpdate={e => {onTimeUpdate(e.target.currentTime)}} ref={(el) => { mountedVideoElement(el); }}/>
      ) : "No video media"
      }</div>
    );
  }
}

class PlayControls extends Component {
  constructor(props) {
    super(props);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  handleKeyDown(e) {
    const {onBack, onTogglePause} = this.props;

    // console.log(e);
    if (!e.repeat) {
      switch (e.keyCode) {
        case 65: // a
          onBack();
          break;

        case 32: // space
          onTogglePause();
          break;
      }
    }
  }

  componentDidMount() {
    document.body.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    document.body.removeEventListener('keydown', this.handleKeyDown);
  }

  render() {
    return null;
  }
}

// Doc
class Doc extends Component {
  constructor(props) {
    super(props);
    this.videoElement = null;
  }

  render() {
    const {doc, dispatch} = this.props;
    return (
      <div>
        <div>Kind: { doc.kind }, Language: { doc.language }</div>
        <VideoImportControls dispatch={dispatch}/>
        <VideoMedia media={doc.media} onTimeUpdate={time => { dispatch(videoTimeUpdate(time)); }} mountedVideoElement={(el) => { this.videoElement = el; }} />
        <PlayControls dispatch={dispatch} onBack={
          () => {
            if (this.videoElement) {
              const nt = this.videoElement.currentTime - 3.0;
              this.videoElement.currentTime = nt >= 0 ? nt : 0;
            }
          }
        } onTogglePause={
          () => {
            if (this.videoElement) {
              if (this.videoElement.paused) {
                this.videoElement.play();
              } else {
                this.videoElement.pause();
              }
            }
          }
        } />
        <div>{JSON.stringify(doc.currentTextChunks)}</div>
      </div>
    );
  }
}

// MaybeDoc
const MaybeDoc = connect(
  (state) => ({
    doc: state.doc,
  })
)(({doc, dispatch}) => (
  <div>{ doc ? <Doc doc={doc} dispatch={dispatch} /> : "No document" }</div>
));

// App
const App = () => (
  <div>
    <Counter />
    <NewDocForm />
    <MaybeDoc />
  </div>
);

export default App;
