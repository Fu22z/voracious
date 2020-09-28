import React, { Component } from 'react';

import './SettingsSubStyle.css';

export default class SettingsSubStyle extends Component {
  constructor(props) {
    super(props);

    this.state = {
        isEnable: props.showSubBackground,
    };
  }
  
  toggleCheck = () => {
    this.state.isEnable = !this.state.isEnable;
    this.props.onEnableSubBackground(this.state.isEnable);

  };
  
  render() {
    return (
      <div className="SettingsSubStyle">
        <div>
            <span onClick={this.toggleCheck}>
            <input type="checkbox" checked={this.state.isEnable} />
            <span>Hide Subtitle Background</span>
            </span>
        </div>
        {/* <div>
            <span>Subtitle font size</span>
            <input type="number"/>
        </div> */}
      </div>
    );
  }
}
