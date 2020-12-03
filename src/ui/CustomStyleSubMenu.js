// @flow

import './czi-custom-button.css';
import * as React from 'react';
import './custom-dropdown.css';
import UICommand from './UICommand';

class CustomStyleSubMenu extends React.PureComponent<any, any> {
    props: {
        command: UICommand,
        disabled?: ?boolean,
    };

    render(): React.Element<any> {

        const { command } = this.props;

        return (


            <div class="dropdown-content" id='mo-submenu'>
                <a  onClick={this.onButtonClick.bind(this, { type: 'modify', command: command })}>Modify Style..</a>
                <a  onClick={this.onButtonClick.bind(this, { type: 'rename', command: command })}>Rename Style..</a>
                <a  onClick={this.onButtonClick.bind(this, { type: 'remove', command: command })}>Remove Style..</a>
            </div>



        );
    }

    //handles the option button click, close the popup with selected values
    onButtonClick(val, event) {
        this.props.close(val);
    }
}

export default CustomStyleSubMenu;