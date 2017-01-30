import React, {Component} from 'react';
import {connectProfile} from '../thirdPartyLibraries/auth0LockWrapper';
import {Link} from 'react-router';
import '../css/homePage.css';

class Home extends Component {
  static propTypes = {
    ...connectProfile.PropTypes
  };

  render() {

    return (
      <div className="Home">
        <div className="Home-intro">
          <div className="Navigation">
          <h3 className="Navigation-Instructions"> Use the navigation links below to continue.</h3>
          <ul className="Navigation-List">
            <li className="Navigation-List-Item">Explore your <Link to="/profile/edit">profile</Link>.</li>
            <li>View your latest <Link to="/treatments/view">treatments</Link>.</li>
            <li>View your latest <Link to="/infusions/view">infusions</Link>.</li>
          </ul>
          </div>
        </div>
      </div>
    );
  }
}

export default connectProfile(Home);
