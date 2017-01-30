import React, {Component} from 'react';
import {parseAPITokenHash} from '../thirdPartyLibraries/auth0LockWrapper';

class TokenSaver extends Component {
  componentDidMount() {
    parseAPITokenHash();
  }

  componentWillUnmount() {
    
  }

  render() {
    return (
      <div></div>
    );
  }
}

export default TokenSaver;
