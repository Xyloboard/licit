// @flow

import {EditorState} from 'prosemirror-state';

import {MARK_CUSTOMSTYLES} from '../MarkNames';
import findActiveMark from '../findActiveMark';

export const CUSTOMSTYLE_NAME_DEFAULT = 'None';
// [FS] IRAD-1042 2020-09-17
// To find the selected custom style

export default function findActiveCustomStyle(state: EditorState): string {
  const {schema, doc, selection, tr} = state;
  const markType = schema.marks[MARK_CUSTOMSTYLES];
  if (!markType) {
    return CUSTOMSTYLE_NAME_DEFAULT;
  }
  const {from, to, empty} = selection;

  if (empty) {
    const storedMarks =
      tr.storedMarks ||
      state.storedMarks ||
      (selection.$cursor &&
        selection.$cursor.marks &&
        selection.$cursor.marks()) ||
      [];
    const sm = storedMarks.find(m => m.type === markType);
    return (sm && sm.attrs.styleName) || CUSTOMSTYLE_NAME_DEFAULT;
  }

  const mark = findActiveMark(doc, from, to, markType);
  const name = mark && mark.attrs.styleName;
  if (!name) {
    return CUSTOMSTYLE_NAME_DEFAULT;
  }
  return name;
}
