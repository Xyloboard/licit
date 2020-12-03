import * as React from 'react';
import UICommand from './UICommand';
import {EditorState} from 'prosemirror-state';
import {Schema} from 'prosemirror-model';
import {Transform} from 'prosemirror-transform';
import {EditorView} from 'prosemirror-view';
import uuid from './uuid';
import './listType.css';
import CustomStyleItem from './CustomStyleItem';

import createPopUp from './createPopUp';
import CustomStyleSubMenu from './CustomStyleSubMenu';
import CustomStyleEditor from './CustomStyleEditor';
import {applyStyle} from '../CustomStyleCommand';
import {atViewportCenter} from './PopUpPosition';
import {saveStyle, removeStyle} from '../customStyle';
import {setTextAlign} from '../TextAlignCommand';
import {setTextLineSpacing} from '../TextLineSpacingCommand';
import {setParagraphSpacing} from '../ParagraphSpacingCommand';

// [FS] IRAD-1039 2020-09-24
// UI to show the list buttons

class CustomMenuUI extends React.PureComponent<any, any> {
  _activeCommand: ?UICommand = null;
  _popUp = null;
  _stylePopup = null;
  _styleName = null;
  // _popUpId = uuid();
  props: {
    className?: ?string,
    commandGroups: Array<{[string]: UICommand}>,
    staticCommand: Array<{[string]: UICommand}>,
    disabled?: ?boolean,
    dispatch: (tr: Transform) => void,
    editorState: EditorState,
    editorView: ?EditorView,
    icon?: string | React.Element<any> | null,
    label?: string | React.Element<any> | null,
    title?: ?string,
    _style?: ?any,
  };

  _menu = null;
  _id = uuid();
  _modalId = null;

  state = {
    expanded: false,
    style: {
      display: 'none',
      top: '',
      left: '',
    },
  };

  render() {
    const {
      dispatch,
      editorState,
      editorView,
      commandGroups,
      staticCommand,
      onCommand,
    } = this.props;
    const children = [];
    const children1 = [];

    commandGroups.forEach((group, ii) => {
      Object.keys(group).forEach((label) => {
        const command = group[label];
        const hasText= 'None'!==label;
        children.push(
          <CustomStyleItem
            command={command}
            disabled={editorView && editorView.disabled ? true : false}
            dispatch={dispatch}
            editorState={editorState}
            editorView={editorView}
            hasText={hasText}
            key={label}
            label={label}
            onClick={this._onUIEnter}
            onCommand={onCommand}
          ></CustomStyleItem>
        );
      });
    });
    staticCommand.forEach((group, ii) => {
      Object.keys(group).forEach((label) => {
        const command = group[label];
        children1.push(
          <CustomStyleItem
            command={command}
            disabled={editorView && editorView.disabled ? true : false}
            dispatch={dispatch}
            editorState={editorState}
            editorView={editorView}
            hasText={false}
            key={label}
            label={command._customStyleName}
            onClick={this._onUIEnter}
            onCommand={onCommand}
          ></CustomStyleItem>
        );
      });
    });
    return (
      <div>
        <div className="dropbtn" id={this._id}>
          <div className="stylenames">{children}</div>

          <hr></hr>
          {children1}
        </div>
      </div>
    );
  }

  _onUIEnter = (command: UICommand, event: SyntheticEvent<*>) => {
    this.showSubMenu(command, event);
  };

  //shows the alignment and line spacing option
  showSubMenu(command: UICommand, event: SyntheticEvent<*>) {
    const anchor = event ? event.currentTarget : null;

    // close the popup toggling effect
    if (this._stylePopup) {
      this._stylePopup.close();
      this._stylePopup = null;
      return;
    }
    this._popUp = createPopUp(
      CustomStyleSubMenu,
      {
        command: command,
      },
      {
        anchor,
        autoDismiss: false,
        IsChildDialog: true,
        onClose: (val) => {
          if (this._popUp) {
            this._popUp = null;
            if (undefined !== val && val.command._customStyle) {
              // do edit,remove,rename code here
              if ('remove' === val.type) {
                removeStyle(
                  val.command._customStyleName,
                  val.command._customStyle,
                  this.props.editorState,
                  this.props.editorView.dispatch
                );

                // [FS] IRAD-1099 2020-11-17
                // Issue fix: Even the applied style is removed the style name is showing in the editor
                this.removeCustomStyleName(
                  this.props.editorState,
                  val.command._customStyleName,
                  this.props.editorView.dispatch
                );
              } else if ('rename' === val.type) {
                window.alert('Rename Style...');
              } else {
                this.showStyleWindow(command, event);
              }
            }
          }
        },
      }
    );
  }

