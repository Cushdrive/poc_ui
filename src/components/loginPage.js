import React, {Component} from 'react';
import {login, authorizeAPICalls} from '../thirdPartyLibraries/auth0LockWrapper';
import '../css/loginPage.css';

class Login extends Component {
  componentDidMount() {
    console.log("Props for login page.");
    console.log(this.props);
    var type = this.props.location.query.type;
    if ((type) && (type === 'treatment_authz')) {
      authorizeAPICalls();
    }
    else if ((type) && (type === 'infusion_authz')) {
      //THis could be different in the future.
      authorizeAPICalls();
    }
    else {
      this.login = login();
    }
      
  }

  componentWillUnmount() {
    this.login.hide();
    this.login = null;
  }

  render() {
    return (
      <div className="Login">
        <a className="Login-loginButton" onClick={() => login()}>Log In with Auth0</a>
      </div>
    );
  }
}

export default Login;
