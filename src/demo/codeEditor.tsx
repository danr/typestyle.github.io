// Code
import CodeMirror = require('codemirror');
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as csx from "typestyle/csx";
import { style, classes, cssRaw } from "typestyle";
import * as ts from 'byots';

// CSS
cssRaw(require('codemirror/lib/codemirror.css'));
cssRaw(require('codemirror/theme/monokai.css'));
// Css overrides
cssRaw(`
/* Make code mirror flex boxy */
.CodeMirror {
    display: flex;
    flex-direction: column;
    flex: 1;
}
.CodeMirror-scroll {
    flex: 1;
}

/* Make code mirror selections a bit more popping */
.cm-s-monokai div.CodeMirror-selected {
    background: #58574B;
}

/* matchbrackets addon */
.cm-s-monokai .CodeMirror-matchingbracket {
    color: #4f0 !important;
    background-color: #32332b;
    text-decoration: none;
}
.cm-s-monokai .CodeMirror-nonmatchingbracket {
    background-color: #32332b;
}

/* cm-s-monokai has nothing for qualifier */
.cm-s-monokai span.cm-qualifier { color: rgb(0, 208, 255); }

/* make overrite (insert) mode visually different */
.CodeMirror-overwrite .CodeMirror-cursor{
    border-left:2px solid red !important;
}

/* match-highlight from demo : https://codemirror.net/demo/matchhighlighter.html */
.cm-matchhighlight {
    text-decoration: underline;
}

/* tag matching is a bit too bold. Dull it down a bit */
.CodeMirror-matchingtag {
    background: rgba(0, 150, 150, .3);
}
`)

/**
 *  addons
 */
// keymap
require('codemirror/keymap/sublime');
// comments (single / multiline)
require('codemirror/addon/comment/comment');
// code folding
require('codemirror/addon/fold/foldcode');
require('codemirror/addon/fold/foldgutter');
require('codemirror/addon/fold/brace-fold');
require('codemirror/addon/fold/xml-fold');
require('codemirror/addon/fold/markdown-fold');
require('codemirror/addon/fold/comment-fold');
// require('codemirror/addon/fold/foldgutter.css');
// Highlight active line
require('codemirror/addon/selection/active-line');
// Highlight matching brackets
require('codemirror/addon/edit/matchbrackets');
// Auto close brackets and strings
require('codemirror/addon/edit/closebrackets');
// Auto match tags (great for TSX!)
require('codemirror/addon/edit/matchtags');
// Auto highlight same words selected
require('codemirror/addon/search/match-highlighter');

const mode = 'jsx';
require('codemirror/mode/jsx/jsx');
require('codemirror/mode/javascript/javascript');
require('codemirror/mode/xml/xml');

interface Props {
  onFocusChange?: (focused: boolean) => any;
  readOnly?: boolean | "nocursor";
  preview?: ts.TextSpan;
  value: string;
  onChange: (value: string) => any;
}

export class CodeEditor extends React.Component<Props, { isFocused: boolean }>{
  constructor(props) {
    super(props);

    this.state = {
      isFocused: false
    };
  }

  codeMirror: CodeMirror.EditorFromTextArea;
  refs: {
    [string: string]: any;
    textarea: any;
  }

  /** Ready after the doc is loaded */
  ready = false;
  afterReadyQueue: { (): void }[] = [];
  /** If already ready it execs ... otherwise waits */
  afterReady = (cb: () => void) => {
    if (this.ready) cb();
    else {
      this.afterReadyQueue.push(cb);
    }
  }

  componentDidMount() {

    var options: CodeMirror.EditorConfiguration = {
      mode: mode,

      lineNumbers: true,
      keyMap: 'sublime',
      theme: 'monokai',
      indentUnit: 2,


      gutters: ["CodeMirror-linenumbers"],

      // Active line addon
      styleActiveLine: true,

      // Match bracket addon
      matchBrackets: true,

      // match-highlighter
      highlightSelectionMatches: { showToken: /\w/ },

      // Auto close brackets and strings
      autoCloseBrackets: true,

      // Match tags (great for tsx!)
      // Doesn't work right now.
      // It needs `tag` token to work (see code in `xml-fold.js` i.e. `/\btag\b/``)
      matchTags: { bothTags: true },

      /** Overcomes horizontal scrolling for now */
      lineWrapping: true,
    } as any;

    // fold
    (options as any).foldGutter = true;
    options.gutters.push("CodeMirror-foldgutter");

    var textareaNode = ReactDOM.findDOMNode(this.refs.textarea);
    this.codeMirror = CodeMirror.fromTextArea(textareaNode as any, options);
    this.codeMirror.on('focus', this.focusChanged.bind(this, true));
    this.codeMirror.on('blur', this.focusChanged.bind(this, false));

    this.codeMirror.on('change', this.codemirrorValueChanged);
    this._currentCodemirrorValue = this.props.value || '';
    (this.codeMirror as any).setValue(this._currentCodemirrorValue);

    setTimeout(() => this.codeMirror.refresh(), 200);// Needed to resize gutters correctly
  }

  componentWillUnmount() {
    // todo: is there a lighter-weight way to remove the cm instance?
    if (this.codeMirror) {
      this.codeMirror.toTextArea();
			/**
			 * Very hacky way to unlink docs from CM
			 * If we don't do this then the doc stays in memory and so does cm :-/
			 */
      (this.codeMirror.getDoc() as any).cm = null;
    }
  }

  componentWillReceiveProps(nextProps: Props) {
    if (this.codeMirror && nextProps.value !== undefined && this._currentCodemirrorValue !== nextProps.value) {
      (this.codeMirror as any).setValue(nextProps.value);
    }
  }

  _currentCodemirrorValue: string;
  codemirrorValueChanged = (doc, change) => {
    const newValue = doc.getValue();
    this._currentCodemirrorValue = newValue;
    this.props.onChange && this.props.onChange(newValue);
  }

  getCodeMirror() {
    return this.codeMirror;
  }

  focusChanged = (focused) => {
    this.setState({
      isFocused: focused
    });
    this.props.onFocusChange && this.props.onFocusChange(focused);
  }

  getValue() {
    return this.codeMirror.getDoc().getValue();
  }

  render() {
    var className = 'ReactCodeMirror';
    if (this.state.isFocused) {
      className += ' ReactCodeMirror--focused';
    }
    return (
      <div className={classes(className, style(csx.vertical, csx.flex, { position: 'relative' }))}>
        <textarea ref="textarea" autoComplete="false" />
      </div>
    );
  }

}