  // [FS] IRAD-1099 2020-11-17
  // Issue fix: Even the applied style is removed the style name is showing in the editor
  removeCustomStyleName(editorState, removedStyleName, dispatch) {
    const {selection, doc} = editorState;
    let {from, to} = selection;
    const {empty} = selection;
    if (empty) {
      from = selection.$from.before(1);
      to = selection.$to.after(1);
    }

    let tr = editorState.tr;
    const customStyleName = 'None';
    const tasks = [];
    const textAlignNode = [];

    doc.nodesBetween(0, doc.nodeSize - 2, (node, pos) => {
      if (node.content && node.content.content && node.content.content.length) {
        if (
          node.content &&
          node.content.content &&
          node.content.content[0].marks &&
          node.content.content[0].marks.length
        ) {
          node.content.content[0].marks.some((mark) => {
            if (node.attrs.styleName === removedStyleName) {
              tasks.push({node, pos, mark});
            }
          });
        } else {
          textAlignNode.push({node, pos});
        }
      }
    });

    if (!tasks.length) {
      textAlignNode.forEach((eachnode) => {
        const {node} = eachnode;
        node.attrs.styleName = customStyleName;
      });
      // to remove both text align format and line spacing
      tr = this.removeTextAlignAndLineSpacing(tr, editorState.schema);
    }

    tasks.forEach((job) => {
      const {node, mark, pos} = job;
      tr = tr.removeMark(pos, pos + node.nodeSize, mark.type);
      // reset the custom style name to NONE after remove the styles
      node.attrs.styleName = customStyleName;
    });

    // to remove both text align format and line spacing
    tr = this.removeTextAlignAndLineSpacing(tr, editorState.schema);
    editorState.doc.nodesBetween(from, to, (node, startPos) => {
      if (node.type.name === 'paragraph') {
        tr = tr.setNodeMarkup(startPos, undefined, node.attrs);
      }
    });
    if (dispatch && tr.docChanged) {
      dispatch(tr);
      return true;
    }
    return false;
  }

  // to remove the text align, line spacing, paragraph spacing after and before format if applied.
  removeTextAlignAndLineSpacing(tr: Transform, schema: Schema): Transform {
    tr = setTextAlign(tr, schema, null);
    tr = setTextLineSpacing(tr, schema, null);
    tr = setParagraphSpacing(tr, schema, '0', true);
    tr = setParagraphSpacing(tr, schema, '0', false);
    return tr;
  }

  //shows the alignment and line spacing option
  showStyleWindow(command: UICommand, event: SyntheticEvent<*>) {
    // const anchor = event ? event.currentTarget : null;
    // close the popup toggling effect
    if (this._stylePopup) {
      this._stylePopup.close();
      this._stylePopup = null;
      // return;
    }
    this._styleName = command._customStyleName;
    this._stylePopup = createPopUp(
      CustomStyleEditor,
      {
        stylename: command._customStyleName,
        // mode: 1, //edit
        description: command._customStyle.description,
        styles: command._customStyle.styles,
      },
      {
        position: atViewportCenter,
        autoDismiss: false,
        IsChildDialog: false,
        onClose: (val) => {
          if (this._stylePopup) {
            //handle save style object part here
            if (undefined !== val) {
              const {dispatch} = this.props.editorView;
              let tr = this.props.editorState.tr;
              // const doc = this.props.editorState.doc;
              saveStyle(val);
              // tr = tr.setSelection(TextSelection.create(doc, 0, 0));
              // Apply created styles to document
              tr = applyStyle(
                val.styles,
                val.stylename,
                this.props.editorState,
                tr
              );
              dispatch(tr);
              this.props.editorView.focus();
              this._stylePopup.close();
              this._stylePopup = null;
            }
          }
        },
      }
    );
  }

  _execute = (command, e) => {
    const {dispatch, editorState, editorView, onCommand} = this.props;
    if (command.execute(editorState, dispatch, editorView, e)) {
      onCommand && onCommand();
    }
  };
}

export default CustomMenuUI;