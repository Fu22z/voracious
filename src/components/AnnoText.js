import React, { PureComponent } from 'react';
import Immutable, { Record } from 'immutable';

import './AnnoText.css';

import Tooltip from './Tooltip';

import { cpSlice } from '../util/string';
import { getKindAtIndex, getKindInRange, addAnnotation, customRender as annoTextCustomRender, clearKindInRange, getInRange, deleteAnnotation } from '../util/annotext';

const CPRange = new Record({
  cpBegin: null,
  cpEnd: null,
});

export default class AnnoText extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      selectionRange: null,
      hoverRange: null,
    };
    this.charElem = {}; // map from cpIndex to element wrapping character
    this.hoverTimeout = null;
    this.dragStartIndex = null; // codepoint index of character that mousedown happened on, if mouse is still down
  }

  componentDidMount() {
  }

  componentWillUnmount() {
    document.removeEventListener('mouseup', this.handleMouseUp);

    this.clearHoverTimeout();
  }

  clearHoverTimeout() {
    if (this.hoverTimeout) {
      window.clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
  }

  setHoverTimeout() {
    if (this.hoverTimeout) {
      window.clearTimeout(this.hoverTimeout);
    }
    this.hoverTimeout = window.setTimeout(
      () => { this.setState({ hoverRange: null }); this.hoverTimeout = null; },
      500
    );
  }

  setSelRange = (newSelRange) => {
    if (!Immutable.is(newSelRange, this.state.selectionRange)) {
      this.setState({selectionRange: newSelRange});
    }
  };

  clearSelection = () => {
    this.setSelRange(null);
  }

  setSelection = (begin, end) => {
    this.setSelRange(new CPRange({cpBegin: begin, cpEnd: end}));
  }

  handleMouseUp = (e) => {
    this.dragStartIndex = null;
    document.removeEventListener('mouseup', this.handleMouseUp);
  };

  handleCharMouseDown = (e) => {
    e.preventDefault();
    const cpIndex = +e.currentTarget.getAttribute('data-index');
    this.dragStartIndex = cpIndex;
    if (this.state.selectionRange && (cpIndex >= this.state.selectionRange.cpBegin) && (cpIndex < this.state.selectionRange.cpEnd)) {
      this.clearSelection();
    } else {
      this.setSelection(cpIndex, cpIndex+1);
    }
    document.addEventListener('mouseup', this.handleMouseUp);
  };

  handleCharMouseEnter = (e) => {
    const cpIndex = +e.currentTarget.getAttribute('data-index');

    const hitLemmaAnnos = getKindAtIndex(this.props.annoText, 'lemma', cpIndex);
    const hitBegin = Math.min(...hitLemmaAnnos.map(a => a.cpBegin));
    const hitEnd = Math.max(...hitLemmaAnnos.map(a => a.cpEnd));

    this.setState({hoverRange: new CPRange({cpBegin: hitBegin, cpEnd: hitEnd})});

    if (this.dragStartIndex !== null) {
      let a = this.dragStartIndex;
      let b = cpIndex;
      if (b < a) {
        [a, b] = [b, a];
      }
      this.setSelection(a, b+1);
    }
    this.clearHoverTimeout();
  };

  handleCharMouseLeave = (e) => {
    this.setHoverTimeout();
  };

  handleSetRuby = () => {
    const { annoText, onUpdate } = this.props;
    const rubyText = this.setRubyTextInput.value.trim();
    const {cpBegin, cpEnd} = this.state.selectionRange;
    let newAnnoText = clearKindInRange(annoText, cpBegin, cpEnd, 'ruby');
    if (rubyText !== '') {
      newAnnoText = addAnnotation(newAnnoText, cpBegin, cpEnd, 'ruby', rubyText);
    }
    onUpdate(newAnnoText);
    this.clearSelection();
  };

  handleSetLemma = () => {
    const { annoText, onUpdate } = this.props;
    const lemmaText = this.setLemmaTextInput.value.trim();
    if (lemmaText === '') {
      return;
    }
    const {cpBegin, cpEnd} = this.state.selectionRange;
    const newAnnoText = addAnnotation(annoText, cpBegin, cpEnd, 'lemma', lemmaText);
    onUpdate(newAnnoText);
    this.clearSelection();
  };

  handleAddHighlight = () => {
    const { annoText, onUpdate } = this.props;
    const {cpBegin, cpEnd} = this.state.selectionRange;
    // TODO: the data for the annotation should be immutable, a Record
    let newAnnoText = addAnnotation(annoText, cpBegin, cpEnd, 'highlight', {timeCreated: Date.now(), setId: this.props.activeSetId});
    onUpdate(newAnnoText);
    this.clearSelection();
  };

  renderTooltip = () => {
    const { annoText } = this.props;

    const tooltipRange = this.state.selectionRange || this.state.hoverRange;

    let hitLemmaAnnos = [];
    if (tooltipRange !== null) {
      hitLemmaAnnos = getKindInRange(annoText, 'lemma', tooltipRange.cpBegin, tooltipRange.cpEnd);
    }

    if (hitLemmaAnnos.length > 0) {
      const anchorElems = [];
      for (let i = tooltipRange.cpBegin; i < tooltipRange.cpEnd; i++) {
        const el = this.charElem[i];
        if (el) {
          anchorElems.push(el);
        }
      }

      return (
        <Tooltip anchorElems={anchorElems}>
          <div className="AnnoText-tooltip">
            <ul>
              {hitLemmaAnnos.map(lemmaAnno => {
                const encLemma = encodeURIComponent(lemmaAnno.data);
                return (
                  <li key={`wordinfo-${lemmaAnno.cpBegin}:${lemmaAnno.cpEnd}`} className="AnnoText-tooltip-item">
                    <div className="AnnoText-tooltip-word">{lemmaAnno.data}</div>
                    <div className="AnnoText-tooltip-links">
                      <a className="AnnoText-dict-linkout" href={'http://ejje.weblio.jp/content/' + encLemma} target="_blank">Weblio</a>{' '}
                      <a className="AnnoText-dict-linkout" href={'http://eow.alc.co.jp/search?q=' + encLemma} target="_blank">ALC</a>{' '}
                      <a className="AnnoText-dict-linkout" href={'http://dictionary.goo.ne.jp/srch/all/' + encLemma + '/m0u/'} target="_blank">goo</a>{' '}
                      <a className="AnnoText-dict-linkout" href={'http://tangorin.com/general/' + encLemma} target="_blank">Tangorin</a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Tooltip>
      );
    } else {
      return null;
    }
  };

  render() {
    const { annoText, language, onUpdate, highlightSets, activeSetId, onSetActiveSetId, alignment } = this.props;

    let annosInSelection = [];
    if (this.state.selectionRange) {
      annosInSelection = getInRange(annoText, this.state.selectionRange.cpBegin, this.state.selectionRange.cpEnd);
    }

    const annoTextChildren = annoTextCustomRender(
      annoText,
      (a, inner) => {
        if (a.kind === 'ruby') {
          return [<ruby key={`ruby-${a.cpBegin}:${a.cpEnd}`}>{inner}<rp>(</rp><rt>{a.data}</rt><rp>)</rp></ruby>];
        } else if (a.kind === 'highlight') {
          return [<span key={`highlight-${a.cpBegin}:${a.cpEnd}`} className='AnnoText-highlight'>{inner}</span>];
        } else {
          return inner;
        }
      },
      (c, i) => {
        if (c === '\n') {
          return <br key={`char-${i}`} />;
        } else {
          const classNames = ['AnnoText-textchar'];
          if ((this.state.selectionRange !== null) && (i >= this.state.selectionRange.cpBegin) && (i < this.state.selectionRange.cpEnd)) {
            classNames.push('AnnoText-selected');
          } else if ((this.state.hoverRange !== null) && (i >= this.state.hoverRange.cpBegin) && (i < this.state.hoverRange.cpEnd)) {
            classNames.push('AnnoText-hover');
          }

          return <span className={classNames.join(' ')} onMouseDown={this.handleCharMouseDown} onMouseEnter={this.handleCharMouseEnter} onMouseLeave={this.handleCharMouseLeave} data-index={i} key={`char-${i}`} ref={(el) => { this.charElem[i] = el; }}>{c}</span>;
        }
      }
    );

/*
    const annoTextHTML = annoTextCustomRender(
      annoText,
      (a, inner) => {
        if (a.kind === 'ruby') {
          return ['<ruby>', ...inner, '<rp>(</rp><rt>', escape(a.data), '</rt><rp>)</rp></ruby>'];
        } else {
          return inner;
        }
      },
      (c, i) => (c === '\n' ? '<br/>' : escape(c))
    ).join('');
*/

    const floatWidth = '240px';

    let textContainerStyle;
    switch (alignment) {
      case 'left':
        textContainerStyle = {
          textAlign: 'left',
          marginRight: floatWidth,
        };
        break;

      case 'center':
        textContainerStyle = {
          textAlign: 'center',
          marginLeft: floatWidth,
          marginRight: floatWidth,
        };
        break;

      default:
        throw new Error('bad alignment value');
    }

    return (
      <div className="AnnoText">
        {(this.state.selectionRange && onUpdate) ? (
          <div style={{ float: 'right', width: floatWidth, textAlign: 'left', backgroundColor: '#eee', padding: '10px', fontSize: '12px' }}>
            <form>
              <input ref={(el) => { this.setRubyTextInput = el; }} placeholder="ruby text" /><button type="button" onClick={this.handleSetRuby} >Set Ruby</button><br />
              <input ref={(el) => { this.setLemmaTextInput = el; }} placeholder="lemma" /><button type="button" onClick={this.handleSetLemma} >Set Lemma</button><br />
              <select value={activeSetId} onChange={e => onSetActiveSetId(e.target.value)}>
                {highlightSets.valueSeq().map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button type="button" onClick={this.handleAddHighlight} {...(highlightSets.isEmpty() ? {disabled: true} : {})}>Highlight</button>
              <br />
              {annosInSelection.map(a => (
                <div key={a.id}>[{cpSlice(annoText.text, a.cpBegin, a.cpEnd)}]:{a.kind}={a.kind === 'highlight' ? ('set:' + highlightSets.get(a.data.setId).name) : ('[' + a.data + ']')} <button onClick={(e) => {
                  e.preventDefault();
                  onUpdate(deleteAnnotation(annoText, a.id));
                }}>X</button></div>
              ))}
            </form>
          </div>
        ) : ''}
        <div style={textContainerStyle} lang={language} ref={(el) => { this.textContainerElem = el; }}>{annoTextChildren}</div>
        {this.renderTooltip()}
      </div>
    );
  }
}
