import { Record, List } from 'immutable';
import { hiraToKata, kataToHira } from '../util/japanese';

let kuromojiTokenizer = null;

export const loadKuromoji = () => {
  console.log('Loading Kuromoji ...');
  kuromoji.builder({ dicPath: "/kuromoji/dict/" }).build(function (err, tokenizer) {
    console.log('Kuromoji loaded');
    kuromojiTokenizer = tokenizer;
  });
};

const RubyRecord = new Record({
  cpBegin: null,
  cpEnd: null,
  rubyText: null,
});

const analyzeJAKuromoji = (text) => {
  if (!kuromojiTokenizer) {
    throw new Error('Kuromoji has not been loaded');
  }

  const tokens = kuromojiTokenizer.tokenize(text);
  const mutRuby = [];

  for (const t of tokens) {
    // NOTE: cpBegin and cpEnd are code point indexes, not byte indexes
    const cpBegin = t.word_position - 1; // WTF 1-based indexing?
    const cpEnd = cpBegin + t.surface_form.length;

    // sanity checks
    if ([...text].slice(cpBegin, cpEnd).join('') !== t.surface_form) {
      throw new Error('Input text token does not match surface_form');
    }

    if ((!t.basic_form) || (t.basic_form === '')) {
      throw new Error('Unexpected');
    }

    // skip some stuff
    if (t.pos === '記号') {
      continue;
    }

    // skip ones without basic_form properly set, for now
    if (t.basic_form === '*') {
      continue;
    }

    if (t.reading !== '*') {
      const kataReading = hiraToKata(t.reading);
      const kataSurfaceForm = hiraToKata(t.surface_form);

      if (kataReading !== kataSurfaceForm) {
        mutRuby.push(RubyRecord({
          cpBegin,
          cpEnd,
          rubyText: kataToHira(t.reading),
        }));
      }
    }
  }

  return {
    ruby: List(mutRuby),
  }
};

export const analyzeText = (text, language) => {
  if (language !== 'ja') {
    throw new Error('Can only analyze Japanese for now');
  }

  return analyzeJAKuromoji(text);
};
