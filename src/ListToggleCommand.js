// @flow

import { EditorState } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { findParentNodeOfType } from 'prosemirror-utils';
import { EditorView } from 'prosemirror-view';

import { BULLET_LIST, ORDERED_LIST } from './NodeNames';
import noop from './noop';
import toggleList from './toggleList';
import UICommand from './ui/UICommand';

class ListToggleCommand extends UICommand {
  _ordered: boolean;
  _orderedListType: string

  constructor(ordered: boolean, type: string) {
    super();
    this._ordered = ordered;
    this._orderedListType = type;
  }

  isActive = (state: EditorState): boolean => {
    if (this._ordered) {
      return !!this._findList(state, ORDERED_LIST);
    } else {
      return !!this._findList(state, BULLET_LIST);
    }
  };

  execute = (
    state: EditorState,
    dispatch: ?(tr: Transform) => void,
    view: ?EditorView
  ): boolean => {
    const { selection, schema } = state;
    const nodeType = schema.nodes[this._ordered ? ORDERED_LIST : BULLET_LIST];
    let { tr } = state;
    tr = tr.setSelection(selection);
    if (!nodeType) {
      return tr;
    }

    tr = toggleList(tr, schema, nodeType, this._orderedListType);
    if (tr.docChanged) {
      dispatch && dispatch(tr);
      return true;
    } else {
      return false;
    }
  };

  _findList(state: EditorState, type: string): ?Object {
    const { nodes } = state.schema;
    const list = nodes[type];
    const findList = list ? findParentNodeOfType(list) : noop;
    return findList(state.selection);
  }
  // [FS] IRAD-1087 2020-11-11
  // New method to execute new styling implementation for List
  //only x.x.x is handled here need to handle indent
  executeCustom = (
    state: EditorState,
    tr: Transform,
    from: Number,
    to: Number
  ): boolean => {
    const { schema } = state;
    const nodeType = schema.nodes[this._ordered ? ORDERED_LIST : BULLET_LIST];
    if (!nodeType) {
      return tr;
    }
    // tr = tr.setSelection(TextSelection.create(tr.doc, from, to));
    tr = toggleList(tr, schema, nodeType, this._orderedListType);
    return tr;
  };
}

export default ListToggleCommand;
